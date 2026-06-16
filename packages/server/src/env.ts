// Load .env files (Bun doesn't auto-load .env)
// Loads ALL found .env files — later ones override earlier ones
// Priority: CWD/.env < parent/.env < ... < root/.env
import { join, dirname } from 'path';

function loadOneEnv(filePath: string): boolean {
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
    // Later files override earlier ones (so root .env wins over server/.env)
    process.env[key] = value;
    count++;
  }
  console.log(`[env] ✅ Loaded ${count} vars from: ${filePath}`);
  return true;
}

// Walk UP from CWD to root, collecting all .env files
// Load from bottom-to-top so root .env overrides nested ones
async function loadEnv() {
  const cwd = process.cwd();
  let dir = cwd;
  const envFiles: string[] = [];

  // Collect .env files from CWD up to filesystem root (or 5 levels)
  for (let i = 0; i < 6; i++) {
    const envPath = join(dir, '.env');
    const file = Bun.file(envPath);
    if (await file.exists()) {
      envFiles.push(envPath);
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  console.log(`[env] Searching from CWD: ${cwd}`);

  if (envFiles.length === 0) {
    // Fallback: try script-relative path
    try {
      const scriptDir = dirname(new URL(import.meta.url).pathname);
      const cleanDir = scriptDir.match(/^\/[A-Za-z]:/) ? scriptDir.slice(1) : scriptDir;
      const rootEnv = join(cleanDir, '..', '..', '..', '.env');
      if (await Bun.file(rootEnv).exists()) {
        envFiles.push(rootEnv);
      }
    } catch {}
  }

  if (envFiles.length === 0) {
    console.warn('[env] ❌ No .env file found, using defaults');
    return;
  }

  // Reverse so root-level loads LAST (highest priority)
  envFiles.reverse();

  for (const p of envFiles) {
    await loadOneEnv(p);
  }
}

await loadEnv();
