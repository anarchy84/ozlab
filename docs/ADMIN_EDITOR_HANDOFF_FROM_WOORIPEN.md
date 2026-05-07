# 어드민 에디터 + 이미지 업로드 시스템 — 우리편(wooripen-web) → 오즈랩페이 이식 핸드오프

> **목적**: 우리편(wooripen-web)에서 안정화된 어드민 에디터·미디어 업로드 시스템을 오즈랩페이(ozlab)에 그대로 이식하기 위한 단일 문서.
> **작성일**: 2026-05-07
> **소스 레포**: `~/Claud_Projects/AnarchyContentTeam/wooripen-web` (main HEAD: `b9dc13f`)
> **타겟 레포**: `~/Claud_Projects/AnarchyContentTeam/ozlab`
> **상태**: 우리편 production READY · 4가지 시행착오(파일 사이즈·한글 파일명·schema 위반·UX 통합) 전부 해결

---

## TL;DR — 30초 요약

오즈랩에도 우리편과 동일한 “꿀팁 / 게시판” 류의 어드민 글쓰기 + 이미지 업로드를 붙이려면 **3가지 덩어리만 복사**하면 끝:

1. **`components/admin-editor/` 폴더 통째** (TipTapEditor + MediaLibraryPicker + SeoPanel + index barrel) — barrel export 라 절대경로만 맞추면 동작.
2. **`app/api/admin/media/route.ts`** + 보조 헬퍼 `lib/slug.ts` — Sharp 변환·preset·30MB·한글 파일명·WebP.
3. **Supabase**: `media` 테이블 + `media` Storage 버킷 (public).

이게 끝. 우리편에서 이미 한 시행착오(파일 사이즈·한글 파일명·schema 위반·자동 삽입·정렬 보존) 전부 해결된 상태.

---

## 1. 의존성 (npm)

```jsonc
// package.json — dependencies 에 추가
"@tiptap/react": "^3.22.3",
"@tiptap/pm": "^3.22.3",
"@tiptap/starter-kit": "^3.22.3",
"@tiptap/extension-image": "^3.22.3",
"@tiptap/extension-link": "^3.22.3",
"@tiptap/extension-placeholder": "^3.22.3",
"@tiptap/extension-text-align": "^3.22.5",
"@tiptap/extension-heading": "^3.22.3",
"sharp": "^0.33.x",          // 서버 이미지 변환 (이미 깔려있을 가능성 높음)
"lucide-react": "^0.x"        // 아이콘 (Upload, Loader2 등)
```

```bash
npm i @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-link @tiptap/extension-placeholder @tiptap/extension-text-align @tiptap/extension-heading
```

⚠️ **TipTap v3.22 이상 강제** — `Image.configure({ resize: { ... } })` 옵션이 v3.22+에서만 정식 지원.

---

## 2. Supabase 리소스

### 2-1. 테이블 `media`

```sql
create table public.media (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,           -- 원본 파일명 (한글 OK, 사용자 표시용)
  storage_path text not null,        -- 원본 public URL
  webp_path text,                    -- WebP 변환본 public URL
  mime_type text,
  file_size bigint,
  width integer,
  height integer,
  alt_text text,
  created_at timestamptz default now()
);

-- RLS
alter table public.media enable row level security;

-- 어드민 인증된 사용자만 INSERT/SELECT/DELETE
create policy "admin all media" on public.media
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- 익명에게도 SELECT 허용 (이미지 URL 노출용 — public 버킷이라 어차피 보임)
create policy "public read media" on public.media
  for select using (true);
```

### 2-2. Storage 버킷 `media`

* **이름**: `media`
* **public**: ✅ true (URL 직접 노출)
* **policy**: 어드민 INSERT 허용 / 익명 READ 허용

```sql
-- Supabase Dashboard → Storage → Policies 에서 SQL 로:
insert into storage.buckets (id, name, public) values ('media', 'media', true)
  on conflict (id) do nothing;

create policy "admin upload media" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media');

create policy "public read media" on storage.objects
  for select using (bucket_id = 'media');
```

---

## 3. TypeScript 타입

`types/database.ts` 에 추가:

```ts
export interface Media {
  id: string
  file_name: string
  storage_path: string
  webp_path: string | null
  mime_type: string | null
  file_size: number | null
  width: number | null
  height: number | null
  alt_text: string | null
  created_at: string
}
```

---

## 4. 복사할 파일 4종

