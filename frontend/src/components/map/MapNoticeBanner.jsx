import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MAP_NOTICE_INTERVAL_MS, MAP_NOTICE_SLIDES } from "../../constants/mapNoticeSlides";
import "./map-notice-banner.css";

export default function MapNoticeBanner({ slides = MAP_NOTICE_SLIDES, intervalMs = MAP_NOTICE_INTERVAL_MS }) {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (slides.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setIndex((prev) => (prev + 1) % slides.length);
        setVisible(true);
      }, 220);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs, slides.length]);

  const slide = slides[index] || slides[0];
  if (!slide) return null;

  const handleClick = () => {
    if (slide.path) navigate(slide.path);
  };

  return (
    <button
      type="button"
      className={`map-notice-banner${slide.path ? " map-notice-banner--link" : ""}${visible ? " is-visible" : ""}`}
      onClick={handleClick}
      aria-live="polite"
      aria-label={slide.text}
    >
      <span className="map-notice-banner__text">{slide.text}</span>
    </button>
  );
}
