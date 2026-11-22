import React, { useState } from 'react';
import { FileDiff, ArrowLeft, Columns, AlignJustify, Check } from 'lucide-react';
import { GitDiffItem } from '../../types';

interface DiffEditorProps {
  diffItem: GitDiffItem;
  onClose: () => void;
  onAcceptDiff: () => void;
}

export const DiffEditor: React.FC<DiffEditorProps> = ({
  diffItem,
  onClose,
  onAcceptDiff
}) => {
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('split');

  const origLines = diffItem.originalContent.split('\n');
  const currLines = diffItem.currentContent.split('\n');

  const maxLines = Math.max(origLines.length, currLines.length);

  return (
    <div className="flex-1 flex flex-col bg-slate-950 h-full overflow-hidden select-none font-mono text-xs">
      {/* Diff Header */}
      <div className="h-10 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-3 text-slate-200 shrink-0">
        <div className="flex items-center space-x-2">
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white flex items-center space-x-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs">Volver</span>
          </button>
          <div className="h-4 w-[1px] bg-slate-700 mx-1" />
          <FileDiff className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-xs">{diffItem.filePath}</span>
          <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono">
            {diffItem.status.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Split vs Unified Toggle */}
          <div className="flex bg-slate-950 p-0.5 rounded border border-slate-800 text-[10px]">
            <button
              onClick={() => setViewMode('split')}
              className={`px-2 py-0.5 rounded ${
                viewMode === 'split' ? 'bg-amber-600 text-slate-950 font-bold' : 'text-slate-400'
              }`}
            >
              Dividido
            </button>
            <button
              onClick={() => setViewMode('unified')}
              className={`px-2 py-0.5 rounded ${
                viewMode === 'unified' ? 'bg-amber-600 text-slate-950 font-bold' : 'text-slate-400'
              }`}
            >
              Unificado
            </button>
          </div>

          <button
            onClick={onAcceptDiff}
            className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold px-2.5 py-1 rounded text-xs flex items-center space-x-1"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Confirmar Cambios</span>
          </button>
        </div>
      </div>

      {/* Diff Body */}
      <div className="flex-1 overflow-auto p-2 font-mono text-xs leading-5">
        {viewMode === 'split' ? (
          <div className="grid grid-cols-2 gap-2 h-full">
            {/* Left: Original Version (Head) */}
            <div className="bg-slate-900/50 p-2 rounded border border-slate-800 overflow-auto">
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-2 border-b border-slate-800 pb-1">
                Versión Anterior (Commit HEAD)
              </span>
              {Array.from({ length: maxLines }).map((_, i) => {
                const orig = origLines[i] ?? '';
                const curr = currLines[i] ?? '';
                const isDiff = orig !== curr;
                return (
                  <div
                    key={i}
                    className={`flex ${
                      isDiff ? 'bg-red-950/40 text-red-300 border-l-2 border-red-500' : 'text-slate-400'
                    }`}
                  >
                    <span className="w-8 text-right pr-2 text-slate-600 select-none">{i + 1}</span>
                    <span className="whitespace-pre truncate">{orig}</span>
                  </div>
                );
              })}
            </div>

            {/* Right: Working Copy */}
            <div className="bg-slate-900/50 p-2 rounded border border-slate-800 overflow-auto">
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-2 border-b border-slate-800 pb-1">
                Versión Actual (Espacio de Trabajo)
              </span>
              {Array.from({ length: maxLines }).map((_, i) => {
                const orig = origLines[i] ?? '';
                const curr = currLines[i] ?? '';
                const isDiff = orig !== curr;
                return (
                  <div
                    key={i}
                    className={`flex ${
                      isDiff ? 'bg-emerald-950/40 text-emerald-300 border-l-2 border-emerald-500' : 'text-slate-300'
                    }`}
                  >
                    <span className="w-8 text-right pr-2 text-slate-600 select-none">{i + 1}</span>
                    <span className="whitespace-pre truncate">{curr}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Unified View */
          <div className="bg-slate-900/50 p-3 rounded border border-slate-800 space-y-0.5 overflow-auto">
            {Array.from({ length: maxLines }).map((_, i) => {
              const orig = origLines[i] ?? '';
              const curr = currLines[i] ?? '';
              if (orig === curr) {
                return (
                  <div key={i} className="flex text-slate-400">
                    <span className="w-8 text-right pr-2 text-slate-600 select-none">{i + 1}</span>
                    <span className="whitespace-pre">{curr}</span>
                  </div>
                );
              }
              return (
                <React.Fragment key={i}>
                  {orig && (
                    <div className="flex bg-red-950/40 text-red-300 border-l-2 border-red-500">
                      <span className="w-8 text-right pr-2 text-red-500 select-none">-</span>
                      <span className="whitespace-pre">{orig}</span>
                    </div>
                  )}
                  {curr && (
                    <div className="flex bg-emerald-950/40 text-emerald-300 border-l-2 border-emerald-500">
                      <span className="w-8 text-right pr-2 text-emerald-500 select-none">+</span>
                      <span className="whitespace-pre">{curr}</span>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
