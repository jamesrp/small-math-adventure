// Checks dist/art/manifest.json against the art slot catalog (dist/art-slots.js):
// known slot IDs, files that exist, the right shape and size, video settings
// when ffprobe is available, and the total download. Run after adding art:
//   node scripts/check-art.mjs            (report; exits 1 on any problem)
//   node scripts/check-art.mjs --list     (every slot with its spec)
import { readFile, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { artSlots, voiceLines } from '../dist/art-slots.js';

import { pathToFileURL } from 'node:url';
// ART_DIR checks a staging folder instead of dist/art (it must contain manifest.json).
const root = process.env.ART_DIR ? pathToFileURL(process.env.ART_DIR.replace(/\/?$/, '/')) : new URL('../dist/art/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('manifest.json', root), 'utf8'));
const slots = new Map(artSlots().map(s => [s.id, s]));
const problems = [], notes = [];
const KB = 1024, MB = 1024 * KB;
const BUDGET = {
  image: { map_wide: 1.2 * MB, map_tall: 1.2 * MB, scene: 450 * KB, change: 450 * KB, portrait: 120 * KB, reaction: 120 * KB, sticker: 80 * KB, icon: 60 * KB, traveler: 80 * KB, finale: 600 * KB },
  video: { map_wide: 3 * MB, map_tall: 3 * MB, scene: 1.5 * MB, change: 1.5 * MB, portrait: 400 * KB, reaction: 400 * KB, finale: 4 * MB },
};
const SECONDS = { loop: [3, 10], once: [1.2, 6] };

const voices = new Map(voiceLines().map(line => [`voice/${line.id}`, line]));
if (process.argv.includes('--voices')) {
  for (const [id, line] of voices) console.log(`${id.padEnd(34)} ${line.speaker.padEnd(9)} ${line.text}`);
  process.exit(0);
}
if (process.argv.includes('--list')) {
  for (const s of slots.values()) console.log(`${s.id.padEnd(30)} ${String(s.w).padStart(4)}×${String(s.h).padEnd(4)} ${s.video ? `video:${s.video}` : 'still'}${s.transparent ? ' transparent' : ''}  ${s.about}`);
  process.exit(0);
}

function imageSize(bytes, path) {
  if (path.endsWith('.svg')) { const m = /viewBox="[\d.\s-]*?\s([\d.]+)\s+([\d.]+)"/.exec(bytes.toString('utf8')); return m ? { w: Number(m[1]), h: Number(m[2]) } : null; }
  if (bytes.readUInt32BE(0) === 0x89504e47) return { w: bytes.readUInt32BE(16), h: bytes.readUInt32BE(20), alpha: [4, 6].includes(bytes[25]) };
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') {
    const kind = bytes.toString('ascii', 12, 16);
    if (kind === 'VP8X') return { w: 1 + bytes.readUIntLE(24, 3), h: 1 + bytes.readUIntLE(27, 3), alpha: Boolean(bytes[20] & 0x10) };
    if (kind === 'VP8L') { const b = bytes.readUInt32LE(21); return { w: 1 + (b & 0x3fff), h: 1 + ((b >> 14) & 0x3fff), alpha: Boolean((b >> 28) & 1) }; }
    if (kind === 'VP8 ') return { w: bytes.readUInt16LE(26) & 0x3fff, h: bytes.readUInt16LE(28) & 0x3fff, alpha: false };
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    for (let i = 2; i < bytes.length;) {
      const marker = bytes[i + 1], length = bytes.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { w: bytes.readUInt16BE(i + 7), h: bytes.readUInt16BE(i + 5), alpha: false };
      i += 2 + length;
    }
  }
  return null;
}
let ffprobe = true;
function probe(file) {
  if (!ffprobe) return null;
  try { return JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], { encoding: 'utf8' })); }
  catch (error) { if (error.code === 'ENOENT') { ffprobe = false; notes.push('ffprobe not found: video codecs and durations were not checked.'); } else problems.push(`${file}: ffprobe could not read it`); return null; }
}

