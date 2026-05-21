// ─────────────────────────────────────────────
// /admin/settings/alert-rules — 이상 시그널 룰 빌더 (super_admin / marketing)
//
// 구성:
//   1) 추천 룰 프리셋 5종 (원클릭 추가)
//   2) 활성/비활성 룰 카드 목록
//   3) 룰 평가 테스트 버튼
// ─────────────────────────────────────────────

import { redirect } from 'next/navigation'
import { requireAdminProfile } from '@/lib/admin/auth-helpers'
import { createAdminClient } from '@/lib/supabase/admin'
import AlertRulesClient from './AlertRulesClient'

export const dynamic = 'force-dynamic'

export default async function AlertRulesPage() {
  const profile = await requireAdminProfile()
  if (!['super_admin', 'marketing'].includes(profile.role)) {
    redirect('/admin?error=permission_denied')
  }

  const supabase = createAdminClient()
  const [{ data: rules }, { data: channels }, { data: users }] = await Promise.all([
    supabase
      .from('alert_rules')
      .select(
        'id, name, description, metric, dimension, dim_filter, comparison, threshold, comparison_basis, baseline_value, channel_codes, user_ids, cooldown_minutes, is_active, created_at',
      )
      .order('created_at', { ascending: false }),
    supabase
      .from('slack_channels')
      .select('code, label, is_active')
      .eq('is_active', true)
      .order('created_at', { ascending: true }),
    supabase
      .from('admin_users')
      .select('user_id, display_name, role, is_active, slack_user_id')
      .eq('is_active', true)
      .order('display_name', { ascending: true }),
  ])

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink-100 break-keep">이상 시그널 룰</h1>
        <p className="mt-1 text-sm text-ink-400 break-keep">
          CPA·ROAS·일 신청 수 등 임계치 초과 시 슬랙으로 자동 알림. 매시간 cron 평가.
          쿨다운 60분 (기본).
        </p>
      </div>

      <AlertRulesClient
        initialRules={rules ?? []}
        availableChannels={channels ?? []}
        availableUsers={users ?? []}
      />
    </div>
  )
}
