# Habitat

Habitat is a React/Vite client with an Express/Mongoose API. The client uses the existing cinematic experience UI; server-side API keys and application settings stay on the backend.

## Local development

1. Copy `server/.env.example` to `server/.env` and set `MONGO_URI` (or `MONGODB_URI`) and `JWT_SECRET` (or `SESSION_SECRET`).
2. Install dependencies in `server` and `client` with `npm install`.
3. Start the API from `server` with `npm run dev` and the client from `client` with `npm run dev`.
4. The client uses `http://localhost:5000/api` on localhost. Set `client/.env` to `VITE_API_URL=https://<your-render-service>.onrender.com/api` only when you need to override the deployed API address.

Set `CLIENT_URL` or comma-separated `CLIENT_URLS` on the API if your client origin is not localhost or a Vercel deployment.

If Atlas reports `querySrv ECONNREFUSED`, the local DNS resolver is refusing the SRV query. Confirm the cluster is active and test it with `nslookup -type=SRV _mongodb._tcp.<cluster-host>.mongodb.net`. If that lookup fails, set `DNS_SERVERS=8.8.8.8,1.1.1.1` in `server/.env` and rerun the bootstrap command. You can also copy Atlas's non-SRV (`mongodb://`) application URI. This project reads `DNS_SERVERS` for both the API and the bootstrap script.

## Nutrition providers

Set `AI_PROVIDER=gemini` or `AI_PROVIDER=groq`, and configure the matching server-only `GEMINI_API_KEY` or `GROQ_API_KEY`. Optional model overrides are `GEMINI_MODEL` (defaults to `gemini-3.8-flash`) and `GROQ_MODEL` (defaults to `openai/gpt-oss-20b`). Keys must only be set in the API host's environment; never add them to `client/.env`, Vercel variables, or browser code. An administrator can switch between configured providers in `/admin`; the selection is stored in MongoDB and applies to future analysis requests.

## Initialize the first administrator

Set `ADMIN_BOOTSTRAP_SECRET` to a random value of at least 32 characters in the environment used to run the one-time bootstrap command. `ADMIN_INITIAL_PASSWORD` defaults to the requested temporary value `admin`; you can use a stronger temporary password instead. Run `npm run bootstrap-admin` from `server` and enter the bootstrap secret at the prompt. The command creates `admin@admin.com` only if it does not already exist. It does not reset an existing password or role. The initial account must change its password before any admin API is available. Do not run this script on every server start.

The bootstrap command needs access to the same MongoDB database as the API. Once the administrator exists, the bootstrap secret can be removed from the runtime environment. A normal signup always receives the `user` role.

## Checks

- Client production build: `npm run build` from `client`.
- Client lint: `npm run lint` from `client`.
- Server tests: `npm test` from `server`.
- Server syntax check: `node --check server.js` and check changed server modules with `node --check`.

Timezone-aware historical queries derive each date boundary using the requested IANA timezone. Existing food entries without a stored `localDate` are read by their timestamp in the selected timezone; no historical record rewrite is required.
