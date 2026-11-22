import React, { useState, useEffect } from 'react';
import { 
  Play, 
  RotateCcw, 
  Terminal, 
  Globe, 
  Trash2, 
  Maximize2, 
  Minimize2, 
  CheckCircle2, 
  AlertCircle,
  Cpu
} from 'lucide-react';
import { SupportedLanguage } from '../../types';

interface LiveRunnerProps {
  code: string;
  language: SupportedLanguage;
  executionLogs: string[];
  onClearExecutionLogs: () => void;
  onRunExecution: () => void;
}

export const LiveRunner: React.FC<LiveRunnerProps> = ({
  code,
  language,
  executionLogs,
  onClearExecutionLogs,
  onRunExecution
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'console'>('preview');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeSrcDoc, setIframeSrcDoc] = useState('');

  // Generate srcDoc for HTML/CSS/JS preview
  useEffect(() => {
    if (language === 'typescript' || language === 'javascript' || language === 'html' || language === 'css') {
      const htmlDoc = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
            <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
            <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
            <style>
              body { margin: 0; font-family: system-ui, sans-serif; background: #ffffff; color: #111827; }
            </style>
          </head>
          <body>
            <div id="root"></div>
            <script type="text/babel">
              try {
                ${code.includes('export default') ? code.replace('export default', '') : code}
                if (typeof App !== 'undefined') {
                  const root = ReactDOM.createRoot(document.getElementById('root'));
                  root.render(<App />);
                }
              } catch (err) {
                document.getElementById('root').innerHTML = '<div style="color:red; padding:16px;"><b>Runtime Error:</b> ' + err.message + '</div>';
              }
            </script>
          </body>
        </html>
      `;
      setIframeSrcDoc(htmlDoc);
    }
  }, [code, language]);

  return (
    <div className={`flex flex-col bg-white border-l border-[#1A1A1A] font-mono text-xs overflow-hidden select-none ${
      isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'w-96 h-full'
    }`}>
      {/* Runner Header */}
      <div className="h-10 bg-[#F4F4F1] border-b border-[#1A1A1A] flex items-center justify-between px-3 text-[#1A1A1A] shrink-0 font-sans">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
              activeTab === 'preview'
                ? 'bg-[#1A1A1A] text-white'
                : 'text-[#1A1A1A]/70 hover:text-[#1A1A1A]'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Vista Previa</span>
          </button>

          <button
            onClick={() => setActiveTab('console')}
            className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
              activeTab === 'console'
                ? 'bg-[#1A1A1A] text-white'
                : 'text-[#1A1A1A]/70 hover:text-[#1A1A1A]'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Consola</span>
            {executionLogs.length > 0 && (
              <span className="bg-[#00FF00] text-[#1A1A1A] text-[9px] px-1 font-black">
                {executionLogs.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={onRunExecution}
            className="p-1.5 bg-[#1A1A1A] text-white hover:bg-[#3B44FF] transition-colors cursor-pointer"
            title="Re-ejecutar código"
          >
            <Play className="w-3.5 h-3.5 fill-current text-[#00FF00]" />
          </button>
          <button
            onClick={onClearExecutionLogs}
            className="p-1.5 border border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-colors cursor-pointer"
            title="Limpiar logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 border border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-colors cursor-pointer"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Runner Body */}
      <div className="flex-1 bg-white overflow-hidden relative">
        {activeTab === 'preview' ? (
          <div className="w-full h-full bg-white flex flex-col">
            <iframe
              title="Live App Preview"
              srcDoc={iframeSrcDoc}
              className="w-full h-full border-none"
              sandbox="allow-scripts allow-modals"
            />
          </div>
        ) : (
          /* Console Execution Output Stream */
          <div className="w-full h-full p-3 font-mono text-xs overflow-y-auto space-y-1.5 select-text bg-[#F4F4F1] text-[#1A1A1A]">
            <div className="text-[10px] uppercase font-bold text-[#1A1A1A]/60 mb-2 pb-1 border-b border-[#1A1A1A] flex items-center justify-between">
              <span>Compilación e Intérprete [{language.toUpperCase()}]</span>
              <Cpu className="w-3.5 h-3.5 text-[#3B44FF]" />
            </div>

            {executionLogs.length === 0 ? (
              <div className="text-[#1A1A1A]/50 italic">
                Presiona "Ejecutar" para compilar y ver la salida del código en pantalla.
              </div>
            ) : (
              executionLogs.map((log, idx) => (
                <div
                  key={idx}
                  className={`whitespace-pre-wrap font-mono ${
                    log.includes('Error') || log.includes('ERR')
                      ? 'text-white bg-[#FF6321] p-1.5 font-bold'
                      : log.includes('✅') || log.includes('OK')
                      ? 'text-[#00AA00] font-bold'
                      : 'text-[#1A1A1A]'
                  }`}
                >
                  {log}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Footer Status */}
      <div className="h-6 bg-[#1A1A1A] text-white border-t border-[#1A1A1A] flex items-center justify-between px-3 text-[10px] font-mono font-bold uppercase tracking-wider">
        <span>Estado: Listo</span>
        <span className="text-[#00FF00]">FPS: 60 | Latencia: 1.2ms</span>
      </div>
    </div>
  );
};
