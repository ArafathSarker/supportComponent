import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  Paperclip, 
  CheckCircle, 
  RotateCcw, 
  Clock, 
  Download, 
  ShieldAlert,
  Star,
  MessageSquare,
  Info,
  Edit3,
  Flame,
  MapPin,
  Cpu,
  Check
} from 'lucide-react';
import type { Ticket, TicketMessage, CurrentUser, TicketStatus } from './types';
import { api } from './api';
import { EditTicketModal } from './EditTicketModal';

interface TicketLiveChatDrawerProps {
  ticketId: string | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: CurrentUser;
  onTicketUpdated: (updatedTicket: Ticket) => void;
}

export const TicketLiveChatDrawer: React.FC<TicketLiveChatDrawerProps> = ({
  ticketId,
  isOpen,
  onClose,
  currentUser,
  onTicketUpdated
}) => {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [satisfaction, setSatisfaction] = useState(5);
  const [closeNotes, setCloseNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [mobileDrawerTab, setMobileDrawerTab] = useState<'chat' | 'details'>('chat');

  const socketRef = useRef<WebSocket | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimerRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen || !ticketId) return;

    let isMounted = true;

    api.getTicketDetail(ticketId)
      .then((data) => {
        if (isMounted) {
          setTicket(data);
          setMessages(data.messages || []);
        }
      })
      .catch((err) => {
        console.error('Failed to load ticket details:', err);
      });

    // WebSocket connection
    const wsUrl = api.getWebSocketTicketUrl(ticketId);
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const eventType = payload.type || payload.event;

        if (eventType === 'chat_message' || eventType === 'new_message') {
          const newMsg: TicketMessage = payload.data || payload.message || payload;
          if (newMsg && newMsg.id) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          }
        } else if (eventType === 'status_updated' || eventType === 'ticket_status_updated') {
          const newStatus = (payload.status || (payload.data && payload.data.status)) as TicketStatus;
          if (newStatus) {
            setTicket((prev) => {
              if (!prev) return null;
              const updated = { ...prev, status: newStatus };
              onTicketUpdated(updated);
              return updated;
            });
          }
        } else if (eventType === 'ticket_updated') {
          const t = payload.data || payload;
          setTicket((prev) => {
            if (!prev) return null;
            const updated: Ticket = {
              ...prev,
              title: t.title ?? prev.title,
              affected_system: t.affected_system ?? prev.affected_system,
              category: t.category ?? prev.category,
              urgency: t.urgency ?? prev.urgency,
              description: t.description ?? prev.description,
              status: (t.status ?? prev.status) as TicketStatus,
              updated_at: t.updated_at ?? prev.updated_at
            };
            onTicketUpdated(updated);
            return updated;
          });
        } else if (eventType === 'ticket_closed') {
          setTicket((prev) => {
            if (!prev) return null;
            const updated = { ...prev, status: 'Closed' as TicketStatus };
            onTicketUpdated(updated);
            return updated;
          });
        } else if (eventType === 'ticket_reopened') {
          setTicket((prev) => {
            if (!prev) return null;
            const updated = { ...prev, status: 'Open' as TicketStatus };
            onTicketUpdated(updated);
            return updated;
          });
        } else if (eventType === 'typing') {
          if (payload.sender_name !== currentUser.name && payload.is_typing) {
            setTypingUser(payload.sender_name);
            clearTimeout(typingTimerRef.current);
            typingTimerRef.current = setTimeout(() => {
              setTypingUser(null);
            }, 3000);
          } else {
            setTypingUser(null);
          }
        }
      } catch (e) {
        console.error('WS Parse Error:', e);
      }
    };

    ws.onclose = () => {
      setWsConnected(false);
    };

    return () => {
      isMounted = false;
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [isOpen, ticketId, currentUser.name]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, typingUser, mobileDrawerTab]);

  if (!isOpen || !ticket) return null;

  const handleSendMessage = async () => {
    const text = inputText.trim();
    if (!text && !socketRef.current) return;

    const payload = {
      type: 'chat_message',
      sender_name: currentUser.name,
      sender_role: currentUser.role,
      message: text
    };

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(payload));
    } else {
      try {
        const created = await api.sendMessage(ticket.id, {
          sender_name: currentUser.name,
          sender_role: currentUser.role,
          message: text
        });
        setMessages((prev) => {
          if (prev.some((m) => m.id === created.id)) return prev;
          return [...prev, created];
        });
      } catch (err) {
        console.error('Failed to send message via HTTP fallback:', err);
      }
    }

    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTyping = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'typing',
        sender_name: currentUser.name,
        is_typing: true
      }));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !ticket) return;

    try {
      const uploadRes = await api.uploadFile(file, ticket.id, currentUser.name);
      const payload = {
        type: 'chat_message',
        sender_name: currentUser.name,
        sender_role: currentUser.role,
        message: `Attached: ${uploadRes.filename}`,
        attachment_url: uploadRes.url,
        attachment_name: uploadRes.filename
      };

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify(payload));
      } else {
        await api.sendMessage(ticket.id, payload);
      }
    } catch (err) {
      alert('Failed to upload file');
    }
  };

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!ticket) return;
    try {
      setUpdatingStatus(true);
      await api.updateTicketStatus(
        ticket.id,
        newStatus,
        currentUser.role,
        currentUser.name,
        `Status updated to ${newStatus}`
      );
      setTicket((prev) => prev ? { ...prev, status: newStatus } : null);
      onTicketUpdated({ ...ticket, status: newStatus });
    } catch (err: any) {
      alert(err.message || 'Status update failed');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!ticket) return;
    try {
      await api.closeTicket(
        ticket.id,
        currentUser.name,
        currentUser.role,
        satisfaction,
        closeNotes
      );
      setTicket((prev) => prev ? { ...prev, status: 'Closed' } : null);
      onTicketUpdated({ ...ticket, status: 'Closed' });
      setShowCloseModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed to close ticket');
    }
  };

  const handleReopenTicket = async () => {
    if (!ticket) return;
    try {
      await api.reopenTicket(ticket.id, currentUser.name, currentUser.role);
      setTicket((prev) => prev ? { ...prev, status: 'Open' } : null);
      onTicketUpdated({ ...ticket, status: 'Open' });
    } catch (err: any) {
      alert(err.message || 'Failed to reopen ticket');
    }
  };

  const isCompanyAdmin = currentUser.role === 'company_admin';
  const isSuperAdmin = currentUser.role === 'super_admin';

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
      <div 
        className="w-full max-w-4xl bg-[#0f172a] border-l border-[#1f293d] h-full flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="px-4 sm:px-6 py-3.5 bg-[#111827] border-b border-[#1f293d] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <span className="font-mono text-xs sm:text-sm font-bold text-blue-400">
              {ticket.ticket_code}
            </span>

            {/* Status Badge */}
            <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium border ${
              ticket.status === 'Closed'
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : ticket.status === 'In Progress'
                ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
                : ticket.status === 'Under Review'
                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                : 'bg-blue-500/15 text-blue-400 border-blue-500/30'
            }`}>
              {ticket.status}
            </span>

            {/* Urgency Badge */}
            <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium border hidden xs:inline-flex ${
              ticket.urgency === 'Critical'
                ? 'bg-red-500/20 text-red-400 border-red-500/35 font-semibold'
                : ticket.urgency === 'High'
                ? 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                : ticket.urgency === 'Medium'
                ? 'bg-amber-500/15 text-amber-400 border-amber-500/25'
                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
            }`}>
              {ticket.urgency}
            </span>

            {/* Live WebSocket Beacon */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
              <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'}`} />
              <span className="hidden sm:inline">{wsConnected ? 'Live Chat Online' : 'Connecting...'}</span>
              <span className="sm:hidden">{wsConnected ? 'Live' : '...'}</span>
            </div>
          </div>

          <button 
            type="button" 
            className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </div>

        {/* Mobile Tab Switcher (< md screens): Switch between Live Chat & Ticket Details */}
        <div className="flex md:hidden border-b border-[#1f293d] bg-[#0d1424] shrink-0">
          <button
            type="button"
            onClick={() => setMobileDrawerTab('chat')}
            className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
              mobileDrawerTab === 'chat'
                ? 'text-blue-400 border-blue-500 bg-blue-500/10'
                : 'text-gray-400 border-transparent hover:text-gray-200'
            }`}
          >
            <MessageSquare size={14} />
            <span>Live Chat</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileDrawerTab('details')}
            className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
              mobileDrawerTab === 'details'
                ? 'text-blue-400 border-blue-500 bg-blue-500/10'
                : 'text-gray-400 border-transparent hover:text-gray-200'
            }`}
          >
            <Info size={14} />
            <span>Details & Actions</span>
          </button>
        </div>

        {/* Drawer Layout: Split Screen on Desktop (md:), Tabbed on Mobile */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          {/* Left Side: Ticket Metadata & Permission Controls (5 Cols on Desktop) */}
          <div className={`md:col-span-5 bg-[#0d1424] border-r border-[#1f293d] p-4 sm:p-5 overflow-y-auto space-y-4 ${
            mobileDrawerTab === 'details' ? 'block' : 'hidden md:block'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                  Problem Title
                </span>
                {isCompanyAdmin && (
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                    className="inline-flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 font-medium px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all"
                    title="Edit ticket specifications"
                  >
                    <Edit3 size={11} />
                    <span>Edit</span>
                  </button>
                )}
              </div>
              <h4 className="text-sm font-semibold text-white">
                {ticket.title}
              </h4>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                Affected IoT Solution
              </span>
              <span className="text-sm text-blue-400 font-medium">
                {ticket.affected_system}
              </span>
            </div>

            {/* Category & Priority */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                  Category
                </span>
                <span className="text-xs text-gray-200 bg-gray-800/80 px-2 py-1 rounded-md inline-block truncate max-w-full">
                  {ticket.category}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                  Priority / Impact
                </span>
                <span className={`text-xs px-2 py-1 rounded-md font-semibold inline-flex items-center gap-1 border ${
                  ticket.priority?.includes('Critical') || ticket.urgency === 'Critical'
                    ? 'bg-red-500/20 text-red-300 border-red-500/40'
                    : ticket.priority === 'High' || ticket.urgency === 'High'
                    ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                    : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                }`}>
                  <Flame size={12} />
                  <span>{ticket.priority || ticket.urgency}</span>
                </span>
              </div>
            </div>

            {/* Garments Floor & Machine Location */}
            {(ticket.line_number || ticket.floor_location || ticket.machine_id) && (
              <div className="p-2.5 bg-[#0b1120] border border-[#1f293d] rounded-xl space-y-1.5 text-xs">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <MapPin size={11} className="text-blue-400" />
                  <span>Factory Machine Location</span>
                </span>
                <div className="space-y-0.5 text-gray-300">
                  {ticket.line_number && <div><span className="text-gray-500">Line:</span> {ticket.line_number}</div>}
                  {ticket.floor_location && <div><span className="text-gray-500">Floor:</span> {ticket.floor_location}</div>}
                  {ticket.machine_id && <div><span className="text-gray-500">Machine Tag:</span> <span className="font-mono text-blue-400">{ticket.machine_id}</span></div>}
                  {ticket.production_impact && <div><span className="text-gray-500">Impact:</span> <span className="text-amber-400">{ticket.production_impact}</span></div>}
                </div>
              </div>
            )}

            {/* Dynamic IoT Telemetry Parameters */}
            {ticket.iot_details && Object.keys(ticket.iot_details).length > 0 && (
              <div className="p-2.5 bg-[#0b1424] border border-blue-900/30 rounded-xl space-y-2 text-xs">
                <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1">
                  <Cpu size={12} className="text-blue-400" />
                  <span>Dynamic IoT Parameters</span>
                </span>
                <div className="space-y-1">
                  {Object.entries(ticket.iot_details).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between gap-2 border-b border-blue-900/20 pb-1 text-[11px]">
                      <span className="text-gray-400 capitalize">{k.replace(/_/g, ' ')}:</span>
                      <span className="text-blue-200 font-mono font-medium truncate max-w-[150px]">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Verified Pre-Troubleshooting Checklist */}
            {ticket.troubleshooting_checklist && ticket.troubleshooting_checklist.length > 0 && (
              <div className="p-2.5 bg-[#101b2b] border border-indigo-900/30 rounded-xl space-y-1.5 text-xs">
                <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1">
                  <Check size={12} className="text-emerald-400" />
                  <span>Pre-Checklist Verified ({ticket.troubleshooting_checklist.length})</span>
                </span>
                <ul className="space-y-1 text-[11px] text-gray-300">
                  {ticket.troubleshooting_checklist.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-0.5">
                  Reported By
                </span>
                <span className="text-gray-300 truncate block">
                  {ticket.created_by_name}
                </span>
                <span className="text-gray-500 text-[11px]">
                  ({ticket.company_name})
                </span>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-0.5">
                  Created At
                </span>
                <span className="text-gray-400">
                  {new Date(ticket.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                Problem Description
              </span>
              <div className="p-3 bg-[#0b1120] border border-[#1f293d] rounded-lg text-xs leading-relaxed text-gray-200 whitespace-pre-wrap max-h-48 overflow-y-auto">
                {ticket.description}
              </div>
            </div>

            {/* Evidence Attachments */}
            {ticket.attachments && ticket.attachments.length > 0 && (
              <div>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-2">
                  Evidence Attachments ({ticket.attachments.length})
                </span>
                <div className="space-y-1.5">
                  {ticket.attachments.map((att) => (
                    <a
                      key={att.id}
                      href={att.file_path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2 bg-[#0b1120] border border-[#1f293d] rounded-lg text-xs text-blue-400 hover:text-blue-300 hover:border-blue-500/50 transition-colors"
                    >
                      <span className="truncate max-w-[180px]">{att.file_name}</span>
                      <Download size={13} />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Role Action & Rules Box */}
            <div className="pt-4 border-t border-[#1f293d] space-y-3">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                Workflow Actions & Rules
              </span>

              {/* Company Admin View */}
              {isCompanyAdmin && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                    className="w-full py-2.5 px-4 rounded-lg text-xs font-semibold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all flex items-center justify-center gap-2"
                  >
                    <Edit3 size={14} />
                    Edit Ticket Details
                  </button>

                  {ticket.status !== 'Closed' ? (
                    <button
                      type="button"
                      onClick={() => setShowCloseModal(true)}
                      className="w-full py-2.5 px-4 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2 shadow-lg"
                    >
                      <CheckCircle size={15} />
                      Close Ticket (Issue Resolved)
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleReopenTicket}
                      className="w-full py-2.5 px-4 rounded-lg text-xs font-semibold text-gray-200 bg-gray-800 hover:bg-gray-700 border border-[#1f293d] transition-colors flex items-center justify-center gap-2"
                    >
                      <RotateCcw size={15} />
                      Reopen Ticket
                    </button>
                  )}
                  <p className="text-[11px] text-gray-400 leading-tight">
                    * Company Owner Rule: Only you can close this ticket once satisfied, or edit specifications at any time.
                  </p>
                </div>
              )}

              {/* Super Admin View */}
              {isSuperAdmin && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-300">Set Ticket Status:</label>
                    <select
                      value={ticket.status}
                      onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
                      disabled={ticket.status === 'Closed' || updatingStatus}
                      className="w-full bg-[#0b1120] border border-[#1f293d] text-gray-100 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="Open">Open</option>
                      <option value="Under Review">Under Review</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Pending Customer Close">Pending Customer Close</option>
                      <option value="Closed" disabled>
                        Closed (Consumer/Owner Only)
                      </option>
                    </select>
                  </div>

                  <div className="p-2.5 bg-red-500/10 border border-red-500/25 rounded-lg text-[11px] text-red-300 flex items-start gap-2">
                    <ShieldAlert size={15} className="text-red-400 shrink-0 mt-0.5" />
                    <span>
                      Super Admin cannot close this ticket until the company owner verifies resolution.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Real-Time WebSocket Live Chat (7 Cols on Desktop) */}
          <div className={`md:col-span-7 bg-[#0b0f19] flex flex-col h-full overflow-hidden ${
            mobileDrawerTab === 'chat' ? 'flex' : 'hidden md:flex'
          }`}>
            {/* Chat Thread */}
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-3.5" ref={chatScrollRef}>
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 text-xs space-y-2 py-12">
                  <Clock size={28} />
                  <span>No chat messages yet. Type below to start live support.</span>
                </div>
              )}

              {messages.map((msg) => {
                if (msg.is_system_event) {
                  return (
                    <div key={msg.id} className="flex justify-center">
                      <span className="px-3 py-1 rounded-full bg-gray-800/80 border border-[#1f293d] text-[10px] sm:text-[11px] text-gray-400 text-center max-w-sm">
                        {msg.message}
                      </span>
                    </div>
                  );
                }

                const isMine = msg.sender_name === currentUser.name;
                const isSuper = msg.sender_role === 'super_admin';

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col max-w-[85%] sm:max-w-[80%] space-y-1 ${
                      isMine ? 'ml-auto items-end' : 'mr-auto items-start'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                      <span className="truncate max-w-[120px]">{msg.sender_name}</span>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] ${
                        isSuper ? 'bg-amber-500/15 text-amber-300' : 'bg-blue-500/15 text-blue-300'
                      }`}>
                        {isSuper ? 'Super Admin' : 'Company Admin'}
                      </span>
                    </div>

                    <div
                      className={`px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl text-xs leading-relaxed break-words shadow-sm ${
                        isMine
                          ? 'bg-blue-600 text-white rounded-br-none'
                          : 'bg-[#1e293b] text-gray-100 border border-[#1f293d] rounded-bl-none'
                      }`}
                    >
                      {msg.message}

                      {msg.attachment_url && (
                        <div className="mt-2 pt-2 border-t border-white/20">
                          <a
                            href={msg.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-blue-200 underline"
                          >
                            <Paperclip size={12} />
                            {msg.attachment_name || 'Download Attachment'}
                          </a>
                        </div>
                      )}
                    </div>

                    <span className="text-[10px] text-gray-500">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}

              {typingUser && (
                <div className="text-xs italic text-gray-500 animate-pulse">
                  {typingUser} is typing...
                </div>
              )}
            </div>

            {/* Chat Input Toolbar */}
            <div className="p-2.5 sm:p-4 bg-[#111827] border-t border-[#1f293d] flex items-end gap-2 shrink-0">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Attach evidence file"
                className="p-2 sm:p-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-[#1f293d] transition-colors shrink-0"
              >
                <Paperclip size={16} />
              </button>

              <textarea
                rows={1}
                placeholder="Type your message..."
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  handleTyping();
                }}
                onKeyDown={handleKeyDown}
                disabled={ticket.status === 'Closed'}
                className="flex-1 bg-[#0b1120] border border-[#1f293d] text-gray-100 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-blue-500 resize-none max-h-24 disabled:opacity-50"
              />

              <button
                type="button"
                onClick={handleSendMessage}
                disabled={ticket.status === 'Closed' || !inputText.trim()}
                title="Send message"
                className="p-2 sm:p-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-md transition-colors disabled:opacity-40 shrink-0"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Close Ticket Confirmation Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowCloseModal(false)}>
          <div className="bg-[#111827] border border-[#1f293d] rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#1f293d] pb-3">
              <h3 className="text-sm font-semibold text-white">
                Confirm Resolution & Close Ticket
              </h3>
              <button onClick={() => setShowCloseModal(false)} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              Are you satisfied that the issue regarding <strong>{ticket.affected_system}</strong> has been resolved by the solution provider?
            </p>

            <div className="space-y-1.5">
              <label className="text-xs text-gray-300">Rate Service Quality:</label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setSatisfaction(star)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      size={22}
                      className={star <= satisfaction ? 'text-amber-400 fill-amber-400' : 'text-gray-600'}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-gray-300">Closing Remarks (Optional):</label>
              <textarea
                rows={2}
                placeholder="Remarks on resolution..."
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                className="w-full bg-[#0b1120] border border-[#1f293d] text-gray-100 rounded-lg p-2.5 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#1f293d]">
              <button
                type="button"
                onClick={() => setShowCloseModal(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs text-gray-300 bg-gray-800 hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCloseTicket}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md"
              >
                Confirm & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Ticket Modal for Company Owner */}
      <EditTicketModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        ticket={ticket}
        currentUser={currentUser}
        onTicketUpdated={(updated) => {
          setTicket(updated);
          onTicketUpdated(updated);
          setIsEditModalOpen(false);
        }}
      />
    </div>
  );
};
