// ─────────────────────────────────────────────
// 어드민 도메인 타입 (DB 스키마 mirror)
//
// 마이그레이션 :
//   - 20260429000001_admin_phase_a.sql  → db_statuses, consultation_*
//   - 20260429000002_admin_users_and_roles.sql → admin_users + role
// ─────────────────────────────────────────────

// ----- role 정의 (신규 5개 + 레거시 3개) -----
//   신규: super_admin / marketing / tm_lead / counselor / it_ops
//   레거시(호환): admin / marketer / viewer
//   ※ 권한 매트릭스는 DB role_permissions 에서 동적 관리
export const ADMIN_ROLES = [
  'super_admin',
  'marketing',
  'tm_lead',
  'counselor',
  'it_ops',
  // 레거시 호환
  'admin',
  'marketer',
  'viewer',
] as const

export type AdminRole = (typeof ADMIN_ROLES)[number]

// 권한 코드 (app_permissions.code 와 일치)
export type PermissionCode =
  | 'consultations.view'
  | 'consultations.edit'
  | 'consultations.delete'
  | 'consultations.distribute'
  | 'consultations.attribution'
  | 'consultations.blacklist'
  | 'revenue.view'
  | 'revenue.edit'
  | 'revenue.delete'
  | 'products.view'
  | 'products.edit'
  | 'ad_metrics.view'
  | 'ad_metrics.edit'
  | 'cta.edit'
  | 'content.view'
  | 'content.edit'
  | 'content.publish'
  | 'media.upload'
  | 'inline_edit'
  | 'users.invite'
  | 'users.assign_role'
  | 'statuses.edit'
  | 'settings.advanced'

export interface AppRole {
  code: AdminRole
  label: string
  description: string | null
  sort_order: number
  is_legacy: boolean
}

export interface AppPermission {
  code: PermissionCode
  group_label: string
  label: string
  description: string | null
  sort_order: number
}

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

// ----- CTA 버튼 -----
export const CTA_PLACEMENTS = [
  'nav',
  'hero',
  'showcase',
  'promotion',
  'floating',
  'footer',
  'pricing',
  'features',
  'mechanism',
  'review',
  'custom',
] as const

export type CtaPlacement = (typeof CTA_PLACEMENTS)[number]

export const CTA_STYLES = ['primary', 'secondary', 'ghost', 'outline', 'floating'] as const
export type CtaStyle = (typeof CTA_STYLES)[number]

// ─── Phase 2B: CTA 노출 방식 ────────────────────
export const CTA_TYPES = [
  'inline_anchor',     // 기존 — a 태그, #apply 스크롤
  'inline_form',       // 인라인 폼 (페이지 내 위치)
  'modal_form',        // 클릭 시 모달 폼
  'floating_button',   // 우하단 떠다니는 둥근 버튼 → 클릭 시 모달
  'sticky_bar',        // 상단/하단 고정 띠
  'toast',             // 우하단 슬라이드인 카드
] as const
export type CtaType = (typeof CTA_TYPES)[number]

// ─── Phase 2B: 폼 필드 정의 ────────────────────
export const CTA_FIELD_TYPES = [
  'text', 'phone', 'email', 'textarea', 'select', 'checkbox',
] as const
export type CtaFieldType = (typeof CTA_FIELD_TYPES)[number]

export interface CtaFormField {
  /** 필드 식별자 — consultations.custom_fields 키 또는 표준 컬럼명 */
  id: string
  /** 화면 라벨 */
  label: string
  /** 입력 타입 */
  type: CtaFieldType
  /** 필수 여부 */
  required?: boolean
  /** placeholder */
  placeholder?: string
  /** select 옵션 */
  options?: string[]
  /** phone 마스크 등 */
  mask?: string
}

// ─── Phase 2B: 트리거 설정 ────────────────────
export type CtaTriggerType = 'immediate' | 'scroll_pct' | 'time_sec' | 'exit_intent'

export interface CtaTriggerConfig {
  type: CtaTriggerType
  value?: number   // scroll_pct (0~100) / time_sec (초)
}

// ─── Phase 2B: 디자인 설정 ────────────────────
export type CtaPosition =
  | 'top' | 'bottom'
  | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  | 'center'

export interface CtaDisplayConfig {
  title?: string
  description?: string
  button_color?: string
  bg_color?: string
  position?: CtaPosition
  show_close?: boolean
}

export interface CtaButton {
  id: number
  placement: CtaPlacement
  sort_order: number
  label: string
  target_href: string
  target_blank: boolean
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  style: CtaStyle
  is_active: boolean
  note: string | null
  created_at: string
  updated_at: string
  // Phase 2B 폼 빌더 필드
  cta_type: CtaType
  form_fields: CtaFormField[]
  trigger_config: CtaTriggerConfig
  display_config: CtaDisplayConfig
  page_paths: string[] | null
}

export type CtaButtonInput = Omit<CtaButton, 'id' | 'created_at' | 'updated_at'>

export interface CtaPerformanceRow {
  cta_id: number
  placement: CtaPlacement
  label: string
  utm_campaign: string | null
  is_active: boolean
  lead_count: number
  conversion_count: number
  promising_count: number
  unapproved_count: number
  conversion_rate_pct: string | null
  today_count: number
  week_count: number
  month_count: number
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

// ----- 블랙리스트 -----
export const ABUSE_BLOCK_TYPES = ['phone', 'ip', 'email', 'user_agent_pattern'] as const
export type AbuseBlockType = (typeof ABUSE_BLOCK_TYPES)[number]

export interface AbuseBlocklistEntry {
  id: number
  block_type: AbuseBlockType
  block_value: string
  reason: string | null
  blocked_by: string | null
  blocked_at: string
  expires_at: string | null
  source_consultation_id: string | null
  hit_count: number
  source_consultation?: {
    id: string
    name: string | null
    phone: string | null
    store_name: string | null
    is_blacklisted: boolean | null
    created_at: string | null
  } | null
}

// ----- 상품 카탈로그 -----
export const PRODUCT_CATEGORIES = [
  '단말기',
  'POS',
  '리뷰자동화',
  '인터넷',
  '네이버페이연동',
  '부가서비스',
] as const
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number]

export interface Product {
  id: string
  code: string
  label: string
  category: string
  default_amount: number | null
  default_period: string | null
  is_subscription: boolean
  default_monthly: number | null
  sort_order: number
  is_active: boolean
  note: string | null
  created_at: string
  updated_at: string
  created_by: string | null
}

export type ProductInput = Omit<
  Product,
  'id' | 'created_at' | 'updated_at' | 'created_by'
>

// ----- 매출 기록 -----
export interface RevenueRecord {
  id: string
  consultation_id: string
  product_id: string | null
  product_label: string | null
  amount: number
  gift_amount: number
  net_amount: number
  monthly_amount: number | null
  contract_period: string | null
  revenue_date: string                // 'YYYY-MM-DD'
  recorded_by: string | null
  recorded_at: string
  note: string | null
}

export type RevenueRecordInput = Omit<
  RevenueRecord,
  'id' | 'net_amount' | 'recorded_at' | 'recorded_by'
>

// ----- 미디어 (이미지 업로드) -----
// /api/admin/media POST 가 반환하는 row 타입.
// MediaLibraryPicker · TipTapEditor 가 import 해서 사용.
export interface Media {
  id: string
  file_name: string
  storage_path: string                  // 원본 public URL
  webp_path: string | null              // WebP 변환본 public URL
  mime_type: string | null
  file_size: number | null
  width: number | null
  height: number | null
  alt_text: string | null
  uploaded_by?: string | null
  created_at: string
}
