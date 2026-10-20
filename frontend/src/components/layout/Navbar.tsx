import React from 'react';
import { Menu, Bell, Moon, Sun, Shield, Building2, ChevronRight } from 'lucide-react';
import { UserRole } from '../support/types';

interface NavbarProps {
  activeTab: 'tickets' | 'visiting';
  role: UserRole;
  onRoleToggle: () => void;
  userName: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  role,
  onRoleToggle,
  userName
}) => {
  return (
    <header style={{
      height: '60px',
      background: '#0b0f19',
      borderBottom: '1px solid #1a2336',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      gap: '16px'
    }}>
      {/* Left section: Hamburger, Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button style={{
          background: 'transparent',
          border: 'none',
          color: '#94a3b8',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          padding: '4px'
        }}>
          <Menu size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px' }}>
          <span style={{ color: '#64748b' }}>Dashboard</span>
          <ChevronRight size={14} color="#475569" />
          <span style={{ color: '#cbd5e1' }}>{userName}</span>
        </div>
      </div>

      {/* Right section: Role switcher, Notifications, Theme, User Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
        {/* Role Toggle Pill in Header */}
        <button
          onClick={onRoleToggle}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: role === 'company_admin' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(168, 85, 247, 0.12)',
            border: `1px solid ${role === 'company_admin' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(168, 85, 247, 0.3)'}`,
            color: role === 'company_admin' ? '#60a5fa' : '#c084fc',
            padding: '6px 12px',
            borderRadius: '9999px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          title="Click to switch role between Company Owner and Super Admin"
        >
          {role === 'company_admin' ? (
            <>
              <Building2 size={14} />
              <span>Role: Company Owner</span>
            </>
          ) : (
            <>
              <Shield size={14} />
              <span>Role: Super Admin</span>
            </>
          )}
          <span style={{ opacity: 0.6, fontSize: '10px', textDecoration: 'underline' }}>[switch]</span>
        </button>

        {/* Notifications Bell */}
        <div style={{ position: 'relative', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
          <Bell size={18} />
          <span style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#ef4444'
          }} />
        </div>

        {/* Dark Theme Icon */}
        <div style={{ cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
          <Moon size={18} />
        </div>

        {/* User Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            position: 'relative',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 600,
            fontSize: '13px'
          }}>
            {userName.charAt(0).toUpperCase()}
            <span style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#22c55e',
              border: '1.5px solid #0b0f19'
            }} />
          </div>
          <span style={{ fontSize: '13px', color: '#f3f4f6', fontWeight: 500 }}>
            {userName}
          </span>
        </div>
      </div>
    </header>
  );
};
