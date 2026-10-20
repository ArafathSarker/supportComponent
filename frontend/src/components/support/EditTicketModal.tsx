import React, { useState, useEffect } from 'react';
import { X, Upload, Loader2, AlertCircle, Edit3, Paperclip, Check } from 'lucide-react';
import type { Ticket, TicketUrgency, CurrentUser } from './types';
import { api } from './api';
import { DEFAULT_CATEGORIES, DEFAULT_SYSTEMS } from './RaiseTicketModal';

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
  categories = DEFAULT_CATEGORIES,
  systems = DEFAULT_SYSTEMS,
  onTicketUpdated
}) => {
  const [title, setTitle] = useState('');
  const [affectedSystem, setAffectedSystem] = useState(systems[0] || 'Water Flow Monitoring');
  const [category, setCategory] = useState(categories[0] || 'Hardware / Sensor / Device Problem');
  const [urgency, setUrgency] = useState<TicketUrgency>('Medium');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state whenever the selected ticket changes or modal opens
  useEffect(() => {
    if (ticket) {
      setTitle(ticket.title || '');
      setAffectedSystem(ticket.affected_system || systems[0] || 'Water Flow Monitoring');
      setCategory(ticket.category || categories[0] || 'Hardware / Sensor / Device Problem');
      setUrgency(ticket.urgency || 'Medium');
      setDescription(ticket.description || '');
      setFiles(null);
      setError(null);
    }
  }, [ticket, isOpen, systems, categories]);

  if (!isOpen || !ticket) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title / Problem Summary is required.');
      return;
    }
    if (!category || category === 'Select category') {
      setError('Problem Category is required.');
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
        urgency: urgency,
        description: description.trim(),
        updated_by_name: currentUser.name || 'Arafath',
        updated_by_role: currentUser.role
      });

      // 2. Upload any new additional evidence files
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          await api.uploadFile(files[i], ticket.id, currentUser.name);
        }
      }

      // Re-fetch latest ticket detail to ensure any new attachments are captured
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-[#111827] border border-[#1f293d] rounded-xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#1f293d] flex items-center justify-between bg-[#0d1424]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Edit3 size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white tracking-wide">
                  Edit Support Ticket
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30 font-bold">
                  {ticket.ticket_code}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                  ticket.status === 'Closed'
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : ticket.status === 'In Progress'
                    ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
                    : 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                }`}>
                  {ticket.status}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Company Owner: You can revise ticket specifications and update support context.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto space-y-4 flex-1">
            {error && (
              <div className="p-3 bg-red-500/15 border border-red-500/30 text-red-400 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Title / Problem Summary */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-300">
                Title / Problem Summary <span className="text-blue-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Enter ticket title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#0b1120] border border-[#1f293d] text-gray-100 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                required
              />
            </div>

            {/* Two-Column Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column: Affected System & Urgency */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-300">
                    Affected System
                  </label>
                  <select
                    value={affectedSystem}
                    onChange={(e) => setAffectedSystem(e.target.value)}
                    className="w-full bg-[#0b1120] border border-[#1f293d] text-gray-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 cursor-pointer"
                  >
                    {systems.map((sys) => (
                      <option key={sys} value={sys}>
                        {sys}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-300">
                    Urgency Level
                  </label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as TicketUrgency)}
                    className="w-full bg-[#0b1120] border border-[#1f293d] text-gray-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              {/* Right Column: Problem Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-300">
                  Problem Category <span className="text-blue-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#0b1120] border border-[#1f293d] text-gray-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 cursor-pointer"
                  required
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Detailed Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-300">
                Describe the Problem in detail <span className="text-blue-500">*</span>
              </label>
              <textarea
                placeholder="Describe the issue in detail"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[#0b1120] border border-[#1f293d] text-gray-100 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 resize-y transition-colors"
                required
              />
            </div>

            {/* Existing Attachments Display */}
            {ticket.attachments && ticket.attachments.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-400">
                  Existing Attachments ({ticket.attachments.length})
                </label>
                <div className="flex flex-wrap gap-2">
                  {ticket.attachments.map((att) => (
                    <a
                      key={att.id}
                      href={att.file_path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#0b1120] border border-[#1f293d] rounded text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <Paperclip size={12} />
                      <span className="truncate max-w-[150px]">{att.file_name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Additional Files */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-300">
                Attach Additional Evidence (Photos or Documents)
              </label>
              <div className="flex items-center gap-3 p-3 bg-[#0b1120] border border-dashed border-[#2d3748] rounded-lg">
                <Upload size={18} className="text-gray-400 shrink-0" />
                <input
                  type="file"
                  multiple
                  onChange={(e) => setFiles(e.target.files)}
                  className="text-xs text-gray-400 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-gray-800 file:text-amber-400 hover:file:bg-gray-700 cursor-pointer"
                />
              </div>
              {files && files.length > 0 && (
                <div className="text-xs text-amber-400 flex items-center gap-1">
                  <Check size={13} />
                  <span>{files.length} new file(s) will be uploaded upon saving</span>
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-4 bg-[#0d1424] border-t border-[#1f293d] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-sm text-gray-300 bg-gray-800 hover:bg-gray-700 border border-[#1f293d] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving Changes...
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
