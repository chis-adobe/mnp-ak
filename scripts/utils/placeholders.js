let cache;

async function fetchPlaceholders() {
  if (cache) return cache;
  try {
    const resp = await fetch('/placeholders.json');
    if (!resp.ok) return {};
    const json = await resp.json();
    const map = {};
    (json.data || []).forEach((row) => {
      if (row.Key) map[row.Key.toLowerCase()] = row.Value || '';
    });
    cache = map;
  } catch {
    cache = {};
  }
  return cache;
}

export async function getPlaceholder(key, fallback = '') {
  const placeholders = await fetchPlaceholders();
  return placeholders[key.toLowerCase()] || fallback;
}

export async function getPlaceholders() {
  return fetchPlaceholders();
}
