import {
  extractExplicitWorkTimes,
  isKakaoSendTimeLine,
  isExplicitWorkTimeLine,
} from "./workTimeExtractor";

describe("workTimeExtractor", () => {
  test("카카오 전송 시각 무시", () => {
    const cases = ["오후 12:51", "오후 5:51", "오전 7:30", "12:51"];
    cases.forEach((line) => {
      const result = extractExplicitWorkTimes(line);
      expect(result.extracted).toBe(false);
      expect(isKakaoSendTimeLine(line)).toBe(true);
    });
  });

  test("명시적 작업 시간 범위 추출", () => {
    const result = extractExplicitWorkTimes("내일 현장 08:00~17:00 작업");
    expect(result.extracted).toBe(true);
    expect(result.startTime).toBe("08:00");
    expect(result.endTime).toBe("17:00");
  });

  test("7시반 집결", () => {
    const result = extractExplicitWorkTimes("7시반 집결");
    expect(result.extracted).toBe(true);
    expect(result.startTime).toBe("07:30");
  });

  test("09:00 시작", () => {
    const result = extractExplicitWorkTimes("09:00 시작");
    expect(result.extracted).toBe(true);
    expect(result.startTime).toBe("09:00");
  });

  test("카톡 본문 + 전송시각 혼재 — 전송시각만 무시", () => {
    const blob = `장재계룡계룡1109동1402호
오후 12:51
08:00~17:00 작업`;
    const result = extractExplicitWorkTimes(blob);
    expect(result.startTime).toBe("08:00");
    expect(result.endTime).toBe("17:00");
    expect(result.candidates.some((c) => c.label === "kakao_send_time")).toBe(true);
  });
});
