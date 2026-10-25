import React, { useMemo, useState } from 'react';
import { Search, Plus, ListFilter, Lock } from 'lucide-react';
import type { ChecklistOption } from './types';

const matchesReason = (option: ChecklistOption, query: string) => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    option.label.toLowerCase().includes(q) ||
    (option.category || '').toLowerCase().includes(q)
  );
};

interface ReasonSearchSelectProps {
  options: ChecklistOption[];
  selectedIds?: string[];
  onSelect: (option: ChecklistOption) => void;
  emptyHint?: string;
  noMatchHint?: string;
  disabled?: boolean;
  confidential?: boolean;
}

/**
 * Searchable reason picker, modelled on the visiting engineering delegation
 * picker: the options are maintained in Support Ticket Management, and the user
 * simply types to filter them and picks the reason to add.
 */
export const ReasonSearchSelect: React.FC<ReasonSearchSelectProps> = ({
  options,
  selectedIds = [],
  onSelect,
  emptyHint = 'No reasons available',
  noMatchHint = 'No matching reason',
  disabled = false,
  confidential = false,
}) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const filtered = useMemo(
    () => options.filter((option) => !selected.has(option.id) && matchesReason(option, query)),
    [options, query, selected]
  );

  const pick = (option: ChecklistOption) => {
    onSelect(option);
    setQuery('');
    setOpen(false);
  };

  return (
    <div className="space-y-1.5">
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
              if (e.key === 'Enter') {
                e.preventDefault();
                if (filtered.length > 0) pick(filtered[0]);
              }
            }}
            onBlur={() => window.setTimeout(() => setOpen(false), 150)}
            disabled={disabled}
            className={`w-full bg-white border border-slate-300 text-slate-900 rounded-lg pl-8 pr-8 py-2 text-xs focus:outline-none shadow-sm disabled:bg-slate-100 disabled:text-slate-400 ${
              confidential ? 'focus:border-purple-500' : 'focus:border-indigo-500'
            }`}
          />
          <span className="absolute right-2.5 text-slate-400 pointer-events-none">
            {confidential ? <Lock size={12} /> : <ListFilter size={12} />}
          </span>
        </div>

        {open && !disabled && (
          <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-2.5 text-[11px] text-slate-400">
                {options.length === 0 ? emptyHint : noMatchHint}
              </div>
            ) : (
              filtered.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(option)}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 transition-colors flex items-center justify-between gap-2"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <Plus size={12} className="text-indigo-600 shrink-0" />
                    <span className="font-medium text-slate-800 truncate">{option.label}</span>
                  </span>
                  {option.category && (
                    <span className="text-[10px] text-slate-500 shrink-0 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                      {option.category}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
