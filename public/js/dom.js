export const el = new Proxy({}, {
  get(_target, key) {
    if (typeof key !== 'string') return undefined;
    const id = key.replace(/[A-Z]/g, (ch) => `-${ch.toLowerCase()}`).replace(/^-/, '');
    return document.getElementById(id);
  },
});

export function byId(id) {
  return document.getElementById(id);
}
