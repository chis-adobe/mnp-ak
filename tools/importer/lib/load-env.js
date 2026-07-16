/**
 * Minimal .env loader (no dependency). Reads KEY=VALUE lines from a file and copies them
 * into process.env WITHOUT overwriting variables already set in the real environment
 * (so `DA_TOKEN=... node ...` still wins over the file).
 *
 * Supports: blank lines, `#` comments, optional `export ` prefix, single/double quotes.
 */
import { readFileSync } from 'node:fs';

export default function loadEnv(path) {
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return false; // no file — that's fine, env vars may be set another way
  }
  text.split('\n').forEach((raw) => {
    const line = raw.trim();
    if (!line || line.startsWith('#')) return;
    const eq = line.indexOf('=');
    if (eq === -1) return;
    const key = line.slice(0, eq).replace(/^export\s+/, '').trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && !(key in process.env)) process.env[key] = value;
  });
  return true;
}
