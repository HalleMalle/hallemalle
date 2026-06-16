import { useEffect } from 'react'

import './ConfirmDialog.scss'

// 위험 액션(삭제 등) 확인용 범용 모달. ESC·바깥 클릭으로 닫는다.
export default function ConfirmDialog({
  title,
  message,
  confirmLabel = '확인',
  cancelLabel = '취소',
  isBusy = false,
  errorMessage = '',
  onConfirm,
  onClose,
}) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !isBusy) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isBusy, onClose])

  const handleBackdropMouseDown = (event) => {
    if (event.target === event.currentTarget && !isBusy) {
      onClose()
    }
  }

  return (
    <div className='confirm-backdrop' onMouseDown={handleBackdropMouseDown}>
      <div
        className='confirm-dialog'
        role='alertdialog'
        aria-modal='true'
        aria-labelledby='confirm-dialog-title'
        aria-describedby='confirm-dialog-message'
      >
        <h2 id='confirm-dialog-title' className='confirm-dialog-title'>
          {title}
        </h2>
        <p id='confirm-dialog-message' className='confirm-dialog-message'>
          {message}
        </p>

        {errorMessage && (
          <p className='confirm-dialog-error' role='alert'>
            {errorMessage}
          </p>
        )}

        <div className='confirm-dialog-actions'>
          <button
            type='button'
            className='confirm-dialog-confirm'
            onClick={onConfirm}
            disabled={isBusy}
          >
            {isBusy ? '처리 중' : confirmLabel}
          </button>
          <button
            type='button'
            className='confirm-dialog-cancel'
            onClick={onClose}
            disabled={isBusy}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
