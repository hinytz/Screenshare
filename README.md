# Screenshare

Private WebRTC screenshare. Anyone with the password can join. Everyone can share at the same time (screen + system/tab audio when the browser allows it). There is no microphone capture.

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

Open http://localhost:3000 in as many browsers as you want. Screen capture works on `localhost` without HTTPS.

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

Signaling uses ordinary HTTP (`/api/stream` and `/api/signal`), so Cloudflare and Traefik do not need WebSocket support. `GET /health` returns `ok`.

Leave **Publish Directory** empty. This is a Node app, not a static site.

## Windows app (window + app audio)

The website still works in a browser. The optional Electron app can share a **window with that app’s sound** (Windows 10 2004+).

```bash
npm start
cd desktop
npm install
npm run build:helper
npm run dev
```

`npm run build:helper` needs the .NET 8 SDK. `npm run pack` builds the helper and an NSIS installer in `desktop/dist`.

Unpackaged (`npm start` / `npm run dev`) loads `http://localhost:3000`. The packaged app loads `https://screenshare.hinytz.com`. Override with `SCREENSHARE_URL`. Deploy the updated `public/` folder so the site matches the desktop capture path.

## Notes

- There is no join cap. Each browser connects mesh-style to the others.
- Chrome and Edge on Windows can include tab or system audio from the share picker. Firefox and Safari often send video only.
- Google STUN is enough for most home networks. Symmetric NAT or locked-down networks may need a TURN server in `ICE_SERVERS`.