> 우리편 → 오즈랩 절대 경로 그대로 복사. import 경로(`@/lib/supabase/client`)는 둘 다 동일하므로 수정 불필요.

| 우리편 경로 | 오즈랩 경로 | 비고 |
|---|---|---|
| `components/admin-editor/TipTapEditor.tsx` | 동일 | 본문 WYSIWYG. ref 기반 schema-safe 이미지 삽입 |
| `components/admin-editor/MediaLibraryPicker.tsx` | 동일 | 미디어 선택 모달. 드래그 드롭 + autoSelectOnUpload prop |
| `components/admin-editor/SeoPanel.tsx` | 동일 | SEO 메타 + slug 미리보기 |
| `components/admin-editor/index.ts` | 동일 | barrel export |
| `app/api/admin/media/route.ts` | 동일 | GET/POST/**DELETE(전체 비우기)**. Sharp + preset + 30MB |
| `app/api/admin/media/[id]/route.ts` | 동일 | **GET(usage)/DELETE(단일)** — 사용처 표시 + 강제 삭제 옵션 |
| `lib/slug.ts` | 동일 | `generateSlug` + `normalizeSlug` (ASCII 안전) |
| `lib/media-usage.ts` | **오즈랩에 맞게 컬럼 매핑 수정 필요** | 사용처 검색 헬퍼 (테이블별 image url 컬럼) |
| `app/admin/(dashboard)/media/page.tsx` | 동일(또는 라우트만 매칭) | 미디어 라이브러리. 드롭존 + 카드 hover 삭제 + 전체 비우기 |

복사 명령(우리편 루트에서):

```bash
cp components/admin-editor/*.tsx components/admin-editor/index.ts \
   ../ozlab/components/admin-editor/

mkdir -p ../ozlab/app/api/admin/media
cp app/api/admin/media/route.ts ../ozlab/app/api/admin/media/

cp lib/slug.ts ../ozlab/lib/

mkdir -p "../ozlab/app/admin/(dashboard)/media"
cp "app/admin/(dashboard)/media/page.tsx" "../ozlab/app/admin/(dashboard)/media/"
```

---

## 5. 사용 예시

### 5-1. 글쓰기 폼 안 (예: `/admin/posts/new`)

```tsx
'use client'
import { useState } from 'react'
import { TipTapEditor, SeoPanel } from '@/components/admin-editor'

export default function NewPostForm() {
  const [content, setContent] = useState('')
  return (
    <form>
      <TipTapEditor content={content} onChange={setContent} placeholder="본문 입력" />
      {/* SeoPanel 도 동일 import */}
    </form>
  )
}
```

### 5-2. 게시글 상세 페이지 (예: `/posts/[slug]`)

본문 HTML 을 렌더할 때 **prose CSS 정렬 셀렉터를 반드시 추가** (TipTap 의 textAlign style 보존):

```tsx
<article
  className="prose prose-invert prose-lg max-w-none
    [&_p[style*='text-align:_center']]:text-center
    [&_p[style*='text-align:_right']]:text-right
    [&_p[style*='text-align:_left']]:text-left
    [&_h2[style*='text-align:_center']]:text-center
    [&_h3[style*='text-align:_center']]:text-center"
  dangerouslySetInnerHTML={{ __html: post.content }}
/>
```

⚠️ **`sm:[&_img]:!max-w-[600px]` 같은 이미지 width 캡 절대 넣지 말 것** — TipTap 에서 사용자가 W=300/500/800 으로 지정한 게 무시됨. 사용자 지정 width 보존이 원칙.

---

## 6. 이미지 업로드 3가지 경로 (전부 안정화 완료)

TipTapEditor 안에서 사용자가 본문에 이미지를 넣는 방법:

| # | 경로 | 코드 위치 | 동작 |
|---|---|---|---|
| 1 | **드래그 드롭** | `editorProps.handleDrop` | 파일을 본문 영역에 끌어다 놓으면 → `chain().insertContent({ type:'image', attrs:{...} })` |
| 2 | **클립보드 페이스트 (Cmd/Ctrl+V)** | `editorProps.handlePaste` | 스크린샷·복사된 이미지 붙여넣으면 자동 업로드 |
| 3 | **🖼 이미지 버튼 (모달 경로)** | `MediaLibraryPicker` + `autoSelectOnUpload` | 모달에서 라이브러리 선택 OR 새로 업로드 → 즉시 본문 삽입 + 모달 닫힘 |

⚠️ **"이미지" 와 "↥ 업로드" 두 버튼으로 나누지 말 것.** 초기에 분리했다가 사용자 혼란 + UX 중복으로 통합. 모달 하나가 라이브러리 선택 + 새 업로드를 모두 처리.

### 핵심 결정 1 — 이미지 삽입은 무조건 `chain().insertContent()` 로 통일

3경로 전부 동일 명령어 사용. 이게 schema-safe 의 핵심.

```ts
// ❌ 하지 말 것 ① — paragraph 안에 block image 강제 삽입 → schema 위반으로 노드 무시
const node = view.state.schema.nodes.image.create({ src, alt })
view.dispatch(view.state.tr.insert(dropPos, node))

