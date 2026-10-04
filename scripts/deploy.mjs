import {spawnSync} from 'node:child_process';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const remote = process.env.PAGES_REMOTE || 'git@github.com:jamesrp/small-math-adventure.git';
const branch = 'gh-pages';
const args = process.argv.slice(2);
const dryRun = args[0] === '--dry-run';
if (dryRun) args.shift();
if (args.length > 1 || args[0]?.startsWith('--')) {
  console.error('Usage: npm run deploy -- [--dry-run] ["Commit message"]');
  process.exit(1);
}
const message = args[0] || `Deploy math adventure ${new Date().toISOString()}`;

function run(command, args, cwd = root, allowedStatuses = [0]) {
  const result = spawnSync(command, args, {cwd, stdio: 'inherit'});
  if (result.error) throw result.error;
  if (!allowedStatuses.includes(result.status)) {
    throw new Error(`${command} ${args[0]} failed${result.signal ? ` (${result.signal})` : ` (exit ${result.status})`}.`);
  }
  return result.status;
}

let checkout;
try {
  run('npm', ['test']);
  run('npm', ['run', 'build']);

  // Keep Git metadata outside dist: the release builder precaches every file there.
  checkout = mkdtempSync(join(tmpdir(), 'small-math-adventure-deploy-'));
  run('git', ['clone', '--quiet', '--single-branch', '--branch', branch, remote, checkout]);
  // This is a fresh deployment checkout. Remove obsolete app files while keeping
  // repository metadata and hosting configuration that do not belong to dist.
  run('rsync', ['-a', '--delete',
    '--exclude=/.git/', '--exclude=/.github/', '--exclude=/README.md',
    '--exclude=/CNAME', '--exclude=/.gitignore', '--exclude=/.gitattributes',
    '--exclude=/LICENSE', '--exclude=/LICENSE.md',
    join(root, 'dist') + '/', checkout + '/']);
  writeFileSync(join(checkout, '.nojekyll'), '');
  run('git', ['add', '--all'], checkout);
  run('git', ['diff', '--cached', '--stat'], checkout);

  const changed = run('git', ['diff', '--cached', '--quiet'], checkout, [0, 1]) === 1;
  if (dryRun) {
    console.log(changed ? 'Preview complete. Nothing was committed or pushed.' : 'No app changes to publish. Nothing was pushed.');
  } else if (!changed) {
    console.log('No app changes to publish.');
  } else {
    run('git', ['commit', '-m', message], checkout);
    // A regular push rejects concurrent remote changes rather than overwriting them.
    run('git', ['push', 'origin', `HEAD:${branch}`], checkout);
    console.log(`Pushed to ${remote} (${branch}). GitHub Pages will deploy the update.`);
  }
} catch (error) {
  console.error(`Deployment stopped: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (checkout) rmSync(checkout, {recursive: true, force: true});
}
