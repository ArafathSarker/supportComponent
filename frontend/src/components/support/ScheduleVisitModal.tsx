import React, { useState } from 'react';
import { X, Calendar, Clock, MapPin, UserCheck, Shield } from 'lucide-react';
import { VisitingReport, CurrentUser } from './types';
import { api } from './api';

interface ScheduleVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: CurrentUser;
  onVisitScheduled: (newVisit: VisitingReport) => void;
}

export const ScheduleVisitModal: React.FC<ScheduleVisitModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onVisitScheduled
}) => {
  const [companyName, setCompanyName] = useState('CSI Smart Tech Ltd');
  const [targetSystem, setTargetSystem] = useState('Water Flow Monitoring (FM-03 Line)');
  const [visitingEngineers, setVisitingEngineers] = useState('Engr. Tanvir Ahmed (Senior IoT Specialist)');
  const [purpose, setPurpose] = useState('On-site diagnostic inspection, cable shielding replacement, and RS485 bus impedance re-termination.');
  const [scheduledDate, setScheduledDate] = useState('2026-10-25 10:00 AM');
  const [estimatedDuration, setEstimatedDuration] = useState('3 Hours');
  const [entryRequirements, setEntryRequirements] = useState('Safety Boots, High-Vis Vest, Gate Pass');
  const [superAdminNotes, setSuperAdminNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);

      const created = await api.createVisitingReport({
        company_name: companyName,
        target_system: targetSystem,
        visiting_engineers: visitingEngineers,
        purpose,
        scheduled_date: scheduledDate,
        estimated_duration: estimatedDuration,
        entry_requirements: entryRequirements,
        super_admin_notes: superAdminNotes
      });

      onVisitScheduled(created);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch visit request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="sc-modal-overlay" onClick={onClose}>
      <div className="sc-modal-box" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
        <div className="sc-modal-header">
          <h3>Dispatch Factory Visit Request (Super Admin)</h3>
          <button className="sc-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="sc-modal-body">
            {error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#f87171',
                padding: '10px',
                borderRadius: '6px',
                fontSize: '13px'
              }}>
                {error}
              </div>
            )}

            <div className="sc-form-row">
              <div className="sc-form-group">
                <label className="sc-form-label">Client / Factory Company</label>
                <input
                  type="text"
                  className="sc-form-input"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
              </div>

              <div className="sc-form-group">
                <label className="sc-form-label">Target System / Machine</label>
                <input
                  type="text"
                  className="sc-form-input"
                  value={targetSystem}
                  onChange={(e) => setTargetSystem(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="sc-form-group">
              <label className="sc-form-label">Visiting Engineers / Team</label>
              <input
                type="text"
                className="sc-form-input"
                placeholder="Names and titles of field engineers"
                value={visitingEngineers}
                onChange={(e) => setVisitingEngineers(e.target.value)}
                required
              />
            </div>

            <div className="sc-form-group">
              <label className="sc-form-label">Purpose of Factory Visit</label>
              <textarea
                className="sc-form-textarea"
                rows={3}
                placeholder="Specific inspection or repair tasks..."
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                required
              />
            </div>

            <div className="sc-form-row">
              <div className="sc-form-group">
                <label className="sc-form-label">Scheduled Date & Time</label>
                <input
                  type="text"
                  className="sc-form-input"
                  placeholder="e.g. 2026-10-25 10:00 AM"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  required
                />
              </div>

              <div className="sc-form-group">
                <label className="sc-form-label">Estimated Duration</label>
                <input
                  type="text"
                  className="sc-form-input"
                  placeholder="e.g. 3 Hours"
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(e.target.value)}
                />
              </div>
            </div>

            <div className="sc-form-group">
              <label className="sc-form-label">Gate Pass & Safety Equipment Requirements</label>
              <input
                type="text"
                className="sc-form-input"
                value={entryRequirements}
                onChange={(e) => setEntryRequirements(e.target.value)}
              />
            </div>

            <div className="sc-form-group">
              <label className="sc-form-label">Field Notes / Equipment Brought (Optional)</label>
              <input
                type="text"
                className="sc-form-input"
                placeholder="e.g. Oscilloscope, Replacement flow meter sensors..."
                value={superAdminNotes}
                onChange={(e) => setSuperAdminNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="sc-modal-footer">
            <button type="button" className="sc-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="sc-btn-primary" disabled={submitting}>
              {submitting ? 'Dispatching...' : 'Dispatch Visit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
