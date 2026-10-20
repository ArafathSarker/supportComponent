import React, { useState } from 'react';
import { X, CheckCircle, ShieldCheck, Building } from 'lucide-react';
import { VisitingReport, CurrentUser } from './types';
import { api } from './api';

interface AcknowledgeVisitModalProps {
  visit: VisitingReport | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: CurrentUser;
  onVisitAcknowledged: (updated: VisitingReport) => void;
}

export const AcknowledgeVisitModal: React.FC<AcknowledgeVisitModalProps> = ({
  visit,
  isOpen,
  onClose,
  currentUser,
  onVisitAcknowledged
}) => {
  const [acknowledgedBy, setAcknowledgedBy] = useState(currentUser.name || 'Arafath');
  const [notes, setNotes] = useState('Gate pass registered at Security Gate 1. Factory floor escort arranged.');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !visit) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);

      const updated = await api.acknowledgeVisit(visit.id, acknowledgedBy, notes);
      onVisitAcknowledged(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to acknowledge visit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="sc-modal-overlay" onClick={onClose}>
      <div className="sc-modal-box" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
        <div className="sc-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={20} color="#10b981" />
            <h3>Acknowledge Factory Visit</h3>
          </div>
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

            <div style={{
              background: '#0d1424',
              border: '1px solid var(--sc-border)',
              padding: '14px',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              fontSize: '13px'
            }}>
              <div><strong>Visit Ref:</strong> <span style={{ color: '#38bdf8' }}>{visit.visit_code}</span></div>
              <div><strong>Scheduled Date:</strong> <span style={{ color: '#f59e0b' }}>{visit.scheduled_date}</span></div>
              <div><strong>Target Facility:</strong> {visit.target_system}</div>
              <div><strong>Visiting Engineers:</strong> {visit.visiting_engineers}</div>
              <div><strong>Purpose:</strong> {visit.purpose}</div>
            </div>

            <div className="sc-form-group">
              <label className="sc-form-label">Acknowledging Authority / Contact Person</label>
              <input
                type="text"
                className="sc-form-input"
                value={acknowledgedBy}
                onChange={(e) => setAcknowledgedBy(e.target.value)}
                required
              />
            </div>

            <div className="sc-form-group">
              <label className="sc-form-label">Gate Pass & On-Site Instructions</label>
              <textarea
                className="sc-form-textarea"
                rows={3}
                placeholder="Gate pass number, security instructions, escort team details..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="sc-modal-footer">
            <button type="button" className="sc-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="sc-btn-success" disabled={submitting}>
              {submitting ? 'Acknowledging...' : 'Confirm & Acknowledge Visit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
