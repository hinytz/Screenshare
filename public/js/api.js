import { t } from '../i18n.js';

export async function readError(res, fallback) {
  try {
    const data = await res.json();
    if (data && data.code) return t(data.code);
    if (data && data.error) return data.error;
  } catch {
    // ignore
  }
  return fallback;
}

export async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body || {}),
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { res, data };
}

export async function getJson(url) {
  const res = await fetch(url, { credentials: 'same-origin' });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { res, data };
}
