import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  Paperclip, 
  CheckCircle, 
  RotateCcw, 
  Clock, 
  AlertCircle, 
  FileText, 
  Download, 
  User, 
  ShieldAlert,
  Star
} from 'lucide-react';
import { Ticket, TicketMessage, CurrentUser, TicketStatus } from './types';
import { api } from './api';

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
  const [loading, setLoading] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [satisfaction, setSatisfaction] = useState(5);
  const [closeNotes, setCloseNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimerRef = useRef<any>(null);

  // Load ticket details and establish WebSocket
  useEffect(() => {
    if (!isOpen || !ticketId) return;

    let isMounted = true;
    setLoading(true);

    api.getTicketDetail(ticketId)
      .then((data) => {
        if (isMounted) {
          setTicket(data);
          setMessages(data.messages || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching ticket details:', err);
        setLoading(false);
      });

    // Establish WebSocket Connection
    const wsUrl = api.getWebSocketTicketUrl(ticketId);
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        if (payload.type === 'chat_message') {
          const newMsg: TicketMessage = payload.data;
          setMessages((prev) => {
            // Avoid duplicate message if already added
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        } else if (payload.type === 'status_updated') {
          setTicket((prev) => prev ? { ...prev, status: payload.status as TicketStatus } : null);
        } else if (payload.type === 'ticket_closed') {
          setTicket((prev) => prev ? { ...prev, status: 'Closed' } : null);
        } else if (payload.type === 'typing') {
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
        console.error('Failed to parse WS message:', e);
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

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, typingUser]);

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
      // Fallback to REST
      await api.sendMessage(ticket.id, {
        sender_name: currentUser.name,
        sender_role: currentUser.role,
        message: text
      });
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
        message: `Attached file: ${uploadRes.filename}`,
        attachment_url: uploadRes.url,
        attachment_name: uploadRes.filename
      };

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify(payload));
      } else {
        await api.sendMessage(ticket.id, payload);
      }
    } catch (err) {
      alert('Failed to upload attachment');
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
        `Status set to ${newStatus}`
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
    <div className="sc-drawer-overlay" onClick={onClose}>
      <div className="sc-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="sc-drawer-header">
          <div className="sc-drawer-title-area">
            <span className="sc-code-cell" style={{ fontSize: '15px' }}>{ticket.ticket_code}</span>
            <span className={`sc-badge sc-badge-${ticket.status.toLowerCase().replace(/\s+/g, '')}`}>
              {ticket.status}
            </span>
            <span className={`sc-badge sc-badge-${ticket.urgency.toLowerCase()}`}>
              {ticket.urgency} Urgency
            </span>
            <div className="sc-ws-indicator">
              <span className={`sc-pulse-dot ${wsConnected ? '' : 'disconnected'}`} />
              {wsConnected ? 'Live Chat Online' : 'Connecting...'}
            </div>
          </div>
          <button className="sc-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Drawer Body Layout */}
        <div className="sc-drawer-layout">
          {/* Left Column: Ticket Metadata & Management */}
          <div className="sc-drawer-info">
            <div className="sc-info-item">
              <span className="sc-info-label">Title / Summary</span>
              <span className="sc-info-value" style={{ fontWeight: 600, fontSize: '14.5px' }}>
                {ticket.title}
              </span>
            </div>

            <div className="sc-info-item">
              <span className="sc-info-label">Affected Solution / System</span>
              <span className="sc-info-value" style={{ color: '#60a5fa' }}>
                {ticket.affected_system}
              </span>
            </div>

            <div className="sc-info-item">
              <span className="sc-info-label">Problem Category</span>
              <span className="sc-info-value">{ticket.category}</span>
            </div>

            <div className="sc-info-item">
              <span className="sc-info-label">Reported By</span>
              <span className="sc-info-value">
                {ticket.created_by_name} ({ticket.company_name})
              </span>
            </div>

            <div className="sc-info-item">
              <span className="sc-info-label">Created At</span>
              <span className="sc-info-value">
                {new Date(ticket.created_at).toLocaleString()}
              </span>
            </div>

            <div className="sc-info-item">
              <span className="sc-info-label">Description</span>
              <div style={{
                background: '#0b1120',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid var(--sc-border)',
                fontSize: '13px',
                lineHeight: 1.5,
                color: '#e2e8f0',
                whiteSpace: 'pre-wrap'
              }}>
                {ticket.description}
              </div>
            </div>

            {/* Evidence Attachments */}
            {ticket.attachments && ticket.attachments.length > 0 && (
              <div className="sc-info-item">
                <span className="sc-info-label">Attachments ({ticket.attachments.length})</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {ticket.attachments.map((att) => (
                    <a
                      key={att.id}
                      href={att.file_path}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 10px',
                        background: '#0b1120',
                        border: '1px solid var(--sc-border)',
                        borderRadius: '6px',
                        color: '#93c5fd',
                        textDecoration: 'none',
                        fontSize: '12px'
                      }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                        {att.file_name}
                      </span>
                      <Download size={14} />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Status Management & Close Actions */}
            <div style={{ borderTop: '1px solid var(--sc-border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span className="sc-info-label">Ticket Action & Permissions</span>

              {/* Company Admin View */}
              {isCompanyAdmin && (
                <div>
                  {ticket.status !== 'Closed' ? (
                    <button
                      className="sc-btn-success"
                      style={{ width: '100%', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                      onClick={() => setShowCloseModal(true)}
                    >
                      <CheckCircle size={16} />
                      Close Ticket (Issue Resolved)
                    </button>
                  ) : (
                    <button
                      className="sc-btn-secondary"
                      style={{ width: '100%', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                      onClick={handleReopenTicket}
                    >
                      <RotateCcw size={16} />
                      Reopen Ticket
                    </button>
                  )}
                  <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>
                    * As the company owner, only you have authority to close this ticket once satisfied.
                  </p>
                </div>
              )}

              {/* Super Admin View */}
              {isSuperAdmin && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Update Ticket State:</label>
                  <select
                    className="sc-form-select"
                    value={ticket.status}
                    onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
                    disabled={ticket.status === 'Closed' || updatingStatus}
                  >
                    <option value="Open">Open</option>
                    <option value="Under Review">Under Review</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Pending Customer Close">Pending Customer Close</option>
                    <option value="Closed" disabled>
                      Closed (Consumer/Owner Only)
                    </option>
                  </select>

                  <div style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    color: '#f87171',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '6px'
                  }}>
                    <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>
                      Super Admin Rule: You cannot close this ticket until the company owner/consumer resolves and closes it.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Real-Time WebSocket Live Chat */}
          <div className="sc-chat-section">
            <div className="sc-chat-thread" ref={chatScrollRef}>
              {messages.length === 0 && (
                <div className="sc-empty-state">
                  <Clock size={32} />
                  <span>No chat messages yet. Send a message to start live support.</span>
                </div>
              )}

              {messages.map((msg) => {
                if (msg.is_system_event) {
                  return (
                    <div key={msg.id} className="sc-chat-system-event">
                      {msg.message}
                    </div>
                  );
                }

                const isMine = msg.sender_name === currentUser.name;
                const isSuper = msg.sender_role === 'super_admin';

                return (
                  <div
                    key={msg.id}
                    className={`sc-chat-msg ${isMine ? 'mine' : 'theirs'}`}
                  >
                    <div className="sc-msg-sender">
                      <span>{msg.sender_name}</span>
                      <span className={`sc-badge ${isSuper ? 'sc-badge-review' : 'sc-badge-open'}`} style={{ fontSize: '10px', padding: '1px 6px' }}>
                        {isSuper ? 'Super Admin' : 'Company Admin'}
                      </span>
                    </div>

                    <div className="sc-msg-bubble">
                      {msg.message}

                      {msg.attachment_url && (
                        <div style={{ marginTop: '8px' }}>
                          <a
                            href={msg.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: 'rgba(0,0,0,0.2)',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              color: '#fff',
                              fontSize: '11.5px',
                              textDecoration: 'underline'
                            }}
                          >
                            <Paperclip size={13} />
                            {msg.attachment_name || 'Download Attachment'}
                          </a>
                        </div>
                      )}
                    </div>

                    <span className="sc-msg-time">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}

              {typingUser && (
                <div className="sc-chat-typing">
                  {typingUser} is typing...
                </div>
              )}
            </div>

            {/* Chat Input Toolbar */}
            <div className="sc-chat-input-bar">
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
              <button
                type="button"
                className="sc-btn-attach"
                onClick={() => fileInputRef.current?.click()}
                title="Attach photo/video evidence"
              >
                <Paperclip size={18} />
              </button>

              <textarea
                className="sc-chat-textarea"
                rows={1}
                placeholder="Type your message to support... (Enter to send)"
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  handleTyping();
                }}
                onKeyDown={handleKeyDown}
                disabled={ticket.status === 'Closed'}
              />

              <button
                type="button"
                className="sc-btn-send"
                onClick={handleSendMessage}
                disabled={ticket.status === 'Closed' || !inputText.trim()}
                title="Send message"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Close Ticket Confirmation Modal */}
      {showCloseModal && (
        <div className="sc-modal-overlay" style={{ zIndex: 10001 }} onClick={() => setShowCloseModal(false)}>
          <div className="sc-modal-box" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="sc-modal-header">
              <h3>Confirm Resolution & Close Ticket</h3>
              <button className="sc-modal-close" onClick={() => setShowCloseModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="sc-modal-body">
              <p style={{ fontSize: '13.5px', color: '#cbd5e1', margin: 0 }}>
                Are you satisfied that this issue on <strong>{ticket.affected_system}</strong> is fully resolved?
              </p>

              <div>
                <label className="sc-form-label">Rate Solution Provider Service</label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0
                      }}
                      onClick={() => setSatisfaction(star)}
                    >
                      <Star
                        size={24}
                        fill={star <= satisfaction ? '#fbbf24' : 'transparent'}
                        color={star <= satisfaction ? '#fbbf24' : '#64748b'}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="sc-form-label">Closing Feedback / Remarks</label>
                <textarea
                  className="sc-form-textarea"
                  rows={2}
                  placeholder="Optional feedback..."
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                />
              </div>
            </div>
            <div className="sc-modal-footer">
              <button className="sc-btn-secondary" onClick={() => setShowCloseModal(false)}>
                Cancel
              </button>
              <button className="sc-btn-success" onClick={handleCloseTicket}>
                Confirm & Close Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
