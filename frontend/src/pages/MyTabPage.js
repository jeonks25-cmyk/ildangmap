import React, { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  PREF_CRAFT_OPTIONS,
  PREF_TRADE_OPTIONS,
  REGION_OPTIONS,
  useUserMapPreferences,
} from "../context/UserMapPreferencesContext";

export default function MyTabPage() {
  const { prefs, setPrefs } = useUserMapPreferences();
  const location = useLocation();
  const mapPrefsRef = useRef(null);

  useEffect(() => {
    if (location.hash !== "#map-prefs") return;
    const t = window.setTimeout(() => {
      mapPrefsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(t);
  }, [location.hash, location.pathname]);

  return (
    <div className="my-tab-page">
      <header className="my-tab-page__hero">
        <h1 className="my-tab-page__title">내 정보</h1>
        <p className="my-tab-page__lead">프로필·내 공고·설정이 이곳에 모입니다. (준비 중)</p>
      </header>

      <section id="map-prefs" ref={mapPrefsRef} className="my-tab-page__card" aria-labelledby="map-prefs-heading">
        <h2 id="map-prefs-heading" className="my-tab-page__card-title">
          지도 맞춤
        </h2>
        <p className="my-tab-page__card-desc">홈 지도에 보이는 지역·직군·공정은 여기서만 바꿀 수 있어요.</p>

        <div className="my-tab-page__field">
          <div className="my-tab-page__label">지역</div>
          <div className="my-tab-page__chips" role="group" aria-label="지역 선택">
            {REGION_OPTIONS.map((r) => (
              <button
                key={r}
                type="button"
                className={`daangn-chip${prefs.regionLabel === r ? " daangn-chip--active" : ""}`}
                onClick={() => setPrefs({ regionLabel: r })}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="my-tab-page__field">
          <div className="my-tab-page__label">직군</div>
          <div className="my-tab-page__chips" role="group" aria-label="직군 선택">
            {PREF_TRADE_OPTIONS.map((t) => (
              <button
                key={t}
                type="button"
                className={`daangn-chip${prefs.trade === t ? " daangn-chip--active" : ""}`}
                onClick={() => setPrefs({ trade: t })}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="my-tab-page__field">
          <div className="my-tab-page__label">공정</div>
          <div className="my-tab-page__chips" role="group" aria-label="공정 선택">
            {PREF_CRAFT_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                type="button"
                className={`daangn-chip${prefs.craft === opt.value ? " daangn-chip--active" : ""}`}
                onClick={() => setPrefs({ craft: opt.value })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
