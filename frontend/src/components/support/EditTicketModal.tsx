import React, { useState, useEffect } from 'react';
import { X, Upload, Loader2, AlertCircle, Edit3, Paperclip, Check, Cpu, Flame, MapPin, Info } from 'lucide-react';
import type { Ticket, TicketUrgency, CurrentUser, TicketPriority } from './types';
import { api } from './api';
import { 
  GARMENTS_IOT_CATEGORIES, 
  GARMENTS_SYSTEMS, 
  GARMENTS_FLOORS, 
  PRODUCTION_IMPACTS,
  type ProblemCategoryConfig 
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
  categories,
  systems,
  onTicketUpdated
}) => {
  const [title, setTitle] = useState('');
  const [affectedSystem, setAffectedSystem] = useState(GARMENTS_SYSTEMS[0]);
  const [category, setCategory] = useState(GARMENTS_IOT_CATEGORIES[0].category);
  const [priority, setPriority] = useState<TicketPriority>('Medium');
  const [productionImpact, setProductionImpact] = useState(PRODUCTION_IMPACTS[0]);
  const [lineNumber, setLineNumber] = useState('');
  const [floorLocation, setFloorLocation] = useState(GARMENTS_FLOORS[1]);
  const [machineId, setMachineId] = useState('');
  const [description, setDescription] = useState('');
  const [iotDetails, setIotDetails] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<FileList | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentCategoryConfig: ProblemCategoryConfig = 
    GARMENTS_IOT_CATEGORIES.find((c) => c.category === category) || GARMENTS_IOT_CATEGORIES[0];

  // Sync state whenever the selected ticket changes or modal opens
  useEffect(() => {
    if (ticket) {
      setTitle(ticket.title || '');
      setAffectedSystem(ticket.affected_system || GARMENTS_SYSTEMS[0]);
      setCategory(ticket.category || GARMENTS_IOT_CATEGORIES[0].category);
      setPriority((ticket.priority || ticket.urgency || 'Medium') as TicketPriority);
      setProductionImpact(ticket.production_impact || PRODUCTION_IMPACTS[0]);
      setLineNumber(ticket.line_number || '');
      setFloorLocation(ticket.floor_location || GARMENTS_FLOORS[1]);
      setMachineId(ticket.machine_id || '');
      setDescription(ticket.description || '');
      setIotDetails((ticket.iot_details as Record<string, string>) || {});
      setFiles(null);
      setError(null);
    }
  }, [ticket, isOpen]);

  if (!isOpen || !ticket) return null;

  const handleIotFieldChange = (key: string, value: string) => {
    setIotDetails((prev) => ({ ...prev, [key]: value }));
  };

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

      // 1. Update ticket details via API
      const updated = await api.updateTicket(ticket.id, {
        title: title.trim(),
        affected_system: affectedSystem,
        category: category,
        urgency: priority as TicketUrgency,
        priority: priority,
        production_impact: productionImpact,
        line_number: lineNumber,
        floor_location: floorLocation,
        machine_id: machineId.trim(),
        iot_details: iotDetails,
        description: description.trim(),
        updated_by_name: currentUser.name || 'Arafath',
        updated_by_role: currentUser.role,
        company_name: currentUser.company_name
      });

      // 2. Upload any new additional evidence files
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          await api.uploadFile(files[i], ticket.id, currentUser.name);
        }
      }

      // Re-fetch latest ticket detail
      const latestDetail = await api.getTicketDetail(ticket.id).catch(() => updated);

      onTicketUpdated(latestDetail);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update ticket details');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="bg-[#111827] border border-[#1f293d] rounded-2xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#1f293d] flex items-center justify-between bg-gradient-to-r from-[#111827] via-[#15233e] to-[#111827]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Edit3 size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                Edit IoT Ticket Details: {ticket.ticket_code}
              </h3>
              <p className="text-[11px] text-gray-400">
                Authorized for Company Owner ({currentUser.company_name})
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

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
            {error && (
              <div className="p-3.5 bg-red-500/15 border border-red-500/30 text-red-400 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Title / Summary */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-200">
                Title / Problem Summary <span className="text-blue-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#0b1120] border border-[#1f293d] text-gray-100 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            {/* Category and Subsystem */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300">Problem Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#0b1120] border border-[#1f293d] text-gray-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {GARMENTS_IOT_CATEGORIES.map((cat) => (
                    <option key={cat.category} value={cat.category}>
                      {cat.category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300">Affected Subsystem</label>
                <select
                  value={affectedSystem}
                  onChange={(e) => setAffectedSystem(e.target.value)}
                  className="w-full bg-[#0b1120] border border-[#1f293d] text-gray-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {GARMENTS_SYSTEMS.map((sys) => (
                    <option key={sys} value={sys}>{sys}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Priority & Production Impact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-[#0e1626] border border-[#1f293d] p-3 rounded-xl">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-300">Priority Level</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TicketPriority)}
                  className="w-full bg-[#0b1120] border border-[#1f293d] text-gray-100 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical / Emergency">Critical / Emergency</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-300">Production Impact</label>
                <select
                  value={productionImpact}
                  onChange={(e) => setProductionImpact(e.target.value)}
                  className="w-full bg-[#0b1120] border border-[#1f293d] text-gray-100 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {PRODUCTION_IMPACTS.map((imp) => (
                    <option key={imp} value={imp}>{imp}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Floor and Line */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-gray-400">Floor Location</label>
                <select
                  value={floorLocation}
                  onChange={(e) => setFloorLocation(e.target.value)}
                  className="w-full bg-[#0b1120] border border-[#1f293d] text-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500"
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
                  className="w-full bg-[#0b1120] border border-[#1f293d] text-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-gray-400">Machine / Asset Tag</label>
                <input
                  type="text"
                  value={machineId}
                  onChange={(e) => setMachineId(e.target.value)}
                  className="w-full bg-[#0b1120] border border-[#1f293d] text-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Dynamic IoT fields for Category */}
            {currentCategoryConfig.dynamicFields.length > 0 && (
              <div className="bg-[#0b1424] border border-blue-900/40 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center gap-2 border-b border-blue-900/30 pb-2">
                  <Cpu size={14} className="text-blue-400" />
                  <span className="text-[11px] font-bold text-blue-200 uppercase tracking-wider">
                    Dynamic IoT Parameters ({currentCategoryConfig.badge})
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {currentCategoryConfig.dynamicFields.map((field) => (
                    <div key={field.key} className="space-y-1">
                      <label className="text-[11px] font-medium text-gray-300">
                        {field.label}
                      </label>
                      {field.type === 'select' ? (
                        <select
                          value={iotDetails[field.key] || ''}
                          onChange={(e) => handleIotFieldChange(field.key, e.target.value)}
                          className="w-full bg-[#080d1a] border border-[#1e2c4a] text-gray-100 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-400 cursor-pointer"
                        >
                          {field.options?.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          placeholder={field.placeholder}
                          value={iotDetails[field.key] || ''}
                          onChange={(e) => handleIotFieldChange(field.key, e.target.value)}
                          className="w-full bg-[#080d1a] border border-[#1e2c4a] text-gray-100 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-400"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-200">
                Detailed Problem Description <span className="text-blue-500">*</span>
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[#0b1120] border border-[#1f293d] text-gray-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 resize-y"
                required
              />
            </div>

            {/* Attach More Evidence */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300">
                Attach Additional Evidence (Photos or Diagnostic Logs)
              </label>
              <div className="flex items-center gap-3 p-2.5 bg-[#0b1120] border border-dashed border-[#2d3748] rounded-xl">
                <Upload size={16} className="text-gray-400 shrink-0" />
                <input
                  type="file"
                  multiple
                  onChange={(e) => setFiles(e.target.files)}
                  className="text-xs text-gray-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-gray-800 file:text-blue-400 hover:file:bg-gray-700 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Modal Footer */}
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
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-md transition-all flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Saving Updates...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
