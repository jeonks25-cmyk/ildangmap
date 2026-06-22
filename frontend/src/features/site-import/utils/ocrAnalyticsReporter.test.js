import { createOcrApplySnapshot, reportOcrUserEdit } from "./ocrAnalyticsReporter";

jest.mock("../../../api/siteMemoryApi", () => ({
  reportSiteMemoryEvent: jest.fn(),
}));

const { reportSiteMemoryEvent } = require("../../../api/siteMemoryApi");

describe("ocrAnalyticsReporter", () => {
  beforeEach(() => {
    reportSiteMemoryEvent.mockClear();
  });

  it("reports title correction on user edit", () => {
    const snap = createOcrApplySnapshot({
      ocrSource: "gemini-vision",
      title: "장재열 1109동 1402호",
      apartmentName: "장재열",
      building: "1109",
      unit: "1402",
      confidence: 0.9,
    });
    reportOcrUserEdit(snap, { title: "장재계룡 1109동 1402호" });
    expect(reportSiteMemoryEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "ocr_edit",
        userEditedTitle: true,
        ocrTitleOriginal: "장재열 1109동 1402호",
        ocrTitleCorrected: "장재계룡 1109동 1402호",
      })
    );
  });
});
