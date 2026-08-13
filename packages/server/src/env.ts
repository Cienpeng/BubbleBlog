// Load a single project .env for local/direct deployments. Values supplied by
// systemd or the parent process always win and are never overwritten.
import { join, dirname } from 'path';

async function loadOneEnv(filePath: string): Promise<boolean> {
  const file = Bun.file(filePath);
  if (!(await file.exists())) return false;

  const content = await file.text();
  let count = 0;
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
      count++;
    }
  }
  console.log(`[env] ✅ Loaded ${count} vars from: ${filePath}`);
  return true;
}

async function loadEnv() {
  const cwd = process.cwd();
  const cwdEnv = join(cwd, '.env');
  let selectedPath = await Bun.file(cwdEnv).exists() ? cwdEnv : '';

  if (!selectedPath) {
    try {
      const scriptDir = dirname(new URL(import.meta.url).pathname);
      const cleanDir = scriptDir.match(/^\/[A-Za-z]:/) ? scriptDir.slice(1) : scriptDir;
      const projectEnv = join(cleanDir, '..', '..', '..', '.env');
      if (await Bun.file(projectEnv).exists()) selectedPath = projectEnv;
    } catch {}
  }

  if (!selectedPath) {
    console.warn('[env] ❌ No .env file found, using defaults');
    return;
  }
  await loadOneEnv(selectedPath);
}

await loadEnv();
