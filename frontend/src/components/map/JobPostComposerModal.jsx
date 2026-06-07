import React, { useEffect, useMemo, useRef, useState } from "react";
import { CRAFT_LABEL } from "../../utils/jobModel";
import { TRADE_KEYS } from "../../utils/jobTrade";
import {
  OCR_TARGET_FIELDS,
  applyAddressSelectionToDraft,
  createInitialJobPostDraft,
} from "../../utils/jobPostDraft";

const CRAFT_OPTIONS = [
  { key: "film", label: "필름", emoji: "🪟" },
  { key: "wallpaper", label: "도배", emoji: "🧻" },
  { key: "tile", label: "타일", emoji: "🧱" },
  { key: "electric", label: "전기", emoji: "⚡" },
  { key: "paint", label: "페인트", emoji: "🖌" },
];

const MODE_META = {
  post: {
    title: "현장 등록",
    subtitle: "3초 등록: 공정, 직군, 금액, 주소만 고르세요",
    accent: "현장 요청",
  },
  urgent: {
    title: "긴급 도움",
    subtitle: "급한 현장 연결용으로 빠르게 올립니다",
    accent: "긴급 도움",
  },
  help: {
    title: "근처 헬프",
    subtitle: "짧은 도움 요청으로 주변 기사님께 바로 노출합니다",
    accent: "헬프 요청",
  },
};

const STEP_LABELS = ["공정", "직군", "금액", "주소", "완료"];
const HELP_TIME_PRESETS = ["13:00~15:00", "13:00~17:00", "14:00~18:00", "18:00~21:00"];

function formatManLabel(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return "?만";
  return `${Math.round(n / 10000)}만`;
}

