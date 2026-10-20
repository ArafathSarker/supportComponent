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
    <aside className="w-64 sm:w-60 bg-[#090e1a] border-r border-[#1a2336] flex flex-col h-full shrink-0">
      {/* Brand Header */}
      <div className="h-14 flex items-center justify-between px-5 border-b border-[#1a2336]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
            {brandName.charAt(0)}
          </div>
          <span className="text-[#38bdf8] font-semibold text-sm tracking-tight truncate">
            {brandName}
          </span>
        </div>

        {/* Mobile close button */}
        {onCloseMobile && (
          <button 
            type="button" 
            onClick={onCloseMobile}
            className="p-1 rounded-md text-gray-400 hover:text-white md:hidden"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav List */}
      <div className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
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
              ? 'text-white bg-[#1e293b] border-l-2 border-[#38bdf8] shadow-sm'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Ticket size={16} className={activeTab === 'tickets' ? 'text-[#38bdf8]' : 'text-gray-500'} />
            <span>Support Tickets</span>
          </div>
          {activeTab === 'tickets' && (
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
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
              ? 'text-white bg-[#1e293b] border-l-2 border-[#38bdf8] shadow-sm'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <FileCheck2 size={16} className={activeTab === 'visiting' ? 'text-[#38bdf8]' : 'text-gray-500'} />
            <span>{role === 'company_admin' ? 'Visiting Report' : 'Visiting Log'}</span>
          </div>
          {activeTab === 'visiting' && (
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          )}
        </div>
      </div>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-[#1a2336] space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Layers size={13} className="text-blue-400" />
          <span className="font-medium text-gray-300">Support Component</span>
        </div>
        <div className="text-[11px] text-gray-500">
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
