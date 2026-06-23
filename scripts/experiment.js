import { getMetadata } from './ak.js';

const STORAGE_PREFIX = 'mnp-experiment-';
const CONTROL = 'control';

// Read `experiment-split` metadata: comma list of percentages for the challenger
// variants (control gets the remainder). e.g. "20,20" => control 60 / v1 20 / v2 20.
function parseSplit(variantCount) {
  const raw = getMetadata('experiment-split');
  if (!raw) {
    // Even split across control + all variants.
    const even = 1 / (variantCount + 1);
    return new Array(variantCount).fill(even);
  }
  return raw.split(',').map((p) => parseFloat(p.trim()) / 100).filter((n) => !Number.isNaN(n));
}

// Variant docs come from `experiment-variants` metadata: a list of paths/URLs,
// one per challenger. Control is the current page, so it is never listed.
function parseVariants() {
  const raw = getMetadata('experiment-variants');
  if (!raw) return [];
  return raw
    .split(/[,\n]/)
    .map((v) => v.trim())
    .filter(Boolean)
    .map((v) => {
      try {
        return new URL(v, window.location.origin).pathname;
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

// Sticky, evenly-distributed assignment. Once a visitor is bucketed they stay put
// (stored per-experiment) so they get a consistent experience across visits.
function assignVariant(experiment, variants, split) {
  const key = `${STORAGE_PREFIX}${experiment}`;
  const labels = [CONTROL, ...variants.map((_, i) => `challenger-${i + 1}`)];

  let assigned;
  try {
    assigned = localStorage.getItem(key);
  } catch {
    /* storage unavailable */
  }
  if (assigned && labels.includes(assigned)) return assigned;

  // Forced assignment for QA: ?experiment=<name>/<variant-label>
  const forced = new URLSearchParams(window.location.search).get('experiment');
  if (forced) {
    const [fName, fVariant] = forced.split('/');
    if (fName === experiment && labels.includes(fVariant)) {
      try { localStorage.setItem(key, fVariant); } catch { /* ignore */ }
      return fVariant;
    }
  }

  const roll = Math.random();
  let cumulative = 0;
  assigned = CONTROL;
  for (let i = 0; i < variants.length; i += 1) {
    cumulative += split[i] ?? 0;
    if (roll < cumulative) {
      assigned = `challenger-${i + 1}`;
      break;
    }
  }

  try { localStorage.setItem(key, assigned); } catch { /* ignore */ }
  return assigned;
}

// Replace the current page's <main> with the challenger doc's <main>.
async function swapToVariant(variantPath) {
  const resp = await fetch(`${variantPath}.plain.html`);
  if (!resp.ok) return false;
  const html = await resp.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const variantMain = doc.querySelector('main') || doc.body;
  const currentMain = document.querySelector('main');
  if (!variantMain || !currentMain) return false;
  currentMain.innerHTML = variantMain.innerHTML;
  return true;
}

function reportToRUM(experiment, variantLabel) {
  // Standard experiment checkpoint so RUM/Spacecat can attribute engagement
  // (clicks are auto-tracked by the rum enhancer) to the served variant.
  const detail = { experiment, variant: variantLabel };
  document.body.dataset.experiment = experiment;
  document.body.dataset.variant = variantLabel;
  try {
    window.hlx?.rum?.sampleRUM?.('experiment', { source: experiment, target: variantLabel });
  } catch {
    /* rum not ready */
  }
  document.dispatchEvent(new CustomEvent('experiment', { detail }));
}

// Run any page-level A/B experiment BEFORE the area is decorated, so the chosen
// variant's content is what gets hydrated. No-ops when no experiment is authored.
export default async function runExperiment() {
  const experiment = getMetadata('experiment');
  if (!experiment) return;

  const variants = parseVariants();
  if (!variants.length) return;

  const split = parseSplit(variants.length);
  const variantLabel = assignVariant(experiment, variants, split);

  if (variantLabel !== CONTROL) {
    const idx = parseInt(variantLabel.replace('challenger-', ''), 10) - 1;
    const variantPath = variants[idx];
    // If the swap fails (e.g. variant missing), fall back to control silently.
    if (variantPath) {
      const ok = await swapToVariant(variantPath);
      if (!ok) {
        reportToRUM(experiment, CONTROL);
        return;
      }
    }
  }

  reportToRUM(experiment, variantLabel);
}