function formatDateLabel(dateKey) {
  const d = new Date(dateKey);
  if (Number.isNaN(d.getTime())) return "오늘";
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function getPayPresets(mode) {
  if (mode === "help") return [90000, 110000, 130000, 150000];
  if (mode === "urgent") return [140000, 160000, 180000, 200000];
  return [120000, 140000, 160000, 180000];
}

function normalizeAddressOptions(options) {
  const list = Array.isArray(options) ? options : [];
  const seen = new Set();
  return list.filter((item) => {
    const key = `${item?.fullAddress || ""}__${item?.shortRegion || ""}`;
    if (!key.trim() || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function JobPostComposerModal({
  open,
  mode = "post",
  onClose,
  onSubmit,
  addressOptions = [],
  mapCenterOption = null,
  selectedDateKey,
}) {
  const meta = MODE_META[mode] || MODE_META.post;
  const closeTimerRef = useRef(null);
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState(() => createInitialJobPostDraft({ mode, selectedDateKey }));
  const [submitting, setSubmitting] = useState(false);
  const [createdTitle, setCreatedTitle] = useState("");

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setDraft(createInitialJobPostDraft({ mode, selectedDateKey }));
    setSubmitting(false);
    setCreatedTitle("");
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, [open, mode, selectedDateKey]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  const options = useMemo(() => {
    const base = normalizeAddressOptions(addressOptions);
    return mapCenterOption ? [mapCenterOption, ...base] : base;
  }, [addressOptions, mapCenterOption]);

  const filteredOptions = useMemo(() => {
    const q = draft.location.query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((item) => {
      const blob = `${item?.label || ""} ${item?.fullAddress || ""} ${item?.shortRegion || ""}`.toLowerCase();
      return blob.includes(q);
    });
  }, [draft.location.query, options]);

  const summaryItems = useMemo(
    () =>
      [
        draft.craft ? CRAFT_LABEL[draft.craft] || draft.craft : "",
        draft.trade,
        draft.payAmount ? formatManLabel(draft.payAmount) : "",
        draft.location.shortRegion || "",
      ].filter(Boolean),
    [draft]
  );

  const submitAddress = async (address) => {
    if (!address || submitting) return;
    const nextDraft = applyAddressSelectionToDraft(draft, address);
    setDraft(nextDraft);
    setSubmitting(true);
    try {
      const created = await Promise.resolve(onSubmit?.({ draft: nextDraft }));
      setCreatedTitle(created?.title || `${CRAFT_LABEL[nextDraft.craft] || "현장"} ${nextDraft.trade}`);
      setStep(5);
      closeTimerRef.current = window.setTimeout(() => {
        onClose?.();
      }, 950);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const payPresets = getPayPresets(mode);

  const submitHelpRequest = async () => {
    if (submitting) return;
    if (!draft.location.shortRegion || !draft.location.fullAddress) return;
    setSubmitting(true);
    try {
      const created = await Promise.resolve(onSubmit?.({ draft }));
      setCreatedTitle(created?.title || `${CRAFT_LABEL[draft.craft] || "현장"} ${draft.trade}`);
      setStep(5);
      closeTimerRef.current = window.setTimeout(() => {
        onClose?.();
      }, 950);
    } finally {
      setSubmitting(false);
    }
  };

  const renderPreparationFields = () => (
    <div className="job-post-composer__prep-card" aria-label="현장 준비 정보 입력">
      <div className="job-post-composer__prep-head">
        <strong className="job-post-composer__prep-title">현장 준비 정보</strong>
        <span className="job-post-composer__prep-sub">카톡 캡처 OCR 연결을 고려한 구조로 미리 입력합니다.</span>
      </div>
      <div className="job-post-composer__prep-grid">
        <label className="job-post-composer__field">
          <span className="job-post-composer__field-label">주차</span>
          <input
            className="job-post-composer__search-input"
            value={draft.details.parkingNote}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, details: { ...prev.details, parkingNote: e.target.value } }))
            }
            placeholder="예: 지하 2층 가능"
          />
        </label>
        <label className="job-post-composer__field">
          <span className="job-post-composer__field-label">비밀번호</span>
          <input
            className="job-post-composer__search-input"
            value={draft.details.accessPassword}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, details: { ...prev.details, accessPassword: e.target.value } }))
            }
            placeholder="예: 1234#"
          />
        </label>
        <label className="job-post-composer__field">
          <span className="job-post-composer__field-label">준비물</span>
          <input
            className="job-post-composer__search-input"
            value={draft.details.requiredItems}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, details: { ...prev.details, requiredItems: e.target.value } }))
            }
            placeholder="예: 사다리 필요"
          />
        </label>
        <label className="job-post-composer__field">
          <span className="job-post-composer__field-label">식사</span>
          <input
            className="job-post-composer__search-input"
            value={draft.details.mealNote}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, details: { ...prev.details, mealNote: e.target.value } }))
            }
            placeholder="예: 점심 제공"
          />
        </label>
        <label className="job-post-composer__field">
          <span className="job-post-composer__field-label">특이사항</span>
          <input
            className="job-post-composer__search-input"
            value={draft.details.specialNote}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, details: { ...prev.details, specialNote: e.target.value } }))
            }
            placeholder="예: 엘리베이터 사용 제한"
          />
        </label>
        <label className="job-post-composer__field">
          <span className="job-post-composer__field-label">자재</span>
          <input
            className="job-post-composer__search-input"
            value={draft.details.materialNote}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, details: { ...prev.details, materialNote: e.target.value } }))
            }
            placeholder="예: LX 베니프 화이트 사용"
          />
        </label>
      </div>
    </div>
  );

  if (mode === "help") {
    return (
      <div className="job-post-composer-backdrop" role="presentation" onClick={() => onClose?.()}>
        <div
          className="job-post-composer"
          role="dialog"
          aria-modal="true"
          aria-labelledby="job-post-composer-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="job-post-composer__grab" aria-hidden="true" />
          <div className="job-post-composer__head">
            <div className="job-post-composer__head-copy">
              <div className="job-post-composer__eyebrow">긴급헬프 요청</div>
              <h2 id="job-post-composer-title" className="job-post-composer__title">
                긴급헬프 등록
              </h2>
              <p className="job-post-composer__sub">지역, 공정, 직군, 필요시간, 금액, 설명만 넣으면 바로 지도에 올립니다.</p>
            </div>
            <button type="button" className="job-post-composer__close" onClick={() => onClose?.()} aria-label="닫기">
              ✕
            </button>
          </div>

          <div className="job-post-composer__body">
            {step === 5 ? (
              <section className="job-post-composer__done" aria-live="polite">
                <div className="job-post-composer__done-badge" aria-hidden="true">
                  ✓
                </div>
                <h3 className="job-post-composer__done-title">긴급헬프 요청을 올렸습니다</h3>
                <p className="job-post-composer__done-sub">{createdTitle || `${CRAFT_LABEL[draft.craft] || "현장"} ${draft.trade}`}</p>
                <p className="job-post-composer__done-note">근처 기술자 지도에 우선 노출됩니다.</p>
              </section>
            ) : (
              <section className="job-post-composer__panel" aria-labelledby="job-post-help-form">
                <h3 id="job-post-help-form" className="job-post-composer__panel-title">
                  지금 바로 필요한 인력을 등록하세요
                </h3>
                <p className="job-post-composer__panel-sub">현장 도중 사람 부족할 때 쓰는 짧은 호출 폼입니다.</p>

                <label className="job-post-composer__field">
                  <span className="job-post-composer__field-label">지역</span>
                  <input
                    className="job-post-composer__search-input"
                    value={draft.location.query}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        location: { ...prev.location, query: e.target.value },
                      }))
                    }
                    placeholder="예: 탄방동, 상가"
                    aria-label="지역 검색"
                  />
                </label>
                <div className="job-post-composer__address-list" role="list">
                  {filteredOptions.map((item) => {
                    const selected =
                      draft.location.fullAddress === item.fullAddress && draft.location.shortRegion === item.shortRegion;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="listitem"
                        className={`job-post-composer__address-btn${item.isMapCenter ? " is-map-center" : ""}${
                          selected ? " is-selected" : ""
                        }`}
                        onClick={() => setDraft((prev) => applyAddressSelectionToDraft(prev, item))}
                        disabled={submitting}
                      >
                        <span className="job-post-composer__address-main">{item.label || item.shortRegion || "지도 위치"}</span>
                        <span className="job-post-composer__address-sub">{item.fullAddress || item.shortRegion || ""}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="job-post-composer__field">
                  <span className="job-post-composer__field-label">공정</span>
                  <div className="job-post-composer__choice-grid">
                    {CRAFT_OPTIONS.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        className={`job-post-composer__choice-btn${draft.craft === item.key ? " is-selected" : ""}`}
                        onClick={() => setDraft((prev) => ({ ...prev, craft: item.key }))}
                      >
                        <span className="job-post-composer__choice-emoji" aria-hidden="true">
                          {item.emoji}
                        </span>
                        <span className="job-post-composer__choice-label">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="job-post-composer__field">
                  <span className="job-post-composer__field-label">직군</span>
                  <div className="job-post-composer__choice-grid">
                    {TRADE_KEYS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={`job-post-composer__choice-btn${draft.trade === item ? " is-selected" : ""}`}
                        onClick={() => setDraft((prev) => ({ ...prev, trade: item }))}
                      >
                        <span className="job-post-composer__choice-label">{item}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="job-post-composer__field">
                  <span className="job-post-composer__field-label">필요시간</span>
                  <div className="job-post-composer__choice-grid">
                    {HELP_TIME_PRESETS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={`job-post-composer__choice-btn${draft.workTime === item ? " is-selected" : ""}`}
                        onClick={() => setDraft((prev) => ({ ...prev, workTime: item }))}
                      >
                        <span className="job-post-composer__choice-label">{item}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="job-post-composer__field">
                  <span className="job-post-composer__field-label">금액</span>
                  <div className="job-post-composer__choice-grid job-post-composer__choice-grid--pay">
                    {payPresets.map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        className={`job-post-composer__choice-btn${draft.payAmount === amount ? " is-selected" : ""}`}
                        onClick={() => setDraft((prev) => ({ ...prev, payAmount: amount }))}
                      >
                        <span className="job-post-composer__choice-label">{formatManLabel(amount)}</span>
                      </button>
                    ))}
                  </div>
                  <div className="job-post-composer__pay-input-row">
                    <input
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="job-post-composer__pay-input"
                      value={String(draft.payAmount)}
                      onChange={(e) => {
                        const next = Number(String(e.target.value).replace(/[^0-9]/g, ""));
                        setDraft((prev) => ({ ...prev, payAmount: Number.isFinite(next) && next > 0 ? next : 0 }));
                      }}
                      placeholder="80000"
                      aria-label="긴급헬프 금액 입력"
                    />
                  </div>
                </div>

                <label className="job-post-composer__field">
                  <span className="job-post-composer__field-label">간단 설명</span>
                  <textarea
                    className="job-post-composer__search-input job-post-composer__search-input--textarea"
                    value={draft.details.description}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        details: { ...prev.details, description: e.target.value },
                      }))
                    }
                    placeholder="예: 2~3시간 보조 가능하신분"
                    rows={3}
                    aria-label="긴급헬프 설명"
                  />
                </label>

                {renderPreparationFields()}

                <button
                  type="button"
                  className="job-post-composer__submit-help"
                  disabled={
                    submitting ||
                    !draft.location.shortRegion ||
                    !draft.location.fullAddress ||
                    !draft.payAmount ||
                    !draft.details.description.trim()
                  }
                  onClick={submitHelpRequest}
                >
                  긴급헬프 바로 올리기
                </button>
              </section>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="job-post-composer-backdrop" role="presentation" onClick={() => onClose?.()}>
      <div
        className="job-post-composer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="job-post-composer-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="job-post-composer__grab" aria-hidden="true" />
        <div className="job-post-composer__head">
          <div className="job-post-composer__head-copy">
            <div className="job-post-composer__eyebrow">{meta.accent}</div>
            <h2 id="job-post-composer-title" className="job-post-composer__title">
              {meta.title}
            </h2>
            <p className="job-post-composer__sub">{meta.subtitle}</p>
          </div>
          <button type="button" className="job-post-composer__close" onClick={() => onClose?.()} aria-label="닫기">
            ✕
          </button>
        </div>

        <div className="job-post-composer__ocr-card" aria-label="향후 OCR 자동입력 구조">
          <div className="job-post-composer__ocr-copy">
            <strong className="job-post-composer__ocr-title">카톡/문자 캡처 자동입력 준비</strong>
            <p className="job-post-composer__ocr-sub">
              추후 OCR 연결 시 이 등록 draft에 주소, 날짜, 시간, 금액, 작업내용, 비밀번호, 연락처를 자동 채웁니다.
            </p>
          </div>
          <button type="button" className="job-post-composer__ocr-btn" disabled aria-disabled="true">
            캡처 업로드 예정
          </button>
          <div className="job-post-composer__ocr-fields">
            {OCR_TARGET_FIELDS.map((field) => (
              <span key={field.key} className="job-post-composer__ocr-field">
                {field.label}
              </span>
            ))}
          </div>
        </div>

        {renderPreparationFields()}

        <div className="job-post-composer__steps" aria-label="등록 단계">
          {STEP_LABELS.map((label, index) => {
            const stepNum = index + 1;
            const active = stepNum === step;
            const done = stepNum < step;
            return (
              <div
                key={label}
                className={`job-post-composer__step-pill${active ? " is-active" : ""}${done ? " is-done" : ""}`}
              >
                <span className="job-post-composer__step-num">{stepNum}</span>
                <span className="job-post-composer__step-label">{label}</span>
              </div>
            );
          })}
        </div>

        {step < 5 && summaryItems.length ? (
          <div className="job-post-composer__summary" aria-label="현재 선택값">
            {summaryItems.map((item) => (
              <span key={item} className="job-post-composer__summary-pill">
                {item}
              </span>
            ))}
          </div>
        ) : null}

        <div className="job-post-composer__body">
          {step === 1 ? (
            <section className="job-post-composer__panel" aria-labelledby="job-post-craft-label">
              <h3 id="job-post-craft-label" className="job-post-composer__panel-title">
                어떤 공정인가요?
              </h3>
              <p className="job-post-composer__panel-sub">가장 많이 쓰는 공정만 크게 넣었습니다.</p>
              <div className="job-post-composer__choice-grid">
                {CRAFT_OPTIONS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`job-post-composer__choice-btn${draft.craft === item.key ? " is-selected" : ""}`}
                    onClick={() => {
                      setDraft((prev) => ({ ...prev, craft: item.key }));
                      setStep(2);
                    }}
                  >
                    <span className="job-post-composer__choice-emoji" aria-hidden="true">
                      {item.emoji}
                    </span>
                    <span className="job-post-composer__choice-label">{item.label}</span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {step === 2 ? (
            <section className="job-post-composer__panel" aria-labelledby="job-post-trade-label">
              <h3 id="job-post-trade-label" className="job-post-composer__panel-title">
                누구를 구하시나요?
              </h3>
              <p className="job-post-composer__panel-sub">큰 버튼으로 한 번만 누르면 됩니다.</p>
              <div className="job-post-composer__choice-grid">
                {TRADE_KEYS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`job-post-composer__choice-btn${draft.trade === item ? " is-selected" : ""}`}
                    onClick={() => {
                      setDraft((prev) => ({ ...prev, trade: item }));
                      setStep(3);
                    }}
                  >
                    <span className="job-post-composer__choice-label">{item}</span>
                  </button>
                ))}
              </div>
              <button type="button" className="job-post-composer__back" onClick={() => setStep(1)}>
                이전 단계
              </button>
            </section>
          ) : null}

          {step === 3 ? (
            <section className="job-post-composer__panel" aria-labelledby="job-post-pay-label">
              <h3 id="job-post-pay-label" className="job-post-composer__panel-title">
                얼마에 올릴까요?
              </h3>
              <p className="job-post-composer__panel-sub">OCR이 붙어도 금액은 여기에서 최종 확인만 하면 됩니다.</p>
              <div className="job-post-composer__pay-preview">[{formatManLabel(draft.payAmount)}]</div>
              <div className="job-post-composer__choice-grid job-post-composer__choice-grid--pay">
                {payPresets.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    className={`job-post-composer__choice-btn${draft.payAmount === amount ? " is-selected" : ""}`}
                    onClick={() => {
                      setDraft((prev) => ({ ...prev, payAmount: amount }));
                      setStep(4);
                    }}
                  >
                    <span className="job-post-composer__choice-label">{formatManLabel(amount)}</span>
                  </button>
                ))}
              </div>
              <label className="job-post-composer__field">
                <span className="job-post-composer__field-label">직접 입력</span>
                <div className="job-post-composer__pay-input-row">
                  <input
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="job-post-composer__pay-input"
                    value={String(draft.payAmount)}
                    onChange={(e) => {
                      const next = Number(String(e.target.value).replace(/[^0-9]/g, ""));
                      setDraft((prev) => ({ ...prev, payAmount: Number.isFinite(next) && next > 0 ? next : 0 }));
                    }}
                    placeholder="140000"
                    aria-label="금액 직접 입력"
                  />
                  <button
                    type="button"
                    className="job-post-composer__field-next"
                    disabled={!Number.isFinite(draft.payAmount) || draft.payAmount <= 0}
                    onClick={() => setStep(4)}
                  >
                    다음
                  </button>
                </div>
              </label>
              <button type="button" className="job-post-composer__back" onClick={() => setStep(2)}>
                이전 단계
              </button>
            </section>
          ) : null}

          {step === 4 ? (
            <section className="job-post-composer__panel" aria-labelledby="job-post-address-label">
              <h3 id="job-post-address-label" className="job-post-composer__panel-title">
                어디 현장인가요?
              </h3>
              <p className="job-post-composer__panel-sub">
                주소를 찾거나 지도 중심으로 바로 등록하세요. 작업일은 {formatDateLabel(draft.workDate || selectedDateKey)}로 들어갑니다.
              </p>
              <label className="job-post-composer__field">
                <span className="job-post-composer__field-label">주소 검색</span>
                <input
                  className="job-post-composer__search-input"
                  value={draft.location.query}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      location: { ...prev.location, query: e.target.value },
                    }))
                  }
                  placeholder="예: 둔산동, 상가"
                  aria-label="주소 검색"
                />
              </label>

              <div className="job-post-composer__address-list" role="list">
                {filteredOptions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="listitem"
                    className={`job-post-composer__address-btn${item.isMapCenter ? " is-map-center" : ""}`}
                    onClick={() => submitAddress(item)}
                    disabled={submitting}
                  >
                    <span className="job-post-composer__address-main">{item.label || item.shortRegion || "지도 위치"}</span>
                    <span className="job-post-composer__address-sub">{item.fullAddress || item.shortRegion || ""}</span>
                  </button>
                ))}
                {filteredOptions.length === 0 ? (
                  <div className="job-post-composer__address-empty">검색 결과가 없어요. 지도 중심으로 바로 등록해보세요.</div>
                ) : null}
              </div>

              <button type="button" className="job-post-composer__back" onClick={() => setStep(3)} disabled={submitting}>
                이전 단계
              </button>
            </section>
          ) : null}

          {step === 5 ? (
            <section className="job-post-composer__done" aria-live="polite">
              <div className="job-post-composer__done-badge" aria-hidden="true">
                ✓
              </div>
              <h3 className="job-post-composer__done-title">현장을 바로 올렸습니다</h3>
              <p className="job-post-composer__done-sub">
                {createdTitle || `${CRAFT_LABEL[draft.craft] || "현장"} ${draft.trade}`}
              </p>
              <p className="job-post-composer__done-note">지도 마커와 하단 현장 목록에 바로 반영됩니다.</p>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
