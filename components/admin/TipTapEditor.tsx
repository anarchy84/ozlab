'use client'

// ─────────────────────────────────────────────
// TipTapEditor — 본문 WYSIWYG (이미지·링크·정렬·코드블록)
//
// 우리편 admin-editor/TipTapEditor.tsx (commit b9dc13f) 이식.
//   - chain().insertContent() 로 schema-safe 이미지 삽입 (drag/paste/모달 일관)
//   - editorRef 패턴 (editorProps 클로저 stale 회피)
//   - autoSelectOnUpload : 모달에서 업로드 즉시 본문 삽입+닫힘
//   - TextAlign : paragraph/heading/listItem 좌·중앙·우·양쪽 정렬 (style attr)
// ─────────────────────────────────────────────

import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import { Fragment, type NodeType } from '@tiptap/pm/model'
import { TextSelection, type EditorState } from '@tiptap/pm/state'
import { AlignCenter, AlignJustify, AlignLeft, AlignRight } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
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
  const lastCursorPosRef = useRef<number | null>(null)

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
      // 정렬 — paragraph/heading/listItem 에 text-align style 박음.
      // 게시물 페이지와 에디터 CSS가 style attr을 직접 매칭해서 동일하게 보여준다.
      TextAlign.configure({
        types: ['heading', 'paragraph', 'listItem'],
        alignments: ['left', 'center', 'right', 'justify'],
        defaultAlignment: 'left',
      }),
    ],
    content,
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML())
    },
    onSelectionUpdate: ({ editor: e }) => {
      const { selection, doc } = e.state
      const isWholeDocSelection = selection.from <= 0 && selection.to >= doc.content.size
      if (!isWholeDocSelection) {
        lastCursorPosRef.current = selection.$head.pos
      }
    },
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        // prose : 라이트모드 기본 텍스트 / dark:prose-invert : 다크모드 흰색 계열
        // tailwindcss/typography 플러그인이 색상·간격·줄높이 자동 처리
        class:
          'admin-rich-editor max-w-none min-h-[320px] px-3 py-3 focus:outline-none sm:min-h-[400px] sm:px-4 sm:py-4',
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
      handleKeyDown(view, event) {
        if (event.key !== 'Enter') return false
        if (event.isComposing || event.metaKey || event.ctrlKey || event.altKey) return false
        if (view.state.selection.$from.parent.type.name === 'codeBlock') return false
        const hardBreak = view.state.schema.nodes.hardBreak
        if (!hardBreak) return false
        event.preventDefault()
        view.dispatch(
          view.state.tr
            .replaceSelectionWith(hardBreak.create())
            .scrollIntoView()
        )
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

  const applyHeading = (level: 2 | 3) => {
    const commandPos = resolveCommandPos(editor, lastCursorPosRef.current)
    editor
      .chain()
      .focus()
      .command(({ state, dispatch }) => applyHeadingToSingleLine(state, dispatch, level, commandPos))
      .run()
  }

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
    <div className="relative overflow-visible rounded-lg border border-ink-700 bg-ink-800">
      <div className="sticky top-[104px] z-40 isolate flex max-w-full flex-nowrap gap-1 overflow-x-auto rounded-t-lg border-b border-ink-700 bg-ink-900 px-2 py-2 shadow-lg sm:top-[68px] sm:flex-wrap sm:overflow-visible">
        <ToolBtn
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => applyHeading(2)}
          label="H2"
        />
        <ToolBtn
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => applyHeading(3)}
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
        <div className="flex shrink-0 items-center gap-0.5 rounded-md bg-ink-800/70 p-0.5">
          <span className="px-1.5 text-[11px] font-semibold text-ink-500">정렬</span>
          <ToolBtn
            active={editor.isActive({ textAlign: 'left' })}
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            label="왼쪽"
            title="왼쪽 정렬"
            icon={<AlignLeft className="h-3.5 w-3.5" aria-hidden="true" />}
          />
          <ToolBtn
            active={editor.isActive({ textAlign: 'center' })}
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            label="가운데"
            title="가운데 정렬"
            icon={<AlignCenter className="h-3.5 w-3.5" aria-hidden="true" />}
          />
          <ToolBtn
            active={editor.isActive({ textAlign: 'right' })}
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            label="오른쪽"
            title="오른쪽 정렬"
            icon={<AlignRight className="h-3.5 w-3.5" aria-hidden="true" />}
          />
          <ToolBtn
            active={editor.isActive({ textAlign: 'justify' })}
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            label="양쪽"
            title="양쪽 정렬"
            icon={<AlignJustify className="h-3.5 w-3.5" aria-hidden="true" />}
            className="font-semibold"
          />
        </div>
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

function resolveCommandPos(editor: Editor, lastCursorPos: number | null) {
  const { selection, doc } = editor.state
  const isWholeDocSelection = selection.from <= 0 && selection.to >= doc.content.size
  const pos = isWholeDocSelection && lastCursorPos !== null
    ? lastCursorPos
    : selection.$head.pos

  return clampDocTextPos(doc.content.size, pos)
}

