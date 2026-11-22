import React, { useState } from 'react';
import { 
  Code2, 
  Play, 
  Sparkles, 
  GitBranch as GitIcon, 
  Users, 
  Command, 
  MessageSquare, 
  Key, 
  ChevronDown,
  Layers,
  Settings,
  Cloud,
  Laptop,
  Sun,
  Moon
} from 'lucide-react';
import { PeerUser, GitBranch } from '../../types';

export type MainViewMode = 'chatbot' | 'editor' | 'split';

interface HeaderBarProps {
  projectName: string;
  activeBranch: string;
  branches: GitBranch[];
  onSelectBranch: (branch: string) => void;
  collaborators: PeerUser[];
  onRunCode: () => void;
  onAiDiagnose: () => void;
  onToggleCollabModal: () => void;
  onOpenCommandPalette: () => void;
  isSaving: boolean;
  lastBackupTime: string;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  language: string;
  viewMode: MainViewMode;
  onChangeViewMode: (mode: MainViewMode) => void;
  onOpenApiKeysModal: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  projectName,
  activeBranch,
  branches,
  onSelectBranch,
  collaborators,
  onRunCode,
  onAiDiagnose,
  onToggleCollabModal,
  onOpenCommandPalette,
  theme,
  onToggleTheme,
  viewMode,
  onChangeViewMode,
  onOpenApiKeysModal
}) => {
  const [isToolsOpen, setIsToolsOpen] = useState(false);

  return (
    <header className="h-13 bg-[#1A1A1A] border-b border-[#333] text-white flex items-center justify-between px-4 select-none z-20 font-sans shadow-md">
      {/* Left: Brand & 2 Main Modes (Modo Normal vs Modo Programador) */}
      <div className="flex items-center space-x-4">
        {/* Logo OpenCode / OpenCloud */}
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-[#3B44FF] flex items-center justify-center font-black text-xs text-white rounded-none">
            OC
          </div>
          <span className="font-bold text-sm tracking-tight">
            Open<span className="text-[#00FF00]">Code</span> Studio
          </span>
        </div>

        <div className="h-4 w-[1px] bg-white/20" />

        {/* 2 Modes Selector: Modo Normal (Chat + Render) vs Modo Programador (IDE) */}
        <div className="flex bg-[#2A2A2A] border border-[#444] p-0.5 rounded text-xs font-bold">
          <button
            onClick={() => onChangeViewMode('chatbot')}
            className={`flex items-center space-x-1.5 px-3 py-1 transition-all cursor-pointer rounded-sm ${
              viewMode === 'chatbot'
                ? 'bg-[#3B44FF] text-white font-extrabold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
            title="Modo Normal: Conversación con IA y Pantalla de Renderización"
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#00FF00]" />
            <span>Modo Normal (Chat)</span>
          </button>

          <button
            onClick={() => onChangeViewMode('editor')}
            className={`flex items-center space-x-1.5 px-3 py-1 transition-all cursor-pointer rounded-sm ${
              viewMode === 'editor'
                ? 'bg-white text-[#1A1A1A] font-extrabold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
            title="Modo Programador: IDE Completo con Código y Servidor"
          >
            <Laptop className="w-3.5 h-3.5 text-[#3B44FF]" />
            <span>Modo Programador (IDE)</span>
          </button>
        </div>
      </div>

      {/* Right: Dropdown Menu & Quick Actions */}
      <div className="flex items-center space-x-2">
        {/* Light / Dark Mode Toggle */}
        <button
          onClick={onToggleTheme}
          className="flex items-center space-x-1.5 bg-[#2A2A2A] hover:bg-[#333] border border-[#444] text-xs font-bold text-slate-200 px-2.5 py-1 transition-colors cursor-pointer"
          title={`Cambiar a ${theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}`}
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Modo Claro</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Modo Oscuro</span>
            </>
          )}
        </button>

        {/* Run Button */}
        <button
          onClick={onRunCode}
          className="flex items-center space-x-1.5 bg-[#00AA00] hover:bg-[#00FF00] text-white hover:text-[#1A1A1A] text-xs font-bold uppercase tracking-wider px-3 py-1 transition-colors cursor-pointer"
          title="Ejecutar Código / Servidor Local"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Ejecutar</span>
        </button>

        {/* Tools Dropdown Menu */}
        <div className="relative">
          <button
            onClick={() => setIsToolsOpen(!isToolsOpen)}
            className="flex items-center space-x-1.5 bg-[#2A2A2A] hover:bg-[#333] border border-[#444] text-xs font-bold text-slate-200 px-3 py-1 transition-colors cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-[#3B44FF]" />
            <span>Herramientas</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isToolsOpen && (
            <div 
              className="absolute right-0 mt-2 w-56 bg-[#2A2A2A] border-2 border-[#1A1A1A] shadow-2xl z-50 text-xs text-white p-1 space-y-1"
              onMouseLeave={() => setIsToolsOpen(false)}
            >
              <button
                onClick={() => {
                  onOpenApiKeysModal();
                  setIsToolsOpen(false);
                }}
                className="w-full text-left flex items-center space-x-2 px-3 py-2 hover:bg-[#3B44FF] transition-colors cursor-pointer"
              >
                <Key className="w-4 h-4 text-[#00FF00]" />
                <div>
                  <div className="font-bold">Claves de API</div>
                  <div className="text-[10px] text-slate-400">Gemini, OpenAI, Claude</div>
                </div>
              </button>

              <button
                onClick={() => {
                  onAiDiagnose();
                  setIsToolsOpen(false);
                }}
                className="w-full text-left flex items-center space-x-2 px-3 py-2 hover:bg-[#3B44FF] transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#00FF00]" />
                <div>
                  <div className="font-bold">Diagnóstico Predictivo</div>
                  <div className="text-[10px] text-slate-400">Detectar bugs en el código</div>
                </div>
              </button>

              <button
                onClick={() => {
                  onToggleCollabModal();
                  setIsToolsOpen(false);
                }}
                className="w-full text-left flex items-center space-x-2 px-3 py-2 hover:bg-[#3B44FF] transition-colors cursor-pointer"
              >
                <Users className="w-4 h-4 text-[#3B44FF]" />
                <div>
                  <div className="font-bold">Colaboradores</div>
                  <div className="text-[10px] text-slate-400">{collaborators.length} en línea</div>
                </div>
              </button>

              <div className="border-t border-[#444] my-1" />

              {/* Git Branch Selector in Dropdown */}
              <div className="px-3 py-1.5 text-[11px]">
                <div className="text-slate-400 font-bold mb-1 flex items-center space-x-1">
                  <GitIcon className="w-3 h-3 text-[#FF6321]" />
                  <span>Rama Git:</span>
                </div>
                <select
                  value={activeBranch}
                  onChange={(e) => {
                    onSelectBranch(e.target.value);
                    setIsToolsOpen(false);
                  }}
                  className="w-full bg-[#1A1A1A] border border-[#444] text-white p-1 text-xs font-mono focus:outline-none"
                >
                  {branches.map((b) => (
                    <option key={b.name} value={b.name}>
                      {b.name} {b.isCurrent ? '●' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Command Palette Trigger */}
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center space-x-1 bg-[#2A2A2A] hover:bg-[#3B44FF] text-slate-300 hover:text-white border border-[#444] px-2 py-1 text-[10px] font-mono transition-colors cursor-pointer"
          title="Paleta de Comandos (Ctrl + K)"
        >
          <Command className="w-3 h-3" />
          <span>Ctrl+K</span>
        </button>
      </div>
    </header>
  );
};


