import { useEffect, useRef, useState } from 'react'

import './ReferenceFormModal.scss'

const TITLE_MAX = 80
const DESCRIPTION_MAX = 1000

function tagsToText(tags) {
  return Array.isArray(tags) ? tags.join(', ') : ''
}

function parseTags(text) {
  return text
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

// F-REF-005/006: 참고 주제 작성·수정 모달 폼.
// mode='create' | 'edit'. 제출 결과(성공/실패)는 상위(onSubmit)가 관리한다.
export default function ReferenceFormModal({
  mode = 'create',
  initialValues,
  isSubmitting = false,
  errorMessage = '',
  onSubmit,
  onClose,
}) {
  const [title, setTitle] = useState(initialValues?.title || '')
  const [description, setDescription] = useState(
    initialValues?.description || ''
  )
  const [tagsText, setTagsText] = useState(tagsToText(initialValues?.tags))
  const [validationError, setValidationError] = useState('')
  const titleInputRef = useRef(null)

  useEffect(() => {
    titleInputRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isSubmitting, onClose])

  const handleBackdropMouseDown = (event) => {
    if (event.target === event.currentTarget && !isSubmitting) {
      onClose()
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const trimmedTitle = title.trim()
    const trimmedDescription = description.trim()

    if (!trimmedTitle || !trimmedDescription) {
      setValidationError('제목과 설명을 입력해주세요.')
      return
    }

    setValidationError('')

    await onSubmit({
      title: trimmedTitle,
      description: trimmedDescription,
      tags: parseTags(tagsText),
    })
  }

  const heading = mode === 'edit' ? '참고 주제 수정' : '참고 주제 추가'
  const submitLabel = mode === 'edit' ? '수정' : '추가'
  const formError = validationError || errorMessage

  return (
    <div
      className='reference-modal-backdrop'
      onMouseDown={handleBackdropMouseDown}
    >
      <div
        className='reference-modal'
        role='dialog'
        aria-modal='true'
        aria-labelledby='reference-modal-title'
      >
        <div className='reference-modal-header'>
          <h2 id='reference-modal-title'>{heading}</h2>
          <button
            type='button'
            className='reference-modal-close'
            aria-label='닫기'
            onClick={onClose}
            disabled={isSubmitting}
          >
            &times;
          </button>
        </div>

        <form className='reference-modal-form' onSubmit={handleSubmit}>
          <label htmlFor='reference-title'>제목</label>
          <input
            id='reference-title'
            ref={titleInputRef}
            type='text'
            value={title}
            maxLength={TITLE_MAX}
            onChange={(event) => setTitle(event.target.value)}
            disabled={isSubmitting}
            placeholder='주제 제목을 입력하세요'
          />

          <label htmlFor='reference-description'>설명</label>
          <textarea
            id='reference-description'
            value={description}
            maxLength={DESCRIPTION_MAX}
            rows={5}
            onChange={(event) => setDescription(event.target.value)}
            disabled={isSubmitting}
            placeholder='어떤 프로젝트 주제인지 설명해주세요'
          />

          <label htmlFor='reference-tags'>태그</label>
          <input
            id='reference-tags'
            type='text'
            value={tagsText}
            onChange={(event) => setTagsText(event.target.value)}
            disabled={isSubmitting}
            placeholder='쉼표로 구분 (예: AI, 헬스케어)'
          />
          <p className='reference-modal-help'>
            태그는 쉼표로 구분하며 최대 5개까지 저장됩니다.
          </p>

          {formError && (
            <p className='reference-modal-error' role='alert'>
              {formError}
            </p>
          )}

          <div className='reference-modal-actions'>
            <button
              type='submit'
              className='reference-modal-submit'
              disabled={isSubmitting}
            >
              {isSubmitting ? '저장 중' : submitLabel}
            </button>
            <button
              type='button'
              className='reference-modal-cancel'
              onClick={onClose}
              disabled={isSubmitting}
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
