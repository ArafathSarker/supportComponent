import React, { useState } from 'react';
import { X, Calendar, Loader2, AlertCircle, Wrench, Shield, MapPin, Flame } from 'lucide-react';
import type { VisitingReport, CurrentUser } from './types';
import { api } from './api';
import { GARMENTS_FLOORS, GARMENTS_SYSTEMS } from './iotConfig';

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
  const [targetSystem, setTargetSystem] = useState(GARMENTS_SYSTEMS[0]);
  const [priority, setPriority] = useState('High');
  const [floorLocation, setFloorLocation] = useState(GARMENTS_FLOORS[1]);
  const [lineNumber, setLineNumber] = useState('Sewing Line 04');
  const [visitingEngineers, setVisitingEngineers] = useState('Engr. Tanvir Ahmed (Senior IoT Specialist)');
  const [purpose, setPurpose] = useState('On-site optical sensor alignment, RS485 impedance re-termination, and gateway firmware calibration.');
  const [scheduledDate, setScheduledDate] = useState('2026-10-25 10:00 AM');
  const [estimatedDuration, setEstimatedDuration] = useState('3 Hours');
  const [entryRequirements, setEntryRequirements] = useState('Safety Boots, Anti-Static Wrist Strap, Factory Security Gate Pass');
  const [superAdminNotes, setSuperAdminNotes] = useState('Engineers will carry optical calibration tools and replacement IoT sensor modules.');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setError('Target Factory / Client name is required.');
      return;
    }
    if (!visitingEngineers.trim()) {
      setError('Visiting Field Engineers name(s) required.');
      return;
    }
    if (!purpose.trim()) {
      setError('Purpose of visit is required.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const created = await api.createVisitingReport({
        company_name: companyName.trim(),
        target_system: targetSystem,
        priority: priority,
        line_number: lineNumber,
        floor_location: floorLocation,
        visiting_engineers: visitingEngineers.trim(),
        purpose: purpose.trim(),
        scheduled_date: scheduledDate,
        estimated_duration: estimatedDuration,
        entry_requirements: entryRequirements,
        super_admin_notes: superAdminNotes,
        user_role: currentUser.role || 'super_admin',
        user_name: currentUser.name || 'Lead Field Engineer'
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="bg-[#111827] border border-[#1f293d] rounded-2xl max-w-xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[#1f293d] flex items-center justify-between bg-gradient-to-r from-[#111827] via-[#162035] to-[#111827]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Wrench size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                Dispatch Factory On-Site Engineer Visit
              </h3>
              <p className="text-[11px] text-gray-400">
                Solution Provider Field Engineering Dispatch & Gate Pass Request
              </p>
            </div>
          </div>
          <button
            type="button"
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
            {error && (
              <div className="p-3.5 bg-red-500/15 border border-red-500/30 text-red-400 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Client Factory & System */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-300">Target Factory / Client *</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-[#0b1120] border border-[#1f293d] text-gray-100 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 shadow-inner"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-300">Target Subsystem / Unit *</label>
                <select
                  value={targetSystem}
                  onChange={(e) => setTargetSystem(e.target.value)}
                  className="w-full bg-[#0b1120] border border-[#1f293d] text-gray-100 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 cursor-pointer shadow-inner"
                >
                  {GARMENTS_SYSTEMS.map((sys) => (
                    <option key={sys} value={sys}>{sys}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Floor, Line and Priority */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-gray-400">Floor Location</label>
                <select
                  value={floorLocation}
                  onChange={(e) => setFloorLocation(e.target.value)}
                  className="w-full bg-[#0b1120] border border-[#1f293d] text-gray-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {GARMENTS_FLOORS.map((fl) => (
                    <option key={fl} value={fl}>{fl}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-gray-400">Production Line</label>
                <input
                  type="text"
                  value={lineNumber}
                  onChange={(e) => setLineNumber(e.target.value)}
                  className="w-full bg-[#0b1120] border border-[#1f293d] text-gray-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-gray-400">Dispatch Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full bg-[#0b1120] border border-[#1f293d] text-gray-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-blue-500 cursor-pointer font-semibold"
                >
                  <option value="Medium">Medium</option>
                  <option value="High">High Priority</option>
                  <option value="Urgent / Emergency">Urgent / Emergency</option>
                </select>
              </div>
            </div>

            {/* Visiting Engineers */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-300">Assigned Field Engineers *</label>
              <input
                type="text"
                placeholder="Names and certifications of field technicians"
                value={visitingEngineers}
                onChange={(e) => setVisitingEngineers(e.target.value)}
                className="w-full bg-[#0b1120] border border-[#1f293d] text-gray-100 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 shadow-inner"
                required
              />
            </div>

            {/* Purpose */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-300">Inspection & Service Scope *</label>
              <textarea
                rows={2}
                placeholder="Diagnostic scope, calibration procedures, or component replacement details..."
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full bg-[#0b1120] border border-[#1f293d] text-gray-100 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 resize-y shadow-inner"
                required
              />
            </div>

            {/* Schedule & Duration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-300">Scheduled Date & Time *</label>
                <input
                  type="text"
                  placeholder="e.g. 2026-10-25 10:00 AM"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full bg-[#0b1120] border border-[#1f293d] text-gray-100 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-300">Estimated Duration</label>
                <input
                  type="text"
                  placeholder="e.g. 3 Hours"
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(e.target.value)}
                  className="w-full bg-[#0b1120] border border-[#1f293d] text-gray-100 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* PPE & Entry Requirements */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-300">Safety PPE & Security Gate Pass Requirements</label>
              <input
                type="text"
                value={entryRequirements}
                onChange={(e) => setEntryRequirements(e.target.value)}
                className="w-full bg-[#0b1120] border border-[#1f293d] text-gray-100 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Field Notes */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-300">Equipment & Diagnostic Tools Brought</label>
              <input
                type="text"
                placeholder="e.g. Oscilloscope, optical tachometer, spare IoT sensor modules"
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
              className="px-4 py-2 rounded-xl text-xs text-gray-300 bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2"
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
