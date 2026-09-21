# Reaper Delay

Educational browser game. You are the night clerk. People, animals, and things arrive on the ledger. Choose the action that delays the Grim Reaper.

## Play now

**Live on GitHub Pages (phone, tablet, desktop):**
[https://dylanstechmann.github.io/ReaperDelay/](https://dylanstechmann.github.io/ReaperDelay/)

On iPhone or Android: open that link, then **Add to Home Screen**. After the first load, the service worker keeps the core game offline.

Related atlas: [https://dylanstechmann.github.io/anagen/](https://dylanstechmann.github.io/anagen/)

## Play locally

Open `index.html`, or from this folder:

```bash
python3 -m http.server 8765
```

Then visit `http://localhost:8765`.

## How it plays

Eight cases per shift. The Reaper creeps every second. Good answers push the figure back.
This is a teaching toy, not medical, veterinary, or professional advice.
In a real emergency call local emergency services. In the U.S., 988 is the Suicide & Crisis Lifeline.

## Optional cheap AI

Off by default. In-game **AI (optional)** stores an OpenRouter key only in this browser.
Do not commit API keys.

## GitHub Pages

Already on: Settings → Pages → Deploy from branch `main` / root.
If the link ever 404s, turn that setting back on. Files needed at repo root: `index.html`, `styles.css`, `app.js`, `ai.js`, `content.js`, `sw.js`, `manifest.json`.
