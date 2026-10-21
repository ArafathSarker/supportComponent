import React, { useState, useEffect } from 'react';
import { 
  X, 
  Upload, 
  Loader2, 
  AlertCircle, 
  MapPin, 
  Layers,
  Zap,
  Info,
  Building2,
  FileText,
  CheckSquare,
  Square,
  ListChecks
} from 'lucide-react';
import type { Ticket, TicketUrgency, CurrentUser, TicketPriority } from './types';
import { api } from './api';
import { 
  GARMENTS_IOT_CATEGORIES, 
  GARMENTS_SYSTEMS, 
  GARMENTS_FLOORS, 
  PRODUCTION_IMPACTS 
} from './iotConfig';

interface RaiseTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: CurrentUser;
  categories?: string[];
  systems?: string[];
  onTicketCreated: (newTicket: Ticket) => void;
}

export const RaiseTicketModal: React.FC<RaiseTicketModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  categories,
  systems,
  onTicketCreated
}) => {
  const systemOptions = systems && systems.length > 0 ? systems : GARMENTS_SYSTEMS;
  const categoryOptions = categories && categories.length > 0 
    ? categories 
    : GARMENTS_IOT_CATEGORIES.map((c) => c.category);

  const [title, setTitle] = useState('');
  const [affectedSystem, setAffectedSystem] = useState(systemOptions[0]);
  const [selectedCategoryName, setSelectedCategoryName] = useState(categoryOptions[0]);
  const [priority, setPriority] = useState<TicketPriority>('Medium');
  const [productionImpact, setProductionImpact] = useState(PRODUCTION_IMPACTS[0]);
  const [lineNumber, setLineNumber] = useState('Line 04 (Sewing Unit A)');
  const [floorLocation, setFloorLocation] = useState(GARMENTS_FLOORS[1]);
  const [description, setDescription] = useState('');

  // Troubleshooting Pre-Checklist according to selected problem category
  const selectedCategoryConfig = GARMENTS_IOT_CATEGORIES.find(
    (c) => c.category.toLowerCase() === selectedCategoryName.toLowerCase()
  );
  const preChecklist = selectedCategoryConfig?.troubleshootingChecklist || [
    'Cleaned and inspected physical sensor/equipment',
    'Checked auxiliary power adapter and LED indicator',
    'Verified harness connections are secure',
    'Performed a 30-second restart/power-cycle'
  ];

  const [checkedItems, setCheckedItems] = useState<string[]>([]);

  // When problem category changes, reset checked items
  useEffect(() => {
    setCheckedItems([]);
  }, [selectedCategoryName]);

  const toggleChecklistItem = (item: string) => {
    setCheckedItems((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };
  
  const [files, setFiles] = useState<FileList | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

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

      // Create ticket with troubleshooting checklist
      const created = await api.createTicket({
        title: title.trim(),
        affected_system: affectedSystem,
        category: selectedCategoryName,
        urgency: priority as TicketUrgency,
        priority: priority,
        production_impact: productionImpact,
        line_number: lineNumber,
        floor_location: floorLocation,
        machine_id: '',
        troubleshooting_checklist: checkedItems,
        description: description.trim(),
        company_name: currentUser.company_name || 'CSI Smart Tech Ltd',
        created_by_name: currentUser.name || 'Arafath',
        created_by_role: currentUser.role
      });

      // Upload file attachments if any (marked explicitly as initial ticket_creation source)
      let finalTicket = created;
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          await api.uploadFile(files[i], created.id, currentUser.name, 'ticket_creation');
        }
        try {
          finalTicket = await api.getTicketDetail(created.id);
        } catch {
          finalTicket = created;
        }
      }

      onTicketCreated(finalTicket);
      onClose();
      // Reset state
      setTitle('');
      setDescription('');
      setCheckedItems([]);
      setFiles(null);
    } catch (err: any) {
      setError(err.message || 'Failed to raise ticket');
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
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-sm">
              <Zap size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Raise Support Ticket
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Submit an urgent issue report to our engineering support team
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

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2 shadow-sm">
              <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
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
              placeholder="e.g. Sewing Machine needle optical sensor disconnected on Line 04"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-3.5 py-2.5 text-xs focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm placeholder-slate-400"
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
                  <option key={sys} value={sys}>
                    {sys}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <span>Problem Category</span>
                <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedCategoryName}
                onChange={(e) => setSelectedCategoryName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm"
              >
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Pre-Troubleshooting Checklist (Context-specific for selected problem category) */}
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

            <p className="text-[11px] text-slate-500">
              Check all steps verified on the factory floor prior to raising this ticket:
            </p>

            <div className="space-y-1.5 pt-1">
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

          {/* Priority & Production Impact Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Urgency Level</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TicketPriority)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm"
              >
                <option value="Urgent">⚡ Urgent (Immediate Action)</option>
                <option value="Critical">🔴 Critical (Major Breakdown)</option>
                <option value="High">🟠 High Priority</option>
                <option value="Medium">🟡 Medium (Standard)</option>
                <option value="Low">🟢 Low Priority</option>
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
                  <option key={imp} value={imp}>
                    {imp}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Line Number & Floor Location */}
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
                placeholder="e.g. Line 04, Unit B"
                value={lineNumber}
                onChange={(e) => setLineNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-blue-500 shadow-sm"
              />
            </div>
          </div>

          {/* Detailed Problem Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <span>Describe the Problem in Detail</span>
              <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              placeholder="Provide exact details of what happened, symptoms noticed, machine behavior, or error codes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg p-3 text-xs focus:bg-white focus:outline-none focus:border-blue-500 resize-y shadow-sm placeholder-slate-400"
              required
            />
          </div>

          {/* Attach Evidence (Photos or Videos) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>Attach Supporting Evidence (Photos or Videos)</span>
              <span className="text-[11px] text-slate-400 font-normal">Optional</span>
            </label>
            <div className="relative border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-4 transition-colors bg-slate-50/60 hover:bg-blue-50/20 text-center">
              <input
                type="file"
                multiple
                accept="image/*,video/*,.pdf,.doc,.docx"
                onChange={(e) => setFiles(e.target.files)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center space-y-1 text-slate-500">
                <Upload size={22} className="text-blue-500" />
                <span className="text-xs font-medium text-slate-700">
                  {files && files.length > 0 
                    ? `${files.length} file(s) selected: ${Array.from(files).map(f => f.name).join(', ')}` 
                    : 'Click to choose photos or videos, or drag & drop files here'}
                </span>
                <span className="text-[10px] text-slate-400">
                  PNG, JPG, MP4, WebM, PDF up to 50MB
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
                <span>Submitting Ticket...</span>
              </>
            ) : (
              <span>Raise Ticket</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
