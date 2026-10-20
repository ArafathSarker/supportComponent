import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  MapPin, 
  User, 
  CheckCircle2, 
  Search, 
  Plus, 
  RefreshCw, 
  ShieldCheck, 
  FileCheck2,
  LayoutList,
  LayoutGrid,
  X
} from 'lucide-react';
import type { VisitingReport, CurrentUser } from './types';
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

  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [selectedVisitForAck, setSelectedVisitForAck] = useState<VisitingReport | null>(null);
  const [completeModalVisit, setCompleteModalVisit] = useState<VisitingReport | null>(null);
  const [completeSummary, setCompleteSummary] = useState('');
  const [completing, setCompleting] = useState(false);

  // Debounce search input so typing automatically queries without requiring Enter
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

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

  const handleCompleteSubmit = async () => {
    if (!completeModalVisit || !completeSummary.trim()) return;
    try {
      setCompleting(true);
      const updated = await api.completeVisit(completeModalVisit.id, completeSummary, currentUser.name);
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

  return (
    <div className="w-full">
      {/* Main Card */}
      <div className="bg-[#111827] border border-[#1f293d] rounded-xl overflow-hidden shadow-2xl">
        {/* Toolbar Header */}
        <div className="p-5 border-b border-[#1f293d] flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-white tracking-wide">
              {isCompanyAdmin ? 'Visiting Reports & Acknowledgements' : 'Visiting Logs (Factory Field Dispatch)'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {isCompanyAdmin
                ? 'Review and acknowledge scheduled support engineer visits to your factory facility.'
                : 'Dispatch on-site diagnostic & maintenance visits and monitor factory acknowledgement.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative flex items-center">
              <Search size={15} className="absolute left-3 text-gray-500 pointer-events-none" />
              <input
                type="text"
                placeholder="search visit code, system, engineer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-[#0b1120] border border-[#1f293d] text-gray-100 pl-9 pr-8 py-2 rounded-lg text-xs w-56 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 p-0.5 rounded text-gray-400 hover:text-white transition-colors"
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
              className="bg-[#0b1120] border border-[#1f293d] text-gray-200 px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
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
              className="bg-[#0b1120] border border-[#1f293d] text-gray-200 px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
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

            {/* Super Admin Dispatch Visit Button */}
            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => setIsScheduleOpen(true)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-md transition-all flex items-center gap-1.5"
              >
                <Plus size={15} />
                Dispatch Factory Visit
              </button>
            )}
          </div>
        </div>

        {/* Content Area: Grid View or List View */}
        {viewMode === 'grid' ? (
          /* Cards Grid View */
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {loading && reports.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-400 text-xs">
                Loading visiting logs...
              </div>
            ) : reports.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-500">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <FileCheck2 size={32} />
                  <span className="text-xs">No visiting reports found.</span>
                </div>
              </div>
            ) : (
              reports.map((report) => (
                <div
                  key={report.id}
                  className="bg-[#0f172a] border border-[#1f293d] hover:border-gray-700 rounded-xl p-4 flex flex-col justify-between space-y-3.5 shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-xs font-bold text-sky-400">
                        {report.visit_code}
                      </span>
                      <h3 className="text-sm font-semibold text-white mt-0.5">
                        {report.target_system}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {report.priority && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            report.priority === 'Critical'
                              ? 'bg-red-500/20 text-red-400 border-red-500/40'
                              : report.priority === 'Urgent'
                              ? 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40'
                              : report.priority === 'High'
                              ? 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                              : 'bg-amber-500/15 text-amber-400 border-amber-500/25'
                          }`}
                        >
                          {report.priority}
                        </span>
                      )}
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                          report.status === 'Completed'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : report.status === 'Acknowledged'
                            ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                            : 'bg-amber-500/15 text-amber-400 border-amber-500/25'
                        }`}
                      >
                        {report.status}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-gray-300">
                    {(report.floor_location || report.line_number) && (
                      <div className="flex items-center gap-2 text-sky-400 font-mono text-[11px]">
                        <MapPin size={13} className="text-sky-400 shrink-0" />
                        <span>
                          {report.floor_location || ''}
                          {report.floor_location && report.line_number ? ' • ' : ''}
                          {report.line_number ? `Line: ${report.line_number}` : ''}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-gray-400">
                      <User size={13} className="text-gray-500 shrink-0" />
                      <span><strong>Engineers:</strong> {report.visiting_engineers}</span>
                    </div>

                    <div className="flex items-center gap-2 text-gray-400">
                      <Calendar size={13} className="text-gray-500 shrink-0" />
                      <span><strong>Scheduled:</strong> {report.scheduled_date} ({report.estimated_duration})</span>
                    </div>

                    <div className="flex items-center gap-2 text-gray-400">
                      <MapPin size={13} className="text-gray-500 shrink-0" />
                      <span><strong>Company:</strong> {report.company_name}</span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-[#0b1120] border border-[#1f293d] rounded-lg text-xs text-gray-300 leading-relaxed">
                    <span className="text-gray-400 font-semibold block text-[11px] uppercase tracking-wider mb-0.5">
                      Purpose
                    </span>
                    {report.purpose}
                  </div>

                  {report.acknowledged_at && (
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/25 rounded-lg text-xs text-emerald-300 space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
                        <CheckCircle2 size={14} />
                        <span>Acknowledged by {report.acknowledged_by}</span>
                      </div>
                      {report.company_acknowledgement_notes && (
                        <p className="text-[11px] text-gray-300 italic">
                          "{report.company_acknowledgement_notes}"
                        </p>
                      )}
                    </div>
                  )}

                  {report.service_summary && (
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/25 rounded-lg text-xs text-gray-200 space-y-1">
                      <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">
                        Post-Visit Service Log:
                      </span>
                      <p className="text-xs leading-relaxed">{report.service_summary}</p>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#1f293d]">
                    {isCompanyAdmin && report.status === 'Pending Acknowledgement' && (
                      <button
                        type="button"
                        onClick={() => setSelectedVisitForAck(report)}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md transition-colors flex items-center gap-1.5"
                      >
                        <ShieldCheck size={14} />
                        Acknowledge Visit
                      </button>
                    )}

                    {isSuperAdmin && report.status === 'Acknowledged' && (
                      <button
                        type="button"
                        onClick={() => setCompleteModalVisit(report)}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-md transition-colors flex items-center gap-1.5"
                      >
                        <CheckCircle2 size={14} />
                        Log Service Completion
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Table List View */
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs text-gray-200 border-collapse">
              <thead>
                <tr className="bg-[#0d1527] border-b border-[#1f293d] text-gray-400 font-semibold tracking-wider">
                  <th className="py-3 px-4">Visit Ref</th>
                  <th className="py-3 px-4">Target System & Floor</th>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Visiting Engineers</th>
                  <th className="py-3 px-4">Scheduled Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f293d]">
                {loading && reports.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-gray-400">
                      Loading visiting logs...
                    </td>
                  </tr>
                ) : reports.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-gray-500">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <FileCheck2 size={28} />
                        <span>No visiting reports found.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  reports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-sky-400">
                        {report.visit_code}
                      </td>
                      <td className="py-3.5 px-4 text-white">
                        <div className="font-medium">{report.target_system}</div>
                        {(report.floor_location || report.line_number) && (
                          <div className="text-[11px] text-sky-400 font-mono flex items-center gap-1 mt-0.5">
                            <MapPin size={10} className="shrink-0 text-sky-400" />
                            <span>
                              {report.floor_location || ''}
                              {report.floor_location && report.line_number ? ' • ' : ''}
                              {report.line_number ? `Line: ${report.line_number}` : ''}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-gray-300">
                        {report.company_name}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            report.priority === 'Critical'
                              ? 'bg-red-500/20 text-red-400 border-red-500/40'
                              : report.priority === 'Urgent'
                              ? 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40'
                              : report.priority === 'High'
                              ? 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                              : 'bg-amber-500/15 text-amber-400 border-amber-500/25'
                          }`}
                        >
                          {report.priority || 'High'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-400">
                        {report.visiting_engineers}
                      </td>
                      <td className="py-3.5 px-4 text-gray-300 whitespace-nowrap">
                        {report.scheduled_date}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                            report.status === 'Completed'
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : report.status === 'Acknowledged'
                              ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                              : 'bg-amber-500/15 text-amber-400 border-amber-500/25'
                          }`}
                        >
                          {report.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {isCompanyAdmin && report.status === 'Pending Acknowledgement' && (
                          <button
                            type="button"
                            onClick={() => setSelectedVisitForAck(report)}
                            className="px-3 py-1 rounded-md text-xs font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-600 hover:text-white border border-emerald-500/20 transition-all inline-flex items-center gap-1"
                          >
                            <ShieldCheck size={12} />
                            Acknowledge
                          </button>
                        )}

                        {isSuperAdmin && report.status === 'Acknowledged' && (
                          <button
                            type="button"
                            onClick={() => setCompleteModalVisit(report)}
                            className="px-3 py-1 rounded-md text-xs font-medium text-blue-400 bg-blue-500/10 hover:bg-blue-600 hover:text-white border border-blue-500/20 transition-all inline-flex items-center gap-1"
                          >
                            <CheckCircle2 size={12} />
                            Complete
                          </button>
                        )}

                        {(report.status === 'Completed' || (isCompanyAdmin && report.status === 'Acknowledged')) && (
                          <span className="text-[11px] text-gray-500 italic">
                            {report.status === 'Completed' ? 'Logged' : 'Confirmed'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer info */}
        <div className="p-4 border-t border-[#1f293d] flex items-center justify-between text-xs text-gray-400">
          <span>Showing {reports.length} report(s) ({viewMode} view)</span>
          <span>Status: All active</span>
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

      {/* Super Admin Complete Visit Modal */}
      {completeModalVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn" onClick={() => setCompleteModalVisit(null)}>
          <div className="bg-[#111827] border border-[#1f293d] rounded-xl max-w-md w-full shadow-2xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#1f293d] pb-3">
              <h3 className="text-sm font-semibold text-white">
                Log Factory Visit Completion
              </h3>
              <button onClick={() => setCompleteModalVisit(null)} className="text-gray-400 hover:text-white">
                &times;
              </button>
            </div>

            <p className="text-xs text-gray-300">
              Visit: <strong className="text-blue-400">{completeModalVisit.visit_code}</strong> - {completeModalVisit.target_system}
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-300">
                Service Summary & Field Findings
              </label>
              <textarea
                rows={4}
                placeholder="Work done, replaced components, sensor calibration results, and machine health status..."
                value={completeSummary}
                onChange={(e) => setCompleteSummary(e.target.value)}
                className="w-full bg-[#0b1120] border border-[#1f293d] text-gray-100 rounded-lg p-2.5 text-xs focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#1f293d]">
              <button
                type="button"
                onClick={() => setCompleteModalVisit(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs text-gray-300 bg-gray-800 hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCompleteSubmit}
                disabled={completing || !completeSummary.trim()}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-md"
              >
                {completing ? 'Saving...' : 'Submit Service Summary'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
