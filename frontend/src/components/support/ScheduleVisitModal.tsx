import React, { useEffect, useState } from 'react';
import {
  X,
  Calendar,
  Loader2,
  AlertCircle,
  Wrench,
  Phone,
  User,
  Users,
  Trash2,
  CheckCircle2,
  ListTodo,
  ShieldAlert,
  Eye,
  EyeOff,
  Lock,
  UserCheck,
  Ticket as TicketIcon,
  ClipboardCheck
} from 'lucide-react';
import type {
  VisitingReport,
  CurrentUser,
  VisitReason,
  SupportEmployee,
  ChecklistOption,
  Ticket
} from './types';
import { api } from './api';
import { GARMENTS_FLOORS, GARMENTS_SYSTEMS } from './iotConfig';
import { EmployeeSearchSelect, EmployeeMultiPicker } from './EmployeePicker';
import { ReasonSearchSelect } from './ReasonPicker';

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
  const [hostName, setHostName] = useState('');
  const [hostPhone, setHostPhone] = useState('');

  // Managed employee directory
  const [employees, setEmployees] = useState<SupportEmployee[]>([]);
  const [checklistOptions, setChecklistOptions] = useState<ChecklistOption[]>([]);
  const [directoryLoading, setDirectoryLoading] = useState(false);

  const visitReasonOptions = checklistOptions.filter((option) => option.kind === 'visit_reason');
  const internalReasonOptions = checklistOptions.filter((option) => option.kind === 'internal_reason');

  // Optional related support ticket (its pre-visit checklist is audited on completion)
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState('');

  // Main / lead engineer selected from the directory
  const [leadEmployeeId, setLeadEmployeeId] = useState('');
  const [teamMembers, setTeamMembers] = useState<SupportEmployee[]>([]);

  // Date with calendar picker (default to tomorrow YYYY-MM-DD)
  const tomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };
  const [scheduledDate, setScheduledDate] = useState(tomorrowStr());

  // Reason for the visit shared with the company owner (managed options)
  const [visitReasons, setVisitReasons] = useState<VisitReason[]>([]);

  // The confidential, provider-only reason the visit is really made for
  const [internalReasons, setInternalReasons] = useState<VisitReason[]>([]);

  // Headcount visibility toggle for the company owner
  const [showVisitorCount, setShowVisitorCount] = useState(true);

  const [superAdminNotes, setSuperAdminNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const loadDirectory = async () => {
      try {
        setDirectoryLoading(true);
        const [employeeList, optionList, ticketList] = await Promise.all([
          api.getSupportEmployees({ activeOnly: true }),
          api.getChecklistOptions({ activeOnly: true }),
          api.getTickets({ role: 'super_admin' })
        ]);
        if (!cancelled) {
          setEmployees(employeeList);
          setChecklistOptions(optionList);
          setTickets(ticketList.filter((ticket) => ticket.status !== 'Closed'));
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Failed to load the support employee directory.');
        }
      } finally {
        if (!cancelled) setDirectoryLoading(false);
      }
    };

    loadDirectory();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Changing the target factory invalidates a previously linked ticket.
  useEffect(() => {
    setSelectedTicketId('');
  }, [companyName]);

  if (!isOpen) return null;

  const selectedLead = employees.find((employee) => employee.id === leadEmployeeId) || null;
  const leadEngineer = selectedLead?.name || '';
  const leadEngineerPhone = selectedLead?.phone || '';

  // Prefer tickets raised by the target factory; fall back to every open ticket.
  const factoryTickets = tickets.filter(
    (ticket) =>
      (ticket.company_name || '').trim().toLowerCase() === companyName.trim().toLowerCase()
  );
  const ticketChoices = factoryTickets.length > 0 ? factoryTickets : tickets;
  const selectedTicket = tickets.find((ticket) => ticket.id === selectedTicketId) || null;
  const selectedTicketPrechecklist = selectedTicket?.troubleshooting_checklist || [];

  // Main engineer + accompanying employees
  const totalVisitorsCount = 1 + teamMembers.length;

  const handleAddTeamMember = (employee: SupportEmployee) => {
    setTeamMembers((prev) =>
      prev.some((member) => member.id === employee.id) ? prev : [...prev, employee]
    );
  };

  const handleRemoveTeamMember = (employeeId: string) => {
    setTeamMembers((prev) => prev.filter((member) => member.id !== employeeId));
  };

  const handleAddReason = (option: ChecklistOption) => {
    if (visitReasons.some((reason) => reason.option_id === option.id)) return;
    setVisitReasons((prev) => [
      ...prev,
      {
        id: `reason-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        label: option.label,
        option_id: option.id
      }
    ]);
  };

  const handleRemoveReason = (id?: string) => {
    setVisitReasons((prev) => prev.filter((reason) => reason.id !== id));
  };

  const handleAddInternalReason = (option: ChecklistOption) => {
    if (internalReasons.some((reason) => reason.option_id === option.id)) return;
    setInternalReasons((prev) => [
      ...prev,
      {
        id: `ireason-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        label: option.label,
        option_id: option.id
      }
    ]);
  };

  const handleRemoveInternalReason = (id?: string) => {
    setInternalReasons((prev) => prev.filter((reason) => reason.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setError('Target Factory / Client name is required.');
      return;
    }
    if (!selectedLead) {
      setError('Please search and select the main visiting engineer from the employee directory.');
      return;
    }
    if (!scheduledDate) {
      setError('Please select a scheduled visit date using the calendar.');
      return;
    }
    if (visitReasons.length === 0) {
      setError('Select at least one reason for the factory visit.');
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
        lead_engineer: leadEngineer,
        lead_engineer_phone: leadEngineerPhone,
        lead_employee_id: selectedLead.id,
        visiting_team_members: teamMembers.map((member) => ({
          employee_id: member.id,
          name: member.name,
          phone: member.phone,
          designation: member.designation || ''
        })),
        visiting_team_names: teamMembers.map((member) => member.name).join(', '),
        total_visitors: totalVisitorsCount,
        host_name: hostName.trim(),
        host_phone: hostPhone.trim(),
        visiting_engineers: [leadEngineer, ...teamMembers.map((member) => member.name)]
          .filter(Boolean)
          .join(', '),
        visit_reasons: visitReasons,
        internal_visit_reasons: internalReasons,
        show_visitor_count: showVisitorCount,
        purpose: visitReasons.map((reason) => reason.label).join('; '),
        scheduled_date: scheduledDate,
        super_admin_notes: superAdminNotes.trim(),
        ticket_id: selectedTicketId || undefined,
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
                Schedule Factory Visit
              </h3>
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

          {/* Welcoming Person on Factory Side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Welcoming Person</label>
              <input
                type="text"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-indigo-500 shadow-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Welcoming Person Phone</label>
              <input
                type="tel"
                value={hostPhone}
                onChange={(e) => setHostPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-indigo-500 shadow-sm"
              />
            </div>
          </div>

          {/* Related Support Ticket */}
          <div className="space-y-1.5 bg-amber-50/50 border border-amber-100 rounded-xl p-3.5">
            <label className="text-xs font-semibold text-amber-950 flex items-center gap-1.5">
              <TicketIcon size={14} className="text-amber-600" />
              <span>Related Support Ticket</span>
              <span className="text-[10px] text-slate-400 font-normal">Optional</span>
            </label>
            <select
              value={selectedTicketId}
              onChange={(e) => setSelectedTicketId(e.target.value)}
              className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-amber-500 shadow-sm cursor-pointer"
            >
              <option value="">No linked ticket</option>
              {ticketChoices.map((ticket) => (
                <option key={ticket.id} value={ticket.id}>
                  {ticket.ticket_code} — {ticket.title} ({ticket.company_name})
                </option>
              ))}
            </select>

            {selectedTicket && (
              <div className="bg-white border border-amber-200 rounded-lg p-2.5 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wide text-amber-800 flex items-center gap-1">
                  <ClipboardCheck size={11} />
                  Company-claimed pre-visit checks ({selectedTicketPrechecklist.length})
                </div>
                {selectedTicketPrechecklist.length === 0 ? (
                  <p className="text-[11px] text-slate-400">
                    This ticket has no pre-troubleshooting checklist.
                  </p>
                ) : (
                  selectedTicketPrechecklist.map((task, idx) => (
                    <div key={idx} className="text-[11px] text-slate-700 flex items-start gap-1.5">
                      <span className="text-amber-600 shrink-0">✓</span>
                      <span>{task}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Calendar Date Picker */}
          <div className="space-y-1.5 bg-indigo-50/50 border border-indigo-100 rounded-xl p-3.5">
            <label className="text-xs font-semibold text-indigo-950 flex items-center gap-1.5">
              <Calendar size={14} className="text-indigo-600" />
              <span>Scheduled Date</span>
              <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full sm:w-64 bg-white border border-slate-300 text-slate-900 rounded-lg px-3.5 py-2 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm cursor-pointer"
              required
            />
          </div>

          {/* Lead Engineer & Team Delegation Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                <Users size={14} className="text-indigo-600" />
                <span>Visiting Engineering Delegation</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200">
                Total: {totalVisitorsCount} {totalVisitorsCount === 1 ? 'Person' : 'Persons'}
              </span>
            </div>

            {directoryLoading ? (
              <div className="flex items-center gap-2 text-xs text-slate-500 bg-white border border-slate-200 rounded-lg p-3">
                <Loader2 size={14} className="animate-spin text-indigo-600" />
                <span>Loading employee directory...</span>
              </div>
            ) : employees.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 flex items-start gap-2">
                <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                <span>No support employees found in directory.</span>
              </div>
            ) : null}

            {/* Main Engineer searchable picker */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                  <UserCheck size={12} className="text-slate-500" />
                  <span>Lead Visiting Engineer</span>
                  <span className="text-red-500">*</span>
                </label>
                <EmployeeSearchSelect
                  employees={employees.filter((employee) => employee.is_lead_engineer !== false)}
                  value={leadEmployeeId || null}
                  onChange={(employeeId) => setLeadEmployeeId(employeeId)}
                  disabled={directoryLoading || employees.length === 0}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                  <Phone size={12} className="text-slate-500" />
                  <span>Lead Engineer Phone</span>
                </label>
                <input
                  type="text"
                  value={leadEngineerPhone}
                  readOnly
                  className="w-full bg-slate-100 border border-slate-300 text-slate-700 rounded-lg px-3 py-2 text-xs cursor-not-allowed"
                />
              </div>
            </div>

            {/* Accompanying employees */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-700 flex items-center justify-between">
                <span>Accompanying Visiting Employees</span>
                <span className="text-[10px] text-slate-400">
                  {teamMembers.length} selected
                </span>
              </label>
              <EmployeeMultiPicker
                employees={employees}
                selected={teamMembers}
                onAdd={handleAddTeamMember}
                onRemove={handleRemoveTeamMember}
                disabled={directoryLoading || employees.length === 0}
              />
            </div>

            {/* Headcount visibility toggle */}
            <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-start justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2">
                <span className={`mt-0.5 ${showVisitorCount ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {showVisitorCount ? <Eye size={16} /> : <EyeOff size={16} />}
                </span>
                <div className="text-[11px] font-semibold text-slate-800">
                  Show total headcount to company owner
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={showVisitorCount}
                onClick={() => setShowVisitorCount((prev) => !prev)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                  showVisitorCount ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    showVisitorCount ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Reason for Visit */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                <ListTodo size={15} className="text-indigo-600" />
                <span>Reason for Visit</span>
                <span className="text-red-500">*</span>
              </label>
              <span className="text-xs text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                {visitReasons.length} Reason{visitReasons.length !== 1 ? 's' : ''}
              </span>
            </div>

            <ReasonSearchSelect
              options={visitReasonOptions}
              selectedIds={visitReasons.map((reason) => reason.option_id || '')}
              onSelect={handleAddReason}
            />

            <div className="space-y-1.5 max-h-48 overflow-y-auto pt-1">
              {visitReasons.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-400 bg-white rounded-lg border border-dashed border-slate-300">
                  No reasons selected.
                </div>
              ) : (
                visitReasons.map((reason, index) => (
                  <div
                    key={reason.id || index}
                    className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 shadow-xs group hover:border-indigo-300 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 flex-1 pr-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <span className="font-medium">{reason.label}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveReason(reason.id)}
                      className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Remove reason"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Confidential Reason for Visit */}
          <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-bold text-purple-950 flex items-center gap-1.5 uppercase tracking-wide">
                <ShieldAlert size={15} className="text-purple-600" />
                <span>Confidential Reason for Visit</span>
              </label>
            </div>

            <ReasonSearchSelect
              options={internalReasonOptions}
              selectedIds={internalReasons.map((reason) => reason.option_id || '')}
              onSelect={handleAddInternalReason}
              confidential
            />

            <div className="space-y-1.5 max-h-44 overflow-y-auto">
              {internalReasons.length === 0 ? (
                <div className="p-3 text-center text-[11px] text-purple-700/60 bg-white rounded-lg border border-dashed border-purple-200">
                  No confidential reasons selected.
                </div>
              ) : (
                internalReasons.map((reason, index) => (
                  <div
                    key={reason.id || index}
                    className="flex items-center justify-between p-2.5 bg-white border border-purple-200 rounded-lg text-xs text-slate-800 shadow-xs"
                  >
                    <div className="flex items-center gap-2.5 flex-1 pr-2">
                      <span className="w-5 h-5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <span className="font-medium">{reason.label}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveInternalReason(reason.id)}
                      className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Remove confidential reason"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Special Tools & Safety Notes</label>
            <textarea
              rows={2}
              value={superAdminNotes}
              onChange={(e) => setSuperAdminNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg p-2.5 text-xs focus:bg-white focus:outline-none focus:border-indigo-500 shadow-sm"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <div className="flex items-center gap-3">
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
              disabled={submitting || directoryLoading || !selectedLead}
              className="px-5 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Scheduling...</span>
                </>
              ) : (
                <span>Schedule Visit</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
