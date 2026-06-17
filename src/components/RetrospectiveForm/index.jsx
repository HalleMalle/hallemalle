import { useState } from 'react'

import './RetrospectiveForm.scss'

const TITLE_MAX = 100
const CONTENT_MAX = 10000

// F-MEM-002/003: 회고록 작성·수정 공용 폼.
export default function RetrospectiveForm({
  mode = 'create',
  initialValues,
  isSubmitting = false,
  errorMessage = '',
  onSubmit,
  onCancel,
}) {
  const [title, setTitle] = useState(initialValues?.title || '')
  const [content, setContent] = useState(initialValues?.content || '')

  const trimmedTitle = title.trim()
  const trimmedContent = content.trim()
  const canSubmit =
    Boolean(trimmedTitle) && Boolean(trimmedContent) && !isSubmitting

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!canSubmit) {
      return
    }

    onSubmit({ title: trimmedTitle, content: trimmedContent })
  }

  const submitLabel = mode === 'edit' ? '수정 완료' : '작성 완료'

  return (
    <form className='retrospective-form' onSubmit={handleSubmit}>
      <div className='retrospective-form-field'>
        <label htmlFor='retrospective-title'>제목</label>
        <input
          id='retrospective-title'
          type='text'
          value={title}
          maxLength={TITLE_MAX}
          placeholder='회고록 제목을 입력해주세요.'
          onChange={(event) => setTitle(event.target.value)}
          disabled={isSubmitting}
        />
        <span className='retrospective-form-count'>
          {title.length} / {TITLE_MAX}
        </span>
      </div>

      <div className='retrospective-form-field'>
        <label htmlFor='retrospective-content'>내용</label>
        <textarea
          id='retrospective-content'
          value={content}
          maxLength={CONTENT_MAX}
          rows={14}
          placeholder='협업 경험을 자유롭게 작성해주세요.'
          onChange={(event) => setContent(event.target.value)}
          disabled={isSubmitting}
        />
        <span className='retrospective-form-count'>
          {content.length} / {CONTENT_MAX}
        </span>
      </div>

      {errorMessage && (
        <p className='retrospective-form-error' role='alert'>
          {errorMessage}
        </p>
      )}

      <div className='retrospective-form-actions'>
        <button
          type='submit'
          className='retrospective-form-submit'
          disabled={!canSubmit}
        >
          {isSubmitting ? '저장 중' : submitLabel}
        </button>
        {onCancel && (
          <button
            type='button'
            className='retrospective-form-cancel'
            onClick={onCancel}
            disabled={isSubmitting}
          >
            취소
          </button>
        )}
      </div>
    </form>
  )
}
