/**
 * Turn an office name / city into a URL slug matching the /offices/{slug} convention.
 * e.g. "Bécancour" -> "becancour", "Val-d'Or (1133 3e Avenue)" -> "val-dor-1133-3e-avenue"
 * @param {string} value
 * @returns {string}
 */
export default function slugify(value) {
  return (value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .toLowerCase()
    .replace(/['’]/g, '') // drop apostrophes entirely (d'Or -> dor)
    .replace(/[^a-z0-9]+/g, '-') // everything else -> hyphen
    .replace(/^-+|-+$/g, '') // trim leading/trailing hyphens
    .replace(/-{2,}/g, '-'); // collapse repeats
}
