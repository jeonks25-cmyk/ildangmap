import sharp from "sharp";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");
const conceptsDir = path.join(publicDir, "brand/icons/concepts");
const outDir = path.join(conceptsDir, "previews");

const VARIANTS = [
  { id: "v4-1-helmet", file: "app-icon-v4-1-helmet.svg", label: "1안 · 안전모" },
  { id: "v4-2-hammer", file: "app-icon-v4-2-hammer.svg", label: "2안 · 망치" },
  { id: "v4-3-combo", file: "app-icon-v4-3-combo.svg", label: "3안 · 안전모+망치" },
];

const CURRENT = {
  id: "v3-current",
  file: path.join(publicDir, "brand/icons/app-icon-v3-bold.svg"),
  label: "현재 (v3)",
};

async function svgToPng(svgPath, size) {
  const svg = await readFile(svgPath);
  return sharp(svg, { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
}

function roundedRectSvg(w, h, r, fill) {
  return `<rect width="${w}" height="${h}" rx="${r}" fill="${fill}"/>`;
}

async function makeReferenceIcon(kind, size) {
  const s = size;
  if (kind === "kakao") {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 100 100">
      ${roundedRectSvg(100, 100, 22, "#FEE500")}
      <ellipse cx="50" cy="52" rx="28" ry="24" fill="#3C1E1E"/>
      <path fill="#FEE500" d="M38 58 L50 68 L62 58 Z"/>
    </svg>`;
    return sharp(Buffer.from(svg)).resize(s).png().toBuffer();
  }
  if (kind === "navermap") {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 100 100">
      ${roundedRectSvg(100, 100, 22, "#FFFFFF")}
      <path fill="#03C75A" d="M50 18 C34 18 22 30 22 44 C22 62 50 82 50 82 C50 82 78 62 78 44 C78 30 66 18 50 18 Z"/>
      <circle cx="50" cy="42" r="10" fill="#FFFFFF"/>
    </svg>`;
    return sharp(Buffer.from(svg)).resize(s).png().toBuffer();
  }
  return null;
}

async function buildHomeScreenMockup(iconBuffers, labels) {
  const W = 1440;
  const H = 920;
  const phoneW = 380;
  const phoneH = 780;
  const phoneX = (W - phoneW) / 2;
  const phoneY = 56;
  const iconSize = 56;
  const gap = 28;
  const dockY = phoneY + phoneH - 130;
  const totalIcons = iconBuffers.length;
  const rowW = totalIcons * iconSize + (totalIcons - 1) * gap;
  const startX = phoneX + (phoneW - rowW) / 2;

  const iconCells = iconBuffers
    .map((_, i) => {
      const x = startX + i * (iconSize + gap);
      const label = labels[i].replace(/&/g, "&amp;").replace(/</g, "&lt;");
      return `
        <image href="data:image/png;base64,${iconBuffers[i].toString("base64")}" x="${x}" y="${dockY}" width="${iconSize}" height="${iconSize}"/>
        <text x="${x + iconSize / 2}" y="${dockY + iconSize + 22}" text-anchor="middle" font-family="Segoe UI, Apple SD Gothic Neo, sans-serif" font-size="11" fill="#FFFFFF" opacity="0.92">${label}</text>
      `;
    })
    .join("\n");

  const mockSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#1a2744"/>
        <stop offset="100%" stop-color="#0d1526"/>
      </linearGradient>
      <linearGradient id="wall" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#2d4a7c"/>
        <stop offset="50%" stop-color="#1e3358"/>
        <stop offset="100%" stop-color="#152a4a"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <text x="${W / 2}" y="36" text-anchor="middle" font-family="Segoe UI, Apple SD Gothic Neo, sans-serif" font-size="22" font-weight="600" fill="#FFFFFF">일당맵 아이콘 시안 비교 · Android 홈화면 Mockup</text>
    <text x="${W / 2}" y="62" text-anchor="middle" font-family="Segoe UI, Apple SD Gothic Neo, sans-serif" font-size="13" fill="#94A3B8">48px 기준 · 카카오톡 · 네이버지도 옆 배치</text>

    <rect x="${phoneX - 8}" y="${phoneY - 8}" width="${phoneW + 16}" height="${phoneH + 16}" rx="36" fill="#111827"/>
    <rect x="${phoneX}" y="${phoneY}" width="${phoneW}" height="${phoneH}" rx="32" fill="url(#wall)"/>
    <rect x="${phoneX + 130}" y="${phoneY + 12}" width="120" height="8" rx="4" fill="#000" opacity="0.35"/>
    <text x="${phoneX + 24}" y="${phoneY + 52}" font-family="Segoe UI, sans-serif" font-size="13" font-weight="600" fill="#FFFFFF" opacity="0.9">9:41</text>

    ${iconCells}

    <rect x="${phoneX + phoneW / 2 - 48}" y="${phoneY + phoneH - 28}" width="96" height="5" rx="2.5" fill="#FFFFFF" opacity="0.35"/>

    <g transform="translate(80, ${phoneY + 40})">
      <text font-family="Segoe UI, Apple SD Gothic Neo, sans-serif" font-size="14" font-weight="600" fill="#FFFFFF">설계 방향</text>
      <text y="28" font-family="Segoe UI, Apple SD Gothic Neo, sans-serif" font-size="12" fill="#CBD5E1">• 지도핀(흰색)이 1차 심볼</text>
      <text y="48" font-family="Segoe UI, Apple SD Gothic Neo, sans-serif" font-size="12" fill="#CBD5E1">• 건설/현장 요소는 핀 내부 보조</text>
      <text y="68" font-family="Segoe UI, Apple SD Gothic Neo, sans-serif" font-size="12" fill="#CBD5E1">• v3 대비 심볼 ~18% 축소</text>
      <text y="88" font-family="Segoe UI, Apple SD Gothic Neo, sans-serif" font-size="12" fill="#CBD5E1">• 여백 확대 (128px safe area)</text>
    </g>

    <g transform="translate(${W - 320}, ${phoneY + 40})">
      <text font-family="Segoe UI, Apple SD Gothic Neo, sans-serif" font-size="14" font-weight="600" fill="#FFFFFF">48px 미리보기</text>
    </g>
  </svg>`;

  return sharp(Buffer.from(mockSvg)).png().toBuffer();
}

async function buildComparisonSheet(pngMap) {
  const cols = 6;
  const cell = 180;
  const pad = 24;
  const labelH = 36;
  const W = cols * cell + (cols + 1) * pad;
  const H = cell + labelH + pad * 3 + 48;

  const items = [
    { key: "kakao", label: "카카오톡 (참고)" },
    { key: "navermap", label: "네이버지도 (참고)" },
    { key: CURRENT.id, label: CURRENT.label },
    ...VARIANTS.map((v) => ({ key: v.id, label: v.label })),
  ];

  const cells = await Promise.all(
    items.map(async (item, i) => {
      const x = pad + i * (cell + pad);
      const y = pad + 48;
      const buf48 = pngMap[item.key][48];
      const buf96 = pngMap[item.key][96];
      const label = item.label.replace(/&/g, "&amp;").replace(/</g, "&lt;");
      return `
        <rect x="${x - 8}" y="${y - 8}" width="${cell + 16}" height="${cell + labelH + 24}" rx="12" fill="#1E293B"/>
        <image href="data:image/png;base64,${buf96.toString("base64")}" x="${x + (cell - 96) / 2}" y="${y + 20}" width="96" height="96"/>
        <image href="data:image/png;base64,${buf48.toString("base64")}" x="${x + 12}" y="${y + cell - 52}" width="48" height="48"/>
        <text x="${x + cell / 2}" y="${y + cell + labelH}" text-anchor="middle" font-family="Segoe UI, Apple SD Gothic Neo, sans-serif" font-size="13" fill="#F8FAFC">${label}</text>
        <text x="${x + 36}" y="${y + cell - 12}" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="10" fill="#64748B">48px</text>
      `;
    })
  );

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="#0F172A"/>
    <text x="${W / 2}" y="32" text-anchor="middle" font-family="Segoe UI, Apple SD Gothic Neo, sans-serif" font-size="18" font-weight="600" fill="#FFFFFF">아이콘 시안 비교 · 96px + 48px</text>
    ${cells.join("\n")}
  </svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function main() {
  await mkdir(outDir, { recursive: true });

  const pngMap = {
    kakao: {},
    navermap: {},
    [CURRENT.id]: {},
  };
  for (const v of VARIANTS) pngMap[v.id] = {};

  for (const size of [48, 72, 96, 192, 512, 1024]) {
    pngMap.kakao[size] = await makeReferenceIcon("kakao", size);
    pngMap.navermap[size] = await makeReferenceIcon("navermap", size);
    pngMap[CURRENT.id][size] = await svgToPng(CURRENT.file, size);
    for (const v of VARIANTS) {
      pngMap[v.id][size] = await svgToPng(path.join(conceptsDir, v.file), size);
      if ([48, 72, 96, 1024].includes(size)) {
        const out = path.join(outDir, `${v.id}-${size}.png`);
        await writeFile(out, pngMap[v.id][size]);
        console.log(`wrote ${path.relative(publicDir, out)}`);
      }
    }
  }

  const dockIcons = [
    pngMap.kakao[48],
    pngMap.navermap[48],
    pngMap[CURRENT.id][48],
    pngMap["v4-1-helmet"][48],
    pngMap["v4-2-hammer"][48],
    pngMap["v4-3-combo"][48],
  ];
  const dockLabels = ["카카오톡", "네이버지도", "현재 v3", "1안", "2안", "3안"];

  const mockup = await buildHomeScreenMockup(dockIcons, dockLabels);
  const mockupPath = path.join(outDir, "home-screen-mockup.png");
  await writeFile(mockupPath, mockup);
  console.log(`wrote ${path.relative(publicDir, mockupPath)}`);

  const sheet = await buildComparisonSheet(pngMap);
  const sheetPath = path.join(outDir, "comparison-sheet.png");
  await writeFile(sheetPath, sheet);
  console.log(`wrote ${path.relative(publicDir, sheetPath)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
