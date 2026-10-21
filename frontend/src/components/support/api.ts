import type { Ticket, TicketStats, TicketMessage, UserRole, VisitingReport, TicketUrgency, TicketPriority } from './types';

const getDefaultApiBase = (): string => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined') {
    if (window.location.port !== '5173') {
      return `${window.location.origin}/api`;
    }
  }
  return 'http://localhost:8000/api';
};

const getDefaultWsBase = (): string => {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    if (window.location.port !== '5173') {
      return `${protocol}//${window.location.host}/ws`;
    }
  }
  return 'ws://localhost:8000/ws';
};

export class SupportApiClient {
  private apiBase: string;
  private wsBase: string;

  constructor(apiBase?: string, wsBase?: string) {
    this.apiBase = apiBase || getDefaultApiBase();
    this.wsBase = wsBase || getDefaultWsBase();
  }

  setUrls(apiBase: string, wsBase: string) {
    this.apiBase = apiBase;
    this.wsBase = wsBase;
  }

  getWebSocketTicketUrl(ticketId: string): string {
    return `${this.wsBase}/tickets/${ticketId}`;
  }

  getWebSocketNotificationsUrl(): string {
    return `${this.wsBase}/notifications`;
  }

  getFileUrl(path?: string): string {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:') || path.startsWith('data:')) {
      return path;
    }
    const origin = this.apiBase.replace(/\/api\/?$/, '');
    return `${origin}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  async getStats(role: UserRole, companyName?: string): Promise<TicketStats> {
    const params = new URLSearchParams();
    if (role === 'company_admin' && companyName) {
      params.append('company_name', companyName);
      params.append('role', role);
    }
    const res = await fetch(`${this.apiBase}/tickets/stats/?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to load stats');
    return res.json();
  }

  async getTickets(options: {
    role?: UserRole;
    companyName?: string;
    status?: string;
    urgency?: string;
    priority?: string;
    category?: string;
    search?: string;
  }): Promise<Ticket[]> {
    const params = new URLSearchParams();
    if (options.role) params.append('role', options.role);
    if (options.companyName && options.role === 'company_admin') {
      params.append('company_name', options.companyName);
    }
    if (options.status && options.status !== 'All') params.append('status', options.status);
    if (options.urgency && options.urgency !== 'All') params.append('urgency', options.urgency);
    if (options.priority && options.priority !== 'All') params.append('priority', options.priority);
    if (options.category && options.category !== 'All') params.append('category', options.category);
    if (options.search) params.append('search', options.search);

    const res = await fetch(`${this.apiBase}/tickets/?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to load tickets');
    return res.json();
  }

  async getTicketDetail(ticketId: string): Promise<Ticket> {
    const res = await fetch(`${this.apiBase}/tickets/${ticketId}/`);
    if (!res.ok) throw new Error('Failed to fetch ticket details');
    return res.json();
  }

  async createTicket(payload: {
    title: string;
    affected_system: string;
    category: string;
    urgency: TicketUrgency;
    priority?: TicketPriority;
    production_impact?: string;
    line_number?: string;
    floor_location?: string;
    machine_id?: string;
    iot_details?: Record<string, any>;
    troubleshooting_checklist?: string[];
    description: string;
    company_name: string;
    created_by_name: string;
    created_by_role: string;
  }): Promise<Ticket> {
    const res = await fetch(`${this.apiBase}/tickets/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': payload.created_by_role || 'company_admin',
        'x-user-name': payload.created_by_name || 'Arafath',
        'x-user-company': payload.company_name || 'CSI Smart Tech Ltd',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.error || 'Failed to create ticket');
    }
    return res.json();
  }

  async updateTicket(
    ticketId: string,
    payload: {
      title?: string;
      affected_system?: string;
      category?: string;
      urgency?: TicketUrgency;
      priority?: TicketPriority;
      production_impact?: string;
      line_number?: string;
      floor_location?: string;
      machine_id?: string;
      iot_details?: Record<string, any>;
      troubleshooting_checklist?: string[];
      description?: string;
      updated_by_name?: string;
      updated_by_role?: string;
      company_name?: string;
    }
  ): Promise<Ticket> {
    const res = await fetch(`${this.apiBase}/tickets/${ticketId}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': payload.updated_by_role || 'company_admin',
        'x-user-name': payload.updated_by_name || 'Arafath',
        'x-user-company': payload.company_name || '',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.error || 'Failed to update ticket');
    }
    return res.json();
  }

  updateTicketDetails = this.updateTicket.bind(this);

  async updateTicketStatus(
    ticketId: string,
    status: string,
    updatedByRole: string,
    updatedByName: string,
    comment?: string
  ): Promise<{ message: string; status: string }> {
    const res = await fetch(`${this.apiBase}/tickets/${ticketId}/status/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': updatedByRole,
        'x-user-name': updatedByName,
      },
      body: JSON.stringify({
        status,
        updated_by_role: updatedByRole,
        updated_by_name: updatedByName,
        comment,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.error || 'Failed to update ticket status');
    }
    return res.json();
  }

  async closeTicket(
    ticketId: string,
    closedByName: string,
    closedByRole: string,
    satisfactionRating?: number,
    closeNotes?: string
  ): Promise<{ message: string; status: string }> {
    const res = await fetch(`${this.apiBase}/tickets/${ticketId}/close/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': closedByRole,
        'x-user-name': closedByName,
      },
      body: JSON.stringify({
        closed_by_name: closedByName,
        closed_by_role: closedByRole,
        satisfaction_rating: satisfactionRating,
        close_notes: closeNotes,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.error || 'Failed to close ticket');
    }
    return res.json();
  }

  async reopenTicket(
    ticketId: string,
    userName: string,
    userRole: string
  ): Promise<{ message: string; status: string }> {
    const params = new URLSearchParams({ user_name: userName, user_role: userRole });
    const res = await fetch(`${this.apiBase}/tickets/${ticketId}/reopen/?${params.toString()}`, {
      method: 'POST',
      headers: {
        'x-user-role': userRole,
        'x-user-name': userName,
      },
    });
    if (!res.ok) throw new Error('Failed to reopen ticket');
    return res.json();
  }

  async sendMessage(
    ticketId: string,
    payload: {
      sender_name: string;
      sender_role: string;
      message: string;
      attachment_url?: string;
      attachment_name?: string;
    }
  ): Promise<TicketMessage> {
    const res = await fetch(`${this.apiBase}/tickets/${ticketId}/messages/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': payload.sender_role,
        'x-user-name': payload.sender_name,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to send message');
    return res.json();
  }

  async uploadFile(
    file: File,
    ticketId?: string,
    uploadedBy: string = 'User',
    source: 'ticket_creation' | 'chat' = 'ticket_creation'
  ): Promise<{ url: string; filename: string; file_name?: string; file_path?: string; file_type?: string; file_size?: number }> {
    const formData = new FormData();
    formData.append('file', file);
    if (ticketId) formData.append('ticket_id', ticketId);
    formData.append('uploaded_by', uploadedBy);
    formData.append('source', source);

    const res = await fetch(`${this.apiBase}/upload/`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  }

  // Visiting Reports API methods
  async getVisitingReports(options: {
    role?: UserRole;
    companyName?: string;
    status?: string;
    priority?: string;
    search?: string;
  }): Promise<VisitingReport[]> {
    const params = new URLSearchParams();
    if (options.role) params.append('role', options.role);
    if (options.companyName && options.role === 'company_admin') {
      params.append('company_name', options.companyName);
    }
    if (options.status && options.status !== 'All') params.append('status', options.status);
    if (options.priority && options.priority !== 'All') params.append('priority', options.priority);
    if (options.search) params.append('search', options.search);

    const res = await fetch(`${this.apiBase}/visiting/?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch visiting reports');
    return res.json();
  }

  async createVisitingReport(payload: {
    company_name: string;
    target_system: string;
    priority?: string;
    line_number?: string;
    floor_location?: string;
    visiting_engineers?: string;
    lead_engineer?: string;
    lead_engineer_phone?: string;
    visiting_team_names?: string;
    total_visitors?: number;
    visit_checklist?: import('./types').VisitChecklistItem[];
    purpose?: string;
    scheduled_date: string;
    estimated_duration?: string;
    entry_requirements?: string;
    super_admin_notes?: string;
    ticket_id?: string;
    user_role?: string;
    user_name?: string;
  }): Promise<VisitingReport> {
    const res = await fetch(`${this.apiBase}/visiting/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': payload.user_role || 'super_admin',
        'x-user-name': payload.user_name || 'Lead Field Engineer',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.error || 'Failed to create visiting report');
    }
    return res.json();
  }

  async acknowledgeVisit(
    visitId: string,
    acknowledgedBy: string,
    notes?: string,
    userRole: string = 'company_admin'
  ): Promise<VisitingReport> {
    const res = await fetch(`${this.apiBase}/visiting/${visitId}/acknowledge/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': userRole,
        'x-user-name': acknowledgedBy,
      },
      body: JSON.stringify({
        acknowledged_by: acknowledgedBy,
        company_acknowledgement_notes: notes,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.error || 'Failed to acknowledge visit');
    }
    return res.json();
  }

  async completeVisit(
    visitId: string,
    serviceSummary: string = '',
    completedBy?: string,
    userRole: string = 'super_admin',
    visitChecklist?: import('./types').VisitChecklistItem[]
  ): Promise<VisitingReport> {
    const res = await fetch(`${this.apiBase}/visiting/${visitId}/complete/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': userRole,
        'x-user-name': completedBy || 'Field Engineer',
      },
      body: JSON.stringify({
        service_summary: serviceSummary,
        completed_by: completedBy,
        visit_checklist: visitChecklist,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.error || 'Failed to complete visit');
    }
    return res.json();
  }
}

export const api = new SupportApiClient();
