import { useState } from 'react'
import { Link } from 'react-router-dom'

import ConfirmDialog from '@/components/ConfirmDialog'
import ReferenceFormModal from '@/components/ReferenceFormModal'
import { useAuth } from '@/contexts/AuthContext'
import useReferenceMutations from '@/hooks/useReferenceMutations'
import useReferences from '@/hooks/useReferences'

import './ReferenceList.scss'

const VIEW_TABS = [
  { value: 'LATEST', label: '전체' },
  { value: 'POPULAR', label: '인기순' },
  { value: 'SCRAPPED', label: '내가 찜한' },
]

// Firestore Timestamp 또는 일반 값을 한국어 날짜 문자열로 안전하게 변환한다.
function formatCreatedAt(createdAt) {
  if (createdAt?.toDate) {
    return createdAt.toDate().toLocaleDateString('ko-KR')
  }

  return ''
}

function ReferenceCard({
  reference,
  canManage,
  onToggleScrap,
  onToggleLike,
  onEdit,
  onDelete,
}) {
  const {
    referenceId,
    title,
    description,
    tags,
    createdAt,
    isScrapped,
    isLiked,
    likesCount,
  } = reference
  const createdAtLabel = formatCreatedAt(createdAt)

  return (
    <article className='reference-card'>
      <div className='reference-card-head'>
        <h2 className='reference-card-title'>{title || '제목 없음'}</h2>
        <button
          type='button'
          className='reference-card-scrap'
          aria-pressed={isScrapped}
          aria-label={isScrapped ? '찜 해제' : '찜하기'}
          onClick={() => onToggleScrap(referenceId)}
        >
          <span className='reference-card-scrap-icon' aria-hidden='true'>
            {isScrapped ? '♥' : '♡'}
          </span>
          <span>{isScrapped ? '찜함' : '찜'}</span>
        </button>
      </div>

      {description && (
        <p className='reference-card-description'>{description}</p>
      )}

      {tags?.length > 0 && (
        <ul className='reference-card-tags'>
          {tags.map((tag) => (
            <li className='reference-card-tag' key={tag}>
              {tag}
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <div className='reference-card-owner-actions'>
          <button
            type='button'
            className='reference-card-owner-button'
            onClick={() => onEdit(reference)}
          >
            수정
          </button>
          <button
            type='button'
            className='reference-card-owner-button reference-card-owner-button-danger'
            onClick={() => onDelete(reference)}
          >
            삭제
          </button>
        </div>
      )}

      <div className='reference-card-footer'>
        <button
          type='button'
          className='reference-card-like'
          aria-pressed={isLiked}
          aria-label={isLiked ? '추천 취소' : '추천하기'}
          onClick={() => onToggleLike(referenceId)}
        >
          <span className='reference-card-like-icon' aria-hidden='true'>
            {isLiked ? '▲' : '△'}
          </span>
          <span>추천</span>
          <span className='reference-card-like-count'>{likesCount}</span>
        </button>

        {createdAtLabel && (
          <span className='reference-card-meta'>{createdAtLabel}</span>
        )}
      </div>
    </article>
  )
}

export default function ReferenceList() {
  const { user } = useAuth()
  const uid = user?.uid

  const {
    references,
    isLoading,
    errorMessage,
    scrapError,
    likeError,
    view,
    setView,
    toggleScrap,
    toggleLike,
    reload,
  } = useReferences()

  const {
    create,
    update,
    remove,
    isSubmitting,
    errorMessage: mutationError,
    resetError,
  } = useReferenceMutations()

  const [formModal, setFormModal] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const isScrappedView = view === 'SCRAPPED'
  const actionError = scrapError || likeError

  const openCreate = () => {
    resetError()
    setFormModal({ mode: 'create', reference: null })
  }

  const openEdit = (reference) => {
    resetError()
    setFormModal({ mode: 'edit', reference })
  }

  const closeFormModal = () => {
    setFormModal(null)
    resetError()
  }

  const openDelete = (reference) => {
    resetError()
    setDeleteTarget(reference)
  }

  const closeDelete = () => {
    setDeleteTarget(null)
    resetError()
  }

  const handleFormSubmit = async (values) => {
    try {
      if (formModal?.mode === 'edit') {
        await update({
          referenceId: formModal.reference.referenceId,
          ...values,
        })
      } else {
        await create(values)
      }

      closeFormModal()
      await reload()
    } catch {
      // 실패 메시지는 모달의 mutationError로 표시되고 모달은 열린 채 유지된다.
    }
  }

  const handleDeleteConfirm = async () => {
    try {
      await remove({ referenceId: deleteTarget.referenceId })
      setDeleteTarget(null)
      await reload()
    } catch {
      // 실패 메시지는 확인 모달의 mutationError로 표시된다.
    }
  }

  return (
    <main className='reference-list-page'>
      <div className='container'>
        <header className='reference-list-header'>
          <p className='reference-list-eyebrow'>참고 주제</p>
          <h1 className='reference-list-title'>프로젝트 아이디어 둘러보기</h1>
          <p className='reference-list-subtitle'>
            다른 사용자가 고안한 프로젝트 주제를 탐색하고, 마음에 드는 주제는
            추천하거나 찜해 두세요.
          </p>
          {uid && (
            <button
              type='button'
              className='reference-list-add'
              onClick={openCreate}
            >
              + 주제 추가
            </button>
          )}
        </header>

        <div
          className='reference-list-tabs'
          role='group'
          aria-label='참고 주제 보기 방식'
        >
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.value}
              type='button'
              className={
                view === tab.value
                  ? 'reference-list-tab reference-list-tab-active'
                  : 'reference-list-tab'
              }
              aria-pressed={view === tab.value}
              onClick={() => setView(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {actionError && (
          <p className='reference-list-alert' role='alert'>
            {actionError}
          </p>
        )}

        {isLoading ? (
          <div className='reference-list-status' role='status'>
            참고 주제를 불러오는 중입니다.
          </div>
        ) : errorMessage ? (
          <div
            className='reference-list-status reference-list-status-error'
            role='alert'
          >
            {errorMessage}
          </div>
        ) : references.length === 0 ? (
          <div className='reference-list-empty'>
            {isScrappedView ? (
              <>
                <p className='reference-list-empty-title'>
                  찜한 주제가 없어요.
                </p>
                <p className='reference-list-empty-description'>
                  마음에 드는 주제를 찜하면 여기에 모여요.
                </p>
                <button
                  type='button'
                  className='reference-list-empty-link'
                  onClick={() => setView('LATEST')}
                >
                  전체 주제 보기
                </button>
              </>
            ) : (
              <>
                <p className='reference-list-empty-title'>
                  아직 등록된 참고 주제가 없어요.
                </p>
                <p className='reference-list-empty-description'>
                  {uid
                    ? '첫 프로젝트 주제를 추가해보세요.'
                    : '구인 글을 둘러보며 협업 아이디어를 찾아보세요.'}
                </p>
                {uid ? (
                  <button
                    type='button'
                    className='reference-list-empty-link'
                    onClick={openCreate}
                  >
                    주제 추가하기
                  </button>
                ) : (
                  <Link to='/togethers' className='reference-list-empty-link'>
                    구인 둘러보기
                  </Link>
                )}
              </>
            )}
          </div>
        ) : (
          <ul className='reference-list-grid'>
            {references.map((reference) => (
              <li key={reference.referenceId}>
                <ReferenceCard
                  reference={reference}
                  canManage={Boolean(uid) && reference.createdBy === uid}
                  onToggleScrap={toggleScrap}
                  onToggleLike={toggleLike}
                  onEdit={openEdit}
                  onDelete={openDelete}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {formModal && (
        <ReferenceFormModal
          mode={formModal.mode}
          initialValues={formModal.reference}
          isSubmitting={isSubmitting}
          errorMessage={mutationError}
          onSubmit={handleFormSubmit}
          onClose={closeFormModal}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title='참고 주제 삭제'
          message={`'${deleteTarget.title}' 주제를 삭제할까요? 삭제하면 되돌릴 수 없습니다.`}
          confirmLabel='삭제'
          isBusy={isSubmitting}
          errorMessage={mutationError}
          onConfirm={handleDeleteConfirm}
          onClose={closeDelete}
        />
      )}
    </main>
  )
}
