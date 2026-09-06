# Screenshare

Private two-person WebRTC screenshare. Both people can share at the same time (screen + system/tab audio when the browser allows it). There is no microphone capture.

The server only serves the page and relays signaling. Video and audio go peer-to-peer. Google public STUN is used by default.

## Local run

```bash
cp .env.example .env
```

Set `APP_PASSWORD` and `SESSION_SECRET` in `.env`, then:

```bash
npm install
npm start
```

Open http://localhost:3000 in two browser profiles (or two browsers). Screen capture works on `localhost` without HTTPS.

## Dokploy

1. Connect this repo and build with the Dockerfile.
2. Publish port `3000`.
3. Attach a domain and enable HTTPS. Browsers block screen capture on plain HTTP.
4. Set environment variables:

| Variable | Required | Purpose |
| --- | --- | --- |
| `APP_PASSWORD` | Yes | Shared login password |
| `SESSION_SECRET` | Yes | Signs the session cookie |
| `PORT` | No | Defaults to `3000` |
| `ICE_SERVERS` | No | JSON array of ICE servers if you later add TURN |

Same-origin WebSocket (`/ws`) needs no extra Traefik setting when this is a single service. `GET /health` returns `ok`.

Leave **Publish Directory** empty. This is a Node app, not a static site.

If the domain is proxied through **Cloudflare**, turn on **Network → WebSockets**. Bot Fight Mode or a WAF rule on `/ws` will also block the room. SSL/TLS should be **Full (strict)**.

## Notes

- Only two clients can sit in the room. A third login sees “Room is full.”
- Chrome and Edge on Windows can include tab or system audio from the share picker. Firefox and Safari often send video only.
- Google STUN is enough for most home networks. Symmetric NAT or locked-down networks may need a TURN server in `ICE_SERVERS`.
