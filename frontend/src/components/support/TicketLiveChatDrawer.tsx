import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  Paperclip, 
  CheckCircle, 
  CheckCircle2,
  RotateCcw, 
  Clock, 
  Download, 
  Star,
  MessageSquare,
  Info,
  Edit3,
  Flame,
  MapPin,
  Cpu,
  Check,
  Image as ImageIcon,
  Video,
  FileText,
  Maximize2,
  Eye,
  Loader2,
  Tag,
  ListChecks,
  Save,
  Shield,
  Wrench,
  AlertTriangle
} from 'lucide-react';
import type { Ticket, TicketMessage, CurrentUser, TicketStatus } from './types';
import { api } from './api';
import { EditTicketModal } from './EditTicketModal';

const isImageFile = (filename: string = '', fileType?: string) => {
  if (fileType?.startsWith('image/')) return true;
  return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(filename);
};

const isVideoFile = (filename: string = '', fileType?: string) => {
  if (fileType?.startsWith('video/')) return true;
  return /\.(mp4|webm|mov|mkv|ogg)$/i.test(filename);
};

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
  
  // View Switcher: Client / Requester View vs Support Workspace
  const [activeViewTab, setActiveViewTab] = useState<'requester' | 'workspace'>(() => {
    return currentUser.role === 'super_admin' ? 'workspace' : 'requester';
  });

  // Support Engineer Workspace states
  const [workspaceSeverity, setWorkspaceSeverity] = useState('');
  const [workspaceEngineer, setWorkspaceEngineer] = useState('');
  const [workspaceOccurrence, setWorkspaceOccurrence] = useState('');
  const [workspacePossibility, setWorkspacePossibility] = useState('');
  const [workspaceRootCause, setWorkspaceRootCause] = useState('');
  const [workspaceSupportNote, setWorkspaceSupportNote] = useState('');
  const [savingWorkspace, setSavingWorkspace] = useState(false);
  const [workspaceSuccessMsg, setWorkspaceSuccessMsg] = useState<string | null>(null);

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingFilePreview, setPendingFilePreview] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [activeLightboxImage, setActiveLightboxImage] = useState<{ url: string; title: string } | null>(null);

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
        } else if (eventType === 'typing') {
          if (payload.sender_name && payload.sender_name !== currentUser.name) {
            setTypingUser(payload.sender_name);
            clearTimeout(typingTimerRef.current);
            typingTimerRef.current = setTimeout(() => {
              setTypingUser(null);
            }, 2500);
          }
        }
      } catch (err) {
        console.error('Failed to process WebSocket message:', err);
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

  // Synchronize workspace form fields when ticket updates
  useEffect(() => {
    if (ticket) {
      setWorkspaceSeverity(ticket.support_severity || '');
      setWorkspaceEngineer(ticket.assigned_engineer || '');
      setWorkspaceOccurrence(ticket.occurrence || '');
      setWorkspacePossibility(ticket.future_possibility || '');
      setWorkspaceRootCause(ticket.root_cause || '');
      setWorkspaceSupportNote(ticket.support_note || '');
    }
  }, [ticket]);

  const handleSaveWorkspace = async () => {
    if (!ticket) return;
    try {
      setSavingWorkspace(true);
      setWorkspaceSuccessMsg(null);
      const updated = await api.saveTicketWorkspace(
        ticket.id,
        {
          support_severity: workspaceSeverity,
          assigned_engineer: workspaceEngineer,
          occurrence: workspaceOccurrence,
          future_possibility: workspacePossibility,
          root_cause: workspaceRootCause,
          support_note: workspaceSupportNote,
        },
        currentUser.name,
        currentUser.role
      );
      setTicket(updated);
      onTicketUpdated(updated);
      setWorkspaceSuccessMsg('Support Workspace saved successfully!');
      setTimeout(() => setWorkspaceSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save support workspace');
    } finally {
      setSavingWorkspace(false);
    }
  };

  if (!isOpen || !ticket) return null;

  // Staged chat file sending: ONLY uploads when clicking Send, with source='chat'
  const handleSendMessage = async () => {
    const text = inputText.trim();
    if (!text && !pendingFile) return;
    if (uploadingFile || !ticket) return;

    let attachmentUrl: string | undefined = undefined;
    let attachmentName: string | undefined = undefined;

    if (pendingFile) {
      try {
        setUploadingFile(true);
        // Mark explicitly as 'chat' so backend does NOT add it to ticket creation attachments!
        const uploadRes = await api.uploadFile(pendingFile, ticket.id, currentUser.name, 'chat');
        attachmentUrl = uploadRes.url;
        attachmentName = uploadRes.filename || pendingFile.name;
      } catch (err: any) {
        alert(err.message || 'Failed to upload attachment file.');
        setUploadingFile(false);
        return;
      } finally {
        setUploadingFile(false);
      }
    }

    const payload = {
      type: 'chat_message',
      sender_name: currentUser.name,
      sender_role: currentUser.role,
      message: text || (attachmentName ? `Attached file: ${attachmentName}` : ''),
      ...(attachmentUrl ? { attachment_url: attachmentUrl, attachment_name: attachmentName } : {})
    };

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(payload));
    } else {
      try {
        const created = await api.sendMessage(ticket.id, {
          sender_name: currentUser.name,
          sender_role: currentUser.role,
          message: payload.message,
          attachment_url: payload.attachment_url,
          attachment_name: payload.attachment_name
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
    handleRemovePendingFile();
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPendingFile(file);
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPendingFilePreview(url);
    } else {
      setPendingFilePreview(null);
    }
    e.target.value = '';
  };

  const handleRemovePendingFile = () => {
    if (pendingFilePreview) {
      URL.revokeObjectURL(pendingFilePreview);
    }
    setPendingFile(null);
    setPendingFilePreview(null);
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

  // Rule: On the left side, ONLY show media sent directly at the time of ticket creation!
  const initialEvidenceAttachments = (ticket.attachments || []).filter(
    (att) => att.source !== 'chat'
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
      <div 
        className="w-full max-w-4xl bg-white border-l border-slate-200 h-full flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <span className="font-mono text-xs sm:text-sm font-bold text-blue-600">
              {ticket.ticket_code}
            </span>

            {/* Status Badge */}
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold border ${
              ticket.status === 'Closed'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : ticket.status === 'In Progress'
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : ticket.status === 'Under Review'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-blue-50 text-blue-700 border-blue-200'
            }`}>
              {ticket.status}
            </span>

            {/* Urgency Badge */}
            <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold border hidden xs:inline-flex ${
              ticket.urgency === 'Critical'
                ? 'bg-red-50 text-red-700 border-red-200'
                : ticket.urgency === 'High'
                ? 'bg-orange-50 text-orange-700 border-orange-200'
                : ticket.urgency === 'Medium'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              {ticket.urgency}
            </span>

            {/* Live WebSocket Beacon */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-emerald-50 border border-emerald-200 text-emerald-700">
              <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              <span className="hidden sm:inline">{wsConnected ? 'Live Chat Online' : 'Connecting...'}</span>
              <span className="sm:hidden">{wsConnected ? 'Live' : '...'}</span>
            </div>
          </div>

          {/* Right Header Controls: Tab Switcher (Client / Requester View vs Support Workspace) + Close */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {isSuperAdmin && (
              <div className="inline-flex p-1 bg-slate-200/80 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveViewTab('requester')}
                  className={`px-2.5 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs transition-all ${
                    activeViewTab === 'requester'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Client / Requester View
                </button>
                <button
                  type="button"
                  onClick={() => setActiveViewTab('workspace')}
                  className={`px-2.5 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs transition-all ${
                    activeViewTab === 'workspace'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Support Workspace
                </button>
              </div>
            )}

            <button 
              type="button" 
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors"
              onClick={onClose}
              aria-label="Close drawer"
            >
              <X size={19} />
            </button>
          </div>
        </div>

        {/* Mobile Tab Switcher */}
        <div className="flex md:hidden border-b border-slate-200 bg-slate-100 shrink-0">
          <button
            type="button"
            onClick={() => setMobileDrawerTab('chat')}
            className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
              mobileDrawerTab === 'chat'
                ? 'text-blue-600 border-blue-600 bg-white'
                : 'text-slate-500 border-transparent hover:text-slate-800'
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
                ? 'text-blue-600 border-blue-600 bg-white'
                : 'text-slate-500 border-transparent hover:text-slate-800'
            }`}
          >
            <Info size={14} />
            <span>{isSuperAdmin && activeViewTab === 'workspace' ? 'Workspace' : 'Details & Evidence'}</span>
          </button>
        </div>

        {/* Drawer Layout: Split Screen on Desktop (md:), Tabbed on Mobile */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          {/* Left Side: Ticket Metadata & Creation Evidence (5 Cols on Desktop) */}
          <div className={`md:col-span-5 bg-slate-50/70 border-r border-slate-200 p-4 sm:p-5 overflow-y-auto space-y-4 ${
            mobileDrawerTab === 'details' ? 'block' : 'hidden md:block'
          }`}>
            {isSuperAdmin && activeViewTab === 'workspace' ? (
              <div className="space-y-4">
                {workspaceSuccessMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span>{workspaceSuccessMsg}</span>
                  </div>
                )}

                {/* Severity Dropdown */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                    <AlertTriangle size={13} className="text-amber-500" />
                    <span>Support Severity</span>
                  </label>
                  <select
                    value={workspaceSeverity}
                    onChange={(e) => setWorkspaceSeverity(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-xs"
                  >
                    <option value="">Select</option>
                    <option value="Critical Outage">Critical Outage</option>
                    <option value="High Impact">High Impact</option>
                    <option value="Medium Degraded">Medium Degraded</option>
                    <option value="Low / Minor">Low / Minor</option>
                  </select>
                </div>

                {/* Assigned Engineer */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                    <Shield size={13} className="text-blue-500" />
                    <span>Assigned Engineer</span>
                  </label>
                  <input
                    type="text"
                    value={workspaceEngineer}
                    onChange={(e) => setWorkspaceEngineer(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-xs"
                  />
                </div>

                {/* Occurrence */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Occurrence
                  </label>
                  <input
                    type="text"
                    value={workspaceOccurrence}
                    onChange={(e) => setWorkspaceOccurrence(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-xs"
                  />
                </div>

                {/* Future Possibility */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Future Possibility
                  </label>
                  <input
                    type="text"
                    value={workspacePossibility}
                    onChange={(e) => setWorkspacePossibility(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-xs"
                  />
                </div>

                {/* Root Cause */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Root Cause
                  </label>
                  <textarea
                    rows={3}
                    value={workspaceRootCause}
                    onChange={(e) => setWorkspaceRootCause(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-xs resize-y"
                  />
                </div>

                {/* Support Note */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Support Note
                  </label>
                  <textarea
                    rows={3}
                    value={workspaceSupportNote}
                    onChange={(e) => setWorkspaceSupportNote(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-xs resize-y"
                  />
                </div>

                {/* Save Workspace Action */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSaveWorkspace}
                    disabled={savingWorkspace}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {savingWorkspace ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    <span>Save Workspace</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Problem Title
                    </span>
                    {isCompanyAdmin && (
                      <button
                        type="button"
                        onClick={() => setIsEditModalOpen(true)}
                        className="inline-flex items-center gap-1 text-[11px] text-amber-700 hover:text-amber-800 font-medium px-2 py-0.5 rounded bg-amber-50 border border-amber-200 shadow-xs"
                        title="Edit ticket specifications"
                      >
                        <Edit3 size={11} />
                        <span>Edit</span>
                      </button>
                    )}
                  </div>
                  <h2 className="text-sm font-bold text-slate-900 leading-snug bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                    {ticket.title}
                  </h2>
                </div>

                {/* System, Category, Floor Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">System</span>
                    <span className="font-semibold text-slate-800 truncate block mt-0.5">{ticket.affected_system}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Category</span>
                    <span className="font-semibold text-slate-800 truncate block mt-0.5">{ticket.category}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Factory Floor</span>
                    <span className="font-semibold text-slate-800 truncate block mt-0.5">{ticket.floor_location || 'Floor N/A'}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Line Number</span>
                    <span className="font-semibold text-slate-800 truncate block mt-0.5">
                      {ticket.line_number || 'Line N/A'}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Problem Description
                  </span>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs leading-relaxed text-slate-800 whitespace-pre-wrap max-h-40 overflow-y-auto shadow-xs">
                    {ticket.description}
                  </div>
                </div>

                {/* Pre-Troubleshooting Checklist */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <ListChecks size={14} className="text-emerald-600" />
                      <span>Pre-Troubleshooting Checklist</span>
                    </span>
                    {ticket.troubleshooting_checklist && ticket.troubleshooting_checklist.length > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                        {ticket.troubleshooting_checklist.length} Completed
                      </span>
                    )}
                  </div>

                  {ticket.troubleshooting_checklist && ticket.troubleshooting_checklist.length > 0 ? (
                    <div className="bg-white border border-emerald-100 rounded-xl p-3 space-y-2 shadow-xs">
                      {ticket.troubleshooting_checklist.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                          <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                          <span className="leading-snug">{item}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-400 italic shadow-xs">
                      No pre-troubleshooting checklist recorded for this ticket.
                    </div>
                  )}
                </div>

                {/* Left Sidebar: ONLY Photos & Videos Uploaded at Ticket Creation */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <ImageIcon size={14} className="text-blue-600" />
                      <span>Ticket Creation Evidence</span>
                    </span>
                    {initialEvidenceAttachments.length > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                        {initialEvidenceAttachments.length} file{initialEvidenceAttachments.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {initialEvidenceAttachments.length === 0 ? (
                    <div className="p-3.5 bg-white border border-slate-200 rounded-xl text-center text-xs text-slate-400 shadow-xs">
                      No initial photos or videos attached at ticket creation.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {initialEvidenceAttachments.map((att) => {
                        const isImg = isImageFile(att.file_name, att.file_type);
                        const isVid = isVideoFile(att.file_name, att.file_type);
                        const fileUrl = api.getFileUrl(att.file_path);

                        if (isImg) {
                          return (
                            <div
                              key={att.id}
                              className="group relative bg-white border border-slate-200 hover:border-blue-400 rounded-xl overflow-hidden shadow-xs transition-all"
                            >
                              <div 
                                className="relative h-36 w-full cursor-pointer bg-slate-100 overflow-hidden"
                                onClick={() => setActiveLightboxImage({ url: fileUrl, title: att.file_name })}
                              >
                                <img
                                  src={fileUrl}
                                  alt={att.file_name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = fileUrl;
                                  }}
                                />
                                <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                                  <span className="p-2 rounded-full bg-blue-600 text-white shadow-md">
                                    <Maximize2 size={16} />
                                  </span>
                                </div>
                              </div>
                              <div className="p-2.5 flex items-center justify-between text-xs text-slate-700 bg-slate-50 border-t border-slate-100">
                                <div className="truncate mr-2">
                                  <p className="font-semibold text-slate-900 truncate text-[11px]">{att.file_name}</p>
                                  <p className="text-[10px] text-slate-500">
                                    {att.file_size ? `${(att.file_size / 1024).toFixed(0)} KB` : 'Image'} • {att.uploaded_by || 'Evidence'}
                                  </p>
                                </div>
                                <a
                                  href={fileUrl}
                                  download={att.file_name}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors shrink-0 shadow-xs"
                                  title="Download image"
                                >
                                  <Download size={13} />
                                </a>
                              </div>
                            </div>
                          );
                        }

                        if (isVid) {
                          return (
                            <div
                              key={att.id}
                              className="bg-white border border-purple-200 rounded-xl overflow-hidden shadow-xs space-y-1.5 p-2.5"
                            >
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-900 mb-1">
                                <Video size={14} className="text-purple-600" />
                                <span className="truncate">{att.file_name}</span>
                              </div>
                              <video
                                src={fileUrl}
                                controls
                                preload="metadata"
                                className="w-full max-h-44 rounded-lg bg-black border border-slate-200"
                              />
                              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                                <span>{att.file_size ? `${(att.file_size / 1024 / 1024).toFixed(1)} MB` : 'Video'}</span>
                                <a
                                  href={fileUrl}
                                  download={att.file_name}
                                  className="text-purple-700 font-semibold hover:underline flex items-center gap-1"
                                >
                                  <Download size={11} /> Download Video
                                </a>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <a
                            key={att.id}
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-2.5 bg-white border border-slate-200 hover:border-blue-400 rounded-xl text-xs text-slate-800 transition-colors shadow-xs group"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <FileText size={15} className="text-blue-600 shrink-0" />
                              <div className="truncate">
                                <p className="font-semibold text-slate-900 truncate text-[11px] group-hover:text-blue-600">{att.file_name}</p>
                                <p className="text-[10px] text-slate-500">{att.file_size ? `${(att.file_size / 1024).toFixed(0)} KB` : 'Document'}</p>
                              </div>
                            </div>
                            <Download size={13} className="text-slate-400 group-hover:text-slate-800 shrink-0 ml-2" />
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Workflow Actions Box */}
                <div className="pt-3 border-t border-slate-200 space-y-3">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Workflow Actions
                  </span>

                  {/* Company Admin View */}
                  {isCompanyAdmin && (
                    <div className="space-y-2">
                      {ticket.status !== 'Closed' ? (
                        <button
                          type="button"
                          onClick={() => setShowCloseModal(true)}
                          className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm transition-all flex items-center justify-center gap-2"
                        >
                          <CheckCircle size={15} />
                          <span>Close Ticket (Issue Resolved)</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleReopenTicket}
                          className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 shadow-sm transition-all flex items-center justify-center gap-2"
                        >
                          <RotateCcw size={15} />
                          <span>Reopen Ticket</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Super Admin View */}
                  {isSuperAdmin && (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700">Set Ticket Status:</label>
                        <select
                          value={ticket.status}
                          onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
                          disabled={ticket.status === 'Closed' || updatingStatus}
                          className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 cursor-pointer shadow-xs"
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
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Side: Real-Time WebSocket Live Chat (7 Cols on Desktop) */}
          <div className={`md:col-span-7 bg-slate-100/50 flex flex-col h-full overflow-hidden ${
            mobileDrawerTab === 'chat' ? 'flex' : 'hidden md:flex'
          }`}>
            {/* Real-time correspondence header */}
            <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0 shadow-2xs">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-800 tracking-wide uppercase">
                  Real-Time Support Correspondence
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span>Live Feed</span>
              </span>
            </div>

            {/* Chat Thread */}
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-3.5" ref={chatScrollRef}>
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs space-y-2 py-12">
                  <Clock size={28} className="text-slate-300" />
                  <span>No chat messages yet. Type below to start live support.</span>
                </div>
              )}

              {messages.map((msg) => {
                if (msg.is_system_event) {
                  return (
                    <div key={msg.id} className="flex justify-center">
                      <span className="px-3 py-1 rounded-full bg-slate-200/80 border border-slate-300/80 text-[10px] sm:text-[11px] text-slate-600 text-center max-w-sm">
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
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                      <span className="truncate max-w-[120px] font-medium">{msg.sender_name}</span>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                        isSuper ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {isSuper ? 'Super Admin' : 'Company Admin'}
                      </span>
                    </div>

                    <div
                      className={`px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl text-xs leading-relaxed break-words shadow-xs ${
                        isMine
                          ? 'bg-blue-600 text-white rounded-br-none'
                          : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-none'
                      }`}
                    >
                      {msg.message}

                      {/* In-Chat Image / Video / Attachment preview */}
                      {msg.attachment_url && (
                        <div className={`mt-2 pt-2 border-t ${isMine ? 'border-white/20' : 'border-slate-200'}`}>
                          {isImageFile(msg.attachment_name, '') ? (
                            <div 
                              className="cursor-pointer group relative overflow-hidden rounded-lg border border-slate-200 max-w-[240px] max-h-48"
                              onClick={() => setActiveLightboxImage({ url: api.getFileUrl(msg.attachment_url!), title: msg.attachment_name || 'Attached Photo' })}
                            >
                              <img
                                src={api.getFileUrl(msg.attachment_url)}
                                alt={msg.attachment_name || 'Attachment'}
                                className="w-full h-auto object-cover group-hover:scale-105 transition-transform"
                              />
                              <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Eye size={18} className="text-white drop-shadow" />
                              </div>
                            </div>
                          ) : isVideoFile(msg.attachment_name, '') ? (
                            <div className="space-y-1">
                              <video
                                src={api.getFileUrl(msg.attachment_url)}
                                controls
                                className="max-w-xs max-h-48 rounded-lg bg-black border border-slate-200"
                              />
                              <a
                                href={api.getFileUrl(msg.attachment_url)}
                                download={msg.attachment_name}
                                className={`text-[11px] font-semibold hover:underline flex items-center gap-1 ${
                                  isMine ? 'text-blue-100' : 'text-blue-600'
                                }`}
                              >
                                <Download size={11} /> {msg.attachment_name || 'Download Video'}
                              </a>
                            </div>
                          ) : (
                            <a
                              href={api.getFileUrl(msg.attachment_url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`inline-flex items-center gap-1.5 text-xs font-semibold hover:underline ${
                                isMine ? 'text-white' : 'text-blue-600'
                              }`}
                            >
                              <Paperclip size={12} />
                              {msg.attachment_name || 'Download Attachment'}
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    <span className="text-[10px] text-slate-400">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}

              {typingUser && (
                <div className="text-xs italic text-slate-400 animate-pulse">
                  {typingUser} is typing...
                </div>
              )}
            </div>

            {/* Pending File Attachment Preview */}
            {pendingFile && (
              <div className="mx-2.5 sm:mx-4 mb-2 p-2.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between gap-3 animate-fadeIn shadow-xs">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  {pendingFilePreview ? (
                    <img 
                      src={pendingFilePreview} 
                      alt="Preview" 
                      className="w-11 h-11 object-cover rounded-lg border border-blue-300 shrink-0" 
                    />
                  ) : isVideoFile(pendingFile.name, pendingFile.type) ? (
                    <div className="w-11 h-11 rounded-lg bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-600 shrink-0">
                      <Video size={18} />
                    </div>
                  ) : (
                    <div className="w-11 h-11 rounded-lg bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                      <FileText size={18} />
                    </div>
                  )}
                  <div className="truncate">
                    <p className="text-xs font-bold text-slate-900 truncate max-w-[200px] sm:max-w-xs">{pendingFile.name}</p>
                    <p className="text-[10px] text-slate-500">
                      {(pendingFile.size / 1024).toFixed(1)} KB • Staged for send (Click Send to upload)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemovePendingFile}
                  disabled={uploadingFile}
                  className="p-1 rounded-lg hover:bg-blue-100 text-slate-500 hover:text-slate-800 transition-colors"
                  title="Remove attachment"
                >
                  <X size={15} />
                </button>
              </div>
            )}

            {/* Chat Input Toolbar */}
            <div className="p-2.5 sm:p-4 bg-white border-t border-slate-200 flex items-end gap-2 shrink-0">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileSelect}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={ticket.status === 'Closed' || uploadingFile}
                title="Choose file to attach"
                className="p-2 sm:p-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-300 transition-colors shrink-0 disabled:opacity-40 shadow-xs"
              >
                <Paperclip size={16} />
              </button>

              <textarea
                rows={1}
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  handleTyping();
                }}
                onKeyDown={handleKeyDown}
                disabled={ticket.status === 'Closed' || uploadingFile}
                className="flex-1 bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs sm:text-sm focus:bg-white focus:outline-none focus:border-blue-500 resize-none max-h-24 disabled:opacity-50 shadow-xs placeholder-slate-400"
              />

              <button
                type="button"
                onClick={handleSendMessage}
                disabled={ticket.status === 'Closed' || (!inputText.trim() && !pendingFile) || uploadingFile}
                title="Send message and attachments"
                className="p-2 sm:p-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-colors disabled:opacity-40 shrink-0 flex items-center justify-center min-w-[38px]"
              >
                {uploadingFile ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Close Ticket Confirmation Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowCloseModal(false)}>
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Confirm Resolution & Close Ticket
              </h3>
              <button onClick={() => setShowCloseModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you satisfied that the issue regarding <strong>{ticket.affected_system}</strong> has been resolved by the engineering team?
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Rate Service Quality:</label>
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
                      className={star <= satisfaction ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Closing Remarks (Optional):</label>
              <textarea
                rows={2}
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg p-2.5 text-xs focus:bg-white focus:outline-none focus:border-blue-500 shadow-sm"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowCloseModal(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 shadow-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCloseTicket}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm"
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

      {/* Full-Screen Lightbox Modal for Photo Inspection */}
      {activeLightboxImage && (
        <div 
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-fadeIn"
          onClick={() => setActiveLightboxImage(null)}
        >
          <div className="relative max-w-5xl max-h-[92vh] w-full flex flex-col items-center bg-white rounded-2xl p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="w-full flex items-center justify-between pb-3 px-2 border-b border-slate-200 mb-3">
              <div className="flex items-center gap-2 truncate max-w-md">
                <ImageIcon size={18} className="text-blue-600 shrink-0" />
                <span className="text-sm font-bold text-slate-900 truncate">{activeLightboxImage.title}</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={activeLightboxImage.url}
                  download={activeLightboxImage.title}
                  className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-xs"
                  title="Download image"
                >
                  <Download size={15} />
                  <span>Download</span>
                </a>
                <button
                  type="button"
                  onClick={() => setActiveLightboxImage(null)}
                  className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors shadow-xs"
                  title="Close viewer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="max-h-[75vh] overflow-auto flex items-center justify-center p-1 w-full">
              <img
                src={activeLightboxImage.url}
                alt={activeLightboxImage.title}
                className="max-h-[73vh] max-w-full object-contain rounded-xl border border-slate-200 shadow-md"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
