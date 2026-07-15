import { subscribe } from '../../rules/index.js';

/**
 * Element Value — renderer counterpart for the AEM Forms "Element Value" component
 * (apps/aemformsdemo/.../adaptiveForm/elementvalue).
 *
 * The AEM component authors a read-only, hidden field and emits, in the model JSON:
 *   - `:type` = "element-value"            (from fd:viewType — matched in mappings.js)
 *   - `properties.selector` = CSS selector (a custom, non-reserved node property)
 *
 * This decorator finds the element on the surrounding page matched by that selector
 * and fills the field with the element's text content.
 */

const MAX_RETRIES = 15;
const RETRY_INTERVAL_MS = 200;

function readText(el) {
  return (el?.textContent || '').trim();
}

/**
 * Resolves the target element, preferring a match outside this form so the field
 * never reads itself.
 */
function findElement(selector, fieldDiv) {
  if (!selector) return null;
  let matches;
  try {
    matches = [...document.querySelectorAll(selector)];
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(`[element-value] Invalid selector "${selector}":`, e.message);
    return null;
  }
  if (matches.length === 0) return null;
  const form = fieldDiv.closest('form');
  return matches.find((m) => !form || !form.contains(m)) || matches[0];
}

export default async function decorate(fieldDiv, fieldJson, container, formId) {
  const selector = fieldJson?.properties?.selector;

  // Populated from the surrounding page; authored hidden.
  fieldDiv.classList.add('element-value-field');

  const apply = (model, attempt = 0) => {
    if (!selector) return;
    const el = findElement(selector, fieldDiv);
    if (el) {
      const value = readText(el);
      const input = fieldDiv.querySelector('input, textarea');
      if (input) input.value = value;
      try {
        // Sync to the model so the value stays consistent (and would be submitted).
        model.value = value;
      } catch (e) {
        // read-only models may reject a programmatic value; the input is already set.
      }
      return;
    }
    if (attempt < MAX_RETRIES) {
      setTimeout(() => apply(model, attempt + 1), RETRY_INTERVAL_MS);
    } else {
      // eslint-disable-next-line no-console
      console.warn(`[element-value] No element matched selector "${selector}".`);
    }
  };

  subscribe(fieldDiv, formId, (el, model, eventType) => {
    if (eventType === 'register' && model) {
      apply(model);
    }
  }, { listenChanges: false });

  return fieldDiv;
}
