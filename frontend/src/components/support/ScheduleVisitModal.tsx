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
  Plus,
  Trash2,
  CheckCircle2,
  ListTodo,
  ShieldAlert,
  Eye,
  EyeOff,
  Lock,
  UserCheck,
  ChevronDown,
  Ticket as TicketIcon,
  ClipboardCheck
} from 'lucide-react';
import type {
  VisitingReport,
  CurrentUser,
  VisitChecklistItem,
  SupportEmployee,
  ChecklistOption,
  Ticket
} from './types';
import { api } from './api';
import { GARMENTS_FLOORS, GARMENTS_SYSTEMS } from './iotConfig';
import { EmployeeSearchSelect, EmployeeMultiPicker } from './EmployeePicker';

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

  // Managed employee directory
  const [employees, setEmployees] = useState<SupportEmployee[]>([]);
  const [checklistOptions, setChecklistOptions] = useState<ChecklistOption[]>([]);
  const [directoryLoading, setDirectoryLoading] = useState(false);

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

  // Company-owner-visible checklist builder
  const [checklist, setChecklist] = useState<VisitChecklistItem[]>([
    { id: 'chk-1', task: 'Inspect and align optical needle sensor on sewing line', status: 'pending' },
    { id: 'chk-2', task: 'Calibrate RS485 impedance and line termination resistors', status: 'pending' },
    { id: 'chk-3', task: 'Test factory floor LoRaWAN edge gateway signal strength', status: 'pending' }
  ]);
  const [newChecklistText, setNewChecklistText] = useState('');

  // Super-admin-only internal checklist (dropdown options from management)
  const [superChecklist, setSuperChecklist] = useState<VisitChecklistItem[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState('');

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

  const handleAddSuperChecklistItem = () => {
    const option = checklistOptions.find((item) => item.id === selectedOptionId);
    if (!option) return;
    if (superChecklist.some((item) => item.option_id === option.id)) {
      setSelectedOptionId('');
      return;
    }
    setSuperChecklist((prev) => [
      ...prev,
      {
        id: `sa-chk-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        task: option.label,
        option_id: option.id,
        status: 'pending'
      }
    ]);
    setSelectedOptionId('');
  };

  const handleRemoveSuperChecklistItem = (id: string) => {
    setSuperChecklist((prev) => prev.filter((item) => item.id !== id));
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
    if (checklist.length === 0) {
      setError('Please add at least one task or objective to the company checklist.');
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
        visiting_engineers: [leadEngineer, ...teamMembers.map((member) => member.name)]
          .filter(Boolean)
          .join(', '),
        visit_checklist: checklist,
        super_admin_checklist: superChecklist,
        show_visitor_count: showVisitorCount,
        purpose: checklist.map((c) => c.task).join('; '),
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
                Dispatch Factory On-Site Engineer Visit
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pick engineers from the directory, set headcount visibility, and build both checklists
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
            <p className="text-[11px] text-slate-500">
              Link this visit to a ticket so the company&apos;s pre-troubleshooting checklist can be
              audited when the on-site team completes the visit.
            </p>

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
                <p className="text-[10px] text-slate-400 pt-0.5">
                  Verify these on-site. Items found not done can be flagged during completion.
                </p>
              </div>
            )}
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
                <span>Loading support employee directory...</span>
              </div>
            ) : employees.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 flex items-start gap-2">
                <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                <span>
                  No support employees found. Add employees in <strong>Support Ticket Management</strong>{' '}
                  to search and select visiting engineers.
                </span>
              </div>
            ) : null}

            {/* Main Engineer searchable picker */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                  <UserCheck size={12} className="text-slate-500" />
                  <span>Main / Lead Visiting Engineer</span>
                  <span className="text-red-500">*</span>
                </label>
                <EmployeeSearchSelect
                  employees={employees.filter((employee) => employee.is_lead_engineer !== false)}
                  value={leadEmployeeId || null}
                  onChange={(employeeId) => setLeadEmployeeId(employeeId)}
                  placeholder="Search main engineer..."
                  disabled={directoryLoading || employees.length === 0}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                  <Phone size={12} className="text-slate-500" />
                  <span>Main Engineer Phone (auto-filled)</span>
                </label>
                <input
                  type="text"
                  value={leadEngineerPhone}
                  readOnly
                  placeholder="Select the main engineer to auto-fill"
                  className="w-full bg-slate-100 border border-slate-300 text-slate-700 rounded-lg px-3 py-2 text-xs cursor-not-allowed"
                />
                <p className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Lock size={10} />
                  This is the number shown to the company owner.
                </p>
              </div>
            </div>

            {/* Accompanying employees */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-700 flex items-center justify-between">
                <span>Accompanying Visiting Employees</span>
                <span className="text-[10px] text-slate-400">
                  {teamMembers.length} selected • company sees names only
                </span>
              </label>
              <EmployeeMultiPicker
                employees={employees}
                selected={teamMembers}
                onAdd={handleAddTeamMember}
                onRemove={handleRemoveTeamMember}
                disabled={directoryLoading || employees.length === 0}
              />
              <p className="text-[11px] text-slate-500">
                Search and add every employee who will visit the factory. Only the main engineer's
                phone number is displayed to the company owner.
              </p>
            </div>

            {/* Headcount visibility toggle */}
            <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-start justify-between gap-3 shadow-xs">
              <div className="flex items-start gap-2">
                <span className={`mt-0.5 ${showVisitorCount ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {showVisitorCount ? <Eye size={16} /> : <EyeOff size={16} />}
                </span>
                <div>
                  <div className="text-[11px] font-semibold text-slate-800">
                    Show total headcount to company owner
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {showVisitorCount
                      ? `The company owner will see "Total: ${totalVisitorsCount} ${totalVisitorsCount === 1 ? 'Person' : 'Persons'}" on their acknowledgement screen.`
                      : 'Hidden from the company owner. Only the main engineer name and phone are shown.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={showVisitorCount}
                onClick={() => setShowVisitorCount((prev) => !prev)}
                title="Toggle total headcount visibility for the company owner"
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

          {/* Company Owner Visible Checklist Builder */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                <ListTodo size={15} className="text-indigo-600" />
                <span>Company Owner Checklist (visible to client)</span>
                <span className="text-red-500">*</span>
              </label>
              <span className="text-xs text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                {checklist.length} Task{checklist.length !== 1 ? 's' : ''}
              </span>
            </div>

            <p className="text-[11px] text-slate-500">
              These tasks are shown to and acknowledged by the factory owner. The on-site team will
              mark each one as solved or unsolved when completing the visit.
            </p>

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

          {/* Super Admin Internal Checklist (dropdown options) */}
          <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-bold text-purple-950 flex items-center gap-1.5 uppercase tracking-wide">
                <ShieldAlert size={15} className="text-purple-600" />
                <span>Super Admin Internal Checklist</span>
              </label>
              <span className="text-[10px] font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded border border-purple-200 flex items-center gap-1">
                <Lock size={10} />
                Super Admin only
              </span>
            </div>

            <p className="text-[11px] text-purple-800/80">
              Internal on-site checks. Options come from Support Ticket Management and are never
              shown to the company owner.
            </p>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <select
                  value={selectedOptionId}
                  onChange={(e) => setSelectedOptionId(e.target.value)}
                  className="w-full appearance-none bg-white border border-slate-300 text-slate-900 rounded-lg pl-3 pr-8 py-2 text-xs focus:outline-none focus:border-purple-500 shadow-sm cursor-pointer"
                >
                  <option value="">
                    {checklistOptions.length === 0
                      ? 'No options yet — add them in Support Ticket Management'
                      : 'Select an internal checklist option...'}
                  </option>
                  {checklistOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.category ? `[${option.category}] ` : ''}{option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-2.5 text-slate-400 pointer-events-none" />
              </div>
              <button
                type="button"
                onClick={handleAddSuperChecklistItem}
                disabled={!selectedOptionId}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-40 transition-colors shadow-sm flex items-center gap-1 shrink-0"
              >
                <Plus size={14} />
                <span>Add</span>
              </button>
            </div>

            <div className="space-y-1.5 max-h-44 overflow-y-auto">
              {superChecklist.length === 0 ? (
                <div className="p-3 text-center text-[11px] text-purple-700/60 bg-white rounded-lg border border-dashed border-purple-200">
                  No internal checks added yet.
                </div>
              ) : (
                superChecklist.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 bg-white border border-purple-200 rounded-lg text-xs text-slate-800 shadow-xs"
                  >
                    <div className="flex items-center gap-2.5 flex-1 pr-2">
                      <span className="w-5 h-5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <span className="font-medium">{item.task}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveSuperChecklistItem(item.id)}
                      className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Remove internal check"
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
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-500 hidden sm:flex items-center gap-1">
            <Phone size={12} className="text-emerald-600" />
            {selectedLead
              ? `${leadEngineer} • ${leadEngineerPhone}`
              : 'Select the main engineer'}
          </span>
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
                  <span>Scheduling Dispatch...</span>
                </>
              ) : (
                <span>Dispatch Visit ({totalVisitorsCount} Persons)</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
