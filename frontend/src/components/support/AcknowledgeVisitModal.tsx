import React, { useState } from 'react';
import { X, ShieldCheck, Loader2 } from 'lucide-react';
import type { VisitingReport, CurrentUser } from './types';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-[#111827] border border-[#1f293d] rounded-xl max-w-md w-full shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[#1f293d] flex items-center justify-between bg-[#111827]">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-400" />
            <h3 className="text-sm font-semibold text-white tracking-wide">
              Acknowledge Factory Visit
            </h3>
          </div>
          <button
            type="button"
            className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-500/15 border border-red-500/30 text-red-400 rounded-lg text-xs">
                {error}
              </div>
            )}

            {/* Visit Details Box */}
            <div className="p-3.5 bg-[#0d1424] border border-[#1f293d] rounded-lg text-xs space-y-1.5 text-gray-300">
              <div><strong className="text-gray-400">Visit Ref:</strong> <span className="font-mono text-blue-400 font-semibold">{visit.visit_code}</span></div>
              <div><strong className="text-gray-400">Scheduled:</strong> <span className="text-amber-400">{visit.scheduled_date}</span> ({visit.estimated_duration})</div>
              <div><strong className="text-gray-400">Target System:</strong> {visit.target_system}</div>
              <div><strong className="text-gray-400">Engineers:</strong> {visit.visiting_engineers}</div>
              <div><strong className="text-gray-400">Purpose:</strong> {visit.purpose}</div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-300">
                Acknowledging Contact Person / Authority
              </label>
              <input
                type="text"
                value={acknowledgedBy}
                onChange={(e) => setAcknowledgedBy(e.target.value)}
                className="w-full bg-[#0b1120] border border-[#1f293d] text-gray-100 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-300">
                Gate Pass & Security / Escort Remarks
              </label>
              <textarea
                rows={3}
                placeholder="Gate pass number, security instructions, escort team details..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-[#0b1120] border border-[#1f293d] text-gray-100 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 resize-y"
              />
            </div>
          </div>

          <div className="px-6 py-4 bg-[#0d1424] border-t border-[#1f293d] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-xs text-gray-300 bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md transition-all flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Acknowledging...
                </>
              ) : (
                'Confirm & Acknowledge Visit'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
