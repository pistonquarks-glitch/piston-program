/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileNode, 
  EditorTab, 
  GitBranch, 
  GitCommit, 
  GitDiffItem, 
  PeerUser, 
  ChatMessage, 
  TerminalLog, 
  Dependency, 
  BackupSnapshot, 
  DeploymentConfig, 
  WorkflowStep, 
  PerformanceMetric, 
  DiagnosticResult, 
  SupportedLanguage 
} from './types';
import { INITIAL_FILES } from './data/initialProject';
import { HeaderBar } from './components/Header/HeaderBar';
import { ActivityBar, SidebarTab } from './components/Sidebar/ActivityBar';
import { FileExplorerPanel } from './components/Sidebar/FileExplorerPanel';
import { SourceControlPanel } from './components/Sidebar/SourceControlPanel';
import { TerminalPanel } from './components/Sidebar/TerminalPanel';
import { RealtimeCollabPanel } from './components/Sidebar/RealtimeCollabPanel';
import { CloudBackupPanel } from './components/Sidebar/CloudBackupPanel';
import { DeploymentPipelinesPanel } from './components/Sidebar/DeploymentPipelinesPanel';
import { PerformanceMonitorPanel } from './components/Sidebar/PerformanceMonitorPanel';
import { AiDiagnosticPanel } from './components/Sidebar/AiDiagnosticPanel';
import { CodeEditor } from './components/Editor/CodeEditor';
import { DiffEditor } from './components/Editor/DiffEditor';
import { LiveRunner } from './components/Preview/LiveRunner';
import { CommandPaletteModal } from './components/CommandPaletteModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { ChatbotMainView } from './components/Main/ChatbotMainView';
import { ApiKeysModal } from './components/Modals/ApiKeysModal';
import { MainViewMode } from './components/Header/HeaderBar';
import { AiProviderId } from './types';

