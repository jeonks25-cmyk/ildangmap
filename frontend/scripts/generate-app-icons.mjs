import sharp from "sharp";
import toIco from "to-ico";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");
const source = path.join(publicDir, "brand/icons/app-icon-v3-bold-1024.png");

async function resizePng(size, outName) {
  const outPath = path.join(publicDir, outName);
  await sharp(source).resize(size, size).png({ compressionLevel: 9 }).toFile(outPath);
  console.log(`wrote ${outName} (${size}x${size})`);
}

async function main() {
  await resizePng(512, "logo512.png");
  await resizePng(192, "logo192.png");
  await resizePng(180, "apple-touch-icon.png");
  await resizePng(32, "favicon-32.png");
  await resizePng(16, "favicon-16.png");

  const favicon16 = await readFile(path.join(publicDir, "favicon-16.png"));
  const favicon32 = await readFile(path.join(publicDir, "favicon-32.png"));
  const ico = await toIco([favicon16, favicon32]);
  await writeFile(path.join(publicDir, "favicon.ico"), ico);
  console.log("wrote favicon.ico");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
