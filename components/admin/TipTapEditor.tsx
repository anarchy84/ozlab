'use client'

// ─────────────────────────────────────────────
// TipTapEditor — 본문 WYSIWYG (이미지·링크·정렬·코드블록)
//
// 우리편 admin-editor/TipTapEditor.tsx (commit b9dc13f) 이식.
//   - chain().insertContent() 로 schema-safe 이미지 삽입 (drag/paste/모달 일관)
//   - editorRef 패턴 (editorProps 클로저 stale 회피)
//   - autoSelectOnUpload : 모달에서 업로드 즉시 본문 삽입+닫힘
//   - TextAlign : paragraph/heading 좌·중앙·우 정렬 (style attr)
// ─────────────────────────────────────────────

import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import { useCallback, useEffect, useRef, useState } from 'react'
import MediaLibraryPicker, { type MediaSelection } from '@/components/admin/MediaLibraryPicker'

interface TipTapEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
}

// ── 본문 직접 업로드 헬퍼 ────────────────────────────────
// 클립보드/드래그한 File 을 /api/admin/media 에 보내서 URL 받기
async function uploadImageFile(file: File): Promise<string | null> {
  if (!file.type.startsWith('image/')) return null
  const formData = new FormData()
  formData.append('file', file)
  formData.append('alt_text', file.name.replace(/\.[^/.]+$/, ''))
  formData.append('preset', 'content')   // 본문용 — max 1600 종횡비 유지

  try {
    const res = await fetch('/api/admin/media', { method: 'POST', body: formData })
    if (!res.ok) {
      console.error('[TipTap upload]', await res.text())
      return null
    }
    const data = await res.json()
    // webp_path 우선, 없으면 storage_path
    return (data.webp_path as string) || (data.storage_path as string) || null
  } catch (err) {
    console.error('[TipTap upload]', err)
    return null
  }
}

