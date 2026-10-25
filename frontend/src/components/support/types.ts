export type UserRole = 'company_admin' | 'super_admin';

export type SupportTab = 'tickets' | 'visiting' | 'management';

export interface SupportEmployee {
  id: string;
  name: string;
  phone: string;
  designation?: string;
  department?: string;
  is_lead_engineer?: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ChecklistOption {
  id: string;
  label: string;
  category?: string;
  sort_order?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface VisitingTeamMember {
  employee_id?: string;
  name: string;
  phone?: string;
  designation?: string;
}

export interface CurrentUser {
  id: string;
  name: string;
  role: UserRole;
  company_name: string;
  email?: string;
  avatarUrl?: string;
}

export type TicketStatus = 
  | 'Open' 
  | 'Under Review' 
  | 'In Progress' 
  | 'Pending Customer Close' 
  | 'Closed';

export type TicketUrgency = 'Low' | 'Medium' | 'High' | 'Critical' | 'Critical / Emergency';
export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Critical' | 'Critical / Emergency';

export interface TicketAttachment {
  id: string;
  ticket_id: string;
  file_name: string;
  file_path: string;
  file_type?: string;
  file_size?: number;
  uploaded_by: string;
  source?: 'ticket_creation' | 'chat';
  created_at: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_name: string;
  sender_role: string;
  message: string;
  attachment_url?: string;
  attachment_name?: string;
  is_system_event: boolean;
  created_at: string;
}

export interface Ticket {
  id: string;
  ticket_code: string;
  title: string;
  affected_system: string;
  category: string;
  urgency: TicketUrgency;
  priority?: TicketPriority;
  production_impact?: string;
  line_number?: string;
  floor_location?: string;
  machine_id?: string;
  sensor_id?: string;
  factory_section?: string;
  iot_details?: Record<string, any>;
  troubleshooting_checklist?: string[];
  support_severity?: string;
  assigned_engineer?: string;
  occurrence?: string;
  future_possibility?: string;
  root_cause?: string;
  support_note?: string;
  description: string;
  status: TicketStatus;
  company_name: string;
  created_by_name: string;
  created_by_role: string;
  closed_at?: string;
  closed_by?: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
  latest_message?: string;
  messages?: TicketMessage[];
  attachments?: TicketAttachment[];
}

export interface TicketWorkspacePayload {
  support_severity?: string;
  assigned_engineer?: string;
  occurrence?: string;
  future_possibility?: string;
  root_cause?: string;
  support_note?: string;
  status?: TicketStatus | string;
}

export interface TicketStats {
  total_tickets: number;
  active_tickets: number;
  in_progress_tickets: number;
  closed_tickets: number;
}

export type VisitStatus = 
  | 'Pending Acknowledgement' 
  | 'Acknowledged' 
  | 'Completed' 
  | 'Cancelled';

export interface VisitChecklistItem {
  id: string;
  task: string;
  status?: 'pending' | 'solved' | 'unsolved';
  option_id?: string;
  company_checked?: boolean;
  flagged?: boolean;
  flag_note?: string;
}

export interface VisitingReport {
  id: string;
  visit_code: string;
  ticket_id?: string;
  company_name: string;
  target_system: string;
  priority?: string;
  line_number?: string;
  floor_location?: string;
  visiting_engineers: string;
  lead_engineer?: string;
  lead_engineer_phone?: string;
  lead_employee_id?: string | null;
  visiting_team_names?: string;
  visiting_team_members?: VisitingTeamMember[];
  total_visitors?: number;
  visit_checklist?: VisitChecklistItem[];
  super_admin_checklist?: VisitChecklistItem[];
  show_visitor_count?: boolean;
  is_flagged?: boolean;
  flag_reason?: string;
  flag_checklist_items?: VisitChecklistItem[];
  flagged_at?: string;
  flagged_by?: string;
  purpose: string;
  scheduled_date: string;
  estimated_duration?: string;
  entry_requirements?: string;
  status: VisitStatus;
  super_admin_notes?: string;
  company_acknowledgement_notes?: string;
  acknowledged_at?: string;
  acknowledged_by?: string;
  completed_at?: string;
  service_summary?: string;
  created_at: string;
  updated_at: string;
}

export interface TicketUpdateData {
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
}

export interface SupportTicketProps {
  role?: UserRole;
  currentUser?: CurrentUser;
  activeTab?: SupportTab;
  onTabChange?: (tab: SupportTab) => void;
  apiUrl?: string;
  wsUrl?: string;
  brandName?: string;
  categories?: string[];
  systems?: string[];
  showRoleSwitcher?: boolean;
  className?: string;
  onRoleChange?: (newRole: UserRole) => void;
  onTicketCreated?: (ticket: Ticket) => void;
  onTicketUpdated?: (ticket: Ticket) => void;
  onTicketClosed?: (ticketId: string) => void;
}
