// Preview links for testers. A preview is a copy of dist/ for
// https://jamesrp.github.io/small-math-adventure/preview/<item>/ with its own
// save keys (dist/storage.js) and no service worker (dist/main.js). The live
// worker sends ./preview/ requests straight to the network (dist/sw.js).
//
//   npm run preview -- <item>                       build previews/<item>/; npm start serves it at /preview/<item>/
//   npm run preview -- <item> --publish [--dry-run] ["Note"]
//                                                   test, build and put it on gh-pages at preview/<item>/
//   npm run preview -- <item> --remove [--dry-run]  take preview/<item>/ off gh-pages
//   npm run preview -- --list                       list the previews on gh-pages
//
// Publishing changes only preview/<item>/ on gh-pages, and the production
// deploy (scripts/deploy.mjs) leaves preview/ alone. Nothing here runs by
// itself. See "Preview links for testers" in README.md.
import {spawnSync} from 'node:child_process';
import {existsSync, mkdtempSync, readdirSync, rmSync} from 'node:fs';
import {cp, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {basename, dirname, join, relative, resolve, sep} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
export const DIST = join(root, 'dist');
export const LOCAL = join(root, 'previews');
export const PAGES_URL = 'https://jamesrp.github.io/small-math-adventure/';
const LIVE_MODULE = 'export const PREVIEW = null;';

export function checkItem(item) {
  if (typeof item !== 'string' || !/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(item)) {
    throw new Error(`A preview name is 1 to 40 lowercase letters, digits and dashes, starting and ending with a letter or digit, not ${JSON.stringify(item)}.`);
  }
  return item;
}
export const previewUrl = item => `${PAGES_URL}preview/${checkItem(item)}/`;
export const previewModule = item => `// A preview copy built by scripts/preview.mjs: its own save keys, no service worker.\nexport const PREVIEW = ${JSON.stringify(checkItem(item))};\n`;

// The tab and an installed icon say which copy is open.
export function retitle(html, item) {
  const titles = html.match(/<title>[^<]*<\/title>/g) || [];
  if (titles.length !== 1) throw new Error(`index.html should have one <title>, not ${titles.length}.`);
  return html.replace(/<title>([^<]*)<\/title>/, (_, title) => `<title>Preview ${checkItem(item)} · ${title}</title>`);
}
export function rename(manifest, item) {
  const data = JSON.parse(manifest);
  return JSON.stringify({...data, name: `Preview ${checkItem(item)} · ${data.name}`, short_name: `Preview ${item}`}, null, 2) + '\n';
}

// Copies dist/ to `to` as a preview: no sw.js, the item in preview.js, and its
// name in the title and manifest. Everything else is the same bytes.
export async function buildPreview(item, {from = DIST, to = join(LOCAL, item)} = {}) {
  checkItem(item);
  from = resolve(from); to = resolve(to);
  if (to === from || to.startsWith(from + sep)) throw new Error('A preview cannot be built inside dist/: the release build would precache it.');
  const live = await readFile(join(from, 'preview.js'), 'utf8');
  if (!live.includes(LIVE_MODULE)) throw new Error(`${join(from, 'preview.js')} should hold "${LIVE_MODULE}".`);
  await rm(to, {recursive: true, force: true});
  await mkdir(dirname(to), {recursive: true});
  await cp(from, to, {recursive: true, filter: source => {
    const path = relative(from, source);
    return path !== 'sw.js' && basename(path) !== '.DS_Store';
  }});
  await writeFile(join(to, 'preview.js'), previewModule(item));
  await writeFile(join(to, 'index.html'), retitle(await readFile(join(to, 'index.html'), 'utf8'), item));
  await writeFile(join(to, 'manifest.webmanifest'), rename(await readFile(join(to, 'manifest.webmanifest'), 'utf8'), item));
  return to;
}

function run(command, args, cwd = root, allowedStatuses = [0], capture = false) {
  const result = spawnSync(command, args, {cwd, stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit', encoding: 'utf8'});
  if (result.error) throw result.error;
  if (!allowedStatuses.includes(result.status)) {
    throw new Error(`${command} ${args[0]} failed${result.signal ? ` (${result.signal})` : ` (exit ${result.status})`}.`);
  }
  return capture ? result.stdout : result.status;
}

function usage() {
  console.error('Usage: npm run preview -- <item> [--publish [--dry-run] ["Note"] | --remove [--dry-run]]\n       npm run preview -- --list');
  process.exit(1);
}

async function main(argv) {
  const flags = new Set(argv.filter(arg => arg.startsWith('--')));
  const words = argv.filter(arg => !arg.startsWith('--'));
  const known = new Set(['--publish', '--remove', '--list', '--dry-run']);
  if ([...flags].some(flag => !known.has(flag))) usage();
  const publish = flags.has('--publish'), remove = flags.has('--remove'), list = flags.has('--list'), dryRun = flags.has('--dry-run');
  if (publish + remove + list > 1 || (dryRun && !publish && !remove)) usage();
  if (list ? words.length : words.length < 1 || words.length > (publish ? 2 : 1)) usage();
  const item = list ? null : checkItem(words[0]);

  if (!publish && !remove && !list) {
    const out = await buildPreview(item);
    console.log(`Built ${relative(root, out)}/. With npm start running, open http://127.0.0.1:${process.env.PORT || 4187}/preview/${item}/`);
    return;
  }

  const remote = process.env.PAGES_REMOTE || 'git@github.com:jamesrp/small-math-adventure.git';
  const branch = 'gh-pages';
  let checkout;
  try {
    if (publish) {
      run('npm', ['test']);
      run('npm', ['run', 'build']);
    }
    checkout = mkdtempSync(join(tmpdir(), 'small-math-adventure-preview-'));
    run('git', ['clone', '--quiet', '--single-branch', '--branch', branch, remote, checkout]);
    const folder = join(checkout, 'preview');

    if (list) {
      const items = existsSync(folder) ? readdirSync(folder, {withFileTypes: true}).filter(entry => entry.isDirectory()).map(entry => entry.name).sort() : [];
      if (!items.length) console.log('No previews on gh-pages.');
      for (const name of items) {
        const last = run('git', ['log', '-1', '--format=%cs  %s', '--', `preview/${name}`], checkout, [0], true).trim();
        console.log(`${PAGES_URL}preview/${name}/\n  ${last}`);
      }
      return;
    }

    const path = `preview/${item}`;
    if (publish) {
      if (!existsSync(join(checkout, 'index.html'))) throw new Error(`${branch} has no live app at its root.`);
      await buildPreview(item, {to: join(checkout, path)});
      run('git', ['add', '--all', '--', path], checkout);
    } else {
      if (!existsSync(join(checkout, path))) { console.log(`There is no ${path}/ on ${branch}. Nothing to remove.`); return; }
      run('git', ['rm', '-r', '--quiet', '--', path], checkout);
    }
    // Only this preview's folder may change.
    const touched = run('git', ['diff', '--cached', '--name-only'], checkout, [0], true).split('\n').filter(Boolean);
    const stray = touched.filter(name => !name.startsWith(`${path}/`));
    if (stray.length) throw new Error(`Refusing to change files outside ${path}/: ${stray.slice(0, 5).join(', ')}`);
    run('git', ['diff', '--cached', '--stat'], checkout);
    const changed = touched.length > 0;

    let message;
    if (publish) {
      const source = run('git', ['log', '-1', '--format=%h'], root, [0], true).trim();
      const name = run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], root, [0], true).trim();
      const dirty = run('git', ['status', '--porcelain'], root, [0], true).trim() ? ' with uncommitted changes' : '';
      message = `Preview ${item} from ${name} ${source}${dirty}${words[1] ? `: ${words[1]}` : ''}`;
    } else message = `Remove preview ${item}`;

    if (dryRun) console.log(changed ? `Dry run: would commit "${message}". Nothing was committed or pushed.` : 'Dry run: nothing would change.');
    else if (!changed) console.log(`${path}/ is already up to date on ${branch}.`);
    else {
      run('git', ['commit', '--quiet', '-m', message], checkout);
      // A regular push rejects concurrent remote changes rather than overwriting them.
      run('git', ['push', 'origin', `HEAD:${branch}`], checkout);
      console.log(publish ? `Published. In a minute or two GitHub Pages serves ${previewUrl(item)}` : `Removed ${path}/ from ${branch}.`);
    }
  } catch (error) {
    console.error(`Preview stopped: ${error.message}`);
    process.exitCode = 1;
  } finally {
    if (checkout) rmSync(checkout, {recursive: true, force: true});
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { await main(process.argv.slice(2)); }
  catch (error) { console.error(`Preview stopped: ${error.message}`); process.exitCode = 1; }
}
