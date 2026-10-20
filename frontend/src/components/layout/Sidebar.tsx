import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  KeyRound, 
  Activity, 
  HardDrive, 
  FileText, 
  LifeBuoy, 
  Ticket 
} from 'lucide-react';
import type { UserRole } from '../support/types';

interface SidebarProps {
  role: UserRole;
}

export const Sidebar: React.FC<SidebarProps> = () => {
  return (
    <aside className="w-60 bg-[#090e1a] border-r border-[#1a2336] flex flex-col h-screen shrink-0 hidden md:flex">
      {/* Brand Header */}
      <div className="h-14 flex items-center px-5 gap-2.5 border-b border-[#1a2336]">
        <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
          C
        </div>
        <span className="text-[#38bdf8] font-semibold text-sm tracking-tight">
          CSI Smart Tech Ltd
        </span>
      </div>

      {/* Nav List */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="flex items-center gap-3 px-3 py-2 text-gray-400 text-xs rounded-lg hover:text-gray-200 hover:bg-gray-800/40 cursor-pointer transition-colors">
          <LayoutDashboard size={16} />
          <span>Dashboard</span>
        </div>

        <div className="flex items-center gap-3 px-3 py-2 text-gray-400 text-xs rounded-lg hover:text-gray-200 hover:bg-gray-800/40 cursor-pointer transition-colors">
          <Users size={16} />
          <span>Users</span>
        </div>

        <div className="flex items-center gap-3 px-3 py-2 text-gray-400 text-xs rounded-lg hover:text-gray-200 hover:bg-gray-800/40 cursor-pointer transition-colors">
          <KeyRound size={16} />
          <span>Session</span>
        </div>

        <div className="flex items-center gap-3 px-3 py-2 text-gray-400 text-xs rounded-lg hover:text-gray-200 hover:bg-gray-800/40 cursor-pointer transition-colors">
          <Activity size={16} />
          <span>SCADA</span>
        </div>

        <div className="flex items-center gap-3 px-3 py-2 text-gray-400 text-xs rounded-lg hover:text-gray-200 hover:bg-gray-800/40 cursor-pointer transition-colors">
          <HardDrive size={16} />
          <span>Devices</span>
        </div>

        <div className="flex items-center gap-3 px-3 py-2 text-gray-400 text-xs rounded-lg hover:text-gray-200 hover:bg-gray-800/40 cursor-pointer transition-colors">
          <FileText size={16} />
          <span>Reports</span>
        </div>

        {/* Support Section - Focused purely on Support Tickets */}
        <div className="pt-2">
          <div className="flex items-center gap-3 px-3 py-2 text-[#38bdf8] bg-sky-500/10 text-xs font-semibold rounded-lg cursor-pointer">
            <LifeBuoy size={16} className="text-[#38bdf8]" />
            <span>Support</span>
          </div>

          <div className="pl-6 mt-1 space-y-0.5">
            <div className="flex items-center gap-2.5 px-3 py-2 text-white bg-[#1e293b] border-l-2 border-[#38bdf8] text-xs font-medium rounded-r-md cursor-pointer">
              <Ticket size={14} className="text-[#38bdf8]" />
              <span>Tickets</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[#1a2336] text-[11px] text-gray-500">
        IoT Support Component v1.0
      </div>
    </aside>
  );
};
