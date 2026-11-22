import React, { useState } from 'react';
import { 
  FileCode, 
  Folder, 
  FolderOpen, 
  FilePlus, 
  FolderPlus, 
  Trash2, 
  Edit3, 
  ChevronRight, 
  ChevronDown,
  Layers,
  Sparkles
} from 'lucide-react';
import { FileNode, SupportedLanguage } from '../../types';

interface FileExplorerPanelProps {
  files: FileNode[];
  activeFileId: string | null;
  onSelectFile: (file: FileNode) => void;
  onCreateFile: (name: string, language: SupportedLanguage, parentPath?: string) => void;
  onCreateFolder: (name: string, parentPath?: string) => void;
  onDeleteFile: (id: string) => void;
  onRenameFile: (id: string, newName: string) => void;
  onLoadTemplate: (templateType: 'react' | 'python' | 'cpp' | 'rust' | 'fullstack') => void;
}

export const FileExplorerPanel: React.FC<FileExplorerPanelProps> = ({
  files,
  activeFileId,
  onSelectFile,
  onCreateFile,
  onCreateFolder,
  onDeleteFile,
  onRenameFile,
  onLoadTemplate
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    'src': true
  });
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const handleCreateFileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    
    let lang: SupportedLanguage = 'typescript';
    if (newFileName.endsWith('.py')) lang = 'python';
    else if (newFileName.endsWith('.cpp') || newFileName.endsWith('.h')) lang = 'cpp';
    else if (newFileName.endsWith('.rs')) lang = 'rust';
    else if (newFileName.endsWith('.html')) lang = 'html';
    else if (newFileName.endsWith('.css')) lang = 'css';
    else if (newFileName.endsWith('.json')) lang = 'json';
    else if (newFileName.toLowerCase().includes('docker')) lang = 'dockerfile';
    else if (newFileName.endsWith('.md')) lang = 'markdown';
    else if (newFileName.endsWith('.js') || newFileName.endsWith('.jsx')) lang = 'javascript';

    onCreateFile(newFileName.trim(), lang);
    setNewFileName('');
    setIsCreatingFile(false);
  };

  const handleRenameSubmit = (id: string, e: React.FormEvent) => {
    e.preventDefault();
    if (editName.trim()) {
      onRenameFile(id, editName.trim());
    }
    setEditingId(null);
  };

  const getFileIconColor = (name: string) => {
    if (name.endsWith('.tsx') || name.endsWith('.ts')) return 'text-blue-400';
    if (name.endsWith('.py')) return 'text-yellow-400';
    if (name.endsWith('.cpp')) return 'text-indigo-400';
    if (name.endsWith('.rs')) return 'text-orange-400';
    if (name.endsWith('.css')) return 'text-cyan-400';
    if (name.endsWith('.json')) return 'text-amber-300';
    if (name.toLowerCase().includes('docker')) return 'text-emerald-400';
    return 'text-slate-400';
  };

  const renderTree = (node: FileNode, level = 0) => {
    if (node.type === 'folder') {
      const isExpanded = expandedFolders[node.path] ?? true;
      return (
        <div key={node.id} className="select-none">
          <div
            onClick={() => toggleFolder(node.path)}
            className="flex items-center space-x-1.5 py-1 px-2 hover:bg-[#F4F4F1] cursor-pointer text-xs font-bold text-[#1A1A1A] transition-colors"
            style={{ paddingLeft: `${level * 12 + 8}px` }}
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-[#1A1A1A]/70 shrink-0" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-[#1A1A1A]/70 shrink-0" />
            )}
            {isExpanded ? (
              <FolderOpen className="w-4 h-4 text-[#3B44FF] shrink-0" />
            ) : (
              <Folder className="w-4 h-4 text-[#3B44FF] shrink-0" />
            )}
            <span className="truncate">{node.name}</span>
          </div>
          {isExpanded && node.children && (
            <div>
              {node.children.map((child) => renderTree(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    const isActive = activeFileId === node.id;
    const isEditing = editingId === node.id;

    return (
      <div
        key={node.id}
        className={`group flex items-center justify-between py-1 px-2 hover:bg-[#F4F4F1] cursor-pointer text-xs transition-colors ${
          isActive ? 'bg-[#3B44FF]/10 text-[#3B44FF] border-l-2 border-[#3B44FF] font-bold' : 'text-[#1A1A1A]/80 font-medium'
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => onSelectFile(node)}
      >
        <div className="flex items-center space-x-2 truncate">
          <FileCode className={`w-4 h-4 shrink-0 ${getFileIconColor(node.name)}`} />
          {isEditing ? (
            <form onSubmit={(e) => handleRenameSubmit(node.id, e)} className="flex items-center">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                autoFocus
                className="bg-white border border-[#3B44FF] text-xs px-1 py-0.5 text-[#1A1A1A] focus:outline-none"
              />
            </form>
          ) : (
            <span className="truncate">{node.name}</span>
          )}
          {node.isModified && <span className="w-2 h-2 rounded-full bg-[#FF6321] shrink-0" title="Cambios no guardados localmente" />}
        </div>

        <div className="hidden group-hover:flex items-center space-x-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditingId(node.id);
              setEditName(node.name);
            }}
            className="p-1 hover:text-blue-400 text-slate-500 rounded"
            title="Renombrar archivo"
          >
            <Edit3 className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteFile(node.id);
            }}
            className="p-1 hover:text-red-400 text-slate-500 rounded"
            title="Eliminar archivo"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-64 bg-white border-r border-[#1A1A1A] flex flex-col h-full text-[#1A1A1A] select-none font-sans">
      {/* Panel Header */}
      <div className="p-4 border-b border-[#1A1A1A] flex items-center justify-between bg-[#F4F4F1]">
        <div>
          <h2 className="font-serif italic text-xl text-[#1A1A1A] leading-tight">Project Tree</h2>
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/50">Estructura de Trabajo</span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setIsCreatingFile(true)}
            className="p-1 text-[#1A1A1A] hover:bg-[#3B44FF] hover:text-white transition-colors border border-[#1A1A1A] cursor-pointer"
            title="Nuevo archivo"
          >
            <FilePlus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              const name = prompt('Nombre de la nueva carpeta:');
              if (name) onCreateFolder(name);
            }}
            className="p-1 text-[#1A1A1A] hover:bg-[#3B44FF] hover:text-white transition-colors border border-[#1A1A1A] cursor-pointer"
            title="Nueva carpeta"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Template Selector */}
      <div className="p-3 border-b border-[#1A1A1A] bg-white">
        <span className="text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/60 mb-2 block">
          Plantillas
        </span>
        <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold">
          <button
            onClick={() => onLoadTemplate('react')}
            className="bg-[#F4F4F1] hover:bg-[#3B44FF] hover:text-white text-[#1A1A1A] p-1.5 border border-[#1A1A1A] text-left truncate transition-colors cursor-pointer"
          >
            React Web
          </button>
          <button
            onClick={() => onLoadTemplate('python')}
            className="bg-[#F4F4F1] hover:bg-[#FF6321] hover:text-white text-[#1A1A1A] p-1.5 border border-[#1A1A1A] text-left truncate transition-colors cursor-pointer"
          >
            Python ML
          </button>
          <button
            onClick={() => onLoadTemplate('cpp')}
            className="bg-[#F4F4F1] hover:bg-[#3B44FF] hover:text-white text-[#1A1A1A] p-1.5 border border-[#1A1A1A] text-left truncate transition-colors cursor-pointer"
          >
            C++ Engine
          </button>
          <button
            onClick={() => onLoadTemplate('rust')}
            className="bg-[#F4F4F1] hover:bg-[#FF6321] hover:text-white text-[#1A1A1A] p-1.5 border border-[#1A1A1A] text-left truncate transition-colors cursor-pointer"
          >
            Rust CLI
          </button>
        </div>
      </div>

      {/* New File Input Modal / Form */}
      {isCreatingFile && (
        <form onSubmit={handleCreateFileSubmit} className="p-3 bg-[#F4F4F1] border-b border-[#1A1A1A]">
          <input
            type="text"
            placeholder="nombre.ts, script.py, main.cpp..."
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            autoFocus
            className="w-full bg-white text-xs p-1.5 font-mono text-[#1A1A1A] border border-[#1A1A1A] focus:outline-none"
          />
          <div className="flex justify-end space-x-2 mt-2">
            <button
              type="button"
              onClick={() => setIsCreatingFile(false)}
              className="text-[10px] uppercase font-bold tracking-wider text-[#1A1A1A]/70 px-2 py-1 hover:underline"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="text-[10px] uppercase font-bold tracking-wider bg-[#1A1A1A] text-white px-3 py-1 hover:bg-[#3B44FF]"
            >
              Crear
            </button>
          </div>
        </form>
      )}

      {/* File Tree List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-[13px]">
        {files.map((file) => renderTree(file))}
      </div>

      {/* Bottom Info Banner */}
      <div className="p-3 border-t border-[#1A1A1A] bg-[#1A1A1A] text-white text-[11px] flex items-center justify-between">
        <div className="flex items-center space-x-1">
          <Sparkles className="w-3.5 h-3.5 text-[#00FF00]" />
          <span className="font-bold uppercase tracking-wider text-[10px]">Multilenguaje</span>
        </div>
        <span className="text-white/60 font-mono text-[10px]">{files.length} archivos</span>
      </div>
    </div>
  );
};
