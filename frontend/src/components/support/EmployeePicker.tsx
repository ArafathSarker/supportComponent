import React, { useMemo, useState } from 'react';
import { Search, User, X, Phone, Plus, CheckCircle2 } from 'lucide-react';
import type { SupportEmployee } from './types';

const matches = (employee: SupportEmployee, query: string) => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    employee.name.toLowerCase().includes(q) ||
    (employee.phone || '').toLowerCase().includes(q) ||
    (employee.designation || '').toLowerCase().includes(q) ||
    (employee.department || '').toLowerCase().includes(q)
  );
};

interface EmployeeSearchSelectProps {
  employees: SupportEmployee[];
  value: string | null;
  onChange: (employeeId: string, employee: SupportEmployee | null) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}

/**
 * Searchable single-select for the main / lead visiting engineer.
 * Typing filters the managed employee directory; selecting auto-fills details.
 */
export const EmployeeSearchSelect: React.FC<EmployeeSearchSelectProps> = ({
  employees,
  value,
  onChange,
  placeholder = 'Search employee by name or phone...',
  disabled = false,
  required = false,
}) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const selected = employees.find((employee) => employee.id === value) || null;
  const filtered = useMemo(
    () => employees.filter((employee) => matches(employee, query)),
    [employees, query]
  );

  return (
    <div className="relative">
      <div className="relative flex items-center">
        <Search size={13} className="absolute left-2.5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={open ? query : (selected?.name || '')}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setQuery('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.preventDefault();
          }}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          disabled={disabled}
          required={required && !selected}
          className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg pl-8 pr-8 py-2 text-xs focus:outline-none focus:border-indigo-500 shadow-sm disabled:bg-slate-100 disabled:text-slate-400"
        />
        {selected && (
          <button
            type="button"
            onClick={() => {
              onChange('', null);
              setQuery('');
            }}
            className="absolute right-2 p-0.5 rounded text-slate-400 hover:text-slate-700"
            title="Clear selection"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {open && !disabled && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl max-h-52 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-2.5 text-[11px] text-slate-400">
              No matching employee. Add employees in Support Ticket Management.
            </div>
          ) : (
            filtered.map((employee) => (
              <button
                key={employee.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(employee.id, employee);
                  setQuery('');
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 transition-colors flex items-center justify-between gap-2 ${
                  employee.id === value ? 'bg-indigo-50/70' : ''
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <User size={13} className="text-indigo-600 shrink-0" />
                  <span className="min-w-0">
                    <span className="font-semibold text-slate-800 block truncate">
                      {employee.name}
                    </span>
                    <span className="text-[10px] text-slate-500 block truncate">
                      {[employee.designation, employee.department].filter(Boolean).join(' • ') || 'Support Employee'}
                    </span>
                  </span>
                </span>
                <span className="flex items-center gap-1 text-[10px] text-slate-500 shrink-0">
                  <Phone size={10} className="text-emerald-600" />
                  {employee.phone}
                </span>
                {employee.id === value && <CheckCircle2 size={13} className="text-indigo-600 shrink-0" />}
              </button>
            ))
          )}
        </div>
      )}

      {selected && (
        <p className="mt-1 text-[11px] text-emerald-700 flex items-center gap-1">
          <Phone size={11} />
          <span>
            Auto-filled contact: <strong>{selected.phone}</strong>
            {selected.designation ? ` • ${selected.designation}` : ''}
          </span>
        </p>
      )}
    </div>
  );
};

interface EmployeeMultiPickerProps {
  employees: SupportEmployee[];
  selected: SupportEmployee[];
  onAdd: (employee: SupportEmployee) => void;
  onRemove: (employeeId: string) => void;
  disabled?: boolean;
}

/**
 * Searchable multi-select for accompanying visiting employees.
 * Selected employees are stored as immutable snapshots on the visit record.
 */
export const EmployeeMultiPicker: React.FC<EmployeeMultiPickerProps> = ({
  employees,
  selected,
  onAdd,
  onRemove,
  disabled = false,
}) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const selectedIds = useMemo(() => new Set(selected.map((e) => e.id)), [selected]);
  const filtered = useMemo(
    () => employees.filter((employee) => !selectedIds.has(employee.id) && matches(employee, query)),
    [employees, query, selectedIds]
  );

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((employee) => (
            <span
              key={employee.id}
              className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-[11px] font-medium text-indigo-800"
            >
              <User size={11} className="text-indigo-600" />
              <span>{employee.name}</span>
              <button
                type="button"
                onClick={() => onRemove(employee.id)}
                className="p-0.5 rounded-full text-indigo-400 hover:text-red-600 hover:bg-white/70"
                title="Remove from visiting team"
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <div className="relative flex items-center">
          <Search size={13} className="absolute left-2.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.preventDefault();
            }}
            onBlur={() => window.setTimeout(() => setOpen(false), 150)}
            placeholder="Search employees to add to the visiting team..."
            disabled={disabled}
            className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg pl-8 pr-3 py-2 text-xs focus:outline-none focus:border-indigo-500 shadow-sm disabled:bg-slate-100 disabled:text-slate-400"
          />
        </div>

        {open && !disabled && (
          <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-2.5 text-[11px] text-slate-400">
                {employees.length === 0
                  ? 'No employees yet. Add them in Support Ticket Management.'
                  : 'No matching employee available.'}
              </div>
            ) : (
              filtered.map((employee) => (
                <button
                  key={employee.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onAdd(employee);
                    setQuery('');
                    setOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 transition-colors flex items-center justify-between gap-2"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <Plus size={12} className="text-indigo-600 shrink-0" />
                    <span className="min-w-0">
                      <span className="font-semibold text-slate-800 block truncate">{employee.name}</span>
                      <span className="text-[10px] text-slate-500 block truncate">
                        {[employee.designation, employee.department].filter(Boolean).join(' • ') || 'Support Employee'}
                      </span>
                    </span>
                  </span>
                  <span className="text-[10px] text-slate-500 shrink-0">{employee.phone}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
