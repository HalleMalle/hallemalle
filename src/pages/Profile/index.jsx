import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { getMyProfile, updateProfile } from '@/api/profile'
import { useAuth } from '@/contexts/AuthContext'

import './Profile.scss'

const DEFAULT_AVATAR_LABEL = '프로필'
const PROFILE_LINKS = [
  {
    to: '/profile/togethers',
    title: '나의 구인',
    description: '내가 만든 구인과 승인되어 참여 중인 구인을 확인합니다.',
  },
  {
    to: '/profile/portfolio',
    title: 'GitHub 포트폴리오',
    description: 'GitHub 활동 요약과 기술 언어 비율을 확인합니다.',
  },
  {
    to: '/profile/notifications',
    title: '알림',
    description: '신청, 승인, 반려 등 내 활동과 관련된 알림을 확인합니다.',
  },
]

function ProfileMetric({ label, value }) {
  return (
    <div className='profile-metric'>
      <span className='profile-metric-value'>{value}</span>
      <span className='profile-metric-label'>{label}</span>
    </div>
  )
}

function ProfileLinkItem({ to, title, description }) {
  return (
    <Link to={to} className='profile-link-item'>
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <span className='profile-link-arrow' aria-hidden='true'>
        &gt;
      </span>
    </Link>
  )
}

