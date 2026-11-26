// Persistencia de ventas/usuarios/plan/consumo de Piston Bot.
// Archivo unico JSON con escritura atomica. Sin dependencias externas.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULT = { version: 1, users: [], orders: [], usage: {} };

function newId(prefix) {
  return prefix + '_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex');
}

function normEmail(s) { return String(s || '').trim().toLowerCase(); }

class SalesStore {
  constructor(dataDir) {
    this.file = path.join(dataDir, 'piston_sales.json');
    this.data = this._read();
  }

  _read() {
    try {
      const parsed = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      return Object.assign({}, DEFAULT, parsed);
    } catch (e) {
      return JSON.parse(JSON.stringify(DEFAULT));
    }
  }

  save() {
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2), 'utf8');
    fs.renameSync(tmp, this.file);
  }

  // --- Usuarios ---
  findUserByEmail(email) {
    const e = normEmail(email);
    return this.data.users.find(u => normEmail(u.email) === e) || null;
  }

  findUserByPhone(phone) {
    const d = String(phone || '').replace(/\D/g, '');
    if (d.length < 7) return null;
    return this.data.users.find(u => String(u.phone || '').replace(/\D/g, '') === d)
      || this.data.users.find(u => String(u.phone || '').replace(/\D/g, '').endsWith(d.slice(-9))) || null;
  }

  upsertUser(input) {
    const email = normEmail(input.email);
    let user = this.findUserByEmail(email);
    if (!user) {
      user = {
        id: newId('usr'),
        name: String(input.name || '').trim(),
        email,
        phone: String(input.phone || '').replace(/\D/g, ''),
        business: String(input.business || '').trim(),
        source: String(input.source || 'web'),
        createdAt: new Date().toISOString(),
        accessCode: crypto.randomBytes(3).toString('hex').toUpperCase(),
        planId: null,
        planStatus: 'none',
        numbers: 0,
        planStartedAt: null,
        planExpiresAt: null,
        assignedBy: null,
        assignedAt: null,
        notes: ''
      };
      this.data.users.push(user);
    } else {
      if (input.name) user.name = String(input.name).trim();
      if (input.phone) user.phone = String(input.phone).replace(/\D/g, '');
      if (input.business) user.business = String(input.business).trim();
    }
    this.save();
    return user;
  }

  listUsers() {
    return this.data.users.slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  getUser(id) { return this.data.users.find(u => u.id === id) || null; }

  assignPlan(userId, patch) {
    const u = this.getUser(userId);
    if (!u) return null;
    if (patch.planId !== undefined) u.planId = patch.planId || null;
    if (patch.planStatus !== undefined) u.planStatus = patch.planStatus;
    if (patch.numbers !== undefined) u.numbers = Math.max(0, parseInt(patch.numbers, 10) || 0);
    if (patch.planStartedAt !== undefined) u.planStartedAt = patch.planStartedAt;
    if (patch.planExpiresAt !== undefined) u.planExpiresAt = patch.planExpiresAt;
    if (patch.assignedBy !== undefined) u.assignedBy = patch.assignedBy;
    if (patch.notes !== undefined) u.notes = String(patch.notes || '').slice(0, 1000);
    u.assignedAt = new Date().toISOString();
    this.save();
    return u;
  }

  // --- Pedidos ---
  createOrder(input) {
    const order = {
      id: newId('ord'),
      userId: input.userId,
      email: normEmail(input.email),
      name: String(input.name || '').trim(),
      phone: String(input.phone || '').replace(/\D/g, ''),
      source: String(input.source || 'web'),
      planId: input.quote.planId,
      extraNumbers: input.quote.extras,
      quote: input.quote,
      status: 'pendiente_verificacion',
      proof: null,
      ocr: null,
      suggestion: null,
      createdAt: new Date().toISOString(),
      reviewedBy: null,
      reviewedAt: null,
      reviewNotes: ''
    };
    this.data.orders.unshift(order);
    this.save();
    return order;
  }

  listOrders() { return this.data.orders.slice(); }
  getOrder(id) { return this.data.orders.find(o => o.id === id) || null; }

  findOrdersByEmail(email) {
    const e = normEmail(email);
    return this.data.orders.filter(o => normEmail(o.email) === e);
  }

  updateOrder(id, patch) {
    const o = this.getOrder(id);
    if (!o) return null;
    Object.assign(o, patch);
    this.save();
    return o;
  }

  // --- Consumo ---
  _usageFor(tenantId) {
    const key = String(tenantId || 'default');
    if (!this.data.usage[key]) {
      this.data.usage[key] = {
        tenantId: key,
        period: this._currentPeriod(),
        tokens: 0,
        messages: 0,
        conversations: 0,
        jids: [],
        updatedAt: new Date().toISOString()
      };
    }
    const u = this.data.usage[key];
    if (u.period !== this._currentPeriod()) {
      u.period = this._currentPeriod();
      u.tokens = 0;
      u.messages = 0;
      u.conversations = 0;
      u.jids = [];
    }
    return u;
  }

  _currentPeriod() {
    const d = new Date();
    return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0');
  }

  recordUsage(tenantId, { tokens = 0, messages = 0, jid = '' } = {}) {
    const u = this._usageFor(tenantId);
    u.tokens += Math.max(0, parseInt(tokens, 10) || 0);
    u.messages += Math.max(0, parseInt(messages, 10) || 0);
    if (jid) {
      const j = String(jid);
      if (!u.jids.includes(j)) {
        u.jids.push(j);
        u.conversations = u.jids.length;
      }
    }
    u.updatedAt = new Date().toISOString();
    this.save();
    return u;
  }

  getUsage(tenantId) { return this._usageFor(tenantId); }
  listUsage() { return Object.values(this.data.usage); }
}

module.exports = { SalesStore, newId, normEmail };
