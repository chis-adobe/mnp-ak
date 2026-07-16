/**
 * Thin client for the DA source API (create/update documents) and the AEM admin API
 * (preview + publish). Requires Node 18+ for global fetch / FormData / Blob.
 *
 * Auth: pass an IMS bearer token. Get one from da.live while signed in via the browser
 * devtools (Application > Local Storage, or the `nx-ims` token), and export it as DA_TOKEN.
 */

const DA_SOURCE = 'https://admin.da.live/source';
const AEM_ADMIN = 'https://admin.hlx.page';

export function createClient({
  org = 'chis-adobe',
  repo = 'mnp-ak',
  ref = 'main',
  token = process.env.DA_TOKEN,
} = {}) {
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  /**
   * Read a source document. Returns null if it doesn't exist yet.
   * @param {string} path web path without extension, e.g. "/offices/abbotsford"
   * @returns {Promise<string|null>}
   */
  async function getSource(path) {
    const url = `${DA_SOURCE}/${org}/${repo}${path}.html`;
    const res = await fetch(url, { headers: authHeaders });
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`getSource ${path} -> ${res.status} ${res.statusText}: ${await res.text()}`);
    }
    return res.text();
  }

  /**
   * Create/overwrite a source document.
   * @param {string} path web path without extension, e.g. "/offices/abbotsford"
   * @param {string} html full DA-source HTML document
   */
  async function putSource(path, html) {
    const url = `${DA_SOURCE}/${org}/${repo}${path}.html`;
    const form = new FormData();
    form.append('data', new Blob([html], { type: 'text/html' }));
    const res = await fetch(url, { method: 'POST', headers: authHeaders, body: form });
    if (!res.ok) {
      throw new Error(`putSource ${path} -> ${res.status} ${res.statusText}: ${await res.text()}`);
    }
    return res.json().catch(() => ({}));
  }

  /** POST a preview or live action to the AEM admin API. */
  async function publishAction(action, path) {
    const url = `${AEM_ADMIN}/${action}/${org}/${repo}/${ref}${path}`;
    const res = await fetch(url, { method: 'POST', headers: authHeaders });
    if (!res.ok) {
      throw new Error(`${action} ${path} -> ${res.status} ${res.statusText}: ${await res.text()}`);
    }
    return res.json().catch(() => ({}));
  }

  const preview = (path) => publishAction('preview', path);
  const publish = (path) => publishAction('live', path);

  return {
    org, repo, ref, hasToken: !!token, getSource, putSource, preview, publish,
  };
}
