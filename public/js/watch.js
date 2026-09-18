import { state } from './state.js';

export function watchAllowsSync(watch) {
  if (!watch) return false;
  return watch.sourceType === 'youtube' || watch.sourceType === 'media' || watch.sourceType === 'hls';
}

export function setWatchState(watch) {
  state.watch = watch || null;
  return state.watch;
}
