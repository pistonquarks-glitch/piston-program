// Guardado de comprobantes de pago: local + Google Drive (opcional) + OCR.
// El destino oficial es la carpeta Drive indicada por el usuario. Si no hay
// credenciales/googleapis, se guarda localmente y se marca driveStatus='local_only'.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const paymentVerifier = require('./paymentVerifier');
const pricing = require('./pricing');

const DEFAULT_DRIVE_FOLDER_ID = '1tIP5lvZoLRVcsjNp046Up-rCPTJgekUG';

class ProofStore {
  constructor(dataDir) {
    this.dir = path.join(dataDir, 'sales_proofs');
    try { fs.mkdirSync(this.dir, { recursive: true }); } catch (e) {}
    this.driveFolderId = process.env.PISTON_DRIVE_FOLDER_ID || DEFAULT_DRIVE_FOLDER_ID;
    this.drive = null;
    this.driveStatus = 'local_only';
    this._initDrive();
  }

  _initDrive() {
    try {
      const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_FILE || '';
      const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '';
      if (!keyFile && !keyJson) return;
      const { google } = require('googleapis');
      let auth;
      if (keyFile && fs.existsSync(keyFile)) {
        auth = new google.auth.GoogleAuth({ keyFile, scopes: ['https://www.googleapis.com/auth/drive.file'] });
      } else if (keyJson) {
        auth = new google.auth.GoogleAuth({ credentials: JSON.parse(keyJson), scopes: ['https://www.googleapis.com/auth/drive.file'] });
      } else return;
      this.drive = google.drive({ version: 'v3', auth });
      this.driveStatus = 'ready';
    } catch (e) {
      this.driveStatus = 'googleapis_unavailable';
    }
  }

  _extFor(mime, fileName) {
    const byMime = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'application/pdf': '.pdf' };
    return byMime[String(mime || '')] || path.extname(String(fileName || '')) || '.img';
  }

  // dataBase64: string base64 SIN el prefijo data:...;base64,
  async save({ orderId, fileName, mime, dataBase64 }) {
    const clean = String(dataBase64 || '').replace(/^data:[^;]+;base64,/, '');
    if (!clean) throw new Error('empty_proof');
    const buf = Buffer.from(clean, 'base64');
    if (!buf.length) throw new Error('empty_proof');
    if (buf.length > 12 * 1024 * 1024) throw new Error('proof_too_large');
    const ext = this._extFor(mime, fileName);
    const safeId = String(orderId || 'proof').replace(/[^A-Za-z0-9_-]/g, '_');
    const storedName = safeId + '_' + Date.now().toString(36) + ext;
    const localPath = path.join(this.dir, storedName);
    fs.writeFileSync(localPath, buf);
    const hash = crypto.createHash('sha256').update(buf).digest('hex');

    const result = {
      fileName: String(fileName || storedName).slice(0, 200),
      mime: String(mime || 'application/octet-stream'),
      storedName,
      localPath,
      size: buf.length,
      sha256: hash,
      uploadedAt: new Date().toISOString(),
      driveFileId: null,
      driveLink: null,
      driveStatus: this.driveStatus
    };

    if (this.drive) {
      try {
        const fileMetadata = {
          name: 'PistonBot/' + safeId + '/' + storedName,
          mimeTypes: [result.mime],
          parents: [this.driveFolderId]
        };
        const res = await this.drive.files.create({
          resource: fileMetadata,
          media: { mimeType: result.mime, body: buf },
          fields: 'id,webViewLink'
        });
        result.driveFileId = res.data.id;
        result.driveLink = res.data.webViewLink;
        result.driveStatus = 'uploaded';
      } catch (e) {
        result.driveStatus = 'drive_error:' + String(e && e.message || e).slice(0, 120);
      }
    }
    return result;
  }

  getPath(proof) {
    if (!proof || !proof.storedName) return null;
    const p = path.join(this.dir, path.basename(proof.storedName));
    return fs.existsSync(p) ? p : null;
  }

  // OCR + extraccion + sugerencia de plan segun monto.
  async analyze(proof, expectedPlanId) {
    const out = {
      processedAt: new Date().toISOString(),
      tesseractPath: paymentVerifier.TESSERACT_PATH,
      rawText: '',
      parsed: null,
      consistency: null,
      suggestion: null,
      error: null
    };
    const p = this.getPath(proof);
    if (!p) { out.error = 'proof_file_missing'; return out; }
    try {
      out.rawText = await paymentVerifier.ocrImage(p);
      out.parsed = paymentVerifier.parseReceipt(out.rawText);
      out.consistency = paymentVerifier.verifyReceiptConsistency(out.parsed);
      const amount = out.parsed && out.parsed.amount;
      out.suggestion = pricing.suggestPlanByAmount(amount);
      if (expectedPlanId && out.suggestion && out.suggestion.planId !== expectedPlanId) {
        out.suggestion.note = 'El monto detectado sugiere ' + out.suggestion.planId + ', pero el pedido eligió ' + expectedPlanId + '. Revisar manualmente.';
      }
    } catch (e) {
      out.error = String(e && e.message || e).slice(0, 300);
    }
    return out;
  }
}

module.exports = { ProofStore, DEFAULT_DRIVE_FOLDER_ID };
