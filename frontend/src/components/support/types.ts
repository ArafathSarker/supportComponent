export type UserRole = 'company_admin' | 'super_admin';

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
  visiting_team_names?: string;
  total_visitors?: number;
  visit_checklist?: VisitChecklistItem[];
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
  activeTab?: 'tickets' | 'visiting';
  onTabChange?: (tab: 'tickets' | 'visiting') => void;
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
