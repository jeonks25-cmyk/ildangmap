import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CRAFT_LABEL } from "../utils/jobModel";
import { buildConsumerMockPhoto } from "../utils/consumerRequestsStorage";
import { getMockNearbyOyajiMatches } from "../utils/visitEstimateMock";

const CRAFT_OPTIONS = ["film", "wallpaper", "tile", "paint", "electric"];

const VISIT_SLOT_OPTIONS = [
  { id: "weekday-am", label: "평일 오전" },
  { id: "weekday-pm", label: "평일 오후" },
  { id: "weekend", label: "주말" },
  { id: "evening", label: "평일 저녁(6시 이후)" },
];

function formatDistanceKm(km) {
  const n = Number(km);
  if (!Number.isFinite(n)) return "-";
  if (n < 1) return `${Math.round(n * 1000)}m`;
  return `${n.toFixed(1)}km`;
}

export default function VisitEstimateRequestPage() {
  const navigate = useNavigate();
  const [craft, setCraft] = useState("film");
  const [region, setRegion] = useState("대전 서구 둔산동");
  const [areaPyng, setAreaPyng] = useState("24");
  const [visitSlots, setVisitSlots] = useState(() => new Set(["weekday-pm"]));
  const [memo, setMemo] = useState("샤시·거실 위주로 필름 견적 받고 싶어요.");
  const [photoCount] = useState(2);
  const [submitted, setSubmitted] = useState(false);
  const [matches, setMatches] = useState([]);

  const photos = useMemo(
    () =>
      Array.from({ length: photoCount }).map((_, i) =>
        buildConsumerMockPhoto(`visit-estimate-${craft}-${i + 1}`, `참고 사진 ${i + 1}`)
      ),
    [craft, photoCount]
  );

  const toggleSlot = (id) => {
    setVisitSlots((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = () => {
    const slots = VISIT_SLOT_OPTIONS.filter((o) => visitSlots.has(o.id)).map((o) => o.label);
    const list = getMockNearbyOyajiMatches({
      craft,
      region: region.trim(),
      areaPyng,
      visitSlots: slots,
      memo: memo.trim(),
    });
    setMatches(list);
    setSubmitted(true);
    window.setTimeout(() => {
      const el = document.getElementById("visit-estimate-matches");
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const canSubmit = region.trim().length > 0 && visitSlots.size > 0;

  return (
    <div className="visit-estimate-page">
      <header className="visit-estimate-page__hero">
        <button type="button" className="visit-estimate-page__back" onClick={() => navigate(-1)} aria-label="뒤로">
          ←
        </button>
        <div>
          <p className="visit-estimate-page__eyebrow">근처 현장 연결</p>
          <h1 className="visit-estimate-page__title">방문 견적 요청</h1>
          <p className="visit-estimate-page__lead">
            여러 업체를 검색·비교하는 대신, <strong>근처에서 활동 중인 오야지</strong>에게 방문 견적을 요청해 보세요. 가격
            공개 입찰이 아닙니다.
          </p>
        </div>
      </header>

      <section className="visit-estimate-page__card" aria-labelledby="ve-form-title">
        <h2 id="ve-form-title" className="visit-estimate-page__card-title">
          요청 내용
        </h2>

        <div className="visit-estimate-page__field">
          <span className="visit-estimate-page__label">작업 종류</span>
          <div className="visit-estimate-page__pills">
            {CRAFT_OPTIONS.map((key) => (
              <button
                key={key}
                type="button"
                className={`visit-estimate-page__pill${craft === key ? " is-active" : ""}`}
                onClick={() => setCraft(key)}
              >
                {CRAFT_LABEL[key] || key}
              </button>
            ))}
          </div>
        </div>

        <label className="visit-estimate-page__field">
          <span className="visit-estimate-page__label">지역</span>
          <input className="visit-estimate-page__input" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="예: 대전 서구 둔산동" />
          <span className="visit-estimate-page__hint">동·구 단위까지면 충분해요. 상세주소는 방문 확정 후 나눠요.</span>
        </label>

        <label className="visit-estimate-page__field">
          <span className="visit-estimate-page__label">평수(대략)</span>
          <input
            className="visit-estimate-page__input"
            inputMode="numeric"
            value={areaPyng}
            onChange={(e) => setAreaPyng(e.target.value.replace(/[^\d]/g, "").slice(0, 4))}
            placeholder="예: 24"
          />
          <span className="visit-estimate-page__hint">숫자만 입력해도 돼요. (예: 24 → 24평 근처로 안내)</span>
        </label>

        <div className="visit-estimate-page__field">
          <span className="visit-estimate-page__label">참고 사진 (mock)</span>
          <div className="visit-estimate-page__thumbs" role="list">
            {photos.map((src, i) => (
              <div key={i} className="visit-estimate-page__thumb" role="listitem">
                <img src={src} alt="" />
              </div>
            ))}
          </div>
          <span className="visit-estimate-page__hint">실서비스 연결 전까지는 예시 이미지로 대체합니다.</span>
        </div>

        <div className="visit-estimate-page__field">
          <span className="visit-estimate-page__label">방문 가능 시간</span>
          <div className="visit-estimate-page__pills visit-estimate-page__pills--wrap">
            {VISIT_SLOT_OPTIONS.map((o) => (
              <button
                key={o.id}
                type="button"
                className={`visit-estimate-page__pill${visitSlots.has(o.id) ? " is-active" : ""}`}
                onClick={() => toggleSlot(o.id)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <label className="visit-estimate-page__field">
          <span className="visit-estimate-page__label">요청 메모</span>
          <textarea className="visit-estimate-page__textarea" value={memo} onChange={(e) => setMemo(e.target.value)} rows={4} placeholder="원하시는 톤·일정·우려 사항을 적어 주세요." />
        </label>

        <button type="button" className="visit-estimate-page__submit" disabled={!canSubmit} onClick={handleSubmit}>
          근처 오야지에게 요청
        </button>
      </section>

      {submitted ? (
        <section id="visit-estimate-matches" className="visit-estimate-page__card visit-estimate-page__card--matches" aria-labelledby="ve-matches-title">
          <h2 id="ve-matches-title" className="visit-estimate-page__card-title">
            근처에서 응답 가능한 오야지 (mock · 약 5~10km)
          </h2>
          <p className="visit-estimate-page__policy">
            다른 업체의 견적 금액은 보여주지 않아요. <strong>방문 가능 여부 · 예상 일정 · 짧은 코멘트</strong>만 확인하고
            연결할 분을 고르시면 됩니다.
          </p>
          <ul className="visit-estimate-page__match-list">
            {matches.map((m) => (
              <li key={m.id} className="visit-estimate-page__match">
                <div className="visit-estimate-page__match-head">
                  <div>
                    <strong className="visit-estimate-page__match-name">{m.name}</strong>
                    <span className="visit-estimate-page__match-craft">{m.craftLabel}</span>
                  </div>
                  <span className="visit-estimate-page__match-dist">{formatDistanceKm(m.distanceKm)}</span>
                </div>
                <p className="visit-estimate-page__match-line">
                  <span className="visit-estimate-page__k">최근 활동</span>
                  {m.recentActivity}
                </p>
                <p className="visit-estimate-page__match-line">
                  <span className="visit-estimate-page__k">현장 평판</span>
                  {m.reputation}
                </p>
                <div className="visit-estimate-page__match-grid">
                  <div>
                    <span className="visit-estimate-page__k">방문 가능</span>
                    <p>{m.visitAvailable}</p>
                  </div>
                  <div>
                    <span className="visit-estimate-page__k">예상 일정</span>
                    <p>{m.expectedSchedule}</p>
                  </div>
                </div>
                <p className="visit-estimate-page__match-comment">{m.comment}</p>
                <button type="button" className="visit-estimate-page__match-btn" onClick={() => navigate("/chat")}>
                  연결 요청 (채팅 MVP)
                </button>
              </li>
            ))}
          </ul>
          <p className="visit-estimate-page__foot">실제 매칭·알림은 API 연동 후 이어집니다. 지금은 흐름 체험용입니다.</p>
        </section>
      ) : null}
    </div>
  );
}
