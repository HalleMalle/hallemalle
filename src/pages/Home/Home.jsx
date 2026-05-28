import { Link } from "react-router-dom";
import useInView from "../../hooks/useInView";
import "./Home.scss";

function AnimatedSection({ children, className = "" }) {
  const [ref, inView] = useInView();
  return (
    <section
      ref={ref}
      className={`animate-section ${inView ? "visible" : ""} ${className}`}
    >
      {children}
    </section>
  );
}

export default function Home() {
  return (
    <div className="home-page">
      {/* Hero */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            함께 만드는 프로젝트,
            <br />
            <span className="hero-highlight">HalleMalle</span>
          </h1>
          <p className="hero-subtitle">
            개발자와 디자이너가 팀을 이루어 아이디어를 현실로 만듭니다.
            <br />
            지금 바로 팀을 찾거나, 새로운 프로젝트를 시작하세요.
          </p>
          <div className="hero-actions">
            <Link to="/togethers" className="btn-primary">
              프로젝트 둘러보기
            </Link>
            <Link to="/togethers/write" className="btn-outline">
              새 프로젝트 만들기
            </Link>
          </div>
        </div>
        <div className="hero-decoration">
          <div className="hero-shape shape-1" />
          <div className="hero-shape shape-2" />
          <div className="hero-shape shape-3" />
        </div>
      </section>

      {/* How it works */}
      <AnimatedSection className="steps-section">
        <h2 className="section-title">이렇게 진행돼요</h2>
        <p className="section-desc">간단한 3단계로 원하는 팀을 만나보세요</p>
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-number">1</div>
            <h3>프로젝트 찾기</h3>
            <p>
              원하는 직무와 기술 스택으로 프로젝트를 탐색하세요. 필터로 원하는
              조건을 쉽게 찾을 수 있습니다.
            </p>
          </div>
          <div className="step-arrow">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12h14M13 5l7 7-7 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="step-card">
            <div className="step-number">2</div>
            <h3>신청하고 소통하기</h3>
            <p>
              관심 있는 프로젝트에 신청하고, 팀원과 소통하며 협업을 시작하세요.
            </p>
          </div>
          <div className="step-arrow">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12h14M13 5l7 7-7 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="step-card">
            <div className="step-number">3</div>
            <h3>함께 성장하기</h3>
            <p>
              프로젝트를 완료하고 회고록을 작성하며 협업 신뢰도를 쌓아가세요.
            </p>
          </div>
        </div>
      </AnimatedSection>

      {/* Features */}
      <AnimatedSection className="features-section">
        <h2 className="section-title">주요 기능</h2>
        <p className="section-desc">
          HalleMalle이 제공하는 모든 기능을 경험해보세요
        </p>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">👤</div>
            <h3>GitHub 포트폴리오</h3>
            <p>
              GitHub 계정을 연동해 자동으로 포트폴리오를 생성합니다. 협업 시
              상대방의 작업 이력을 참고할 수 있습니다.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📋</div>
            <h3>프로젝트 모집</h3>
            <p>
              원하는 직무와 인원을 설정해 팀원을 모집하세요. 프론트엔드, 백엔드,
              디자인, 안드로이드 등 다양한 포지션을 지원합니다.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🌡️</div>
            <h3>협업 신뢰도</h3>
            <p>
              프로젝트 완료, 팀원 평가, GitHub 활동 기반의 협업 신뢰도
              시스템으로 믿을 수 있는 팀원을 찾아보세요.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📝</div>
            <h3>회고록</h3>
            <p>
              프로젝트가 끝난 후 회고록을 작성해 경험을 공유하고, 팀원의 회고를
              통해 배움을 얻을 수 있습니다.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔍</div>
            <h3>개인 → 팀 찾기</h3>
            <p>
              팀을 찾는 개인 프로필을 등록하고, 팀에서 먼저 제안할 수 있는
              양방향 매칭 시스템을 지원합니다.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💡</div>
            <h3>참고 프로젝트</h3>
            <p>
              공공데이터 API를 연동해 참고할 만한 프로젝트 주제와 공모전 정보를
              한눈에 확인할 수 있습니다.
            </p>
          </div>
        </div>
      </AnimatedSection>

      {/* CTA */}
      <AnimatedSection className="cta-section">
        <h2>지금 바로 시작하세요</h2>
        <p>당신의 아이디어를 현실로 만들어줄 팀을 기다리고 있습니다.</p>
        <Link to="/login" className="btn-primary btn-lg">
          시작하기
        </Link>
      </AnimatedSection>
    </div>
  );
}
