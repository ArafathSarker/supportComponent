import React from 'react';
import type { TicketStats } from './types';

interface StatCardsProps {
  stats: TicketStats;
}

export const StatCards: React.FC<StatCardsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      {/* Active Tickets */}
      <div className="bg-white border border-slate-200 border-l-4 border-l-blue-500 rounded-xl p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
        <span className="text-[11px] font-bold text-slate-500 tracking-wider uppercase mb-1">
          Active Tickets
        </span>
        <div className="flex items-baseline justify-between">
          <span className="text-3xl font-extrabold text-blue-600 tracking-tight">
            {stats.active_tickets}
          </span>
          <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
            Open & Review
          </span>
        </div>
      </div>

      {/* Resolved / Closed Tickets */}
      <div className="bg-white border border-slate-200 border-l-4 border-l-emerald-500 rounded-xl p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
        <span className="text-[11px] font-bold text-slate-500 tracking-wider uppercase mb-1">
          Resolved / Closed Tickets
        </span>
        <div className="flex items-baseline justify-between">
          <span className="text-3xl font-extrabold text-emerald-600 tracking-tight">
            {stats.closed_tickets}
          </span>
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            Customer Verified
          </span>
        </div>
      </div>

      {/* Total Tickets */}
      <div className="bg-white border border-slate-200 border-l-4 border-l-indigo-500 rounded-xl p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow relative overflow-hidden sm:col-span-2 lg:col-span-1">
        <span className="text-[11px] font-bold text-slate-500 tracking-wider uppercase mb-1">
          Total Tickets
        </span>
        <div className="flex items-baseline justify-between">
          <span className="text-3xl font-extrabold text-indigo-600 tracking-tight">
            {stats.total_tickets}
          </span>
          <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
            Lifetime Log
          </span>
        </div>
      </div>
    </div>
  );
};
