import React, { useState, useEffect, useMemo } from 'react';
import { X, Upload, Loader2, AlertCircle, Edit3, MapPin, Zap, CheckSquare, Square, ListChecks } from 'lucide-react';
import type { Ticket, TicketUrgency, CurrentUser, TicketPriority, ProblemCategory } from './types';
import { api } from './api';
import { 
  GARMENTS_SYSTEMS, 
  GARMENTS_FLOORS, 
  PRODUCTION_IMPACTS 
} from './iotConfig';

interface EditTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: Ticket | null;
  currentUser: CurrentUser;
  categories?: string[];
  systems?: string[];
  onTicketUpdated: (updatedTicket: Ticket) => void;
}

export const EditTicketModal: React.FC<EditTicketModalProps> = ({
  isOpen,
  onClose,
  ticket,
  currentUser,
  systems,
  onTicketUpdated
}) => {
  const systemOptions = systems && systems.length > 0 ? systems : GARMENTS_SYSTEMS;

  // Problem categories and their checklists are managed in Support Ticket Management.
  const [categoryList, setCategoryList] = useState<ProblemCategory[]>([]);

  const [title, setTitle] = useState('');
  const [affectedSystem, setAffectedSystem] = useState(systemOptions[0]);
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('Medium');
  const [productionImpact, setProductionImpact] = useState(PRODUCTION_IMPACTS[0]);
  const [lineNumber, setLineNumber] = useState('');
  const [floorLocation, setFloorLocation] = useState(GARMENTS_FLOORS[1]);
  const [description, setDescription] = useState('');
  const [checkedItems, setCheckedItems] = useState<string[]>([]);

  // Keep the ticket's own category selectable even if it was retired from management
  const categoryOptions = useMemo(() => {
    const names = categoryList.map((item) => item.name);
    if (category && !names.includes(category)) return [category, ...names];
    return names;
  }, [categoryList, category]);

  const selectedCategory =
    categoryList.find((item) => item.name === category) || null;
  const preChecklist = selectedCategory?.checklist || [];

  const toggleChecklistItem = (item: string) => {
    setCheckedItems((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const [files, setFiles] = useState<FileList | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the dynamically managed problem categories when the modal opens
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    api
      .getProblemCategories({ activeOnly: true, role: currentUser.role })
      .then((list) => {
        if (!cancelled) setCategoryList(list);
      })
      .catch(() => {
        if (!cancelled) setCategoryList([]);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, currentUser.role]);

  // Sync state whenever the selected ticket changes or modal opens
  useEffect(() => {
    if (ticket) {
      setTitle(ticket.title || '');
      setAffectedSystem(ticket.affected_system || systemOptions[0]);
      setCategory(ticket.category || '');
      setPriority((ticket.priority || ticket.urgency || 'Medium') as TicketPriority);
      setProductionImpact(ticket.production_impact || PRODUCTION_IMPACTS[0]);
      setLineNumber(ticket.line_number || '');
      setFloorLocation(ticket.floor_location || GARMENTS_FLOORS[1]);
      setDescription(ticket.description || '');
      setCheckedItems(ticket.troubleshooting_checklist || []);
      setError(null);
    }
  }, [ticket, isOpen]);

  if (!isOpen || !ticket) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title / Problem Summary is required.');
      return;
    }
    if (!description.trim()) {
      setError('Please provide detailed problem description.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // 1. Update ticket details
      const updated = await api.updateTicket(ticket.id, {
        title: title.trim(),
        affected_system: affectedSystem,
        category: category,
        urgency: priority as TicketUrgency,
        priority: priority,
        production_impact: productionImpact,
        line_number: lineNumber,
        floor_location: floorLocation,
        machine_id: '',
        troubleshooting_checklist: checkedItems,
        description: description.trim(),
        updated_by_name: currentUser.name,
        updated_by_role: currentUser.role
      });

      // 2. Upload additional attachments if selected
      let finalTicket = updated;
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          await api.uploadFile(files[i], ticket.id, currentUser.name, 'ticket_creation');
        }
        try {
          finalTicket = await api.getTicketDetail(ticket.id);
        } catch {
          finalTicket = updated;
        }
      }

      onTicketUpdated(finalTicket);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update ticket details');
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
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-sm">
              <Edit3 size={18} />
            </div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Edit Ticket Details: <span className="font-mono text-blue-600">{ticket.ticket_code}</span>
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

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2 shadow-sm">
              <AlertCircle size={15} className="shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <span>Title / Problem Summary</span>
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-3.5 py-2.5 text-xs focus:bg-white focus:outline-none focus:border-blue-500 shadow-sm"
              required
            />
          </div>

          {/* System & Category Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Affected System</label>
              <select
                value={affectedSystem}
                onChange={(e) => setAffectedSystem(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm"
              >
                {systemOptions.map((sys) => (
                  <option key={sys} value={sys}>{sys}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Problem Category</label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setCheckedItems([]);
                }}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm"
              >
                {categoryOptions.length === 0 ? (
                  <option value="">No managed categories yet</option>
                ) : (
                  categoryOptions.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Pre-Troubleshooting Checklist */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                <ListChecks size={15} className="text-blue-600" />
                <span>Pre-Troubleshooting Checklist</span>
              </label>
              <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {checkedItems.length} of {preChecklist.length} Attempted
              </span>
            </div>

            <div className="space-y-1.5 pt-1">
              {preChecklist.length === 0 && (
                <div className="p-3 text-center text-[11px] text-slate-500 bg-white rounded-lg border border-dashed border-slate-300">
                  No pre-ticket checks for this category.
                </div>
              )}
              {preChecklist.map((item, idx) => {
                const isChecked = checkedItems.includes(item);
                return (
                  <div
                    key={idx}
                    onClick={() => toggleChecklistItem(item)}
                    className={`flex items-start gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                      isChecked
                        ? 'bg-blue-50/80 border-blue-300 text-blue-950 font-medium shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/60'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isChecked ? (
                        <CheckSquare size={16} className="text-blue-600" />
                      ) : (
                        <Square size={16} className="text-slate-400" />
                      )}
                    </div>
                    <span className="leading-snug select-none">{item}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Priority & Production Impact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Priority Level</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TicketPriority)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm"
              >
                <option value="Urgent">⚡ Urgent</option>
                <option value="Critical">🔴 Critical</option>
                <option value="High">🟠 High</option>
                <option value="Medium">🟡 Medium</option>
                <option value="Low">🟢 Low</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Production Impact</label>
              <select
                value={productionImpact}
                onChange={(e) => setProductionImpact(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm"
              >
                {PRODUCTION_IMPACTS.map((imp) => (
                  <option key={imp} value={imp}>{imp}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Floor & Line */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Factory Floor</label>
              <select
                value={floorLocation}
                onChange={(e) => setFloorLocation(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm"
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
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-blue-500 shadow-sm"
              />
            </div>
          </div>

          {/* Problem Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <span>Detailed Problem Description</span>
              <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg p-3 text-xs focus:bg-white focus:outline-none focus:border-blue-500 resize-y shadow-sm"
              required
            />
          </div>

          {/* Attach Additional Files */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Attach Additional Evidence (Photos or Videos)
            </label>
            <div className="relative border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-3.5 transition-colors bg-slate-50/60 text-center">
              <input
                type="file"
                multiple
                accept="image/*,video/*,.pdf,.doc,.docx"
                onChange={(e) => setFiles(e.target.files)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center space-y-1 text-slate-500">
                <Upload size={20} className="text-blue-500" />
                <span className="text-xs font-medium text-slate-700">
                  {files && files.length > 0 
                    ? `${files.length} file(s) selected` 
                    : 'Click or drop new photo/video evidence to attach'}
                </span>
              </div>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
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
            className="px-5 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <span>Save Ticket Changes</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
