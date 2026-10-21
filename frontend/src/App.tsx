import React, { useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { SupportTicketModule } from './components/support';
import type { UserRole } from './components/support/types';

export function App() {
  const [role, setRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem('support_user_role');
    return (saved === 'super_admin' || saved === 'company_admin') ? saved : 'company_admin';
  });

  const [activeTab, setActiveTab] = useState<'tickets' | 'visiting'>('tickets');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleRoleToggle = () => {
    const newRole: UserRole = role === 'company_admin' ? 'super_admin' : 'company_admin';
    setRole(newRole);
    localStorage.setItem('support_user_role', newRole);
  };

  const userName = role === 'company_admin' ? 'Arafath' : 'Alex (Super Admin)';
  const companyName = 'CSI Smart Tech Ltd';

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f8fafc] text-slate-800">
      {/* Sidebar (Responsive for Desktop & Mobile) */}
      <Sidebar 
        role={role} 
        activeTab={activeTab} 
        onTabChange={(tab) => setActiveTab(tab)} 
        brandName={companyName}
        isOpenMobile={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0 bg-[#f8fafc]">
        {/* Navbar with Mobile Menu Trigger */}
        <Navbar
          role={role}
          onRoleToggle={handleRoleToggle}
          onToggleMobileMenu={() => setMobileMenuOpen(true)}
          userName={userName}
        />

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-6 bg-[#f8fafc]">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs mb-4 sm:mb-5">
            <span 
              className="text-blue-600 hover:underline cursor-pointer font-semibold" 
              onClick={() => setActiveTab('tickets')}
            >
              Support
            </span>
            <span className="text-slate-400">/</span>
            <span className="text-slate-600 font-medium truncate">
              {activeTab === 'tickets' ? 'Support Tickets' : (role === 'company_admin' ? 'Visiting Report' : 'Visiting Log')}
            </span>
          </div>

          {/* Dedicated Plug-and-Play Support Module */}
          <SupportTicketModule
            key={`${role}-${activeTab}`}
            role={role}
            activeTab={activeTab}
            onTabChange={(tab) => setActiveTab(tab)}
            currentUser={{
              id: role === 'company_admin' ? 'usr-arafath' : 'usr-admin-alex',
              name: userName,
              role: role,
              company_name: companyName
            }}
            brandName={companyName}
            showRoleSwitcher={true}
            onRoleChange={(newRole) => setRole(newRole)}
          />

          {/* Footer */}
          <footer className="mt-8 sm:mt-12 pt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center text-[11px] sm:text-xs text-slate-500 gap-2 text-center sm:text-left">
            <div>
              CSI Smart Tech &copy; 2026 All right reserved to CSI Smart Tech.
            </div>
            <div>
              Powered by <span className="text-blue-600 font-semibold">CSI Smart Tech</span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}

export default App;
