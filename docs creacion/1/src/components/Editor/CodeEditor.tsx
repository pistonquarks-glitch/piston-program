import React, { useState, useRef } from 'react';
import { 
  X, 
  FileCode, 
  Columns, 
  Sparkles, 
  Copy, 
  Check, 
  CornerDownLeft,
  Maximize2
} from 'lucide-react';
import { EditorTab, PeerUser, SupportedLanguage } from '../../types';

interface CodeEditorProps {
  tabs: EditorTab[];
  activeTabId: string | null;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  content: string;
  onChangeContent: (newContent: string) => void;
  language: SupportedLanguage;
  collaborators: PeerUser[];
  activeLineNumber: number;
  setActiveLineNumber: (line: number) => void;
  onQuickAiExplain: () => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  content,
  onChangeContent,
  language,
  collaborators,
  activeLineNumber,
  setActiveLineNumber,
  onQuickAiExplain
}) => {
  const [copied, setCopied] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autoCompleteFilter, setAutoCompleteFilter] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const lines = content.split('\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newContent = content.substring(0, start) + '  ' + content.substring(end);
      onChangeContent(newContent);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  const handleTextareaClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const caretPos = textarea.selectionStart;
    const textBeforeCaret = content.substring(0, caretPos);
    const lineNum = textBeforeCaret.split('\n').length;
    setActiveLineNumber(lineNum);
  };

  const autocompleteSnippets: Record<string, string[]> = {
    typescript: ['import React from "react";', 'const [state, setState] = useState();', 'export default function Component() {}', 'interface Props {}'],
    python: ['def main():', 'import sys, math', 'if __name__ == "__main__":', 'print(f"Data: {data}")'],
    cpp: ['#include <iostream>', 'using namespace std;', 'int main() { return 0; }', 'std::vector<int> numbers;'],
    rust: ['fn main() {', 'println!("Hello OpenCode!");', 'let mut buffer = String::new();', 'pub struct Config {}']
  };

  return (
    <div className="flex-1 flex flex-col bg-white h-full overflow-hidden select-none font-mono text-xs text-[#1A1A1A]">
      {/* Tabs Header */}
      <div className="h-10 bg-[#F4F4F1] border-b border-[#1A1A1A] flex items-center justify-between px-2 overflow-x-auto select-none shrink-0 font-sans">
        <div className="flex items-center space-x-1 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`group flex items-center space-x-2 px-3 py-2 border-r border-[#1A1A1A] cursor-pointer text-xs transition-colors ${
                  isActive
                    ? 'bg-white text-[#1A1A1A] font-bold border-t-2 border-t-[#3B44FF]'
                    : 'bg-[#F4F4F1] text-[#1A1A1A]/70 hover:text-[#1A1A1A] hover:bg-white/80'
                }`}
              >
                <FileCode className="w-3.5 h-3.5 text-[#3B44FF] shrink-0" />
                <span className="truncate max-w-[120px] font-mono text-[11px]">{tab.name}</span>
                {tab.isDirty && <span className="w-2 h-2 rounded-full bg-[#FF6321]" title="Modificado" />}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                  className="p-0.5 text-[#1A1A1A]/50 hover:text-[#1A1A1A] group-hover:opacity-100 opacity-60"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Top Right Editor Toolbar */}
        <div className="flex items-center space-x-2 shrink-0 pl-2">
          <button
            onClick={onQuickAiExplain}
            className="flex items-center space-x-1.5 text-[10px] uppercase font-bold tracking-wider bg-[#3B44FF] text-white border border-[#3B44FF] hover:bg-[#1A1A1A] px-2.5 py-1 transition-colors cursor-pointer"
            title="Explicar código activo con Gemini"
          >
            <Sparkles className="w-3 h-3 text-[#00FF00]" />
            <span>Explicar AI</span>
          </button>
          <button
            onClick={handleCopy}
            className="p-1.5 text-[#1A1A1A] hover:bg-[#F4F4F1] border border-[#1A1A1A] transition-colors cursor-pointer"
            title="Copiar código al portapapeles"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#00AA00]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Line Numbers Column */}
        <div className="w-12 bg-[#F4F4F1] border-r border-[#1A1A1A] py-3 text-right pr-3 select-none text-[#1A1A1A]/50 font-mono text-xs leading-5 shrink-0">
          {lines.map((_, idx) => {
            const lineNum = idx + 1;
            const isCurrent = lineNum === activeLineNumber;
            return (
              <div
                key={idx}
                className={`${isCurrent ? 'text-[#3B44FF] font-black bg-[#3B44FF]/10 -mr-3 pr-3 border-r-2 border-[#3B44FF]' : ''}`}
              >
                {lineNum}
              </div>
            );
          })}
        </div>

        {/* Text Area & Line Overlay */}
        <div className="flex-1 relative overflow-auto bg-white font-mono text-xs leading-5">
          {/* Active Line Highlight Background */}
          <div
            className="absolute left-0 right-0 bg-[#3B44FF]/5 pointer-events-none transition-all duration-75"
            style={{
              top: `${(activeLineNumber - 1) * 20 + 12}px`,
              height: '20px'
            }}
          />

          {/* Collaborator Cursor Indicators */}
          {collaborators.map((peer) => {
            if (!peer.cursorLine) return null;
            return (
              <div
                key={peer.id}
                className="absolute left-2 flex items-center space-x-1 pointer-events-none z-10 transition-all duration-150"
                style={{
                  top: `${(peer.cursorLine - 1) * 20 + 12}px`
                }}
              >
                <div className="w-0.5 h-5 animate-pulse" style={{ backgroundColor: peer.color === '#3b82f6' ? '#3B44FF' : peer.color === '#10b981' ? '#00FF00' : '#FF6321' }} />
                <span
                  className="text-[9px] text-white px-1.5 py-0.5 font-bold uppercase tracking-wider"
                  style={{ backgroundColor: peer.color === '#3b82f6' ? '#3B44FF' : peer.color === '#10b981' ? '#00FF00' : '#FF6321' }}
                >
                  {peer.name}
                </span>
              </div>
            );
          })}

          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => onChangeContent(e.target.value)}
            onKeyDown={handleKeyDown}
            onClick={handleTextareaClick}
            onKeyUp={handleTextareaClick}
            spellCheck={false}
            className="w-full h-full p-3 bg-transparent text-[#1A1A1A] focus:outline-none resize-none font-mono text-xs leading-5 whitespace-pre selection:bg-[#3B44FF]/20 relative z-0 font-medium"
            style={{ tabSize: 2 }}
          />
        </div>
      </div>

      {/* Status Bar Footer */}
      <div className="h-6 bg-[#1A1A1A] text-white border-t border-[#1A1A1A] flex items-center justify-between px-4 text-[10px] select-none shrink-0 font-mono font-bold uppercase tracking-wider">
        <div className="flex items-center space-x-4">
          <span>Línea {activeLineNumber}, Col 1</span>
          <span>UTF-8</span>
          <span className="text-[#00FF00] font-black">{language}</span>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-[#00FF00]">● Motor Compilador Activo</span>
          <span className="text-white/60">Tab: 2 espacios</span>
        </div>
      </div>
    </div>
  );
};
