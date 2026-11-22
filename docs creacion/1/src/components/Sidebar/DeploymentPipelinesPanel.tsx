import React, { useState } from 'react';
import { 
  Workflow, 
  Play, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Globe, 
  Container, 
  Cpu, 
  HardDrive,
  ExternalLink,
  RotateCcw
} from 'lucide-react';
import { DeploymentConfig, WorkflowStep } from '../../types';

interface DeploymentPipelinesPanelProps {
  deploymentConfig: DeploymentConfig;
  workflowSteps: WorkflowStep[];
  onTriggerPipeline: () => void;
  onOpenLiveUrl: () => void;
}

export const DeploymentPipelinesPanel: React.FC<DeploymentPipelinesPanelProps> = ({
  deploymentConfig,
  workflowSteps,
  onTriggerPipeline,
  onOpenLiveUrl
}) => {
  const [selectedTarget, setSelectedTarget] = useState<'cloud-run' | 'kubernetes' | 'vercel' | 'docker'>('cloud-run');

  const isRunning = workflowSteps.some((s) => s.status === 'running');

  return (
    <div className="w-80 bg-white border-r border-[#1A1A1A] flex flex-col h-full text-[#1A1A1A] select-none font-sans">
      {/* Header */}
      <div className="p-4 border-b border-[#1A1A1A] flex items-center justify-between bg-[#F4F4F1]">
        <div>
          <h2 className="font-serif italic text-xl text-[#1A1A1A] leading-tight">Despliegue CI/CD</h2>
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/50">Contenedores</span>
        </div>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 border text-white font-mono uppercase ${
            deploymentConfig.status === 'live'
              ? 'bg-[#00AA00] border-[#00AA00]'
              : deploymentConfig.status === 'building'
              ? 'bg-[#3B44FF] border-[#3B44FF]'
              : 'bg-[#1A1A1A] border-[#1A1A1A]'
          }`}
        >
          {deploymentConfig.status === 'live' ? 'Desplegado' : deploymentConfig.status === 'building' ? 'Compilando' : 'En espera'}
        </span>
      </div>

      {/* Target & Container Spec */}
      <div className="p-3 border-b border-[#1A1A1A] bg-[#F4F4F1] space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#1A1A1A] font-bold">Plataforma Objetivo:</span>
          <select
            value={selectedTarget}
            onChange={(e) => setSelectedTarget(e.target.value as any)}
            className="bg-white border border-[#1A1A1A] text-[#1A1A1A] font-bold px-2 py-0.5 text-xs focus:outline-none"
          >
            <option value="cloud-run">☁️ Cloud Run</option>
            <option value="docker">🐳 Docker Swarm</option>
            <option value="kubernetes">☸️ Kubernetes</option>
            <option value="vercel">▲ Vercel Edge</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
          <div className="bg-white p-2 border border-[#1A1A1A] flex items-center space-x-1.5">
            <Cpu className="w-3.5 h-3.5 text-[#3B44FF]" />
            <div>
              <span className="text-[#1A1A1A]/60 block text-[9px] uppercase font-bold">Límite CPU</span>
              <span className="font-mono font-bold text-[#1A1A1A]">{deploymentConfig.cpuLimit}</span>
            </div>
          </div>
          <div className="bg-white p-2 border border-[#1A1A1A] flex items-center space-x-1.5">
            <HardDrive className="w-3.5 h-3.5 text-[#FF6321]" />
            <div>
              <span className="text-[#1A1A1A]/60 block text-[9px] uppercase font-bold">Límite RAM</span>
              <span className="font-mono font-bold text-[#1A1A1A]">{deploymentConfig.memLimit}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Trigger Pipeline Action */}
      <div className="p-3 border-b border-[#1A1A1A] bg-white">
        <button
          onClick={onTriggerPipeline}
          disabled={isRunning}
          className="w-full bg-[#1A1A1A] hover:bg-[#3B44FF] disabled:opacity-50 text-white font-bold py-2.5 px-3 text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-colors cursor-pointer"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[#00FF00]" />
              <span>Ejecutando Pipeline...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current text-[#00FF00]" />
              <span>Ejecutar Flujo CI/CD</span>
            </>
          )}
        </button>
      </div>

      {/* Workflow Steps List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-white">
        <span className="text-[10px] uppercase font-bold text-[#1A1A1A]/50 tracking-wider block">
          Pasos del Pipeline
        </span>

        {workflowSteps.map((step, idx) => (
          <div
            key={step.id}
            className="p-3 bg-[#F4F4F1] border border-[#1A1A1A] space-y-2 text-xs"
          >
            <div className="flex items-center justify-between font-bold">
              <div className="flex items-center space-x-2">
                <span className="w-5 h-5 bg-[#1A1A1A] text-white text-[10px] font-mono font-bold flex items-center justify-center">
                  {idx + 1}
                </span>
                <span className="text-[#1A1A1A]">{step.name}</span>
              </div>

              {step.status === 'success' && <CheckCircle2 className="w-4 h-4 text-[#00AA00]" />}
              {step.status === 'failed' && <XCircle className="w-4 h-4 text-[#FF6321]" />}
              {step.status === 'running' && <Loader2 className="w-4 h-4 text-[#3B44FF] animate-spin" />}
              {step.status === 'pending' && <span className="text-[#1A1A1A]/50 text-[10px] font-mono">Pendiente</span>}
            </div>

            {/* Step Logs Stream */}
            {step.logs.length > 0 && (
              <div className="bg-[#1A1A1A] p-2 text-[10px] font-mono text-[#00FF00] space-y-0.5 max-h-24 overflow-y-auto">
                {step.logs.map((log, lIdx) => (
                  <div key={lIdx} className="whitespace-pre-wrap">{log}</div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Live Application URL Launcher */}
      <div className="p-3 border-t border-[#1A1A1A] bg-[#F4F4F1] space-y-2">
        <button
          onClick={onOpenLiveUrl}
          className="w-full bg-[#3B44FF] hover:bg-[#1A1A1A] text-white font-bold py-2.5 px-3 text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-colors cursor-pointer"
        >
          <Globe className="w-4 h-4" />
          <span>Abrir App Desplegada</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
