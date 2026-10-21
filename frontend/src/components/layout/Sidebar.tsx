import React from 'react';
import { 
  Ticket, 
  FileCheck2, 
  Layers,
  X
} from 'lucide-react';
import type { UserRole } from '../support/types';

interface SidebarProps {
  role: UserRole;
  activeTab: 'tickets' | 'visiting';
  onTabChange: (tab: 'tickets' | 'visiting') => void;
  brandName?: string;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  role,
  activeTab,
  onTabChange,
  brandName = 'CSI Smart Tech Ltd',
  isOpenMobile = false,
  onCloseMobile
}) => {
  const content = (
    <aside className="w-64 sm:w-60 bg-white border-r border-slate-200 flex flex-col h-full shrink-0 shadow-xs">
      {/* Brand Header */}
      <div className="h-14 flex items-center justify-between px-5 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
            {brandName.charAt(0)}
          </div>
          <span className="text-slate-900 font-bold text-sm tracking-tight truncate">
            {brandName}
          </span>
        </div>

        {/* Mobile close button */}
        {onCloseMobile && (
          <button 
            type="button" 
            onClick={onCloseMobile}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 md:hidden"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav List */}
      <div className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Support System
        </div>

        {/* 1. Support Tickets Item */}
        <div 
          onClick={() => {
            onTabChange('tickets');
            if (onCloseMobile) onCloseMobile();
          }}
          className={`flex items-center justify-between px-3.5 py-2.5 text-xs font-medium rounded-r-lg transition-all cursor-pointer ${
            activeTab === 'tickets'
              ? 'text-blue-700 bg-blue-50 font-semibold border-l-4 border-blue-600 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Ticket size={16} className={activeTab === 'tickets' ? 'text-blue-600' : 'text-slate-400'} />
            <span>Support Tickets</span>
          </div>
          {activeTab === 'tickets' && (
            <span className="w-2 h-2 rounded-full bg-blue-600" />
          )}
        </div>

        {/* 2. Visiting Report / Visiting Log Item */}
        <div 
          onClick={() => {
            onTabChange('visiting');
            if (onCloseMobile) onCloseMobile();
          }}
          className={`flex items-center justify-between px-3.5 py-2.5 text-xs font-medium rounded-r-lg transition-all cursor-pointer ${
            activeTab === 'visiting'
              ? 'text-blue-700 bg-blue-50 font-semibold border-l-4 border-blue-600 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <FileCheck2 size={16} className={activeTab === 'visiting' ? 'text-blue-600' : 'text-slate-400'} />
            <span>{role === 'company_admin' ? 'Visiting Report' : 'Visiting Log'}</span>
          </div>
          {activeTab === 'visiting' && (
            <span className="w-2 h-2 rounded-full bg-blue-600" />
          )}
        </div>
      </div>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-slate-200 space-y-1 bg-slate-50/50">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Layers size={13} className="text-blue-600" />
          <span className="font-semibold text-slate-700">Support Component</span>
        </div>
        <div className="text-[11px] text-slate-400">
          v1.0 • Plug & Play Module
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Sidebar (hidden on mobile, visible on md and up) */}
      <div className="hidden md:flex h-screen">
        {content}
      </div>

      {/* Mobile Slide-Over Drawer with Backdrop */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 flex md:hidden" onClick={onCloseMobile}>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" />

          {/* Drawer Panel */}
          <div className="relative flex flex-col h-full z-10 shadow-2xl animate-fadeIn" onClick={(e) => e.stopPropagation()}>
            {content}
          </div>
        </div>
      )}
    </>
  );
};
