// ─────────────────────────────────────────────
// 어드민 도메인 타입 (DB 스키마 mirror)
//
// 마이그레이션 :
//   - 20260429000001_admin_phase_a.sql  → db_statuses, consultation_*
//   - 20260429000002_admin_users_and_roles.sql → admin_users + role
// ─────────────────────────────────────────────

// ----- 5개 role -----
export const ADMIN_ROLES = [
  'super_admin',
  'admin',
  'counselor',
  'marketer',
  'viewer',
] as const

export type AdminRole = (typeof ADMIN_ROLES)[number]

// ----- 어드민 사용자 -----
export interface AdminUser {
  user_id: string
  role: AdminRole
  display_name: string | null
  department: string | null
  note: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// 본인 프로필 (RPC get_my_admin_profile() 반환 형태)
export interface MyAdminProfile {
  user_id: string
  email: string
  role: AdminRole
  display_name: string | null
  is_active: boolean
}

// ----- DB 상태 마스터 -----
export interface DbStatus {
  id: number
  sort_order: number
  code: string
  label: string
  bg_color: string
  text_color: string
  // 13개 자동화 플래그
  send_message: boolean
  is_promising: boolean
  force_recall: boolean
  is_conversion: boolean
  is_unapproved: boolean
  needs_counselor_confirm: boolean
  in_progress: boolean
  cannot_proceed: boolean
  include_in_gcl: boolean
  show_in_dashboard: boolean
  // 알림톡 템플릿 매핑 (Phase B)
  message_template_code: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type DbStatusInput = Omit<DbStatus, 'id' | 'created_at' | 'updated_at'>

// ----- 분석 뷰 -----
export interface ConsultationFunnelRow {
  status_code: string
  status_label: string
  status_color: string
  is_conversion: boolean
  is_promising: boolean
  is_unapproved: boolean
  total_count: number
  today_count: number
  week_count: number
  month_count: number
}

export interface ConsultationByChannelRow {
  channel: string
  campaign: string
  day: string
  lead_count: number
  conversion_count: number
  promising_count: number
  unapproved_count: number
  conversion_rate_pct: string | null
  unapproved_rate_pct: string | null
}

export interface ConsultationByCounselorRow {
  counselor_id: string
  counselor_name: string | null
  counselor_department: string | null
  counselor_role: AdminRole | null
  assigned_count: number
  conversion_count: number
  unapproved_count: number
  processed_count: number
  conversion_rate_pct: string | null
  unapproved_rate_pct: string | null
}
