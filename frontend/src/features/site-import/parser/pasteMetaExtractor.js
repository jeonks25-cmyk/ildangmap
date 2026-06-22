import { inferCraftFromText } from "../extractor/craftInference";

const OYAJI_RE = /(?:오야지|현장대리|반장|팀장)\s*[:：]?\s*([가-힣A-Za-z0-9]{2,12})/iu;
const CLIENT_RE = /(?:거래처|시공사|업체|인테리어사)\s*[:：]?\s*([가-힣A-Za-z0-9]{2,24})/iu;
const COMPANY_LINE_RE = /^(?:더본|한샘|영림|현대|[가-힣]{2,12}(?:인테리어|건설|하우스|디자인))$/u;

/** 카톡 붙여넣기 — 오야지·거래처·공정 등 메타 */
export function extractPasteMeta(text) {
  const raw = String(text || "").trim();
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let oyajiName = "";
  let clientName = "";

  for (const line of lines) {
    const oyaji = line.match(OYAJI_RE);
    if (oyaji?.[1]) oyajiName = oyaji[1].trim();

    const client = line.match(CLIENT_RE);
    if (client?.[1]) clientName = client[1].trim();

    if (!clientName && COMPANY_LINE_RE.test(line) && !/(동|호|비번)/u.test(line)) {
      clientName = line;
    }
  }

  const craftResult = inferCraftFromText(raw);

  return {
    oyajiName,
    clientName,
    craft: craftResult.craft || "",
    craftLabel: craftResult.matched || "",
  };
}
