import React from 'react';
import { 
  Ticket, 
  FileCheck2, 
  Layers
} from 'lucide-react';
import type { UserRole } from '../support/types';

interface SidebarProps {
  role: UserRole;
  activeTab: 'tickets' | 'visiting';
  onTabChange: (tab: 'tickets' | 'visiting') => void;
  brandName?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  role,
  activeTab,
  onTabChange,
  brandName = 'CSI Smart Tech Ltd' 
}) => {
  return (
    <aside className="w-60 bg-[#090e1a] border-r border-[#1a2336] flex flex-col h-screen shrink-0 hidden md:flex">
      {/* Brand Header */}
      <div className="h-14 flex items-center px-5 gap-2.5 border-b border-[#1a2336]">
        <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
          {brandName.charAt(0)}
        </div>
        <span className="text-[#38bdf8] font-semibold text-sm tracking-tight truncate">
          {brandName}
        </span>
      </div>

      {/* Nav List - Focused solely on Support System */}
      <div className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
          Support System
        </div>

        {/* 1. Support Tickets Item */}
        <div 
          onClick={() => onTabChange('tickets')}
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
          onClick={() => onTabChange('visiting')}
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
};
