'use client'

// ─────────────────────────────────────────────
// TipTap 리치 에디터 (이미지 업로드 → /api/admin/media)
// 우리편(wooripen-web) TipTapEditor.tsx 패턴 그대로 + ozlab 다크 테마 적용
// ─────────────────────────────────────────────

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { useCallback, useRef } from 'react'

interface TipTapEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
}

export default function TipTapEditor({
  content,
  onChange,
  placeholder = '본문을 작성하세요...',
}: TipTapEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
      }),
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-naver-neon underline' },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML())
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-invert prose-sm md:prose-base max-w-none min-h-[400px] px-4 py-3 focus:outline-none',
      },
    },
    immediatelyRender: false, // SSR 호환
  })

  const addImage = useCallback(
    async (file: File) => {
      if (!editor) return

      const formData = new FormData()
      formData.append('file', file)
      formData.append('alt_text', file.name.replace(/\.[^/.]+$/, ''))

      try {
        const res = await fetch('/api/admin/media', { method: 'POST', body: formData })
        if (!res.ok) throw new Error('Upload failed')
        const media = await res.json()
        editor
          .chain()
          .focus()
          .setImage({ src: media.webp_path || media.storage_path, alt: media.alt_text })
          .run()
      } catch {
        alert('이미지 업로드에 실패했습니다.')
      }
    },
    [editor]
  )

  const handleImageClick = () => fileInputRef.current?.click()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) addImage(file)
    e.target.value = ''
  }

  const addLink = useCallback(() => {
    if (!editor) return
    const url = window.prompt('URL을 입력하세요 (외부는 https://, 내부는 /로 시작)')
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
  }, [editor])

  if (!editor) return null

  return (
    <div className="border border-ink-700 rounded-lg overflow-hidden bg-ink-900">
      {/* 툴바 */}
      <div className="flex flex-wrap gap-0.5 px-2 py-1.5 border-b border-ink-700 bg-ink-800">
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
        <ToolBtn
          active={editor.isActive('heading', { level: 4 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
          label="H4"
        />
        <Divider />
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
        <Divider />
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
        <ToolBtn
          active={editor.isActive('codeBlock')}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          label="코드"
        />
        <Divider />
        <ToolBtn active={editor.isActive('link')} onClick={addLink} label="링크" />
        <ToolBtn active={false} onClick={handleImageClick} label="🖼 이미지" />
        <Divider />
        <ToolBtn
          active={false}
          onClick={() => editor.chain().focus().undo().run()}
          label="↶"
        />
        <ToolBtn
          active={false}
          onClick={() => editor.chain().focus().redo().run()}
          label="↷"
        />
      </div>

      {/* 본문 */}
      <EditorContent editor={editor} />

      {/* 숨겨진 파일 인풋 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}

function Divider() {
  return <div className="w-px bg-ink-700 mx-1 my-1" />
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
          ? 'bg-naver-green/30 text-naver-neon'
          : 'text-ink-300 hover:text-ink-100 hover:bg-ink-700'
      }`}
    >
      {label}
    </button>
  )
}
