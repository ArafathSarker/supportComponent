import React, { useState, useEffect } from 'react';
import { Building2, Shield, Wrench, Ticket, FileCheck2 } from 'lucide-react';
import type { UserRole, CurrentUser, SupportTicketProps } from './types';
import { api } from './api';
import { SupportTickets } from './SupportTickets';
import { VisitingReports } from './VisitingReports';

export const SupportTicketModule: React.FC<SupportTicketProps> = ({
  role: initialRole,
  currentUser: initialUser,
  activeTab: controlledTab,
  onTabChange,
  apiUrl,
  wsUrl,
  brandName = 'CSI Smart Tech Ltd',
  categories,
  systems,
  showRoleSwitcher = true,
  className = '',
  onRoleChange,
  onTicketCreated,
  onTicketUpdated,
  onTicketClosed
}) => {
  // Read role from localStorage if available, or prop, or default to company_admin
  const [role, setRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem('support_user_role');
    if (saved === 'super_admin' || saved === 'company_admin') {
      return saved as UserRole;
    }
    return initialRole || 'company_admin';
  });

  const [internalTab, setInternalTab] = useState<'tickets' | 'visiting'>('tickets');
  const currentTab = controlledTab || internalTab;

  const handleTabSwitch = (tab: 'tickets' | 'visiting') => {
    setInternalTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  // Sync API URL if provided
  useEffect(() => {
    if (apiUrl || wsUrl) {
      api.setUrls(
        apiUrl || 'http://localhost:8000/api',
        wsUrl || 'ws://localhost:8000/ws'
      );
    }
  }, [apiUrl, wsUrl]);

  const handleToggleRole = (newRole: UserRole) => {
    setRole(newRole);
    localStorage.setItem('support_user_role', newRole);
    if (onRoleChange) {
      onRoleChange(newRole);
    }
  };

  const currentUser: CurrentUser = {
    id: initialUser?.id || (role === 'company_admin' ? 'usr-company-1' : 'usr-super-1'),
    name: initialUser?.name || (role === 'company_admin' ? 'Arafath' : 'Alex (Super Admin)'),
    role: role,
    company_name: initialUser?.company_name || brandName,
    email: initialUser?.email
  };

  return (
    <div className={`w-full font-sans text-slate-800 ${className}`} id="support-ticket-component">
      {/* Role Switcher Banner (Persisted in localStorage) */}
      {showRoleSwitcher && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 mb-5 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center gap-3 text-xs flex-wrap">
            <span className="text-slate-500 font-medium">Current Role:</span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${
              role === 'company_admin'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-purple-50 text-purple-700 border-purple-200'
            }`}>
              {role === 'company_admin' ? (
                <>
                  <Building2 size={13} className="text-blue-600" />
                  Company Admin (Client / Factory Owner)
                </>
              ) : (
                <>
                  <Shield size={13} className="text-purple-600" />
                  Super Admin (Solution Provider)
                </>
              )}
            </span>
            <span className="text-slate-500 hidden sm:inline">
              | User: <strong className="text-slate-800">{currentUser.name}</strong> ({currentUser.company_name})
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleToggleRole(role === 'company_admin' ? 'super_admin' : 'company_admin')}
            title="Toggle perspective to test both Company Owner and Solution Provider permissions"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all shadow-xs"
          >
            <Wrench size={13} className="text-slate-600" />
            Switch to {role === 'company_admin' ? 'Super Admin' : 'Company Admin'} View
          </button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 mb-6">
        <button
          type="button"
          onClick={() => handleTabSwitch('tickets')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            currentTab === 'tickets'
              ? 'text-blue-600 border-blue-600 bg-blue-50/70 rounded-t-lg'
              : 'text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-100/60'
          }`}
        >
          <Ticket size={15} />
          <span>Support Tickets</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabSwitch('visiting')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            currentTab === 'visiting'
              ? 'text-blue-600 border-blue-600 bg-blue-50/70 rounded-t-lg'
              : 'text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-100/60'
          }`}
        >
          <FileCheck2 size={15} />
          <span>{role === 'company_admin' ? 'Visiting Report' : 'Visiting Log'}</span>
        </button>
      </div>

      {/* Active Tab View */}
      {currentTab === 'tickets' ? (
        <SupportTickets
          currentUser={currentUser}
          categories={categories}
          systems={systems}
          onTicketCreated={onTicketCreated}
          onTicketUpdated={onTicketUpdated}
          onTicketClosed={onTicketClosed}
        />
      ) : (
        <VisitingReports currentUser={currentUser} />
      )}
    </div>
  );
};