// ❌ 하지 말 것 ② — chain().setImage() 도 v3.22 + resize 옵션 조합에서 안 박힐 수 있음
editor.chain().focus().setImage({ src, alt }).run()

// ✅ 무조건 이걸로 통일
editor.chain()
  .focus()
  .insertContent({ type: 'image', attrs: { src, alt } })
  .run()
```

### 핵심 결정 2 — `editorRef` 패턴

`useEditor`의 `editorProps` 콜백은 정의 시점 클로저라 외부의 `editor` 변수를 stale 하게 잡는다. 그래서:

```ts
const editorRef = useRef<Editor | null>(null)
const editor = useEditor({ ... })

useEffect(() => { editorRef.current = editor }, [editor])

// editorProps 안에서는 항상 editorRef.current 사용
```

### 핵심 결정 3 — `autoSelectOnUpload` prop

`MediaLibraryPicker` 가 두 가지 모드:

```tsx
// 본문 이미지: 업로드 즉시 본문에 박고 모달 닫음
<MediaLibraryPicker autoSelectOnUpload onSelect={addImage} ... />

// 대표 이미지: 업로드 후 사용자가 명시적으로 "선택" 클릭
<MediaLibraryPicker onSelect={pickFeatured} ... />
```

---

## 7. media API 핵심 동작 (`app/api/admin/media/route.ts`)

```
POST /api/admin/media
  formData:
    file: File (필수, 최대 30MB)
    alt_text: string
    preset: 'content' | 'featured' | 'thumb' | 'raw'  (기본 'content')
    path_prefix: string  (선택, 'uploads' 외 다른 폴더로 보내고 싶을 때)
