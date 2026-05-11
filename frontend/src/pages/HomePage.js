import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import JobList from "../components/Jobs/JobList";
import { useJobs } from "../context/JobsContext";
import { TRADE_KEYS } from "../overlays/jobSpeechBubbleOverlay";

export default function HomePage() {
  const navigate = useNavigate();
  const { jobs, setJobs } = useJobs();
  const [tradeFilter, setTradeFilter] = useState(null);

  const filteredJobs = useMemo(() => {
    const list = Array.isArray(jobs) ? jobs : [];
    if (!tradeFilter) return list;
    return list.filter((j) => j && j.trade === tradeFilter);
  }, [jobs, tradeFilter]);

  const handleJobClick = (job) => {
    if (!job || job.id == null) return;
    navigate(`/job/${job.id}`);
  };

  const handleApplyJob = (job) => {
    if (!job || job.id == null) return;
    setJobs((prev) =>
      (Array.isArray(prev) ? prev : []).map((item) => {
        if (!item || item.id !== job.id) return item;
        return { ...item, applicants: (item.applicants || 0) + 1 };
      })
    );
  };

  return (
    <div className="daangn-home">
      <header className="daangn-home__header">
        <div className="daangn-home__region-block">
          <div className="daangn-home__region">대전 서구 둔산동</div>
          <div className="daangn-home__sub">일당맵 · 현장 공고</div>
        </div>
        <div className="daangn-home__actions">
          <button type="button" className="daangn-icon-btn" aria-label="검색">
            🔍
          </button>
          <button type="button" className="daangn-icon-btn" aria-label="알림">
            🔔
          </button>
          <button type="button" className="daangn-icon-btn" aria-label="메뉴">
            ☰
          </button>
        </div>
      </header>

      <div className="daangn-home__chips">
        <button
          type="button"
          className={`daangn-chip${tradeFilter == null ? " daangn-chip--active" : ""}`}
          onClick={() => setTradeFilter(null)}
        >
          전체
        </button>
        {TRADE_KEYS.map((t) => (
          <button
            key={t}
            type="button"
            className={`daangn-chip${tradeFilter === t ? " daangn-chip--active" : ""}`}
            onClick={() => setTradeFilter(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="daangn-home__list">
        <JobList
          jobs={filteredJobs}
          selectedJob={null}
          onJobClick={handleJobClick}
          onApplyJob={handleApplyJob}
          idSuffix="-home"
          listClassName="job-list--daangn"
        />
      </div>

      <button type="button" className="daangn-fab" onClick={() => navigate("/map")} aria-label="글쓰기">
        +
      </button>
    </div>
  );
}
