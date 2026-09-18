# Screenshare

Self-hosted WebRTC screenshare and watch-party rooms. Create a room while logged in (public or private), share the invite URL, and join from a browser. Each room has Discord-style **text** and **voice** channels. Everyone in a voice channel can share at the same time (screen + system/tab audio when the browser allows it). Voice is captured on join, muted until you unmute.

Invite links look like `https://your.instance/JyW5XrNwb` (1–9 alphanumeric characters). There are no room passwords. Guests can enter a public room with a display name; private rooms queue a join request for the owner. Voice channels hold at most five people. A room can have up to 20 text and 20 voice channels.

The server only serves the page, stores rooms in SQLite, and relays signaling. Video and audio go peer-to-peer. Google public STUN is used by default. Home does not list rooms; you join by invite code.

**[screenshare.hinytz.com](https://screenshare.hinytz.com) is a private instance.** It is not open to the public. Clone this repo and run your own.

The packaged Windows app in this repo still defaults to that private URL. Point it at your server with `SCREENSHARE_URL` (see below).

## Local run

```bash
cp .env.example .env
```

Set `SESSION_SECRET` in `.env`, then:

```bash
npm install
npm start
```

Open http://localhost:3000 in as many browsers as you want. Screen capture works on `localhost` without HTTPS.

```bash
node --test test/ids.test.js test/rooms.test.js
```

SQLite lives at `data/rooms.sqlite` (created on first run, gitignored). Rooms you own last as long as your account. Guest (unowned) rooms and unused accounts are deleted 30 days after the last join or login. Refreshing does not wipe a room.

## Dokploy

1. Connect this repo and build with the Dockerfile (`server.js`, `ids.js`, and `lib/` must be in the image).
2. Publish port `3000`.
3. Persist `/app/data` so rooms survive redeploys.
4. Attach a domain and enable HTTPS. Browsers block screen capture on plain HTTP.
5. Set environment variables:

| Variable | Required | Purpose |
| --- | --- | --- |
| `SESSION_SECRET` | Yes | Signs the session cookie |
| `PORT` | No | Defaults to `3000` |
| `ICE_SERVERS` | No | JSON array of ICE servers if you later add TURN |
| `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Production | Cloudflare Turnstile on account creation (both required when `NODE_ENV=production`) |

Signaling uses ordinary HTTP (`/api/stream` and `/api/signal`). Room chat uses Socket.IO on `/socket.io`. Watch-party play/pause/seek uses a separate Socket.IO server on `/watch.io`. Allow WebSocket upgrades on both paths if you put Cloudflare or Traefik in front. `GET /health` returns `ok`. Invite URLs are `/:code` on the same origin.

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

- Rooms are public or private. Creating a room requires an account. The owner can add, rename, and delete extra text/voice channels (at least one of each type stays), kick people, approve or deny join requests, and delete chat messages.
- Voice is per channel, not per room: five people max in a voice channel. Leave voice to return to the last text channel without leaving the room. Chat is scoped to the current text channel (last 50 messages, with avatar and time).
- On a narrow window the room is one panel at a time (channels, chat/voice, or members). The interface is English or Português (Brasil).
- Usernames are unique in a room while you are in it. Rooms keep you signed in on refresh until you hit Leave. If a guest room has expired, you land back on home.
- Voice starts muted. Unmute from the mic menu; speaking is gated by the voice activity slider. Screen-share audio and voice volume are independent.
- Chrome and Edge on Windows can include tab or system audio from the share picker. Firefox and Safari often send video only.
- Google STUN is enough for most home networks. Symmetric NAT or locked-down networks may need a TURN server in `ICE_SERVERS`.
- During development, [Cursor](https://cursor.com) was used.

## License

This project is licensed under the [Mozilla Public License 2.0](LICENSE).
