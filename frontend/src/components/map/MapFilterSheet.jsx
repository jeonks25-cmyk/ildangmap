import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

function FilterGroup({ title, options, selectedValue, onSelect }) {
  return (
    <section className="map-filter-sheet__group">
      <h3 className="map-filter-sheet__group-title">{title}</h3>
      <div className="map-filter-sheet__chips" role="list">
        {options.map((option) => (
          <button
            key={String(option.label)}
            type="button"
            role="listitem"
            className={`map-filter-sheet__chip${selectedValue === option.key ? " is-active" : ""}`}
            onClick={() => onSelect?.(option.key)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
}

export default function MapFilterSheet({
  open,
  craftOptions = [],
  tradeOptions = [],
  workOptions = [],
  distanceOptions = [],
  selectedCraft,
  selectedTrade,
  selectedWork,
  selectedDistance,
  onSelectCraft,
  onSelectTrade,
  onSelectWork,
  onSelectDistance,
  onReset,
  onClose,
}) {
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    if (!open || typeof document === "undefined") return undefined;
    const prevOverflow = document.body.style.overflow;
    const prevTouch = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouch;
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  const node = (
    <div className="map-filter-sheet-portal">
      <div className="map-filter-sheet-backdrop" role="presentation" onClick={onClose}>
        <div
          className="map-filter-sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby="map-filter-sheet-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="map-filter-sheet__grab" aria-hidden="true" />
          <div className="map-filter-sheet__head">
            <div>
              <div className="map-filter-sheet__eyebrow">상세 필터</div>
              <h2 id="map-filter-sheet-title" className="map-filter-sheet__title">
                빠르게 조건 고르기
              </h2>
              <p className="map-filter-sheet__sub">메인 화면은 가볍게 두고, 필요한 조건만 여기서 선택합니다.</p>
            </div>
            <button type="button" className="map-filter-sheet__close" onClick={onClose} aria-label="필터 닫기">
              ✕
            </button>
          </div>

          <div className="map-filter-sheet__body">
            <FilterGroup title="거리" options={distanceOptions} selectedValue={selectedDistance} onSelect={onSelectDistance} />

            <button
              type="button"
              className="map-filter-sheet__detail-toggle"
              onClick={() => setShowDetail((prev) => !prev)}
              aria-expanded={showDetail}
            >
              상세 조건 (공정 · 직군 · 작업유형)
              <span aria-hidden="true">{showDetail ? "▲" : "▼"}</span>
            </button>

            {showDetail ? (
              <>
                <FilterGroup title="공정" options={craftOptions} selectedValue={selectedCraft} onSelect={onSelectCraft} />
                <FilterGroup title="직군" options={tradeOptions} selectedValue={selectedTrade} onSelect={onSelectTrade} />
                <FilterGroup title="근무형태" options={workOptions} selectedValue={selectedWork} onSelect={onSelectWork} />
              </>
            ) : null}
          </div>

          <div className="map-filter-sheet__foot">
            <button type="button" className="map-filter-sheet__secondary" onClick={onReset}>
              전체 초기화
            </button>
            <button type="button" className="map-filter-sheet__primary" onClick={onClose}>
              적용 완료
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
