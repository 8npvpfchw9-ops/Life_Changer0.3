# OS — a personal operating system, one screen

## What this actually is
A single-page app: Today, Week, Domains (School / Business / Athlete / Spiritual / Reading / Life), Review, and More (Season, Goals, Not Now, Settings). No backend, no account, no sync — everything is saved in your iPhone's local browser storage. That's a real limitation: it lives on one device, and clearing Safari's site data wipes it. That trade-off is what makes it something you can actually run and modify yourself instead of depending on anyone else to maintain it.

## What's deliberately simplified from the original spec
- The "engines" are plain rules, not AI: capacity is a hours-logged-vs-hours-available comparison; the decision engine is a fixed set of if/then questions; anti-overcommitment is a couple of threshold checks. That's enough to force the behavior (a real NOT NOW stamp, a real cap at 2 active priorities) without needing a backend or an API key.
- Adding items (assignments, leads, athletic logs, reading queue, life notes) uses plain browser prompts, not custom forms, to keep the codebase small enough for you to actually read and change.
- No push notifications, no calendar integration, no multi-device sync. Those all require a backend and ongoing hosting costs — deliberately out of scope for a first version.

## Deploy it (pick one — both are free)

**GitHub Pages**
1. Create a new GitHub repo, upload all files in this folder (keeping `icons/` as a subfolder).
2. Repo Settings → Pages → set source to the main branch, root folder.
3. GitHub gives you a URL like `https://yourname.github.io/reponame/`.

**Netlify**
1. Go to netlify.com, sign in, and drag this whole folder onto the dashboard.
2. Netlify gives you a live URL immediately.

## Add it to your iPhone Home Screen
1. Open the deployed URL in **Safari** (must be Safari, not Chrome).
2. Tap the Share icon (square with an arrow) in the toolbar.
3. Tap **Add to Home Screen**, then **Add**.
4. Launch it from the icon — it opens full-screen, no browser chrome.

## If you want to change something
`app.js` has the state shape and every screen's render function near the top and grouped by section (TODAY, WEEK, DOMAINS, REVIEW, MORE, GOAL MODAL). `styles.css` has every color/font as a variable at the top of the file — change those and the whole app restyles.
