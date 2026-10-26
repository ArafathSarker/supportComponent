import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Loader2,
  Phone,
  User,
  Users,
  Calendar,
  CheckCircle2,
  ListTodo,
  AlertTriangle
} from 'lucide-react';
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
  const [acknowledgedBy, setAcknowledgedBy] = useState(currentUser.name || '');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !visit) return null;

  const leadName = visit.lead_engineer || visit.visiting_engineers;
  const leadPhone = visit.lead_engineer_phone;
  const showHeadcount =
    visit.show_visitor_count !== false && typeof visit.total_visitors === 'number';
  const totalPersons = visit.total_visitors || 1;
  const teamNames =
    (visit.visiting_team_members || []).map((member) => member.name).filter(Boolean).join(', ') ||
    visit.visiting_team_names;
  const visitReasons = visit.visit_reasons || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);

      const updated = await api.acknowledgeVisit(visit.id, {
        acknowledgedBy: acknowledgedBy.trim() || currentUser.name,
        notes,
        userRole: currentUser.role || 'company_admin',
      });
      onVisitAcknowledged(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to acknowledge visit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm">
              <ShieldCheck size={20} />
            </div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Acknowledge Factory Visit
            </h3>
          </div>
          <button
            type="button"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2 shadow-sm">
              <AlertTriangle size={15} className="text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Visiting delegation */}
          <div className="bg-gradient-to-br from-indigo-50/80 via-blue-50/50 to-slate-50 border border-indigo-100 rounded-xl p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-indigo-700 bg-white px-2.5 py-1 rounded-md border border-indigo-200 shadow-xs">
                  {visit.visit_code}
                </span>
                <span className="text-xs font-semibold text-slate-800">
                  {visit.target_system}
                </span>
              </div>
              {showHeadcount && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-800 bg-indigo-100/80 px-2.5 py-1 rounded-full border border-indigo-200">
                  <Users size={13} />
                  <span>
                    Total: {totalPersons} {totalPersons === 1 ? 'Person Visiting' : 'Persons Visiting'}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Lead Visiting Engineer
                </span>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                  <User size={14} className="text-indigo-600 shrink-0" />
                  <span className="truncate">{leadName}</span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Leader Contact Phone
                </span>
                {leadPhone ? (
                  <a
                    href={`tel:${leadPhone}`}
                    className="flex items-center gap-2 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    <Phone size={14} className="text-emerald-600 shrink-0" />
                    <span>{leadPhone}</span>
                  </a>
                ) : (
                  <span className="text-xs font-semibold text-slate-400">—</span>
                )}
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-1.5 pt-1 border-t border-indigo-100/80">
              {teamNames && (
                <div>
                  <strong className="text-slate-700">Team Members:</strong> {teamNames}
                </div>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1 text-indigo-700 font-medium">
                  <Calendar size={13} />
                  <span>Arrival Date: <strong>{visit.scheduled_date}</strong></span>
                </span>
                {visit.floor_location && (
                  <span className="text-slate-400">
                    • Location: {visit.floor_location} ({visit.line_number || 'All Lines'})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Reason for the visit */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                <ListTodo size={15} className="text-indigo-600" />
                <span>Reason for this Visit</span>
              </label>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {visitReasons.length > 0
                  ? `${visitReasons.length} Reason${visitReasons.length !== 1 ? 's' : ''}`
                  : 'Standard Inspection'}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
              {visitReasons.length === 0 ? (
                <div className="text-xs text-slate-600 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>{visit.purpose}</span>
                </div>
              ) : (
                visitReasons.map((reason, idx) => (
                  <div
                    key={reason.id || idx}
                    className="flex items-start gap-2.5 p-2 border border-slate-200/80 rounded-lg text-xs bg-white text-slate-800 shadow-xs"
                  >
                    <CheckCircle2 size={14} className="text-indigo-600 shrink-0 mt-0.5" />
                    <span className="font-medium leading-relaxed flex-1">{reason.label}</span>
                    <span className="text-[10px] font-bold text-slate-400 shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <span>Acknowledged By</span>
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={acknowledgedBy}
              onChange={(e) => setAcknowledgedBy(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-3.5 py-2 text-xs focus:bg-white focus:outline-none focus:border-emerald-500 shadow-sm"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Security Clearance / Gate Pass Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg p-2.5 text-xs focus:bg-white focus:outline-none focus:border-emerald-500 shadow-sm"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition-colors shadow-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Acknowledging...</span>
              </>
            ) : (
              <span>Acknowledge Visit</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
