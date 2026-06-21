import sharp from "sharp";
import toIco from "to-ico";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");
const iconsDir = path.join(publicDir, "brand/icons");
const sourceSvg = path.join(iconsDir, "app-icon-v4-helmet.svg");
const adaptiveBgSvg = path.join(iconsDir, "adaptive/background.svg");
const adaptiveFgSvg = path.join(iconsDir, "adaptive/foreground-v4-helmet.svg");
const previewDir = path.join(iconsDir, "previews");

async function renderSvg(svgPath, size) {
  const svg = await readFile(svgPath);
  return sharp(svg, { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
}

async function resizePng(sourceBuffer, size, outPath) {
  await sharp(sourceBuffer).resize(size, size).png({ compressionLevel: 9 }).toFile(outPath);
  console.log(`wrote ${path.relative(publicDir, outPath)} (${size}x${size})`);
}

async function renderAdaptiveIcon(size) {
  const bg = await renderSvg(adaptiveBgSvg, size);
  const fg = await renderSvg(adaptiveFgSvg, size);
  return sharp(bg).composite([{ input: fg, top: 0, left: 0 }]).png({ compressionLevel: 9 }).toBuffer();
}

async function main() {
  const sourceBuffer = await renderSvg(sourceSvg, 1024);
  const masterPath = path.join(iconsDir, "app-icon-v4-helmet-1024.png");
  await writeFile(masterPath, sourceBuffer);
  console.log(`wrote ${path.relative(publicDir, masterPath)} (1024x1024)`);

  await resizePng(sourceBuffer, 512, path.join(publicDir, "logo512.png"));
  await resizePng(sourceBuffer, 192, path.join(publicDir, "logo192.png"));
  await resizePng(sourceBuffer, 180, path.join(publicDir, "apple-touch-icon.png"));
  await resizePng(sourceBuffer, 32, path.join(publicDir, "favicon-32.png"));
  await resizePng(sourceBuffer, 16, path.join(publicDir, "favicon-16.png"));

  const favicon16 = await readFile(path.join(publicDir, "favicon-16.png"));
  const favicon32 = await readFile(path.join(publicDir, "favicon-32.png"));
  const ico = await toIco([favicon16, favicon32]);
  await writeFile(path.join(publicDir, "favicon.ico"), ico);
  console.log("wrote favicon.ico");

  await mkdir(previewDir, { recursive: true });
  for (const size of [48, 72, 96]) {
    await resizePng(sourceBuffer, size, path.join(previewDir, `android-${size}.png`));
  }

  const adaptive432 = await renderAdaptiveIcon(432);
  await writeFile(path.join(previewDir, "adaptive-432.png"), adaptive432);
  console.log(`wrote ${path.relative(publicDir, path.join(previewDir, "adaptive-432.png"))} (432x432)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
