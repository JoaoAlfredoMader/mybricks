// Turns the day and night renders of the landing hero into responsive WebP files.
//
//   node scripts/build-hero-images.mjs <day image> <night image>
//
// Both renders must share the same camera and size. Output goes to
// src/features/landing/assets/hero: <scene>-<width>.webp plus manifest.json,
// which the page reads to build its srcset.
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const OUTPUT_DIR = path.resolve('src/features/landing/assets/hero')
const WIDTHS = [960, 1600, 2400, 3200]
const QUALITY = 78

const [dayPath, nightPath] = process.argv.slice(2)
if (!dayPath || !nightPath) {
  console.error('Usage: node scripts/build-hero-images.mjs <day image> <night image>')
  process.exit(1)
}

const [day, night] = await Promise.all([sharp(dayPath).metadata(), sharp(nightPath).metadata()])
if (day.width !== night.width || day.height !== night.height) {
  console.error(`Day (${day.width}x${day.height}) and night (${night.width}x${night.height}) must have the same size.`)
  process.exit(1)
}

// Never upscale: widths above the source collapse into the source width.
const widths = [...new Set(WIDTHS.map((width) => Math.min(width, day.width)))]

await mkdir(OUTPUT_DIR, { recursive: true })
for (const file of await readdir(OUTPUT_DIR)) {
  if (file.endsWith('.webp')) await rm(path.join(OUTPUT_DIR, file))
}

for (const [scene, source] of [['day', dayPath], ['night', nightPath]]) {
  for (const width of widths) {
    const target = path.join(OUTPUT_DIR, `${scene}-${width}.webp`)
    const info = await sharp(source).resize({ width }).webp({ quality: QUALITY }).toFile(target)
    console.log(`${path.relative(process.cwd(), target)}  ${info.width}x${info.height}  ${Math.round(info.size / 1024)} KB`)
  }
}

const manifest = { width: day.width, height: day.height, widths }
await writeFile(path.join(OUTPUT_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
