# Screenshare

Self-hosted WebRTC screenshare in named password rooms. Enter a room name and password, then a display name, and share. Created rooms get a random 4-letter tag (`friends#trgf`) so the same name can exist more than once. Everyone in the room can share at the same time (screen + system/tab audio when the browser allows it). Voice is captured on join, muted until you unmute. Rooms hold at most five people.

The server only serves the page, stores rooms in SQLite, and relays signaling. Video and audio go peer-to-peer. Google public STUN is used by default. Home does not list rooms; you join by `name#tag` (or just the name for a permanent room).

**[screenshare.hinytz.com](https://screenshare.hinytz.com) is a private instance.** It is not open to the public. Clone this repo and run your own.

The packaged Windows app in this repo still defaults to that private URL. Point it at your server with `SCREENSHARE_URL` (see below).

## Local run

```bash
cp .env.example .env
```

Set `SESSION_SECRET` and optional `PERMANENT_ROOMS` in `.env`, then:

```bash
npm install
npm start
```

Open http://localhost:3000 in as many browsers as you want. Screen capture works on `localhost` without HTTPS.

SQLite lives at `data/rooms.sqlite` (created on first run, gitignored). Permanent rooms from `PERMANENT_ROOMS` are upserted on boot and never expire. Other rooms last 5 days after the last login, then are deleted. Refreshing does not wipe a room.

## Dokploy

1. Connect this repo and build with the Dockerfile.
2. Publish port `3000`.
3. Persist `/app/data` so rooms survive redeploys.
4. Attach a domain and enable HTTPS. Browsers block screen capture on plain HTTP.
5. Set environment variables:

| Variable | Required | Purpose |
| --- | --- | --- |
| `SESSION_SECRET` | Yes | Signs the session cookie |
| `PERMANENT_ROOMS` | No | JSON array of `{ "name", "password" }` rooms that are never deleted |
| `PORT` | No | Defaults to `3000` |
| `ICE_SERVERS` | No | JSON array of ICE servers if you later add TURN |

Signaling uses ordinary HTTP (`/api/stream` and `/api/signal`). Room chat uses Socket.IO on `/socket.io`. Watch-party play/pause/seek uses a separate Socket.IO server on `/watch.io`. Allow WebSocket upgrades on both paths if you put Cloudflare or Traefik in front. `GET /health` returns `ok`.

Leave **Publish Directory** empty. This is a Node app, not a static site.

## Windows app (window + app audio)

The website still works in a browser. The optional Electron app can share a **window with that app’s sound** (Windows 10 2004+). Packaged builds still load the site home (join or create a room).

```bash
npm start
cd desktop
npm install
npm run build:helper
npm run dev
```

`npm run rebuild:native` needs Visual Studio Build Tools (C++ workload). `npm run build:helper` needs the .NET 8 SDK and is only a fallback. `npm run pack` bumps the desktop app version, rebuilds native audio, and builds an NSIS installer in `desktop/dist`. Use `npm run pack:same` to rebuild without changing the version, or `npm run bump -- minor` / `npm run bump -- 1.2.0` to set it yourself. `npm run release` does the same as `pack` and uploads the installer to GitHub Releases so installed apps can update themselves. Set `GH_TOKEN` (repo scope) first. Existing installs pick up auto-update only after they install a release build once.

Unpackaged (`npm start` / `npm run dev`) loads `http://localhost:3000`. A packaged build from this repo loads `https://screenshare.hinytz.com` (private; not for public use). Override with `SCREENSHARE_URL` when you ship your own instance. Deploy the updated `public/` folder so the site matches the desktop capture path.

## Notes

- Each room is mesh WebRTC, capped at five people. Usernames are unique in that room while you are in it. Join ephemeral rooms as `name#tag`. Rooms keep you signed in on refresh until you hit Leave. If a temporary room has expired, you land back on home. The room creator can remove people and delete chat messages. Chat keeps the last 50 messages in SQLite and drops them when the room is deleted. The interface is English or Português (Brasil).
- Voice starts muted. Unmute from the mic menu; speaking is gated by the voice activity slider. Screen-share audio and voice volume are independent.
- Chrome and Edge on Windows can include tab or system audio from the share picker. Firefox and Safari often send video only.
- Google STUN is enough for most home networks. Symmetric NAT or locked-down networks may need a TURN server in `ICE_SERVERS`.
- This app was built with [Cursor](https://cursor.com) during development.

## License

This project is licensed under the [Mozilla Public License 2.0](LICENSE).
