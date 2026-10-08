# Private Call on Cloudflare (free, no card, never sleeps)

Files (keep the folders exactly like this):
- wrangler.jsonc
- package.json
- src/worker.js
- public/index.html

## Put it online
1. GitHub: make a new repository, then Add file > Upload files, and drag in everything above (the `src` and `public` folders too).
2. Make a free Cloudflare account at dash.cloudflare.com/sign-up (email and password; no card).
3. In the dashboard open Workers & Pages, find Import a repository, press Get started, connect GitHub and pick your repository.
4. Keep the Worker name as `private-call` (it must match `name` in wrangler.jsonc, or the build fails). Leave the build command empty and the deploy command as `npx wrangler deploy`, then press Save and Deploy.
5. Cloudflare shows your address, like `https://private-call.YOURNAME.workers.dev`. Open it and start a call.

## Using it
Press Start video call or Start voice call, copy the link, and send it only to the person you want. A room holds two people, so nobody else can join once you are both in.

## If a call won't connect on some networks
Add a free TURN server to the `ICE` list near the top of the script in `public/index.html`.