let total = 0, ready = 0;
for (const [id, entry] of Object.entries(manifest.assets || {})) {
  if (voices.has(id)) {
    if (!['todo', 'ready'].includes(entry.status)) problems.push(`${id}: status must be "todo" or "ready"`);
    if (entry.status !== 'ready') continue;
    if (!/\.(mp3|m4a)$/i.test(entry.audio || '')) { problems.push(`${id}: a voice line needs an MP3 or M4A "audio" file`); continue; }
    try { const info = await stat(new URL(entry.audio, root)); total += info.size; if (info.size > 200 * KB) problems.push(`${id}: audio over 200 KB`); } catch { problems.push(`${id}: missing audio ${entry.audio}`); }
    continue;
  }
  const spec = slots.get(id);
  if (!spec) { problems.push(`${id}: not a slot in dist/art-slots.js`); continue; }
  if (!['todo', 'ready'].includes(entry.status)) problems.push(`${id}: status must be "todo" or "ready"`);
  if (entry.status !== 'ready') continue;
  ready++;
  if (!entry.image) problems.push(`${id}: a ready slot needs an image (it is also the video poster)`);
  for (const [kind, path] of [['image', entry.image], ['video', entry.video]]) {
    if (!path) continue;
    const url = new URL(path, root), file = url.pathname;
    let info;
    try { info = await stat(url); } catch { problems.push(`${id}: missing ${kind} ${path}`); continue; }
    total += info.size;
    if (info.size > BUDGET[kind][spec.shape]) problems.push(`${id}: ${kind} is ${(info.size / KB).toFixed(0)} KB; keep it under ${(BUDGET[kind][spec.shape] / KB).toFixed(0)} KB`);
    if (kind === 'image') {
      if (!/\.(webp|png|jpe?g|svg)$/i.test(path)) problems.push(`${id}: image should be WebP, PNG or JPEG`);
      const size = imageSize(await readFile(url), path);
      if (!size) { problems.push(`${id}: could not read the image size`); continue; }
      if (Math.abs(size.w / size.h - spec.w / spec.h) > 0.02 * (spec.w / spec.h)) problems.push(`${id}: image is ${size.w}×${size.h}; the slot is ${spec.w}×${spec.h} (aspect ${(spec.w / spec.h).toFixed(3)})`);
      if (!path.endsWith('.svg') && size.w < spec.w * 0.5) problems.push(`${id}: image is ${size.w} wide; aim for ${spec.w}`);
      if (spec.transparent && !path.endsWith('.svg') && size.alpha === false) problems.push(`${id}: needs a transparent background`);
    } else {
      if (!spec.video) { problems.push(`${id}: this slot is a still; remove the video`); continue; }
      if (!/\.mp4$/i.test(path)) problems.push(`${id}: video should be MP4 (H.264) so iPad Safari plays it`);
      const info = probe(file);
      if (!info) continue;
      const video = info.streams.find(s => s.codec_type === 'video'), seconds = Number(info.format?.duration);
      if (!video || video.codec_name !== 'h264') problems.push(`${id}: video codec must be h264`);
      if (video && video.pix_fmt !== 'yuv420p') problems.push(`${id}: pixel format must be yuv420p`);
      if (info.streams.some(s => s.codec_type === 'audio')) problems.push(`${id}: remove the audio track`);
      if (video && Math.abs(video.width / video.height - spec.w / spec.h) > 0.02 * (spec.w / spec.h)) problems.push(`${id}: video is ${video.width}×${video.height}; the slot aspect is ${(spec.w / spec.h).toFixed(3)}`);
      const [low, high] = SECONDS[spec.video];
      if (seconds && (seconds < low || seconds > high)) problems.push(`${id}: video is ${seconds.toFixed(1)} s; ${spec.video === 'loop' ? 'loops' : 'one-shot clips'} should be ${low}–${high} s`);
    }
  }
}
const report = { slots: slots.size, ready, missing: slots.size - ready, megabytes: Number((total / MB).toFixed(1)), problems, notes };
console.log(JSON.stringify(report, null, 2));
if (total > 90 * MB) { console.error('Total art is over 90 MB.'); process.exit(1); }
process.exit(problems.length ? 1 : 0);
