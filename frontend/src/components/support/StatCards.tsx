import React from 'react';
import type { TicketStats } from './types';

interface StatCardsProps {
  stats: TicketStats;
}

export const StatCards: React.FC<StatCardsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      {/* Active Tickets */}
      <div className="bg-[#111827] border border-[#1f293d] border-l-4 border-l-blue-500 rounded-lg p-5 flex flex-col justify-between shadow-lg relative overflow-hidden">
        <span className="text-[11px] font-semibold text-gray-400 tracking-wider uppercase mb-2">
          ACTIVE TICKETS
        </span>
        <span className="text-3xl font-bold text-blue-400 tracking-tight">
          {stats.active_tickets}
        </span>
      </div>

      {/* Resolved / Closed Tickets */}
      <div className="bg-[#111827] border border-[#1f293d] border-l-4 border-l-emerald-500 rounded-lg p-5 flex flex-col justify-between shadow-lg relative overflow-hidden">
        <span className="text-[11px] font-semibold text-gray-400 tracking-wider uppercase mb-2">
          RESOLVED / CLOSED TICKETS
        </span>
        <span className="text-3xl font-bold text-emerald-400 tracking-tight">
          {stats.closed_tickets}
        </span>
      </div>

      {/* Total Tickets */}
      <div className="bg-[#111827] border border-[#1f293d] border-l-4 border-l-indigo-500 rounded-lg p-5 flex flex-col justify-between shadow-lg relative overflow-hidden sm:col-span-2 lg:col-span-1">
        <span className="text-[11px] font-semibold text-gray-400 tracking-wider uppercase mb-2">
          TOTAL TICKETS
        </span>
        <span className="text-3xl font-bold text-indigo-400 tracking-tight">
          {stats.total_tickets}
        </span>
      </div>
    </div>
  );
};
