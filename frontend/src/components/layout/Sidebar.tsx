import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  KeyRound, 
  Activity, 
  Cpu, 
  FileText, 
  LifeBuoy, 
  ChevronDown, 
  ChevronRight,
  Ticket,
  FileCheck2,
  HardDrive
} from 'lucide-react';
import { UserRole } from '../support/types';

interface SidebarProps {
  activeTab: 'tickets' | 'visiting';
  onTabChange: (tab: 'tickets' | 'visiting') => void;
  role: UserRole;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, role }) => {
  const [supportExpanded, setSupportExpanded] = useState(true);

  return (
    <aside style={{
      width: '240px',
      background: '#090e1a',
      borderRight: '1px solid #1a2336',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      flexShrink: 0
    }}>
      {/* Brand Header */}
      <div style={{
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: '10px',
        borderBottom: '1px solid #1a2336'
      }}>
        <div style={{
          width: '28px',
          height: '28px',
          borderRadius: '6px',
          background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontWeight: 700,
          fontSize: '14px'
        }}>
          C
        </div>
        <span style={{
          color: '#38bdf8',
          fontWeight: 600,
          fontSize: '15px',
          letterSpacing: '-0.2px'
        }}>
          CSI Smart Tech Ltd
        </span>
      </div>

      {/* Nav List */}
      <div style={{ flex: 1, padding: '16px 10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 14px',
          color: '#94a3b8',
          fontSize: '13.5px',
          borderRadius: '6px',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}>
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 14px',
          color: '#94a3b8',
          fontSize: '13.5px',
          borderRadius: '6px',
          cursor: 'pointer'
        }}>
          <Users size={18} />
          <span>Users</span>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 14px',
          color: '#94a3b8',
          fontSize: '13.5px',
          borderRadius: '6px',
          cursor: 'pointer'
        }}>
          <KeyRound size={18} />
          <span>Session</span>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 14px',
          color: '#94a3b8',
          fontSize: '13.5px',
          borderRadius: '6px',
          cursor: 'pointer'
        }}>
          <Activity size={18} />
          <span>SCADA</span>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 14px',
          color: '#94a3b8',
          fontSize: '13.5px',
          borderRadius: '6px',
          cursor: 'pointer'
        }}>
          <HardDrive size={18} />
          <span>Devices</span>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 14px',
          color: '#94a3b8',
          fontSize: '13.5px',
          borderRadius: '6px',
          cursor: 'pointer'
        }}>
          <FileText size={18} />
          <span>Reports</span>
        </div>

        {/* Support Section (Active & Collapsible) */}
        <div style={{ marginTop: '8px' }}>
          <div
            onClick={() => setSupportExpanded(!supportExpanded)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              color: '#38bdf8',
              background: 'rgba(56, 189, 248, 0.08)',
              fontSize: '13.5px',
              fontWeight: 500,
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <LifeBuoy size={18} color="#38bdf8" />
              <span>Support</span>
            </div>
            {supportExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </div>

          {supportExpanded && (
            <div style={{ paddingLeft: '28px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {/* Tickets Link */}
              <div
                onClick={() => onTabChange('tickets')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  color: activeTab === 'tickets' ? '#fff' : '#94a3b8',
                  background: activeTab === 'tickets' ? '#1e293b' : 'transparent',
                  borderLeft: activeTab === 'tickets' ? '2px solid #38bdf8' : '2px solid transparent',
                  fontSize: '13px',
                  borderRadius: '0 6px 6px 0',
                  cursor: 'pointer',
                  fontWeight: activeTab === 'tickets' ? 600 : 400
                }}
              >
                <Ticket size={15} color={activeTab === 'tickets' ? '#38bdf8' : '#64748b'} />
                <span>Tickets</span>
              </div>

              {/* Visiting Report Link */}
              <div
                onClick={() => onTabChange('visiting')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  color: activeTab === 'visiting' ? '#fff' : '#94a3b8',
                  background: activeTab === 'visiting' ? '#1e293b' : 'transparent',
                  borderLeft: activeTab === 'visiting' ? '2px solid #38bdf8' : '2px solid transparent',
                  fontSize: '13px',
                  borderRadius: '0 6px 6px 0',
                  cursor: 'pointer',
                  fontWeight: activeTab === 'visiting' ? 600 : 400
                }}
              >
                <FileCheck2 size={15} color={activeTab === 'visiting' ? '#38bdf8' : '#64748b'} />
                <span>{role === 'company_admin' ? 'Visiting Report' : 'Visiting Log'}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Footer */}
      <div style={{
        padding: '14px 16px',
        borderTop: '1px solid #1a2336',
        fontSize: '11px',
        color: '#64748b',
        lineHeight: 1.4
      }}>
        IoT Support Component v1.0
      </div>
    </aside>
  );
};
