/**
 * Merge freshly-generated office blocks into an existing DA document, preserving every
 * block the importer does NOT manage.
 *
 * Rules:
 *   - Managed blocks (those present in `sections`) that already exist are replaced IN PLACE,
 *     keeping their original position in the document.
 *   - Any other section (hero, breadcrumb, form, contact-card, accordion, insights, plain
 *     content, empty divs) is left exactly as-is, in its original order.
 *   - Managed blocks that don't yet exist are appended after the existing content.
 *
 * When there is no existing document, the generated sections are emitted in order.
 */
import { parse } from 'node-html-parser';

const WRAP_OPEN = '<body>\n  <main>\n';
const WRAP_CLOSE = '\n  </main>\n</body>\n';

/** Name of the block a top-level section wraps, from its first classed child div. */
function sectionBlockName(sectionEl) {
  for (const child of sectionEl.childNodes) {
    if (child.tagName === 'DIV') {
      const cls = child.getAttribute && child.getAttribute('class');
      if (cls) return cls.trim().split(/\s+/)[0];
    }
  }
  return null;
}

/**
 * @param {string|null} existingHtml the current DA source, or null/empty if the page is new
 * @param {{name:string, html:string}[]} sections generated managed blocks, in order
 * @returns {string} merged full DA-source HTML document
 */
export default function mergeDoc(existingHtml, sections) {
  const generated = new Map(sections.map((s) => [s.name, s.html]));

  if (!existingHtml || !existingHtml.trim()) {
    return WRAP_OPEN + sections.map((s) => s.html).join('\n') + WRAP_CLOSE;
  }

  const root = parse(existingHtml);
  const main = root.querySelector('main') || root;
  const originalSections = main.childNodes.filter((n) => n.tagName === 'DIV');

  const placed = new Set();
  const out = [];
  originalSections.forEach((sec) => {
    const name = sectionBlockName(sec);
    if (name && generated.has(name)) {
      if (!placed.has(name)) { // replace first occurrence in place
        out.push(generated.get(name));
        placed.add(name);
      } // drop any duplicate managed block
    } else {
      out.push(sec.outerHTML.trim()); // preserve untouched
    }
  });

  // Append managed blocks that weren't already present, in generated order.
  sections.forEach((s) => { if (!placed.has(s.name)) out.push(s.html); });

  return WRAP_OPEN + out.join('\n') + WRAP_CLOSE;
}
