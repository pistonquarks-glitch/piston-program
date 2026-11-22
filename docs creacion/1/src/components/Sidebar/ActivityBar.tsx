import React from 'react';
import {
  FolderTree,
  GitBranch,
  Terminal,
  Users,
  CloudUpload,
  Workflow,
  Activity,
  Sparkles,
  Keyboard
} from 'lucide-react';

export type SidebarTab =
  | 'files'
  | 'git'
  | 'terminal'
  | 'collab'
  | 'backup'
  | 'deploy'
  | 'performance'
  | 'ai-diag'
  | 'shortcuts';

interface ActivityBarProps {
  activeTab: SidebarTab;
  onSelectTab: (tab: SidebarTab) => void;
  uncommittedCount: number;
  unresolvedErrorsCount: number;
  onlineCount: number;
}

export const ActivityBar: React.FC<ActivityBarProps> = ({
  activeTab,
  onSelectTab,
  uncommittedCount,
  unresolvedErrorsCount,
  onlineCount
}) => {
  const navItems = [
    {
      id: 'files' as SidebarTab,
      label: 'Explorador de Archivos',
      icon: FolderTree,
      badge: null
    },
    {
      id: 'git' as SidebarTab,
      label: 'Control de Versiones (Git)',
      icon: GitBranch,
      badge: uncommittedCount > 0 ? uncommittedCount : null,
      badgeColor: 'bg-[#FF6321]'
    },
    {
      id: 'terminal' as SidebarTab,
      label: 'Terminal e Integración',
      icon: Terminal,
      badge: null
    },
    {
      id: 'collab' as SidebarTab,
      label: 'Colaboración en Tiempo Real',
      icon: Users,
      badge: onlineCount,
      badgeColor: 'bg-[#3B44FF]'
    },
    {
      id: 'backup' as SidebarTab,
      label: 'Respaldo Automático Cloud',
      icon: CloudUpload,
      badge: null
    },
    {
      id: 'deploy' as SidebarTab,
      label: 'Contenedores y CI/CD',
      icon: Workflow,
      badge: null
    },
    {
      id: 'performance' as SidebarTab,
      label: 'Monitoreo de Rendimiento',
      icon: Activity,
      badge: null
    },
    {
      id: 'ai-diag' as SidebarTab,
      label: 'Diagnóstico IA Predictivo',
      icon: Sparkles,
      badge: unresolvedErrorsCount > 0 ? unresolvedErrorsCount : null,
      badgeColor: 'bg-[#3B44FF]'
    }
  ];

  return (
    <aside className="w-13 bg-[#1A1A1A] text-white border-r border-[#1A1A1A] flex flex-col justify-between items-center py-3 select-none z-10 shrink-0 font-sans">
      <div className="flex flex-col space-y-2 w-full items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`relative p-2.5 transition-all cursor-pointer group ${
                isActive
                  ? 'bg-white text-[#3B44FF]'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
              title={item.label}
            >
              <Icon className="w-5 h-5" />
              {isActive && (
                <span className="absolute left-0 top-0 bottom-0 w-1 bg-[#3B44FF]" />
              )}
              {item.badge !== null && item.badge !== undefined && (
                <span
                  className={`absolute -top-1 -right-1 ${
                    item.badgeColor || 'bg-[#3B44FF]'
                  } text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-[#1A1A1A]`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col space-y-1 w-full items-center pb-1">
        <button
          onClick={() => onSelectTab('shortcuts')}
          className={`p-2.5 transition-all cursor-pointer ${
            activeTab === 'shortcuts'
              ? 'bg-white text-[#3B44FF]'
              : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
          title="Atajos de Teclado & Ayuda"
        >
          <Keyboard className="w-5 h-5" />
        </button>
      </div>
    </aside>
  );
};
