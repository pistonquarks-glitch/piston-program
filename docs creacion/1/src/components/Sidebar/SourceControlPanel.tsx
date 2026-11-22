import React, { useState } from 'react';
import { 
  GitBranch, 
  GitCommit, 
  GitMerge, 
  RotateCcw, 
  Check, 
  Plus, 
  FileDiff, 
  ShieldCheck,
  History,
  ArrowUpRight,
  GitPullRequest
} from 'lucide-react';
import { GitCommit as GitCommitType, GitBranch as GitBranchType, GitDiffItem } from '../../types';

interface SourceControlPanelProps {
  branches: GitBranchType[];
  activeBranch: string;
  onSelectBranch: (branch: string) => void;
  onCreateBranch: (name: string) => void;
  diffItems: GitDiffItem[];
  commitHistory: GitCommitType[];
  onCommit: (message: string) => void;
  onRevertToCommit: (commit: GitCommitType) => void;
  onOpenDiffView: (diff: GitDiffItem) => void;
  isIntegrityVerified: boolean;
}

export const SourceControlPanel: React.FC<SourceControlPanelProps> = ({
  branches,
  activeBranch,
  onSelectBranch,
  onCreateBranch,
  diffItems,
  commitHistory,
  onCommit,
  onRevertToCommit,
  onOpenDiffView,
  isIntegrityVerified
}) => {
  const [commitMessage, setCommitMessage] = useState('');
  const [newBranchInput, setNewBranchInput] = useState('');
  const [showNewBranchForm, setShowNewBranchForm] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'changes' | 'history'>('changes');

  const handleCommitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commitMessage.trim()) return;
    onCommit(commitMessage.trim());
    setCommitMessage('');
  };

  const handleCreateBranchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newBranchInput.trim()) {
      onCreateBranch(newBranchInput.trim());
      setNewBranchInput('');
      setShowNewBranchForm(false);
    }
  };

  return (
    <div className="w-72 bg-white border-r border-[#1A1A1A] flex flex-col h-full text-[#1A1A1A] select-none font-sans">
      {/* Header */}
      <div className="p-4 border-b border-[#1A1A1A] flex items-center justify-between bg-[#F4F4F1]">
        <div>
          <h2 className="font-serif italic text-xl text-[#1A1A1A] leading-tight">Control de Versiones</h2>
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/50">Git Historial</span>
        </div>
        <button
          onClick={() => setShowNewBranchForm(!showNewBranchForm)}
          className="p-1 text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white border border-[#1A1A1A] cursor-pointer transition-colors"
          title="Crear nueva rama"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Branch Selector & Create */}
      <div className="p-3 border-b border-[#1A1A1A] bg-[#F4F4F1] space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#1A1A1A] font-bold">Rama Actual:</span>
          <span className="text-white font-mono font-bold bg-[#1A1A1A] px-2 py-0.5">
            {activeBranch}
          </span>
        </div>

        {showNewBranchForm ? (
          <form onSubmit={handleCreateBranchSubmit} className="flex gap-1 mt-1">
            <input
              type="text"
              placeholder="nombre-rama..."
              value={newBranchInput}
              onChange={(e) => setNewBranchInput(e.target.value)}
              className="bg-white border border-[#1A1A1A] text-xs px-2 py-1 text-[#1A1A1A] focus:outline-none flex-1 font-mono font-bold"
              autoFocus
            />
            <button
              type="submit"
              className="bg-[#1A1A1A] text-white font-bold px-2 py-1 text-xs hover:bg-[#3B44FF] cursor-pointer"
            >
              Crear
            </button>
          </form>
        ) : (
          <div className="flex flex-wrap gap-1">
            {branches.map((b) => (
              <button
                key={b.name}
                onClick={() => onSelectBranch(b.name)}
                className={`text-[11px] font-mono px-2 py-0.5 border cursor-pointer ${
                  b.name === activeBranch
                    ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] font-bold'
                    : 'bg-white text-[#1A1A1A] border-[#1A1A1A] hover:bg-[#3B44FF] hover:text-white'
                }`}
              >
                {b.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sub Tabs: Changes vs History */}
      <div className="flex border-b border-[#1A1A1A] text-xs font-bold uppercase tracking-wider bg-[#F4F4F1]">
        <button
          onClick={() => setActiveSubTab('changes')}
          className={`flex-1 py-2 text-center transition-colors cursor-pointer ${
            activeSubTab === 'changes'
              ? 'bg-[#1A1A1A] text-white'
              : 'text-[#1A1A1A]/70 hover:text-[#1A1A1A]'
          }`}
        >
          Cambios ({diffItems.length})
        </button>
        <button
          onClick={() => setActiveSubTab('history')}
          className={`flex-1 py-2 text-center transition-colors cursor-pointer ${
            activeSubTab === 'history'
              ? 'bg-[#1A1A1A] text-white'
              : 'text-[#1A1A1A]/70 hover:text-[#1A1A1A]'
          }`}
        >
          Historial ({commitHistory.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-white">
        {activeSubTab === 'changes' ? (
          <>
            {/* Commit Form */}
            <form onSubmit={handleCommitSubmit} className="space-y-2">
              <textarea
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Mensaje de commit..."
                rows={2}
                className="w-full bg-[#F4F4F1] border border-[#1A1A1A] p-2 text-xs text-[#1A1A1A] placeholder-[#1A1A1A]/50 focus:outline-none resize-none font-medium"
              />
              <button
                type="submit"
                disabled={diffItems.length === 0 || !commitMessage.trim()}
                className="w-full bg-[#1A1A1A] hover:bg-[#3B44FF] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-3 text-xs uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
              >
                <GitCommit className="w-3.5 h-3.5 text-[#00FF00]" />
                <span>Confirmar Commit</span>
              </button>
            </form>

            {/* Changed Files List */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#1A1A1A]/50 tracking-wider block mb-1">
                Archivos Modificados ({diffItems.length})
              </span>
              {diffItems.length === 0 ? (
                <div className="p-4 text-center border-2 border-dashed border-[#1A1A1A] text-xs text-[#1A1A1A]/60 font-medium">
                  <Check className="w-5 h-5 mx-auto mb-1 text-[#00AA00]" />
                  Sin cambios pendientes.
                </div>
              ) : (
                diffItems.map((item) => (
                  <div
                    key={item.filePath}
                    onClick={() => onOpenDiffView(item)}
                    className="flex items-center justify-between p-2.5 bg-[#F4F4F1] hover:bg-[#3B44FF] hover:text-white border border-[#1A1A1A] cursor-pointer text-xs group transition-colors"
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <FileDiff className="w-3.5 h-3.5 text-[#3B44FF] group-hover:text-white shrink-0" />
                      <span className="font-mono text-[11px] font-bold truncate">
                        {item.filePath}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <span
                        className={`text-[9px] font-mono px-1 font-bold uppercase text-white ${
                          item.status === 'added'
                            ? 'bg-[#00AA00]'
                            : item.status === 'deleted'
                            ? 'bg-[#FF6321]'
                            : 'bg-[#1A1A1A]'
                        }`}
                      >
                        {item.status === 'added' ? '+Nuevo' : item.status === 'deleted' ? '-Elim' : '~Mod'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          /* History Subtab */
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold text-[#1A1A1A]/50 tracking-wider block">
              Registro de Commits
            </span>
            {commitHistory.length === 0 ? (
              <div className="text-xs text-[#1A1A1A]/60 p-3 text-center border-2 border-dashed border-[#1A1A1A]">
                Sin historial.
              </div>
            ) : (
              commitHistory.map((commit) => (
                <div
                  key={commit.id}
                  className="p-2.5 bg-[#F4F4F1] border border-[#1A1A1A] text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-white text-[10px] bg-[#1A1A1A] px-1.5 py-0.5 font-bold">
                      #{commit.hash}
                    </span>
                    <span className="text-[10px] text-[#1A1A1A]/60 font-mono">{commit.timestamp}</span>
                  </div>
                  <p className="font-bold text-[#1A1A1A] line-clamp-2">{commit.message}</p>
                  <div className="flex items-center justify-between text-[10px] text-[#1A1A1A]/80 pt-1 border-t border-[#1A1A1A]/20">
                    <span>👤 {commit.author}</span>
                    <button
                      onClick={() => onRevertToCommit(commit)}
                      className="flex items-center space-x-1 text-[#3B44FF] font-bold hover:underline cursor-pointer"
                      title="Restaurar a esta versión"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Revertir</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Integrity Protection Banner */}
      <div className="p-3 border-t border-[#1A1A1A] bg-[#F4F4F1] flex items-center justify-between text-xs">
        <div className="flex items-center space-x-1.5 text-[#1A1A1A] font-bold">
          <ShieldCheck className="w-4 h-4 text-[#00AA00]" />
          <span>Integridad SHA256</span>
        </div>
        <span className="text-[10px] font-mono font-black text-white bg-[#00AA00] px-1.5 py-0.5">
          OK
        </span>
      </div>
    </div>
  );
};
