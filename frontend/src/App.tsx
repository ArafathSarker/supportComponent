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

  const handleRoleToggle = () => {
    const newRole: UserRole = role === 'company_admin' ? 'super_admin' : 'company_admin';
    setRole(newRole);
    localStorage.setItem('support_user_role', newRole);
  };

  const userName = role === 'company_admin' ? 'Arafath' : 'Alex (Super Admin)';
  const companyName = 'CSI Smart Tech Ltd';

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0b0f19]">
      {/* Sidebar (IoT Platform Layout) */}
      <Sidebar role={role} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Navbar */}
        <Navbar
          role={role}
          onRoleToggle={handleRoleToggle}
          userName={userName}
        />

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto px-6 py-5">
          {/* Breadcrumb matching the user's screenshot */}
          <div className="flex items-center gap-2 text-xs mb-5">
            <span className="text-blue-500 hover:underline cursor-pointer">Home</span>
            <span className="text-gray-600">/</span>
            <span className="text-gray-400">Support Tickets</span>
          </div>

          {/* Dedicated Plug-and-Play Support Ticket Component */}
          <SupportTicketModule
            key={role}
            role={role}
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

          {/* Footer matching screenshot */}
          <footer className="mt-10 pt-5 border-t border-[#1a2336] flex flex-wrap justify-between items-center text-xs text-gray-500 gap-2">
            <div>
              CSI Smart Tech &copy; 2026 All right reserved to CSI Smart Tech.
            </div>
            <div>
              Powered by <span className="text-[#38bdf8] font-medium">CSI Smart Tech</span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}

export default App;
