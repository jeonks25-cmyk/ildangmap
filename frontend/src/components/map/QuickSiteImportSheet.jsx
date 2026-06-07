import React, { useEffect, useMemo, useRef, useState } from "react";
import { MAP_ITEM_TYPE, MAP_ITEM_TYPE_LABEL } from "../../constants/mapItemTypes";
import { createJobDraftFromPastedText, normalizeMapItemDraft } from "../../utils/mapItemDraft";
import { CRAFT_KEYS, CRAFT_LABEL } from "../../utils/jobModel";
import { createInitialJobPostDraft } from "../../utils/jobPostDraft";
import {
  computeDurationDays,
  joinWorkTimeParts,
  parseWorkTimeParts,
  suggestSiteNamesFromAddress,
} from "../../utils/fieldSiteScheduleParser";
import { searchKakaoPlaces } from "../../utils/mapPlaceSearch";

function defaultTextForType(type) {
  if (type === MAP_ITEM_TYPE.FIELD) {
    return "카카오톡·문자·밴드 내용을 붙이거나 사진(OCR)으로 일정 초안을 만듭니다. 모든 항목은 수정할 수 있습니다.";
  }
  return "짧은 한 줄로도 충분합니다.";
}

function toDateKey(raw) {
  const text = String(raw || "").trim();
  const m = text.match(/(20\d{2})[.\-/년\s]+(\d{1,2})[.\-/월\s]+(\d{1,2})/);
  if (!m) return "";
  return `${m[1]}-${String(m[2]).padStart(2, "0")}-${String(m[3]).padStart(2, "0")}`;
}

function normalizeFieldDraft(draft, patch = {}) {
  if (!draft) return null;
  const next = {
    ...draft,
    location: { ...(draft.location || {}) },
    details: { ...(draft.details || {}) },
  };
  if (patch.workDate) next.workDate = patch.workDate;
  if (patch.workDateEnd) next.workDateEnd = patch.workDateEnd;
  if (patch.workTime) next.workTime = patch.workTime;
  if (patch.crewCount !== undefined) next.details.crewCount = patch.crewCount;
  if (patch.payAmount !== undefined) next.payAmount = patch.payAmount;
  if (patch.requiredItems !== undefined) next.details.requiredItems = patch.requiredItems;
  if (patch.craft) next.craft = patch.craft;
  if (patch.title !== undefined) next.title = patch.title;
  if (patch.accessPassword !== undefined) next.details.accessPassword = patch.accessPassword;
  if (patch.location) {
    next.location = { ...next.location, ...patch.location };
  }
  if (next.workDate && !next.workDateEnd) next.workDateEnd = next.workDate;
  next.durationDays = computeDurationDays(next.workDate, next.workDateEnd);
  return next;
}

