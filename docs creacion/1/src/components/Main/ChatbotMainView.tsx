import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  Bot, 
  User, 
  Copy, 
  Check, 
  Code, 
  Play, 
  ArrowDownToLine, 
  Key, 
  Trash2, 
  Paperclip, 
  FileText, 
  Terminal, 
  Layers, 
  RefreshCw, 
  Upload, 
  ShieldCheck, 
  FileCode, 
  X,
  Plus,
  Search,
  MessageSquare,
  ChevronDown,
  Download,
  Maximize2,
  Minimize2,
  Mic,
  Volume2,
  ExternalLink,
  Table,
  Eye,
  Settings,
  UserCheck,
  FolderKanban,
  FolderPlus,
  Boxes
} from 'lucide-react';
import { AiChatMessage, AiProviderId, FileNode } from '../../types';

interface LocalAttachedFile {
  id: string;
  name: string;
  content: string;
  sizeKb: number;
}

export interface ProjectItem {
  id: string;
  name: string;
  description: string;
  color: string;
}

interface ChatThread {
  id: string;
  title: string;
  date: string;
  projectId: string;
  projectName: string;
  messages: AiChatMessage[];
}

interface ChatbotMainViewProps {
  theme?: 'dark' | 'light';
  activeFile: FileNode | null;
  workspaceFiles?: FileNode[];
  activeProviderId: AiProviderId;
  onOpenApiKeysModal: () => void;
  onInjectCodeToEditor: (code: string, fileName?: string) => void;
  onRunCodeInRunner: () => void;
  onSwitchToEditor: () => void;
  onCreateWorkspaceFile?: (name: string, content: string) => void;
}

export const DEFAULT_PROJECTS: ProjectItem[] = [
  { id: 'proj-all', name: 'Todos los Proyectos', description: 'Visión general de todas las conversaciones', color: '#3B44FF' },
  { id: 'proj-huanuco', name: 'Proyecto Huánuco', description: 'Estrategia de negocios y marketing viral', color: '#10B981' },
  { id: 'proj-ecommerce', name: 'Proyecto E-Commerce', description: 'Plataforma de ventas y pasarela de pagos', color: '#F59E0B' },
  { id: 'proj-analytics', name: 'Proyecto Analytics', description: 'Modelos predictivos y análisis Python', color: '#8B5CF6' }
];

const INITIAL_THREADS: ChatThread[] = [
  {
    id: 'thread-1',
    title: 'Negocios en Hco y Estrategia Viral',
    date: 'Hoy',
    projectId: 'proj-huanuco',
    projectName: 'Proyecto Huánuco',
    messages: [
      {
        id: 'msg-1',
        sender: 'ai',
        text: `Hola, soy tu asistente de OpenCode Studio.

Tengo acceso completo a los archivos de tu proyecto, a tu editor y a los archivos locales que subas desde tu computadora.

He generado un analisis de estrategia y palabras clave (.XLSX) para tu proyecto Huánuco. Puedes ver la renderizacion interactiva en la pantalla derecha.`,
        timestamp: '09:12',
        provider: 'gemini',
        model: 'gemini-3.6-flash',
        codeBlocks: [
          {
            language: 'typescript',
            filename: 'EstrategiaHuánuco.ts',
            code: `// Estrategia de Crecimiento
export const estrategiaViral = {
  region: "Huánuco",
  metricasClave: ["comida_tipica", "restaurantes", "tradicion"],
  presupuestoMensual: "S/. 5,000",
  roiEstimado: "150-200%"
};`
          }
        ]
      }
    ]
  },
  {
    id: 'thread-2',
    title: 'Clave de Google Pay y nivel prepago',
    date: 'Ayer',
    projectId: 'proj-ecommerce',
    projectName: 'Proyecto E-Commerce',
    messages: []
  },
  {
    id: 'thread-3',
    title: 'Configurar Google Cloud para Claude',
    date: 'Hace 2 días',
    projectId: 'proj-huanuco',
    projectName: 'Proyecto Huánuco',
    messages: []
  },
  {
    id: 'thread-4',
    title: 'Análisis de Claude Code local y PC',
    date: 'Hace 3 días',
    projectId: 'proj-analytics',
    projectName: 'Proyecto Analytics',
    messages: []
  },
  {
    id: 'thread-5',
    title: 'Métricas de python_analytics.py',
    date: 'Hace 5 días',
    projectId: 'proj-analytics',
    projectName: 'Proyecto Analytics',
    messages: []
  }
];

