// Load .env file (Bun doesn't auto-load .env)
import { join, dirname } from 'path';

function tryLoadEnv(filePath: string): boolean {
  const file = Bun.file(filePath);
  if (!file.exists) return false;

  const content = file.textSync?.() || '';
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
    // Don't override existing env vars (system/production vars take priority)
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
  console.log(`[env] ✅ Loaded: ${filePath}`);
  return true;
}

// Walk up from CWD and from the script's location, looking for .env
function loadEnv() {
  // Paths to try, starting from most likely
  const cwd = process.cwd();
  const paths: string[] = [];

  // Walk up from CWD
  let dir = cwd;
  for (let i = 0; i < 5; i++) {
    paths.push(join(dir, '.env'));
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  // Also try script-relative paths via import.meta
  try {
    const scriptDir = dirname(new URL(import.meta.url).pathname);
    // On Windows, remove leading slash from /D:/path
    const cleanDir = scriptDir.match(/^\/[A-Za-z]:/)
      ? scriptDir.slice(1)
      : scriptDir;
    let sDir = cleanDir;
    for (let i = 0; i < 4; i++) {
      const p = join(sDir, '.env');
      if (!paths.includes(p)) paths.push(p);
      const parent = dirname(sDir);
      if (parent === sDir) break;
      sDir = parent;
    }
  } catch {}

  console.log(`[env] Searching for .env, CWD: ${cwd}`);

  for (const p of paths) {
    if (tryLoadEnv(p)) return;
  }

  console.warn(`[env] ❌ No .env found. Tried: ${paths.join(', ')}`);
  console.warn('[env] Using hardcoded defaults — DB connection will likely fail');
}

loadEnv();
