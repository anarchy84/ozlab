// ─────────────────────────────────────────────
// 마케팅 패키지 견적 — 서버 전용 로더
//   loadPackagePricing()     : 공개 랜딩용 (활성 항목만, anon RLS)
//   loadAllPackagePricing()  : 어드민용 (비활성 포함, service role)
// ─────────────────────────────────────────────
import 'server-only'
import { createPublicServerClient } from '@/lib/supabase/public-server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  DEFAULT_PACKAGE_SETTINGS,
  type PackageItemGroup,
  type PackagePricingData,
  type PackagePricingItem,
  type PackagePricingSettings,
} from '@/lib/marketing-package-pricing'

function normalizeItem(row: Record<string, unknown>): PackagePricingItem {
  const group: PackageItemGroup = row.item_group === 'monthly' ? 'monthly' : 'initial'
  return {
    id: String(row.id ?? ''),
    item_group: group,
    name: typeof row.name === 'string' ? row.name : '',
    description: typeof row.description === 'string' ? row.description : null,
    monthly_price: Number.isFinite(Number(row.monthly_price)) ? Number(row.monthly_price) : 0,
    yearly_price:
      row.yearly_price === null || row.yearly_price === undefined
        ? null
        : Number.isFinite(Number(row.yearly_price))
          ? Number(row.yearly_price)
          : null,
    sort_order: Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : 0,
    is_active: row.is_active !== false,
    note: typeof row.note === 'string' ? row.note : null,
  }
}

function normalizeSettings(row: Record<string, unknown> | null): PackagePricingSettings {
  if (!row) return DEFAULT_PACKAGE_SETTINGS
  return {
    package_monthly: Number.isFinite(Number(row.package_monthly))
      ? Number(row.package_monthly)
      : DEFAULT_PACKAGE_SETTINGS.package_monthly,
    package_yearly: Number.isFinite(Number(row.package_yearly))
      ? Number(row.package_yearly)
      : DEFAULT_PACKAGE_SETTINGS.package_yearly,
    badge_label: typeof row.badge_label === 'string' ? row.badge_label : DEFAULT_PACKAGE_SETTINGS.badge_label,
    cta_label: typeof row.cta_label === 'string' ? row.cta_label : DEFAULT_PACKAGE_SETTINGS.cta_label,
    yearly_note: typeof row.yearly_note === 'string' ? row.yearly_note : DEFAULT_PACKAGE_SETTINGS.yearly_note,
    regular_total_override:
      row.regular_total_override === null || row.regular_total_override === undefined
        ? null
        : Number.isFinite(Number(row.regular_total_override))
          ? Number(row.regular_total_override)
          : null,
  }
}

function group(items: PackagePricingItem[]): PackagePricingData {
  const sort = (a: PackagePricingItem, b: PackagePricingItem) => a.sort_order - b.sort_order
  return {
    initial: items.filter((i) => i.item_group === 'initial').sort(sort),
    monthly: items.filter((i) => i.item_group === 'monthly').sort(sort),
    settings: DEFAULT_PACKAGE_SETTINGS,
  }
}

// 공개 랜딩 — 활성 항목만
export async function loadPackagePricing(): Promise<PackagePricingData> {
  try {
    const supabase = createPublicServerClient()
    const [itemsRes, settingsRes] = await Promise.all([
      supabase.from('package_pricing_items').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
      supabase.from('package_pricing_settings').select('*').eq('id', 'marketing-package').maybeSingle(),
    ])
    const items = (itemsRes.data ?? []).map(normalizeItem)
    const data = group(items)
    data.settings = normalizeSettings(settingsRes.data ?? null)
    return data
  } catch {
    return { initial: [], monthly: [], settings: DEFAULT_PACKAGE_SETTINGS }
  }
}

// 어드민 — 비활성 포함 전체
export async function loadAllPackagePricing(): Promise<PackagePricingData> {
  const admin = createAdminClient()
  const [itemsRes, settingsRes] = await Promise.all([
    admin.from('package_pricing_items').select('*').order('item_group', { ascending: true }).order('sort_order', { ascending: true }),
    admin.from('package_pricing_settings').select('*').eq('id', 'marketing-package').maybeSingle(),
  ])
  const items = (itemsRes.data ?? []).map(normalizeItem)
  const data = group(items)
  data.settings = normalizeSettings(settingsRes.data ?? null)
  return data
}
