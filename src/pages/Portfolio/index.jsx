import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { getMyProfile, syncGithubPortfolio } from '@/api/profile'
import { useAuth } from '@/contexts/AuthContext'

import './Portfolio.scss'

const DEFAULT_AVATAR_LABEL = 'GitHub'

function getProfileErrorMessage(error) {
  return error?.message || '포트폴리오 정보를 처리하지 못했습니다.'
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('ko-KR')
}

function formatSyncedAt(value) {
  if (!value) {
    return '동기화 전'
  }

  const date = value.toDate ? value.toDate() : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '동기화 전'
  }

  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatEvidence(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(', ')
  }

  return value || ''
}

function PortfolioMetric({ label, value, description }) {
  return (
    <div className='portfolio-metric'>
      <strong>{value}</strong>
      <span>{label}</span>
      {description && <small>{description}</small>}
    </div>
  )
}

function RepositoryItem({ repository }) {
  return (
    <li className='portfolio-repository-item'>
      <div>
        <a href={repository.url} target='_blank' rel='noreferrer'>
          {repository.nameWithOwner}
        </a>
        <span>
          {repository.isFork ? 'Fork' : 'Original'} · {repository.isPrivate ? 'Private' : 'Public'}
        </span>
      </div>
      <strong>{formatNumber(repository.changes)} changes</strong>
    </li>
  )
}

function UsageBar({ label, ratio, index, description }) {
  const width = Math.max(Number(ratio || 0), 2)

  return (
    <div className='portfolio-language-row'>
      <div className='portfolio-language-meta'>
        <span>{label}</span>
        <strong>{ratio}%</strong>
      </div>
      <div
        className='portfolio-language-track'
        aria-label={`${label} ${ratio}%`}
      >
        <span
          className={`portfolio-language-fill portfolio-language-fill-${(index % 5) + 1}`}
          style={{ width: `${width}%` }}
        />
      </div>
      {description && (
        <p className='portfolio-usage-evidence'>{description}</p>
      )}
    </div>
  )
}

function EmptyPanel({ children }) {
  return <div className='portfolio-empty-panel'>{children}</div>
}

