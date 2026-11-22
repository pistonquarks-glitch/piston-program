import React, { useState } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Wrench, 
  Loader2, 
  Lightbulb, 
  ShieldAlert,
  Code2
} from 'lucide-react';
import { DiagnosticResult, SupportedLanguage } from '../../types';

interface AiDiagnosticPanelProps {
  activeFileName: string;
  activeLanguage: SupportedLanguage;
  codeContent: string;
  onRunDiagnosis: () => Promise<DiagnosticResult | null>;
  onApplyFix: (fixedCode: string) => void;
  diagnosticResult: DiagnosticResult | null;
  isLoading: boolean;
}

export const AiDiagnosticPanel: React.FC<AiDiagnosticPanelProps> = ({
  activeFileName,
  activeLanguage,
  codeContent,
  onRunDiagnosis,
  onApplyFix,
  diagnosticResult,
  isLoading
}) => {
  const [applied, setApplied] = useState(false);

  const handleApplyClick = () => {
    if (diagnosticResult?.suggestedFix) {
      onApplyFix(diagnosticResult.suggestedFix);
      setApplied(true);
      setTimeout(() => setApplied(false), 3000);
    }
  };

  return (
    <div className="w-80 bg-white border-r border-[#1A1A1A] flex flex-col h-full text-[#1A1A1A] select-none font-sans">
      {/* Header */}
      <div className="p-4 border-b border-[#1A1A1A] flex items-center justify-between bg-[#F4F4F1]">
        <div>
          <h2 className="font-serif italic text-xl text-[#1A1A1A] leading-tight">Diagnóstico AI</h2>
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/50">Análisis Predictivo</span>
        </div>
        <span className="text-[10px] bg-[#3B44FF] text-white px-2 py-0.5 font-bold uppercase tracking-wider font-mono">
          Gemini 3.6
        </span>
      </div>

      {/* Target Active File Banner */}
      <div className="p-3 border-b border-[#1A1A1A] bg-white flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2 truncate">
          <Code2 className="w-4 h-4 text-[#3B44FF] shrink-0" />
          <span className="font-mono font-bold text-[#1A1A1A] truncate">{activeFileName}</span>
        </div>
        <span className="text-[10px] uppercase font-mono font-bold text-[#3B44FF] bg-[#3B44FF]/10 px-2 py-0.5 border border-[#3B44FF]/30">
          {activeLanguage}
        </span>
      </div>

      {/* Trigger Button */}
      <div className="p-3 border-b border-[#1A1A1A]">
        <button
          onClick={onRunDiagnosis}
          disabled={isLoading}
          className="w-full bg-[#1A1A1A] hover:bg-[#3B44FF] disabled:opacity-50 text-white font-bold py-2.5 px-3 text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-colors cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[#00FF00]" />
              <span>Analizando Código...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-[#00FF00]" />
              <span>Diagnosticar Errores</span>
            </>
          )}
        </button>
      </div>

      {/* Diagnostic Result View */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#F4F4F1]">
        {diagnosticResult ? (
          <>
            {/* Risk Probability Score */}
            <div className="p-3 bg-white border border-[#1A1A1A] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#1A1A1A]">Riesgo Predictivo:</span>
                <span
                  className={`font-mono font-black px-2 py-0.5 text-xs ${
                    diagnosticResult.predictiveRiskScore > 40
                      ? 'bg-[#FF6321] text-white'
                      : 'bg-[#00FF00] text-[#1A1A1A]'
                  }`}
                >
                  {diagnosticResult.predictiveRiskScore}%
                </span>
              </div>
              <div className="w-full bg-[#F4F4F1] h-2 border border-[#1A1A1A] overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    diagnosticResult.predictiveRiskScore > 40 ? 'bg-[#FF6321]' : 'bg-[#00FF00]'
                  }`}
                  style={{ width: `${Math.max(5, diagnosticResult.predictiveRiskScore)}%` }}
                />
              </div>
            </div>

            {/* Analysis & Root Cause */}
            <div className="p-3 bg-white border border-[#1A1A1A] space-y-2 text-xs">
              <div className="flex items-center space-x-1.5 text-[#3B44FF] font-bold">
                <Lightbulb className="w-3.5 h-3.5" />
                <span>Causa Raíz</span>
              </div>
              <p className="text-[#1A1A1A] leading-relaxed text-[11px]">
                {diagnosticResult.analysis}
              </p>
              <p className="text-[#1A1A1A] text-[10px] bg-[#F4F4F1] p-2 border border-[#1A1A1A] font-mono font-bold">
                {diagnosticResult.rootCause}
              </p>
            </div>

            {/* Warnings List */}
            {diagnosticResult.warnings?.length > 0 && (
              <div className="p-3 bg-white border border-[#FF6321] text-xs space-y-1">
                <div className="flex items-center space-x-1 text-[#FF6321] font-bold text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Advertencias</span>
                </div>
                <ul className="list-disc list-inside text-[11px] text-[#1A1A1A] space-y-0.5">
                  {diagnosticResult.warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Optimizations List */}
            {diagnosticResult.optimizations?.length > 0 && (
              <div className="p-3 bg-white border border-[#3B44FF] text-xs space-y-1">
                <div className="flex items-center space-x-1 text-[#3B44FF] font-bold text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Optimizaciones</span>
                </div>
                <ul className="list-disc list-inside text-[11px] text-[#1A1A1A] space-y-0.5">
                  {diagnosticResult.optimizations.map((o, idx) => (
                    <li key={idx}>{o}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 1-Click Apply Patch Button */}
            {diagnosticResult.suggestedFix && (
              <div className="p-3 bg-white border border-[#1A1A1A] space-y-2">
                <span className="text-xs font-bold text-[#1A1A1A] block">
                  🛠️ Parche Recomendado Listo
                </span>
                <button
                  onClick={handleApplyClick}
                  className="w-full bg-[#1A1A1A] hover:bg-[#3B44FF] text-white font-bold py-2 px-3 text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-colors cursor-pointer"
                >
                  {applied ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-[#00FF00]" />
                      <span>¡Parche Aplicado!</span>
                    </>
                  ) : (
                    <>
                      <Wrench className="w-4 h-4 text-[#00FF00]" />
                      <span>Aplicar Parche Automático</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center p-6 border-2 border-dashed border-[#1A1A1A] bg-white space-y-2">
            <Sparkles className="w-8 h-8 text-[#3B44FF] mx-auto" />
            <p className="text-xs text-[#1A1A1A]/70 font-medium">
              Haz clic en "Diagnosticar Errores" para realizar un análisis de código con inteligencia predictiva Gemini.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
