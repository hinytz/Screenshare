import { state } from './state.js';
import { getJson } from './api.js';
import { setPendingRequests } from './requests.js';

export async function loadAccountState() {
  const { res, data } = await getJson('/api/account');
  if (!res.ok || !data) {
    return { user: null, pins: [], pendingJoinRequests: [], outgoingJoinRequests: [] };
  }
  state.pendingJoinRequests = data.pendingJoinRequests || [];
  state.outgoingJoinRequests = data.outgoingJoinRequests || [];
  setPendingRequests(state.pendingJoinRequests);
  return data;
}
