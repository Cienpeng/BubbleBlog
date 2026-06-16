// Load .env file (Bun doesn't auto-load .env)
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function loadEnv() {
  // Try project root .env first, then server package .env
  const paths = [
    resolve(__dirname, '../../..', '.env'),   // project root
    resolve(__dirname, '..', '.env'),           // server package
  ];
  for (const envPath of paths) {
    if (existsSync(envPath)) {
      const content = readFileSync(envPath, 'utf-8');
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
        // Don't override existing env vars (production vars take priority)
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
      console.log(`[env] Loaded ${envPath}`);
      return;
    }
  }
  console.warn('[env] No .env file found, using defaults');
}