export default function TipTapEditor({ content, onChange, placeholder = '내용을 입력하세요...' }: TipTapEditorProps) {
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false)
  // 본문 drop/paste 업로드 진행 상태
  const [uploadingInline, setUploadingInline] = useState(false)
  // editorProps 안에서 클로저로 직접 editor 변수를 못 잡으므로 ref 로 전달.
  // schema-safe 한 chain().insertContent() 호출에 필요.
  const editorRef = useRef<Editor | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        // StarterKit v3.22.5+ 가 link 를 기본 포함 → 별도 Link extension 과 중복.
        // 중복은 schema 충돌·일부 기능(drop/paste) 무시로 이어질 수 있어 비활성화.
        link: false,
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
        resize: {
          enabled: true,
          directions: ['bottom-left', 'bottom-right', 'top-left', 'top-right'],
          minWidth: 120,
          minHeight: 80,
          alwaysPreserveAspectRatio: true,
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-blue-400 underline' },
      }),
      Placeholder.configure({ placeholder }),
      // 정렬 — paragraph/heading 에 text-align style 박음.
      // 게시물 페이지 prose CSS 가 [&_p[style*='text-align:_center']] 등으로 매칭해서 적용.
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right'],
        defaultAlignment: 'left',
      }),
    ],
    content,
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML())
    },
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        // prose : 라이트모드 기본 텍스트 / dark:prose-invert : 다크모드 흰색 계열
        // tailwindcss/typography 플러그인이 색상·간격·줄높이 자동 처리
        class:
          'prose dark:prose-invert prose-sm max-w-none min-h-[300px] px-4 py-3 focus:outline-none',
      },
      // 본문에 이미지 끌어다 놓으면 자동 업로드 + 삽입
      // ⚠️ view.state.tr.insert(pos, node) 직접 조작은 schema 위반(paragraph 안에 block image)
      //    상황에서 노드가 무시될 수 있음 → editor.chain().insertContent() 로 schema-safe 처리.
      handleDrop(view, event, _slice, moved) {
        if (moved) return false
        const dt = (event as DragEvent).dataTransfer
        if (!dt || !dt.files || dt.files.length === 0) return false
        const imageFiles = Array.from(dt.files).filter((f) => f.type.startsWith('image/'))
        if (imageFiles.length === 0) return false
        event.preventDefault()
        const coords = view.posAtCoords({ left: (event as DragEvent).clientX, top: (event as DragEvent).clientY })
        const dropPos = coords?.pos ?? view.state.selection.from
        ;(async () => {
          setUploadingInline(true)
          const ed = editorRef.current
          if (ed) {
            // 드롭 위치에 selection 박고 그 자리부터 순차 삽입
            ed.commands.setTextSelection(dropPos)
            for (const file of imageFiles) {
              const url = await uploadImageFile(file)
              if (url) {
                ed.chain()
                  .focus()
                  .insertContent({
                    type: 'image',
                    attrs: { src: url, alt: file.name },
                  })
                  .run()
              }
            }
          }
          setUploadingInline(false)
        })()
        return true
      },
      // 클립보드 이미지(스크린샷·복사된 이미지) 붙여넣기 — schema-safe insertContent 사용
      handlePaste(_view, event) {
        const items = event.clipboardData?.items
        if (!items) return false
        const imageFiles: File[] = []
        for (const item of Array.from(items)) {
          if (item.kind === 'file' && item.type.startsWith('image/')) {
            const file = item.getAsFile()
            if (file) imageFiles.push(file)
          }
        }
        if (imageFiles.length === 0) return false
        event.preventDefault()
        ;(async () => {
          setUploadingInline(true)
          const ed = editorRef.current
          if (ed) {
            for (const file of imageFiles) {
              const url = await uploadImageFile(file)
              if (url) {
                ed.chain()
                  .focus()
                  .insertContent({
                    type: 'image',
                    attrs: { src: url, alt: file.name },
                  })
                  .run()
              }
            }
          }
          setUploadingInline(false)
        })()
        return true
      },
    },
  })

  // editor 인스턴스를 ref 에도 저장 — editorProps 핸들러에서 사용.
  // (useEditor 의 editorProps 는 정의 시점 클로저라 editor 변수를 직접 못 잡음)
  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  // 모달에서 선택/업로드한 이미지 → 본문 삽입.
  // setImage 가 아닌 insertContent 사용 — drag/paste 와 동일 경로 (schema-safe)
  const addImage = useCallback((selection: MediaSelection) => {
    if (!editor) return

    editor
      .chain()
      .focus()
      .insertContent({
        type: 'image',
        attrs: { src: selection.url, alt: selection.altText },
      })
      .run()
  }, [editor])

  const handleImageClick = () => setMediaPickerOpen(true)

  const imageAttrs = editor?.isActive('image') ? editor.getAttributes('image') : null
  const imageWidth = getImageWidth(imageAttrs?.width)

  const handleImageWidthChange = (value: string) => {
    const nextWidth = Number.parseInt(value, 10)
    if (!Number.isFinite(nextWidth)) {
      editor?.chain().focus().updateAttributes('image', { width: null, height: null }).run()
      return
    }

    editor
      ?.chain()
      .focus()
      .updateAttributes('image', { width: clampImageWidth(nextWidth), height: null })
      .run()
  }

  const addLink = useCallback(() => {
    if (!editor) return
    const url = window.prompt('URL을 입력하세요')
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
  }, [editor])

  if (!editor) return null

  return (
    <div className="relative border border-ink-700 rounded-lg bg-ink-800">
      <div className="sticky top-0 z-30 isolate flex flex-wrap gap-0.5 px-2 py-1.5 border-b border-ink-700 bg-ink-900 rounded-t-lg shadow-sm">
        <ToolBtn
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          label="H2"
        />
        <ToolBtn
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          label="H3"
        />
        <div className="w-px bg-ink-700 mx-1" />
        <ToolBtn
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          label="B"
          className="font-bold"
        />
        <ToolBtn
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          label="I"
          className="italic"
        />
        <ToolBtn
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          label="S"
          className="line-through"
        />
        <div className="w-px bg-ink-700 mx-1" />
        <ToolBtn
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          label="• 목록"
        />
        <ToolBtn
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          label="1. 목록"
        />
        <ToolBtn
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          label="인용"
        />
        <div className="w-px bg-ink-700 mx-1" />
        {/* 정렬 — 본문 paragraph/heading 에 적용. 게시물에서도 그대로 보임 */}
        <ToolBtn
          active={editor.isActive({ textAlign: 'left' })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          label="⇤"
        />
        <ToolBtn
          active={editor.isActive({ textAlign: 'center' })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          label="↔"
        />
        <ToolBtn
          active={editor.isActive({ textAlign: 'right' })}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          label="⇥"
        />
        <ToolBtn
          active={editor.isActive('codeBlock')}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          label="코드"
        />
        <div className="w-px bg-ink-700 mx-1" />
        <ToolBtn active={editor.isActive('link')} onClick={addLink} label="링크" />
        {/* 이미지 — 모달 하나로 통합. 모달 안에서 라이브러리 선택 + 새로 업로드 둘 다 가능. */}
        <ToolBtn active={false} onClick={handleImageClick} label="🖼 이미지" />
        {editor.isActive('image') && (
          <>
            <div className="w-px bg-ink-700 mx-1" />
            <label className="flex items-center gap-1 rounded bg-ink-800 px-2 py-1 text-xs text-ink-400">
              W
              <input
                type="number"
                min={120}
                max={1200}
                value={imageWidth ?? ''}
                onChange={(event) => handleImageWidthChange(event.target.value)}
                placeholder="auto"
                className="h-5 w-16 bg-transparent text-right text-ink-100 placeholder-ink-600 focus:outline-none"
              />
              px
            </label>
          </>
        )}
        <div className="w-px bg-ink-700 mx-1" />
        <ToolBtn
          active={false}
          onClick={() => editor.chain().focus().undo().run()}
          label="↩"
        />
        <ToolBtn
          active={false}
          onClick={() => editor.chain().focus().redo().run()}
          label="↪"
        />
      </div>

      {/* 에디터 본문 — drop/paste 업로드 시 오버레이 표시 */}
      <div className="relative">
        <EditorContent editor={editor} />
        {uploadingInline && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-blue-500/10 backdrop-blur-[1px]">
            <div className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-lg">
              이미지 업로드 중…
            </div>
          </div>
        )}
      </div>

      {/* 본문 이미지 삽입 안내 — 3가지 경로 */}
      <p className="border-t border-ink-700 px-3 py-1.5 text-[11px] text-ink-500">
        💡 본문에 이미지 <strong>드래그</strong>·<strong>Cmd/Ctrl+V</strong> 붙여넣기·툴바 <strong>🖼 이미지</strong> 버튼 — 셋 다 즉시 업로드 + 삽입.
      </p>

      <MediaLibraryPicker
        isOpen={mediaPickerOpen}
        title="본문 이미지 선택"
        autoSelectOnUpload
        onClose={() => setMediaPickerOpen(false)}
        onSelect={addImage}
      />
    </div>
  )
}

function getImageWidth(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function clampImageWidth(value: number) {
  return Math.min(1200, Math.max(120, value))
}

function ToolBtn({
  active,
  onClick,
  label,
  className = '',
}: {
  active: boolean
  onClick: () => void
  label: string
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-1 text-xs rounded transition-colors ${className} ${
        active
          ? 'bg-blue-600/30 text-blue-400'
          : 'text-ink-400 hover:text-ink-100 hover:bg-ink-700'
      }`}
    >
      {label}
    </button>
  )
}
