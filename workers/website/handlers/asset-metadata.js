/*
 * Copyright 2026 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

// Only proxy AEM Assets delivery hosts, never an arbitrary origin (SSRF guard).
const DELIVERY_HOST = /^delivery-p\d+-e\d+\.adobeaemcloud\.com$/;
const ASSET_ID = /(urn:aaid:aem:[0-9a-f-]+)/i;

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };

// Metadata values can be plain strings, arrays, or localized objects; flatten to text.
const toText = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return toText(value[0]);
  if (typeof value === 'object') return toText(value.value ?? value['@value']);
  return String(value);
};

export default async function fetchAssetMetadata({ savedSearch }) {
  const params = new URLSearchParams(savedSearch);
  const assetUrl = params.get('url');
  if (!assetUrl) {
    return new Response(JSON.stringify({ error: 'missing url param' }), { status: 400, headers: JSON_HEADERS });
  }

  let target;
  try {
    target = new URL(assetUrl);
  } catch {
    return new Response(JSON.stringify({ error: 'invalid url' }), { status: 400, headers: JSON_HEADERS });
  }

  if (!DELIVERY_HOST.test(target.hostname)) {
    return new Response(JSON.stringify({ error: 'host not allowed' }), { status: 403, headers: JSON_HEADERS });
  }

  const assetId = target.pathname.match(ASSET_ID)?.[1];
  if (!assetId) {
    return new Response(JSON.stringify({ error: 'no asset id' }), { status: 400, headers: JSON_HEADERS });
  }

  const metaUrl = `${target.origin}/adobe/assets/${assetId}/metadata`;
  const resp = await fetch(metaUrl, { cf: { cacheEverything: true, cacheTtl: 3600 } });
  if (!resp.ok) {
    return new Response(JSON.stringify({ error: 'metadata fetch failed', status: resp.status }), { status: 502, headers: JSON_HEADERS });
  }

  const json = await resp.json();
  const md = json.assetMetadata || json.repositoryMetadata || json;
  const title = toText(md['dc:title']);
  const description = toText(md['dc:description']);

  return new Response(JSON.stringify({ title, description }), {
    headers: { ...JSON_HEADERS, 'cache-control': 'max-age=3600' },
  });
}