function clampDocTextPos(docSize: number, pos: number) {
  if (docSize <= 2) return 1
  return Math.min(Math.max(pos, 1), docSize - 1)
}

function applyHeadingToSingleLine(
  state: EditorState,
  dispatch: ((tr: EditorState['tr']) => void) | undefined,
  level: 2 | 3,
  commandPos: number,
) {
  const { doc, schema } = state
  const paragraphType = schema.nodes.paragraph
  const headingType = schema.nodes.heading
  if (!paragraphType || !headingType) return false

  const $pos = doc.resolve(clampDocTextPos(doc.content.size, commandPos))
  const parent = $pos.parent
  if (!parent.isTextblock) return false
  if (parent.type.name !== 'paragraph' && parent.type.name !== 'heading') return false

  const targetType =
    parent.type.name === 'heading' && parent.attrs.level === level
      ? paragraphType
      : headingType
  const targetAttrs = buildHeadingAttrs(targetType, parent.attrs, level)

  const parentPos = $pos.before($pos.depth)
  const container = $pos.node($pos.depth - 1)
  const containerIndex = $pos.index($pos.depth - 1)
  const hardBreakSegments = getHardBreakSegments(parent)

  if (!dispatch) return true

  try {
    if (hardBreakSegments.length <= 1) {
      if (!container.canReplaceWith(containerIndex, containerIndex + 1, targetType)) {
        return false
      }
      const tr = state.tr.setNodeMarkup(parentPos, targetType, targetAttrs)
      tr.setSelection(TextSelection.create(tr.doc, clampDocTextPos(tr.doc.content.size, commandPos)))
      dispatch(tr.scrollIntoView())
      return true
    }

    const segmentIndex = findSegmentIndex(hardBreakSegments, $pos.parentOffset)
    const replacementNodes = hardBreakSegments.map((segment, index) => {
      const type = index === segmentIndex ? targetType : parent.type
      const attrs = index === segmentIndex
        ? targetAttrs
        : filterNodeAttrs(parent.type, parent.attrs)
      return type.create(attrs, parent.content.cut(segment.from, segment.to))
    })
    const replacement = Fragment.fromArray(replacementNodes)
    if (!container.canReplace(containerIndex, containerIndex + 1, replacement)) {
      return false
    }

    let selectedBlockPos = parentPos
    for (let i = 0; i < segmentIndex; i += 1) {
      selectedBlockPos += replacementNodes[i].nodeSize
    }

    const selectedSegment = hardBreakSegments[segmentIndex]
    const selectedNode = replacementNodes[segmentIndex]
    const offsetInSegment = Math.min(
      Math.max($pos.parentOffset - selectedSegment.from, 0),
      selectedNode.content.size,
    )
    const nextSelectionPos = selectedBlockPos + 1 + offsetInSegment

    const tr = state.tr.replaceWith(parentPos, parentPos + parent.nodeSize, replacement)
    tr.setSelection(TextSelection.create(tr.doc, clampDocTextPos(tr.doc.content.size, nextSelectionPos)))
    dispatch(tr.scrollIntoView())
    return true
  } catch {
    return false
  }
}

function getHardBreakSegments(parent: EditorState['doc']) {
  const breaks: number[] = []
  parent.forEach((child, offset) => {
    if (child.type.name === 'hardBreak') breaks.push(offset)
  })

  if (breaks.length === 0) {
    return [{ from: 0, to: parent.content.size }]
  }

  const segments: Array<{ from: number; to: number }> = []
  let from = 0
  for (const breakOffset of breaks) {
    segments.push({ from, to: breakOffset })
    from = breakOffset + 1
  }
  segments.push({ from, to: parent.content.size })
  return segments
}

function findSegmentIndex(segments: Array<{ from: number; to: number }>, offset: number) {
  const found = segments.findIndex((segment) => offset >= segment.from && offset <= segment.to)
  return found >= 0 ? found : Math.max(0, segments.length - 1)
}

function buildHeadingAttrs(type: NodeType, sourceAttrs: Record<string, unknown>, level: 2 | 3) {
  const nextSource = type.name === 'heading' ? { ...sourceAttrs, level } : sourceAttrs
  return filterNodeAttrs(type, nextSource)
}

function filterNodeAttrs(type: NodeType, sourceAttrs: Record<string, unknown>) {
  const attrs: Record<string, unknown> = {}
  for (const key of Object.keys(type.spec.attrs ?? {})) {
    if (sourceAttrs[key] !== undefined) attrs[key] = sourceAttrs[key]
  }
  return attrs
}

function ToolBtn({
  active,
  onClick,
  label,
  title,
  icon,
  className = '',
}: {
  active: boolean
  onClick: () => void
  label: string
  title?: string
  icon?: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      title={title ?? label}
      aria-label={title ?? label}
      className={`inline-flex h-8 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded px-2 text-xs transition-colors ${className} ${
        active
          ? 'bg-blue-600/30 text-blue-400'
          : 'text-ink-400 hover:text-ink-100 hover:bg-ink-700'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
