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
  ChevronUp
} from 'lucide-react';
import type { VisitingReport, CurrentUser, VisitChecklistItem } from './types';
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
  const [completionChecklist, setCompletionChecklist] = useState<VisitChecklistItem[]>([]);
  const [completeSummary, setCompleteSummary] = useState('');
  const [completing, setCompleting] = useState(false);

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
          eventType === 'visiting_report_completed'
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

  // Open Completion Modal and populate checklist
  const handleOpenCompleteModal = (report: VisitingReport) => {
    setCompleteModalVisit(report);
    // Initialize checklist items with solved status (default all solved or preserved)
    const existingChecklist = report.visit_checklist || [];
    if (existingChecklist.length > 0) {
      setCompletionChecklist(
        existingChecklist.map((item) => ({
          ...item,
          status: item.status === 'unsolved' ? 'unsolved' : 'solved'
        }))
      );
    } else {
      // Create fallback checklist from purpose
      const tasks = (report.purpose || 'Calibrate sensors; Test system telemetry').split(/[;\n]/).filter(Boolean);
      setCompletionChecklist(
        tasks.map((t, idx) => ({
          id: `task-${idx}`,
          task: t.trim(),
          status: 'solved'
        }))
      );
    }
    setCompleteSummary(report.service_summary || '');
  };

  const toggleChecklistResolution = (id: string) => {
    setCompletionChecklist((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            status: item.status === 'solved' ? 'unsolved' : 'solved'
          };
        }
        return item;
      })
    );
  };

  const handleCompleteSubmit = async () => {
    if (!completeModalVisit) return;
    try {
      setCompleting(true);
      const solvedCount = completionChecklist.filter((c) => c.status === 'solved').length;
      const totalCount = completionChecklist.length;
      const summaryText = completeSummary.trim() || 
        `${solvedCount} of ${totalCount} checklist objectives resolved on-site.`;

      const updated = await api.completeVisit(
        completeModalVisit.id,
        summaryText,
        currentUser.name,
        currentUser.role,
        completionChecklist
      );
      setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setCompleteModalVisit(null);
      setCompleteSummary('');
    } catch (err: any) {
      alert(err.message || 'Failed to complete visit');
    } finally {
      setCompleting(false);
    }
  };

  const isCompanyAdmin = currentUser.role === 'company_admin';
  const isSuperAdmin = currentUser.role === 'super_admin';

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
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              {isCompanyAdmin ? 'Visiting Reports & Acknowledgements' : 'Visiting Logs (Factory Field Dispatch)'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isCompanyAdmin
                ? 'Review delegation leader, direct phone, and acknowledge action checklist for your factory.'
                : 'Dispatch field engineers with calendar dates and track on-site action checklist resolution.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative flex items-center">
              <Search size={15} className="absolute left-3 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="search visit code, leader, system..."
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

            {/* Super Admin Dispatch Visit Button */}
            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => setIsScheduleOpen(true)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-all flex items-center gap-1.5"
              >
                <Plus size={15} />
                <span>Dispatch Factory Visit</span>
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
                const totalVisitors = report.total_visitors || 1;
                const checklistItems = report.visit_checklist || [];
                const solvedCount = checklistItems.filter((i) => i.status === 'solved').length;
                const totalChecklist = checklistItems.length;
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
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                report.priority === 'Urgent' || report.priority === 'Critical'
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
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              report.status === 'Completed'
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
                          <span className="flex items-center gap-1 font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                            <Users size={11} />
                            <span>{totalVisitors} {totalVisitors === 1 ? 'person' : 'persons'}</span>
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

                      {/* Action Checklist Summary */}
                      <div className="mt-3 space-y-1">
                        <div 
                          className={`flex items-center justify-between text-[11px] font-semibold text-slate-700 ${
                            totalChecklist > 3 ? 'cursor-pointer select-none group' : ''
                          }`}
                          onClick={() => {
                            if (totalChecklist > 3) {
                              toggleChecklistExpand(report.id);
                            }
                          }}
                          title={totalChecklist > 3 ? (isExpanded ? 'Click to show fewer tasks' : 'Click to view all tasks') : undefined}
                        >
                          <span className="flex items-center gap-1 group-hover:text-indigo-600 transition-colors">
                            <ListTodo size={12} className="text-indigo-600" />
                            <span>Action Checklist</span>
                          </span>
                          {totalChecklist > 0 && (
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold transition-colors ${
                              report.status === 'Completed'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : isExpanded
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {report.status === 'Completed' 
                                ? `${solvedCount}/${totalChecklist} Solved` 
                                : `${totalChecklist} Tasks`}
                            </span>
                          )}
                        </div>

                        {checklistItems.length > 0 ? (
                          <div className={`space-y-1 pt-0.5 transition-all ${
                            isExpanded ? 'max-h-60 overflow-y-auto pr-1' : ''
                          }`}>
                            {(isExpanded ? checklistItems : checklistItems.slice(0, 3)).map((item, idx) => (
                              <div key={item.id || idx} className="text-[11px] text-slate-600 flex items-start gap-1.5 leading-tight">
                                <span className={`mt-0.5 shrink-0 ${
                                  item.status === 'solved' ? 'text-emerald-600 font-bold' : 'text-slate-400'
                                }`}>
                                  {item.status === 'solved' ? '✓' : '•'}
                                </span>
                                <span className={isExpanded ? 'break-words leading-tight' : 'truncate'}>{item.task}</span>
                              </div>
                            ))}
                            {checklistItems.length > 3 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleChecklistExpand(report.id);
                                }}
                                className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 pt-0.5 transition-colors group cursor-pointer focus:outline-none"
                              >
                                <span>
                                  {isExpanded
                                    ? 'Show less'
                                    : `+${checklistItems.length - 3} more tasks...`}
                                </span>
                                {isExpanded ? (
                                  <ChevronUp size={12} className="group-hover:-translate-y-0.5 transition-transform" />
                                ) : (
                                  <ChevronDown size={12} className="group-hover:translate-y-0.5 transition-transform" />
                                )}
                              </button>
                            )}
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-500 line-clamp-2">
                            {report.purpose}
                          </p>
                        )}
                      </div>
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

                      {/* Already Finished State */}
                      {(report.status === 'Completed' || (isCompanyAdmin && report.status === 'Acknowledged')) && (
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
                    const totalVisitors = report.total_visitors || 1;
                    const checklistItems = report.visit_checklist || [];
                    const solvedCount = checklistItems.filter((i) => i.status === 'solved').length;
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
                          <div className="font-medium text-slate-900 flex items-center gap-1.5">
                            <span>{leadName}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-100">
                              {totalVisitors} {totalVisitors === 1 ? 'person' : 'persons'}
                            </span>
                          </div>
                          {leadPhone && (
                            <a href={`tel:${leadPhone}`} className="text-[11px] text-blue-600 hover:underline">
                              {leadPhone}
                            </a>
                          )}
                        </td>
                        <td className="py-3.5 px-4 align-top">
                          {checklistItems.length > 0 ? (
                            <div className="space-y-1">
                              <button
                                type="button"
                                onClick={() => toggleChecklistExpand(report.id)}
                                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <span>
                                  {report.status === 'Completed' 
                                    ? `${solvedCount} / ${checklistItems.length} Solved` 
                                    : `${checklistItems.length} Checklist Tasks`}
                                </span>
                                {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                              </button>
                              {isExpanded && (
                                <div className="mt-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200 space-y-1 max-h-40 overflow-y-auto text-[11px] text-slate-600 shadow-inner">
                                  {checklistItems.map((item, idx) => (
                                    <div key={item.id || idx} className="flex items-start gap-1.5 leading-tight">
                                      <span className={`mt-0.5 shrink-0 ${item.status === 'solved' ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                                        {item.status === 'solved' ? '✓' : '•'}
                                      </span>
                                      <span className="break-words">{item.task}</span>
                                    </div>
                                  ))}
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
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                              report.status === 'Completed'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : report.status === 'Acknowledged'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {report.status}
                          </span>
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

                          {(report.status === 'Completed' || (isCompanyAdmin && report.status === 'Acknowledged')) && (
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

      {/* Super Admin Complete Visit Modal with Checklist Resolution (Solved vs Unsolved) */}
      {completeModalVisit && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn" 
          onClick={() => setCompleteModalVisit(null)}
        >
          <div 
            className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full shadow-2xl p-6 space-y-4" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Log Visit Resolution & Checklist Completion
                </h3>
              </div>
              <button 
                onClick={() => setCompleteModalVisit(null)} 
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
              Visit: <strong className="text-indigo-600">{completeModalVisit.visit_code}</strong> • {completeModalVisit.target_system} ({completeModalVisit.company_name})
            </div>

            {/* Checklist Solved / Unsolved Resolution Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <ListTodo size={14} className="text-indigo-600" />
                  <span>On-Site Action Checklist Resolution</span>
                </label>
                <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {completionChecklist.filter(c => c.status === 'solved').length} of {completionChecklist.length} Solved
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Mark what was solved and what remained unsolved during this factory visit:
              </p>

              <div className="space-y-2 max-h-56 overflow-y-auto pt-1">
                {completionChecklist.map((item, idx) => {
                  const isSolved = item.status === 'solved';
                  return (
                    <div
                      key={item.id || idx}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                        isSolved 
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' 
                          : 'bg-amber-50/70 border-amber-200 text-amber-950'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 flex-1 pr-2">
                        <span className={`w-5 h-5 rounded-full font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5 ${
                          isSolved 
                            ? 'bg-emerald-200 text-emerald-800' 
                            : 'bg-amber-200 text-amber-800'
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="text-xs font-semibold leading-relaxed">
                          {item.task}
                        </span>
                      </div>

                      {/* Solved / Unsolved Toggle Button */}
                      <button
                        type="button"
                        onClick={() => toggleChecklistResolution(item.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1 shrink-0 ${
                          isSolved
                            ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                            : 'bg-amber-600 text-white hover:bg-amber-500'
                        }`}
                      >
                        {isSolved ? (
                          <>
                            <CheckCircle2 size={13} />
                            <span>Solved</span>
                          </>
                        ) : (
                          <>
                            <XCircle size={13} />
                            <span>Unsolved</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Service Summary & Field Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Additional Service Remarks & Maintenance Notes (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Details of calibration, parts replaced, sensor diagnostic logs, or follow-up recommendations..."
                value={completeSummary}
                onChange={(e) => setCompleteSummary(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg p-2.5 text-xs focus:bg-white focus:outline-none focus:border-blue-500 shadow-sm"
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
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
                {completing ? (
                  'Saving Completion...'
                ) : (
                  `Confirm Visit Completed (${completionChecklist.filter(c => c.status === 'solved').length}/${completionChecklist.length} Solved)`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
