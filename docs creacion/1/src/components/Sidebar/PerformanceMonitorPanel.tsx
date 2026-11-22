import React from 'react';
import { 
  Activity, 
  Cpu, 
  HardDrive, 
  Wifi, 
  AlertTriangle, 
  Gauge, 
  Zap,
  TrendingDown
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { PerformanceMetric } from '../../types';

interface PerformanceMonitorPanelProps {
  metrics: PerformanceMetric[];
  currentMetric: PerformanceMetric;
  onOptimizeMemory: () => void;
}

export const PerformanceMonitorPanel: React.FC<PerformanceMonitorPanelProps> = ({
  metrics,
  currentMetric,
  onOptimizeMemory
}) => {
  return (
    <div className="w-80 bg-white border-r border-[#1A1A1A] flex flex-col h-full text-[#1A1A1A] select-none font-sans">
      {/* Header */}
      <div className="p-4 border-b border-[#1A1A1A] flex items-center justify-between bg-[#F4F4F1]">
        <div>
          <h2 className="font-serif italic text-xl text-[#1A1A1A] leading-tight">Rendimiento</h2>
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/50">Métricas en Tiempo Real</span>
        </div>
        <span className="text-[10px] bg-[#00FF00] text-[#1A1A1A] border border-[#1A1A1A] px-2 py-0.5 font-bold uppercase tracking-wider font-mono">
          En Vivo
        </span>
      </div>

      {/* Gauges & Cards Grid */}
      <div className="p-3 border-b border-[#1A1A1A] bg-[#F4F4F1] grid grid-cols-2 gap-2 text-xs">
        {/* CPU Usage */}
        <div className="bg-white p-2.5 border border-[#1A1A1A] space-y-1">
          <div className="flex items-center justify-between text-[#1A1A1A]">
            <span className="text-[10px] uppercase font-bold tracking-wider">CPU</span>
            <Cpu className="w-3.5 h-3.5 text-[#3B44FF]" />
          </div>
          <div className="text-xl font-mono font-bold text-[#1A1A1A]">
            {currentMetric.cpu.toFixed(1)}%
          </div>
          <div className="w-full bg-[#F4F4F1] h-1.5 border border-[#1A1A1A] overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                currentMetric.cpu > 80 ? 'bg-[#FF6321]' : 'bg-[#3B44FF]'
              }`}
              style={{ width: `${currentMetric.cpu}%` }}
            />
          </div>
        </div>

        {/* Memory Consumption */}
        <div className="bg-white p-2.5 border border-[#1A1A1A] space-y-1">
          <div className="flex items-center justify-between text-[#1A1A1A]">
            <span className="text-[10px] uppercase font-bold tracking-wider">Memoria</span>
            <HardDrive className="w-3.5 h-3.5 text-[#FF6321]" />
          </div>
          <div className="text-xl font-mono font-bold text-[#1A1A1A]">
            {currentMetric.memory.toFixed(0)} MB
          </div>
          <div className="w-full bg-[#F4F4F1] h-1.5 border border-[#1A1A1A] overflow-hidden">
            <div
              className="h-full bg-[#FF6321] transition-all duration-300"
              style={{ width: `${(currentMetric.memory / 512) * 100}%` }}
            />
          </div>
        </div>

        {/* Network Latency */}
        <div className="bg-white p-2.5 border border-[#1A1A1A] space-y-1">
          <div className="flex items-center justify-between text-[#1A1A1A]">
            <span className="text-[10px] uppercase font-bold tracking-wider">Latencia</span>
            <Wifi className="w-3.5 h-3.5 text-[#00AA00]" />
          </div>
          <div className="text-xl font-mono font-bold text-[#1A1A1A]">
            {currentMetric.networkMs.toFixed(1)} ms
          </div>
          <span className="text-[9px] text-[#00AA00] font-bold">Excelente</span>
        </div>

        {/* Predictive Risk Score */}
        <div className="bg-white p-2.5 border border-[#1A1A1A] space-y-1">
          <div className="flex items-center justify-between text-[#1A1A1A]">
            <span className="text-[10px] uppercase font-bold tracking-wider">Riesgo</span>
            <AlertTriangle className="w-3.5 h-3.5 text-[#FF6321]" />
          </div>
          <div className={`text-xl font-mono font-black ${
            currentMetric.riskIndex > 50 ? 'text-[#FF6321]' : 'text-[#00AA00]'
          }`}>
            {currentMetric.riskIndex.toFixed(0)} / 100
          </div>
          <span className="text-[9px] text-[#1A1A1A]/60 font-bold">Predictivo</span>
        </div>
      </div>

      {/* Historical Area Chart */}
      <div className="flex-1 p-3 flex flex-col justify-between bg-white">
        <span className="text-[10px] uppercase font-bold text-[#1A1A1A]/60 tracking-wider block mb-2">
          Historial Latencia y CPU (30s)
        </span>

        <div className="h-44 w-full bg-[#F4F4F1] p-1 border border-[#1A1A1A]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={metrics}>
              <defs>
                <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B44FF" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3B44FF" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="timestamp" hide />
              <YAxis domain={[0, 100]} hide />
              <Tooltip
                contentStyle={{ backgroundColor: '#1A1A1A', color: '#FFFFFF', fontSize: '11px', border: 'none' }}
                itemStyle={{ color: '#00FF00' }}
              />
              <Area type="monotone" dataKey="cpu" stroke="#3B44FF" strokeWidth={2} fillOpacity={1} fill="url(#cpuGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Optimize Action */}
        <div className="mt-3">
          <button
            onClick={onOptimizeMemory}
            className="w-full bg-[#1A1A1A] hover:bg-[#3B44FF] text-white font-bold py-2.5 px-3 text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-colors cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-[#00FF00] fill-current" />
            <span>Optimizar Búfer y Memoria</span>
          </button>
        </div>
      </div>
    </div>
  );
};
