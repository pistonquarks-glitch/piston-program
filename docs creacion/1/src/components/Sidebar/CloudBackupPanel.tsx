import React, { useState } from 'react';
import { 
  CloudUpload, 
  RotateCcw, 
  Download, 
  CheckCircle2, 
  Clock, 
  HardDrive, 
  RefreshCw,
  Plus,
  Lock
} from 'lucide-react';
import { BackupSnapshot } from '../../types';

interface CloudBackupPanelProps {
  snapshots: BackupSnapshot[];
  onTriggerManualBackup: (name: string) => void;
  onRestoreSnapshot: (snapshot: BackupSnapshot) => void;
  autoSaveIntervalSec: number;
  onChangeAutoSaveInterval: (sec: number) => void;
  lastBackupTime: string;
  onExportProjectZip: () => void;
}

export const CloudBackupPanel: React.FC<CloudBackupPanelProps> = ({
  snapshots,
  onTriggerManualBackup,
  onRestoreSnapshot,
  autoSaveIntervalSec,
  onChangeAutoSaveInterval,
  lastBackupTime,
  onExportProjectZip
}) => {
  const [snapshotNameInput, setSnapshotNameInput] = useState('');

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!snapshotNameInput.trim()) return;
    onTriggerManualBackup(snapshotNameInput.trim());
    setSnapshotNameInput('');
  };

  return (
    <div className="w-80 bg-white border-r border-[#1A1A1A] flex flex-col h-full text-[#1A1A1A] select-none font-sans">
      {/* Header */}
      <div className="p-4 border-b border-[#1A1A1A] flex items-center justify-between bg-[#F4F4F1]">
        <div>
          <h2 className="font-serif italic text-xl text-[#1A1A1A] leading-tight">Respaldo Nube</h2>
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/50">Sincronización Continua</span>
        </div>
        <span className="text-[10px] bg-[#00FF00] text-[#1A1A1A] border border-[#1A1A1A] px-2 py-0.5 font-bold uppercase tracking-wider font-mono">
          Activo
        </span>
      </div>

      {/* Auto Save Settings */}
      <div className="p-3 border-b border-[#1A1A1A] bg-[#F4F4F1] space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#1A1A1A] font-bold">Frecuencia de Auto-Guardado:</span>
          <select
            value={autoSaveIntervalSec}
            onChange={(e) => onChangeAutoSaveInterval(Number(e.target.value))}
            className="bg-white border border-[#1A1A1A] text-[#1A1A1A] font-bold px-2 py-0.5 text-xs focus:outline-none"
          >
            <option value={15}>Cada 15 segundos</option>
            <option value={30}>Cada 30 segundos</option>
            <option value={60}>Cada 1 minuto</option>
            <option value={0}>Manual únicamente</option>
          </select>
        </div>

        <div className="flex items-center justify-between text-[11px] text-[#1A1A1A] font-medium pt-1">
          <span>Último guardado:</span>
          <span className="font-mono font-bold text-[#3B44FF]">{lastBackupTime}</span>
        </div>
      </div>

      {/* Create Snapshot Form */}
      <div className="p-3 border-b border-[#1A1A1A] bg-white space-y-2">
        <span className="text-xs font-bold text-[#1A1A1A] block">
          Crear Punto de Restauración Manual
        </span>
        <form onSubmit={handleManualSubmit} className="flex gap-1">
          <input
            type="text"
            placeholder="ej. Versión estable..."
            value={snapshotNameInput}
            onChange={(e) => setSnapshotNameInput(e.target.value)}
            className="flex-1 bg-[#F4F4F1] border border-[#1A1A1A] text-xs px-2 py-1 text-[#1A1A1A] font-medium focus:outline-none"
          />
          <button
            type="submit"
            className="bg-[#1A1A1A] hover:bg-[#3B44FF] text-white font-bold px-2.5 py-1 text-xs uppercase tracking-wider shrink-0 flex items-center space-x-1 cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Crear</span>
          </button>
        </form>
      </div>

      {/* Snapshot History */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-white">
        <span className="text-[10px] uppercase font-bold text-[#1A1A1A]/50 tracking-wider block">
          Puntos de Restauración ({snapshots.length})
        </span>

        {snapshots.length === 0 ? (
          <div className="text-xs text-[#1A1A1A]/60 p-3 text-center border-2 border-dashed border-[#1A1A1A]">
            Sin puntos de respaldo guardados aún.
          </div>
        ) : (
          snapshots.map((snap) => (
            <div
              key={snap.id}
              className="p-2.5 bg-[#F4F4F1] border border-[#1A1A1A] text-xs space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#1A1A1A]">{snap.name}</span>
                <span className="text-[10px] font-mono text-[#1A1A1A]/60">{snap.timestamp}</span>
              </div>

              <div className="flex items-center justify-between text-[10px] text-[#1A1A1A]">
                <div className="flex items-center space-x-2">
                  <span className="bg-[#1A1A1A] text-white px-1.5 py-0.5 font-mono font-bold">
                    {snap.sizeKb} KB
                  </span>
                  {snap.isAuto && (
                    <span className="text-[#3B44FF] font-bold">🤖 Auto</span>
                  )}
                </div>

                <button
                  onClick={() => onRestoreSnapshot(snap)}
                  className="flex items-center space-x-1 text-[#3B44FF] font-bold hover:underline cursor-pointer"
                  title="Restaurar este estado de archivos"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restaurar</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Download & Export Project */}
      <div className="p-3 border-t border-[#1A1A1A] bg-[#F4F4F1] space-y-2">
        <button
          onClick={onExportProjectZip}
          className="w-full bg-[#1A1A1A] hover:bg-[#3B44FF] text-white font-bold py-2 px-3 text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-[#00FF00]" />
          <span>Exportar Código (ZIP)</span>
        </button>
        <div className="flex items-center justify-center space-x-1 text-[10px] font-bold text-[#1A1A1A]/60">
          <Lock className="w-3 h-3 text-[#00AA00]" />
          <span>Sincronización cifrada activa</span>
        </div>
      </div>
    </div>
  );
};
