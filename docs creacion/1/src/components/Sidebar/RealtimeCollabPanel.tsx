import React, { useState } from 'react';
import { 
  Users, 
  MessageSquare, 
  Share2, 
  Copy, 
  Check, 
  Shield, 
  Send, 
  Circle,
  Eye,
  Edit3
} from 'lucide-react';
import { PeerUser, ChatMessage } from '../../types';

interface RealtimeCollabPanelProps {
  collaborators: PeerUser[];
  chatMessages: ChatMessage[];
  onSendMessage: (text: string, fileRef?: string, lineRef?: number) => void;
  activeFileName?: string;
  activeLineNumber?: number;
}

export const RealtimeCollabPanel: React.FC<RealtimeCollabPanelProps> = ({
  collaborators,
  chatMessages,
  onSendMessage,
  activeFileName,
  activeLineNumber
}) => {
  const [chatInput, setChatInput] = useState('');
  const [includeLineRef, setIncludeLineRef] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [permissionMode, setPermissionMode] = useState<'write' | 'read'>('write');

  const shareableUrl = `${window.location.origin}/?session=opencode-live-${Math.floor(Math.random()*8999+1000)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSendSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendMessage(
      chatInput.trim(),
      includeLineRef ? activeFileName : undefined,
      includeLineRef ? activeLineNumber : undefined
    );
    setChatInput('');
  };

  return (
    <div className="w-80 bg-white border-r border-[#1A1A1A] flex flex-col h-full text-[#1A1A1A] select-none font-sans">
      {/* Header */}
      <div className="p-4 border-b border-[#1A1A1A] flex items-center justify-between bg-[#F4F4F1]">
        <div>
          <h2 className="font-serif italic text-xl text-[#1A1A1A] leading-tight">Colaboración</h2>
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#1A1A1A]/50">En Tiempo Real</span>
        </div>
        <span className="text-[10px] bg-[#3B44FF] text-white px-2 py-0.5 font-bold uppercase tracking-wider font-mono">
          {collaborators.length} en vivo
        </span>
      </div>

      {/* Shareable Link Box */}
      <div className="p-3 border-b border-[#1A1A1A] bg-[#F4F4F1] space-y-2">
        <span className="text-xs font-bold text-[#1A1A1A] block">
          Enlace de Invitación
        </span>
        <div className="flex gap-1">
          <input
            type="text"
            readOnly
            value={shareableUrl}
            className="flex-1 bg-white border border-[#1A1A1A] text-[11px] px-2 py-1 text-[#1A1A1A] font-mono focus:outline-none truncate font-bold"
          />
          <button
            onClick={handleCopyLink}
            className="bg-[#1A1A1A] hover:bg-[#3B44FF] text-white p-1.5 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
            title="Copiar enlace de invitación"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-[#00FF00]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
        <div className="flex items-center justify-between text-[11px] text-[#1A1A1A] font-medium pt-1">
          <span>Permisos:</span>
          <select
            value={permissionMode}
            onChange={(e) => setPermissionMode(e.target.value as any)}
            className="bg-white border border-[#1A1A1A] text-[#1A1A1A] font-bold px-1.5 py-0.5 text-[11px]"
          >
            <option value="write">✏️ Edición en vivo</option>
            <option value="read">👁️ Solo lectura</option>
          </select>
        </div>
      </div>

      {/* Active Collaborators Presence */}
      <div className="p-3 border-b border-[#1A1A1A] bg-white space-y-1.5">
        <span className="text-[10px] uppercase font-bold text-[#1A1A1A]/50 tracking-wider block">
          Participantes Activos
        </span>
        {collaborators.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between p-2 bg-[#F4F4F1] border border-[#1A1A1A] text-xs"
          >
            <div className="flex items-center space-x-2">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                style={{ backgroundColor: user.color }}
              >
                {user.avatar}
              </div>
              <span className="font-bold text-[#1A1A1A]">{user.name}</span>
            </div>
            <div className="flex items-center space-x-1 text-[10px] font-bold text-[#1A1A1A]/70">
              <Circle className="w-2 h-2 fill-[#00AA00] text-[#00AA00]" />
              <span>{user.status === 'editing' ? 'Editando...' : 'En línea'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Team Chat & Line Comments */}
      <div className="flex-1 flex flex-col justify-between overflow-hidden p-3 bg-white">
        <span className="text-[10px] uppercase font-bold text-[#1A1A1A]/60 tracking-wider block mb-2 flex items-center justify-between">
          <span>Chat de Equipo</span>
          <MessageSquare className="w-3.5 h-3.5 text-[#3B44FF]" />
        </span>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1 select-text">
          {chatMessages.length === 0 ? (
            <div className="text-xs text-[#1A1A1A]/50 italic p-3 border-2 border-dashed border-[#1A1A1A] text-center">
              Aún no hay mensajes. Comienza a conversar con tu equipo.
            </div>
          ) : (
            chatMessages.map((msg) => (
              <div key={msg.id} className="p-2.5 bg-[#F4F4F1] border border-[#1A1A1A] text-xs space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-[#3B44FF]">{msg.sender}</span>
                  <span className="text-[#1A1A1A]/50 font-mono">{msg.timestamp}</span>
                </div>
                <p className="text-[#1A1A1A] font-medium">{msg.text}</p>
                {msg.fileRef && (
                  <div className="text-[10px] text-white font-mono bg-[#FF6321] px-1.5 py-0.5 font-bold inline-block">
                    📍 {msg.fileRef} {msg.lineRef ? `: L${msg.lineRef}` : ''}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Chat Input */}
        <form onSubmit={handleSendSubmit} className="mt-2 space-y-1.5">
          {activeFileName && (
            <label className="flex items-center space-x-1.5 text-[10px] text-[#1A1A1A] font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={includeLineRef}
                onChange={(e) => setIncludeLineRef(e.target.checked)}
                className="text-[#3B44FF]"
              />
              <span>Adjuntar referencia: {activeFileName} (L{activeLineNumber || 1})</span>
            </label>
          )}

          <div className="flex gap-1">
            <input
              type="text"
              placeholder="Escribe un mensaje..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 bg-[#F4F4F1] border border-[#1A1A1A] px-2 py-1 text-xs text-[#1A1A1A] font-medium focus:outline-none"
            />
            <button
              type="submit"
              className="bg-[#1A1A1A] hover:bg-[#3B44FF] text-white p-2 shrink-0 cursor-pointer transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