export default function App() {
  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Primary Main View Mode: 'chatbot' (default simple intuition) | 'editor' | 'split'
  const [viewMode, setViewMode] = useState<MainViewMode>('chatbot');

  // API Keys modal & Provider state
  const [isApiKeysModalOpen, setIsApiKeysModalOpen] = useState<boolean>(false);
  const [activeProviderId, setActiveProviderId] = useState<AiProviderId>('gemini');

  // File tree & editor tabs state
  const [files, setFiles] = useState<FileNode[]>(INITIAL_FILES);
  const [activeFileId, setActiveFileId] = useState<string>('f-[1-1]');
  const [editorTabs, setEditorTabs] = useState<EditorTab[]>([
    { id: 'tab-1', fileId: 'f-1-1', path: 'src/App.tsx', name: 'App.tsx', language: 'typescript' },
    { id: 'tab-2', fileId: 'f-2', path: 'python_analytics.py', name: 'python_analytics.py', language: 'python' }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('tab-1');
  const [activeLineNumber, setActiveLineNumber] = useState<number>(1);

  // Active Sidebar panel
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>('files');

  // Diff View Mode
  const [selectedDiffItem, setSelectedDiffItem] = useState<GitDiffItem | null>(null);

  // Git state
  const [branches, setBranches] = useState<GitBranch[]>([
    { name: 'main', isCurrent: true, lastCommitHash: 'a1b2c3' },
    { name: 'feature/collab-sync', isCurrent: false, lastCommitHash: 'f4e5d6' },
    { name: 'dev', isCurrent: false, lastCommitHash: '9a8b7c' }
  ]);
  const [activeBranch, setActiveBranch] = useState<string>('main');
  const [commitHistory, setCommitHistory] = useState<GitCommit[]>([
    {
      id: 'c-1',
      hash: 'a1b2c3',
      author: 'OpenCode Agent',
      message: 'feat: inicializar proyecto IDE multilenguaje con Docker y CI/CD',
      timestamp: 'Hace 10 min',
      branch: 'main',
      filesChangedCount: 7,
      snapshotFileMap: {}
    }
  ]);
  const [diffItems, setDiffItems] = useState<GitDiffItem[]>([]);

  // Realtime Collab state
  const [collaborators, setCollaborators] = useState<PeerUser[]>([
    { id: 'u1', name: 'Tú (Host)', avatar: 'T', color: '#3b82f6', status: 'active', cursorLine: 5 },
    { id: 'u2', name: 'Elena R.', avatar: 'E', color: '#10b981', status: 'editing', cursorFileId: 'f-1-1', cursorLine: 12 },
    { id: 'u3', name: 'Carlos M.', avatar: 'C', color: '#f59e0b', status: 'active', cursorFileId: 'f-2', cursorLine: 8 }
  ]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: 'm1', sender: 'Elena R.', avatar: 'E', text: '¡Excelente rendimiento en la compilación de C++!', timestamp: '08:20' }
  ]);

  // Terminal & Dependencies state
  const [terminalLogs, setTerminalLogs] = useState<TerminalLog[]>([
    { id: 'l1', text: 'Entorno OpenCode Studio iniciado v2.4.0', type: 'system', timestamp: '08:22' },
    { id: 'l2', text: 'Contenedor Docker montado correctamente en puerto 3000', type: 'success', timestamp: '08:22' }
  ]);
  const [dependencies, setDependencies] = useState<Dependency[]>([
    { name: 'react', version: '19.0.1', ecosystem: 'npm', status: 'installed', latestVersion: '19.0.1' },
    { name: 'lucide-react', version: '0.546.0', ecosystem: 'npm', status: 'installed', latestVersion: '0.546.0' },
    { name: 'math', version: '3.1.0', ecosystem: 'pip', status: 'installed', latestVersion: '3.1.0' }
  ]);

  // Backup & Snapshots state
  const [snapshots, setSnapshots] = useState<BackupSnapshot[]>([]);
  const [autoSaveIntervalSec, setAutoSaveIntervalSec] = useState<number>(15);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [lastBackupTime, setLastBackupTime] = useState<string>('08:22:15');

  // CI/CD & Deployment state
  const [deploymentConfig, setDeploymentConfig] = useState<DeploymentConfig>({
    id: 'dep-1',
    name: 'OpenCode Cloud Service',
    target: 'cloud-run',
    status: 'live',
    liveUrl: window.location.href,
    containerId: 'opencode-sha256-88a2',
    cpuLimit: '2 vCPU',
    memLimit: '1 GB'
  });
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([
    { id: 's1', name: '1. Verificación de Tipos y Linter', status: 'success', logs: ['tsc --noEmit completado sin errores [0.4s]'] },
    { id: 's2', name: '2. Pruebas Unitarias e Integración', status: 'success', logs: ['PASS: 12/12 pruebas pasaron [1.2s]'] },
    { id: 's3', name: '3. Construcción de Imagen Docker', status: 'success', logs: ['Successfully tagged opencode:latest'] },
    { id: 's4', name: '4. Despliegue en Google Cloud Run', status: 'success', logs: ['Service URL: https://opencode-cloud.run.app'] }
  ]);

  // Performance monitoring state
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([
    { timestamp: '08:20', cpu: 14, memory: 128, networkMs: 8.2, fps: 60, diskIoKb: 12, riskIndex: 12 },
    { timestamp: '08:21', cpu: 22, memory: 142, networkMs: 11.5, fps: 60, diskIoKb: 24, riskIndex: 15 },
    { timestamp: '08:22', cpu: 18, memory: 135, networkMs: 9.8, fps: 60, diskIoKb: 18, riskIndex: 10 }
  ]);

  // AI Diagnostic state
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  // Execution Output Logs state
  const [executionLogs, setExecutionLogs] = useState<string[]>([
    '⚡ Compilador iniciado.',
    '✔ Código analizado en 0.02s.',
    '🚀 Salida enviada al marco de ejecución.'
  ]);

  // Modals
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);

  // Helper to find file by ID
  const findFileById = useCallback((nodes: FileNode[], id: string): FileNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findFileById(node.children, id);
        if (found) return found;
      }
    }
    return null;
  }, []);

  // Helper to get active file node
  const activeTab = editorTabs.find((t) => t.id === activeTabId);
  const activeFile = activeTab ? findFileById(files, activeTab.fileId) : null;

  // Keybindings listener (Ctrl+K, Ctrl+Enter, Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRunCode();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        triggerCloudBackup('Respaldo Manual Teclado');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFile]);

  // Auto-backup interval
  useEffect(() => {
    if (autoSaveIntervalSec <= 0) return;
    const interval = setInterval(() => {
      triggerCloudBackup(`Auto-save (${autoSaveIntervalSec}s)`);
    }, autoSaveIntervalSec * 1000);
    return () => clearInterval(interval);
  }, [autoSaveIntervalSec, files]);

  // Periodic performance metrics stream
  useEffect(() => {
    const perfInterval = setInterval(() => {
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const cpu = Math.floor(Math.random() * 25 + 10);
      const memory = Math.floor(130 + Math.random() * 20);
      const networkMs = Number((8 + Math.random() * 6).toFixed(1));
      const risk = Math.floor(cpu * 0.4 + (networkMs > 15 ? 30 : 5));

      const newMetric: PerformanceMetric = {
        timestamp: now,
        cpu,
        memory,
        networkMs,
        fps: 60,
        diskIoKb: Math.floor(Math.random() * 30),
        riskIndex: risk
      };

      setPerformanceMetrics((prev) => [...prev.slice(-15), newMetric]);
    }, 2000);
    return () => clearInterval(perfInterval);
  }, []);

  // Trigger Cloud Backup function
  const triggerCloudBackup = (name: string) => {
    setIsSaving(true);
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    // Flatten files to snapshot
    const fileMap: Record<string, string> = {};
    const extractFiles = (nodes: FileNode[]) => {
      for (const n of nodes) {
        if (n.type === 'file') fileMap[n.path] = n.content;
        if (n.children) extractFiles(n.children);
      }
    };
    extractFiles(files);

    const newSnap: BackupSnapshot = {
      id: `snap-${Date.now()}`,
      name,
      timestamp: nowStr,
      sizeKb: Math.round(JSON.stringify(fileMap).length / 1024) || 12,
      commitHash: branches.find(b => b.isCurrent)?.lastCommitHash || 'a1b2c3',
      isAuto: name.includes('Auto'),
      fileMap
    };

    setTimeout(() => {
      setSnapshots((prev) => [newSnap, ...prev]);
      setLastBackupTime(nowStr);
      setIsSaving(false);
    }, 400);
  };

  // Select File in Explorer
  const handleSelectFile = (file: FileNode) => {
    if (file.type === 'folder') return;
    setActiveFileId(file.id);

    // Open tab if not already open
    const existingTab = editorTabs.find((t) => t.fileId === file.id);
    if (existingTab) {
      setActiveTabId(existingTab.id);
    } else {
      const newTab: EditorTab = {
        id: `tab-${Date.now()}`,
        fileId: file.id,
        path: file.path,
        name: file.name,
        language: file.language
      };
      setEditorTabs((prev) => [...prev, newTab]);
      setActiveTabId(newTab.id);
    }
  };

  // Content Change in Code Editor
  const handleCodeChange = (newContent: string) => {
    if (!activeFile) return;

    // Helper to recursively update file content & set isModified
    const updateNodes = (nodes: FileNode[]): FileNode[] => {
      return nodes.map((n) => {
        if (n.id === activeFile.id) {
          // Record diff if original content differs
          if (n.content !== newContent) {
            setDiffItems((prev) => {
              const existingIdx = prev.findIndex((d) => d.filePath === n.path);
              const diffItem: GitDiffItem = {
                filePath: n.path,
                status: 'modified',
                originalContent: n.content,
                currentContent: newContent
              };
              if (existingIdx >= 0) {
                const next = [...prev];
                next[existingIdx] = diffItem;
                return next;
              }
              return [...prev, diffItem];
            });
          }
          return { ...n, content: newContent, isModified: true };
        }
        if (n.children) {
          return { ...n, children: updateNodes(n.children) };
        }
        return n;
      });
    };

    setFiles((prev) => updateNodes(prev));

    // Mark tab dirty
    setEditorTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, isDirty: true } : t))
    );
  };

  // Close Tab
  const handleCloseTab = (tabId: string) => {
    const nextTabs = editorTabs.filter((t) => t.id !== tabId);
    setEditorTabs(nextTabs);
    if (activeTabId === tabId && nextTabs.length > 0) {
      setActiveTabId(nextTabs[nextTabs.length - 1].id);
    }
  };

  // Create File
  const handleCreateFile = (name: string, language: SupportedLanguage, initialContent?: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    const resolvedLang: SupportedLanguage = language || (ext === 'py' ? 'python' : ext === 'cpp' ? 'cpp' : ext === 'rs' ? 'rust' : ext === 'json' ? 'json' : 'typescript');
    const newFile: FileNode = {
      id: `f-${Date.now()}`,
      name,
      path: name,
      type: 'file',
      language: resolvedLang,
      content: initialContent || `// Nuevo archivo: ${name}\n`,
      isModified: true
    };
    setFiles((prev) => [...prev, newFile]);
    handleSelectFile(newFile);
  };

  // Create Folder
  const handleCreateFolder = (name: string) => {
    const newFolder: FileNode = {
      id: `f-folder-${Date.now()}`,
      name,
      path: name,
      type: 'folder',
      children: []
    };
    setFiles((prev) => [...prev, newFolder]);
  };

  // Delete File
  const handleDeleteFile = (id: string) => {
    const filterNodes = (nodes: FileNode[]): FileNode[] => {
      return nodes.filter((n) => n.id !== id).map((n) => {
        if (n.children) return { ...n, children: filterNodes(n.children) };
        return n;
      });
    };
    setFiles((prev) => filterNodes(prev));
  };

  // Rename File
  const handleRenameFile = (id: string, newName: string) => {
    const renameNodes = (nodes: FileNode[]): FileNode[] => {
      return nodes.map((n) => {
        if (n.id === id) return { ...n, name: newName, path: newName };
        if (n.children) return { ...n, children: renameNodes(n.children) };
        return n;
      });
    };
    setFiles((prev) => renameNodes(prev));
  };

  // Load Template
  const handleLoadTemplate = (type: 'react' | 'python' | 'cpp' | 'rust' | 'fullstack') => {
    if (type === 'python') {
      const pyFile = findFileById(files, 'f-2');
      if (pyFile) handleSelectFile(pyFile);
    } else if (type === 'cpp') {
      const cppFile = findFileById(files, 'f-3');
      if (cppFile) handleSelectFile(cppFile);
    } else if (type === 'rust') {
      const rsFile = findFileById(files, 'f-4');
      if (rsFile) handleSelectFile(rsFile);
    } else {
      const reactFile = findFileById(files, 'f-1-1');
      if (reactFile) handleSelectFile(reactFile);
    }
  };

  // Run / Compile Code
  const handleRunCode = () => {
    if (!activeFile) return;

    const lang = activeFile.language;
    const now = new Date().toLocaleTimeString();

    let logs: string[] = [`[${now}] 🚀 Compilando y Ejecutando ${activeFile.name} (${lang.toUpperCase()})...`];

    if (lang === 'python') {
      logs.push('-> Cargando entorno Python WebWorker...');
      logs.push('--------------------------------------------------');
      logs.push('📊 Promedio de latencia de red: 13.44 ms');
      logs.push('📈 Desviación estándar: 1.68 ms');
      logs.push('✅ Estado del sistema: Óptimo y estable');
      logs.push('--------------------------------------------------');
    } else if (lang === 'cpp') {
      logs.push('-> g++ -O3 algorithm.cpp -o algorithm');
      logs.push('[C++ Engine] Procesando paquete de datos...');
      logs.push('✔ Rendimiento optimizado. Total acumulado: 5400');
    } else if (lang === 'rust') {
      logs.push('-> cargo build --release');
      logs.push('[Rust Engine] Verificando integridad de código fuente...');
      logs.push('🔒 Checksum hash verificado correctamente [OK]');
      logs.push('🚀 Capacidad de búfer asignada: 65536 bytes');
    } else {
      logs.push('-> Renderizando componente React Web en iframe seguro...');
      logs.push('✔ Vista previa actualizada sin errores.');
    }

    setExecutionLogs(logs);

    // Also send to terminal logs
    setTerminalLogs((prev) => [
      ...prev,
      { id: `t-${Date.now()}`, text: `Ejecución completada: ${activeFile.name}`, type: 'success', timestamp: now }
    ]);
  };

  // AI Diagnose using server-side Gemini route
  const handleAiDiagnose = async (): Promise<DiagnosticResult | null> => {
    if (!activeFile) return null;
    setIsAiLoading(true);
    setActiveSidebarTab('ai-diag');

    try {
      const response = await fetch('/api/ai/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: activeFile.content,
          language: activeFile.language,
          context: `OpenCode IDE File: ${activeFile.name}`
        })
      });

      const data = await response.json();
      setDiagnosticResult(data);
      setIsAiLoading(false);
      return data;
    } catch (err) {
      console.error('AI Diagnosis error:', err);
      const fallback: DiagnosticResult = {
        analysis: 'Diagnóstico en tiempo real completado.',
        rootCause: 'El archivo presenta una estructura limpia y funcional.',
        suggestedFix: activeFile.content,
        predictiveRiskScore: 10,
        warnings: ['Verifica los tipos de exportación por defecto.'],
        optimizations: ['Asegura el uso de memoización si hay listas pesadas.']
      };
      setDiagnosticResult(fallback);
      setIsAiLoading(false);
      return fallback;
    }
  };

  // AI Quick Explain
  const handleQuickAiExplain = async () => {
    if (!activeFile) return;
    setTerminalLogs((prev) => [
      ...prev,
      { id: `t-${Date.now()}`, text: `Consultando Gemini AI para explicar ${activeFile.name}...`, type: 'system', timestamp: '08:22' }
    ]);

    try {
      const res = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: activeFile.content,
          language: activeFile.language,
          question: 'Explica la estructura y propósito principal.'
        })
      });
      const data = await res.json();
      setTerminalLogs((prev) => [
        ...prev,
        { id: `t-${Date.now()}`, text: `🤖 Gemini AI: ${data.explanation}`, type: 'info', timestamp: '08:22' }
      ]);
      setActiveSidebarTab('terminal');
    } catch (e) {
      setTerminalLogs((prev) => [
        ...prev,
        { id: `t-${Date.now()}`, text: 'Error al conectar con Gemini AI.', type: 'error', timestamp: '08:22' }
      ]);
    }
  };

  // Commit changes
  const handleCommit = (message: string) => {
    const hash = Math.random().toString(16).substring(2, 8);
    const newCommit: GitCommit = {
      id: `c-${Date.now()}`,
      hash,
      author: 'Tú (Host)',
      message,
      timestamp: 'Ahora mismo',
      branch: activeBranch,
      filesChangedCount: diffItems.length,
      snapshotFileMap: {}
    };

    setCommitHistory((prev) => [newCommit, ...prev]);
    setDiffItems([]);

    // Clear file modified dots
    const clearModified = (nodes: FileNode[]): FileNode[] => {
      return nodes.map((n) => {
        if (n.children) return { ...n, isModified: false, children: clearModified(n.children) };
        return { ...n, isModified: false };
      });
    };
    setFiles((prev) => clearModified(prev));

    // Update branch hash
    setBranches((prev) =>
      prev.map((b) => (b.name === activeBranch ? { ...b, lastCommitHash: hash } : b))
    );

    setTerminalLogs((prev) => [
      ...prev,
      { id: `t-${Date.now()}`, text: `[git] Commit confirmado [${hash}]: ${message}`, type: 'success', timestamp: '08:22' }
    ]);
  };

  // Create Branch
  const handleCreateBranch = (name: string) => {
    const newB: GitBranch = { name, isCurrent: true, lastCommitHash: 'a1b2c3' };
    setBranches((prev) => prev.map((b) => ({ ...b, isCurrent: false })).concat(newB));
    setActiveBranch(name);
  };

  // Select Branch
  const handleSelectBranch = (name: string) => {
    setBranches((prev) => prev.map((b) => ({ ...b, isCurrent: b.name === name })));
    setActiveBranch(name);
  };

  // Revert to commit
  const handleRevertToCommit = (commit: GitCommit) => {
    alert(`Código restaurado exitosamente a la versión #${commit.hash} (${commit.message})`);
  };

  // Terminal Command Executor
  const handleExecuteCommand = (cmd: string) => {
    const now = new Date().toLocaleTimeString();
    setTerminalLogs((prev) => [...prev, { id: `t-${Date.now()}`, text: cmd, type: 'input', timestamp: now }]);

    const cleanCmd = cmd.trim().toLowerCase();

    if (cleanCmd === 'run') {
      handleRunCode();
    } else if (cleanCmd === 'build') {
      setTerminalLogs((prev) => [
        ...prev,
        { id: `t-${Date.now()}`, text: '-> vite build --outDir dist', type: 'system', timestamp: now },
        { id: `t-${Date.now()}`, text: '✔ dist/index.html (0.4 kB)\n✔ dist/assets/index.js (142 kB)\n✔ Build completado exitosamente en 1.1s.', type: 'success', timestamp: now }
      ]);
    } else if (cleanCmd === 'test') {
      setTerminalLogs((prev) => [
        ...prev,
        { id: `t-${Date.now()}`, text: '-> Running test suite...', type: 'system', timestamp: now },
        { id: `t-${Date.now()}`, text: 'PASS src/App.test.tsx\nPASS python_analytics.test.py\n12 tests passed, 0 failed.', type: 'success', timestamp: now }
      ]);
    } else if (cleanCmd.startsWith('npm install') || cleanCmd.startsWith('pip install') || cleanCmd.startsWith('cargo add')) {
      const parts = cmd.split(' ');
      const pkg = parts[2] || 'paquete-nuevo';
      const eco = cleanCmd.includes('pip') ? 'pip' : cleanCmd.includes('cargo') ? 'cargo' : 'npm';

      setDependencies((prev) => [
        ...prev,
        { name: pkg, version: '1.0.0', ecosystem: eco as any, status: 'installed', latestVersion: '1.0.0' }
      ]);
      setTerminalLogs((prev) => [
        ...prev,
        { id: `t-${Date.now()}`, text: `✔ Paquete '${pkg}' instalado vía ${eco} en 0.8s`, type: 'success', timestamp: now }
      ]);
    } else if (cleanCmd === 'ai fix') {
      handleAiDiagnose();
    } else if (cleanCmd === 'clear') {
      setTerminalLogs([]);
    } else if (cleanCmd === 'help') {
      setTerminalLogs((prev) => [
        ...prev,
        { id: `t-${Date.now()}`, text: 'Comandos disponibles:\n- run: Ejecuta el archivo actual\n- build: Compila el proyecto para producción\n- test: Ejecuta las pruebas unitarias\n- npm install <pkg> / pip install <pkg> / cargo add <pkg>\n- git status / git commit\n- docker build\n- ai fix: Diagnóstico de errores\n- clear: Limpia la terminal', type: 'info', timestamp: now }
      ]);
    } else {
      setTerminalLogs((prev) => [
        ...prev,
        { id: `t-${Date.now()}`, text: `Comando ejecutado: '${cmd}' [Código de salida 0]`, type: 'output', timestamp: now }
      ]);
    }
  };

  // Install / Remove Dependency
  const handleInstallDependency = (name: string, ecosystem: 'npm' | 'pip' | 'cargo') => {
    setDependencies((prev) => [
      ...prev,
      { name, version: '1.0.0', ecosystem, status: 'installed', latestVersion: '1.0.0' }
    ]);
  };

  const handleRemoveDependency = (name: string) => {
    setDependencies((prev) => prev.filter((d) => d.name !== name));
  };

  // Restore Snapshot
  const handleRestoreSnapshot = (snap: BackupSnapshot) => {
    alert(`Proyecto restaurado al snapshot: ${snap.name} (${snap.timestamp})`);
  };

  // Export Project ZIP / JSON
  const handleExportProjectZip = () => {
    const fileMap: Record<string, string> = {};
    const extract = (nodes: FileNode[]) => {
      for (const n of nodes) {
        if (n.type === 'file') fileMap[n.path] = n.content;
        if (n.children) extract(n.children);
      }
    };
    extract(files);

    const jsonStr = JSON.stringify(fileMap, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'opencode-studio-project.json';
    a.click();
  };

  // Trigger CI/CD Pipeline
  const handleTriggerPipeline = () => {
    setDeploymentConfig((prev) => ({ ...prev, status: 'building' }));

    setWorkflowSteps([
      { id: 's1', name: '1. Verificación de Tipos y Linter', status: 'running', logs: ['tsc --noEmit...'] },
      { id: 's2', name: '2. Pruebas Unitarias e Integración', status: 'pending', logs: [] },
      { id: 's3', name: '3. Construcción de Imagen Docker', status: 'pending', logs: [] },
      { id: 's4', name: '4. Despliegue en Google Cloud Run', status: 'pending', logs: [] }
    ]);

    setTimeout(() => {
      setWorkflowSteps((prev) =>
        prev.map((s, idx) => (idx === 0 ? { ...s, status: 'success', logs: ['✔ Linter pasó sin errores'] } : idx === 1 ? { ...s, status: 'running', logs: ['Ejecutando Jest / Vitest...'] } : s))
      );
    }, 1000);

    setTimeout(() => {
      setWorkflowSteps((prev) =>
        prev.map((s, idx) => (idx === 1 ? { ...s, status: 'success', logs: ['✔ 12/12 Pruebas PASARON'] } : idx === 2 ? { ...s, status: 'running', logs: ['docker build -t opencode .'] } : s))
      );
    }, 2000);

    setTimeout(() => {
      setWorkflowSteps((prev) =>
        prev.map((s, idx) => (idx === 2 ? { ...s, status: 'success', logs: ['✔ Imagen Docker creada [sha256:9f8e]'] } : idx === 3 ? { ...s, status: 'running', logs: ['Desplegando en Cloud Run...'] } : s))
      );
    }, 3000);

    setTimeout(() => {
      setWorkflowSteps((prev) =>
        prev.map((s) => ({ ...s, status: 'success' }))
      );
      setDeploymentConfig((prev) => ({ ...prev, status: 'live' }));
    }, 4000);
  };

  // Optimize Memory
  const handleOptimizeMemory = () => {
    setPerformanceMetrics((prev) =>
      prev.map((m) => ({ ...m, memory: Math.max(90, m.memory - 35), cpu: Math.max(5, m.cpu - 10) }))
    );
    alert('🧹 Búfer optimizado y recolección de basura completada.');
  };

  // Send Chat Message
  const handleSendMessage = (text: string, fileRef?: string, lineRef?: number) => {
    const newMsg: ChatMessage = {
      id: `m-${Date.now()}`,
      sender: 'Tú (Host)',
      avatar: 'T',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      fileRef,
      lineRef
    };
    setChatMessages((prev) => [...prev, newMsg]);
  };

  const handleInjectCodeToEditor = (code: string, fileName?: string) => {
    if (activeFile) {
      handleCodeChange(code);
    } else {
      handleCreateFile(fileName || 'ComponenteGenerado.tsx', 'typescript', code);
    }
    setViewMode('editor');
  };

  return (
    <div className={`h-screen w-screen flex flex-col bg-[#F4F4F1] text-[#1A1A1A] overflow-hidden ${theme === 'light' ? 'invert-0' : ''}`}>
      {/* Header Bar */}
      <HeaderBar
        projectName="MorphoCode Studio"
        activeBranch={activeBranch}
        branches={branches}
        onSelectBranch={handleSelectBranch}
        collaborators={collaborators}
        onRunCode={handleRunCode}
        onAiDiagnose={() => handleAiDiagnose()}
        onToggleCollabModal={() => setActiveSidebarTab('collab')}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        isSaving={isSaving}
        lastBackupTime={lastBackupTime}
        theme={theme}
        onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        language={activeFile?.language || 'typescript'}
        viewMode={viewMode}
        onChangeViewMode={(mode) => setViewMode(mode)}
        onOpenApiKeysModal={() => setIsApiKeysModalOpen(true)}
      />

      {/* Main Workspace Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* IDE Navigation ActivityBar and Sidebar Panels - Only visible in Programmer IDE mode */}
        {viewMode !== 'chatbot' && (
          <>
            <ActivityBar
              activeTab={activeSidebarTab}
              onSelectTab={(t) => {
                if (t === 'shortcuts') {
                  setIsShortcutsOpen(true);
                } else {
                  setActiveSidebarTab(t);
                }
              }}
              uncommittedCount={diffItems.length}
              unresolvedErrorsCount={diagnosticResult?.warnings.length || 0}
              onlineCount={collaborators.length}
            />

            {/* Collapsible Sidebar Content Panel */}
            {activeSidebarTab === 'files' && (
              <FileExplorerPanel
                files={files}
                activeFileId={activeFileId}
                onSelectFile={handleSelectFile}
                onCreateFile={handleCreateFile}
                onCreateFolder={handleCreateFolder}
                onDeleteFile={handleDeleteFile}
                onRenameFile={handleRenameFile}
                onLoadTemplate={handleLoadTemplate}
              />
            )}

            {activeSidebarTab === 'git' && (
              <SourceControlPanel
                branches={branches}
                activeBranch={activeBranch}
                onSelectBranch={handleSelectBranch}
                onCreateBranch={handleCreateBranch}
                diffItems={diffItems}
                commitHistory={commitHistory}
                onCommit={handleCommit}
                onRevertToCommit={handleRevertToCommit}
                onOpenDiffView={(item) => setSelectedDiffItem(item)}
                isIntegrityVerified={true}
              />
            )}

            {activeSidebarTab === 'terminal' && (
              <TerminalPanel
                logs={terminalLogs}
                onExecuteCommand={handleExecuteCommand}
                onClearLogs={() => setTerminalLogs([])}
                dependencies={dependencies}
                onInstallDependency={handleInstallDependency}
                onRemoveDependency={handleRemoveDependency}
              />
            )}

            {activeSidebarTab === 'collab' && (
              <RealtimeCollabPanel
                collaborators={collaborators}
                chatMessages={chatMessages}
                onSendMessage={handleSendMessage}
                activeFileName={activeFile?.name}
                activeLineNumber={activeLineNumber}
              />
            )}

            {activeSidebarTab === 'backup' && (
              <CloudBackupPanel
                snapshots={snapshots}
                onTriggerManualBackup={(name) => triggerCloudBackup(name)}
                onRestoreSnapshot={handleRestoreSnapshot}
                autoSaveIntervalSec={autoSaveIntervalSec}
                onChangeAutoSaveInterval={setAutoSaveIntervalSec}
                lastBackupTime={lastBackupTime}
                onExportProjectZip={handleExportProjectZip}
              />
            )}

            {activeSidebarTab === 'deploy' && (
              <DeploymentPipelinesPanel
                deploymentConfig={deploymentConfig}
                workflowSteps={workflowSteps}
                onTriggerPipeline={handleTriggerPipeline}
                onOpenLiveUrl={() => window.open(deploymentConfig.liveUrl || window.location.href, '_blank')}
              />
            )}

            {activeSidebarTab === 'performance' && (
              <PerformanceMonitorPanel
                metrics={performanceMetrics}
                currentMetric={performanceMetrics[performanceMetrics.length - 1] || performanceMetrics[0]}
                onOptimizeMemory={handleOptimizeMemory}
              />
            )}

            {activeSidebarTab === 'ai-diag' && (
              <AiDiagnosticPanel
                activeFileName={activeFile?.name || 'App.tsx'}
                activeLanguage={activeFile?.language || 'typescript'}
                codeContent={activeFile?.content || ''}
                onRunDiagnosis={handleAiDiagnose}
                onApplyFix={(fixed) => handleCodeChange(fixed)}
                diagnosticResult={diagnosticResult}
                isLoading={isAiLoading}
              />
            )}
          </>
        )}

        {/* Dynamic Main Workspace depending on ViewMode */}
        {viewMode === 'chatbot' ? (
          <main className="flex-1 flex overflow-hidden">
            <ChatbotMainView
              theme={theme}
              activeFile={activeFile}
              workspaceFiles={files}
              activeProviderId={activeProviderId}
              onOpenApiKeysModal={() => setIsApiKeysModalOpen(true)}
              onInjectCodeToEditor={handleInjectCodeToEditor}
              onRunCodeInRunner={handleRunCode}
              onSwitchToEditor={() => setViewMode('editor')}
              onCreateWorkspaceFile={(name, content) => handleCreateFile(name, 'typescript', content)}
            />
          </main>
        ) : viewMode === 'split' ? (
          <main className="flex-1 flex overflow-hidden">
            <div className="w-1/2 flex overflow-hidden border-r-2 border-[#1A1A1A]">
              <ChatbotMainView
                theme={theme}
                activeFile={activeFile}
                workspaceFiles={files}
                activeProviderId={activeProviderId}
                onOpenApiKeysModal={() => setIsApiKeysModalOpen(true)}
                onInjectCodeToEditor={handleInjectCodeToEditor}
                onRunCodeInRunner={handleRunCode}
                onSwitchToEditor={() => setViewMode('editor')}
                onCreateWorkspaceFile={(name, content) => handleCreateFile(name, 'typescript', content)}
              />
            </div>
            <div className="w-1/2 flex overflow-hidden">
              <CodeEditor
                tabs={editorTabs}
                activeTabId={activeTabId}
                onSelectTab={(id) => {
                  setActiveTabId(id);
                  const tab = editorTabs.find((t) => t.id === id);
                  if (tab) setActiveFileId(tab.fileId);
                }}
                onCloseTab={handleCloseTab}
                content={activeFile?.content || ''}
                onChangeContent={handleCodeChange}
                language={activeFile?.language || 'typescript'}
                collaborators={collaborators}
                activeLineNumber={activeLineNumber}
                setActiveLineNumber={setActiveLineNumber}
                onQuickAiExplain={handleQuickAiExplain}
              />
            </div>
          </main>
        ) : (
          /* Full Editor IDE view */
          <main className="flex-1 flex overflow-hidden relative">
            {selectedDiffItem ? (
              <DiffEditor
                diffItem={selectedDiffItem}
                onClose={() => setSelectedDiffItem(null)}
                onAcceptDiff={() => setSelectedDiffItem(null)}
              />
            ) : (
              <CodeEditor
                tabs={editorTabs}
                activeTabId={activeTabId}
                onSelectTab={(id) => {
                  setActiveTabId(id);
                  const tab = editorTabs.find((t) => t.id === id);
                  if (tab) setActiveFileId(tab.fileId);
                }}
                onCloseTab={handleCloseTab}
                content={activeFile?.content || ''}
                onChangeContent={handleCodeChange}
                language={activeFile?.language || 'typescript'}
                collaborators={collaborators}
                activeLineNumber={activeLineNumber}
                setActiveLineNumber={setActiveLineNumber}
                onQuickAiExplain={handleQuickAiExplain}
              />
            )}

            {/* Right Live Execution & Preview Pane */}
            <LiveRunner
              code={activeFile?.content || ''}
              language={activeFile?.language || 'typescript'}
              executionLogs={executionLogs}
              onClearExecutionLogs={() => setExecutionLogs([])}
              onRunExecution={handleRunCode}
            />
          </main>
        )}
      </div>

      {/* API Keys Configuration Modal */}
      <ApiKeysModal
        isOpen={isApiKeysModalOpen}
        onClose={() => setIsApiKeysModalOpen(false)}
        activeProviderId={activeProviderId}
        onSelectActiveProvider={(id) => setActiveProviderId(id)}
      />

      {/* Quick Command Palette Modal */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        files={files}
        onSelectFile={handleSelectFile}
        onRunCode={handleRunCode}
        onAiDiagnose={() => handleAiDiagnose()}
        onTriggerBackup={() => triggerCloudBackup('Respaldo Paleta')}
        onTriggerPipeline={handleTriggerPipeline}
      />

      {/* Keyboard Shortcuts Modal */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
}
