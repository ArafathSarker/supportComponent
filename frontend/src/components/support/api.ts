import type { Ticket, TicketStats, TicketMessage, UserRole, VisitingReport, TicketUrgency, TicketPriority, TicketWorkspacePayload, SupportEmployee, ChecklistOption, ProblemCategory, VisitingTeamMember } from './types';

const getDefaultApiBase = (): string => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:8000/api';
    }
    return `${window.location.origin}/api`;
  }
  return 'http://localhost:8000/api';
};

const getDefaultWsBase = (): string => {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'ws://localhost:8000/ws';
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
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
    prechecklist?: import('./types').PrechecklistItem[];
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
      const errorMsg =
        err.detail ||
        err.error ||
        (typeof err === 'object' && Object.keys(err).length > 0
          ? Object.entries(err)
              .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
              .join(' | ')
          : `HTTP ${res.status}: ${res.statusText || 'Failed to create ticket'}`);
      throw new Error(errorMsg);
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

  async saveTicketWorkspace(
    ticketId: string,
    payload: TicketWorkspacePayload,
    userName?: string,
    userRole?: string
  ): Promise<Ticket> {
    const res = await fetch(`${this.apiBase}/tickets/${ticketId}/workspace/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': userRole || 'super_admin',
        'x-user-name': userName || 'Support Engineer',
      },
      body: JSON.stringify({
        ...payload,
        user_name: userName,
        user_role: userRole,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.error || 'Failed to save support workspace');
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

  // Support Ticket Management API methods (Super Admin only)
  async getSupportEmployees(options?: {
    search?: string;
    activeOnly?: boolean;
    leadOnly?: boolean;
  }): Promise<SupportEmployee[]> {
    const params = new URLSearchParams();
    if (options?.search) params.append('search', options.search);
    if (options?.activeOnly) params.append('active_only', '1');
    if (options?.leadOnly) params.append('lead_only', '1');

    const res = await fetch(`${this.apiBase}/support/employees/?${params.toString()}`, {
      headers: { 'x-user-role': 'super_admin' },
    });
    if (!res.ok) throw new Error('Failed to load support employees');
    return res.json();
  }

  async createSupportEmployee(payload: {
    name: string;
    phone: string;
    designation?: string;
    department?: string;
    is_lead_engineer?: boolean;
    is_active?: boolean;
  }): Promise<SupportEmployee> {
    const res = await fetch(`${this.apiBase}/support/employees/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-role': 'super_admin' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.phone?.[0] || err.name?.[0] || 'Failed to add support employee');
    }
    return res.json();
  }

  async updateSupportEmployee(
    employeeId: string,
    payload: Partial<SupportEmployee>
  ): Promise<SupportEmployee> {
    const res = await fetch(`${this.apiBase}/support/employees/${employeeId}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-user-role': 'super_admin' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.phone?.[0] || err.name?.[0] || 'Failed to update support employee');
    }
    return res.json();
  }

  async deleteSupportEmployee(employeeId: string): Promise<void> {
    const res = await fetch(`${this.apiBase}/support/employees/${employeeId}/`, {
      method: 'DELETE',
      headers: { 'x-user-role': 'super_admin' },
    });
    if (!res.ok) throw new Error('Failed to remove support employee');
  }

  async getChecklistOptions(options?: {
    search?: string;
    activeOnly?: boolean;
    category?: string;
    kind?: import('./types').ChecklistOptionKind;
    role?: UserRole;
  }): Promise<ChecklistOption[]> {
    const params = new URLSearchParams();
    if (options?.search) params.append('search', options.search);
    if (options?.activeOnly) params.append('active_only', '1');
    if (options?.category) params.append('category', options.category);
    if (options?.kind) params.append('kind', options.kind);

    const res = await fetch(`${this.apiBase}/support/checklist-options/?${params.toString()}`, {
      headers: { 'x-user-role': options?.role || 'super_admin' },
    });
    if (!res.ok) throw new Error('Failed to load checklist options');
    return res.json();
  }

  async createChecklistOption(payload: {
    kind: import('./types').ChecklistOptionKind;
    label: string;
    category?: string;
    sort_order?: number;
    is_active?: boolean;
  }): Promise<ChecklistOption> {
    const res = await fetch(`${this.apiBase}/support/checklist-options/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-role': 'super_admin' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        err.detail ||
        err.label?.[0] ||
        'Failed to add checklist option. The label may already exist.'
      );
    }
    return res.json();
  }

  async updateChecklistOption(
    optionId: string,
    payload: Partial<ChecklistOption>
  ): Promise<ChecklistOption> {
    const res = await fetch(`${this.apiBase}/support/checklist-options/${optionId}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-user-role': 'super_admin' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.label?.[0] || 'Failed to update checklist option');
    }
    return res.json();
  }

  async deleteChecklistOption(optionId: string): Promise<void> {
    const res = await fetch(`${this.apiBase}/support/checklist-options/${optionId}/`, {
      method: 'DELETE',
      headers: { 'x-user-role': 'super_admin' },
    });
    if (!res.ok) throw new Error('Failed to remove checklist option');
  }

  // Problem categories and their dynamic pre-ticket checklists
  async getProblemCategories(options?: {
    search?: string;
    activeOnly?: boolean;
    role?: UserRole;
  }): Promise<ProblemCategory[]> {
    const params = new URLSearchParams();
    if (options?.search) params.append('search', options.search);
    if (options?.activeOnly) params.append('active_only', '1');

    const res = await fetch(`${this.apiBase}/support/problem-categories/?${params.toString()}`, {
      headers: { 'x-user-role': options?.role || 'super_admin' },
    });
    if (!res.ok) throw new Error('Failed to load problem categories');
    return res.json();
  }

  async createProblemCategory(payload: {
    name: string;
    description?: string;
    checklist: string[];
    sort_order?: number;
    is_active?: boolean;
  }): Promise<ProblemCategory> {
    const res = await fetch(`${this.apiBase}/support/problem-categories/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-role': 'super_admin' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        err.detail ||
        err.name?.[0] ||
        'Failed to add problem category. The name may already exist.'
      );
    }
    return res.json();
  }

  async updateProblemCategory(
    categoryId: string,
    payload: Partial<ProblemCategory>
  ): Promise<ProblemCategory> {
    const res = await fetch(`${this.apiBase}/support/problem-categories/${categoryId}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-user-role': 'super_admin' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.name?.[0] || 'Failed to update problem category');
    }
    return res.json();
  }

  async deleteProblemCategory(categoryId: string): Promise<void> {
    const res = await fetch(`${this.apiBase}/support/problem-categories/${categoryId}/`, {
      method: 'DELETE',
      headers: { 'x-user-role': 'super_admin' },
    });
    if (!res.ok) throw new Error('Failed to remove problem category');
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
    lead_employee_id?: string | null;
    visiting_team_names?: string;
    visiting_team_members?: VisitingTeamMember[];
    total_visitors?: number;
    visit_reasons?: import('./types').VisitReason[];
    internal_visit_reasons?: import('./types').VisitReason[];
    show_visitor_count?: boolean;
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
    payload: {
      acknowledgedBy: string;
      hostName?: string;
      hostPhone?: string;
      notes?: string;
      userRole?: string;
    }
  ): Promise<VisitingReport> {
    const userRole = payload.userRole || 'company_admin';
    const res = await fetch(`${this.apiBase}/visiting/${visitId}/acknowledge/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': userRole,
        'x-user-name': payload.acknowledgedBy,
      },
      body: JSON.stringify({
        acknowledged_by: payload.acknowledgedBy,
        company_acknowledgement_notes: payload.notes || '',
        host_name: payload.hostName || '',
        host_phone: payload.hostPhone || '',
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
    payload: {
      service_summary?: string;
      completed_by?: string;
      user_role?: string;
      prechecklist_audit?: import('./types').PrechecklistAuditItem[];
      is_flagged?: boolean;
      flag_reason?: string;
      is_resolved?: boolean;
      resolution_notes?: string;
      host_name?: string;
      host_phone?: string;
      visit_reasons?: import('./types').VisitReason[];
      internal_visit_reasons?: import('./types').VisitReason[];
    }
  ): Promise<VisitingReport> {
    const res = await fetch(`${this.apiBase}/visiting/${visitId}/complete/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': payload.user_role || 'super_admin',
        'x-user-name': payload.completed_by || 'Field Engineer',
      },
      body: JSON.stringify({
        service_summary: payload.service_summary || '',
        completed_by: payload.completed_by,
        prechecklist_audit: payload.prechecklist_audit || [],
        is_flagged: payload.is_flagged || false,
        flag_reason: payload.flag_reason || '',
        is_resolved: payload.is_resolved,
        resolution_notes: payload.resolution_notes || '',
        host_name: payload.host_name || '',
        host_phone: payload.host_phone || '',
        visit_reasons: payload.visit_reasons || [],
        internal_visit_reasons: payload.internal_visit_reasons || [],
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.error || 'Failed to complete visit');
    }
    return res.json();
  }

  async confirmClientResolution(
    visitId: string,
    payload: {
      client_is_resolved?: boolean;
      client_resolution_notes?: string;
      client_resolved_by?: string;
      user_role?: string;
      visit_reasons?: import('./types').VisitReason[];
    }
  ): Promise<VisitingReport> {
    const userRole = payload.user_role || 'company_admin';
    const res = await fetch(`${this.apiBase}/visiting/${visitId}/confirm-resolution/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': userRole,
        'x-user-name': payload.client_resolved_by || 'Company Admin',
      },
      body: JSON.stringify({
        client_is_resolved: payload.client_is_resolved,
        client_resolution_notes: payload.client_resolution_notes || '',
        client_resolved_by: payload.client_resolved_by || '',
        visit_reasons: payload.visit_reasons || [],
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.error || 'Failed to submit client resolution confirmation');
    }
    return res.json();
  }

  async updateVisit(
    visitId: string,
    payload: {
      show_visitor_count?: boolean;
      internal_visit_reasons?: import('./types').VisitReason[];
      super_admin_notes?: string;
      host_name?: string;
      host_phone?: string;
    },
    userRole: string = 'super_admin',
    userName?: string
  ): Promise<VisitingReport> {
    const res = await fetch(`${this.apiBase}/visiting/${visitId}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': userRole,
        'x-user-name': userName || 'Super Admin',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.error || 'Failed to update visiting report');
    }
    return res.json();
  }
}

export const api = new SupportApiClient();
