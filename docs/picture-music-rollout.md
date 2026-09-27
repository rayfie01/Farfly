# Picture-selected Spotify recommendations

Implemented and deployed on main in e775f27.

- Only opening a picture selects its aesthetic mood. Scrolling, saves and likes do not change it.
- Classification uses local pixels/dominant colour and title/tags, with metadata fallback when pixels cannot be read. It is a heuristic, not semantic AI or a measure of the viewer's feelings.
- Authenticated Spotify search uses two curated style queries, deduplicates and filters unavailable/local/restricted tracks, caps suggestions at 15. Actual result count may be lower.
- Picture selection never calls playback APIs. Recommendations and current playback are separate. The current song is pinned to the centre with fresh suggestions around it.
- Next chooses the next item in the latest suggestions. Natural-end detection advances from the last near-end SDK state; tested with unit cases, not yet verified through an entire live track.
- Cancelled/stale searches cannot overwrite a newer selection. Errors preserve the current song and previous suggestions.
- Spotify connection uses an explicit JSON request and validates the authorization URL before navigating. Existing form redirect behavior remains supported by the server. OAuth account binding is retained.

Validation:
- Full npm test, lint and Next production build passed.
- Live Far.Fly OAuth returned connected and SDK ready for the signed-in account.
- Ocean picture produced 14 distinct Spotify suggestions. Forest picture replaced them while Evergreen remained current and playback advanced from 4 to 21 seconds; screenshot confirmed centred current artwork with new songs on both sides.
- Next selected Woke Up With The Feeling from the new suggestions.
- Embedded browser reported playback_error on initial starts; explicit Play worked and advanced the SDK clock. User previously confirmed regular Chrome playback. Do not claim audible output or full natural-end verification from this test.
- Spotify policy approval for the complete visual-recommendation use case has not been established. No automatic song change is tied to picture clicks.


## September 27 follow-up
- Pinterest sign-in uses a JSON response plus explicit browser navigation, retaining server-side OAuth state and account binding. Errors are visible. Personal home-feed retrieval is not implemented: current access supports boards and Pins.
- Mood estimation remains local colour/caption heuristics, not vision AI. Existing mood tags have reduced weight; coffee/cafe scenes favour warm and calm, and monochrome colours no longer imply warmth. Users can correct the estimate in picture details.
- Spotify discovery rotates six styles per mood and paginates search results, two requests per batch, up to 30 batches. Discover more appends unique tracks without changing playback. Results are search-based estimates, not Spotify audio-feature matching or access to its entire catalog.
- Validation: full tests, lint and Next.js production build pass. Live deployment verification recorded separately.

