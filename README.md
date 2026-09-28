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

### Clinical Triage Scenarios & Visual Polish

The ledger includes medically accurate first aid and emergency response scenarios:
- **Anaphylaxis (Maya, 22)**: First-line intramuscular epinephrine administration in the lateral thigh vs oral antihistamine delay.
- **Opioid Overdose (Marcus, 31)**: Nasal naloxone (Narcan) rescue and ventilation vs fatal folk remedies.
- **Arterial Hemorrhage (Devon, 38)**: Rapid windlass tourniquet placement above the wound vs dangerous loose ligatures.
- **Severe Hypoglycemia (Clara, 62)**: Nasal/injectable glucagon for neuroglycopenia with impaired swallow reflex vs inappropriate insulin.
- **Acute Coronary Syndrome (Arthur, 64)**: Chewed non-enteric aspirin, seated rest, and emergent cath lab routing vs "cough CPR" and delays.
- **Septic Shock (Teresa, 79)**: 1-hour emergent sepsis protocol (blood cultures, broad-spectrum antibiotics, IV fluids) vs outpatient clinic delays.

**Visual and Accessibility Enhancements**:
- **Score Feedback Glow**: Keyframed `@keyframes correctGlow` and `@keyframes choiceGlow` provide immediate luminous feedback on good triage decisions.
- **Timer Urgency Pulse**: The Reaper figure adopts an animated pulse (`@keyframes timerPulse`) whenever proximity exceeds 65%, visually signaling critical urgency.
- **Accessible ARIA Standards**: All interactive buttons, action choices, and screen sections provide descriptive `aria-label`, `role="region"`, and `aria-live="polite"` tags for screen readers.

## Development checks

Run the dependency-free regression suite with Node.js 20 or newer:

```bash
node --test tests/*.test.js
```

In the shared development workspace, run it through the dev container:

```powershell
docker compose -f ../compose.yaml run --rm --no-deps dev node --test ReaperDelay/tests/game.test.js
```

The suite covers game completion, repeated input, timer defeat, generated-case
validation, and offline-cache ownership. Completing a shift records it once;
a losing choice keeps the end screen visible. The service worker preserves
other projects' caches on the same GitHub Pages origin.

## GitHub Pages

Already on: Settings → Pages → Deploy from branch `main` / root.
If the link ever 404s, turn that setting back on. Files needed at repo root: `index.html`, `styles.css`, `app.js`, `ai.js`, `content.js`, `sw.js`, `manifest.json`.
