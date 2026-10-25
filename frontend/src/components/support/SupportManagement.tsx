import React, { useEffect, useState } from 'react';
import {
  UserPlus,
  Users,
  ListChecks,
  Search,
  Pencil,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldCheck,
  Phone,
  X,
  Lock
} from 'lucide-react';
import type { SupportEmployee, ChecklistOption } from './types';
import { api } from './api';

interface SupportManagementProps {
  isSuperAdmin?: boolean;
}

const emptyEmployeeForm = {
  name: '',
  phone: '',
  designation: '',
  department: '',
  is_lead_engineer: true,
  is_active: true,
};

const emptyOptionForm = {
  label: '',
  category: 'General',
  sort_order: 0,
  is_active: true,
};

export const SupportManagement: React.FC<SupportManagementProps> = ({ isSuperAdmin = true }) => {
  const [employees, setEmployees] = useState<SupportEmployee[]>([]);
  const [options, setOptions] = useState<ChecklistOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [optionSearch, setOptionSearch] = useState('');

  const [employeeForm, setEmployeeForm] = useState({ ...emptyEmployeeForm });
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [employeeError, setEmployeeError] = useState<string | null>(null);

  const [optionForm, setOptionForm] = useState({ ...emptyOptionForm });
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
  const [savingOption, setSavingOption] = useState(false);
  const [optionError, setOptionError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [employeeList, optionList] = await Promise.all([
        api.getSupportEmployees(),
        api.getChecklistOptions(),
      ]);
      setEmployees(employeeList);
      setOptions(optionList);
    } catch (err: any) {
      setEmployeeError(err.message || 'Failed to load support management data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (!isSuperAdmin) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-sm">
        <Lock size={28} className="text-slate-300 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-slate-800">Super Admin access only</h3>
        <p className="text-xs text-slate-500 mt-1">
          Support Ticket Management is restricted to the Solution Provider.
        </p>
      </div>
    );
  }

  const filteredEmployees = employees.filter((employee) => {
    const q = employeeSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      employee.name.toLowerCase().includes(q) ||
      employee.phone.toLowerCase().includes(q) ||
      (employee.designation || '').toLowerCase().includes(q) ||
      (employee.department || '').toLowerCase().includes(q)
    );
  });

  const filteredOptions = options.filter((option) => {
    const q = optionSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      option.label.toLowerCase().includes(q) ||
      (option.category || '').toLowerCase().includes(q)
    );
  });

  const leadEmployeeCount = employees.filter((employee) => employee.is_lead_engineer).length;

  // ---------------------------------------------------------------- Employees
  const handleEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeForm.name.trim()) {
      setEmployeeError('Employee name is required.');
      return;
    }
    if (!employeeForm.phone.trim()) {
      setEmployeeError('Employee phone number is required.');
      return;
    }

    try {
      setSavingEmployee(true);
      setEmployeeError(null);
      if (editingEmployeeId) {
        const updated = await api.updateSupportEmployee(editingEmployeeId, {
          ...employeeForm,
          name: employeeForm.name.trim(),
          phone: employeeForm.phone.trim(),
        });
        setEmployees((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const created = await api.createSupportEmployee({
          ...employeeForm,
          name: employeeForm.name.trim(),
          phone: employeeForm.phone.trim(),
        });
        setEmployees((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      }
      setEmployeeForm({ ...emptyEmployeeForm });
      setEditingEmployeeId(null);
    } catch (err: any) {
      setEmployeeError(err.message || 'Failed to save support employee.');
    } finally {
      setSavingEmployee(false);
    }
  };

  const handleEditEmployee = (employee: SupportEmployee) => {
    setEditingEmployeeId(employee.id);
    setEmployeeError(null);
    setEmployeeForm({
      name: employee.name,
      phone: employee.phone,
      designation: employee.designation || '',
      department: employee.department || '',
      is_lead_engineer: employee.is_lead_engineer !== false,
      is_active: employee.is_active !== false,
    });
  };

  const handleDeleteEmployee = async (employee: SupportEmployee) => {
    if (!window.confirm(`Remove ${employee.name} from the support employee directory?`)) return;
    try {
      setEmployeeError(null);
      await api.deleteSupportEmployee(employee.id);
      setEmployees((prev) => prev.filter((item) => item.id !== employee.id));
      if (editingEmployeeId === employee.id) {
        setEditingEmployeeId(null);
        setEmployeeForm({ ...emptyEmployeeForm });
      }
    } catch (err: any) {
      setEmployeeError(err.message || 'Failed to remove support employee.');
    }
  };

  const toggleEmployeeActive = async (employee: SupportEmployee) => {
    try {
      const updated = await api.updateSupportEmployee(employee.id, {
        is_active: !(employee.is_active !== false),
      });
      setEmployees((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err: any) {
      setEmployeeError(err.message || 'Failed to update employee status.');
    }
  };

  // --------------------------------------------------------- Checklist options
  const handleOptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!optionForm.label.trim()) {
      setOptionError('Option label is required.');
      return;
    }

    try {
      setSavingOption(true);
      setOptionError(null);
      if (editingOptionId) {
        const updated = await api.updateChecklistOption(editingOptionId, {
          ...optionForm,
          label: optionForm.label.trim(),
          category: optionForm.category.trim() || 'General',
        });
        setOptions((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const created = await api.createChecklistOption({
          ...optionForm,
          label: optionForm.label.trim(),
          category: optionForm.category.trim() || 'General',
        });
        setOptions((prev) =>
          [...prev, created].sort(
            (a, b) => (a.sort_order || 0) - (b.sort_order || 0) || a.label.localeCompare(b.label)
          )
        );
      }
      setOptionForm({ ...emptyOptionForm });
      setEditingOptionId(null);
    } catch (err: any) {
      setOptionError(err.message || 'Failed to save checklist option.');
    } finally {
      setSavingOption(false);
    }
  };

  const handleEditOption = (option: ChecklistOption) => {
    setEditingOptionId(option.id);
    setOptionError(null);
    setOptionForm({
      label: option.label,
      category: option.category || 'General',
      sort_order: option.sort_order || 0,
      is_active: option.is_active !== false,
    });
  };

  const handleDeleteOption = async (option: ChecklistOption) => {
    if (!window.confirm(`Delete the checklist option "${option.label}"?`)) return;
    try {
      setOptionError(null);
      await api.deleteChecklistOption(option.id);
      setOptions((prev) => prev.filter((item) => item.id !== option.id));
      if (editingOptionId === option.id) {
        setEditingOptionId(null);
        setOptionForm({ ...emptyOptionForm });
      }
    } catch (err: any) {
      setOptionError(err.message || 'Failed to remove checklist option.');
    }
  };

  const toggleOptionActive = async (option: ChecklistOption) => {
    try {
      const updated = await api.updateChecklistOption(option.id, {
        is_active: !(option.is_active !== false),
      });
      setOptions((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err: any) {
      setOptionError(err.message || 'Failed to update option status.');
    }
  };

  return (
    <div className="w-full space-y-5">
      {/* Page Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 shadow-sm">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Support Ticket Management
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
              Maintain the support employee directory used by visit dispatch, and manage the dynamic
              dropdown options for the Super Admin internal checklist.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-semibold">
          <Lock size={12} />
          Super Admin only
        </span>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-xs text-slate-400 shadow-sm flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin text-purple-600" />
          Loading support management data...
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
          {/* ------------------------------------------------ Employee Directory */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Support Employees</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {employees.length}
                </span>
              </div>
              <span className="text-[11px] text-slate-500">
                {leadEmployeeCount} lead engineer{leadEmployeeCount === 1 ? '' : 's'}
              </span>
            </div>

            <form onSubmit={handleEmployeeSubmit} className="p-4 space-y-3 border-b border-slate-100 bg-slate-50/30">
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
                <UserPlus size={13} className="text-indigo-600" />
                {editingEmployeeId ? 'Edit support employee' : 'Add support employee'}
              </div>

              {employeeError && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-[11px] flex items-start gap-2">
                  <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                  <span>{employeeError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700">
                    Employee Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={employeeForm.name}
                    onChange={(e) => setEmployeeForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Engr. Rezaul Karim"
                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 shadow-sm"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={employeeForm.phone}
                    onChange={(e) => setEmployeeForm((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="e.g. +880 1712-345678"
                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 shadow-sm"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700">Designation</label>
                  <input
                    type="text"
                    value={employeeForm.designation}
                    onChange={(e) => setEmployeeForm((prev) => ({ ...prev, designation: e.target.value }))}
                    placeholder="e.g. Field Service Engineer"
                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 shadow-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700">Department</label>
                  <input
                    type="text"
                    value={employeeForm.department}
                    onChange={(e) => setEmployeeForm((prev) => ({ ...prev, department: e.target.value }))}
                    placeholder="e.g. Field Service"
                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 shadow-sm"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-[11px] font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={employeeForm.is_lead_engineer}
                    onChange={(e) =>
                      setEmployeeForm((prev) => ({ ...prev, is_lead_engineer: e.target.checked }))
                    }
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Can be main / lead engineer
                </label>
                <label className="flex items-center gap-2 text-[11px] font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={employeeForm.is_active}
                    onChange={(e) =>
                      setEmployeeForm((prev) => ({ ...prev, is_active: e.target.checked }))
                    }
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  Active
                </label>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={savingEmployee}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-colors shadow-sm flex items-center gap-1.5"
                >
                  {savingEmployee ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <UserPlus size={13} />
                  )}
                  <span>{editingEmployeeId ? 'Save Changes' : 'Add Employee'}</span>
                </button>
                {editingEmployeeId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingEmployeeId(null);
                      setEmployeeForm({ ...emptyEmployeeForm });
                      setEmployeeError(null);
                    }}
                    className="px-3 py-2 rounded-lg text-xs font-medium text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            <div className="p-4 space-y-2.5">
              <div className="relative flex items-center">
                <Search size={13} className="absolute left-2.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  placeholder="Search employees by name, phone, designation..."
                  className="w-full bg-slate-50 border border-slate-300 text-slate-800 pl-8 pr-3 py-2 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-indigo-500 shadow-sm"
                />
              </div>

              <div className="max-h-[26rem] overflow-y-auto space-y-1.5 pr-1">
                {filteredEmployees.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-300 rounded-xl">
                    No support employees found. Add the first employee above.
                  </div>
                ) : (
                  filteredEmployees.map((employee) => (
                    <div
                      key={employee.id}
                      className={`p-3 rounded-xl border transition-colors ${
                        employee.is_active === false
                          ? 'bg-slate-50 border-slate-200 opacity-70'
                          : 'bg-white border-slate-200 hover:border-indigo-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {employee.name}
                            </span>
                            {employee.is_lead_engineer !== false && (
                              <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                Lead
                              </span>
                            )}
                            {employee.is_active === false && (
                              <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                                Inactive
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Phone size={10} className="text-emerald-600" />
                            <span className="font-medium text-slate-700">{employee.phone}</span>
                            {(employee.designation || employee.department) && (
                              <span className="truncate">
                                • {[employee.designation, employee.department].filter(Boolean).join(' • ')}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => toggleEmployeeActive(employee)}
                            title={employee.is_active === false ? 'Activate employee' : 'Deactivate employee'}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              employee.is_active === false
                                ? 'text-slate-400 border-slate-200 hover:text-emerald-600 hover:bg-emerald-50'
                                : 'text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100'
                            }`}
                          >
                            {employee.is_active === false ? <XCircle size={13} /> : <CheckCircle2 size={13} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditEmployee(employee)}
                            title="Edit employee"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEmployee(employee)}
                            title="Delete employee"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* ------------------------------------------- Checklist Dropdown Options */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-purple-50/50 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ListChecks size={16} className="text-purple-600" />
                <h3 className="text-sm font-bold text-slate-900">Internal Checklist Options</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                  {options.length}
                </span>
              </div>
              <span className="text-[11px] text-purple-700 flex items-center gap-1">
                <Lock size={10} />
                Not visible to client
              </span>
            </div>

            <form onSubmit={handleOptionSubmit} className="p-4 space-y-3 border-b border-slate-100 bg-slate-50/30">
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
                <ListChecks size={13} className="text-purple-600" />
                {editingOptionId ? 'Edit dropdown option' : 'Add dropdown option'}
              </div>

              {optionError && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-[11px] flex items-start gap-2">
                  <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                  <span>{optionError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700">
                  Option Label <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={optionForm.label}
                  onChange={(e) => setOptionForm((prev) => ({ ...prev, label: e.target.value }))}
                  placeholder="e.g. Verify control panel wiring and terminal tightness"
                  className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-purple-500 shadow-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700">Category</label>
                  <input
                    type="text"
                    value={optionForm.category}
                    onChange={(e) => setOptionForm((prev) => ({ ...prev, category: e.target.value }))}
                    placeholder="e.g. Electrical"
                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-purple-500 shadow-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700">Sort Order</label>
                  <input
                    type="number"
                    value={optionForm.sort_order}
                    onChange={(e) =>
                      setOptionForm((prev) => ({ ...prev, sort_order: Number(e.target.value) || 0 }))
                    }
                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-purple-500 shadow-sm"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-[11px] font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={optionForm.is_active}
                  onChange={(e) => setOptionForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                  className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                />
                Available in the Super Admin checklist dropdown
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={savingOption}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 transition-colors shadow-sm flex items-center gap-1.5"
                >
                  {savingOption ? <Loader2 size={13} className="animate-spin" /> : <ListChecks size={13} />}
                  <span>{editingOptionId ? 'Save Changes' : 'Add Option'}</span>
                </button>
                {editingOptionId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingOptionId(null);
                      setOptionForm({ ...emptyOptionForm });
                      setOptionError(null);
                    }}
                    className="px-3 py-2 rounded-lg text-xs font-medium text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            <div className="p-4 space-y-2.5">
              <div className="relative flex items-center">
                <Search size={13} className="absolute left-2.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={optionSearch}
                  onChange={(e) => setOptionSearch(e.target.value)}
                  placeholder="Search checklist options..."
                  className="w-full bg-slate-50 border border-slate-300 text-slate-800 pl-8 pr-3 py-2 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-purple-500 shadow-sm"
                />
                {optionSearch && (
                  <button
                    type="button"
                    onClick={() => setOptionSearch('')}
                    className="absolute right-2.5 p-0.5 rounded text-slate-400 hover:text-slate-700"
                    title="Clear search"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <div className="max-h-[26rem] overflow-y-auto space-y-1.5 pr-1">
                {filteredOptions.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-300 rounded-xl">
                    No checklist options found. Add the first option above to populate the dropdown.
                  </div>
                ) : (
                  filteredOptions.map((option) => (
                    <div
                      key={option.id}
                      className={`p-3 rounded-xl border transition-colors ${
                        option.is_active === false
                          ? 'bg-slate-50 border-slate-200 opacity-70'
                          : 'bg-white border-slate-200 hover:border-purple-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-900 leading-relaxed">
                            {option.label}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              {option.category || 'General'}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Sort #{option.sort_order || 0}
                            </span>
                            {option.is_active === false && (
                              <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                                Hidden
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => toggleOptionActive(option)}
                            title={option.is_active === false ? 'Enable option' : 'Disable option'}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              option.is_active === false
                                ? 'text-slate-400 border-slate-200 hover:text-emerald-600 hover:bg-emerald-50'
                                : 'text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100'
                            }`}
                          >
                            {option.is_active === false ? <XCircle size={13} /> : <CheckCircle2 size={13} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditOption(option)}
                            title="Edit option"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteOption(option)}
                            title="Delete option"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