```

| preset | 동작 |
|---|---|
| `content` (기본) | 너비 1600px 캡 + 종횡비 유지 + WebP q82 |
| `featured` | 1200×630 cover + WebP q82 (OG·대표 이미지) |
| `thumb` | 800×450 cover + WebP q82 (카드 썸네일) |
| `raw` | resize 안 함 (관리자 직접 사이즈 결정) |

### 가드 항목

* `auth.getUser()` 로 로그인 확인 — 익명은 401
* MIME: `image/jpeg`, `image/png`, `image/gif`, `image/webp` 만 허용
* 파일 크기 ≤ 30MB (Vercel Pro = 100MB body limit 안에서 안전)
* **파일명**: `normalizeSlug(rawBase)` 로 한글·특수문자 → ASCII 변환. 비면 `'image'` 폴백.
  → Storage path 가 ASCII 안전해야 일부 CDN/브라우저 URL 인코딩 사고 방지.
* 원본 + WebP 둘 다 업로드 → DB `media` 테이블에 메타 기록 후 row return.

### Vercel function 설정 (route.ts 상단)

```ts
export const runtime = 'nodejs'        // sharp 는 native — Edge 안 됨
export const dynamic = 'force-dynamic'
export const maxDuration = 60          // sharp 처리 시간 여유
```

---

## 8. /admin/media 페이지 — 전체 드롭존 + 삭제

`app/admin/(dashboard)/media/page.tsx` 의 핵심:

* 업로드 **버튼 없음**. 페이지 전체가 드롭존.
* 여러 파일 한 번에 끌어다 놓으면 순차 업로드 + `진행 N/M` 인디케이터
* 그리드는 `grid-cols-2 md:grid-cols-3 lg:grid-cols-4`
* 각 카드 hover 시 **"URL 복사"** + 🗑 **삭제** 버튼
* 상단 우측 **"전체 비우기"** 빨간 버튼

### 8-1. 단일 삭제 플로우

1. 카드 🗑 클릭 → `GET /api/admin/media/[id]` 로 사용처 미리 조회
2. 모달 오픈 → 사용처 표시:
   * **미사용**: "✅ 어디에서도 사용하지 않는 이미지" + [삭제] 버튼
   * **사용 중**: "⚠️ N곳에서 사용 중" + 사용처 리스트 + [그래도 강제 삭제] 버튼
3. 삭제 시 `DELETE /api/admin/media/[id]` (사용 중이면 `?force=1`)
4. 응답 OK → 그리드에서 카드 즉시 제거 (낙관적 업데이트)

### 8-2. 전체 비우기 플로우 (이중 안전장치)

1. "전체 비우기" 버튼 클릭 → 모달
2. 두 가지 옵션:
   * **[미사용만 비우기]** (안전, 오렌지) — 사용 중 이미지는 자동 보존
   * **[전부 강제 삭제]** (빨강) — 입력칸에 정확히 `비우기` 타이핑해야 활성화
3. `DELETE /api/admin/media?all=1[&force=1]`
4. 응답: `{ deleted_count, skipped_count }` → alert 표시 후 그리드 새로고침

---

## 9. 시행착오 / 함정 (이미 다 해결됨)

| 함정 | 원인 | 해결 |
|---|---|---|
| 한글 파일명 업로드 시 일부 환경에서 이미지 깨짐 | Storage path 의 비-ASCII 문자가 CDN URL 인코딩에서 어긋남 | `normalizeSlug` 로 파일명을 ASCII 로 변환, `image` 폴백 |
| 4.5MB 이상 파일 거부 | Vercel Hobby plan body limit | Pro 플랜 + `maxDuration = 60` + 30MB 가드. (Hobby 라면 클라이언트 리사이즈 필요) |
| 본문 이미지가 600px 로 고정돼 사용자 지정 width 무시 | prose CSS 가 `sm:!max-w-[600px]` 로 강제 캡 | 해당 셀렉터 제거. `[&_img]:max-w-full` 만 유지 |
| 정렬(가운데/오른쪽)이 게시글에 안 보임 | `prose` 기본 CSS 가 `text-align` style 무시 | `[&_p[style*='text-align:_center']]:text-center` 셀렉터 추가 |
| 본문 드래그 드롭 후 이미지가 안 보임 | `view.state.tr.insert(pos, node)` 가 paragraph 안에 block image 삽입 시 schema 위반 → 노드 무시 | `editor.chain().insertContent({ type:'image', attrs:{...} })` 로 전환 |
| 모달에서 업로드 후 사용자가 "선택"을 다시 눌러야 함 (UX friction) | 단순 업로드 + 별도 confirm 버튼 | `autoSelectOnUpload` prop 으로 본문 모달은 즉시 삽입 + 닫힘, 대표 이미지 모달은 기존 동작 유지 |
| 여러 파일 동시 드롭 시 두 번째부터 같은 위치에 덮어쓰기 | dropPos 가 변하지 않음 | chain 으로 삽입 후 selection 자동 진행 → 자연스럽게 다음 위치로 |
| 이미지 버튼 + ↥ 업로드 버튼 두 개 분리 → 사용자 혼란 + 둘 다 작동 안 함 | `setImage` 명령이 v3.22 + `resize` 옵션 조합에서 schema 처리가 어긋남 | "🖼 이미지" 버튼 하나로 통합. 모든 이미지 삽입 경로(드래그/페이스트/모달) 가 `chain().insertContent()` 로 일관 |

---

## 10. 이식 체크리스트 (오즈랩 세션이 그대로 따라할 것)

### 10-1. 환경 준비
- [ ] `npm i @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-link @tiptap/extension-placeholder @tiptap/extension-text-align @tiptap/extension-heading sharp lucide-react`
- [ ] `next.config.mjs` 에 sharp 외부 모듈 처리 필요 시 `serverExternalPackages: ['sharp']` 추가
- [ ] Vercel 프로젝트 → Settings → Functions → 노드 런타임 + Pro 플랜 (30MB 업로드용)

### 10-2. Supabase 셋업
- [ ] `media` 테이블 생성 (위 SQL)
- [ ] `media` Storage 버킷 생성 + public + 정책
- [ ] `types/database.ts` 에 `Media` 인터페이스 추가

### 10-3. 코드 복사
- [ ] `components/admin-editor/` 4개 파일 복사
- [ ] `app/api/admin/media/route.ts` 복사 (GET/POST/DELETE)
- [ ] `app/api/admin/media/[id]/route.ts` 복사 (GET usage / DELETE 단일)
- [ ] `lib/slug.ts` 복사
- [ ] `lib/media-usage.ts` 복사 → **오즈랩 image url 컬럼에 맞게 수정 필수**
  - 우리편 기준: tips·products·packages·page_meta·content_blocks
  - 오즈랩 기준: 어드민 콘텐츠 테이블이 다르면 검색 대상 컬럼 매핑 다시
- [ ] `app/admin/(dashboard)/media/page.tsx` 복사

### 10-4. 사용처 연결
- [ ] 글쓰기 폼에서 `<TipTapEditor content={...} onChange={...} />` 사용
- [ ] 글 상세 페이지 prose CSS 에 정렬 셀렉터 추가, 이미지 width 캡 제거
- [ ] 어드민 사이드바에 "미디어 라이브러리" 링크

### 10-5. 검증
- [ ] 3가지 업로드 경로 전부 테스트 (드래그·페이스트·🖼 이미지 모달)
- [ ] 한글 파일명 업로드 → DB 에 ASCII path 들어가는지
- [ ] 본문 이미지 W 입력 → 게시글에서 그 사이즈로 보이는지
- [ ] 가운데 정렬 → 게시글에서 가운데로 보이는지
- [ ] 30MB 근처 파일 업로드 OK 여부
- [ ] 카드 🗑 → 미사용 이미지 삭제 OK
- [ ] 카드 🗑 → 사용 중 이미지 사용처 표시 + 강제 삭제 OK
- [ ] 전체 비우기 → 미사용만 비우기 OK
- [ ] 전체 비우기 → "비우기" 타이핑 후 강제 삭제 OK
- [ ] Storage 버킷에서 실제 파일도 같이 사라지는지 확인
- [ ] `npx tsc --noEmit` + `npm run build` 통과

---

## 11. 우리편 참고 커밋 (필요시 diff 추적)

| 커밋 | 내용 |
|---|---|
| `b9dc13f` | TipTap 이미지 버튼 통합 (↥ 제거) + 모든 삽입 경로 insertContent 로 일관 |
| `6d90909` | TipTap drop/paste schema-safe insertContent 전환 |
| `9ccd06f` | 미디어 5종 이슈 일괄 수정 (사이즈·한글·드롭존·width·정렬) |
| `869d663` | MediaLibraryPicker autoSelectOnUpload prop |
| `cda39b0` | tip 본문 이미지 사이즈 정책 + Header 가독성 |
| `ddd6aca` | admin-editor/ 폴더 분리 + barrel export |
| `3921292` | TipTap 본문 직접 drop/paste 업로드 (초기 도입) |

`git log --oneline -- components/admin-editor/ app/api/admin/media/ lib/slug.ts` 로 전체 이력 추적 가능.

---

## 12. 다음 세션 첫 메시지 템플릿 (대웅이 복사해서 쓸 것)

```
이 핸드오프 그대로 따라서 ozlab(오즈랩페이) 레포에 어드민 글쓰기 + 이미지 업로드 시스템 이식해줘.
원본 레포는 ~/Claud_Projects/AnarchyContentTeam/wooripen-web (main HEAD b9dc13f).
타겟은 ~/Claud_Projects/AnarchyContentTeam/ozlab.

