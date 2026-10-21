import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  RefreshCw, 
  Clock, 
  MessageSquare, 
  CheckCircle2, 
  Flame, 
  Building2, 
  Shield, 
  Tag, 
  MapPin, 
  Cpu, 
  AlertTriangle,
  LayoutGrid,
  LayoutList,
  Edit3,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import type { Ticket, TicketStats, CurrentUser, TicketPriority, TicketUrgency, SupportTicketProps } from './types';
import { api } from './api';
import { StatCards } from './StatCards';
import { RaiseTicketModal } from './RaiseTicketModal';
import { EditTicketModal } from './EditTicketModal';
import { TicketLiveChatDrawer } from './TicketLiveChatDrawer';
import { GARMENTS_IOT_CATEGORIES } from './iotConfig';

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
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [urgencyFilter, setUrgencyFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const [isRaiseModalOpen, setIsRaiseModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [activeChatTicketId, setActiveChatTicketId] = useState<string | null>(null);

  // Debounce search input so typing automatically queries without requiring Enter
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, urgencyFilter, priorityFilter, categoryFilter, debouncedSearch]);

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
          category: categoryFilter,
          search: debouncedSearch.trim()
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
  }, [currentUser.role, currentUser.company_name, statusFilter, urgencyFilter, priorityFilter, categoryFilter, debouncedSearch]);

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
    setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
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
          ? 'bg-red-50 text-red-700 border-red-200'
          : isUrgent
          ? 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200'
          : isHigh
          ? 'bg-orange-50 text-orange-700 border-orange-200'
          : isMed
          ? 'bg-amber-50 text-amber-700 border-amber-200'
          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
      }`}>
        {(isUrgent || isCritical) && <Flame size={11} className={isCritical ? 'text-red-500' : 'text-fuchsia-600'} />}
        {val}
      </span>
    );
  };

  // Pagination Calculations
  const totalItems = tickets.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedTickets = tickets.slice(startIndex, endIndex);

  return (
    <div className="w-full">
      {/* 1. Stat Cards Metrics */}
      <StatCards stats={stats} />

      {/* 2. Main Ticket Card (Primary White Background) */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {/* Toolbar Header */}
        <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Support Tickets
            </h2>
            <span className="text-xs text-slate-500 bg-slate-200/60 px-2.5 py-0.5 rounded-full font-medium">
              Garment IoT Operations
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input with Clear Button */}
            <div className="relative flex items-center">
              <Search size={15} className="absolute left-3 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="search machine, line, keyword..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-white border border-slate-300 text-slate-800 pl-9 pr-8 py-2 rounded-lg text-xs w-56 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors shadow-xs placeholder-slate-400"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 p-0.5 rounded text-slate-400 hover:text-slate-700 transition-colors"
                  title="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-white border border-slate-300 text-slate-700 px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-blue-500 cursor-pointer max-w-[160px] truncate shadow-xs"
              title="Filter by Problem Category"
            >
              <option value="All">All Categories</option>
              {(categories && categories.length > 0 ? categories : GARMENTS_IOT_CATEGORIES.map((c) => c.category)).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-300 text-slate-700 px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-blue-500 cursor-pointer shadow-xs"
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
              className="bg-white border border-slate-300 text-slate-700 px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-blue-500 cursor-pointer shadow-xs"
            >
              <option value="All">All Priorities</option>
              <option value="Urgent">⚡ Urgent</option>
              <option value="Critical">🔴 Critical</option>
              <option value="High">🟠 High</option>
              <option value="Medium">🟡 Medium</option>
              <option value="Low">🟢 Low</option>
            </select>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={loadData}
              title="Refresh tickets"
              className="p-2 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 transition-colors shadow-xs"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>

            {/* View Mode Toggle: Grid or List */}
            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-0.5 shadow-inner">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                title="View as List"
                className={`p-1.5 rounded-md text-xs transition-all ${
                  viewMode === 'list'
                    ? 'bg-white text-blue-600 shadow-sm font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
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
                    ? 'bg-white text-blue-600 shadow-sm font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <LayoutGrid size={14} />
              </button>
            </div>

            {/* Raise Support Ticket Button */}
            {currentUser.role === 'company_admin' ? (
              <button
                type="button"
                onClick={() => setIsRaiseModalOpen(true)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-sm transition-all flex items-center gap-1.5"
              >
                <Plus size={15} />
                <span>Raise Support Ticket</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-purple-50 border border-purple-200 text-purple-700">
                <Shield size={13} className="text-purple-600" />
                <span>Monitoring Available Tickets</span>
              </div>
            )}
          </div>
        </div>

        {/* Content Area: List View or Grid View */}
        {viewMode === 'list' ? (
          /* Table List View */
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
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
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {loading && tickets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-slate-400">
                      Loading tickets...
                    </td>
                  </tr>
                ) : paginatedTickets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <MessageSquare size={28} className="text-slate-300" />
                        <span>
                          {currentUser.role === 'company_admin'
                            ? 'No tickets found. Click "Raise Support Ticket" to create one.'
                            : 'No support tickets available for support at the moment.'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedTickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                        {ticket.ticket_code}
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-semibold text-slate-900 truncate">{ticket.title}</div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {ticket.production_impact && ticket.production_impact !== 'No Production Loss' && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 font-medium">
                              <AlertTriangle size={10} />
                              {ticket.production_impact}
                            </span>
                          )}
                          {ticket.latest_message && (
                            <span className="text-[11px] text-slate-500 truncate">
                              💬 {ticket.latest_message}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-700">
                        <div className="font-medium text-slate-900">{ticket.affected_system}</div>
                        {(ticket.line_number || ticket.machine_id) && (
                          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                            <MapPin size={10} className="shrink-0 text-slate-400" />
                            <span>
                              {ticket.line_number || ''}
                              {ticket.line_number && ticket.machine_id ? ' • ' : ''}
                              {ticket.machine_id ? `ID: ${ticket.machine_id}` : ''}
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        {ticket.category}
                      </td>

                      <td className="py-3.5 px-4">
                        {renderPriorityBadge(ticket.priority, ticket.urgency)}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
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
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {formatDate(ticket.created_at)}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setActiveChatTicketId(ticket.id)}
                            className="px-2.5 py-1 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-xs transition-all"
                          >
                            View
                          </button>
                          {currentUser.role === 'company_admin' && (
                            <button
                              type="button"
                              onClick={() => setEditingTicket(ticket)}
                              title="Edit support ticket specifications"
                              className="px-2.5 py-1 rounded-md text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition-all flex items-center gap-1 shadow-xs"
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
              <div className="col-span-full text-center py-12 text-slate-400 text-xs">
                Loading tickets...
              </div>
            ) : paginatedTickets.length === 0 ? (
              <div className="col-span-full text-center py-12 text-slate-400">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <MessageSquare size={28} className="text-slate-300" />
                  <span className="text-xs">
                    {currentUser.role === 'company_admin'
                      ? 'No tickets found matching your query. Click "Raise Support Ticket" to create one.'
                      : 'No support tickets available for support matching your query.'}
                  </span>
                </div>
              </div>
            ) : (
              paginatedTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="bg-white border border-slate-200 hover:border-slate-300 hover:shadow-md rounded-xl p-4 flex flex-col justify-between space-y-3 shadow-xs transition-all"
                >
                  {/* Card Header: Code, Badges */}
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-blue-600">
                      {ticket.ticket_code}
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {renderPriorityBadge(ticket.priority, ticket.urgency)}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
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
                    </div>
                  </div>

                  {/* Title & Production Impact */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 line-clamp-2">
                      {ticket.title}
                    </h3>
                    {ticket.production_impact && ticket.production_impact !== 'No Production Loss' && (
                      <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-700 border border-red-200">
                        <AlertTriangle size={11} className="text-red-500" />
                        <span>{ticket.production_impact}</span>
                      </div>
                    )}
                  </div>

                  {/* System & Category */}
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                      <Cpu size={13} className="text-blue-600 shrink-0" />
                      <span className="truncate">{ticket.affected_system}</span>
                    </div>

                    {(ticket.line_number || ticket.machine_id) && (
                      <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
                        <MapPin size={13} className="shrink-0 text-slate-400" />
                        <span className="truncate">
                          {ticket.line_number || ''}
                          {ticket.line_number && ticket.machine_id ? ' • ' : ''}
                          {ticket.machine_id ? `ID: ${ticket.machine_id}` : ''}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Tag size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">{ticket.category}</span>
                    </div>
                  </div>

                  {/* Latest Message Snippet */}
                  {ticket.latest_message && (
                    <div className="p-2 bg-slate-50 border border-slate-200/80 rounded-lg text-[11px] text-slate-600 truncate">
                      💬 {ticket.latest_message}
                    </div>
                  )}

                  {/* Footer: Date & Action Buttons */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <div className="flex items-center gap-1">
                      <Clock size={12} className="text-slate-400" />
                      <span>{formatDate(ticket.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {currentUser.role === 'company_admin' && (
                        <button
                          type="button"
                          onClick={() => setEditingTicket(ticket)}
                          title="Edit support ticket specifications"
                          className="px-2.5 py-1 rounded-md text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition-all flex items-center gap-1 shadow-xs"
                        >
                          <Edit3 size={12} />
                          <span>Edit</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveChatTicketId(ticket.id)}
                        className="px-3 py-1 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-xs transition-all"
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

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <span>
              Showing <strong>{totalItems === 0 ? 0 : startIndex + 1}</strong> to <strong>{endIndex}</strong> of <strong>{totalItems}</strong> tickets
            </span>

            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>Show:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-700 focus:outline-none focus:border-blue-500 shadow-xs cursor-pointer"
              >
                <option value={5}>5 per page</option>
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
              </select>
            </div>
          </div>

          {/* Pagination Navigation */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors shadow-xs"
                title="First Page"
              >
                <ChevronsLeft size={14} />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors shadow-xs"
                title="Previous Page"
              >
                <ChevronLeft size={14} />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => {
                if (pg === 1 || pg === totalPages || (pg >= currentPage - 1 && pg <= currentPage + 1)) {
                  return (
                    <button
                      key={pg}
                      type="button"
                      onClick={() => setCurrentPage(pg)}
                      className={`min-w-[28px] h-7 px-2 rounded text-xs font-semibold transition-all ${
                        currentPage === pg
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {pg}
                    </button>
                  );
                }
                if (pg === currentPage - 2 || pg === currentPage + 2) {
                  return <span key={pg} className="px-1 text-slate-400">...</span>;
                }
                return null;
              })}

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors shadow-xs"
                title="Next Page"
              >
                <ChevronRight size={14} />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors shadow-xs"
                title="Last Page"
              >
                <ChevronsRight size={14} />
              </button>
            </div>
          )}
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
