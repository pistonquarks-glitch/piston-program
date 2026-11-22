import React, { useState, useRef, useEffect } from 'react';
import { 
  Terminal as TerminalIcon, 
  Package, 
  Play, 
  Trash2, 
  Plus, 
  CheckCircle2, 
  Sparkles,
  Search,
  Download
} from 'lucide-react';
import { TerminalLog, Dependency } from '../../types';

interface TerminalPanelProps {
  logs: TerminalLog[];
  onExecuteCommand: (cmd: string) => void;
  onClearLogs: () => void;
  dependencies: Dependency[];
  onInstallDependency: (name: string, ecosystem: 'npm' | 'pip' | 'cargo') => void;
  onRemoveDependency: (name: string) => void;
}

export const TerminalPanel: React.FC<TerminalPanelProps> = ({
  logs,
  onExecuteCommand,
  onClearLogs,
  dependencies,
  onInstallDependency,
  onRemoveDependency
}) => {
  const [activeTab, setActiveTab] = useState<'cli' | 'deps'>('cli');
  const [inputCommand, setInputCommand] = useState('');
  const [newPkgName, setNewPkgName] = useState('');
  const [newPkgEco, setNewPkgEco] = useState<'npm' | 'pip' | 'cargo'>('npm');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCommand.trim()) return;
    onExecuteCommand(inputCommand.trim());
    setInputCommand('');
  };

  const handleAddPkgSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPkgName.trim()) return;
    onInstallDependency(newPkgName.trim(), newPkgEco);
    setNewPkgName('');
  };

  const getLogStyle = (type: TerminalLog['type']) => {
    switch (type) {
      case 'input':
        return 'text-blue-400 font-bold';
      case 'error':
        return 'text-red-400 bg-red-950/30 p-1 rounded border-l-2 border-red-500';
      case 'success':
        return 'text-emerald-400';
      case 'system':
        return 'text-purple-300 font-mono';
      case 'info':
        return 'text-cyan-300';
      default:
        return 'text-slate-300';
    }
  };

  return (
    <div className="w-80 bg-white border-r border-[#1A1A1A] flex flex-col h-full text-[#1A1A1A] select-none font-sans">
      {/* Header Tabs */}
      <div className="p-2 border-b border-[#1A1A1A] flex items-center justify-between bg-[#F4F4F1]">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('cli')}
            className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
              activeTab === 'cli'
                ? 'bg-[#1A1A1A] text-white'
                : 'text-[#1A1A1A]/70 hover:text-[#1A1A1A]'
            }`}
          >
            <TerminalIcon className="w-3.5 h-3.5" />
            <span>Terminal CLI</span>
          </button>
          <button
            onClick={() => setActiveTab('deps')}
            className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
              activeTab === 'deps'
                ? 'bg-[#1A1A1A] text-white'
                : 'text-[#1A1A1A]/70 hover:text-[#1A1A1A]'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Paquetes</span>
          </button>
        </div>

        {activeTab === 'cli' && (
          <button
            onClick={onClearLogs}
            className="p-1 text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white border border-[#1A1A1A] cursor-pointer"
            title="Limpiar consola"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Tab 1: Terminal CLI */}
      {activeTab === 'cli' ? (
        <div className="flex-1 flex flex-col justify-between font-mono text-xs overflow-hidden bg-[#F4F4F1]">
          {/* Quick Actions Shortcuts */}
          <div className="p-2 bg-white border-b border-[#1A1A1A] flex flex-wrap gap-1 text-[10px] font-bold">
            <button
              onClick={() => onExecuteCommand('run')}
              className="bg-[#1A1A1A] text-white hover:bg-[#3B44FF] px-2 py-1 flex items-center gap-1 cursor-pointer"
            >
              <Play className="w-2.5 h-2.5 fill-current text-[#00FF00]" /> run
            </button>
            <button
              onClick={() => onExecuteCommand('build')}
              className="bg-white text-[#1A1A1A] border border-[#1A1A1A] hover:bg-[#3B44FF] hover:text-white px-2 py-1 cursor-pointer"
            >
              build
            </button>
            <button
              onClick={() => onExecuteCommand('test')}
              className="bg-white text-[#1A1A1A] border border-[#1A1A1A] hover:bg-[#FF6321] hover:text-white px-2 py-1 cursor-pointer"
            >
              test
            </button>
            <button
              onClick={() => onExecuteCommand('git status')}
              className="bg-white text-[#1A1A1A] border border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white px-2 py-1 cursor-pointer"
            >
              git status
            </button>
            <button
              onClick={() => onExecuteCommand('ai fix')}
              className="bg-[#3B44FF] text-white px-2 py-1 flex items-center gap-1 font-bold cursor-pointer"
            >
              <Sparkles className="w-2.5 h-2.5 text-[#00FF00]" /> ai fix
            </button>
          </div>

          {/* Logs Output */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5 select-text font-mono">
            {logs.length === 0 && (
              <div className="text-[#1A1A1A]/50 italic text-[11px]">
                Terminal iniciada. Escribe 'help' o un comando como 'npm install lodash'.
              </div>
            )}
            {logs.map((log) => (
              <div key={log.id} className={`whitespace-pre-wrap ${
                log.type === 'input' ? 'text-[#3B44FF] font-bold' :
                log.type === 'error' ? 'text-white bg-[#FF6321] p-1 font-bold' :
                log.type === 'success' ? 'text-[#00AA00] font-bold' :
                'text-[#1A1A1A]'
              }`}>
                {log.type === 'input' && <span className="text-[#1A1A1A]/60 mr-1.5">opencode:~ $</span>}
                {log.text}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Command Prompt Input */}
          <form onSubmit={handleCommandSubmit} className="p-2.5 bg-white border-t border-[#1A1A1A] flex items-center space-x-2">
            <span className="text-[#3B44FF] font-bold">$</span>
            <input
              type="text"
              value={inputCommand}
              onChange={(e) => setInputCommand(e.target.value)}
              placeholder="Escribe un comando bash..."
              className="flex-1 bg-transparent text-[#1A1A1A] focus:outline-none text-xs font-mono font-medium"
            />
            <button type="submit" className="text-[#1A1A1A] hover:text-[#3B44FF] font-bold">
              ↵
            </button>
          </form>
        </div>
      ) : (
        /* Tab 2: Dependencies Manager */
        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#F4F4F1]">
          {/* Add Dependency Form */}
          <form onSubmit={handleAddPkgSubmit} className="p-3 bg-white border border-[#1A1A1A] space-y-2">
            <span className="text-xs font-serif italic text-lg text-[#1A1A1A] block">
              Instalar Dependencia
            </span>
            <div className="flex gap-1">
              <input
                type="text"
                placeholder="ej. axios, numpy, serde..."
                value={newPkgName}
                onChange={(e) => setNewPkgName(e.target.value)}
                className="flex-1 bg-[#F4F4F1] border border-[#1A1A1A] text-xs px-2 py-1 text-[#1A1A1A] focus:outline-none"
              />
              <select
                value={newPkgEco}
                onChange={(e) => setNewPkgEco(e.target.value as any)}
                className="bg-[#F4F4F1] border border-[#1A1A1A] text-xs text-[#1A1A1A] font-bold px-1"
              >
                <option value="npm">npm</option>
                <option value="pip">pip</option>
                <option value="cargo">cargo</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full bg-[#1A1A1A] hover:bg-[#3B44FF] text-white font-bold py-1.5 px-2 text-xs uppercase tracking-wider flex items-center justify-center space-x-1 cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Instalar Paquete</span>
            </button>
          </form>

          {/* Dependencies List */}
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-[#1A1A1A]/60 tracking-wider block">
              Paquetes Instalados ({dependencies.length})
            </span>
            {dependencies.map((dep) => (
              <div
                key={`${dep.ecosystem}-${dep.name}`}
                className="flex items-center justify-between p-2.5 bg-white border border-[#1A1A1A] text-xs"
              >
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-bold text-[#1A1A1A]">{dep.name}</span>
                    <span
                      className={`text-[9px] px-1 font-mono font-bold uppercase ${
                        dep.ecosystem === 'npm'
                          ? 'bg-[#FF6321] text-white'
                          : dep.ecosystem === 'pip'
                          ? 'bg-[#3B44FF] text-white'
                          : 'bg-[#1A1A1A] text-white'
                      }`}
                    >
                      {dep.ecosystem}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#1A1A1A]/60 font-mono">
                    v{dep.version} {dep.status === 'installed' ? '✓ Listo' : '⏳ Instalando...'}
                  </span>
                </div>

                <button
                  onClick={() => onRemoveDependency(dep.name)}
                  className="p-1 text-[#1A1A1A] hover:bg-[#FF6321] hover:text-white border border-[#1A1A1A] cursor-pointer"
                  title="Desinstalar"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
