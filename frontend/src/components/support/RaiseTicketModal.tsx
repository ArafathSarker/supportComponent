import React, { useState } from 'react';
import { X, Upload, Loader2 } from 'lucide-react';
import { Ticket, TicketUrgency, CurrentUser } from './types';
import { api } from './api';

interface RaiseTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: CurrentUser;
  onTicketCreated: (newTicket: Ticket) => void;
}

export const CATEGORY_OPTIONS = [
  'Hardware / Sensor / Device Problem',
  'Software / Firmware / App Bug',
  'Network / Connectivity Issue',
  'Data / Export / Reporting Issue',
  'SCADA / Dashboard / Display Issue',
  'User Account / Access / Permission',
  'Billing / Subscription / License',
  'Installation / Commissioning',
  'Other / General Enquiry'
];

export const SYSTEM_OPTIONS = [
  'Water Flow Monitoring',
  'Main Electrical Substation SCADA',
  'Boiler Pressure & Temperature Line',
  'Energy Metering Gateway',
  'Effluent Treatment Plant (ETP)',
  'Chiller System Sensor Array',
  'Industrial Compressor Line',
  'Factory IoT Edge Gateway',
  'Other Custom System'
];

export const RaiseTicketModal: React.FC<RaiseTicketModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onTicketCreated
}) => {
  const [title, setTitle] = useState('');
  const [affectedSystem, setAffectedSystem] = useState(SYSTEM_OPTIONS[0]);
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
  const [urgency, setUrgency] = useState<TicketUrgency>('Medium');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title / Problem Summary is required.');
      return;
    }
    if (!category || category === 'Select category') {
      setError('Problem Category is required.');
      return;
    }
    if (!description.trim()) {
      setError('Please provide detailed problem description.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // 1. Create ticket
      const created = await api.createTicket({
        title: title.trim(),
        affected_system: affectedSystem,
        category: category,
        urgency: urgency,
        description: description.trim(),
        company_name: currentUser.company_name || 'CSI Smart Tech Ltd',
        created_by_name: currentUser.name || 'Arafath',
        created_by_role: currentUser.role
      });

      // 2. Upload file attachments if selected
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          await api.uploadFile(files[i], created.id, currentUser.name);
        }
      }

      onTicketCreated(created);
      onClose();
      // Reset form
      setTitle('');
      setDescription('');
      setFiles(null);
    } catch (err: any) {
      setError(err.message || 'Failed to raise ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="sc-modal-overlay" onClick={onClose}>
      <div className="sc-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sc-modal-header">
          <h3>Raise Support Ticket</h3>
          <button className="sc-modal-close" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit}>
          <div className="sc-modal-body">
            {error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                padding: '10px 14px',
                borderRadius: '6px',
                fontSize: '13px'
              }}>
                {error}
              </div>
            )}

            {/* Title */}
            <div className="sc-form-group">
              <label className="sc-form-label">
                Title / Problem Summary <span className="required">*</span>
              </label>
              <input
                type="text"
                className="sc-form-input"
                placeholder="Enter ticket title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Two-column Row */}
            <div className="sc-form-row">
              {/* Left: Affected System & Urgency */}
              <div className="sc-form-group">
                <label className="sc-form-label">Affected System</label>
                <select
                  className="sc-form-select"
                  value={affectedSystem}
                  onChange={(e) => setAffectedSystem(e.target.value)}
                >
                  {SYSTEM_OPTIONS.map((sys) => (
                    <option key={sys} value={sys}>
                      {sys}
                    </option>
                  ))}
                </select>

                <div style={{ marginTop: '14px' }}>
                  <label className="sc-form-label">Urgency Level</label>
                  <select
                    className="sc-form-select"
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as TicketUrgency)}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              {/* Right: Problem Category */}
              <div className="sc-form-group">
                <label className="sc-form-label">
                  Problem Category <span className="required">*</span>
                </label>
                <select
                  className="sc-form-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                >
                  {CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="sc-form-group">
              <label className="sc-form-label">
                Describe the Problem in detail <span className="required">*</span>
              </label>
              <textarea
                className="sc-form-textarea"
                placeholder="Describe the issue in detail"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            {/* Evidence File Upload */}
            <div className="sc-form-group">
              <label className="sc-form-label">
                Attach Supporting Evidence (Photos or Videos)
              </label>
              <div className="sc-file-upload-box">
                <Upload size={18} color="#94a3b8" />
                <input
                  type="file"
                  multiple
                  className="sc-file-upload-input"
                  onChange={(e) => setFiles(e.target.files)}
                />
              </div>
              {files && files.length > 0 && (
                <div style={{ fontSize: '12px', color: '#60a5fa', marginTop: '4px' }}>
                  {files.length} file(s) selected for upload
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="sc-modal-footer">
            <button
              type="button"
              className="sc-btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="sc-btn-primary"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Submitting...
                </>
              ) : (
                'Raise Ticket'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
