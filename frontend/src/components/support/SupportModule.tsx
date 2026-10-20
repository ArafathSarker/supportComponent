import React, { useState, useEffect } from 'react';
import { MessageSquare, Calendar, UserCheck, Shield, Building2, Wrench } from 'lucide-react';
import { UserRole, CurrentUser, SupportModuleProps } from './types';
import { api } from './api';
import { SupportTickets } from './SupportTickets';
import { VisitingReports } from './VisitingReports';
import './support.css';

export const SupportModule: React.FC<SupportModuleProps> = ({
  role: initialRole,
  currentUser: initialUser,
  apiUrl,
  wsUrl,
  initialTab = 'tickets',
  onRoleChange
}) => {
  // Read role from localStorage if available, or prop, or default to company_admin
  const [role, setRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem('support_user_role');
    if (saved === 'super_admin' || saved === 'company_admin') {
      return saved as UserRole;
    }
    return initialRole || 'company_admin';
  });

  const [activeTab, setActiveTab] = useState<'tickets' | 'visiting'>(initialTab);

  // Configure API client endpoints if provided
  useEffect(() => {
    if (apiUrl || wsUrl) {
      api.setUrls(
        apiUrl || 'http://localhost:8000/api',
        wsUrl || 'ws://localhost:8000/ws'
      );
    }
  }, [apiUrl, wsUrl]);

  // Sync role changes
  const handleToggleRole = (newRole: UserRole) => {
    setRole(newRole);
    localStorage.setItem('support_user_role', newRole);
    if (onRoleChange) {
      onRoleChange(newRole);
    }
  };

  const currentUser: CurrentUser = {
    id: initialUser?.id || (role === 'company_admin' ? 'usr-company-1' : 'usr-super-1'),
    name: initialUser?.name || (role === 'company_admin' ? 'Arafath (Company Owner)' : 'Alex / Super Admin'),
    role: role,
    company_name: initialUser?.company_name || 'CSI Smart Tech Ltd'
  };

  return (
    <div className="sc-container" id="support-plug-and-play-module">
      {/* Role Banner & 1-Click Tester Switcher */}
      <div className="sc-role-banner">
        <div className="sc-role-info">
          <span className="sc-text-muted" style={{ fontSize: '13px' }}>Current Active Role:</span>
          <span className={`sc-role-pill ${role}`}>
            {role === 'company_admin' ? (
              <>
                <Building2 size={13} />
                Company Admin (Client / Factory Owner)
              </>
            ) : (
              <>
                <Shield size={13} />
                Super Admin (Solution Provider Lead)
              </>
            )}
          </span>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            | User: <strong>{currentUser.name}</strong> ({currentUser.company_name})
          </span>
        </div>

        <button
          className="sc-role-toggle-btn"
          onClick={() => handleToggleRole(role === 'company_admin' ? 'super_admin' : 'company_admin')}
          title="Switch perspective to test both Company Owner and Solution Provider Super Admin"
        >
          <Wrench size={14} />
          Switch to {role === 'company_admin' ? 'Super Admin' : 'Company Admin'} View
        </button>
      </div>

      {/* Sub Tabs */}
      <div className="sc-tabs">
        <button
          className={`sc-tab-btn ${activeTab === 'tickets' ? 'active' : ''}`}
          onClick={() => setActiveTab('tickets')}
        >
          <MessageSquare size={16} />
          Support Tickets
        </button>

        <button
          className={`sc-tab-btn ${activeTab === 'visiting' ? 'active' : ''}`}
          onClick={() => setActiveTab('visiting')}
        >
          <Calendar size={16} />
          {role === 'company_admin' ? 'Visiting Report (Acknowledge Visits)' : 'Visiting Log (Field Dispatch)'}
        </button>
      </div>

      {/* Active Tab View */}
      {activeTab === 'tickets' ? (
        <SupportTickets currentUser={currentUser} />
      ) : (
        <VisitingReports currentUser={currentUser} />
      )}
    </div>
  );
};
