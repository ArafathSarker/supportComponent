import React, { useState } from 'react';
import { X, Upload, Loader2, AlertCircle } from 'lucide-react';
import type { Ticket, TicketUrgency, CurrentUser } from './types';
import { api } from './api';

export const DEFAULT_CATEGORIES = [
  'Hardware / Sensor / Device Problem',
  'Software / Firmware / App Bug',
  'Network / Connectivity Issue',
  'Data / Export / Reporting Issue',
  'SCADA / Dashboard / Display Issue',
  'User Account / Access / Permission',
  'Billing / Subscription / License',
  'Installation / Commissioning',
  'Other / General Enquiry'
];

export const DEFAULT_SYSTEMS = [
  'Water Flow Monitoring',
  'Main Electrical Substation SCADA',
  'Boiler Pressure & Temperature Line',
  'Energy Metering Gateway',
  'Effluent Treatment Plant (ETP)',
  'Chiller System Sensor Array',
  'Industrial Compressor Line',
  'Factory IoT Edge Gateway',
  'Other / Custom System'
];

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
  categories = DEFAULT_CATEGORIES,
  systems = DEFAULT_SYSTEMS,
  onTicketCreated
}) => {
  const [title, setTitle] = useState('');
  const [affectedSystem, setAffectedSystem] = useState(systems[0] || 'Water Flow Monitoring');
  const [category, setCategory] = useState(categories[0] || 'Hardware / Sensor / Device Problem');
  const [urgency, setUrgency] = useState<TicketUrgency>('Medium');
  const [description, setDescription] = useState('');
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

      // Create ticket
      const created = await api.createTicket({
        title: title.trim(),
        affected_system: affectedSystem,
        category: category,
        urgency: urgency,
        description: description.trim(),
        company_name: currentUser.company_name || 'CSI Smart Tech Ltd',
        created_by_name: currentUser.name || 'Arafath',
        created_by_role: currentUser.role
      });

      // Upload file attachments if any
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          await api.uploadFile(files[i], created.id, currentUser.name);
        }
      }

      onTicketCreated(created);
      onClose();
      // Reset state
      setTitle('');
      setDescription('');
      setFiles(null);
    } catch (err: any) {
      setError(err.message || 'Failed to raise ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-[#111827] border border-[#1f293d] rounded-xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#1f293d] flex items-center justify-between bg-[#111827]">
          <h3 className="text-base font-semibold text-white tracking-wide">
            Raise Support Ticket
          </h3>
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
                <AlertCircle size={15} />
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
                className="w-full bg-[#0b1120] border border-[#1f293d] text-gray-100 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
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
                    className="w-full bg-[#0b1120] border border-[#1f293d] text-gray-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
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
                    className="w-full bg-[#0b1120] border border-[#1f293d] text-gray-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
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
                  className="w-full bg-[#0b1120] border border-[#1f293d] text-gray-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
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
                className="w-full bg-[#0b1120] border border-[#1f293d] text-gray-100 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-y transition-colors"
                required
              />
            </div>

            {/* File Upload for Supporting Evidence */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-300">
                Attach Supporting Evidence (Photos or Videos)
              </label>
              <div className="flex items-center gap-3 p-3 bg-[#0b1120] border border-dashed border-[#2d3748] rounded-lg">
                <Upload size={18} className="text-gray-400 shrink-0" />
                <input
                  type="file"
                  multiple
                  onChange={(e) => setFiles(e.target.files)}
                  className="text-xs text-gray-400 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-gray-800 file:text-blue-400 hover:file:bg-gray-700 cursor-pointer"
                />
              </div>
              {files && files.length > 0 && (
                <div className="text-xs text-blue-400">
                  {files.length} file(s) ready to upload
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
              className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Submitting...
                </>
              ) : (
                'Raise Ticket'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
