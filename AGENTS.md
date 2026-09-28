# Agent instructions — ReaperDelay

Open this repo only when the user named it. Educational browser game. Not medical advice. The in-game note already points at local emergency services and, in the U.S., 988.

## Do not

- Add real treatment protocols, drug names as “correct” answers, or anti-aging stacks.
- Remove the 988 / emergency line from the README or game copy.
- Commit an OpenRouter key. The optional AI path keeps the key in the browser only.
- Let generated cases skip the validator (four choices, finite scores, one best, one good).

## First commands

```bash
node --test tests/*.test.js
```

## Improve, in this order

1. Keep `node --test` green.
2. Allowed: one content or validator fix. Malformed saved cases must still be skipped so the built-in game runs.
3. Do not merge this with `anagen` or the science repos beyond the existing “related atlas” link.

## Done when

`node --test tests/*.test.js` passes.
