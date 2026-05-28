'use client'

// ─────────────────────────────────────────────
// 상품표 시트 sync — 단일 시트 (표준 한글 헤더)
//
// 동작 :
//   1. 담당자가 구글 시트에 표준 헤더로 상품 입력
//   2. 어드민에서 시트 URL 등록
//   3. "미리보기 (검증만)" → "동기화" 순서로 실행
//
// 표준 헤더 (한글) :
//   상품 이름 | 분류 | 공급사 | 원가 | 우리 수당 | 고객 가격 |
//   약정 기간 | 월 정기 결제 | 월 결제 금액 | 단말기 종류 | 메모
//
// 호환 헤더 (자동 인식) :
//   NIT 양식: 품목명/품목군/공급사/판매가(기본)/제품설명 …
//   네이버 렌탈표: 상품구성/구성/단가/렌탈가/일시불/비고
// ─────────────────────────────────────────────

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface Config {
  sheet_csv_url: string | null
  last_synced_at: string | null
  last_status: string | null
  last_message: string | null
  rows_processed: number | null
  rows_inserted: number | null
  rows_updated: number | null
  rows_error: number | null
}

interface RecentProduct {
  code: string
  label: string
  category: string | null
  vendor: string | null
  customer_price: number | null
  device_cost: number | null
  updated_at: string
}

interface SyncResult {
  row_idx?: number
  code?: string
  label?: string
  category?: string
  action?: 'insert' | 'update' | 'error' | 'skip'
  message?: string
  new_category?: boolean
}

