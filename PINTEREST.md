# Pinterest connection
Status: code prepared; live API access requires Pinterest trial approval. SoundCloud is on hold.

## Activation after approval
1. In the Pinterest developer portal, manage Far.Fly app 1610004 and confirm trial access is approved.
2. Register exactly https://farfly.vercel.app/api/pinterest/callback as a redirect URI.
3. In Vercel production environment settings, set PINTEREST_APP_ID, PINTEREST_APP_SECRET, PINTEREST_REDIRECT_URI, and PINTEREST_SESSION_KEY (32 random bytes encoded as 64 hex characters).
4. Set PINTEREST_ENABLED=true and redeploy. Leave PROVIDER_MODE=mock: Pinterest uses its own routes while music remains the original demo collection.
5. Open /pinterest on the production domain, connect with the developer account, select boards, and test Pins, pagination, disconnection, declined consent, expired access and rate limits.
6. Do not enable unapproved audience access. Trial testing is initially for the developer account; confirm Pinterest's permitted testers/access rules before adding users.

## Session and data design
- OAuth state is random, encrypted, expires in 10 minutes, and must match the initiating browser cookie.
- Only boards:read and pins:read are requested; secret-board scopes are not requested.
- The server validates the configured origin for mutations and the callback. Preview deployments cannot use the production callback.
- Access tokens use AES-256-GCM encrypted HttpOnly SameSite=Lax session cookies, Secure on HTTPS, scoped to /api/pinterest. Payloads expire after at most one hour; refresh tokens are discarded.
- No token database, shared user cache or persistent Pinterest content storage. Reloading discards imported Pin metadata and board selection. A browser session cookie may survive browser session restoration until its server-checked expiry.
- Disconnect clears the cookie and in-memory Pinterest visuals/activity. Revocation at Pinterest is a separate user action.
- Pinterest Pin images are restricted to HTTPS pinimg.com subdomains. Pins link back to Pinterest.
- Themes use simple local rules over Pin text; no external AI calls. Existing music is unchanged.
- Saved soundtrack sessions retain derived mood and original audio selections, not Pinterest Pin metadata.
- All authenticated API responses use private, no-store. Do not add credential or response-body logging. Hosting infrastructure may retain request metadata; never share callback URLs containing authorization codes.

## Routes
POST /api/pinterest/connect starts authorization.
GET /api/pinterest/callback exchanges the validated code.
GET /api/pinterest/connection returns non-secret configuration/session status.
POST /api/pinterest/connection disconnects this browser.
GET /api/pinterest/boards?cursor=... lists a board page.
GET /api/pinterest/pins?board=...&cursor=... lists a Pin page.

## Validation
npm test includes server-flow tests with mocked Pinterest responses (not live approval).
npm run lint
npm run build:next
npm run build verifies the existing alternate hosting build.
Live Pinterest authorization remains unverified until approval and real credentials are available.
