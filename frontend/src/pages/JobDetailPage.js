import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useJobs } from "../context/JobsContext";

export default function JobDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { jobs } = useJobs();

  const job = useMemo(() => {
    const nid = Number(id);
    const list = Array.isArray(jobs) ? jobs : [];
    return list.find((j) => j && Number(j.id) === nid) || null;
  }, [id, jobs]);

  if (!job) {
    return (
      <div className="job-detail-page">
        <div className="detail-topbar">
          <button type="button" onClick={() => navigate(-1)}>
            ←
          </button>
          <h2>공고 상세</h2>
          <span />
        </div>
        <div className="detail-content" style={{ padding: 24 }}>
          <p>공고를 찾을 수 없습니다.</p>
          <button type="button" className="main-btn" onClick={() => navigate("/")}>
            홈으로
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="job-detail-page">
      <div className="detail-topbar">
        <button type="button" onClick={() => navigate(-1)}>
          ←
        </button>
        <h2>공고 상세</h2>
        <button type="button">⋯</button>
      </div>

      <div className="detail-image">🏠</div>

      <div className="detail-content">
        <h1>{job.title}</h1>
        <p className="detail-region">{job.shortAddress || job.address || ""}</p>
        <div className="detail-pay">💰 {job.pay}</div>
        <div className="detail-info-box">
          <div>👷 {job.trade || "직종"}</div>
          <div>👥 지원 {job.applicants ?? 0}명</div>
        </div>
        <div className="detail-description">현장 상세 설명은 추후 연결됩니다.</div>
      </div>

      <div className="detail-bottom-buttons">
        <button type="button" className="phone-btn">
          전화
        </button>
        <button type="button" className="chat-btn">
          채팅
        </button>
        <button type="button" className="apply-btn">
          지원하기
        </button>
      </div>
    </div>
  );
}
