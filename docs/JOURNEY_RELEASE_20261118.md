# Journey UI release candidate, 2026-11-18

Base: d3c962ac157eeac269d2aaddf0bbda8cf57675cd.

Updates: responsive illustrated course map, parchment profile, character selection and archetype result, journey landing and all course task screens, attributed profession income examples, clarified archetype-guide button. Existing scoring and backend authorization remain unchanged.

## Deployment boundary

This branch alone is not a complete production rollout. The normal public build excludes the protected course. Run `npm run build:server` from this same commit and release the matched server function package using the existing verified Orienta configuration, service account, secrets and database. Preserve the previous active backend version and frontend commit for rollback. Do not modify the Novatoria resources.

Timeweb frontend: existing Orienta app, Node.js 24, `npm run build`, output `dist`, preserve the existing `VITE_PROGRESS_API_URL`. The application is hosted at the domain root; the new illustration URLs use `/design/`.

Never publish local audit entry points, `dist-audit`, private files, test fixtures or credentials. No production deployment or cloud-account provisioning is performed by this commit. Telegram, payments and security settings are not activated or changed.

Before switching production, recheck the provider incident, active production changes and rollback. After coordinated release, use synthetic data to test one personal code, all five stages, saved progress, profile and AI. Issue the requested group codes only after that live acceptance succeeds.

## Local verification

97 unit tests, TypeScript, normal public build, server build, protected-bundle guard, SSR and public browser flow passed. Isolated course UI checks passed across 36 states at widths 320/390/768/1280, with visual review of all mobile phases. Full isolated course flow passed 20 checks. These tests do not establish live production AI, actual lesson-media availability or real cloud persistence.
