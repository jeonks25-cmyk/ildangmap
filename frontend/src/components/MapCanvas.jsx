import React from "react";

/**
 * Kakao 지도 컨테이너. forwardRef 대신 containerRef로 연결 (순수 JS).
 */
export default function MapCanvas({ containerRef, className = "map-container", ...rest }) {
  return <div ref={containerRef} className={className} {...rest} />;
}