export default function QuickSiteImportSheet({
  open,
  type = MAP_ITEM_TYPE.FIELD,
  selectedDateKey,
  dateLabel,
  isOyaji = true,
  profileCraft = "film",
  defaultCrewCount = null,
  composeDefaultCraft = null,
  recentAddressOptions = [],
  kakao = null,
  resumeState = null,
  onClose,
  onSubmitField,
  onSubmitMapItem,
  onAdjustMapLocation,
  onPickAddress,
}) {
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [captureFileName, setCaptureFileName] = useState("");
  const [quickPatch, setQuickPatch] = useState({});
  const [showPasteInput, setShowPasteInput] = useState(true);
  const [addressQuery, setAddressQuery] = useState("");
  const [placeResults, setPlaceResults] = useState([]);
  const [placeLoading, setPlaceLoading] = useState(false);
  const titleTouchedRef = useRef(false);

  const isField = type === MAP_ITEM_TYPE.FIELD;
  const label = MAP_ITEM_TYPE_LABEL[type] || "현장 정보";
  const seedCraft = composeDefaultCraft || profileCraft;

  const seedText = useMemo(() => {
    const raw = text.trim();
    if (raw.length >= 4) return raw;
    return "";
  }, [text]);

  const baseFieldDraft = useMemo(
    () =>
      isField
        ? seedText
          ? createJobDraftFromPastedText({ text: seedText, selectedDateKey })
          : createInitialJobPostDraft({ selectedDateKey, defaultCraft: seedCraft })
        : null,
    [isField, seedCraft, seedText, selectedDateKey]
  );

  const fieldDraft = useMemo(() => normalizeFieldDraft(baseFieldDraft, quickPatch), [baseFieldDraft, quickPatch]);

  const siteNameSuggestions = useMemo(() => {
    const addr = fieldDraft?.location?.fullAddress || fieldDraft?.location?.shortRegion || "";
    return suggestSiteNamesFromAddress(addr, fieldDraft?.craft);
  }, [fieldDraft?.craft, fieldDraft?.location?.fullAddress, fieldDraft?.location?.shortRegion]);

  const timeParts = useMemo(() => parseWorkTimeParts(fieldDraft?.workTime), [fieldDraft?.workTime]);

  useEffect(() => {
    if (!open) return;
    titleTouchedRef.current = false;
    if (resumeState) {
      setText(resumeState.text || "");
      setTitle(resumeState.title || "");
      setCaptureFileName(resumeState.captureFileName || "");
      setShowPasteInput(!resumeState.captureFileName);
      if (resumeState.title) titleTouchedRef.current = true;
      const patch = { ...(resumeState.quickPatch || {}) };
      if (resumeState.locationPatch) patch.location = resumeState.locationPatch;
      setQuickPatch(patch);
      setAddressQuery(resumeState.locationPatch?.fullAddress || "");
      return;
    }
    setText("");
    setTitle("");
    setCaptureFileName("");
    const initialPatch = {};
    if (Number.isFinite(Number(defaultCrewCount)) && Number(defaultCrewCount) > 0) {
      initialPatch.crewCount = Number(defaultCrewCount);
    }
    if (composeDefaultCraft && CRAFT_KEYS.includes(composeDefaultCraft)) {
      initialPatch.craft = composeDefaultCraft;
    }
    setQuickPatch(initialPatch);
    setAddressQuery("");
    setPlaceResults([]);
    setShowPasteInput(true);
  }, [open, type, selectedDateKey, resumeState, defaultCrewCount, composeDefaultCraft]);

  useEffect(() => {
    if (!open || !isField || titleTouchedRef.current) return;
    const first = siteNameSuggestions[0];
    if (!first) return;
    setQuickPatch((prev) => (prev.title ? prev : { ...prev, title: first }));
  }, [isField, open, siteNameSuggestions]);

  useEffect(() => {
    if (!open || !kakao) return undefined;
    const q = addressQuery.trim();
    if (q.length < 2) {
      setPlaceResults([]);
      return undefined;
    }
    setPlaceLoading(true);
    const timer = window.setTimeout(() => {
      searchKakaoPlaces(kakao, q).then((rows) => {
        setPlaceResults(rows);
        setPlaceLoading(false);
      });
    }, 280);
    return () => window.clearTimeout(timer);
  }, [addressQuery, kakao, open]);

  const canSubmit = useMemo(() => {
    if (isField) {
      return Boolean(
        seedText ||
          captureFileName ||
          fieldDraft?.title ||
          fieldDraft?.location?.fullAddress ||
          fieldDraft?.workDate
      );
    }
    return title.trim().length >= 2 || text.trim().length >= 2;
  }, [captureFileName, fieldDraft, isField, seedText, text, title]);

  const handleEditField = (key, value) => {
    setQuickPatch((prev) => ({ ...prev, [key]: value }));
  };

  const applyAddress = (option) => {
    const fullAddress = option.fullAddress || option.address || option.label || "";
    const shortRegion = option.shortRegion || fullAddress.split(/\s+/).slice(0, 2).join(" ");
    const location = {
      fullAddress,
      shortRegion,
      lat: option.lat,
      lng: option.lng,
      siteKind: option.siteKind || (/아파트/.test(fullAddress) ? "아파트" : "현장"),
    };
    setAddressQuery(fullAddress);
    setPlaceResults([]);
    handleEditField("location", location);
    if (!titleTouchedRef.current) {
      const suggested = suggestSiteNamesFromAddress(fullAddress, fieldDraft?.craft || profileCraft)[0];
      if (suggested) handleEditField("title", suggested);
    }
    onPickAddress?.(location);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    if (isField) {
      const draft =
        normalizeFieldDraft(fieldDraft || createInitialJobPostDraft({ selectedDateKey, defaultCraft: seedCraft }), {
          title: fieldDraft?.title || siteNameSuggestions[0] || "",
        }) || createInitialJobPostDraft({ selectedDateKey, defaultCraft: seedCraft });
      await Promise.resolve(onSubmitField?.({ draft, source: text.trim() ? "paste" : "capture" }));
      onClose?.();
      return;
    }

    const item = normalizeMapItemDraft({
      type,
      title: title.trim() || text.trim().split(/\r?\n/)[0] || label,
      scheduleDate: selectedDateKey,
      meta: { text: text.trim(), sourceText: text.trim() },
      comments: text.trim() ? [{ text: text.trim(), author: "일당맵 사용자", createdAt: new Date().toISOString() }] : [],
      source: { kind: "schedule_paste" },
    });
    await Promise.resolve(onSubmitMapItem?.(item));
    onClose?.();
  };

  const handleAdjustLocation = () => {
    if (!fieldDraft) return;
    onAdjustMapLocation?.({
      text,
      title,
      captureFileName,
      quickPatch,
      draft: fieldDraft,
    });
  };

  if (!open) return null;

  const recentRows = (recentAddressOptions || []).slice(0, 5);
  const payLabel = "일당";
  const crewLabel = "인원";

  return (
    <div className="quick-site-import-sheet" role="presentation" onClick={() => onClose?.()}>
      <section
        className="quick-site-import-sheet__panel quick-site-import-sheet__panel--write"
        role="dialog"
        aria-modal="true"
        aria-label="현장 일정 만들기"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="quick-site-import-sheet__grab" aria-hidden="true" />
        <div className="quick-site-import-sheet__content">
          <header className="quick-site-import-sheet__head quick-site-import-sheet__head--compact">
            <div>
              <p className="quick-site-import-sheet__eyebrow">{dateLabel || selectedDateKey}</p>
              <h2 className="quick-site-import-sheet__title">{isField ? "현장 일정 만들기" : `${label} 기록하기`}</h2>
              {isField ? (
                <p className="quick-site-import-sheet__sub">카톡·문자·밴드 붙여넣기 / OCR → 자동 입력 → 수정 후 저장</p>
              ) : (
                <p className="quick-site-import-sheet__sub">{defaultTextForType(type)}</p>
              )}
            </div>
            <button type="button" className="quick-site-import-sheet__close" onClick={onClose} aria-label="닫기">
              ×
            </button>
          </header>

          {isField ? (
            <>
              <div className="quick-site-import-sheet__hero-actions" aria-label="카톡 내용 입력">
                <label className="quick-site-import-sheet__hero-action quick-site-import-sheet__hero-action--paste">
                  <span className="quick-site-import-sheet__hero-label">문자 붙여넣기</span>
                  <textarea
                    className="quick-site-import-sheet__hero-textarea"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="카톡·문자 내용 그대로 붙여넣기"
                    rows={showPasteInput ? 4 : 2}
                  />
                </label>
                <label className="quick-site-import-sheet__hero-action quick-site-import-sheet__hero-action--photo">
                  <span className="quick-site-import-sheet__hero-label">OCR 이미지</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="quick-site-import-sheet__hero-file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      setCaptureFileName(file?.name || "");
                      if (file) setShowPasteInput(false);
                    }}
                  />
                  <span className="quick-site-import-sheet__hero-photo-btn">
                    {captureFileName ? `${captureFileName} 선택됨` : "사진 선택하기"}
                  </span>
                </label>
              </div>

              <section className="quick-site-import-sheet__editable" aria-label="일정 초안 수정">
                <p className="quick-site-import-sheet__editable-title">자동 입력 초안</p>

                <label className="quick-site-import-sheet__editable-card quick-site-import-sheet__editable-card--address">
                  <span>주소</span>
                  <input
                    value={addressQuery || fieldDraft?.location?.fullAddress || ""}
                    placeholder="천안시 서북구 쌍용동 모란아파트 4동 1202호"
                    onChange={(e) => {
                      const raw = e.target.value;
                      setAddressQuery(raw);
                      handleEditField("location", {
                        fullAddress: raw,
                        shortRegion: raw.split(/\s+/).slice(0, 2).join(" "),
                      });
                    }}
                  />
                  {placeLoading ? <small className="quick-site-import-sheet__hint">주소 검색 중…</small> : null}
                  {placeResults.length ? (
                    <ul className="quick-site-import-sheet__suggest-list" role="listbox">
                      {placeResults.map((place) => (
                        <li key={place.id}>
                          <button type="button" onClick={() => applyAddress(place)}>
                            {place.title}
                            <small>{place.address}</small>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {recentRows.length ? (
                    <div className="quick-site-import-sheet__recent-chips">
                      {recentRows.map((row) => (
                        <button key={row.id} type="button" onClick={() => applyAddress(row)}>
                          {row.label || row.shortRegion}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </label>

                <label className="quick-site-import-sheet__editable-card">
                  <span>현장명</span>
                  <input
                    value={String(fieldDraft?.title || "")}
                    placeholder="모란아파트 필름"
                    onChange={(e) => {
                      titleTouchedRef.current = true;
                      handleEditField("title", e.target.value);
                    }}
                  />
                  {siteNameSuggestions.length ? (
                    <div className="quick-site-import-sheet__recent-chips">
                      {siteNameSuggestions.map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => {
                            titleTouchedRef.current = true;
                            handleEditField("title", name);
                          }}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </label>

                <div className="quick-site-import-sheet__row-2">
                  <label className="quick-site-import-sheet__editable-card">
                    <span>시작 날짜</span>
                    <input
                      type="date"
                      value={toDateKey(fieldDraft?.workDate) || selectedDateKey || ""}
                      onChange={(e) => {
                        const next = e.target.value;
                        handleEditField("workDate", next);
                        if (!fieldDraft?.workDateEnd || fieldDraft.workDateEnd < next) {
                          handleEditField("workDateEnd", next);
                        }
                      }}
                    />
                  </label>
                  <label className="quick-site-import-sheet__editable-card">
                    <span>종료 날짜</span>
                    <input
                      type="date"
                      value={toDateKey(fieldDraft?.workDateEnd || fieldDraft?.workDate) || selectedDateKey || ""}
                      onChange={(e) => handleEditField("workDateEnd", e.target.value)}
                    />
                  </label>
                </div>

                <div className="quick-site-import-sheet__row-2">
                  <label className="quick-site-import-sheet__editable-card">
                    <span>시작 시간</span>
                    <input
                      type="time"
                      value={timeParts.start}
                      onChange={(e) =>
                        handleEditField("workTime", joinWorkTimeParts(e.target.value, timeParts.end))
                      }
                    />
                  </label>
                  <label className="quick-site-import-sheet__editable-card">
                    <span>종료 시간</span>
                    <input
                      type="time"
                      value={timeParts.end}
                      onChange={(e) =>
                        handleEditField("workTime", joinWorkTimeParts(timeParts.start, e.target.value))
                      }
                    />
                  </label>
                </div>

                <label className="quick-site-import-sheet__editable-card">
                  <span>공정</span>
                  <select
                    value={fieldDraft?.craft || profileCraft || "film"}
                    onChange={(e) => {
                      handleEditField("craft", e.target.value);
                      if (!titleTouchedRef.current) {
                        const addr = fieldDraft?.location?.fullAddress || "";
                        const suggested = suggestSiteNamesFromAddress(addr, e.target.value)[0];
                        if (suggested) handleEditField("title", suggested);
                      }
                    }}
                  >
                    {CRAFT_KEYS.map((key) => (
                      <option key={key} value={key}>
                        {CRAFT_LABEL[key] || key}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="quick-site-import-sheet__row-2">
                  <label className="quick-site-import-sheet__editable-card">
                    <span>{crewLabel}</span>
                    <input
                      inputMode="numeric"
                      value={String(fieldDraft?.details?.crewCount || "")}
                      placeholder={isOyaji ? "4" : "1"}
                      onChange={(e) => {
                        const n = Number.parseInt(e.target.value.replace(/[^\d]/g, ""), 10);
                        handleEditField("crewCount", Number.isFinite(n) && n > 0 ? n : undefined);
                      }}
                    />
                  </label>
                  <label className="quick-site-import-sheet__editable-card">
                    <span>{payLabel}</span>
                    <input
                      inputMode="numeric"
                      value={String(fieldDraft?.payAmount || "")}
                      placeholder={isOyaji ? "150000" : "180000"}
                      onChange={(e) => {
                        const n = Number.parseInt(e.target.value.replace(/[^\d]/g, ""), 10);
                        handleEditField("payAmount", Number.isFinite(n) && n > 0 ? n : undefined);
                      }}
                    />
                  </label>
                </div>

                <label className="quick-site-import-sheet__editable-card">
                  <span>비번</span>
                  <input
                    value={String(fieldDraft?.details?.accessPassword || "")}
                    placeholder="7190"
                    onChange={(e) => handleEditField("accessPassword", e.target.value.replace(/[^\d#*]/g, ""))}
                  />
                </label>

                <label className="quick-site-import-sheet__editable-card">
                  <span>준비물</span>
                  <input
                    value={String(fieldDraft?.details?.requiredItems || "")}
                    placeholder="장갑, 줄자"
                    onChange={(e) => handleEditField("requiredItems", e.target.value)}
                  />
                </label>
              </section>

              {onAdjustMapLocation ? (
                <button
                  type="button"
                  className="quick-site-import-sheet__map-adjust"
                  onClick={handleAdjustLocation}
                  disabled={!canSubmit}
                >
                  지도에서 위치 수정
                </button>
              ) : null}
            </>
          ) : (
            <>
              <label className="quick-site-import-sheet__field">
                <span className="quick-site-import-sheet__label">제목</span>
                <input
                  className="quick-site-import-sheet__input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={`${label} 이름`}
                />
              </label>
              <label className="quick-site-import-sheet__field">
                <span className="quick-site-import-sheet__label">메모</span>
                <textarea
                  className="quick-site-import-sheet__textarea"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="예: 1층 화장실 깨끗함"
                  rows={6}
                />
              </label>
            </>
          )}
        </div>

        <div className="quick-site-import-sheet__sticky-cta">
          <button type="button" className="quick-site-import-sheet__submit" disabled={!canSubmit} onClick={handleSubmit}>
            {isField ? "저장 후 팀원 부르기" : `${label} 등록`}
          </button>
        </div>
      </section>
    </div>
  );
}
