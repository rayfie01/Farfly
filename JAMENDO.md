# Jamendo activation

The music code is implemented. Live API access has not been tested without an application client ID.

1. Register Far.Fly in https://devportal.jamendo.com using your own account and the deployed app URL. Review the free/noncommercial API terms and permitted use. No paid subscription or commercial rights are assumed.
2. Add JAMENDO_CLIENT_ID in Vercel project Settings > Environment Variables for Production and Preview. Use the app client ID, not a password or OAuth secret. Do not use a NEXT_PUBLIC prefix. For local testing put it in the gitignored .env.local.
3. Deploy this revision with npm run build:next. Redeploy after changing environment variables.
4. Open /api/music?mood=calm: expect configured:true and Jamendo tracks. An empty catalog is distinct from missing configuration or an upstream error.
5. Open the player, play a track, seek, change volume, navigate, like it and reload Saved > Music. Check artist, source and license links in the immersive player. Test on an actual phone.
6. Interact with visuals until the mood changes: upcoming music should adapt without interrupting the current song. Confirm Pinterest remains independent.

Only streaming URLs are used. No downloads are offered. The public endpoint accepts only six mood names; metadata is cached for five minutes per server instance and concurrent requests are deduplicated. For high traffic, add a shared rate limiter/platform firewall rule. Do not log upstream request URLs containing the client ID. Demo tracks remain available if configuration is absent; failures retain existing music and report status in the expanded player.
