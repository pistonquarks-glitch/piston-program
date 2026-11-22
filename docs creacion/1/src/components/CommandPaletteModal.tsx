import React, { useState } from 'react';
import { 
  Command, 
  Search, 
  FileCode, 
  GitBranch, 
  Terminal, 
  Sparkles, 
  Play, 
  CloudUpload,
  Workflow
} from 'lucide-react';
import { FileNode } from '../types';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: FileNode[];
  onSelectFile: (file: FileNode) => void;
  onRunCode: () => void;
  onAiDiagnose: () => void;
  onTriggerBackup: () => void;
  onTriggerPipeline: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  files,
  onSelectFile,
  onRunCode,
  onAiDiagnose,
  onTriggerBackup,
  onTriggerPipeline
}) => {
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const actions = [
    {
      id: 'run',
      label: 'Ejecutar y Compilar Proyecto',
      icon: Play,
      handler: () => {
        onRunCode();
        onClose();
      }
    },
    {
      id: 'ai-fix',
      label: 'Diagnosticar Código con Gemini AI',
      icon: Sparkles,
      handler: () => {
        onAiDiagnose();
        onClose();
      }
    },
    {
      id: 'backup',
      label: 'Crear Respaldo Manual en la Nube',
      icon: CloudUpload,
      handler: () => {
        onTriggerBackup();
        onClose();
      }
    },
    {
      id: 'pipeline',
      label: 'Ejecutar Flujo CI/CD y Contenedores',
      icon: Workflow,
      handler: () => {
        onTriggerPipeline();
        onClose();
      }
    }
  ];

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(query.toLowerCase())
  );

  const filteredActions = actions.filter((a) =>
    a.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-[#1A1A1A]/80 backdrop-blur-sm flex items-start justify-center pt-20 p-4 font-sans">
      <div className="bg-white border-2 border-[#1A1A1A] w-full max-w-xl shadow-2xl overflow-hidden text-[#1A1A1A]">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-[#1A1A1A] space-x-3 bg-[#F4F4F1]">
          <Search className="w-5 h-5 text-[#3B44FF]" />
          <input
            type="text"
            placeholder="Buscar archivos, comandos o diagnósticos (ej. App.tsx, run, ai)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="flex-1 bg-transparent text-[#1A1A1A] text-sm focus:outline-none placeholder-[#1A1A1A]/50 font-medium"
          />
          <button
            onClick={onClose}
            className="text-[10px] uppercase font-mono font-bold text-white bg-[#1A1A1A] px-2 py-1 cursor-pointer"
          >
            ESC
          </button>
        </div>

        {/* Results List */}
        <div className="p-3 max-h-96 overflow-y-auto space-y-3 bg-white">
          {/* Action Commands */}
          {filteredActions.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#1A1A1A]/50 px-3 block tracking-widest">
                Comandos Directos
              </span>
              {filteredActions.map((act) => {
                const Icon = act.icon;
                return (
                  <button
                    key={act.id}
                    onClick={act.handler}
                    className="w-full flex items-center space-x-3 p-3 hover:bg-[#3B44FF] hover:text-white border border-[#1A1A1A] text-xs font-bold text-[#1A1A1A] transition-colors text-left cursor-pointer group"
                  >
                    <Icon className="w-4 h-4 text-[#3B44FF] group-hover:text-white" />
                    <span>{act.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Files List */}
          {filteredFiles.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#1A1A1A]/50 px-3 block tracking-widest">
                Archivos ({filteredFiles.length})
              </span>
              {filteredFiles.map((file) => (
                <button
                  key={file.id}
                  onClick={() => {
                    onSelectFile(file);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-2.5 hover:bg-[#F4F4F1] border border-transparent hover:border-[#1A1A1A] text-xs text-[#1A1A1A] transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <FileCode className="w-4 h-4 text-[#3B44FF]" />
                    <span className="font-mono font-bold">{file.name}</span>
                  </div>
                  <span className="text-[10px] text-[#1A1A1A]/50 font-mono">{file.path}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
