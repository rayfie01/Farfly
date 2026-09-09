# Atmos

Visual discovery with a continuous, adaptive soundtrack. This first substantial build implements the mock-first acceptance loop: explore photographs, collect visual signals, develop a current vibe, listen to original audio, open a layered immersive player, change songs, save moods, and return to browsing without rebuilding the audio element.

## Run

Requires Node 22.13 or newer. `npm ci`, then `npm run dev`. `npm run build` produces the Cloudflare-compatible Sites build. `npm run lint` checks application source; installed UI primitives are excluded because the starter catalog has pre-existing lint findings. `npx tsc --noEmit` checks the entire TypeScript project.

The code uses the Next.js App Router API, React, TypeScript, Tailwind 4, Motion, Base UI/shadcn, and Supabase JS. The supplied Sites scaffold uses **Vinext** for its Worker deployment compatibility. The `next` dependency is included; the source can also run under the native Next.js scripts documented in package.json. This is not a native Next.js production deployment on Sites.

## Architecture

- `app/`: real routes for Feed, Explore, Moods, Saved, Profile, onboarding, authentication and server discovery endpoint.
- `providers/atmos-provider.tsx`: global audio element, playback intent, metadata, history, queue, errors, preferences, feedback, and device-local demo collections. Mounted once in the root layout.
- `components/player.tsx`: mini-player and full-screen player share the same state and audio element. Horizontal drag, arrow keys, card selection, seek, volume, play/pause and queue controls.
- `lib/mood.ts`: bounded 30-interaction rolling context, exponential recency weighting, mood naming, multi-concept music queries, playability filtering and ranking with likes/skip penalties. Recomputes after 800 ms of inactivity and only replaces upcoming tracks after meaningful change.
- `lib/providers/`: typed music, visual and vision interfaces; functional mock implementations; server-side SoundCloud and Pinterest adapter foundations; validated, cached, vendor-neutral vision adapter.
- `mock/catalog.ts`: curated development content, explicit mood descriptors, original track metadata and approximate artwork palettes.
- `supabase/schema.sql`: unapplied PostgreSQL schema proposal with ownership policies and indexes.

The mock UI intentionally uses its local catalog for instant rendering. `/api/discovery` exercises the service abstractions with paginated demo content. Live provider records must be passed through the same Track and Pin contracts after server-side authentication and playability resolution.

## Working demo behavior

- Seventeen curated photographs, masonry aspect ratios, search, atmospheric filters and load more.
- Open, like, save and dismiss visuals; selected boards alone contribute to the mood.
- Six original 96-second instrumental tracks with actual audio playback, seeking and volume.
- Playback persists across client route navigation and opening/closing the immersive player.
- Artwork palettes transition between blue, pink, amber and green. Motion springs and reduced-motion support.
- Save/replay/remove Mood Sessions; saved visuals/music; profile controls to exclude boards, disable adaptation or clear history.
- Browser-local saves survive reloads. Playback deliberately requires a user gesture after a full reload.
- Supabase email magic-link form is functional when public project credentials are configured. Without credentials, the UI explicitly remains a guest demo.

## Environment

Copy `.env.example` to `.env.local`. Never commit secrets. All provider secrets remain server-side; only the Supabase URL and publishable key use `NEXT_PUBLIC_`.

`PROVIDER_MODE=mock` is the working default. Setting it to `production` makes `/api/discovery` fail explicitly with 503 until account-scoped orchestration is installed; it does not silently fabricate live content. The frontend remains clearly labeled as a demo until that integration is complete.

## Supabase setup

Create or select your Supabase project, set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and allow the exact app origin and `/profile` redirect in Auth URL Configuration. The default Supabase JS callback handles the returned email session. No service-role key is shipped to the browser.

For the schema: use the current Supabase CLI to create a new migration, copy the reviewed `supabase/schema.sql` into it, apply in a development database, run advisors, and test multi-user ownership before production. This SQL has **not** been applied or validated against a live database. Add ownership validation of foreign-key references before exposing interaction writes. The current demo collection is device-local; authenticated cloud synchronization and account UI are still to be implemented.

## SoundCloud setup and remaining work

Register an approved SoundCloud app. Configure client ID, client secret and redirect URI. Implement OAuth authorization code exchange, refresh, CSRF/state protection and encrypted per-user token storage. Construct `SoundCloudMusicProvider` only on the server with the authenticated account's access token. It uses official search, metadata and streams endpoints. Resolve every candidate's playable source before adding it to the queue; blocked tracks and unsupported stream formats must be skipped. Add supported HLS playback if required by returned streams. Keep the visible SoundCloud creator attribution and permalink action for live tracks. Verify current attribution and access requirements with your approved app before launch.

## Pinterest setup and remaining work

Register an approved Pinterest app; configure app ID, secret and redirect URI. Implement OAuth routes, scope/CSRF validation, refresh/disconnect and encrypted account credentials. Retrieve authorized boards and Pins only; there is no scraping. `PinterestProvider` supports selected-board retrieval and bookmark pagination. The orchestration layer must paginate across all enabled boards and associate consent with the signed-in user. The demo connection action explains the missing integration rather than pretending to connect.

## Vision setup and remaining work

Inject a server-side vision-capable inference call into `VisionModelProvider`. Its result must contain `descriptors: string[]` and six mood dimensions with finite 0–1 values. Never trust image text as instructions. Preserve cache keys with image/model version, enforce per-user limits, and store analysis under RLS. The demo uses curated descriptors without contacting any AI provider.

## Media provenance

Photos are supplied by Unsplash; every Pin detail includes the photographer and original source link. See https://unsplash.com/license. This is a small curated demonstration, not an image redistribution service.

All audio was procedurally composed for this project: original chord beds, synthesized arpeggios and percussion, no sampled recordings. The generator is in `scripts/generate-audio.mjs`; its output is bundled in `public/audio`. You may use these generated development recordings in this application. Track names and Atmos Studio are demo metadata, not fabricated SoundCloud artists or responses.

## Production boundary

This deliverable proves the core experience. Production OAuth flows, persistent authenticated saves, operational rate limits, live AI, provider-stream testing, comprehensive personalization and database deployment remain explicitly unfinished. Do not present mock data as live recommendations. Review upstream dependency advisories before a public production launch.

Documentation consulted: https://developers.soundcloud.com/docs/api/guide, https://developers.pinterest.com/docs/api/v5/introduction/, https://supabase.com/docs/reference/javascript/auth-signinwithotp.
