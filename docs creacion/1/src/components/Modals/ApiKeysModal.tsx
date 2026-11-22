import React, { useState, useEffect } from 'react';
import { 
  X, 
  Key, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  ExternalLink, 
  RefreshCw, 
  Save, 
  Sparkles, 
  Shield, 
  Cpu,
  Bot
} from 'lucide-react';
import { ApiProviderConfig, AiProviderId } from '../../types';

interface ApiKeysModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProviderId: AiProviderId;
  onSelectActiveProvider: (id: AiProviderId) => void;
  onKeysUpdated?: () => void;
}

const DEFAULT_PROVIDERS: ApiProviderConfig[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    iconName: 'Sparkles',
    apiKey: '',
    defaultModel: 'gemini-3.6-flash',
    availableModels: ['gemini-3.6-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    status: 'unconfigured'
  },
  {
    id: 'openai',
    name: 'OpenAI',
    iconName: 'Bot',
    apiKey: '',
    defaultModel: 'gpt-4o',
    availableModels: ['gpt-4o', 'gpt-4o-mini', 'o3-mini', 'gpt-3.5-turbo'],
    status: 'unconfigured'
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    iconName: 'Cpu',
    apiKey: '',
    defaultModel: 'claude-3-5-sonnet',
    availableModels: ['claude-3-5-sonnet', 'claude-3-opus', 'claude-3-haiku'],
    status: 'unconfigured'
  },
  {
    id: 'deepseek',
    name: 'DeepSeek AI',
    iconName: 'Key',
    apiKey: '',
    defaultModel: 'deepseek-r1',
    availableModels: ['deepseek-r1', 'deepseek-v3', 'deepseek-coder'],
    status: 'unconfigured'
  },
  {
    id: 'groq',
    name: 'Groq Cloud (Fast Llama)',
    iconName: 'Sparkles',
    apiKey: '',
    defaultModel: 'llama-3.3-70b',
    availableModels: ['llama-3.3-70b', 'mixtral-8x7b', 'gemma-2-9b'],
    status: 'unconfigured'
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    iconName: 'Bot',
    apiKey: '',
    defaultModel: 'mistral-large',
    availableModels: ['mistral-large', 'codestral-latest', 'mistral-small'],
    status: 'unconfigured'
  },
  {
    id: 'huggingface',
    name: 'Hugging Face',
    iconName: 'Key',
    apiKey: '',
    defaultModel: 'deepseek-ai/DeepSeek-R1',
    availableModels: ['deepseek-ai/DeepSeek-R1', 'meta-llama/Llama-3.3-70B-Instruct', 'mistralai/Mixtral-8x7B-Instruct-v0.1'],
    status: 'unconfigured'
  }
];

