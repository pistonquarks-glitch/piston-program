import React from 'react';
import { Keyboard, X } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Ctrl + K / Cmd + K', description: 'Abrir Paleta de Comandos Rápida' },
    { key: 'Ctrl + Enter', description: 'Ejecutar y Compilar Proyecto' },
    { key: 'Tab', description: 'Indentación de 2 espacios' },
    { key: 'Ctrl + S', description: 'Forzar Respaldo Inmediato en Nube' },
    { key: 'Ctrl + Shift + D', description: 'Lanzar Diagnóstico AI Gemini' },
    { key: 'Esc', description: 'Cerrar ventanas y diálogos' }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[#1A1A1A]/80 backdrop-blur-sm flex items-center justify-center p-4 select-none font-sans">
      <div className="bg-white border-2 border-[#1A1A1A] w-full max-w-md shadow-2xl p-5 text-[#1A1A1A] space-y-4">
        <div className="flex items-center justify-between border-b border-[#1A1A1A] pb-3">
          <div className="flex items-center space-x-2">
            <Keyboard className="w-5 h-5 text-[#3B44FF]" />
            <span className="font-serif italic text-xl">Atajos de Teclado</span>
          </div>
          <button onClick={onClose} className="p-1 text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white border border-[#1A1A1A] cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          {shortcuts.map((s, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs p-2.5 bg-[#F4F4F1] border border-[#1A1A1A]">
              <span className="text-[#1A1A1A] font-bold">{s.description}</span>
              <kbd className="bg-[#1A1A1A] text-white font-mono text-[10px] uppercase font-bold px-2 py-1">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
