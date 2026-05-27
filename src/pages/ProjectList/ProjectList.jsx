import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import ProjectCard from "../../components/project/ProjectCard";
import { fetchProjects } from "../../hooks/useProjects";
import "./ProjectList.scss";

const FILTERS = [
  { value: "", label: "All" },
  { value: "FE", label: "Frontend" },
  { value: "BE", label: "Backend" },
  { value: "Design", label: "Design" },
  { value: "Android", label: "Android" },
  { value: "iOS", label: "iOS" },
  { value: "PM", label: "PM" },
];

export default function ProjectList() {
  const [projects, setProjects] = useState([]);
  const [activeFilter, setActiveFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchProjects({ status: "recruiting" });
        setProjects(data);
      } catch (error) {
        console.error("Failed to load projects:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = activeFilter
    ? projects.filter((p) =>
        p.positions?.some((pos) => pos.role === activeFilter),
      )
    : projects;

  return (
    <div className="project-list-page">
      <div className="container">
        <div className="pl-header">
          <h1>프로젝트</h1>
          <Link to="/project/create" className="pl-create-btn">
            + 새 프로젝트
          </Link>
        </div>

        {/* Filters */}
        <div className="pl-filters">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              className={`pl-filter ${activeFilter === f.value ? "active" : ""}`}
              onClick={() => setActiveFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="pl-loading">
            <div className="loading-spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="pl-empty">
            <p>조건에 맞는 프로젝트가 없습니다.</p>
            <Link to="/project/create" className="btn-primary">
              첫 프로젝트 만들기
            </Link>
          </div>
        ) : (
          <div className="pl-grid">
            {filtered.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