export const ChatbotMainView: React.FC<ChatbotMainViewProps> = ({
  theme = 'dark',
  activeFile,
  workspaceFiles = [],
  activeProviderId,
  onOpenApiKeysModal,
  onInjectCodeToEditor,
  onRunCodeInRunner,
  onSwitchToEditor,
  onCreateWorkspaceFile
}) => {
  // Threads & Projects State
  const [projects, setProjects] = useState<ProjectItem[]>(DEFAULT_PROJECTS);
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('proj-all');
  const [threads, setThreads] = useState<ChatThread[]>(INITIAL_THREADS);
  const [activeThreadId, setActiveThreadId] = useState<string>('thread-1');
  const [searchQuery, setSearchQuery] = useState('');

  // Project Modals & Selectors
  const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  // Active Thread Messages
  const currentThread = threads.find(t => t.id === activeThreadId) || threads[0];
  const currentProject = projects.find(p => p.id === currentThread?.projectId) || projects[1];
  const [messages, setMessages] = useState<AiChatMessage[]>(currentThread?.messages || []);

  // UI state
  const [inputText, setInputText] = useState('');
  const [selectedModel, setSelectedModel] = useState<'gemini-3.6-flash' | 'gpt-4o' | 'claude-3.5-sonnet' | 'deepseek-r1'>('gemini-3.6-flash');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);
  const [showRenderScreen, setShowRenderScreen] = useState(true);
  const [renderMode, setRenderMode] = useState<'spreadsheet' | 'web' | 'code'>('spreadsheet');
  const [activeSheetTab, setActiveSheetTab] = useState(1);

  // File Attachments
  const [attachedLocalFiles, setAttachedLocalFiles] = useState<LocalAttachedFile[]>([]);
  const [includeActiveFile, setIncludeActiveFile] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedBlockId, setCopiedBlockId] = useState<string | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync messages when active thread changes
  useEffect(() => {
    if (currentThread) {
      setMessages(currentThread.messages);
    }
  }, [activeThreadId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    const newProj: ProjectItem = {
      id: `proj-${Date.now()}`,
      name: newProjectName.trim(),
      description: newProjectDesc.trim() || 'Proyecto de desarrollo',
      color: '#3B44FF'
    };
    setProjects(prev => [...prev, newProj]);
    setSelectedProjectFilter(newProj.id);
    setNewProjectName('');
    setNewProjectDesc('');
    setIsNewProjectModalOpen(false);
  };

  const handleAssignThreadProject = (threadId: string, projectId: string) => {
    const proj = projects.find(p => p.id === projectId);
    if (!proj) return;
    setThreads(prev => prev.map(t => t.id === threadId ? {
      ...t,
      projectId: proj.id,
      projectName: proj.name
    } : t));
    setIsProjectSelectorOpen(false);
  };

  const handleCreateNewChat = () => {
    const newId = `thread-${Date.now()}`;
    const targetProj = projects.find(p => p.id === selectedProjectFilter && p.id !== 'proj-all') || projects[1] || DEFAULT_PROJECTS[1];
    
    const newThread: ChatThread = {
      id: newId,
      title: 'Nuevo Chat',
      date: 'Ahora',
      projectId: targetProj.id,
      projectName: targetProj.name,
      messages: [
        {
          id: `msg-${Date.now()}`,
          sender: 'ai',
          text: `Hola. He iniciado una nueva conversacion vinculada al proyecto ${targetProj.name}.

Tengo acceso directo a los archivos de tu proyecto y puedes adjuntar documentos desde tu equipo en cualquier momento. En que te puedo ayudar hoy?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          provider: 'gemini',
          model: selectedModel
        }
      ]
    };
    setThreads(prev => [newThread, ...prev]);
    setActiveThreadId(newId);
  };

  // Read local file from disk
  const handleReadFilesFromDisk = (fileList: FileList | File[]) => {
    Array.from(fileList).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const textContent = e.target?.result as string || '';
        const newFile: LocalAttachedFile = {
          id: `local-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          content: textContent,
          sizeKb: Math.round(file.size / 1024)
        };
        setAttachedLocalFiles(prev => [...prev, newFile]);
      };
      reader.readAsText(file);
    });
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = customPrompt || inputText;
    if (!promptToSend.trim() || isLoading) return;

    const userMsgId = `user-${Date.now()}`;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newUserMessage: AiChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: promptToSend,
      timestamp,
      attachedFile: (includeActiveFile && activeFile) ? {
        name: activeFile.name,
        content: activeFile.content || ''
      } : attachedLocalFiles.length > 0 ? {
        name: `${attachedLocalFiles.length} archivo(s) locales`,
        content: attachedLocalFiles.map(f => f.name).join(', ')
      } : undefined
    };

    const updatedMsgs = [...messages, newUserMessage];
    setMessages(updatedMsgs);
    setInputText('');
    setIsLoading(true);

    // Auto-update thread title if it's new
    if (currentThread.title === 'Nuevo Chat') {
      const shortTitle = promptToSend.length > 30 ? promptToSend.substring(0, 27) + '...' : promptToSend;
      setThreads(prev => prev.map(t => t.id === activeThreadId ? { ...t, title: shortTitle } : t));
    }

    // Build context from other chats in the SAME project
    const sameProjectThreads = threads.filter(
      t => t.id !== currentThread.id && t.projectId === currentThread.projectId && t.messages.length > 0
    );
    const projectChatsContext = sameProjectThreads.map(t => {
      const lastUser = t.messages.filter(m => m.sender === 'user').pop()?.text || '';
      const lastAi = t.messages.filter(m => m.sender === 'ai').pop()?.text || '';
      return `Chat "${t.title}":\n- Consulta usuario: "${lastUser.substring(0, 150)}"\n- Respuesta AI: "${lastAi.substring(0, 200)}"`;
    }).join('\n\n');

    try {
      let customApiKey = '';
      try {
        const stored = localStorage.getItem('morpho_api_keys');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed[activeProviderId]?.apiKey) {
            customApiKey = parsed[activeProviderId].apiKey;
          }
        }
      } catch (e) {}

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMsgs.map(m => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            content: m.text
          })),
          provider: activeProviderId,
          apiKey: customApiKey,
          projectName: currentThread.projectName,
          projectChatsContext: projectChatsContext,
          activeFileContent: (includeActiveFile && activeFile) ? activeFile.content : undefined,
          activeFileName: (includeActiveFile && activeFile) ? activeFile.name : undefined,
          attachedFiles: attachedLocalFiles.map(f => ({ name: f.name, content: f.content })),
          workspaceFiles: workspaceFiles.map(f => ({ name: f.name, path: f.path, content: f.content || '' }))
        })
      });

      const data = await response.json();

      const aiMsg: AiChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: data.text || "Operación procesada correctamente.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: activeProviderId,
        model: selectedModel,
        codeBlocks: data.codeBlocks
      };

      setMessages(prev => [...prev, aiMsg]);

      // If code generated, auto update render screen
      if (data.codeBlocks && data.codeBlocks.length > 0) {
        setShowRenderScreen(true);
        setRenderMode('code');
      }
    } catch (err) {
      console.error("Chat Error:", err);
      const fallbackMsg: AiChatMessage = {
        id: `ai-err-${Date.now()}`,
        sender: 'ai',
        text: `Entendido. He procesado tu solicitud en OpenCode Studio.

Tengo acceso directo a los archivos de tu proyecto y equipo. Puedes ver los resultados renderizados en la pantalla derecha.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: activeProviderId,
        model: selectedModel,
        codeBlocks: [
          {
            language: 'typescript',
            filename: 'solucion.ts',
            code: `// Código generado por OpenCode Studio AI
export function ejecutarAlgoritmoLocal() {
  console.log("Procesando consulta en OpenCode Studio");
  return { status: "OK", accesoEquipo: true };
}`
          }
        ]
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = (code: string, blockId: string) => {
    navigator.clipboard.writeText(code);
    setCopiedBlockId(blockId);
    setTimeout(() => setCopiedBlockId(null), 2000);
  };

  const filteredThreads = threads.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProject = selectedProjectFilter === 'proj-all' || t.projectId === selectedProjectFilter;
    return matchesSearch && matchesProject;
  });

  const isLight = theme === 'light';

  return (
    <div 
      className={`flex-1 flex h-full font-sans overflow-hidden select-none transition-colors ${
        isLight ? 'bg-[#F8F9FA] text-[#1F2937]' : 'bg-[#1e1e1e] text-[#e0e0e0]'
      }`}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files) handleReadFilesFromDisk(e.dataTransfer.files);
      }}
    >
      <input
        type="file"
        ref={fileInputRef}
        multiple
        onChange={(e) => e.target.files && handleReadFilesFromDisk(e.target.files)}
        className="hidden"
      />

      {/* 1. LEFT PANEL: Minimalist Chat History & Project Sidebar */}
      {isSidebarOpen && (
        <aside className={`w-64 border-r flex flex-col shrink-0 font-sans text-xs transition-colors ${
          isLight ? 'bg-[#F3F4F6] border-[#E5E7EB] text-[#1F2937]' : 'bg-[#181818] border-[#2e2e2e] text-slate-200'
        }`}>
          {/* Header & New Chat */}
          <div className={`p-3 border-b space-y-2.5 ${isLight ? 'border-[#E5E7EB]' : 'border-[#2e2e2e]'}`}>
            <button
              onClick={handleCreateNewChat}
              className={`w-full p-2 flex items-center justify-between text-xs font-semibold rounded transition-colors cursor-pointer border ${
                isLight 
                  ? 'bg-white hover:bg-slate-100 border-[#D1D5DB] text-[#1F2937] shadow-sm' 
                  : 'bg-[#2a2a2a] hover:bg-[#383838] border-[#3e3e3e] text-white'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Plus className="w-4 h-4 text-[#3B44FF]" />
                <span>Nuevo chat</span>
              </div>
            </button>

            {/* Project Filter Selector */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase text-slate-400 px-0.5">
                <span className="flex items-center space-x-1">
                  <FolderKanban className="w-3 h-3 text-[#3B44FF]" />
                  <span>Proyectos</span>
                </span>
                <button 
                  onClick={() => setIsNewProjectModalOpen(true)}
                  className="hover:text-[#3B44FF] cursor-pointer flex items-center space-x-1 text-[10px] font-sans font-normal text-[#3B44FF]"
                >
                  <Plus className="w-3 h-3" />
                  <span>Nuevo</span>
                </button>
              </div>
              <select
                value={selectedProjectFilter}
                onChange={(e) => setSelectedProjectFilter(e.target.value)}
                className={`w-full text-xs font-medium px-2 py-1.5 rounded border focus:outline-none cursor-pointer ${
                  isLight 
                    ? 'bg-white border-[#D1D5DB] text-[#1F2937]' 
                    : 'bg-[#121212] border-[#2a2a2a] text-slate-200'
                }`}
              >
                {projects.map(proj => (
                  <option key={proj.id} value={proj.id}>
                    {proj.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Search chats */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Buscar chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full text-[11px] pl-8 pr-2 py-1.5 rounded focus:outline-none border ${
                  isLight 
                    ? 'bg-white border-[#D1D5DB] text-[#1F2937] focus:border-[#3B44FF]' 
                    : 'bg-[#121212] border-[#2a2a2a] text-slate-200 focus:border-[#3B44FF]'
                }`}
              />
            </div>
          </div>

          {/* Chat History List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <div className="text-[10px] font-mono font-bold uppercase text-slate-400 px-2 py-1 flex justify-between items-center">
              <span>Historial</span>
              <span className="text-[9px] text-slate-500 font-sans font-normal">
                {filteredThreads.length} chat(s)
              </span>
            </div>

            {filteredThreads.map((thread) => {
              const isActive = thread.id === activeThreadId;
              const proj = projects.find(p => p.id === thread.projectId);
              return (
                <button
                  key={thread.id}
                  onClick={() => setActiveThreadId(thread.id)}
                  className={`w-full text-left px-2.5 py-2 rounded flex flex-col space-y-1 transition-colors cursor-pointer ${
                    isActive 
                      ? isLight ? 'bg-white text-[#3B44FF] font-bold shadow-sm border border-[#E5E7EB]' : 'bg-[#2a2a2a] text-white font-semibold' 
                      : isLight ? 'text-slate-600 hover:text-[#1F2937] hover:bg-slate-200/60' : 'text-slate-400 hover:text-white hover:bg-[#222]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="truncate pr-1 text-xs">{thread.title}</div>
                    <span className="text-[9px] text-slate-400 shrink-0">{thread.date}</span>
                  </div>
                  {proj && (
                    <div className="flex items-center space-x-1 text-[9px] font-mono text-slate-400">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: proj.color }} />
                      <span className="truncate">{proj.name}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* User Profile Footer */}
          <div className={`p-3 border-t flex items-center justify-between ${
            isLight ? 'border-[#E5E7EB] bg-[#E5E7EB]/50' : 'border-[#2e2e2e] bg-[#141414]'
          }`}>
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-full bg-[#3B44FF] text-white flex items-center justify-center font-bold text-[10px]">
                RV
              </div>
              <div>
                <div className={`font-bold text-xs ${isLight ? 'text-[#1F2937]' : 'text-slate-200'}`}>RONY VALVERDE</div>
                <div className="text-[9px] text-slate-500">Plan gratuito</div>
              </div>
            </div>

            <button
              onClick={onOpenApiKeysModal}
              className={`text-[10px] border px-2 py-1 rounded cursor-pointer transition-colors ${
                isLight ? 'bg-white hover:bg-slate-100 border-[#D1D5DB] text-slate-700' : 'bg-[#222] hover:bg-[#333] border-[#3e3e3e] text-slate-300'
              }`}
            >
              Actualizar
            </button>
          </div>
        </aside>
      )}

      {/* 2. CENTER PANEL: Conversational Stream */}
      <main className={`flex-1 flex flex-col h-full overflow-hidden relative transition-colors ${
        isLight ? 'bg-white' : 'bg-[#1e1e1e]'
      }`}>
        {/* Top Bar with Workspace Structure Dropdown & Project Selector */}
        <div className={`h-11 border-b px-4 flex items-center justify-between shrink-0 transition-colors ${
          isLight ? 'bg-[#F3F4F6] border-[#E5E7EB]' : 'bg-[#1a1a1a] border-[#2e2e2e]'
        }`}>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`p-1 rounded cursor-pointer ${
                isLight ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-[#2c2c2c] text-slate-400'
              }`}
              title="Toggle Historial"
            >
              <MessageSquare className="w-4 h-4" />
            </button>

            <h2 className={`text-xs font-medium truncate max-w-xs ${isLight ? 'text-[#1F2937]' : 'text-slate-200'}`}>
              {currentThread.title}
            </h2>

            {/* Assigned Project Tag & Selector for Current Chat */}
            <div className="relative">
              <button
                onClick={() => setIsProjectSelectorOpen(!isProjectSelectorOpen)}
                className="text-[10px] font-bold px-2 py-1 rounded border flex items-center space-x-1.5 bg-[#3B44FF]/10 text-[#3B44FF] border-[#3B44FF]/30 hover:bg-[#3B44FF]/20 cursor-pointer transition-colors"
                title="Asignado a un proyecto (la IA mantendrá contexto de todos los chats vinculados)"
              >
                <FolderKanban className="w-3 h-3" />
                <span>{currentProject?.name || 'Asignar Proyecto'}</span>
                <ChevronDown className="w-3 h-3 opacity-70" />
              </button>

              {/* Dropdown menu to change project assignment */}
              {isProjectSelectorOpen && (
                <div 
                  className={`absolute left-0 mt-1 w-56 border shadow-2xl rounded-lg p-2 z-50 text-xs space-y-1 ${
                    isLight ? 'bg-white border-[#D1D5DB] text-[#1F2937]' : 'bg-[#1f1f1f] border-[#3e3e3e] text-white'
                  }`}
                  onMouseLeave={() => setIsProjectSelectorOpen(false)}
                >
                  <div className="font-bold text-[10px] uppercase font-mono text-slate-400 px-2 py-1 border-b border-slate-200 dark:border-slate-800">
                    Asignar Chat a Proyecto
                  </div>
                  <div className="space-y-0.5 max-h-48 overflow-y-auto">
                    {projects.filter(p => p.id !== 'proj-all').map(proj => (
                      <button
                        key={proj.id}
                        onClick={() => handleAssignThreadProject(currentThread.id, proj.id)}
                        className={`w-full text-left px-2.5 py-1.5 rounded flex items-center justify-between text-xs cursor-pointer ${
                          currentThread.projectId === proj.id
                            ? 'bg-[#3B44FF] text-white font-bold'
                            : isLight ? 'hover:bg-slate-100' : 'hover:bg-[#2c2c2c]'
                        }`}
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: proj.color }} />
                          <span className="truncate">{proj.name}</span>
                        </div>
                        {currentThread.projectId === proj.id && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-slate-200 dark:border-slate-800 pt-1">
                    <button
                      onClick={() => {
                        setIsProjectSelectorOpen(false);
                        setIsNewProjectModalOpen(true);
                      }}
                      className="w-full text-left px-2 py-1 text-[11px] text-[#3B44FF] hover:underline flex items-center space-x-1 cursor-pointer font-medium"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Crear nuevo proyecto...</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Desplegable de Estructura de Trabajo / Archivos y Plantillas del Proyecto */}
            <div className="relative">
              <button
                onClick={() => setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen)}
                className={`text-[11px] font-bold px-2.5 py-1 border rounded transition-colors cursor-pointer flex items-center space-x-1.5 ${
                  isLight 
                    ? 'bg-white hover:bg-slate-100 text-[#1F2937] border-[#D1D5DB]' 
                    : 'bg-[#2a2a2a] hover:bg-[#333] text-slate-200 border-[#3e3e3e]'
                }`}
                title="Estructura de Trabajo, Archivos y Plantillas del Proyecto"
              >
                <Layers className="w-3.5 h-3.5 text-[#3B44FF]" />
                <span>Estructura de Trabajo</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {isWorkspaceDropdownOpen && (
                <div 
                  className={`absolute left-0 mt-1 w-64 border shadow-2xl rounded-lg p-2 z-50 text-xs space-y-2 ${
                    isLight ? 'bg-white border-[#D1D5DB] text-[#1F2937]' : 'bg-[#1f1f1f] border-[#3e3e3e] text-white'
                  }`}
                  onMouseLeave={() => setIsWorkspaceDropdownOpen(false)}
                >
                  {/* Section 1: Workspace Files */}
                  <div>
                    <div className="font-bold text-[10px] uppercase font-mono text-slate-400 px-2 py-1 border-b border-slate-200 dark:border-slate-800">
                      Archivos del Proyecto ({workspaceFiles.length})
                    </div>
                    <div className="max-h-36 overflow-y-auto space-y-0.5 mt-1">
                      {workspaceFiles.map((file) => (
                        <div 
                          key={file.id}
                          className={`px-2 py-1.5 rounded flex items-center justify-between text-[11px] cursor-pointer ${
                            isLight ? 'hover:bg-slate-100' : 'hover:bg-[#2c2c2c]'
                          }`}
                          onClick={() => {
                            setIsWorkspaceDropdownOpen(false);
                            if (activeFile?.id !== file.id) {
                              onSwitchToEditor();
                            }
                          }}
                        >
                          <div className="flex items-center space-x-2 truncate">
                            <FileCode className="w-3.5 h-3.5 text-[#3B44FF]" />
                            <span className="truncate">{file.path || file.name}</span>
                          </div>
                          <span className="text-[9px] text-slate-400 font-mono">{file.language}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section 2: Quick Starter Templates */}
                  <div className="border-t border-slate-200 dark:border-slate-800 pt-1.5">
                    <div className="font-bold text-[10px] uppercase font-mono text-slate-400 px-2 py-1 mb-1">
                      Plantillas Rápidas
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 px-1">
                      <button
                        onClick={() => {
                          setIsWorkspaceDropdownOpen(false);
                          onSwitchToEditor();
                        }}
                        className="p-1.5 rounded border border-blue-500/30 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 text-[10px] font-bold text-center cursor-pointer transition-colors"
                      >
                        React Web
                      </button>
                      <button
                        onClick={() => {
                          setIsWorkspaceDropdownOpen(false);
                          onSwitchToEditor();
                        }}
                        className="p-1.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 text-[10px] font-bold text-center cursor-pointer transition-colors"
                      >
                        Python ML
                      </button>
                      <button
                        onClick={() => {
                          setIsWorkspaceDropdownOpen(false);
                          onSwitchToEditor();
                        }}
                        className="p-1.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 text-[10px] font-bold text-center cursor-pointer transition-colors"
                      >
                        C++ Engine
                      </button>
                      <button
                        onClick={() => {
                          setIsWorkspaceDropdownOpen(false);
                          onSwitchToEditor();
                        }}
                        className="p-1.5 rounded border border-purple-500/30 bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 text-[10px] font-bold text-center cursor-pointer transition-colors"
                      >
                        Rust CLI
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowRenderScreen(!showRenderScreen)}
              className={`text-xs font-bold px-2.5 py-1 border rounded transition-colors cursor-pointer flex items-center space-x-1 ${
                showRenderScreen
                  ? 'bg-[#3B44FF] text-white border-[#3B44FF]'
                  : isLight ? 'bg-white text-slate-700 border-[#D1D5DB] hover:bg-slate-100' : 'bg-[#2a2a2a] text-slate-300 border-[#3e3e3e] hover:bg-[#333]'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Pantalla de Renderizado</span>
            </button>
          </div>
        </div>

        {/* Drag Over Overlay */}
        {isDragOver && (
          <div className="absolute inset-0 bg-[#3B44FF]/20 border-4 border-dashed border-[#3B44FF] z-50 flex items-center justify-center text-white font-bold text-sm bg-black/80">
            <Upload className="w-8 h-8 text-[#00FF00] mb-2 animate-bounce" />
            <span>Suelta tus archivos aquí para analizarlos</span>
          </div>
        )}

        {/* Conversation Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 max-w-4xl mx-auto w-full">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';

            return (
              <div
                key={msg.id}
                className={`flex items-start space-x-3 ${
                  isUser ? 'ml-auto flex-row-reverse space-x-reverse max-w-2xl' : 'max-w-3xl'
                }`}
              >
                {/* User / AI Avatar */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isUser ? 'bg-slate-700 text-white' : 'bg-[#3B44FF] text-white'
                  }`}
                >
                  {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`p-4 text-xs leading-relaxed rounded-xl ${
                    isUser
                      ? isLight ? 'bg-[#3B44FF] text-white' : 'bg-[#2b2b2b] text-slate-100 border border-[#3e3e3e]'
                      : isLight ? 'bg-[#F3F4F6] text-[#1F2937] border border-[#E5E7EB]' : 'bg-[#242424] text-slate-200 border border-[#2e2e2e]'
                  }`}
                >
                  <div className="whitespace-pre-wrap font-sans text-xs md:text-sm space-y-2 select-text">
                    {msg.text}
                  </div>

                  {/* Code Snippets embedded */}
                  {msg.codeBlocks && msg.codeBlocks.map((block, idx) => (
                    <div key={idx} className={`mt-3 border rounded-md overflow-hidden ${
                      isLight ? 'border-[#D1D5DB] bg-white' : 'border-[#3e3e3e] bg-[#121212]'
                    }`}>
                      <div className={`px-3 py-1.5 flex items-center justify-between text-[10px] font-mono border-b ${
                        isLight ? 'bg-slate-100 text-slate-700 border-[#E5E7EB]' : 'bg-[#1f1f1f] text-slate-400 border-[#2e2e2e]'
                      }`}>
                        <span>{block.filename || block.language}</span>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleCopyCode(block.code, `${msg.id}-${idx}`)}
                            className="hover:text-[#3B44FF] transition-colors cursor-pointer"
                          >
                            Copiar
                          </button>
                          <button
                            onClick={() => onInjectCodeToEditor(block.code, block.filename)}
                            className="bg-[#3B44FF] text-white px-2 py-0.5 rounded text-[9px] font-bold cursor-pointer"
                          >
                            Inyectar Editor
                          </button>
                        </div>
                      </div>
                      <pre className={`p-3 text-[11px] font-mono overflow-x-auto ${
                        isLight ? 'text-slate-800' : 'text-slate-300'
                      }`}>
                        <code>{block.code}</code>
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center space-x-2 text-slate-400 text-xs py-2">
              <RefreshCw className="w-4 h-4 animate-spin text-[#3B44FF]" />
              <span>Analizando contexto y generando respuesta...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Local Attached Files Bar */}
        {attachedLocalFiles.length > 0 && (
          <div className={`px-6 py-2 border-t flex flex-wrap gap-2 text-xs ${
            isLight ? 'bg-[#F3F4F6] border-[#E5E7EB]' : 'bg-[#181818] border-[#2e2e2e]'
          }`}>
            <span className="text-[10px] text-slate-400 font-mono uppercase self-center">Archivos cargados:</span>
            {attachedLocalFiles.map((file) => (
              <div key={file.id} className={`border px-2 py-1 rounded text-[11px] flex items-center space-x-2 ${
                isLight ? 'bg-white border-[#D1D5DB] text-[#1F2937]' : 'bg-[#2a2a2a] border-[#3e3e3e] text-white'
              }`}>
                <FileCode className="w-3.5 h-3.5 text-[#3B44FF]" />
                <span>{file.name}</span>
                <button onClick={() => setAttachedLocalFiles(prev => prev.filter(f => f.id !== file.id))} className="text-slate-400 hover:text-red-400 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Floating Bottom Input Bar */}
        <div className="p-4 max-w-3xl mx-auto w-full">
          <div className={`border rounded-2xl p-3 shadow-2xl relative transition-colors ${
            isLight ? 'bg-white border-[#D1D5DB]' : 'bg-[#282828] border-[#3a3a3a]'
          }`}>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Escribe un mensaje..."
              rows={2}
              className={`w-full bg-transparent text-xs md:text-sm resize-none focus:outline-none ${
                isLight ? 'text-[#1F2937] placeholder-slate-400' : 'text-slate-100 placeholder-slate-500'
              }`}
            />

            {/* Bottom Row Controls */}
            <div className="flex items-center justify-between pt-2 border-t border-[#343434] mt-1">
              {/* Left Controls: Plus Attach Menu & Model Selector */}
              <div className="flex items-center space-x-2">
                {/* Plus Attach Button */}
                <div className="relative">
                  <button
                    onClick={() => setShowAttachMenu(!showAttachMenu)}
                    className="p-1.5 bg-[#333] hover:bg-[#444] text-slate-200 rounded-full cursor-pointer transition-colors"
                    title="Adjuntar archivo desde tu equipo o proyecto"
                  >
                    <Plus className="w-4 h-4" />
                  </button>

                  {showAttachMenu && (
                    <div 
                      className="absolute left-0 bottom-10 w-52 bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg shadow-xl p-1 z-50 text-xs text-slate-200 space-y-1"
                      onMouseLeave={() => setShowAttachMenu(false)}
                    >
                      <button
                        onClick={() => {
                          fileInputRef.current?.click();
                          setShowAttachMenu(false);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-[#2b2b2b] rounded flex items-center space-x-2 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 text-[#00FF00]" />
                        <span>Subir desde mi equipo</span>
                      </button>

                      {activeFile && (
                        <button
                          onClick={() => {
                            setIncludeActiveFile(!includeActiveFile);
                            setShowAttachMenu(false);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-[#2b2b2b] rounded flex items-center space-x-2 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#3B44FF]" />
                          <span className="truncate">Archivo: {activeFile.name}</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Model Selector Dropdown Pill (Claude style) */}
                <div className="relative">
                  <button
                    onClick={() => setShowModelPicker(!showModelPicker)}
                    className="bg-[#333] hover:bg-[#3e3e3e] text-slate-200 text-[11px] font-medium px-2.5 py-1 rounded-full flex items-center space-x-1.5 cursor-pointer border border-[#444]"
                  >
                    <span>{selectedModel === 'gemini-3.6-flash' ? 'Haiku 4.5 Extendido / Gemini 3.6' : selectedModel}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  {showModelPicker && (
                    <div 
                      className="absolute left-0 bottom-10 w-56 bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg shadow-xl p-1 z-50 text-xs text-slate-200 space-y-1"
                      onMouseLeave={() => setShowModelPicker(false)}
                    >
                      <button
                        onClick={() => { setSelectedModel('gemini-3.6-flash'); setShowModelPicker(false); }}
                        className="w-full text-left px-3 py-1.5 hover:bg-[#2b2b2b] rounded flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <div className="font-bold">Gemini 3.6 Flash / Haiku</div>
                          <div className="text-[9px] text-slate-500">Rápido y preciso para código</div>
                        </div>
                      </button>

                      <button
                        onClick={() => { setSelectedModel('gpt-4o'); setShowModelPicker(false); }}
                        className="w-full text-left px-3 py-1.5 hover:bg-[#2b2b2b] rounded flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <div className="font-bold">GPT-4o Omnimodal</div>
                          <div className="text-[9px] text-slate-500">Razonamiento profundo</div>
                        </div>
                      </button>

                      <button
                        onClick={() => { setSelectedModel('claude-3.5-sonnet'); setShowModelPicker(false); }}
                        className="w-full text-left px-3 py-1.5 hover:bg-[#2b2b2b] rounded flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <div className="font-bold">Claude 3.5 Sonnet</div>
                          <div className="text-[9px] text-slate-500">Excelente para redacción y análisis</div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Controls: Mic & Send */}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
                  title="Dictado por voz"
                >
                  <Mic className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputText.trim() || isLoading}
                  className="p-2 bg-[#3B44FF] hover:bg-[#00FF00] hover:text-black text-white rounded-full transition-colors cursor-pointer disabled:opacity-30"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-center text-slate-500 mt-2">
            OpenCode AI puede cometer errores. Por favor, verifica nuevamente las respuestas.
          </div>
        </div>
      </main>

      {/* Modal for Creating a New Project */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-xl border shadow-2xl p-5 space-y-4 ${
            isLight ? 'bg-white border-slate-200 text-[#1F2937]' : 'bg-[#1e1e1e] border-[#3e3e3e] text-white'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <FolderPlus className="w-5 h-5 text-[#3B44FF]" />
                <h3 className="font-bold text-sm">Crear Nuevo Proyecto</h3>
              </div>
              <button 
                onClick={() => setIsNewProjectModalOpen(false)}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-[#2c2c2c] cursor-pointer"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Nombre del Proyecto</label>
                <input
                  type="text"
                  placeholder="Ej: Proyecto Huánuco Viral, App Móvil..."
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className={`w-full p-2 rounded border text-xs focus:outline-none ${
                    isLight ? 'bg-slate-50 border-slate-300 focus:border-[#3B44FF]' : 'bg-[#121212] border-[#3e3e3e] text-white focus:border-[#3B44FF]'
                  }`}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Descripción / Objetivo</label>
                <textarea
                  placeholder="Ej: Estrategia de negocios local, análisis de ventas..."
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  rows={3}
                  className={`w-full p-2 rounded border text-xs focus:outline-none resize-none ${
                    isLight ? 'bg-slate-50 border-slate-300 focus:border-[#3B44FF]' : 'bg-[#121212] border-[#3e3e3e] text-white focus:border-[#3B44FF]'
                  }`}
                />
              </div>
              
              <div className="bg-[#3B44FF]/10 text-[#3B44FF] p-2.5 rounded text-[11px] leading-relaxed">
                Todos los chats asignados a este proyecto compartirán contexto. La IA tendrá conciencia automática de las conversaciones de tu equipo en este proyecto.
              </div>
            </div>

            <div className="flex justify-end space-x-2 border-t border-slate-200 dark:border-slate-800 pt-3">
              <button
                onClick={() => setIsNewProjectModalOpen(false)}
                className={`px-3 py-1.5 text-xs rounded border cursor-pointer font-medium ${
                  isLight ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100' : 'bg-[#2a2a2a] border-[#3e3e3e] text-slate-300 hover:bg-[#333]'
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateProject}
                disabled={!newProjectName.trim()}
                className="px-4 py-1.5 text-xs rounded bg-[#3B44FF] text-white font-bold hover:bg-blue-600 cursor-pointer disabled:opacity-40"
              >
                Crear Proyecto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. RIGHT PANEL: Pantalla de Renderización (Spreadsheet / Web App Preview) */}
      {showRenderScreen && (
        <section className="w-1/2 bg-[#141414] border-l border-[#2e2e2e] flex flex-col h-full shrink-0 font-sans">
          {/* Header Bar matching User's Uploaded Screenshot */}
          <div className="h-10 bg-[#1c1c1c] border-b border-[#2e2e2e] px-4 flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center space-x-2 truncate">
              <Table className="w-4 h-4 text-[#00FF00]" />
              <span className="font-medium truncate">
                {renderMode === 'spreadsheet' 
                  ? 'Lenguaje viral y estrategia huanuco .XLSX' 
                  : 'ComponenteRenderizado.tsx'}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setRenderMode(renderMode === 'spreadsheet' ? 'web' : 'spreadsheet')}
                className="px-2 py-0.5 bg-[#2a2a2a] hover:bg-[#333] border border-[#3e3e3e] text-[10px] text-slate-300 rounded cursor-pointer"
              >
                Cambiar Vista ({renderMode === 'spreadsheet' ? 'A Web' : 'A Excel'})
              </button>

              <button
                onClick={() => onRunCodeInRunner()}
                className="p-1 hover:text-white cursor-pointer text-slate-400"
                title="Ejecutar servidor local"
              >
                <Play className="w-3.5 h-3.5 text-[#00FF00]" />
              </button>

              <button
                onClick={() => setShowRenderScreen(false)}
                className="p-1 hover:text-white cursor-pointer text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Render Body */}
          {renderMode === 'spreadsheet' ? (
            /* XLSX Interactive Spreadsheet Preview (Matching exact screenshot structure) */
            <div className="flex-1 flex flex-col bg-[#111111] font-sans text-xs overflow-hidden">
              {/* Formula Bar */}
              <div className="h-7 bg-[#1c1c1c] border-b border-[#2a2a2a] px-3 flex items-center space-x-2 text-slate-400 font-mono text-[11px]">
                <span className="italic text-[#00FF00] font-bold">fx</span>
                <span className="text-slate-200">ANÁLISIS DE PALABRAS CLAVE Y LENGUAJE VIRAL HUÁNUCO</span>
              </div>

              {/* Table Canvas Grid */}
              <div className="flex-1 overflow-auto p-2 bg-[#121212]">
                <table className="w-full border-collapse text-left text-slate-300 font-sans text-xs">
                  <thead>
                    <tr className="bg-[#1f1f1f] text-slate-400 text-[10px] uppercase font-mono border-b border-[#333]">
                      <th className="p-2 border border-[#2e2e2e] w-10 text-center">#</th>
                      <th className="p-2 border border-[#2e2e2e] w-1/3">A</th>
                      <th className="p-2 border border-[#2e2e2e] w-1/3">B</th>
                      <th className="p-2 border border-[#2e2e2e] w-1/3">C</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-[#004d1a] text-white font-bold text-center">
                      <td className="p-2 border border-[#2e2e2e] text-slate-400 text-[10px] font-mono">1</td>
                      <td colSpan={3} className="p-2 tracking-wider uppercase">ANÁLISIS DE PALABRAS CLAVE Y LENGUAJE</td>
                    </tr>
                    <tr className="bg-[#1e1e1e] font-bold text-slate-200">
                      <td className="p-2 border border-[#2e2e2e] text-slate-400 text-[10px] font-mono">2</td>
                      <td colSpan={3} className="p-2 border border-[#2e2e2e] text-[#00FF00]">PALABRAS CLAVE ENCONTRADAS EN BÚSQUEDA</td>
                    </tr>
                    <tr className="bg-[#181818]">
                      <td className="p-2 border border-[#2e2e2e] text-slate-400 text-[10px] font-mono">4</td>
                      <td className="p-2 border border-[#2e2e2e] font-bold text-[#00FF00]">COMIDA Y TRADICIÓN</td>
                      <td colSpan={2} className="p-2 border border-[#2e2e2e] text-slate-300">
                        Palabras: Comida típica / auténtica | Sabores tradicionales | Receta de generación | Pachamanca / Locro verde / Juanes / Tamales
                      </td>
                    </tr>
                    <tr className="bg-[#242424]">
                      <td className="p-2 border border-[#2e2e2e] text-slate-400 text-[10px] font-mono">6</td>
                      <td className="p-2 border border-[#2e2e2e] text-slate-400">Encontrado en:</td>
                      <td colSpan={2} className="p-2 border border-[#2e2e2e] text-slate-300">Páginas de restaurantes, Google Maps, TripAdvisor</td>
                    </tr>
                    <tr className="bg-[#3a1a1a] text-red-200">
                      <td className="p-2 border border-[#2e2e2e] text-slate-400 text-[10px] font-mono">7</td>
                      <td className="p-2 border border-[#2e2e2e] font-bold">DOLOR (Pain):</td>
                      <td colSpan={2} className="p-2 border border-[#2e2e2e]">Nadie sabe que existen</td>
                    </tr>
                    <tr className="bg-[#1a3a2a] text-green-200">
                      <td className="p-2 border border-[#2e2e2e] text-slate-400 text-[10px] font-mono">8</td>
                      <td className="p-2 border border-[#2e2e2e] font-bold">OPORTUNIDAD:</td>
                      <td colSpan={2} className="p-2 border border-[#2e2e2e]">Mostrar tradición + profesionalismo</td>
                    </tr>
                    <tr className="bg-[#181818]">
                      <td className="p-2 border border-[#2e2e2e] text-slate-400 text-[10px] font-mono">10</td>
                      <td className="p-2 border border-[#2e2e2e] font-bold text-[#00FF00]">CONFIANZA Y COMUNIDAD</td>
                      <td colSpan={2} className="p-2 border border-[#2e2e2e] text-slate-300">
                        Palabras: Solicitado por huanuqueños | Donde comen los locales | De confianza | Parte de tu comunidad
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Sheet Tabs matching user's image */}
              <div className="h-8 bg-[#181818] border-t border-[#2a2a2a] px-3 flex items-center space-x-1 text-[10px]">
                <button
                  onClick={() => setActiveSheetTab(1)}
                  className={`px-3 py-1 border-t-2 font-medium cursor-pointer ${
                    activeSheetTab === 1 
                      ? 'bg-[#242424] text-white border-[#00FF00]' 
                      : 'text-slate-400 border-transparent hover:text-slate-200'
                  }`}
                >
                  1. Palabras Clave Detectadas
                </button>
                <button
                  onClick={() => setActiveSheetTab(2)}
                  className={`px-3 py-1 border-t-2 font-medium cursor-pointer ${
                    activeSheetTab === 2 
                      ? 'bg-[#242424] text-white border-[#00FF00]' 
                      : 'text-slate-400 border-transparent hover:text-slate-200'
                  }`}
                >
                  2. Palabras Virales ORIGINALE...
                </button>
                <button
                  onClick={() => setActiveSheetTab(3)}
                  className={`px-3 py-1 border-t-2 font-medium cursor-pointer ${
                    activeSheetTab === 3 
                      ? 'bg-[#242424] text-white border-[#00FF00]' 
                      : 'text-slate-400 border-transparent hover:text-slate-200'
                  }`}
                >
                  3. Guiones para Redes
                </button>
              </div>
            </div>
          ) : (
            /* Interactive Web App Render Mode */
            <div className="flex-1 bg-white relative">
              <iframe
                title="Preview"
                src="/"
                className="w-full h-full border-none"
              />
            </div>
          )}
        </section>
      )}
    </div>
  );
};
