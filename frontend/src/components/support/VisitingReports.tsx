import React, { useState, useEffect } from 'react';
import {
  Calendar,
  MapPin,
  User,
  Phone,
  Users,
  CheckCircle2,
  Search,
  Plus,
  RefreshCw,
  ShieldCheck,
  FileCheck2,
  LayoutList,
  LayoutGrid,
  X,
  ListTodo,
  CheckSquare,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Flag,
  ShieldAlert,
  AlertCircle,
  Lock
} from 'lucide-react';
import type { VisitingReport, CurrentUser, PrechecklistAuditItem } from './types';
import { api } from './api';
import { ScheduleVisitModal } from './ScheduleVisitModal';
import { AcknowledgeVisitModal } from './AcknowledgeVisitModal';

interface VisitingReportsProps {
  currentUser: CurrentUser;
}

export const VisitingReports: React.FC<VisitingReportsProps> = ({ currentUser }) => {
  const [reports, setReports] = useState<VisitingReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [selectedVisitForAck, setSelectedVisitForAck] = useState<VisitingReport | null>(null);

  // Expanded checklist tasks state for interactive cards
  const [expandedChecklists, setExpandedChecklists] = useState<Record<string, boolean>>({});

  const toggleChecklistExpand = (reportId: string) => {
    setExpandedChecklists((prev) => ({
      ...prev,
      [reportId]: !prev[reportId],
    }));
  };

  // Completion modal with Checklist resolution
  const [completeModalVisit, setCompleteModalVisit] = useState<VisitingReport | null>(null);
  const [completionAudit, setCompletionAudit] = useState<PrechecklistAuditItem[]>([]);
  const [completeSummary, setCompleteSummary] = useState('');
  const [flagReason, setFlagReason] = useState('');
  const [problemSolved, setProblemSolved] = useState<boolean | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [completeHostName, setCompleteHostName] = useState('');
  const [completeHostPhone, setCompleteHostPhone] = useState('');
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  // Client Resolution Confirmation modal state (Company Admin sign-off)
  const [clientConfirmVisit, setClientConfirmVisit] = useState<VisitingReport | null>(null);
  const [clientProblemSolved, setClientProblemSolved] = useState<boolean | null>(null);
  const [clientResolutionNotes, setClientResolutionNotes] = useState('');
  const [clientConfirmError, setClientConfirmError] = useState<string | null>(null);
  const [submittingClientConfirm, setSubmittingClientConfirm] = useState(false);

  // Debounce search input so typing automatically queries without requiring Enter
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset pagination on filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, priorityFilter, debouncedSearch]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await api.getVisitingReports({
        role: currentUser.role,
        companyName: currentUser.company_name,
        status: statusFilter,
        priority: priorityFilter,
        search: debouncedSearch.trim()
      });
      setReports(data);
    } catch (err) {
      console.error('Failed to load visiting reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [currentUser.role, currentUser.company_name, statusFilter, priorityFilter, debouncedSearch]);

  // Real-time synchronization for visiting reports
  useEffect(() => {
    const wsUrl = api.getWebSocketNotificationsUrl();
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const eventType = payload.type || payload.event;
        if (
          eventType === 'visiting_report_scheduled' ||
          eventType === 'visiting_report_acknowledged' ||
          eventType === 'visiting_report_updated' ||
          eventType === 'visiting_report_completed' ||
          eventType === 'visiting_report_client_confirmed'
        ) {
          loadReports();
        }
      } catch (e) {
        console.error('Visiting notification parse error:', e);
      }
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  const handleVisitScheduled = (newVisit: VisitingReport) => {
    setReports((prev) => [newVisit, ...prev]);
  };

  const handleVisitAcknowledged = (updated: VisitingReport) => {
    setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  // Open Completion Modal and populate the audit and the resolution state
  const handleOpenCompleteModal = (report: VisitingReport) => {
    setCompleteModalVisit(report);
    setCompletionError(null);
    setFlagReason(report.flag_reason || '');
    setCompleteHostName(report.host_name || '');
    setCompleteHostPhone(report.host_phone || '');

    // The company's claimed pre-ticket checks, audited on-site.
    const prechecks = report.ticket_prechecklist || [];
    setCompletionAudit(
      prechecks.map((item, index) => ({
        id: `pre-${index}`,
        task: item.label,
        status: 'unverified',
        note: ''
      }))
    );

    setProblemSolved(
      typeof report.is_resolved === 'boolean' ? report.is_resolved : null
    );
    setResolutionNotes(report.resolution_notes || '');
    setCompleteSummary(report.service_summary || '');
  };

  const toggleAuditFlag = (id: string | undefined) => {
    setCompletionAudit((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: item.status === 'flagged' ? 'unverified' : 'flagged' }
          : item
      )
    );
    setCompletionError(null);
  };

  const handleCompleteSubmit = async () => {
    if (!completeModalVisit) return;
    try {
      setCompletionError(null);
      const flaggedItems = completionAudit.filter((item) => item.status === 'flagged');

      if (problemSolved === null) {
        setCompletionError('Confirm whether the visit solved the problem.');
        return;
      }

      if (flaggedItems.length > 0 && !flagReason.trim()) {
        setCompletionError('Add the reason for flagging the company pre-ticket check(s).');
        return;
      }

      setCompleting(true);
      const updated = await api.completeVisit(completeModalVisit.id, {
        service_summary: completeSummary.trim(),
        completed_by: currentUser.name,
        user_role: currentUser.role,
        prechecklist_audit: completionAudit,
        is_flagged: flaggedItems.length > 0,
        flag_reason: flagReason.trim(),
        is_resolved: problemSolved,
        resolution_notes: resolutionNotes.trim(),
        host_name: completeHostName.trim(),
        host_phone: completeHostPhone.trim()
      });
      setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setCompleteModalVisit(null);
      setCompleteSummary('');
      setFlagReason('');
      setProblemSolved(null);
      setResolutionNotes('');
      setCompleteHostName('');
      setCompleteHostPhone('');
    } catch (err: any) {
      setCompletionError(err.message || 'Failed to complete visit');
    } finally {
      setCompleting(false);
    }
  };

  const handleClientConfirmSubmit = async () => {
    if (!clientConfirmVisit) return;
    if (clientProblemSolved === null) {
      setClientConfirmError('Confirm whether the problem is solved.');
      return;
    }
    try {
      setSubmittingClientConfirm(true);
      setClientConfirmError(null);
      const updated = await api.confirmClientResolution(
        clientConfirmVisit.id,
        {
          client_is_resolved: clientProblemSolved,
          client_resolution_notes: clientResolutionNotes.trim(),
          client_resolved_by: currentUser.name,
          user_role: currentUser.role
        }
      );
      setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setClientConfirmVisit(null);
      setClientProblemSolved(null);
      setClientResolutionNotes('');
    } catch (err: any) {
      setClientConfirmError(err.message || 'Failed to submit resolution confirmation');
    } finally {
      setSubmittingClientConfirm(false);
    }
  };

  const handleToggleVisitorVisibility = async (report: VisitingReport) => {
    try {
      const nextVisible = !(report.show_visitor_count !== false);
      const updated = await api.updateVisit(
        report.id,
        { show_visitor_count: nextVisible },
        currentUser.role,
        currentUser.name
      );
      setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err: any) {
      alert(err.message || 'Failed to update headcount visibility');
    }
  };

  const isCompanyAdmin = currentUser.role === 'company_admin';
  const isSuperAdmin = currentUser.role === 'super_admin';

  // Super admins always see headcount; company admins only when the toggle is on.
  const canViewHeadcount = (report: VisitingReport) =>
    isSuperAdmin || report.show_visitor_count !== false;

  // Pagination Calculations
  const totalItems = reports.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedReports = reports.slice(startIndex, endIndex);

  return (
    <div className="w-full">
      {/* Main Card (Primary White Background) */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {/* Toolbar Header */}
        <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-slate-50/70">
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            {isCompanyAdmin ? 'Visiting Reports' : 'Visiting Logs'}
          </h2>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative flex items-center">
              <Search size={15} className="absolute left-3 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-white border border-slate-300 text-slate-800 pl-9 pr-8 py-2 rounded-lg text-xs w-56 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors shadow-xs"
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

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-300 text-slate-700 px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-blue-500 cursor-pointer shadow-xs"
            >
              <option value="All">All Statuses</option>
              <option value="Pending Acknowledgement">Pending Acknowledgement</option>
              <option value="Acknowledged">Acknowledged</option>
              <option value="Completed">Completed</option>
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

            {/* Refresh */}
            <button
              type="button"
              onClick={loadReports}
              title="Refresh reports"
              className="p-2 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 transition-colors shadow-xs"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-0.5 shadow-inner">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                title="View as List"
                className={`p-1.5 rounded-md text-xs transition-all ${viewMode === 'list'
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
                className={`p-1.5 rounded-md text-xs transition-all ${viewMode === 'grid'
                    ? 'bg-white text-blue-600 shadow-sm font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                <LayoutGrid size={14} />
              </button>
            </div>

            {/* Super Admin Dispatch Visit Button */}
            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => setIsScheduleOpen(true)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-all flex items-center gap-1.5"
              >
                <Plus size={15} />
                <span>Schedule Visit</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Area: Grid View or List View */}
        {viewMode === 'grid' ? (
          /* Cards Grid View */
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {loading && reports.length === 0 ? (
              <div className="col-span-full text-center py-12 text-slate-400 text-xs">
                Loading visiting logs...
              </div>
            ) : reports.length === 0 ? (
              <div className="col-span-full text-center py-12 text-slate-400">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <FileCheck2 size={32} className="text-slate-300" />
                  <span className="text-xs">No visiting reports found.</span>
                </div>
              </div>
            ) : (
              paginatedReports.map((report) => {
                const leadName = report.lead_engineer || report.visiting_engineers;
                const leadPhone = report.lead_engineer_phone;
                const totalVisitors = report.total_visitors;
                const showHeadcount =
                  canViewHeadcount(report) && typeof totalVisitors === 'number' && totalVisitors > 0;
                const visitReasons = report.visit_reasons || [];
                const internalReasons = report.internal_visit_reasons || [];
                const flaggedAudit = (report.prechecklist_audit || []).filter(
                  (item) => item.status === 'flagged'
                );
                const isExpanded = Boolean(expandedChecklists[report.id]);

                return (
                  <div
                    key={report.id}
                    className="bg-white border border-slate-200 hover:border-slate-300 hover:shadow-md rounded-xl p-4 flex flex-col justify-between space-y-3 shadow-xs transition-all"
                  >
                    <div>
                      {/* Top Bar: Code, Priority, Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-mono text-xs font-bold text-indigo-600">
                            {report.visit_code}
                          </span>
                          <h3 className="text-sm font-bold text-slate-900 mt-0.5 line-clamp-1">
                            {report.target_system}
                          </h3>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {report.priority && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${report.priority === 'Urgent' || report.priority === 'Critical'
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : report.priority === 'High'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                                }`}
                            >
                              {report.priority}
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${report.status === 'Completed'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : report.status === 'Acknowledged'
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                          >
                            {report.status}
                          </span>
                        </div>
                      </div>

                      {/* Delegation & Phone Card */}
                      <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200/80 rounded-lg space-y-1.5 text-xs text-slate-700">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="flex items-center gap-1 font-semibold text-slate-900">
                            <User size={13} className="text-indigo-600 shrink-0" />
                            <span className="truncate">{leadName}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            {showHeadcount && (
                              <span className="flex items-center gap-1 font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                                <Users size={11} />
                                <span>{totalVisitors} {totalVisitors === 1 ? 'person' : 'persons'}</span>
                              </span>
                            )}
                            {isSuperAdmin && (
                              <button
                                type="button"
                                onClick={() => handleToggleVisitorVisibility(report)}
                                title={
                                  report.show_visitor_count !== false
                                    ? 'Headcount visible to company owner — click to hide'
                                    : 'Headcount hidden from company owner — click to show'
                                }
                                className={`p-1 rounded border transition-colors ${
                                  report.show_visitor_count !== false
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                                    : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
                                }`}
                              >
                                {report.show_visitor_count !== false ? <Eye size={11} /> : <EyeOff size={11} />}
                              </button>
                            )}
                          </span>
                        </div>

                        {leadPhone && (
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <Phone size={12} className="text-emerald-600 shrink-0" />
                            <a href={`tel:${leadPhone}`} className="text-blue-600 hover:underline font-medium">
                              {leadPhone}
                            </a>
                          </div>
                        )}

                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-0.5 border-t border-slate-200/60">
                          <Calendar size={12} className="text-slate-400 shrink-0" />
                          <span>Date: <strong className="text-slate-700">{report.scheduled_date}</strong></span>
                        </div>
                      </div>

                      {/* Reason for the visit */}
                      <div className="mt-3 space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                          <span className="flex items-center gap-1">
                            <ListTodo size={12} className="text-indigo-600" />
                            <span>Reason for Visit</span>
                          </span>
                          {visitReasons.length > 0 && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {visitReasons.length} Reason{visitReasons.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>

                        {visitReasons.length > 0 ? (
                          <div className="space-y-1 pt-0.5">
                            {visitReasons.map((reason, idx) => (
                              <div
                                key={reason.id || idx}
                                className="text-[11px] text-slate-600 flex items-start gap-1.5 leading-tight"
                              >
                                <span className="mt-0.5 shrink-0 text-indigo-500">•</span>
                                <span className="break-words leading-tight">{reason.label}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-500 line-clamp-2">
                            {report.purpose}
                          </p>
                        )}
                      </div>

                      {/* Welcoming person on the factory side */}
                      {report.host_name && (
                        <div className="mt-2 p-2 bg-slate-50 border border-slate-200/80 rounded-lg flex items-center gap-1.5 flex-wrap text-[11px] text-slate-700">
                          <User size={12} className="text-indigo-600 shrink-0" />
                          <span className="text-slate-500 font-medium">Welcoming Person:</span>
                          <span className="font-semibold text-slate-900">{report.host_name}</span>
                          {report.host_phone && (
                            <span className="flex items-center gap-1 text-slate-500">
                              <span>•</span>
                              <Phone size={10} className="text-emerald-600" />
                              <a href={`tel:${report.host_phone}`} className="text-blue-600 hover:underline font-medium">
                                {report.host_phone}
                              </a>
                            </span>
                          )}
                        </div>
                      )}

                      {/* Problem resolution status on both provider and client sides */}
                      {report.status === 'Completed' && (
                        <div className="mt-2 space-y-1.5">
                          {/* Provider Resolution */}
                          {typeof report.is_resolved === 'boolean' && (
                            <div
                              className={`p-2 rounded-lg border space-y-0.5 ${
                                report.is_resolved
                                  ? 'bg-emerald-50 border-emerald-200'
                                  : 'bg-amber-50 border-amber-200'
                              }`}
                            >
                              <div
                                className={`text-[10px] font-bold uppercase tracking-wide flex items-center justify-between gap-1 ${
                                  report.is_resolved ? 'text-emerald-800' : 'text-amber-800'
                                }`}
                              >
                                <span className="flex items-center gap-1">
                                  {report.is_resolved ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                                  {report.is_resolved ? 'Provider: Problem Solved' : 'Provider: Problem Not Solved'}
                                </span>
                                {report.completed_by && (
                                  <span className="text-[9px] font-normal lowercase opacity-80">
                                    by {report.completed_by}
                                  </span>
                                )}
                              </div>
                              {report.resolution_notes && (
                                <p className="text-[10px] text-slate-700 leading-relaxed">
                                  {report.resolution_notes}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Client Confirmation */}
                          {typeof report.client_is_resolved === 'boolean' ? (
                            <div
                              className={`p-2 rounded-lg border space-y-0.5 ${
                                report.client_is_resolved
                                  ? 'bg-teal-50 border-teal-200'
                                  : 'bg-rose-50 border-rose-200'
                              }`}
                            >
                              <div
                                className={`text-[10px] font-bold uppercase tracking-wide flex items-center justify-between gap-1 ${
                                  report.client_is_resolved ? 'text-teal-800' : 'text-rose-800'
                                }`}
                              >
                                <span className="flex items-center gap-1">
                                  {report.client_is_resolved ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                                  {report.client_is_resolved ? 'Client: Problem Solved' : 'Client: Problem Not Solved'}
                                </span>
                                {report.client_resolved_by && (
                                  <span className="text-[9px] font-normal lowercase opacity-80">
                                    by {report.client_resolved_by}
                                  </span>
                                )}
                              </div>
                              {report.client_resolution_notes && (
                                <p className="text-[10px] text-slate-700 leading-relaxed">
                                  {report.client_resolution_notes}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between text-[10px] text-slate-500 font-medium">
                              <span>Client Sign-off: Pending</span>
                              {isCompanyAdmin && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setClientConfirmVisit(report);
                                    setClientProblemSolved(null);
                                    setClientResolutionNotes('');
                                    setClientConfirmError(null);
                                  }}
                                  className="text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                                >
                                  Sign off
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Confidential reason for the visit (never shown to company) */}
                      {isSuperAdmin && internalReasons.length > 0 && (
                        <div className="mt-2 p-2 bg-purple-50/60 border border-purple-200 rounded-lg space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-bold text-purple-800 uppercase tracking-wide">
                            <span className="flex items-center gap-1">
                              <Lock size={10} />
                              Confidential Reason
                            </span>
                            <span className="text-purple-600">{internalReasons.length}</span>
                          </div>
                          {internalReasons.map((reason, idx) => (
                            <div key={reason.id || idx} className="text-[10px] text-purple-900 flex items-start gap-1.5 leading-tight">
                              <span className="mt-0.5 shrink-0 text-purple-400">•</span>
                              <span className="break-words">{reason.label}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Super Admin audit flag */}
                      {isSuperAdmin && report.is_flagged && (
                        <div className="mt-2 p-2.5 bg-red-50 border border-red-200 rounded-lg space-y-1">
                          <div className="text-[10px] font-bold text-red-800 uppercase tracking-wide flex items-center gap-1">
                            <Flag size={11} />
                            Pre-ticket Checks Flagged
                          </div>
                          {report.flag_reason && (
                            <p className="text-[10px] text-red-800 leading-relaxed">{report.flag_reason}</p>
                          )}
                          {flaggedAudit.map((item, idx) => (
                            <div key={item.id || idx} className="text-[10px] text-red-700 flex items-start gap-1">
                              <span className="mt-0.5">⚑</span>
                              <span>{item.task}</span>
                            </div>
                          ))}
                          {report.flagged_by && (
                            <p className="text-[9px] text-red-500">
                              Flagged by {report.flagged_by}
                              {report.flagged_at ? ` • ${new Date(report.flagged_at).toLocaleDateString()}` : ''}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions Row */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-400 truncate max-w-[150px]">
                        {report.company_name}
                      </span>

                      {/* Company Admin Acknowledge Button */}
                      {isCompanyAdmin && report.status === 'Pending Acknowledgement' && (
                        <button
                          type="button"
                          onClick={() => setSelectedVisitForAck(report)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm transition-all flex items-center gap-1.5"
                        >
                          <ShieldCheck size={14} />
                          <span>Acknowledge</span>
                        </button>
                      )}

                      {/* Super Admin Complete Button */}
                      {isSuperAdmin && report.status === 'Acknowledged' && (
                        <button
                          type="button"
                          onClick={() => handleOpenCompleteModal(report)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-sm transition-all flex items-center gap-1.5"
                        >
                          <CheckCircle2 size={14} />
                          <span>Complete Visit</span>
                        </button>
                      )}

                      {/* Company Admin Client Confirm Button */}
                      {isCompanyAdmin && report.status === 'Completed' && typeof report.client_is_resolved !== 'boolean' && (
                        <button
                          type="button"
                          onClick={() => {
                            setClientConfirmVisit(report);
                            setClientProblemSolved(null);
                            setClientResolutionNotes('');
                            setClientConfirmError(null);
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-all flex items-center gap-1.5"
                        >
                          <CheckCircle2 size={14} />
                          <span>Confirm Resolution</span>
                        </button>
                      )}

                      {/* Already Finished State */}
                      {((report.status === 'Completed' && (!isCompanyAdmin || typeof report.client_is_resolved === 'boolean')) || (isCompanyAdmin && report.status === 'Acknowledged')) && (
                        <span className="text-[11px] text-slate-500 font-medium">
                          {report.status === 'Completed' ? '✓ Logged Complete' : '✓ Acknowledged'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* List Table View */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Visit Ref</th>
                  <th className="py-3 px-4">Target System</th>
                  <th className="py-3 px-4">Scheduled Date</th>
                  <th className="py-3 px-4">Visiting Delegation & Contact</th>
                  <th className="py-3 px-4">Checklist Objectives</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {loading && reports.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Loading visiting logs...
                    </td>
                  </tr>
                ) : paginatedReports.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No visiting reports found.
                    </td>
                  </tr>
                ) : (
                  paginatedReports.map((report) => {
                    const leadName = report.lead_engineer || report.visiting_engineers;
                    const leadPhone = report.lead_engineer_phone;
                    const totalVisitors = report.total_visitors;
                    const showHeadcount =
                      canViewHeadcount(report) && typeof totalVisitors === 'number' && totalVisitors > 0;
                    const visitReasons = report.visit_reasons || [];
                    const internalReasons = report.internal_visit_reasons || [];
                    const flaggedAudit = (report.prechecklist_audit || []).filter(
                      (item) => item.status === 'flagged'
                    );
                    const isExpanded = Boolean(expandedChecklists[report.id]);

                    return (
                      <tr key={report.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">
                          {report.visit_code}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          <div>{report.target_system}</div>
                          <div className="text-[10px] text-slate-400 font-normal">
                            {report.company_name}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-medium text-slate-800">{report.scheduled_date}</span>
                          {report.floor_location && (
                            <div className="text-[10px] text-slate-400">{report.floor_location}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-900 flex items-center gap-1.5 flex-wrap">
                            <span>{leadName}</span>
                            {showHeadcount && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-100">
                                {totalVisitors} {totalVisitors === 1 ? 'person' : 'persons'}
                              </span>
                            )}
                            {isSuperAdmin && (
                              <button
                                type="button"
                                onClick={() => handleToggleVisitorVisibility(report)}
                                title={
                                  report.show_visitor_count !== false
                                    ? 'Headcount visible to company owner — click to hide'
                                    : 'Headcount hidden from company owner — click to show'
                                }
                                className={`p-1 rounded border transition-colors ${
                                  report.show_visitor_count !== false
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                                    : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
                                }`}
                              >
                                {report.show_visitor_count !== false ? <Eye size={11} /> : <EyeOff size={11} />}
                              </button>
                            )}
                            {isSuperAdmin && report.is_flagged && (
                              <span
                                title={report.flag_reason || 'Company checklist flagged'}
                                className="text-[10px] px-1.5 py-0.2 rounded bg-red-50 text-red-700 font-bold border border-red-200 flex items-center gap-0.5"
                              >
                                <Flag size={9} />
                                Flagged
                              </span>
                            )}
                          </div>
                          {leadPhone && (
                            <a href={`tel:${leadPhone}`} className="text-[11px] text-blue-600 hover:underline">
                              {leadPhone}
                            </a>
                          )}
                          {report.host_name && (
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Welcoming: <strong className="text-slate-700">{report.host_name}</strong>
                              {report.host_phone ? ` · ${report.host_phone}` : ''}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 align-top">
                          {visitReasons.length > 0 ? (
                            <div className="space-y-1">
                              <button
                                type="button"
                                onClick={() => toggleChecklistExpand(report.id)}
                                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <span>{visitReasons.length} Visit Reason{visitReasons.length !== 1 ? 's' : ''}</span>
                                {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                              </button>
                              {isExpanded && (
                                <div className="mt-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200 space-y-1 max-h-48 overflow-y-auto text-[11px] text-slate-600 shadow-inner">
                                  <div className="text-[9px] font-bold uppercase tracking-wide text-indigo-700">
                                    Reason for Visit
                                  </div>
                                  {visitReasons.map((reason, idx) => (
                                    <div key={reason.id || idx} className="flex items-start gap-1.5 leading-tight">
                                      <span className="mt-0.5 shrink-0 text-indigo-500">•</span>
                                      <span className="break-words">{reason.label}</span>
                                    </div>
                                  ))}

                                  {isSuperAdmin && internalReasons.length > 0 && (
                                    <div className="mt-1.5 pt-1.5 border-t border-purple-200 space-y-1">
                                      <div className="text-[9px] font-bold uppercase tracking-wide text-purple-700 flex items-center gap-1">
                                        <Lock size={9} />
                                        Confidential Reason
                                      </div>
                                      {internalReasons.map((reason, idx) => (
                                        <div key={reason.id || idx} className="flex items-start gap-1.5 leading-tight text-purple-900">
                                          <span className="mt-0.5 shrink-0 text-purple-400">•</span>
                                          <span className="break-words">{reason.label}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {isSuperAdmin && report.is_flagged && (
                                    <div className="mt-1.5 pt-1.5 border-t border-red-200 space-y-1">
                                      <div className="text-[9px] font-bold uppercase tracking-wide text-red-700 flex items-center gap-1">
                                        <ShieldAlert size={9} />
                                        Pre-ticket Checks Flagged
                                      </div>
                                      {report.flag_reason && (
                                        <p className="text-[10px] text-red-700 leading-tight">{report.flag_reason}</p>
                                      )}
                                      {flaggedAudit.map((item, idx) => (
                                        <div key={item.id || idx} className="text-[10px] text-red-700 flex items-start gap-1">
                                          <span>⚑</span>
                                          <span>{item.task}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500 truncate max-w-xs block">
                              {report.purpose}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${report.status === 'Completed'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : report.status === 'Acknowledged'
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                          >
                            {report.status}
                          </span>
                          {report.status === 'Completed' && (
                            <div className="mt-1 space-y-0.5">
                              {typeof report.is_resolved === 'boolean' && (
                                <div
                                  className={`text-[10px] font-semibold ${
                                    report.is_resolved ? 'text-emerald-700' : 'text-amber-700'
                                  }`}
                                >
                                  {report.is_resolved ? 'Provider: Solved' : 'Provider: Not Solved'}
                                </div>
                              )}
                              {typeof report.client_is_resolved === 'boolean' ? (
                                <div
                                  className={`text-[10px] font-semibold ${
                                    report.client_is_resolved ? 'text-teal-700' : 'text-rose-700'
                                  }`}
                                >
                                  {report.client_is_resolved ? 'Client: Solved' : 'Client: Not Solved'}
                                </div>
                              ) : (
                                <div className="text-[10px] text-slate-400">
                                  Client: Pending
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {isCompanyAdmin && report.status === 'Pending Acknowledgement' && (
                            <button
                              type="button"
                              onClick={() => setSelectedVisitForAck(report)}
                              className="px-3 py-1 rounded-md text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-xs"
                            >
                              Acknowledge
                            </button>
                          )}

                          {isSuperAdmin && report.status === 'Acknowledged' && (
                            <button
                              type="button"
                              onClick={() => handleOpenCompleteModal(report)}
                              className="px-3 py-1 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-xs"
                            >
                              Complete
                            </button>
                          )}

                          {isCompanyAdmin && report.status === 'Completed' && typeof report.client_is_resolved !== 'boolean' && (
                            <button
                              type="button"
                              onClick={() => {
                                setClientConfirmVisit(report);
                                setClientProblemSolved(null);
                                setClientResolutionNotes('');
                                setClientConfirmError(null);
                              }}
                              className="px-3 py-1 rounded-md text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-xs"
                            >
                              Confirm
                            </button>
                          )}

                          {((report.status === 'Completed' && (!isCompanyAdmin || typeof report.client_is_resolved === 'boolean')) || (isCompanyAdmin && report.status === 'Acknowledged')) && (
                            <span className="text-[11px] text-slate-400 italic">
                              {report.status === 'Completed' ? 'Logged' : 'Confirmed'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <span>
              Showing <strong>{totalItems === 0 ? 0 : startIndex + 1}</strong> to <strong>{endIndex}</strong> of <strong>{totalItems}</strong> reports
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
                <option value={3}>3 per page</option>
                <option value={6}>6 per page</option>
                <option value={12}>12 per page</option>
                <option value={24}>24 per page</option>
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
                // Show first, last, and window around currentPage
                if (pg === 1 || pg === totalPages || (pg >= currentPage - 1 && pg <= currentPage + 1)) {
                  return (
                    <button
                      key={pg}
                      type="button"
                      onClick={() => setCurrentPage(pg)}
                      className={`min-w-[28px] h-7 px-2 rounded text-xs font-semibold transition-all ${currentPage === pg
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

      {/* Schedule Visit Modal */}
      <ScheduleVisitModal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        currentUser={currentUser}
        onVisitScheduled={handleVisitScheduled}
      />

      {/* Acknowledge Visit Modal */}
      <AcknowledgeVisitModal
        visit={selectedVisitForAck}
        isOpen={!!selectedVisitForAck}
        onClose={() => setSelectedVisitForAck(null)}
        currentUser={currentUser}
        onVisitAcknowledged={handleVisitAcknowledged}
      />

      {/* Super Admin Complete Visit Modal with Checklist Resolution & Audit Flags */}
      {completeModalVisit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => setCompleteModalVisit(null)}
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Complete Visit</h3>
              </div>
              <button
                onClick={() => setCompleteModalVisit(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                Visit: <strong className="text-indigo-600">{completeModalVisit.visit_code}</strong> • {completeModalVisit.target_system} ({completeModalVisit.company_name})
              </div>

              {completionError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2 shadow-sm">
                  <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
                  <span>{completionError}</span>
                </div>
              )}

              {/* Welcoming person */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Welcoming Person</label>
                  <input
                    type="text"
                    value={completeHostName}
                    onChange={(e) => setCompleteHostName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-indigo-500 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Welcoming Person Phone</label>
                  <input
                    type="tel"
                    value={completeHostPhone}
                    onChange={(e) => setCompleteHostPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-indigo-500 shadow-sm"
                  />
                </div>
              </div>

              {/* Reason for Visit (Client-facing) */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <ListTodo size={13} className="text-indigo-600" />
                  <span>Reason for Visit</span>
                </label>
                {(completeModalVisit.visit_reasons || []).length > 0 ? (
                  <div className="space-y-1">
                    {(completeModalVisit.visit_reasons || []).map((reason, idx) => (
                      <div key={reason.id || idx} className="text-[11px] text-slate-700 flex items-start gap-1.5">
                        <span className="mt-0.5 shrink-0 text-indigo-500">•</span>
                        <span className="break-words">{reason.label}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-600">{completeModalVisit.purpose}</p>
                )}
              </div>

              {/* Confidential reason for the visit (provider only) */}
              {(completeModalVisit.internal_visit_reasons || []).length > 0 && (
                <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-3.5 space-y-2">
                  <label className="text-xs font-bold text-purple-950 uppercase tracking-wide flex items-center gap-1.5">
                    <Lock size={13} className="text-purple-600" />
                    <span>Confidential Reason for Visit</span>
                  </label>
                  <div className="space-y-1">
                    {(completeModalVisit.internal_visit_reasons || []).map((reason, idx) => (
                      <div key={reason.id || idx} className="text-[11px] text-purple-900 flex items-start gap-1.5">
                        <span className="mt-0.5 shrink-0 text-purple-400">•</span>
                        <span className="break-words">{reason.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Audit of the company's claimed pre-ticket checks */}
              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    <ListTodo size={14} className="text-indigo-600" />
                    <span>Company Pre-Ticket Checklist Audit</span>
                  </label>
                  <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {completionAudit.filter((c) => c.status === 'flagged').length} of {completionAudit.length} Flagged
                  </span>
                </div>

                {completionAudit.length === 0 ? (
                  <div className="p-3 text-[11px] text-slate-500 bg-slate-50 border border-dashed border-slate-300 rounded-xl">
                    No pre-ticket checks on the linked ticket.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pt-1 pr-1">
                    {completionAudit.map((item, idx) => {
                      const isFlagged = item.status === 'flagged';
                      return (
                        <div
                          key={item.id || idx}
                          className={`p-3 rounded-xl border transition-all flex items-start gap-2.5 ${
                            isFlagged ? 'bg-red-50 border-red-300' : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <span className={`w-5 h-5 rounded-full font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5 ${
                            isFlagged ? 'bg-red-200 text-red-800' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className="text-xs font-semibold leading-relaxed flex-1 min-w-0">
                            {item.task}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleAuditFlag(item.id)}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all shadow-xs flex items-center gap-1 border shrink-0 ${
                              isFlagged
                                ? 'bg-red-600 text-white border-red-600 hover:bg-red-500'
                                : 'bg-white text-red-600 border-red-200 hover:bg-red-50'
                            }`}
                          >
                            <Flag size={12} />
                            <span>{isFlagged ? 'Flagged' : 'Flag'}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Flag reason */}
                <div className={`space-y-1.5 rounded-xl border p-3 ${
                  completionAudit.some((item) => item.status === 'flagged')
                    ? 'bg-red-50/70 border-red-200'
                    : 'bg-slate-50 border-slate-200'
                }`}>
                  <label className="text-[11px] font-semibold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <ShieldAlert size={12} className="text-red-500" />
                      Audit Flag Reason
                    </span>
                  </label>
                  <textarea
                    rows={2}
                    value={flagReason}
                    onChange={(e) => {
                      setFlagReason(e.target.value);
                      setCompletionError(null);
                    }}
                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg p-2.5 text-xs focus:outline-none focus:border-red-400 shadow-sm"
                  />
                </div>
              </div>

              {/* Final confirmation: was the reported problem solved by this visit? */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  {problemSolved === false ? (
                    <XCircle size={14} className="text-amber-600" />
                  ) : (
                    <CheckCircle2 size={14} className="text-emerald-600" />
                  )}
                  <span>Problem Solved?</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setProblemSolved(true);
                      setCompletionError(null);
                    }}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors flex items-center justify-center gap-1.5 ${
                      problemSolved === true
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                    }`}
                  >
                    <CheckCircle2 size={14} />
                    <span>Yes, Solved</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProblemSolved(false);
                      setCompletionError(null);
                    }}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors flex items-center justify-center gap-1.5 ${
                      problemSolved === false
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'
                    }`}
                  >
                    <XCircle size={14} />
                    <span>No, Not Solved</span>
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg p-2.5 text-xs focus:bg-white focus:outline-none focus:border-blue-500 shadow-sm"
                />
              </div>

              {/* Service Summary & Field Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Service Remarks</label>
                <textarea
                  rows={3}
                  value={completeSummary}
                  onChange={(e) => setCompleteSummary(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg p-2.5 text-xs focus:bg-white focus:outline-none focus:border-blue-500 shadow-sm"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCompleteModalVisit(null)}
                  disabled={completing}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition-colors shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCompleteSubmit}
                  disabled={completing}
                  className="px-5 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {completing ? 'Saving...' : 'Confirm Completion'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Client Resolution Confirmation Modal (Company Admin sign-off) */}
      {clientConfirmVisit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => setClientConfirmVisit(null)}
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Confirm Visit Resolution</h3>
              </div>
              <button
                type="button"
                onClick={() => setClientConfirmVisit(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                Visit: <strong className="text-indigo-600">{clientConfirmVisit.visit_code}</strong> • {clientConfirmVisit.target_system} ({clientConfirmVisit.company_name})
              </div>

              {clientConfirmError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2 shadow-sm">
                  <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
                  <span>{clientConfirmError}</span>
                </div>
              )}

              {/* Welcoming person if present */}
              {clientConfirmVisit.host_name && (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2 text-xs text-slate-700">
                  <User size={13} className="text-indigo-600 shrink-0" />
                  <span className="text-slate-500 font-medium">Welcoming Person:</span>
                  <span className="font-semibold text-slate-900">{clientConfirmVisit.host_name}</span>
                  {clientConfirmVisit.host_phone && (
                    <span className="text-slate-500">• {clientConfirmVisit.host_phone}</span>
                  )}
                </div>
              )}

              {/* Reason for Visit */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <ListTodo size={13} className="text-indigo-600" />
                  <span>Reason for Visit</span>
                </label>
                {(clientConfirmVisit.visit_reasons || []).length > 0 ? (
                  <div className="space-y-1 pt-1">
                    {(clientConfirmVisit.visit_reasons || []).map((reason, idx) => (
                      <div key={reason.id || idx} className="text-[11px] text-slate-700 flex items-start gap-1.5 leading-tight">
                        <span className="mt-0.5 shrink-0 text-indigo-500">•</span>
                        <span className="break-words">{reason.label}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-600">{clientConfirmVisit.purpose}</p>
                )}
              </div>

              {/* Provider Resolution Status */}
              {typeof clientConfirmVisit.is_resolved === 'boolean' && (
                <div
                  className={`p-3 rounded-xl border space-y-1 ${
                    clientConfirmVisit.is_resolved
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-amber-50 border-amber-200'
                  }`}
                >
                  <div
                    className={`text-xs font-bold uppercase tracking-wide flex items-center justify-between ${
                      clientConfirmVisit.is_resolved ? 'text-emerald-800' : 'text-amber-800'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {clientConfirmVisit.is_resolved ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                      {clientConfirmVisit.is_resolved ? 'Provider Status: Problem Solved' : 'Provider Status: Problem Not Solved'}
                    </span>
                    {clientConfirmVisit.completed_by && (
                      <span className="text-[10px] font-normal lowercase opacity-80">
                        by {clientConfirmVisit.completed_by}
                      </span>
                    )}
                  </div>
                  {clientConfirmVisit.resolution_notes && (
                    <p className="text-xs text-slate-700 leading-relaxed pt-0.5">
                      {clientConfirmVisit.resolution_notes}
                    </p>
                  )}
                </div>
              )}

              {/* Client Verdict: Problem Solved? */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  {clientProblemSolved === false ? (
                    <XCircle size={14} className="text-rose-600" />
                  ) : (
                    <CheckCircle2 size={14} className="text-teal-600" />
                  )}
                  <span>Problem Solved?</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setClientProblemSolved(true);
                      setClientConfirmError(null);
                    }}
                    className={`px-3 py-2.5 rounded-lg text-xs font-semibold border transition-colors flex items-center justify-center gap-1.5 ${
                      clientProblemSolved === true
                        ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                        : 'bg-white text-teal-700 border-teal-200 hover:bg-teal-50'
                    }`}
                  >
                    <CheckCircle2 size={14} />
                    <span>Yes, Solved</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setClientProblemSolved(false);
                      setClientConfirmError(null);
                    }}
                    className={`px-3 py-2.5 rounded-lg text-xs font-semibold border transition-colors flex items-center justify-center gap-1.5 ${
                      clientProblemSolved === false
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
                    }`}
                  >
                    <XCircle size={14} />
                    <span>No, Not Solved</span>
                  </button>
                </div>
              </div>

              {/* Client Remarks */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Remarks</label>
                <textarea
                  rows={3}
                  value={clientResolutionNotes}
                  onChange={(e) => setClientResolutionNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg p-2.5 text-xs focus:bg-white focus:outline-none focus:border-indigo-500 shadow-sm"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setClientConfirmVisit(null)}
                disabled={submittingClientConfirm}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition-colors shadow-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClientConfirmSubmit}
                disabled={submittingClientConfirm}
                className="px-5 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {submittingClientConfirm ? 'Submitting...' : 'Submit Confirmation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
