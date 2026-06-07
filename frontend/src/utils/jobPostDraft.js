export const OCR_TARGET_FIELDS = [
  { key: "craft", label: "공정" },
  { key: "trade", label: "역할" },
  { key: "crewCount", label: "인원" },
  { key: "address", label: "주소" },
  { key: "workDate", label: "날짜" },
  { key: "workTime", label: "시간" },
  { key: "payAmount", label: "금액" },
  { key: "description", label: "작업내용" },
  { key: "parkingNote", label: "주차" },
  { key: "accessPassword", label: "비밀번호" },
  { key: "requiredItems", label: "준비물" },
  { key: "mealNote", label: "식사" },
  { key: "specialNote", label: "특이사항" },
  { key: "materialNote", label: "자재" },
  { key: "contactPhone", label: "연락처" },
];

function defaultPayByMode(mode) {
  if (mode === "help") return 90000;
  if (mode === "urgent") return 140000;
  return 120000;
}

function defaultTimeByMode(mode) {
  if (mode === "help") return "13:00~17:00";
  if (mode === "urgent") return "07:00~17:00";
  return "08:00~17:00";
}

function defaultPayTermsByMode(mode) {
  if (mode === "help" || mode === "urgent") return "당일지급";
  return "협의";
}

function emptyExtracted() {
  return {
    address: null,
    workDate: null,
    workTime: null,
    payAmount: null,
    description: null,
    parkingNote: null,
    accessPassword: null,
    requiredItems: null,
    mealNote: null,
    specialNote: null,
    materialNote: null,
    contactPhone: null,
    craft: null,
    trade: null,
    crewCount: null,
  };
}

function emptyFieldMeta() {
  return {
    address: { source: "manual", confidence: null },
    workDate: { source: "manual", confidence: null },
    workTime: { source: "manual", confidence: null },
    payAmount: { source: "manual", confidence: null },
    description: { source: "manual", confidence: null },
    parkingNote: { source: "manual", confidence: null },
    accessPassword: { source: "manual", confidence: null },
    requiredItems: { source: "manual", confidence: null },
    mealNote: { source: "manual", confidence: null },
    specialNote: { source: "manual", confidence: null },
    materialNote: { source: "manual", confidence: null },
    contactPhone: { source: "manual", confidence: null },
    craft: { source: "manual", confidence: null },
    trade: { source: "manual", confidence: null },
    crewCount: { source: "manual", confidence: null },
  };
}

export function createInitialJobPostDraft({ mode = "post", selectedDateKey = "", defaultCraft = null } = {}) {
  const craft =
    defaultCraft && typeof defaultCraft === "string" && defaultCraft.trim()
      ? defaultCraft.trim()
      : mode === "help"
        ? "film"
        : "wallpaper";
  return {
    mode,
    craft,
    trade: "조공",
    title: "",
    payAmount: defaultPayByMode(mode),
    workDate: selectedDateKey,
    workDateEnd: selectedDateKey,
    workTime: mode === "post" || mode === "urgent" ? "08:00~17:00" : defaultTimeByMode(mode),
    location: {
      query: "",
      shortRegion: "",
      fullAddress: "",
      lat: null,
      lng: null,
      siteKind: "상가",
    },
    details: {
      description: "",
      payTerms: defaultPayTermsByMode(mode),
      parkingNote: "",
      accessPassword: "",
      requiredItems: "",
      mealNote: "",
      specialNote: "",
      materialNote: "",
      contactPhone: "",
    },
    source: {
      kind: "manual",
      ocrStatus: "idle",
      attachmentName: "",
      extractedAt: "",
    },
    extracted: emptyExtracted(),
    fieldMeta: emptyFieldMeta(),
  };
}

export function applyAddressSelectionToDraft(draft, address) {
  if (!draft || !address) return draft;
  return {
    ...draft,
    location: {
      ...draft.location,
      shortRegion: address.shortRegion || draft.location.shortRegion,
      fullAddress: address.fullAddress || draft.location.fullAddress,
      lat: Number.isFinite(Number(address.lat)) ? Number(address.lat) : draft.location.lat,
      lng: Number.isFinite(Number(address.lng)) ? Number(address.lng) : draft.location.lng,
      siteKind: address.siteKind || draft.location.siteKind,
    },
    fieldMeta: {
      ...draft.fieldMeta,
      address: { source: "manual", confidence: null },
    },
  };
}