export default function Portfolio() {
  const { user, updateUser } = useAuth()
  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadPortfolio() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const nextProfile = await getMyProfile(user?.uid)

        if (!isMounted) {
          return
        }

        setProfile(nextProfile)
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

    loadPortfolio()

    return () => {
      isMounted = false
    }
  }, [user?.uid])

  const languageEntries = useMemo(
    () => Object.entries(profile?.github_language_json || {})
      .filter(([, ratio]) => Number(ratio) > 0)
      .sort(([, firstRatio], [, secondRatio]) => (
        Number(secondRatio) - Number(firstRatio)
      )),
    [profile?.github_language_json],
  )
  const frameworkEntries = useMemo(
    () => Object.entries(profile?.github_framework_json || {})
      .filter(([, ratio]) => Number(ratio) > 0)
      .sort(([, firstRatio], [, secondRatio]) => (
        Number(secondRatio) - Number(firstRatio)
      )),
    [profile?.github_framework_json],
  )

  const dominantLanguage = languageEntries[0]?.[0] || '분석 전'
  const dominantFramework = frameworkEntries[0]?.[0] || '분석 전'
  const hasSyncedPortfolio = Boolean(profile?.github_synced_at)
  const commitFileStats = profile?.github_commit_file_stats || {}
  const contributedRepositories = profile?.github_contributed_repositories || []
  const frameworkEvidence = profile?.github_framework_evidence || {}
  const syncSourceLabel = profile?.github_language_source === 'COMMIT_FILES'
    ? '커밋 변경 파일 기준'
    : '저장소 언어 기준'
  const frameworkSourceLabel = profile?.github_framework_source
    ? '커밋 변경 파일 및 의존성 기준'
    : '분석 전'
  const avatarLabel =
    profile?.display_name || profile?.github_login || DEFAULT_AVATAR_LABEL
  const avatarImage = profile?.photo_url || profile?.photoURL || ''
  const githubUrl = profile?.github_login
    ? `https://github.com/${profile.github_login}`
    : ''

  const handleSyncPortfolio = async () => {
    setIsSyncing(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const nextProfile = await syncGithubPortfolio(user?.uid)

      setProfile(nextProfile)
      updateUser(nextProfile)
      setSuccessMessage('GitHub 포트폴리오를 최신 상태로 동기화했습니다.')
    } catch (error) {
      setErrorMessage(getProfileErrorMessage(error))
    } finally {
      setIsSyncing(false)
    }
  }

  if (isLoading) {
    return (
      <main className='portfolio-page'>
        <div className='container'>
          <div className='portfolio-status-panel'>
            포트폴리오 정보를 불러오는 중입니다.
          </div>
        </div>
      </main>
    )
  }

  if (!profile) {
    return (
      <main className='portfolio-page'>
        <div className='container'>
          <div
            className='portfolio-status-panel portfolio-status-panel-error'
            role='alert'
          >
            {errorMessage || '포트폴리오 정보를 찾을 수 없습니다.'}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className='portfolio-page'>
      <div className='container'>
        <section
          className='portfolio-hero'
          aria-labelledby='portfolio-title'
        >
          <div className='portfolio-identity'>
            <div className='portfolio-avatar' aria-hidden='true'>
              {avatarImage ? (
                <img src={avatarImage} alt='' />
              ) : (
                <span>{avatarLabel.slice(0, 1)}</span>
              )}
            </div>
            <div className='portfolio-heading'>
              <p className='portfolio-eyebrow'>GitHub 포트폴리오</p>
              <h1 id='portfolio-title'>
                {profile.display_name || profile.github_login}
              </h1>
              <p>@{profile.github_login || 'github'}</p>
            </div>
          </div>

          <div className='portfolio-actions'>
            {githubUrl && (
              <a
                className='portfolio-secondary-button'
                href={githubUrl}
                target='_blank'
                rel='noreferrer'
              >
                GitHub 열기
              </a>
            )}
            <button
              type='button'
              className='portfolio-primary-button'
              onClick={handleSyncPortfolio}
              disabled={isSyncing}
            >
              {isSyncing ? '동기화 중' : '동기화'}
            </button>
          </div>
        </section>

        {(errorMessage || successMessage || !hasSyncedPortfolio) && (
          <section className='portfolio-feedback' aria-live='polite'>
            {!hasSyncedPortfolio && !errorMessage && (
              <p>아직 저장된 포트폴리오 스냅샷이 없습니다. 동기화 후 GitHub 활동 요약이 표시됩니다.</p>
            )}
            {errorMessage && (
              <p className='portfolio-message-error' role='alert'>
                {errorMessage}
              </p>
            )}
            {successMessage && <p>{successMessage}</p>}
          </section>
        )}

        <section
          className='portfolio-section portfolio-overview'
          aria-labelledby='portfolio-overview-title'
        >
          <div className='portfolio-section-header'>
            <div>
              <h2 id='portfolio-overview-title'>활동 요약</h2>
              <p>{syncSourceLabel}으로 계산한 협업 참고 지표입니다.</p>
            </div>
            <span className='portfolio-sync-time'>
              {formatSyncedAt(profile.github_synced_at)}
            </span>
          </div>

          <div className='portfolio-metrics'>
            <PortfolioMetric
              label='기여 저장소'
              value={formatNumber(profile.github_repositories)}
              description='커밋 기여가 확인된 저장소'
            />
            <PortfolioMetric
              label='전체 기여'
              value={formatNumber(profile.github_contributions)}
              description='커밋, PR, 리뷰, 이슈 합계'
            />
            <PortfolioMetric
              label='커밋'
              value={formatNumber(profile.github_commit_contributions)}
              description='최근 1년 commit contribution'
            />
            <PortfolioMetric
              label='PR'
              value={formatNumber(profile.github_pr_contributions)}
              description='최근 1년 pull request'
            />
          </div>
        </section>

        <section
          className='portfolio-section'
          aria-labelledby='portfolio-file-stats-title'
        >
          <div className='portfolio-section-header'>
            <div>
              <h2 id='portfolio-file-stats-title'>파일 분석 범위</h2>
              <p>내가 author인 커밋의 변경 파일만 언어 비율에 반영합니다.</p>
            </div>
          </div>

          <div className='portfolio-metrics portfolio-file-metrics'>
            <PortfolioMetric
              label='분석 커밋'
              value={formatNumber(commitFileStats.analyzedCommits)}
              description={`${formatNumber(commitFileStats.totalCommits)}개 커밋 후보`}
            />
            <PortfolioMetric
              label='분석 파일'
              value={formatNumber(commitFileStats.analyzedFiles)}
              description={`${formatNumber(commitFileStats.totalFiles)}개 변경 파일`}
            />
            <PortfolioMetric
              label='제외 파일'
              value={formatNumber(commitFileStats.excludedFiles)}
              description='lock, build, binary 등 제외'
            />
            <PortfolioMetric
              label='변경량'
              value={formatNumber(commitFileStats.analyzedChanges)}
              description='additions + deletions'
            />
          </div>
        </section>

        <section
          className='portfolio-section portfolio-grid'
          aria-labelledby='portfolio-detail-title'
        >
          <div className='portfolio-panel portfolio-language-panel'>
            <div className='portfolio-section-header'>
              <div>
                <h2 id='portfolio-detail-title'>주요 Framework</h2>
                <p>커밋 변경 파일과 의존성 manifest를 기반으로 추정한 사용 스택입니다.</p>
              </div>
            </div>

            {frameworkEntries.length ? (
              <div className='portfolio-language-list'>
                {frameworkEntries.map(([framework, ratio], index) => (
                  <UsageBar
                    key={framework}
                    label={framework}
                    ratio={ratio}
                    index={index}
                    description={formatEvidence(frameworkEvidence[framework])}
                  />
                ))}
              </div>
            ) : (
              <EmptyPanel>Framework 분석은 동기화 후 표시됩니다.</EmptyPanel>
            )}
          </div>

          <div className='portfolio-panel'>
            <div className='portfolio-section-header'>
              <div>
                <h2>언어 구성</h2>
                <p>커밋에서 실제로 변경한 파일 기준입니다.</p>
              </div>
            </div>

            {languageEntries.length ? (
              <div className='portfolio-language-summary'>
                {languageEntries.slice(0, 5).map(([language, ratio], index) => (
                  <UsageBar
                    key={language}
                    label={language}
                    ratio={ratio}
                    index={index}
                  />
                ))}
              </div>
            ) : (
              <EmptyPanel>언어 비율은 동기화 후 표시됩니다.</EmptyPanel>
            )}

            <dl className='portfolio-info-list portfolio-info-list-compact'>
              <div>
                <dt>대표 Framework</dt>
                <dd>{dominantFramework}</dd>
              </div>
              <div>
                <dt>대표 언어</dt>
                <dd>{dominantLanguage}</dd>
              </div>
              <div>
                <dt>Framework 기준</dt>
                <dd>{frameworkSourceLabel}</dd>
              </div>
              <div>
                <dt>언어 기준</dt>
                <dd>{syncSourceLabel}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section
          className='portfolio-section'
          aria-labelledby='portfolio-repositories-title'
        >
          <div className='portfolio-section-header'>
            <div>
              <h2 id='portfolio-repositories-title'>기여 저장소</h2>
              <p>최근 1년 동안 커밋 기여가 확인된 저장소입니다.</p>
            </div>
          </div>

          {contributedRepositories.length ? (
            <ul className='portfolio-repository-list'>
              {contributedRepositories.map((repository) => (
                <RepositoryItem
                  key={repository.nameWithOwner}
                  repository={repository}
                />
              ))}
            </ul>
          ) : (
            <EmptyPanel>동기화 후 기여 저장소가 표시됩니다.</EmptyPanel>
          )}
        </section>

        <section className='portfolio-section portfolio-note'>
          <div>
            <h2>활용 기준</h2>
            <p>
              언어 비율은 fork한 저장소 전체가 아니라 내가 직접 커밋에서 변경한
              파일을 기준으로 계산합니다. GitHub 활동은 협업 판단을 돕는 보조
              정보이므로 프로젝트 역할, 참여 이력, 회고와 함께 확인합니다.
            </p>
          </div>
          <Link to='/profile' className='portfolio-secondary-button'>
            프로필로 돌아가기
          </Link>
        </section>
      </div>
    </main>
  )
}
