import React from 'react';
import { TicketStats } from './types';

interface StatCardsProps {
  stats: TicketStats;
}

export const StatCards: React.FC<StatCardsProps> = ({ stats }) => {
  return (
    <div className="sc-stats-grid">
      <div className="sc-stat-card active">
        <span className="sc-stat-title">ACTIVE TICKETS</span>
        <span className="sc-stat-value">{stats.active_tickets}</span>
      </div>

      <div className="sc-stat-card resolved">
        <span className="sc-stat-title">RESOLVED / CLOSED TICKETS</span>
        <span className="sc-stat-value">{stats.closed_tickets}</span>
      </div>

      <div className="sc-stat-card total">
        <span className="sc-stat-title">TOTAL TICKETS</span>
        <span className="sc-stat-value">{stats.total_tickets}</span>
      </div>
    </div>
  );
};