export function applyOcrExtractionToDraft(draft, extracted, meta = {}) {
  if (!draft || !extracted || typeof extracted !== "object") return draft;
  const next = {
    ...draft,
    source: {
      ...draft.source,
      kind: "ocr",
      ocrStatus: meta.ocrStatus || "ready",
      attachmentName: meta.attachmentName || draft.source.attachmentName || "",
      extractedAt: meta.extractedAt || new Date().toISOString(),
    },
    extracted: {
      ...draft.extracted,
      ...extracted,
    },
    fieldMeta: { ...draft.fieldMeta },
  };

  if (extracted.address && typeof extracted.address === "object") {
    next.location = {
      ...next.location,
      shortRegion: extracted.address.shortRegion || next.location.shortRegion,
      fullAddress: extracted.address.fullAddress || next.location.fullAddress,
      siteKind: extracted.address.siteKind || next.location.siteKind,
      lat: Number.isFinite(Number(extracted.address.lat)) ? Number(extracted.address.lat) : next.location.lat,
      lng: Number.isFinite(Number(extracted.address.lng)) ? Number(extracted.address.lng) : next.location.lng,
    };
    next.fieldMeta.address = { source: "ocr", confidence: extracted.address.confidence ?? null };
  }
  if (extracted.craft) {
    next.craft = extracted.craft.value || extracted.craft;
    next.fieldMeta.craft = { source: "ocr", confidence: extracted.craft.confidence ?? null };
  }
  if (extracted.trade) {
    next.trade = extracted.trade.value || extracted.trade;
    next.fieldMeta.trade = { source: "ocr", confidence: extracted.trade.confidence ?? null };
  }
  if (extracted.crewCount) {
    const crewCount =
      typeof extracted.crewCount === "object" ? Number(extracted.crewCount.value) : Number(extracted.crewCount);
    if (Number.isFinite(crewCount) && crewCount > 0) next.details.crewCount = Math.round(crewCount);
    next.fieldMeta.crewCount = { source: "ocr", confidence: extracted.crewCount.confidence ?? null };
  }
  if (extracted.workDate) {
    next.workDate = extracted.workDate.value || extracted.workDate;
    next.fieldMeta.workDate = { source: "ocr", confidence: extracted.workDate.confidence ?? null };
  }
  if (extracted.workDateEnd) {
    next.workDateEnd = extracted.workDateEnd.value || extracted.workDateEnd;
    next.fieldMeta.workDateEnd = { source: "ocr", confidence: extracted.workDateEnd.confidence ?? null };
  } else if (next.workDate) {
    next.workDateEnd = next.workDate;
  }
  if (extracted.workTime) {
    next.workTime = extracted.workTime.value || extracted.workTime;
    next.fieldMeta.workTime = { source: "ocr", confidence: extracted.workTime.confidence ?? null };
  }
  if (extracted.payAmount) {
    const pay =
      typeof extracted.payAmount === "object" ? Number(extracted.payAmount.value) : Number(extracted.payAmount);
    if (Number.isFinite(pay) && pay > 0) next.payAmount = pay;
    next.fieldMeta.payAmount = {
      source: "ocr",
      confidence: extracted.payAmount?.confidence ?? null,
    };
  }
  if (extracted.description) {
    next.details.description = extracted.description.value || extracted.description;
    next.fieldMeta.description = { source: "ocr", confidence: extracted.description.confidence ?? null };
  }
  if (extracted.parkingNote) {
    next.details.parkingNote = extracted.parkingNote.value || extracted.parkingNote;
    next.fieldMeta.parkingNote = { source: "ocr", confidence: extracted.parkingNote.confidence ?? null };
  }
  if (extracted.accessPassword) {
    next.details.accessPassword = extracted.accessPassword.value || extracted.accessPassword;
    next.fieldMeta.accessPassword = {
      source: "ocr",
      confidence: extracted.accessPassword.confidence ?? null,
    };
  }
  if (extracted.requiredItems) {
    next.details.requiredItems = extracted.requiredItems.value || extracted.requiredItems;
    next.fieldMeta.requiredItems = {
      source: "ocr",
      confidence: extracted.requiredItems.confidence ?? null,
    };
  }
  if (extracted.mealNote) {
    next.details.mealNote = extracted.mealNote.value || extracted.mealNote;
    next.fieldMeta.mealNote = {
      source: "ocr",
      confidence: extracted.mealNote.confidence ?? null,
    };
  }
  if (extracted.specialNote) {
    next.details.specialNote = extracted.specialNote.value || extracted.specialNote;
    next.fieldMeta.specialNote = {
      source: "ocr",
      confidence: extracted.specialNote.confidence ?? null,
    };
  }
  if (extracted.materialNote) {
    next.details.materialNote = extracted.materialNote.value || extracted.materialNote;
    next.fieldMeta.materialNote = {
      source: "ocr",
      confidence: extracted.materialNote.confidence ?? null,
    };
  }
  if (extracted.contactPhone) {
    next.details.contactPhone = extracted.contactPhone.value || extracted.contactPhone;
    next.fieldMeta.contactPhone = {
      source: "ocr",
      confidence: extracted.contactPhone.confidence ?? null,
    };
  }
  return next;
}
