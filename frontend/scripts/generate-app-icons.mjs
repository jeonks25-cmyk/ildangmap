import sharp from "sharp";
import toIco from "to-ico";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");
const sourceSvg = path.join(publicDir, "brand/icons/app-icon-v3-bold.svg");
const previewDir = path.join(publicDir, "brand/icons/previews");

async function renderSourcePng() {
  return sharp(sourceSvg, { density: 384 }).resize(1024, 1024).png({ compressionLevel: 9 }).toBuffer();
}

async function resizePng(sourceBuffer, size, outPath) {
  await sharp(sourceBuffer).resize(size, size).png({ compressionLevel: 9 }).toFile(outPath);
  console.log(`wrote ${path.relative(publicDir, outPath)} (${size}x${size})`);
}

async function main() {
  const sourceBuffer = await renderSourcePng();
  const masterPath = path.join(publicDir, "brand/icons/app-icon-v3-bold-1024.png");
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
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
