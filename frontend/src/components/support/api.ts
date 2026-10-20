import { Ticket, TicketStats, VisitingReport, TicketMessage, UserRole } from './types';

const DEFAULT_API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const DEFAULT_WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';

export class SupportApiClient {
  private apiBase: string;
  private wsBase: string;

  constructor(apiBase?: string, wsBase?: string) {
    this.apiBase = apiBase || DEFAULT_API_BASE;
    this.wsBase = wsBase || DEFAULT_WS_BASE;
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

  async getStats(role: UserRole, companyName?: string): Promise<TicketStats> {
    const params = new URLSearchParams();
    if (role === 'company_admin' && companyName) {
      params.append('company_name', companyName);
      params.append('role', role);
    }
    const res = await fetch(`${this.apiBase}/tickets/stats?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to load stats');
    return res.json();
  }

  async getTickets(options: {
    role?: UserRole;
    companyName?: string;
    status?: string;
    urgency?: string;
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
    if (options.category && options.category !== 'All') params.append('category', options.category);
    if (options.search) params.append('search', options.search);

    const res = await fetch(`${this.apiBase}/tickets?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to load tickets');
    return res.json();
  }

  async getTicketDetail(ticketId: string): Promise<Ticket> {
    const res = await fetch(`${this.apiBase}/tickets/${ticketId}`);
    if (!res.ok) throw new Error('Failed to fetch ticket details');
    return res.json();
  }

  async createTicket(payload: {
    title: string;
    affected_system: string;
    category: string;
    urgency: string;
    description: string;
    company_name: string;
    created_by_name: string;
    created_by_role: string;
  }): Promise<Ticket> {
    const res = await fetch(`${this.apiBase}/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to create ticket');
    }
    return res.json();
  }

  async updateTicketStatus(
    ticketId: string,
    status: string,
    updatedByRole: string,
    updatedByName: string,
    comment?: string
  ): Promise<{ message: string; status: string }> {
    const res = await fetch(`${this.apiBase}/tickets/${ticketId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        updated_by_role: updatedByRole,
        updated_by_name: updatedByName,
        comment,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update ticket status');
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
    const res = await fetch(`${this.apiBase}/tickets/${ticketId}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        closed_by_name: closedByName,
        closed_by_role: closedByRole,
        satisfaction_rating: satisfactionRating,
        close_notes: closeNotes,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to close ticket');
    }
    return res.json();
  }

  async reopenTicket(
    ticketId: string,
    userName: string,
    userRole: string
  ): Promise<{ message: string; status: string }> {
    const params = new URLSearchParams({ user_name: userName, user_role: userRole });
    const res = await fetch(`${this.apiBase}/tickets/${ticketId}/reopen?${params.toString()}`, {
      method: 'POST',
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
    const res = await fetch(`${this.apiBase}/tickets/${ticketId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to send message');
    return res.json();
  }

  async uploadFile(file: File, ticketId?: string, uploadedBy: string = 'User'): Promise<{ url: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);
    if (ticketId) formData.append('ticket_id', ticketId);
    formData.append('uploaded_by', uploadedBy);

    const res = await fetch(`${this.apiBase}/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  }

  async getVisitingReports(options: {
    role?: UserRole;
    companyName?: string;
    status?: string;
    search?: string;
  }): Promise<VisitingReport[]> {
    const params = new URLSearchParams();
    if (options.role) params.append('role', options.role);
    if (options.companyName && options.role === 'company_admin') {
      params.append('company_name', options.companyName);
    }
    if (options.status && options.status !== 'All') params.append('status', options.status);
    if (options.search) params.append('search', options.search);

    const res = await fetch(`${this.apiBase}/visiting?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch visiting reports');
    return res.json();
  }

  async createVisitingReport(payload: {
    company_name: string;
    target_system: string;
    visiting_engineers: string;
    purpose: string;
    scheduled_date: string;
    estimated_duration?: string;
    entry_requirements?: string;
    super_admin_notes?: string;
    ticket_id?: string;
  }): Promise<VisitingReport> {
    const res = await fetch(`${this.apiBase}/visiting`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to create visiting report');
    }
    return res.json();
  }

  async acknowledgeVisit(
    visitId: string,
    acknowledgedBy: string,
    notes?: string
  ): Promise<VisitingReport> {
    const res = await fetch(`${this.apiBase}/visiting/${visitId}/acknowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        acknowledged_by: acknowledgedBy,
        company_acknowledgement_notes: notes,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to acknowledge visit');
    }
    return res.json();
  }

  async completeVisit(
    visitId: string,
    serviceSummary: string,
    completedBy?: string
  ): Promise<VisitingReport> {
    const res = await fetch(`${this.apiBase}/visiting/${visitId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_summary: serviceSummary,
        completed_by: completedBy,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to complete visit');
    }
    return res.json();
  }
}

export const api = new SupportApiClient();
