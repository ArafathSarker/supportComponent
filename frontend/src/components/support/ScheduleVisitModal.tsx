import React, { useState } from 'react';
import { 
  X, 
  Calendar, 
  Loader2, 
  AlertCircle, 
  Wrench, 
  Phone, 
  User, 
  Users, 
  Plus, 
  Trash2, 
  CheckCircle2,
  ListTodo
} from 'lucide-react';
import type { VisitingReport, CurrentUser, VisitChecklistItem } from './types';
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

  // Lead Engineer & Team
  const [leadEngineer, setLeadEngineer] = useState('Engr. Rezaul Karim');
  const [leadEngineerPhone, setLeadEngineerPhone] = useState('+880 1712-345678');
  const [visitingTeamNames, setVisitingTeamNames] = useState('Engr. Shahin Alam (Hardware Specialist), Md. Kabir (Field Electrician)');
  
  // Date with calendar picker (default to tomorrow YYYY-MM-DD)
  const tomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };
  const [scheduledDate, setScheduledDate] = useState(tomorrowStr());

  // Interactive Visit Checklist builder
  const [checklist, setChecklist] = useState<VisitChecklistItem[]>([
    { id: 'chk-1', task: 'Inspect and align optical needle sensor on sewing line', status: 'pending' },
    { id: 'chk-2', task: 'Calibrate RS485 impedance and line termination resistors', status: 'pending' },
    { id: 'chk-3', task: 'Test factory floor LoRaWAN edge gateway signal strength', status: 'pending' }
  ]);
  const [newChecklistText, setNewChecklistText] = useState('');

  const [superAdminNotes, setSuperAdminNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Calculate total number of people: 1 (Lead Engineer) + other names parsed by comma/newline
  const calculateTotalPersons = () => {
    const trimmed = visitingTeamNames.trim();
    if (!trimmed) return 1;
    const count = trimmed.split(/[,;\n]+/).filter(Boolean).length;
    return 1 + count;
  };

  const handleAddChecklistItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const task = newChecklistText.trim();
    if (!task) return;
    const newItem: VisitChecklistItem = {
      id: `chk-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      task,
      status: 'pending'
    };
    setChecklist((prev) => [...prev, newItem]);
    setNewChecklistText('');
  };

  const handleRemoveChecklistItem = (id: string) => {
    setChecklist((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setError('Target Factory / Client name is required.');
      return;
    }
    if (!leadEngineer.trim()) {
      setError('Lead Field Engineer name is required.');
      return;
    }
    if (!leadEngineerPhone.trim()) {
      setError('Lead Engineer phone number is required.');
      return;
    }
    if (!scheduledDate) {
      setError('Please select a scheduled visit date using the calendar.');
      return;
    }
    if (checklist.length === 0) {
      setError('Please add at least one task or objective to the visit checklist.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const totalPersons = calculateTotalPersons();
      const allVisitingEngineers = visitingTeamNames.trim()
        ? `${leadEngineer.trim()} (Lead), ${visitingTeamNames.trim()}`
        : leadEngineer.trim();

      const created = await api.createVisitingReport({
        company_name: companyName.trim(),
        target_system: targetSystem,
        priority: priority,
        line_number: lineNumber,
        floor_location: floorLocation,
        lead_engineer: leadEngineer.trim(),
        lead_engineer_phone: leadEngineerPhone.trim(),
        visiting_team_names: visitingTeamNames.trim(),
        total_visitors: totalPersons,
        visiting_engineers: allVisitingEngineers,
        visit_checklist: checklist,
        purpose: checklist.map(c => c.task).join('; '),
        scheduled_date: scheduledDate,
        super_admin_notes: superAdminNotes.trim(),
        user_role: currentUser.role || 'super_admin',
        user_name: currentUser.name || leadEngineer
      });

      onVisitScheduled(created);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch visit request');
    } finally {
      setSubmitting(false);
    }
  };

  const totalVisitorsCount = calculateTotalPersons();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-sm">
              <Wrench size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Dispatch Factory On-Site Engineer Visit
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Assign lead engineer, team delegation, calendar date, and visit action checklist
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2 shadow-sm">
              <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Factory & Target System */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Target Factory / Company</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-indigo-500 shadow-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Target System</label>
              <select
                value={targetSystem}
                onChange={(e) => setTargetSystem(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-indigo-500 cursor-pointer shadow-sm"
              >
                {GARMENTS_SYSTEMS.map((sys) => (
                  <option key={sys} value={sys}>{sys}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Location & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-indigo-500 cursor-pointer shadow-sm"
              >
                <option value="Urgent">⚡ Urgent</option>
                <option value="Critical">🔴 Critical</option>
                <option value="High">🟠 High</option>
                <option value="Medium">🟡 Medium</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Factory Floor</label>
              <select
                value={floorLocation}
                onChange={(e) => setFloorLocation(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-indigo-500 cursor-pointer shadow-sm"
              >
                {GARMENTS_FLOORS.map((fl) => (
                  <option key={fl} value={fl}>{fl}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Line Number</label>
              <input
                type="text"
                value={lineNumber}
                onChange={(e) => setLineNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-indigo-500 shadow-sm"
              />
            </div>
          </div>

          {/* Calendar Date Picker */}
          <div className="space-y-1.5 bg-indigo-50/50 border border-indigo-100 rounded-xl p-3.5">
            <label className="text-xs font-semibold text-indigo-950 flex items-center gap-1.5">
              <Calendar size={14} className="text-indigo-600" />
              <span>Scheduled Visit Date (Calendar)</span>
              <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full sm:w-64 bg-white border border-slate-300 text-slate-900 rounded-lg px-3.5 py-2 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm cursor-pointer"
              required
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Select the exact calendar date the engineering delegation will arrive on-site.
            </p>
          </div>

          {/* Lead Engineer & Team Delegation Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                <Users size={14} className="text-indigo-600" />
                <span>Visiting Engineering Delegation</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200">
                Total: {totalVisitorsCount} {totalVisitorsCount === 1 ? 'Person' : 'Persons'}
              </span>
            </div>

            {/* Lead Engineer Name and Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                  <User size={12} className="text-slate-500" />
                  <span>Lead Visiting Engineer (Team Leader)</span>
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Engr. Rezaul Karim"
                  value={leadEngineer}
                  onChange={(e) => setLeadEngineer(e.target.value)}
                  className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 shadow-sm"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                  <Phone size={12} className="text-slate-500" />
                  <span>Leader Mobile Phone Number</span>
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. +880 1712-345678"
                  value={leadEngineerPhone}
                  onChange={(e) => setLeadEngineerPhone(e.target.value)}
                  className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 shadow-sm"
                  required
                />
              </div>
            </div>

            {/* Accompanying Visiting Team Members */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700 flex items-center justify-between">
                <span>Accompanying Team Members (Names of all other visiting persons)</span>
                <span className="text-[10px] text-slate-400">Comma separated</span>
              </label>
              <textarea
                rows={2}
                placeholder="Enter names of other engineers or technicians, e.g.: Engr. Shahin Alam, Md. Kabir (Electrician)..."
                value={visitingTeamNames}
                onChange={(e) => setVisitingTeamNames(e.target.value)}
                className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg p-2.5 text-xs focus:outline-none focus:border-indigo-500 shadow-sm"
              />
              <p className="text-[11px] text-slate-500">
                The company owner will see the Lead Engineer name, Phone Number, and the Total Number of People ({totalVisitorsCount}) on their acknowledgement screen.
              </p>
            </div>
          </div>

          {/* Interactive Visit Action Checklist Builder */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                <ListTodo size={15} className="text-indigo-600" />
                <span>Visit Action Checklist (Tasks to accomplish on-site)</span>
                <span className="text-red-500">*</span>
              </label>
              <span className="text-xs text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                {checklist.length} Task{checklist.length !== 1 ? 's' : ''}
              </span>
            </div>

            <p className="text-[11px] text-slate-500">
              Add specific objectives. The factory owner must acknowledge and approve this exact checklist prior to visit, and engineers will mark what was solved upon completion.
            </p>

            {/* Input to add checklist items */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Type an objective (e.g. 'Calibrate needle counter', 'Replace power supply')..."
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddChecklistItem();
                  }
                }}
                className="flex-1 bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 shadow-sm"
              />
              <button
                type="button"
                onClick={() => handleAddChecklistItem()}
                disabled={!newChecklistText.trim()}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 transition-colors shadow-sm flex items-center gap-1 shrink-0"
              >
                <Plus size={14} />
                <span>Add</span>
              </button>
            </div>

            {/* Checklist Items List */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto pt-1">
              {checklist.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-400 bg-white rounded-lg border border-dashed border-slate-300">
                  No tasks added yet. Type an objective above and click Add.
                </div>
              ) : (
                checklist.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 shadow-xs group hover:border-indigo-300 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 flex-1 pr-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <span className="font-medium">{item.task}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveChecklistItem(item.id)}
                      className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Remove objective"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Super Admin Internal Remarks */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Special Tools & Safety Notes</label>
            <textarea
              rows={2}
              placeholder="e.g. Delegation brings calibrated lux meter, spare needle sensor boards, and ESD safety kit..."
              value={superAdminNotes}
              onChange={(e) => setSuperAdminNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg p-2.5 text-xs focus:bg-white focus:outline-none focus:border-indigo-500 shadow-sm"
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
            className="px-5 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Scheduling Dispatch...</span>
              </>
            ) : (
              <span>Dispatch Visit ({totalVisitorsCount} Persons)</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
