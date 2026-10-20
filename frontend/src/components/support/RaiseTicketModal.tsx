import React, { useState, useEffect } from 'react';
import { 
  X, 
  Upload, 
  Loader2, 
  AlertCircle, 
  CheckSquare, 
  Square, 
  Cpu, 
  Flame, 
  MapPin, 
  Activity, 
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';
import type { Ticket, TicketUrgency, CurrentUser, TicketPriority } from './types';
import { api } from './api';
import { 
  GARMENTS_IOT_CATEGORIES, 
  GARMENTS_SYSTEMS, 
  GARMENTS_FLOORS, 
  PRODUCTION_IMPACTS,
  type ProblemCategoryConfig 
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
  onTicketCreated
}) => {
  const [title, setTitle] = useState('');
  const [affectedSystem, setAffectedSystem] = useState(GARMENTS_SYSTEMS[0]);
  const [selectedCategoryName, setSelectedCategoryName] = useState(GARMENTS_IOT_CATEGORIES[0].category);
  const [priority, setPriority] = useState<TicketPriority>('Medium');
  const [productionImpact, setProductionImpact] = useState(PRODUCTION_IMPACTS[0]);
  const [lineNumber, setLineNumber] = useState('Line 04 (Sewing Unit A)');
  const [floorLocation, setFloorLocation] = useState(GARMENTS_FLOORS[1]);
  const [machineId, setMachineId] = useState('');
  const [description, setDescription] = useState('');
  
  // Dynamic IoT Fields state & Dynamic Checklist state
  const [iotDetails, setIotDetails] = useState<Record<string, string>>({});
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  
  const [files, setFiles] = useState<FileList | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active Category configuration
  const currentCategoryConfig: ProblemCategoryConfig = 
    GARMENTS_IOT_CATEGORIES.find((c) => c.category === selectedCategoryName) || GARMENTS_IOT_CATEGORIES[0];

  // Reset or preset dynamic fields when category changes
  useEffect(() => {
    const initialIot: Record<string, string> = {};
    currentCategoryConfig.dynamicFields.forEach((field) => {
      initialIot[field.key] = field.options ? field.options[0] : '';
    });
    setIotDetails(initialIot);

    // Reset checklist items
    const initialChecks: Record<string, boolean> = {};
    currentCategoryConfig.troubleshootingChecklist.forEach((item) => {
      initialChecks[item] = false;
    });
    setCheckedItems(initialChecks);
  }, [selectedCategoryName]);

  if (!isOpen) return null;

  const handleIotFieldChange = (key: string, value: string) => {
    setIotDetails((prev) => ({ ...prev, [key]: value }));
  };

  const toggleChecklistItem = (item: string) => {
    setCheckedItems((prev) => ({ ...prev, [item]: !prev[item] }));
  };

  const completedChecksCount = Object.values(checkedItems).filter(Boolean).length;
  const totalChecksCount = currentCategoryConfig.troubleshootingChecklist.length;

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

    // Verify required dynamic IoT fields
    for (const field of currentCategoryConfig.dynamicFields) {
      if (field.required && (!iotDetails[field.key] || !iotDetails[field.key].trim())) {
        setError(`Please fill in the required IoT field: "${field.label}"`);
        return;
      }
    }

    try {
      setSubmitting(true);
      setError(null);

      const completedChecklistList = Object.entries(checkedItems)
        .filter(([_, checked]) => checked)
        .map(([text]) => text);

      // Create ticket with IoT fields
      const created = await api.createTicket({
        title: title.trim(),
        affected_system: affectedSystem,
        category: selectedCategoryName,
        urgency: priority as TicketUrgency,
        priority: priority,
        production_impact: productionImpact,
        line_number: lineNumber,
        floor_location: floorLocation,
        machine_id: machineId.trim(),
        iot_details: iotDetails,
        troubleshooting_checklist: completedChecklistList,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="bg-[#111827] border border-[#1f293d] rounded-2xl max-w-3xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#1f293d] flex items-center justify-between bg-gradient-to-r from-[#111827] via-[#162035] to-[#111827]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Zap size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                Raise Garment IoT Support Ticket
              </h3>
              <p className="text-xs text-gray-400">
                Garments Smart Factory Telemetry & Machine Troubleshooting System
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
          <div className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
            {error && (
              <div className="p-3.5 bg-red-500/15 border border-red-500/30 text-red-400 rounded-xl text-xs flex items-center gap-2.5 shadow-sm">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* 1. Problem Category Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-200 flex items-center justify-between">
                <span>1. Problem Category (Garment IoT Architecture) <span className="text-blue-500">*</span></span>
                <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20 font-medium">
                  {currentCategoryConfig.badge}
                </span>
              </label>
              <select
                value={selectedCategoryName}
                onChange={(e) => setSelectedCategoryName(e.target.value)}
                className="w-full bg-[#0b1120] border border-[#1f293d] text-gray-100 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-inner"
                required
              >
                {GARMENTS_IOT_CATEGORIES.map((cat) => (
                  <option key={cat.category} value={cat.category}>
                    {cat.category} ({cat.badge})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-400 flex items-center gap-1.5 pl-0.5">
                <Info size={12} className="text-blue-400 shrink-0" />
                <span>{currentCategoryConfig.description}</span>
              </p>
            </div>

            {/* 2. Title / Problem Summary */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-200">
                2. Ticket Title / Problem Summary <span className="text-blue-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Line 04 Needle Counter Flatline / High Vibration Alarm on Exhaust Fan"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#0b1120] border border-[#1f293d] text-gray-100 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors shadow-inner"
                required
              />
            </div>

            {/* 3. Priority & Production Impact Grid */}
            <div className="bg-[#0e1626] border border-[#1f293d] rounded-xl p-4 space-y-4">
              <div className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Flame size={14} className="text-amber-400" />
                <span>Priority Level & Garment Floor Impact</span>
              </div>

              {/* Priority Pills */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-gray-400">
                  Priority / Urgency Level <span className="text-blue-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['Low', 'Medium', 'High', 'Critical / Emergency'] as TicketPriority[]).map((p) => {
                    const isSelected = priority === p;
                    let activeClass = '';
                    if (p === 'Low') activeClass = isSelected ? 'bg-blue-600/30 text-blue-300 border-blue-500 shadow-sm' : 'text-gray-400 border-[#1f293d]';
                    if (p === 'Medium') activeClass = isSelected ? 'bg-amber-600/30 text-amber-300 border-amber-500 shadow-sm' : 'text-gray-400 border-[#1f293d]';
                    if (p === 'High') activeClass = isSelected ? 'bg-orange-600/30 text-orange-300 border-orange-500 shadow-sm' : 'text-gray-400 border-[#1f293d]';
                    if (p === 'Critical / Emergency') activeClass = isSelected ? 'bg-red-600/30 text-red-300 border-red-500 ring-1 ring-red-500/50 shadow-sm' : 'text-gray-400 border-[#1f293d]';

                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition-all text-center flex items-center justify-center gap-1.5 bg-[#0b1120] hover:bg-[#131d31] ${activeClass}`}
                      >
                        {p === 'Critical / Emergency' && isSelected && (
                          <span className="w-2 h-2 rounded-full bg-red-400 animate-ping shrink-0" />
                        )}
                        <span>{p}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Production Impact Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-gray-400">
                  Garment Production Impact
                </label>
                <select
                  value={productionImpact}
                  onChange={(e) => setProductionImpact(e.target.value)}
                  className="w-full bg-[#0b1120] border border-[#1f293d] text-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {PRODUCTION_IMPACTS.map((imp) => (
                    <option key={imp} value={imp}>
                      {imp}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 4. Factory Floor & Machine Location */}
            <div className="bg-[#0e1626] border border-[#1f293d] rounded-xl p-4 space-y-3">
              <div className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin size={14} className="text-blue-400" />
                <span>Garment Factory Location Details</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-400">Floor / Building</label>
                  <select
                    value={floorLocation}
                    onChange={(e) => setFloorLocation(e.target.value)}
                    className="w-full bg-[#0b1120] border border-[#1f293d] text-gray-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {GARMENTS_FLOORS.map((fl) => (
                      <option key={fl} value={fl}>{fl}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-400">Production Line #</label>
                  <input
                    type="text"
                    placeholder="e.g. Line 04 (Sewing)"
                    value={lineNumber}
                    onChange={(e) => setLineNumber(e.target.value)}
                    className="w-full bg-[#0b1120] border border-[#1f293d] text-gray-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-gray-400">Machine / Asset Tag</label>
                  <input
                    type="text"
                    placeholder="e.g. JUKI-DDL-9000C #14"
                    value={machineId}
                    onChange={(e) => setMachineId(e.target.value)}
                    className="w-full bg-[#0b1120] border border-[#1f293d] text-gray-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* 5. DYNAMIC IOT FIELDS (Changes based on Category) */}
            <div className="bg-[#0b1424] border border-blue-900/40 rounded-xl p-4 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-blue-900/30 pb-2.5">
                <div className="flex items-center gap-2">
                  <Cpu size={15} className="text-blue-400" />
                  <span className="text-xs font-bold text-blue-200 uppercase tracking-wider">
                    Dynamic IoT Telemetry Parameters ({currentCategoryConfig.badge})
                  </span>
                </div>
                <span className="text-[10px] text-blue-400/80 italic font-mono">
                  auto-configured
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                {currentCategoryConfig.dynamicFields.map((field) => (
                  <div key={field.key} className="space-y-1">
                    <label className="text-[11px] font-semibold text-gray-300 flex items-center justify-between">
                      <span>{field.label} {field.required && <span className="text-blue-400">*</span>}</span>
                    </label>

                    {field.type === 'select' ? (
                      <select
                        value={iotDetails[field.key] || ''}
                        onChange={(e) => handleIotFieldChange(field.key, e.target.value)}
                        className="w-full bg-[#080d1a] border border-[#1e2c4a] text-gray-100 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-400 cursor-pointer shadow-inner"
                        required={field.required}
                      >
                        {field.options?.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder={field.placeholder}
                        value={iotDetails[field.key] || ''}
                        onChange={(e) => handleIotFieldChange(field.key, e.target.value)}
                        className="w-full bg-[#080d1a] border border-[#1e2c4a] text-gray-100 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-400 shadow-inner"
                        required={field.required}
                      >
                      </input>
                    )}
                    {field.helpText && (
                      <p className="text-[10px] text-gray-500 pl-0.5">{field.helpText}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 6. DYNAMIC PRE-TROUBLESHOOTING CHECKLIST */}
            <div className="bg-[#101b2b] border border-indigo-900/40 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-indigo-900/30 pb-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-indigo-400" />
                  <span className="text-xs font-bold text-indigo-200 uppercase tracking-wider">
                    Basic Troubleshooting Checklist (Pre-Ticket Verification)
                  </span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                  completedChecksCount === totalChecksCount 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                    : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                }`}>
                  {completedChecksCount} / {totalChecksCount} Verified
                </span>
              </div>

              <p className="text-[11px] text-gray-400">
                To streamline resolution, please review and check off basic on-site checks performed by the floor supervisor:
              </p>

              <div className="space-y-2 pt-1">
                {currentCategoryConfig.troubleshootingChecklist.map((checkText) => {
                  const isChecked = !!checkedItems[checkText];
                  return (
                    <div
                      key={checkText}
                      onClick={() => toggleChecklistItem(checkText)}
                      className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-all border ${
                        isChecked 
                          ? 'bg-emerald-950/25 border-emerald-800/40 text-emerald-200' 
                          : 'bg-[#0b1120] border-[#1e2c4a] text-gray-300 hover:bg-[#121c2f]'
                      }`}
                    >
                      <button type="button" className="mt-0.5 text-indigo-400 shrink-0">
                        {isChecked ? (
                          <CheckSquare size={16} className="text-emerald-400" />
                        ) : (
                          <Square size={16} className="text-gray-500" />
                        )}
                      </button>
                      <span className="text-xs select-none leading-relaxed">
                        {checkText}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 7. Detailed Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-200">
                7. Detailed Problem Description <span className="text-blue-500">*</span>
              </label>
              <textarea
                placeholder="Describe telemetry anomalies, machine behavior, error timestamps, or operator notes..."
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[#0b1120] border border-[#1f293d] text-gray-100 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-y transition-colors shadow-inner"
                required
              />
            </div>

            {/* 8. Supporting Evidence & Attachments */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-200">
                8. Supporting Evidence (Photos of wiring, LED status, or sensor logs)
              </label>
              <div className="flex items-center gap-3 p-3 bg-[#0b1120] border border-dashed border-[#2d3748] rounded-xl">
                <Upload size={18} className="text-gray-400 shrink-0" />
                <input
                  type="file"
                  multiple
                  onChange={(e) => setFiles(e.target.files)}
                  className="text-xs text-gray-400 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-gray-800 file:text-blue-400 hover:file:bg-gray-700 cursor-pointer"
                />
              </div>
              {files && files.length > 0 && (
                <div className="text-xs text-blue-400 font-medium pl-1">
                  ✓ {files.length} evidence attachment(s) queued for upload
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-4 bg-[#0d1424] border-t border-[#1f293d] flex items-center justify-between">
            <div className="text-[11px] text-gray-400 hidden sm:block">
              Floor Supervisor: <span className="text-gray-200 font-semibold">{currentUser.name}</span> ({currentUser.company_name})
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 rounded-xl text-xs text-gray-300 bg-gray-800 hover:bg-gray-700 border border-[#1f293d] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Submitting Ticket...
                  </>
                ) : (
                  'Submit IoT Ticket'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
