import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter, RefreshCw, MessageSquare, ExternalLink } from 'lucide-react';
import { Ticket, TicketStats, CurrentUser, UserRole } from './types';
import { api } from './api';
import { StatCards } from './StatCards';
import { RaiseTicketModal, CATEGORY_OPTIONS } from './RaiseTicketModal';
import { TicketLiveChatDrawer } from './TicketLiveChatDrawer';

interface SupportTicketsProps {
  currentUser: CurrentUser;
}

export const SupportTickets: React.FC<SupportTicketsProps> = ({ currentUser }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<TicketStats>({
    total_tickets: 0,
    active_tickets: 0,
    in_progress_tickets: 0,
    closed_tickets: 0
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [urgencyFilter, setUrgencyFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const [isRaiseModalOpen, setIsRaiseModalOpen] = useState(false);
  const [activeChatTicketId, setActiveChatTicketId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ticketsData, statsData] = await Promise.all([
        api.getTickets({
          role: currentUser.role,
          companyName: currentUser.company_name,
          status: statusFilter,
          urgency: urgencyFilter,
          category: categoryFilter,
          search: search.trim()
        }),
        api.getStats(currentUser.role, currentUser.company_name)
      ]);
      setTickets(ticketsData);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load tickets data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser.role, currentUser.company_name, statusFilter, urgencyFilter, categoryFilter]);

  // Listen to global notifications via WebSocket
  useEffect(() => {
    const wsUrl = api.getWebSocketNotificationsUrl();
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (
          payload.type === 'new_ticket' ||
          payload.type === 'ticket_status_updated' ||
          payload.type === 'ticket_closed' ||
          payload.type === 'ticket_reopened'
        ) {
          loadData();
        }
      } catch (e) {
        console.error('Global notification error:', e);
      }
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  const handleTicketCreated = (newTicket: Ticket) => {
    setTickets((prev) => [newTicket, ...prev]);
    loadData();
    // Automatically open live chat drawer on the newly raised ticket!
    setActiveChatTicketId(newTicket.id);
  };

  const handleTicketUpdated = (updated: Ticket) => {
    setTickets((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
    loadData();
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }) + ', ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div>
      {/* 1. Stat Cards Row */}
      <StatCards stats={stats} />

      {/* 2. Main Card */}
      <div className="sc-main-card">
        {/* Toolbar */}
        <div className="sc-toolbar">
          <h2 className="sc-toolbar-title">Support Tickets</h2>

          <div className="sc-toolbar-actions">
            {/* Search */}
            <div className="sc-search-box">
              <Search size={15} />
              <input
                type="text"
                className="sc-search-input"
                placeholder="search details or machine ref..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadData()}
              />
            </div>

            {/* Status Filter */}
            <select
              className="sc-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Open">Open</option>
              <option value="Under Review">Under Review</option>
              <option value="In Progress">In Progress</option>
              <option value="Pending Customer Close">Pending Customer Close</option>
              <option value="Closed">Closed</option>
            </select>

            {/* Urgency Filter */}
            <select
              className="sc-select"
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
            >
              <option value="All">All Urgency</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>

            {/* Refresh */}
            <button className="sc-btn-secondary" onClick={loadData} title="Refresh">
              <RefreshCw size={14} />
            </button>

            {/* Raise Support Ticket Button */}
            <button
              className="sc-btn-primary"
              onClick={() => setIsRaiseModalOpen(true)}
              id="raise-ticket-btn"
            >
              <Plus size={16} />
              Raise Support Ticket
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="sc-table-wrapper">
          <table className="sc-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Title / Problem Summary</th>
                <th>Affected System</th>
                <th>Problem Category</th>
                <th>Urgency Level</th>
                <th>Status</th>
                <th>Created At</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && tickets.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '32px' }}>
                    Loading tickets...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>
                    <div className="sc-empty-state">
                      <MessageSquare size={32} />
                      <span>No tickets found matching your query.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr key={ticket.id}>
                    {/* Ticket Code */}
                    <td className="sc-code-cell">{ticket.ticket_code}</td>

                    {/* Title */}
                    <td className="sc-title-cell">
                      <div style={{ fontWeight: 500 }}>{ticket.title}</div>
                      {ticket.latest_message && (
                        <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}>
                          💬 {ticket.latest_message}
                        </div>
                      )}
                    </td>

                    {/* Affected System */}
                    <td className="sc-system-cell">{ticket.affected_system}</td>

                    {/* Category */}
                    <td style={{ fontSize: '12.5px', color: '#cbd5e1' }}>
                      {ticket.category}
                    </td>

                    {/* Urgency */}
                    <td>
                      <span className={`sc-badge sc-badge-${ticket.urgency.toLowerCase()}`}>
                        {ticket.urgency}
                      </span>
                    </td>

                    {/* Status */}
                    <td>
                      <span className={`sc-badge sc-badge-${ticket.status.toLowerCase().replace(/\s+/g, '')}`}>
                        {ticket.status}
                      </span>
                    </td>

                    {/* Created At */}
                    <td style={{ color: '#94a3b8', fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                      {formatDate(ticket.created_at)}
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'center' }}>
                      <div className="sc-action-group" style={{ justifyContent: 'center' }}>
                        <button
                          className="sc-btn-view"
                          onClick={() => setActiveChatTicketId(ticket.id)}
                          title="Open ticket details and live chat"
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div style={{
          padding: '12px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid var(--sc-border)',
          fontSize: '12.5px',
          color: '#94a3b8'
        }}>
          <div>Showing {tickets.length} ticket(s)</div>
          <div>Items per page: 5</div>
        </div>
      </div>

      {/* Raise Ticket Modal */}
      <RaiseTicketModal
        isOpen={isRaiseModalOpen}
        onClose={() => setIsRaiseModalOpen(false)}
        currentUser={currentUser}
        onTicketCreated={handleTicketCreated}
      />

      {/* Live Chat Drawer */}
      <TicketLiveChatDrawer
        ticketId={activeChatTicketId}
        isOpen={!!activeChatTicketId}
        onClose={() => setActiveChatTicketId(null)}
        currentUser={currentUser}
        onTicketUpdated={handleTicketUpdated}
      />
    </div>
  );
};
