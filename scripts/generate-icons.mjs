// Génère les icônes PNG depuis public/icon.svg : node scripts/generate-icons.mjs
import { readFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const svg = await readFile(path.join(root, 'public', 'icon.svg'))
const out = path.join(root, 'public', 'icons')
await mkdir(out, { recursive: true })

const BG = '#0a0a0a'

async function plain(size, name) {
  await sharp(svg, { density: 384 }).resize(size, size).png().toFile(path.join(out, name))
}

// Maskable : le motif tient dans la zone sûre (80 % central), fond plein jusqu'aux bords.
async function maskable(size, name) {
  const inner = Math.round(size * 0.8)
  const pad = Math.round((size - inner) / 2)
  const ball = await sharp(svg, { density: 384 }).resize(inner, inner).png().toBuffer()
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: ball, left: pad, top: pad }])
    .png()
    .toFile(path.join(out, name))
}

await plain(192, 'icon-192.png')
await plain(512, 'icon-512.png')
await plain(180, 'apple-touch-icon.png')
await maskable(512, 'icon-maskable-512.png')
console.log('Icônes générées dans public/icons')
