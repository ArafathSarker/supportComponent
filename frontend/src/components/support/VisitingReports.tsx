import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  CheckCircle2, 
  Search, 
  Plus, 
  RefreshCw, 
  ShieldCheck, 
  FileCheck2,
  AlertTriangle 
} from 'lucide-react';
import { VisitingReport, CurrentUser } from './types';
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
  const [search, setSearch] = useState('');

  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [selectedVisitForAck, setSelectedVisitForAck] = useState<VisitingReport | null>(null);
  const [completeModalVisit, setCompleteModalVisit] = useState<VisitingReport | null>(null);
  const [completeSummary, setCompleteSummary] = useState('');
  const [completing, setCompleting] = useState(false);

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await api.getVisitingReports({
        role: currentUser.role,
        companyName: currentUser.company_name,
        status: statusFilter,
        search: search.trim()
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
  }, [currentUser.role, currentUser.company_name, statusFilter]);

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
    <div>
      <div className="sc-main-card">
        {/* Toolbar */}
        <div className="sc-toolbar">
          <div>
            <h2 className="sc-toolbar-title">
              {isCompanyAdmin ? 'Visiting Reports & Acknowledgements' : 'Visiting Logs & Field Engineering Dispatch'}
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#94a3b8' }}>
              {isCompanyAdmin
                ? 'Review and acknowledge scheduled support engineer visits to your factory facility.'
                : 'Dispatch on-site diagnostic & maintenance visits and monitor factory acknowledgement.'}
            </p>
          </div>

          <div className="sc-toolbar-actions">
            {/* Search */}
            <div className="sc-search-box">
              <Search size={15} />
              <input
                type="text"
                className="sc-search-input"
                placeholder="search visit code or system..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadReports()}
              />
            </div>

            {/* Status Filter */}
            <select
              className="sc-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Pending Acknowledgement">Pending Acknowledgement</option>
              <option value="Acknowledged">Acknowledged</option>
              <option value="Completed">Completed</option>
            </select>

            <button className="sc-btn-secondary" onClick={loadReports} title="Refresh">
              <RefreshCw size={14} />
            </button>

            {/* Super Admin Dispatch Visit Button */}
            {isSuperAdmin && (
              <button
                className="sc-btn-primary"
                onClick={() => setIsScheduleOpen(true)}
              >
                <Plus size={16} />
                Dispatch Factory Visit
              </button>
            )}
          </div>
        </div>

        {/* Reports Grid */}
        <div className="sc-visit-grid">
          {loading && reports.length === 0 ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              Loading visiting reports...
            </div>
          ) : reports.length === 0 ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px' }} className="sc-empty-state">
              <FileCheck2 size={36} />
              <span>No visiting reports found.</span>
            </div>
          ) : (
            reports.map((report) => (
              <div key={report.id} className="sc-visit-card">
                {/* Header */}
                <div className="sc-visit-card-header">
                  <div>
                    <span className="sc-visit-code">{report.visit_code}</span>
                    <div className="sc-visit-target">{report.target_system}</div>
                  </div>
                  <span
                    className={`sc-badge ${
                      report.status === 'Completed'
                        ? 'sc-badge-closed'
                        : report.status === 'Acknowledged'
                        ? 'sc-badge-open'
                        : 'sc-badge-medium'
                    }`}
                  >
                    {report.status}
                  </span>
                </div>

                {/* Company & Engineers */}
                <div className="sc-visit-detail-row">
                  <User size={15} color="#94a3b8" />
                  <span>
                    <strong>Engineers:</strong> {report.visiting_engineers}
                  </span>
                </div>

                <div className="sc-visit-detail-row">
                  <Calendar size={15} color="#94a3b8" />
                  <span>
                    <strong>Scheduled:</strong> {report.scheduled_date} ({report.estimated_duration})
                  </span>
                </div>

                <div className="sc-visit-detail-row">
                  <MapPin size={15} color="#94a3b8" />
                  <span>
                    <strong>Company:</strong> {report.company_name}
                  </span>
                </div>

                {/* Purpose */}
                <div className="sc-visit-purpose">
                  <strong>Purpose:</strong> {report.purpose}
                </div>

                {/* Safety / Entry requirements */}
                {report.entry_requirements && (
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    <strong>Entry Req:</strong> {report.entry_requirements}
                  </div>
                )}

                {/* Acknowledgement info if acknowledged */}
                {report.acknowledged_at && (
                  <div className="sc-visit-ack-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                      <CheckCircle2 size={15} />
                      Acknowledged by {report.acknowledged_by}
                    </div>
                    {report.company_acknowledgement_notes && (
                      <div style={{ marginTop: '4px', color: '#cbd5e1' }}>
                        "{report.company_acknowledgement_notes}"
                      </div>
                    )}
                  </div>
                )}

                {/* Service summary if completed */}
                {report.service_summary && (
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: '#e2e8f0'
                  }}>
                    <strong style={{ color: '#34d399' }}>Post-Visit Service Log:</strong>
                    <p style={{ margin: '4px 0 0 0' }}>{report.service_summary}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="sc-visit-actions">
                  {/* Company Admin Acknowledge Action */}
                  {isCompanyAdmin && report.status === 'Pending Acknowledgement' && (
                    <button
                      className="sc-btn-success"
                      onClick={() => setSelectedVisitForAck(report)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <ShieldCheck size={15} />
                      Acknowledge Visit
                    </button>
                  )}

                  {/* Super Admin Complete Action */}
                  {isSuperAdmin && report.status === 'Acknowledged' && (
                    <button
                      className="sc-btn-primary"
                      onClick={() => setCompleteModalVisit(report)}
                      style={{ fontSize: '12px', padding: '6px 12px' }}
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
        <div className="sc-modal-overlay" onClick={() => setCompleteModalVisit(null)}>
          <div className="sc-modal-box" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="sc-modal-header">
              <h3>Complete Factory Visit & Submit Service Log</h3>
              <button className="sc-modal-close" onClick={() => setCompleteModalVisit(null)}>
                &times;
              </button>
            </div>
            <div className="sc-modal-body">
              <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1' }}>
                Visit: <strong>{completeModalVisit.visit_code}</strong> - {completeModalVisit.target_system}
              </p>
              <div className="sc-form-group">
                <label className="sc-form-label">Service Summary & Field Findings</label>
                <textarea
                  className="sc-form-textarea"
                  rows={4}
                  placeholder="Detail work done, replaced parts, calibration results, and machine health status..."
                  value={completeSummary}
                  onChange={(e) => setCompleteSummary(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="sc-modal-footer">
              <button className="sc-btn-secondary" onClick={() => setCompleteModalVisit(null)}>
                Cancel
              </button>
              <button
                className="sc-btn-primary"
                onClick={handleCompleteSubmit}
                disabled={completing || !completeSummary.trim()}
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