export default function Profile() {
  const { user, updateUser } = useAuth()
  const [profile, setProfile] = useState(null)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [isEditingName, setIsEditingName] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadProfile() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const nextProfile = await getMyProfile(user?.uid)

        if (!isMounted) {
          return
        }

        setProfile(nextProfile)
        setDisplayName(nextProfile.display_name || '')
        setBio(nextProfile.bio || '')
      } catch (error) {
        if (!isMounted) {
          return
        }

        setErrorMessage(getProfileErrorMessage(error))
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadProfile()

    return () => {
      isMounted = false
    }
  }, [user?.uid])

  const handleEditName = () => {
    setSuccessMessage('')
    setErrorMessage('')
    setIsEditingName(true)
  }

  const handleCancelEditName = () => {
    setDisplayName(profile?.display_name || '')
    setBio(profile?.bio || '')
    setIsEditingName(false)
    setErrorMessage('')
  }

  const handleDisplayNameChange = (event) => {
    setDisplayName(event.target.value)
  }

  const handleBioChange = (event) => {
    setBio(event.target.value)
  }

  const handleDisplayNameSubmit = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const nextProfile = await updateProfile(user?.uid, {
        displayName,
        bio,
      })

      setProfile(nextProfile)
      setDisplayName(nextProfile.display_name || '')
      setBio(nextProfile.bio || '')
      updateUser(nextProfile)
      setIsEditingName(false)
      setSuccessMessage('프로필이 변경되었습니다.')
    } catch (error) {
      setErrorMessage(getProfileErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  function getProfileErrorMessage(error) {
    return error?.message || '프로필 정보를 처리하지 못했습니다.'
  }

  if (isLoading) {
    return (
      <main className='profile-page'>
        <div className='container'>
          <div className='profile-status-panel'>
            프로필 정보를 불러오는 중입니다.
          </div>
        </div>
      </main>
    )
  }

  if (!profile) {
    return (
      <main className='profile-page'>
        <div className='container'>
          <div
            className='profile-status-panel profile-status-panel-error'
            role='alert'
          >
            {errorMessage || '프로필 정보를 찾을 수 없습니다.'}
          </div>
        </div>
      </main>
    )
  }

  const avatarLabel =
    profile.display_name || profile.github_login || DEFAULT_AVATAR_LABEL
  const avatarImage = profile.photo_url || profile.photoURL || ''
  const tierLabel = `${profile.tier || 'bronze'} ${profile.tier_detail || 1}`
  const collaborationScore = Number(profile.collaboration_score ?? 10).toFixed(
    1
  )
  const githubSyncedAt = profile.github_synced_at?.toDate
    ? profile.github_synced_at.toDate().toLocaleDateString('ko-KR')
    : '동기화 전'

  return (
    <main className='profile-page'>
      <div className='container'>
        <section
          className='profile-section profile-section-main'
          aria-labelledby='profile-title'
        >
          <div className='profile-main-header'>
            <div className='profile-identity'>
              <div className='profile-avatar' aria-hidden='true'>
                {avatarImage ? (
                  <img src={avatarImage} alt='' />
                ) : (
                  <span>{avatarLabel.slice(0, 1)}</span>
                )}
              </div>

              <div className='profile-summary'>
                <p className='profile-eyebrow'>내 프로필</p>
                <h1 id='profile-title'>{profile.display_name}</h1>
                <p className='profile-github'>@{profile.github_login}</p>
                {profile.bio && <p className='profile-bio'>{profile.bio}</p>}
              </div>
            </div>
            {!isEditingName && (
              <button
                type='button'
                className='profile-secondary-button'
                onClick={handleEditName}
              >
                수정
              </button>
            )}
          </div>

          {isEditingName ? (
            <form
              className='profile-name-form'
              onSubmit={handleDisplayNameSubmit}
            >
              <label htmlFor='displayName'>이름</label>
              <div className='profile-name-controls'>
                <input
                  id='displayName'
                  type='text'
                  value={displayName}
                  minLength={2}
                  maxLength={20}
                  onChange={handleDisplayNameChange}
                  disabled={isSaving}
                />
              </div>
              <p className='profile-help-text'>
                이름은 2~20자, 공백 없이 입력해주세요.
              </p>
              <label htmlFor='bio'>소개</label>
              <textarea
                id='bio'
                value={bio}
                maxLength={200}
                rows={4}
                onChange={handleBioChange}
                disabled={isSaving}
                placeholder='나를 소개하는 문장을 입력해주세요.'
              />
              <p className='profile-help-text'>
                소개는 200자 이내로 입력할 수 있습니다.
              </p>
              <div className='profile-name-actions'>
                <button
                  type='submit'
                  className='profile-primary-button'
                  disabled={isSaving}
                >
                  {isSaving ? '저장 중' : '저장'}
                </button>
                <button
                  type='button'
                  className='profile-secondary-button'
                  onClick={handleCancelEditName}
                  disabled={isSaving}
                >
                  취소
                </button>
              </div>
            </form>
          ) : (
            <p className='profile-display-name'>{profile.display_name}</p>
          )}

          {errorMessage && (
            <p className='profile-message profile-message-error' role='alert'>
              {errorMessage}
            </p>
          )}
          {successMessage && (
            <p className='profile-message'>{successMessage}</p>
          )}
        </section>

        <section
          className='profile-section'
          aria-labelledby='profile-info-title'
        >
          <div className='profile-section-header'>
            <div>
              <h2 id='profile-info-title'>기본 정보</h2>
              <p>GitHub 인증으로 연결된 계정 정보입니다.</p>
            </div>
          </div>

          <dl className='profile-info-list'>
            <div>
              <dt>GitHub 아이디</dt>
              <dd>{profile.github_login}</dd>
            </div>
            <div>
              <dt>이메일</dt>
              <dd>{profile.email || '미공개'}</dd>
            </div>
            <div>
              <dt>등급</dt>
              <dd>{tierLabel}</dd>
            </div>
            <div>
              <dt>포트폴리오 동기화</dt>
              <dd>{githubSyncedAt}</dd>
            </div>
          </dl>
        </section>

        <section
          className='profile-section'
          aria-labelledby='profile-github-title'
        >
          <div className='profile-section-header'>
            <div>
              <h2 id='profile-github-title'>GitHub 요약</h2>
              <p>포트폴리오 동기화 후 최신 활동 요약이 표시됩니다.</p>
            </div>
            <Link to='/profile/portfolio' className='profile-secondary-button'>
              포트폴리오 보기
            </Link>
          </div>

          <div className='profile-metrics'>
            <ProfileMetric label='협업 점수' value={collaborationScore} />
            <ProfileMetric
              label='저장소'
              value={profile.github_repositories || 0}
            />
            <ProfileMetric
              label='기여도'
              value={profile.github_contributions || 0}
            />
            <ProfileMetric
              label='팔로워'
              value={profile.github_followers || 0}
            />
            <ProfileMetric label='스타' value={profile.github_stars || 0} />
          </div>
        </section>

        <section
          className='profile-section'
          aria-labelledby='profile-links-title'
        >
          <div className='profile-section-header'>
            <div>
              <h2 id='profile-links-title'>내 활동</h2>
              <p>프로필과 연결된 활동 화면으로 이동합니다.</p>
            </div>
          </div>

          <div className='profile-links'>
            {PROFILE_LINKS.map((item) => (
              <ProfileLinkItem key={item.to} {...item} />
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