export const ApiKeysModal: React.FC<ApiKeysModalProps> = ({
  isOpen,
  onClose,
  activeProviderId,
  onSelectActiveProvider,
  onKeysUpdated
}) => {
  const [providers, setProviders] = useState<ApiProviderConfig[]>(DEFAULT_PROVIDERS);
  const [selectedTab, setSelectedTab] = useState<AiProviderId>(activeProviderId || 'gemini');
  const [showKeyMap, setShowKeyMap] = useState<Record<string, boolean>>({});
  const [testingId, setTestingId] = useState<string | null>(null);
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string | null>(null);

  // Load stored keys from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('morpho_api_keys');
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, { apiKey: string; model?: string; status?: string }>;
        setProviders(prev => prev.map(p => {
          const st = parsed[p.id];
          if (st && st.apiKey) {
            return {
              ...p,
              apiKey: st.apiKey,
              defaultModel: st.model || p.defaultModel,
              status: 'configured'
            };
          }
          return p;
        }));
      }
    } catch (e) {
      console.error("Failed loading local API keys:", e);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentProvider = providers.find(p => p.id === selectedTab) || providers[0];

  const handleKeyChange = (providerId: AiProviderId, val: string) => {
    setProviders(prev => prev.map(p => {
      if (p.id === providerId) {
        return {
          ...p,
          apiKey: val,
          status: val.trim() ? 'configured' : 'unconfigured'
        };
      }
      return p;
    }));
  };

  const handleModelChange = (providerId: AiProviderId, model: string) => {
    setProviders(prev => prev.map(p => {
      if (p.id === providerId) {
        return { ...p, defaultModel: model };
      }
      return p;
    }));
  };

  const toggleShowKey = (id: string) => {
    setShowKeyMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Test connection
  const handleTestKey = async (provider: ApiProviderConfig) => {
    if (!provider.apiKey.trim() && provider.id !== 'gemini') {
      alert("Por favor ingresa primero la clave de API para este proveedor.");
      return;
    }

    setTestingId(provider.id);
    const startTime = Date.now();

    try {
      // Call endpoint to test key
      const res = await fetch('/api/ai/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: provider.id,
          apiKey: provider.apiKey,
          model: provider.defaultModel
        })
      });

      const data = await res.json();
      const latency = Date.now() - startTime;

      if (res.ok && data.success) {
        setProviders(prev => prev.map(p => {
          if (p.id === provider.id) {
            return {
              ...p,
              status: 'verified',
              latencyMs: latency,
              lastTestedAt: new Date().toLocaleTimeString()
            };
          }
          return p;
        }));
      } else {
        setProviders(prev => prev.map(p => {
          if (p.id === provider.id) {
            return { ...p, status: 'error' };
          }
          return p;
        }));
      }
    } catch (e) {
      setProviders(prev => prev.map(p => {
        if (p.id === provider.id) {
          return { ...p, status: 'error' };
        }
        return p;
      }));
    } finally {
      setTestingId(null);
    }
  };

  // Save all keys
  const handleSaveAll = () => {
    const keyMap: Record<string, { apiKey: string; model: string }> = {};
    providers.forEach(p => {
      if (p.apiKey.trim()) {
        keyMap[p.id] = { apiKey: p.apiKey.trim(), model: p.defaultModel };
      }
    });

    localStorage.setItem('morpho_api_keys', JSON.stringify(keyMap));
    onSelectActiveProvider(selectedTab);
    
    setSavedSuccessMsg("¡Claves de API guardadas correctamente!");
    if (onKeysUpdated) onKeysUpdated();

    setTimeout(() => {
      setSavedSuccessMsg(null);
    }, 2500);
  };

  const getProviderDocUrl = (id: AiProviderId) => {
    switch(id) {
      case 'gemini': return 'https://aistudio.google.com/app/apikey';
      case 'openai': return 'https://platform.openai.com/api-keys';
      case 'anthropic': return 'https://console.anthropic.com/settings/keys';
      case 'deepseek': return 'https://platform.deepseek.com/api_keys';
      case 'groq': return 'https://console.groq.com/keys';
      case 'mistral': return 'https://console.mistral.ai/api-keys';
      case 'huggingface': return 'https://huggingface.co/settings/tokens';
      default: return '#';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 font-sans animate-fade-in">
      <div className="bg-white border-2 border-[#1A1A1A] w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-[#1A1A1A] text-white p-4 flex items-center justify-between border-b border-[#1A1A1A]">
          <div className="flex items-center space-x-2.5">
            <Key className="w-5 h-5 text-[#00FF00]" />
            <div>
              <h2 className="font-serif italic text-xl font-bold leading-none">Gestor de Claves API</h2>
              <span className="text-[10px] uppercase font-mono tracking-widest text-slate-300">
                Configuración de Proveedores AI
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Saved Toast Notification */}
        {savedSuccessMsg && (
          <div className="bg-[#00FF00] text-[#1A1A1A] p-2 px-4 text-xs font-bold uppercase tracking-wider flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-[#1A1A1A]" />
              <span>{savedSuccessMsg}</span>
            </div>
          </div>
        )}

        {/* Modal Body (Tab Layout) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Provider Selector Sidebar */}
          <div className="w-56 bg-[#F4F4F1] border-r border-[#1A1A1A] flex flex-col overflow-y-auto">
            <div className="p-3 border-b border-[#1A1A1A] text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A]/60">
              Proveedores Disponibles
            </div>
            {providers.map((p) => {
              const isSelected = p.id === selectedTab;
              const isActive = p.id === activeProviderId;
              const hasKey = Boolean(p.apiKey.trim());

              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedTab(p.id)}
                  className={`p-3 text-left border-b border-[#1A1A1A]/20 flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected ? 'bg-white font-bold border-l-4 border-l-[#3B44FF]' : 'hover:bg-white/60'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <span className="text-xs">{p.name}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {isActive && (
                      <span className="text-[9px] bg-[#3B44FF] text-white px-1.5 py-0.5 font-mono font-bold uppercase">
                        Activo
                      </span>
                    )}
                    <span className={`w-2 h-2 rounded-full ${
                      p.status === 'verified' ? 'bg-[#00AA00]' : hasKey ? 'bg-[#3B44FF]' : 'bg-slate-300'
                    }`} />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Provider Detail Pane */}
          <div className="flex-1 p-6 overflow-y-auto bg-white flex flex-col justify-between space-y-6">
            <div className="space-y-5">
              {/* Provider Info Header */}
              <div className="flex items-start justify-between border-b border-[#1A1A1A]/20 pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-serif italic text-2xl font-bold text-[#1A1A1A]">
                      {currentProvider.name}
                    </h3>
                    <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 ${
                      currentProvider.status === 'verified' 
                        ? 'bg-[#00FF00]/20 text-[#00AA00] border border-[#00AA00]'
                        : currentProvider.apiKey 
                        ? 'bg-[#3B44FF]/10 text-[#3B44FF] border border-[#3B44FF]'
                        : 'bg-slate-100 text-slate-500 border border-slate-300'
                    }`}>
                      {currentProvider.status === 'verified' 
                        ? 'Verificada ✓' 
                        : currentProvider.apiKey 
                        ? 'Clave Ingresada' 
                        : 'Sin Configurar'}
                    </span>
                  </div>
                  <p className="text-xs text-[#1A1A1A]/70 mt-1">
                    Obtén respuestas directas, generación de código y análisis de algoritmos usando {currentProvider.name}.
                  </p>
                </div>

                <a
                  href={getProviderDocUrl(currentProvider.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 bg-[#F4F4F1] hover:bg-[#1A1A1A] hover:text-white border border-[#1A1A1A] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider transition-colors"
                >
                  <span>Obtener Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* API Key Input Field */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
                  API Key / Token Secreto:
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showKeyMap[currentProvider.id] ? 'text' : 'password'}
                    placeholder={`sk-... o clave para ${currentProvider.name}`}
                    value={currentProvider.apiKey}
                    onChange={(e) => handleKeyChange(currentProvider.id, e.target.value)}
                    className="w-full bg-[#F4F4F1] border-2 border-[#1A1A1A] p-2.5 pr-20 text-xs font-mono font-bold text-[#1A1A1A] focus:outline-none focus:border-[#3B44FF]"
                  />
                  <div className="absolute right-2 flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => toggleShowKey(currentProvider.id)}
                      className="p-1 text-[#1A1A1A] hover:text-[#3B44FF] cursor-pointer"
                      title={showKeyMap[currentProvider.id] ? "Ocultar" : "Mostrar"}
                    >
                      {showKeyMap[currentProvider.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  🔒 Tus claves de API se almacenan de forma segura en tu navegador y solo se utilizan para realizar solicitudes a la IA.
                </p>
              </div>

              {/* Model Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">
                  Modelo Predeterminado:
                </label>
                <select
                  value={currentProvider.defaultModel}
                  onChange={(e) => handleModelChange(currentProvider.id, e.target.value)}
                  className="w-full bg-white border-2 border-[#1A1A1A] p-2 text-xs font-bold font-mono text-[#1A1A1A] focus:outline-none"
                >
                  {currentProvider.availableModels.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Action Buttons: Test Connection & Set Active */}
              <div className="pt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleTestKey(currentProvider)}
                  disabled={testingId === currentProvider.id}
                  className="bg-[#F4F4F1] hover:bg-[#1A1A1A] hover:text-white border border-[#1A1A1A] px-3.5 py-2 text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  {testingId === currentProvider.id ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Probando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#00AA00]" />
                      <span>Probar Conexión</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onSelectActiveProvider(currentProvider.id)}
                  className={`px-3.5 py-2 text-xs font-bold uppercase tracking-wider border transition-colors cursor-pointer ${
                    activeProviderId === currentProvider.id
                      ? 'bg-[#3B44FF] text-white border-[#3B44FF]'
                      : 'bg-white text-[#1A1A1A] border-[#1A1A1A] hover:bg-[#3B44FF] hover:text-white'
                  }`}
                >
                  {activeProviderId === currentProvider.id ? '✓ Proveedor Activo' : 'Establecer como Proveedor Principal'}
                </button>
              </div>

              {/* Status Details */}
              {currentProvider.lastTestedAt && (
                <div className="bg-[#F4F4F1] border border-[#1A1A1A] p-2.5 text-xs space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono font-bold text-[#1A1A1A]">
                    <span>Última prueba: {currentProvider.lastTestedAt}</span>
                    <span className="text-[#00AA00]">Latencia: {currentProvider.latencyMs} ms</span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="border-t border-[#1A1A1A] pt-4 flex items-center justify-between">
              <div className="flex items-center space-x-1 text-[11px] text-[#1A1A1A] font-bold">
                <Shield className="w-3.5 h-3.5 text-[#00AA00]" />
                <span>Proveedor Principal: <span className="uppercase text-[#3B44FF] font-mono">{activeProviderId}</span></span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-[#1A1A1A] text-xs font-bold uppercase tracking-wider hover:bg-[#F4F4F1] cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  onClick={handleSaveAll}
                  className="bg-[#1A1A1A] hover:bg-[#3B44FF] text-white px-5 py-2 text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4 text-[#00FF00]" />
                  <span>Guardar Todo</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
