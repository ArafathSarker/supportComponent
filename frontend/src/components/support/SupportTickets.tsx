import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  RefreshCw, 
  MessageSquare, 
  LayoutList, 
  LayoutGrid, 
  Cpu, 
  Clock, 
  Tag,
  Edit3,
  Shield,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Flame
} from 'lucide-react';
import type { Ticket, TicketStats, CurrentUser } from './types';
import { api } from './api';
import { StatCards } from './StatCards';
import { RaiseTicketModal } from './RaiseTicketModal';
import { EditTicketModal } from './EditTicketModal';
import { TicketLiveChatDrawer } from './TicketLiveChatDrawer';

interface SupportTicketsProps {
  currentUser: CurrentUser;
  categories?: string[];
  systems?: string[];
  onTicketCreated?: (ticket: Ticket) => void;
  onTicketUpdated?: (ticket: Ticket) => void;
  onTicketClosed?: (ticketId: string) => void;
}

export const SupportTickets: React.FC<SupportTicketsProps> = ({ 
  currentUser,
  categories,
  systems,
  onTicketCreated: externalTicketCreated,
  onTicketUpdated: externalTicketUpdated,
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
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const [isRaiseModalOpen, setIsRaiseModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
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
          priority: priorityFilter,
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
  }, [currentUser.role, currentUser.company_name, statusFilter, urgencyFilter, priorityFilter]);

  // Global WebSocket notification listener for real-time table sync
  useEffect(() => {
    const wsUrl = api.getWebSocketNotificationsUrl();
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const eventType = payload.type || payload.event;
        if (
          eventType === 'new_ticket' ||
          eventType === 'ticket_created' ||
          eventType === 'ticket_status_updated' ||
          eventType === 'ticket_updated' ||
          eventType === 'status_updated' ||
          eventType === 'ticket_closed' ||
          eventType === 'ticket_reopened' ||
          eventType === 'new_chat_message'
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
    if (externalTicketUpdated) {
      externalTicketUpdated(updated);
    }
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

  const renderPriorityBadge = (priorityVal?: string, urgencyVal?: string) => {
    const val = priorityVal || urgencyVal || 'Medium';
    const isCritical = val === 'Critical';
    const isUrgent = val === 'Urgent';
    const isHigh = val === 'High';
    const isMed = val === 'Medium';

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
        isCritical
          ? 'bg-red-500/20 text-red-400 border-red-500/40'
          : isUrgent
          ? 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40 shadow-[0_0_10px_rgba(217,70,239,0.25)]'
          : isHigh
          ? 'bg-orange-500/15 text-orange-400 border-orange-500/30'
          : isMed
          ? 'bg-amber-500/15 text-amber-400 border-amber-500/25'
          : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
      }`}>
        {(isUrgent || isCritical) && <Flame size={11} className={isCritical ? 'text-red-400' : 'text-fuchsia-300'} />}
        {val}
      </span>
    );
  };

  return (
    <div className="w-full">
      {/* 1. Stat Cards Metrics */}
      <StatCards stats={stats} />

      {/* 2. Main Ticket Card */}
      <div className="bg-[#111827] border border-[#1f293d] rounded-xl overflow-hidden shadow-2xl">
        {/* Toolbar Header */}
        <div className="p-5 border-b border-[#1f293d] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-white tracking-wide">
              Support Tickets
            </h2>
            <span className="text-xs text-gray-400 bg-gray-800/60 px-2.5 py-0.5 rounded-full border border-gray-700/50">
              Garment IoT Operations
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex items-center">
              <Search size={15} className="absolute left-3 text-gray-500 pointer-events-none" />
              <input
                type="text"
                placeholder="search machine, line, tag..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadData()}
                className="bg-[#0b1120] border border-[#1f293d] text-gray-100 pl-9 pr-3 py-2 rounded-lg text-xs w-56 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
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

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-[#0b1120] border border-[#1f293d] text-gray-200 px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="All">All Priorities</option>
              <option value="Urgent">⚡ Urgent</option>
              <option value="Critical">🔴 Critical</option>
              <option value="High">🟠 High</option>
              <option value="Medium">🟡 Medium</option>
              <option value="Low">🟢 Low</option>
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

            {/* View Mode Toggle: Grid or List */}
            <div className="flex items-center bg-[#0b1120] border border-[#1f293d] rounded-lg p-0.5 shadow-inner">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                title="View as List"
                className={`p-1.5 rounded-md text-xs transition-all ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
                }`}
              >
                <LayoutList size={14} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                title="View as Grid"
                className={`p-1.5 rounded-md text-xs transition-all ${
                  viewMode === 'grid'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
                }`}
              >
                <LayoutGrid size={14} />
              </button>
            </div>

            {/* Raise Support Ticket Button (Company Admin only; hidden for Super Admin / Solution Provider) */}
            {currentUser.role === 'company_admin' ? (
              <button
                type="button"
                onClick={() => setIsRaiseModalOpen(true)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-md transition-all flex items-center gap-1.5"
              >
                <Plus size={15} />
                Raise Support Ticket
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-purple-500/10 border border-purple-500/25 text-purple-300">
                <Shield size={13} className="text-purple-400" />
                <span>Monitoring Available Tickets</span>
              </div>
            )}
          </div>
        </div>

        {/* Content Area: List View or Grid View */}
        {viewMode === 'list' ? (
          /* Table List View */
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs text-gray-200 border-collapse">
              <thead>
                <tr className="bg-[#0d1527] border-b border-[#1f293d] text-gray-400 font-semibold tracking-wider">
                  <th className="py-3 px-4">Ticket ID</th>
                  <th className="py-3 px-4">Title / Machine Incident</th>
                  <th className="py-3 px-4">System & Location</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Priority</th>
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
                        <span>
                          {currentUser.role === 'company_admin'
                            ? 'No tickets found. Click "Raise Support Ticket" to create one.'
                            : 'No support tickets available for support at the moment.'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  tickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-gray-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-400">
                        {ticket.ticket_code}
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-medium text-white truncate">{ticket.title}</div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {ticket.production_impact && ticket.production_impact !== 'No Production Loss' && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                              <AlertTriangle size={10} />
                              {ticket.production_impact}
                            </span>
                          )}
                          {ticket.latest_message && (
                            <span className="text-[11px] text-gray-400 truncate">
                              💬 {ticket.latest_message}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-gray-300">
                        <div className="font-medium">{ticket.affected_system}</div>
                        {(ticket.line_number || ticket.machine_id) && (
                          <div className="text-[11px] text-sky-400/90 font-mono flex items-center gap-1 mt-0.5">
                            <MapPin size={10} className="shrink-0 text-sky-400" />
                            <span>
                              {ticket.line_number || ''}
                              {ticket.line_number && ticket.machine_id ? ' • ' : ''}
                              {ticket.machine_id ? `ID: ${ticket.machine_id}` : ''}
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-gray-400">
                        {ticket.category}
                      </td>

                      <td className="py-3.5 px-4">
                        {renderPriorityBadge(ticket.priority, ticket.urgency)}
                      </td>

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

                      <td className="py-3.5 px-4 text-gray-400 whitespace-nowrap">
                        {formatDate(ticket.created_at)}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setActiveChatTicketId(ticket.id)}
                            className="px-2.5 py-1 rounded-md text-xs font-medium text-blue-400 bg-blue-500/10 hover:bg-blue-600 hover:text-white border border-blue-500/20 transition-all"
                          >
                            View
                          </button>
                          {currentUser.role === 'company_admin' && (
                            <button
                              type="button"
                              onClick={() => setEditingTicket(ticket)}
                              title="Edit support ticket specifications"
                              className="px-2.5 py-1 rounded-md text-xs font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-600 hover:text-white border border-amber-500/20 transition-all flex items-center gap-1"
                            >
                              <Edit3 size={12} />
                              <span>Edit</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Card Grid View */
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading && tickets.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-400 text-xs">
                Loading tickets...
              </div>
            ) : tickets.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-500">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <MessageSquare size={28} />
                  <span className="text-xs">
                    {currentUser.role === 'company_admin'
                      ? 'No tickets found matching your query. Click "Raise Support Ticket" to create one.'
                      : 'No support tickets available for support matching your query.'}
                  </span>
                </div>
              </div>
            ) : (
              tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="bg-[#0f172a] border border-[#1f293d] hover:border-blue-500/40 rounded-xl p-4 flex flex-col justify-between space-y-3 shadow-md transition-all"
                >
                  {/* Card Header: Code, Badges */}
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-blue-400">
                      {ticket.ticket_code}
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {renderPriorityBadge(ticket.priority, ticket.urgency)}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
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
                    </div>
                  </div>

                  {/* Title & Production Impact */}
                  <div>
                    <h3 className="text-sm font-semibold text-white line-clamp-2">
                      {ticket.title}
                    </h3>
                    {ticket.production_impact && ticket.production_impact !== 'No Production Loss' && (
                      <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-red-500/15 text-red-300 border border-red-500/30">
                        <AlertTriangle size={11} className="text-red-400" />
                        <span>{ticket.production_impact}</span>
                      </div>
                    )}
                  </div>

                  {/* System & Category */}
                  <div className="space-y-1.5 text-xs text-gray-400">
                    <div className="flex items-center gap-1.5 text-gray-300">
                      <Cpu size={13} className="text-blue-400 shrink-0" />
                      <span className="truncate">{ticket.affected_system}</span>
                    </div>

                    {(ticket.line_number || ticket.machine_id) && (
                      <div className="flex items-center gap-1.5 text-sky-400 font-mono text-[11px]">
                        <MapPin size={13} className="shrink-0 text-sky-400" />
                        <span className="truncate">
                          {ticket.line_number || ''}
                          {ticket.line_number && ticket.machine_id ? ' • ' : ''}
                          {ticket.machine_id ? `ID: ${ticket.machine_id}` : ''}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 text-gray-400">
                      <Tag size={13} className="text-gray-500 shrink-0" />
                      <span className="truncate">{ticket.category}</span>
                    </div>

                    {/* Troubleshooting checklist completion pill */}
                    {ticket.troubleshooting_checklist && ticket.troubleshooting_checklist.length > 0 && (
                      <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                        <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                        <span>{ticket.troubleshooting_checklist.length} Pre-checks Verified</span>
                      </div>
                    )}
                  </div>

                  {/* Latest Message Snippet */}
                  {ticket.latest_message && (
                    <div className="p-2 bg-[#0b1120] border border-[#1f293d] rounded-lg text-[11px] text-gray-400 truncate">
                      💬 {ticket.latest_message}
                    </div>
                  )}

                  {/* Footer: Date & Action Buttons */}
                  <div className="pt-2 border-t border-[#1f293d] flex items-center justify-between text-[11px] text-gray-400">
                    <div className="flex items-center gap-1">
                      <Clock size={12} className="text-gray-500" />
                      <span>{formatDate(ticket.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {currentUser.role === 'company_admin' && (
                        <button
                          type="button"
                          onClick={() => setEditingTicket(ticket)}
                          title="Edit support ticket specifications"
                          className="px-2.5 py-1 rounded-md text-xs font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-600 hover:text-white border border-amber-500/20 transition-all flex items-center gap-1"
                        >
                          <Edit3 size={12} />
                          <span>Edit</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveChatTicketId(ticket.id)}
                        className="px-3 py-1 rounded-md text-xs font-medium text-blue-400 bg-blue-500/10 hover:bg-blue-600 hover:text-white border border-blue-500/20 transition-all"
                      >
                        View
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Footer info */}
        <div className="p-4 border-t border-[#1f293d] flex items-center justify-between text-xs text-gray-400">
          <span>Showing {tickets.length} ticket(s) ({viewMode} view)</span>
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

      {/* Edit Ticket Modal for Company Owner */}
      <EditTicketModal
        isOpen={!!editingTicket}
        onClose={() => setEditingTicket(null)}
        ticket={editingTicket}
        currentUser={currentUser}
        categories={categories}
        systems={systems}
        onTicketUpdated={(updated) => {
          handleTicketUpdated(updated);
          setEditingTicket(null);
        }}
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