문서: ~/Claud_Projects/AnarchyContentTeam/ozlab/docs/ADMIN_EDITOR_HANDOFF_FROM_WOORIPEN.md
이 문서를 먼저 처음부터 끝까지 한 번 읽고 작업 시작.

작업 원칙:
1. 핸드오프 10번 체크리스트 한 단계씩 진행
2. 매 단계마다 진행 상황 보고 → 내(대웅) OK 받고 다음 단계
3. Supabase media 테이블/버킷은 SQL 보여주고 내가 Supabase 콘솔에서 직접 실행
4. 코드 복사·파일 작성은 너가 직접 (Edit/Write 툴)
5. 커밋·푸시는 내가 Cursor 터미널에서 (한 줄씩 명령어 줘)
6. 자동 배포 금지 — 빌드 성공 확인 후 진행

추가 컨텍스트:
- 오즈랩에 게시판 라우트가 아직 없으면 /admin/media 페이지 + media API + admin-editor 폴더만 먼저 깔자
- 실제 글쓰기 폼은 게시판 스키마 결정 후 별도 진행
- TipTap v3.22+ 강제. 그 외 의존성은 1번 섹션 그대로
- Vercel Pro 플랜 확인 필요 (30MB 업로드용)
```

---

**끝.**
필요한 파일 위치 / SQL / 함정 / 체크리스트 다 들어있음. 다른 세션에 이 한 장만 던져주면 됨.
