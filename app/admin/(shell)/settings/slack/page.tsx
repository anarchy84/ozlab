// ─────────────────────────────────────────────
// /admin/settings/slack — 슬랙 알림 인프라 설정 (super_admin)
//
// 구성:
//   1) 슬랙 채널 관리 (Webhook URL 등록 — 팀장이 직접)
//   2) 사용자별 슬랙 ID 매핑 (담당자 DM 발송용)
//   3) 테스트 발송 버튼
//
// 패턴:
//   - server component 가 권한 체크 + 초기 데이터 로드
//   - 폼은 클라이언트 컴포넌트 SlackSettingsClient
// ─────────────────────────────────────────────

import { redirect } from 'next/navigation'
import { requireAdminProfile } from '@/lib/admin/auth-helpers'
import { createAdminClient } from '@/lib/supabase/admin'
import SlackSettingsClient from './SlackSettingsClient'

export const dynamic = 'force-dynamic'

export default async function SlackSettingsPage() {
  const profile = await requireAdminProfile()
  if (profile.role !== 'super_admin') {
    redirect('/admin?error=permission_denied')
  }

  const supabase = createAdminClient()
  const [{ data: channels }, { data: users }] = await Promise.all([
    supabase
      .from('slack_channels')
      .select('id, code, label, channel_purpose, webhook_url, is_active, note, created_at')
      .order('created_at', { ascending: true }),
    supabase
      .from('admin_users')
      .select('user_id, display_name, role, is_active, slack_user_id, slack_dm_enabled')
      .eq('is_active', true)
      .order('display_name', { ascending: true }),
  ])

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink-100 break-keep">슬랙 알림 설정</h1>
        <p className="mt-1 text-sm text-ink-400 break-keep">
          신규 디비 알림과 이상 시그널 알람이 보내질 슬랙 채널과 사용자를 등록합니다.
          채널은 Webhook URL 만 박으면 바로 동작 (재배포 불필요).
        </p>
      </div>

      <SlackSettingsClient
        initialChannels={channels ?? []}
        initialUsers={users ?? []}
      />
    </div>
  )
}
