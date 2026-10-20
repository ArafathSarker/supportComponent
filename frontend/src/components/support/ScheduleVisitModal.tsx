import React, { useState } from 'react';
import { X, Calendar, Loader2 } from 'lucide-react';
import type { VisitingReport, CurrentUser } from './types';
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
  const [entryRequirements, setEntryRequirements] = useState('Safety Boots, High-Vis Vest, Security Gate Pass');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-[#111827] border border-[#1f293d] rounded-xl max-w-xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[#1f293d] flex items-center justify-between bg-[#111827]">
          <h3 className="text-sm font-semibold text-white tracking-wide">
            Dispatch Factory Visit Request (Super Admin)
          </h3>
          <button
            type="button"
            className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto space-y-4 flex-1">
            {error && (
              <div className="p-3 bg-red-500/15 border border-red-500/30 text-red-400 rounded-lg text-xs">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-300">Target Factory / Client</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-[#0b1120] border border-[#1f293d] text-gray-100 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-300">Target Machine / Facility</label>
                <input
                  type="text"
                  value={targetSystem}
                  onChange={(e) => setTargetSystem(e.target.value)}
                  className="w-full bg-[#0b1120] border border-[#1f293d] text-gray-100 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-300">Visiting Field Engineers</label>
              <input
                type="text"
                placeholder="Names and titles of field engineers"
                value={visitingEngineers}
                onChange={(e) => setVisitingEngineers(e.target.value)}
                className="w-full bg-[#0b1120] border border-[#1f293d] text-gray-100 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-300">Purpose of Visit</label>
              <textarea
                rows={3}
                placeholder="Inspection, calibration, or component replacement details..."
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full bg-[#0b1120] border border-[#1f293d] text-gray-100 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 resize-y"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-300">Scheduled Date & Time</label>
                <input
                  type="text"
                  placeholder="e.g. 2026-10-25 10:00 AM"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full bg-[#0b1120] border border-[#1f293d] text-gray-100 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-300">Estimated Duration</label>
                <input
                  type="text"
                  placeholder="e.g. 3 Hours"
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(e.target.value)}
                  className="w-full bg-[#0b1120] border border-[#1f293d] text-gray-100 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-300">Safety PPE & Gate Pass Requirements</label>
              <input
                type="text"
                value={entryRequirements}
                onChange={(e) => setEntryRequirements(e.target.value)}
                className="w-full bg-[#0b1120] border border-[#1f293d] text-gray-100 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-300">Field Notes / Equipment Brought (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Calibration tools, Oscilloscope..."
                value={superAdminNotes}
                onChange={(e) => setSuperAdminNotes(e.target.value)}
                className="w-full bg-[#0b1120] border border-[#1f293d] text-gray-100 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
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
              className="px-5 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-md transition-all flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Dispatching...
                </>
              ) : (
                'Dispatch Visit Request'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
