import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { SupportModule } from './components/support';
import { UserRole } from './components/support/types';

export function App() {
  const [role, setRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem('support_user_role');
    return (saved === 'super_admin' || saved === 'company_admin') ? saved : 'company_admin';
  });

  const [activeTab, setActiveTab] = useState<'tickets' | 'visiting'>('tickets');

  const handleRoleToggle = () => {
    const newRole: UserRole = role === 'company_admin' ? 'super_admin' : 'company_admin';
    setRole(newRole);
    localStorage.setItem('support_user_role', newRole);
  };

  const userName = role === 'company_admin' ? 'Arafath' : 'Alex (Super Admin)';
  const companyName = 'CSI Smart Tech Ltd';

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: '#0b0f19' }}>
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        role={role}
      />

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        {/* Navbar */}
        <Navbar
          activeTab={activeTab}
          role={role}
          onRoleToggle={handleRoleToggle}
          userName={userName}
        />

        {/* Content Body with Breadcrumbs */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          {/* Breadcrumb matching screenshot */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginBottom: '20px' }}>
            <span style={{ color: '#3b82f6', cursor: 'pointer' }}>Home</span>
            <span style={{ color: '#475569' }}>/</span>
            <span style={{ color: '#94a3b8' }}>
              {activeTab === 'tickets' ? 'Support Tickets' : (role === 'company_admin' ? 'Visiting Report' : 'Visiting Log')}
            </span>
          </div>

          {/* Plug-and-Play Support Module */}
          <SupportModule
            key={`${role}-${activeTab}`}
            role={role}
            currentUser={{
              id: role === 'company_admin' ? 'usr-arafath' : 'usr-admin-alex',
              name: userName,
              role: role,
              company_name: companyName
            }}
            initialTab={activeTab}
            onRoleChange={(newRole) => setRole(newRole)}
          />

          {/* Footer matching screenshot */}
          <footer style={{
            marginTop: '40px',
            paddingTop: '20px',
            borderTop: '1px solid #1a2336',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12px',
            color: '#64748b'
          }}>
            <div>
              CSI Smart Tech &copy; 2026 All right reserved to CSI Smart Tech.
            </div>
            <div>
              Powered by <span style={{ color: '#38bdf8' }}>CSI Smart Tech</span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}

export default App;
