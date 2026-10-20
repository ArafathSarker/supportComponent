import React, { useState, useEffect } from 'react';
import { Search, Plus, RefreshCw, MessageSquare } from 'lucide-react';
import type { Ticket, TicketStats, CurrentUser } from './types';
import { api } from './api';
import { StatCards } from './StatCards';
import { RaiseTicketModal } from './RaiseTicketModal';
import { TicketLiveChatDrawer } from './TicketLiveChatDrawer';

interface SupportTicketsProps {
  currentUser: CurrentUser;
  categories?: string[];
  systems?: string[];
  onTicketCreated?: (ticket: Ticket) => void;
  onTicketClosed?: (ticketId: string) => void;
}

export const SupportTickets: React.FC<SupportTicketsProps> = ({ 
  currentUser,
  categories,
  systems,
  onTicketCreated: externalTicketCreated,
  onTicketClosed: externalTicketClosed
}) => {
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
  }, [currentUser.role, currentUser.company_name, statusFilter, urgencyFilter]);

  // Global WebSocket notification listener for real-time table sync
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
    setActiveChatTicketId(newTicket.id);
    if (externalTicketCreated) {
      externalTicketCreated(newTicket);
    }
  };

  const handleTicketUpdated = (updated: Ticket) => {
    setTickets((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
    loadData();
    if (updated.status === 'Closed' && externalTicketClosed) {
      externalTicketClosed(updated.id);
    }
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
    <div className="w-full">
      {/* 1. Stat Cards Metrics */}
      <StatCards stats={stats} />

      {/* 2. Main Ticket Table Card */}
      <div className="bg-[#111827] border border-[#1f293d] rounded-xl overflow-hidden shadow-2xl">
        {/* Toolbar Header */}
        <div className="p-5 border-b border-[#1f293d] flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-base font-semibold text-white tracking-wide">
            Support Tickets
          </h2>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex items-center">
              <Search size={15} className="absolute left-3 text-gray-500 pointer-events-none" />
              <input
                type="text"
                placeholder="search details or machine ref..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadData()}
                className="bg-[#0b1120] border border-[#1f293d] text-gray-100 pl-9 pr-3 py-2 rounded-lg text-xs w-60 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#0b1120] border border-[#1f293d] text-gray-200 px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
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
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="bg-[#0b1120] border border-[#1f293d] text-gray-200 px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="All">All Urgency</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={loadData}
              title="Refresh tickets"
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-[#1f293d] transition-colors"
            >
              <RefreshCw size={14} />
            </button>

            {/* Raise Support Ticket Button */}
            <button
              type="button"
              onClick={() => setIsRaiseModalOpen(true)}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-md transition-all flex items-center gap-1.5"
            >
              <Plus size={15} />
              Raise Support Ticket
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs text-gray-200 border-collapse">
            <thead>
              <tr className="bg-[#0d1527] border-b border-[#1f293d] text-gray-400 font-semibold tracking-wider">
                <th className="py-3 px-4">Ticket ID</th>
                <th className="py-3 px-4">Title / Problem Summary</th>
                <th className="py-3 px-4">Affected System</th>
                <th className="py-3 px-4">Problem Category</th>
                <th className="py-3 px-4">Urgency Level</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created At</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f293d]">
              {loading && tickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-gray-400">
                    Loading tickets...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <MessageSquare size={28} />
                      <span>No tickets found. Click "Raise Support Ticket" to create one.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-800/40 transition-colors">
                    {/* Ticket Code */}
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-400">
                      {ticket.ticket_code}
                    </td>

                    {/* Title & Preview */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-medium text-white truncate">{ticket.title}</div>
                      {ticket.latest_message && (
                        <div className="text-[11px] text-gray-400 truncate mt-0.5">
                          💬 {ticket.latest_message}
                        </div>
                      )}
                    </td>

                    {/* Affected System */}
                    <td className="py-3.5 px-4 text-gray-300">
                      {ticket.affected_system}
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4 text-gray-400">
                      {ticket.category}
                    </td>

                    {/* Urgency */}
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
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
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
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
                    </td>

                    {/* Created At */}
                    <td className="py-3.5 px-4 text-gray-400 whitespace-nowrap">
                      {formatDate(ticket.created_at)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => setActiveChatTicketId(ticket.id)}
                        className="px-3 py-1 rounded-md text-xs font-medium text-blue-400 bg-blue-500/10 hover:bg-blue-600 hover:text-white border border-blue-500/20 transition-all"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-[#1f293d] flex items-center justify-between text-xs text-gray-400">
          <span>Showing {tickets.length} ticket(s)</span>
          <span>Items per page: 5</span>
        </div>
      </div>

      {/* Raise Ticket Modal */}
      <RaiseTicketModal
        isOpen={isRaiseModalOpen}
        onClose={() => setIsRaiseModalOpen(false)}
        currentUser={currentUser}
        categories={categories}
        systems={systems}
        onTicketCreated={handleTicketCreated}
      />

      {/* Live WebSocket Chat Drawer */}
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