export default function ProductSyncManager() {
  const [config, setConfig] = useState<Config | null>(null)
  const [recent, setRecent] = useState<RecentProduct[]>([])
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [msg, setMsg] = useState('')
  const [preview, setPreview] = useState<SyncResult[] | null>(null)
  const [showGuide, setShowGuide] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/products/sync', { cache: 'no-store' })
    if (res.ok) {
      const j = await res.json()
      setConfig(j.config)
      setRecent(j.recent ?? [])
      setUrl(j.config?.sheet_csv_url ?? '')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const saveUrl = async () => {
    setWorking(true)
    setMsg('')
    const res = await fetch('/api/admin/products/sync', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheet_csv_url: url || null }),
    })
    setMsg(res.ok ? '✅ URL 저장 완료' : '❌ 저장 실패')
    setWorking(false)
    void fetchAll()
  }

  const runSync = async (dryRun: boolean) => {
    setWorking(true)
    setMsg(dryRun ? '미리보기 검증 중…' : '동기화 중…')
    setPreview(null)
    const res = await fetch('/api/admin/products/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dry_run: dryRun }),
    })
    const j = await res.json().catch(() => ({}))
    if (res.ok && j.success !== false) {
      setMsg(`✅ ${j.message ?? '완료'}`)
    } else {
      setMsg(`❌ ${j.error ?? j.message ?? '실패'}`)
    }
    // bulk 결과의 results 배열 — 미리보기 표시
    const results: SyncResult[] = j.bulkResult?.results ?? []
    setPreview(results.length > 0 ? results : null)
    setWorking(false)
    void fetchAll()
  }

  const downloadTemplate = () => {
    const headers = [
      '상품 이름', '분류', '공급사',
      '원가', '우리 수당', '고객 가격',
      '약정 기간', '월 정기 결제', '월 결제 금액',
      '단말기 종류', '메모',
    ]
    // 4종 핵심 상품 예시
    const examples = [
      // 1. 인터넷 (지원금 모델 — 원가=0, 우리수당=지원금, 고객가=0)
      ['SKT 광랜 단품', '인터넷', 'SKT(해피)', '0', '280000', '0', '36개월', 'N', '', '', '2026-05-06 정책 / 전국 전액현금'],
      ['SKT 1기가 + 이코노미', '인터넷', 'SKT(해피)', '0', '680000', '0', '36개월', 'N', '', '', '번들 / 5월 정책'],
      ['추가셋탑 스탠다드이상', '인터넷-옵션', 'SKT', '0', '100000', '0', '-', 'N', '', '', '인터넷 옵션'],
      ['유심 결합 79요금제이상', '인터넷-유심결합', 'SKT', '0', '550000', '0', '12개월', 'N', '', '', '유선 설치 M+1 내 USIM 개통'],
      // 2. POS 단말기 (정찰제 단가 모델)
      ['NC-6000(PKG)_WH', '포스기', '오케이포스', '180000', '40000', '220000', '-', 'N', '', '데스크형', '화이트 / NIT 정찰제'],
      ['포스기 + 커넥트 + 금전함', '포스기', '네이버', '956000', '100000', '1056000', '36개월', 'N', '', '데스크형', '베스트 패키지'],
      // 3. CCTV
      ['CCTV 4채널 기본팩', 'CCTV', '-', '300000', '50000', '350000', '-', 'N', '', '4채널', '기본팩'],
      // 4. 키오스크 / 테이블오더
      ['NAK-10 데스크형', '키오스크', '네이버', '1020000', '100000', '1120000', '36개월', 'N', '', '15.6인치', '키오스크 데스크형'],
      ['티오더 단말기', '테이블오더', '-', '80000', '20000', '100000', '-', 'N', '', '', '테이블오더 단말'],
    ]
    const csv = [headers, ...examples].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })  // BOM 추가
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = '상품_업로드_표준양식_4종_예시포함.csv'
    a.click()
  }

  if (loading || !config) {
    return <div className="text-center py-12 text-ink-500">로딩 중...</div>
  }

  return (
    <div className="space-y-5">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-100">상품표 시트 sync</h1>
          <p className="text-sm text-ink-400 mt-1">
            구글 시트에 표준 헤더로 상품 입력 → URL 등록 → 동기화 버튼.
            새 상품·가격 변경 시 시트만 수정하고 동기화하면 끝.
          </p>
        </div>
        <Link href="/admin/settings/products" className="text-sm text-brand-blue hover:underline">
          상품 목록 →
        </Link>
      </header>

      {/* 사용 가이드 (펼치기) */}
      <section className="bg-surface-darkSoft border border-ink-700 rounded-lg p-4">
        <button
          type="button"
          onClick={() => setShowGuide((s) => !s)}
          className="flex items-center gap-2 text-sm font-semibold text-brand-blue hover:text-brand-violet"
        >
          {showGuide ? '▼' : '▶'} 사용 가이드 + 표준 양식 헤더
        </button>
        {showGuide && (
          <div className="mt-3 space-y-3 text-sm text-ink-300">
            <div>
              <h4 className="font-semibold text-ink-100 mb-1">📝 표준 헤더 (구글 시트 1행)</h4>
              <div className="overflow-x-auto">
                <table className="text-xs border border-ink-700 w-full">
                  <thead className="bg-ink-900 text-ink-400">
                    <tr>
                      {['상품 이름', '분류', '공급사', '원가', '우리 수당', '고객 가격', '약정 기간', '월 정기 결제', '월 결제 금액', '단말기 종류', '메모'].map((h) => (
                        <th key={h} className="px-2 py-1 text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="text-ink-200">
                    <tr>
                      <td className="px-2 py-1">포스기 + 커넥트 + 금전함</td>
                      <td className="px-2 py-1">포스기</td>
                      <td className="px-2 py-1">네이버</td>
                      <td className="px-2 py-1">956,000</td>
                      <td className="px-2 py-1">100,000</td>
                      <td className="px-2 py-1">1,056,000</td>
                      <td className="px-2 py-1">36개월</td>
                      <td className="px-2 py-1">N</td>
                      <td className="px-2 py-1">-</td>
                      <td className="px-2 py-1">데스크형</td>
                      <td className="px-2 py-1">베스트</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-ink-100 mb-1">📋 컬럼 설명</h4>
              <ul className="space-y-1 text-xs list-disc pl-5">
                <li><strong>상품 이름</strong> (필수) — 식별용 이름. 같은 이름은 자동으로 덮어쓰기 (update).</li>
                <li><strong>분류</strong> (필수) — <span className="text-brand-blue font-semibold">오즈랩 4종</span>: 인터넷 / 포스기(POS) / CCTV / 키오스크 또는 테이블오더. + 옵션: 인터넷-옵션 / 인터넷-유심결합 / POS부가장비.</li>
                <li><strong>공급사</strong> — 네이버 / 오케이포스 / SKT(해피) / NIT / 토스 등.</li>
                <li><strong>원가</strong> — 우리가 사오는 가격 (부가세 포함). <strong className="text-amber-300">인터넷은 보통 0</strong> (공급사가 무상 제공).</li>
                <li><strong>우리 수당</strong> — 우리가 받는 마진/지원금. <strong className="text-amber-300">인터넷은 이게 매출</strong> (지원금 = 우리 수익).</li>
                <li><strong>고객 가격</strong> — 고객에게 판매하는 최종 가격. <strong className="text-amber-300">인터넷은 보통 0</strong> (고객 무료).</li>
                <li><strong>약정 기간</strong> — 없음 / 12개월 / 24개월 / 36개월 / 48개월.</li>
                <li><strong>월 정기 결제</strong> — Y / N. Y면 월 결제 금액 입력.</li>
                <li><strong>월 결제 금액</strong> — 월 정기 결제일 때만 입력.</li>
                <li><strong>단말기 종류</strong> — 데스크형 / 스탠드형 / 벽걸이형 / 이동형 등 (선택).</li>
                <li><strong>메모</strong> — 비고, 특이사항, 정책 시점 등.</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-ink-100 mb-1">💡 상품 종류별 가격 모델</h4>
              <ul className="space-y-1 text-xs list-disc pl-5">
                <li><strong>POS 단말기 / CCTV / 키오스크 / 테이블오더</strong> = <strong>단가 모델</strong>. 원가 = 우리가 사오는 가격, 우리수당 = 마진, 고객가격 = 판매가.</li>
                <li><strong>인터넷</strong> = <strong>지원금 모델</strong>. 원가/고객가격 = 0, 우리수당 = 공급사가 주는 지원금 (예: SKT 광랜 단품 28만원). 이게 우리 매출.</li>
                <li>해피 SKT 정책서 같은 외부 양식은 담당자가 위 양식으로 변환해서 입력 (시점별 가격 변경은 최신값으로 덮어쓰기).</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-ink-100 mb-1">🔁 자동 인식 헤더</h4>
              <p className="text-xs text-ink-400">
                공급사 원본 양식 헤더도 자동 인식:<br />
                <code className="text-brand-blue">품목명, 품목군, 공급사, 판매가(기본), 제품설명</code> (NIT 양식)<br />
                <code className="text-brand-blue">상품구성, 구성, 단가, 렌탈가, 일시불, 비고</code> (네이버 렌탈표)
              </p>
              <p className="text-xs text-ink-500 mt-1">
                * 인증 정보 컬럼 (여신협회인증여부 / 인증일 / 인증만료일) 은 자동으로 무시됨.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={downloadTemplate}
                className="px-3 py-1.5 text-xs bg-brand-blue/20 hover:bg-brand-blue/40 text-brand-blue rounded"
              >
                📥 표준 양식 CSV 다운로드
              </button>
            </div>
          </div>
        )}
      </section>

      {/* URL 입력 + 액션 */}
      <section className="bg-surface-darkSoft border border-ink-700 rounded-lg p-4 space-y-3">
        <h2 className="text-base font-bold text-ink-100">🔗 구글 시트 URL</h2>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://docs.google.com/spreadsheets/d/.../edit?usp=sharing"
          className="w-full px-3 py-2 bg-ink-900 border border-ink-700 rounded text-sm text-ink-100 font-mono"
        />
        <p className="text-[11px] text-ink-500">
          ※ <strong>edit URL 그대로 붙여 넣어도 OK</strong> — 자동으로 CSV export 형태로 변환됩니다.<br />
          ※ 시트 공유 권한은 <strong>&quot;링크가 있는 모든 사용자 — 뷰어&quot;</strong> 로 설정 필요.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={saveUrl}
            disabled={working}
            className="px-3 py-1.5 text-sm bg-ink-800 hover:bg-ink-700 text-ink-100 rounded disabled:opacity-50"
          >
            URL 저장
          </button>
          <button
            onClick={() => runSync(true)}
            disabled={working || !config.sheet_csv_url}
            className="px-3 py-1.5 text-sm bg-amber-600/20 hover:bg-amber-600/40 text-amber-200 rounded disabled:opacity-50"
          >
            🧪 미리보기 (검증만)
          </button>
          <button
            onClick={() => runSync(false)}
            disabled={working || !config.sheet_csv_url}
            className="px-3 py-1.5 text-sm bg-brand-blue/40 hover:bg-brand-blue/60 text-brand-blue rounded disabled:opacity-50 font-semibold"
          >
            🚀 동기화 실행
          </button>
        </div>
        {msg && (
          <p className={`text-sm font-medium ${msg.startsWith('❌') ? 'text-red-400' : 'text-emerald-300'}`}>
            {msg}
          </p>
        )}
      </section>

      {/* 마지막 sync 상태 */}
      {config.last_synced_at && (
        <section className="bg-surface-darkSoft border border-ink-700 rounded-lg p-4">
          <h3 className="text-sm font-bold text-ink-300 mb-2">📊 마지막 동기화 결과</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
            <Stat label="시각" value={new Date(config.last_synced_at).toLocaleString('ko-KR')} />
            <Stat label="상태" value={config.last_status ?? '-'} highlight={config.last_status === 'success' ? 'good' : 'bad'} />
            <Stat label="처리" value={`${config.rows_processed ?? 0}행`} />
            <Stat label="신규" value={`${config.rows_inserted ?? 0}건`} highlight="blue" />
            <Stat label="업데이트" value={`${config.rows_updated ?? 0}건`} highlight="neon" />
          </div>
          {config.last_message && (
            <p className="mt-2 text-xs text-ink-400">{config.last_message}</p>
          )}
        </section>
      )}

      {/* 미리보기 결과 */}
      {preview && preview.length > 0 && (
        <section className="bg-surface-darkSoft border border-ink-700 rounded-lg overflow-x-auto">
          <div className="px-4 pt-3 pb-2">
            <h3 className="text-sm font-bold text-ink-300">🔍 행별 처리 결과 (상위 30)</h3>
          </div>
          <table className="w-full text-xs">
            <thead className="bg-ink-900 text-ink-400">
              <tr>
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">상품명</th>
                <th className="px-3 py-2 text-left">분류</th>
                <th className="px-3 py-2 text-left">액션</th>
                <th className="px-3 py-2 text-left">메모</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800">
              {preview.slice(0, 30).map((r) => (
                <tr key={`${r.row_idx}-${r.code}`} className="hover:bg-ink-800/30">
                  <td className="px-3 py-2 text-ink-500">{r.row_idx}</td>
                  <td className="px-3 py-2 text-ink-200">{r.label}</td>
                  <td className="px-3 py-2 text-ink-400">{r.category}{r.new_category && <span className="ml-1 text-amber-300">(신규)</span>}</td>
                  <td className="px-3 py-2">
                    <ActionBadge action={r.action ?? '-'} />
                  </td>
                  <td className="px-3 py-2 text-ink-500">{r.message ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* 최근 상품 (참고) */}
      {recent.length > 0 && (
        <section className="bg-surface-darkSoft border border-ink-700 rounded-lg overflow-x-auto">
          <div className="px-4 pt-3 pb-2">
            <h3 className="text-sm font-bold text-ink-300">🕘 최근 업데이트된 상품 (참고)</h3>
          </div>
          <table className="w-full text-xs">
            <thead className="bg-ink-900 text-ink-400">
              <tr>
                <th className="px-3 py-2 text-left">상품명</th>
                <th className="px-3 py-2 text-left">분류</th>
                <th className="px-3 py-2 text-left">공급사</th>
                <th className="px-3 py-2 text-right">원가</th>
                <th className="px-3 py-2 text-right">고객가</th>
                <th className="px-3 py-2 text-left">업데이트</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800">
              {recent.map((r) => (
                <tr key={r.code} className="hover:bg-ink-800/30">
                  <td className="px-3 py-2 text-ink-200">{r.label}</td>
                  <td className="px-3 py-2 text-ink-400">{r.category}</td>
                  <td className="px-3 py-2 text-ink-400">{r.vendor ?? '-'}</td>
                  <td className="px-3 py-2 text-right font-mono text-ink-300">{r.device_cost ? r.device_cost.toLocaleString() : '-'}</td>
                  <td className="px-3 py-2 text-right font-mono text-brand-blue">{r.customer_price ? r.customer_price.toLocaleString() : '-'}</td>
                  <td className="px-3 py-2 text-ink-500">{new Date(r.updated_at).toLocaleDateString('ko-KR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  )
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: 'good' | 'bad' | 'blue' | 'neon' }) {
  const color =
    highlight === 'good' ? 'text-emerald-300' :
    highlight === 'bad'  ? 'text-red-400' :
    highlight === 'blue' ? 'text-brand-blue' :
    highlight === 'neon' ? 'text-brand-neon' :
    'text-ink-100'
  return (
    <div className="bg-ink-900/40 border border-ink-800 rounded p-2">
      <div className="text-[10px] text-ink-500 uppercase">{label}</div>
      <div className={`text-sm font-bold ${color} font-mono`}>{value}</div>
    </div>
  )
}

function ActionBadge({ action }: { action: string }) {
  const style =
    action === 'insert' ? 'bg-brand-blue/20 text-brand-blue' :
    action === 'update' ? 'bg-brand-neon/20 text-brand-neon' :
    action === 'error'  ? 'bg-red-500/20 text-red-300' :
    action === 'skip'   ? 'bg-ink-700 text-ink-400' :
    'bg-ink-800 text-ink-400'
  const label =
    action === 'insert' ? '신규' :
    action === 'update' ? '업데이트' :
    action === 'error'  ? '에러' :
    action === 'skip'   ? '건너뜀' : action
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${style}`}>{label}</span>
  )
}
