// Turns generated art into files the game can ship, and records them in
// dist/art/manifest.json. Needs ffmpeg (and ffprobe) on the PATH.
//
//   node scripts/prepare-art.mjs still <image> <slot>     still → <slot>.webp at the slot's size
//   node scripts/prepare-art.mjs loop <video> <slot>      video → seamless <slot>.mp4 loop + poster
//   node scripts/prepare-art.mjs once <video> <slot>      video → one-shot <slot>.mp4 + poster
//   node scripts/prepare-art.mjs lastframe <video> <png>  last frame of a clip (to chain stages)
//
// A slot becomes "ready" once it has its image. Options: --fade <s> (loop
// crossfade, default 1), --seconds <s> (trim length before looping),
// --start <s> (skip the first seconds), --todo (record without enabling).
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { artSlots } from '../dist/art-slots.js';

const [command, input, target, ...rest] = process.argv.slice(2);
const option = (name, fallback) => { const i = rest.indexOf(`--${name}`); return i < 0 ? fallback : rest[i + 1]; };
const flag = name => rest.includes(`--${name}`);
// ART_DIR prepares into a staging folder (with its own manifest.json) instead of dist/art.
const art = process.env.ART_DIR ? process.env.ART_DIR.replace(/\/?$/, '/') : fileURLToPath(new URL('../dist/art/', import.meta.url));
const run = (bin, args) => execFileSync(bin, ['-hide_banner', '-loglevel', 'error', ...args], { stdio: ['ignore', 'inherit', 'inherit'] });
const duration = file => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' }).trim());

if (!['still', 'loop', 'once', 'lastframe'].includes(command) || !input || !target) {
  console.error('Usage: node scripts/prepare-art.mjs still|loop|once|lastframe <input> <slot-or-output> [--fade 1] [--seconds 6] [--start 0] [--todo]');
  process.exit(2);
}
if (command === 'lastframe') {
  run('ffmpeg', ['-sseof', '-0.1', '-i', input, '-frames:v', '1', '-update', '1', '-y', target]);
  console.log(`Wrote ${target}`); process.exit(0);
}
const slot = artSlots().find(s => s.id === target);
if (!slot) { console.error(`Unknown slot ${target}. List them with: node scripts/check-art.mjs --list`); process.exit(2); }
if (command !== 'still' && slot.video !== command) { console.error(`${slot.id} takes ${slot.video ? `a ${slot.video} video` : 'a still only'}.`); process.exit(2); }
const base = join(art, slot.id), relative = slot.id;
await mkdir(dirname(base), { recursive: true });
const manifestPath = join(art, 'manifest.json'), manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const entry = manifest.assets[slot.id] ||= { status: 'todo' };
const fit = `scale=${slot.w}:${slot.h}:force_original_aspect_ratio=increase,crop=${slot.w}:${slot.h}`;

if (command === 'still') {
  run('ffmpeg', ['-i', input, '-vf', fit, '-c:v', 'libwebp', ...(slot.transparent ? ['-lossless', '0', '-pix_fmt', 'yuva420p'] : []), '-quality', '82', '-y', `${base}.webp`]);
  entry.image = `${relative}.webp`;
} else {
  const tmp = await mkdtemp(join(tmpdir(), 'art-')), width = Math.min(1280, slot.w), height = Math.round(width * slot.h / slot.w / 2) * 2;
  const scale = `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},fps=24,format=yuv420p`;
  const start = Number(option('start', 0)), seconds = Number(option('seconds', 0)) || duration(input) - start;
  const encode = ['-c:v', 'libx264', '-preset', 'slow', '-crf', '28', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an'];
  if (command === 'loop') {
    // Crossfade the clip's opening over its ending so the loop has no jump.
    const fade = Math.min(Number(option('fade', 1)), seconds / 3), body = seconds - fade;
    run('ffmpeg', ['-ss', String(start), '-t', String(seconds), '-i', input, '-filter_complex',
      `[0:v]${scale},split[a][b];[a]trim=start=${fade},setpts=PTS-STARTPTS[main];[b]trim=duration=${fade},setpts=PTS-STARTPTS,format=yuva420p,fade=t=in:st=0:d=${fade}:alpha=1,setpts=PTS+${body - fade}/TB[head];[main][head]overlay=eof_action=pass,format=yuv420p[v]`,
      '-map', '[v]', ...encode, '-y', `${base}.mp4`]);
  } else {
    run('ffmpeg', ['-ss', String(start), '-t', String(seconds), '-i', input, '-vf', scale, ...encode, '-y', `${base}.mp4`]);
  }
  // The poster is the first frame; a still already in the slot is kept.
  if (!entry.image) {
    run('ffmpeg', ['-i', `${base}.mp4`, '-frames:v', '1', '-vf', `scale=${slot.w}:${slot.h}`, '-y', join(tmp, 'poster.png')]);
    run('ffmpeg', ['-i', join(tmp, 'poster.png'), '-c:v', 'libwebp', '-quality', '82', '-y', `${base}.webp`]);
    entry.image = `${relative}.webp`;
  }
  entry.video = `${relative}.mp4`;
  await rm(tmp, { recursive: true, force: true });
}
entry.status = flag('todo') ? 'todo' : 'ready';
manifest.assets = Object.fromEntries(Object.entries(manifest.assets).sort(([a], [b]) => a.localeCompare(b)));
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`${slot.id}: ${JSON.stringify(entry)}`);
