# Local integration acceptance

Status: preparation only. Do not deploy this branch without review.

## Sources
- Functional base: 3c3e38c (remote equivalent 2c6c4fe), protected profile/course delivery.
- Visual base: designer branch codex/orienta-design-v5-20261115, final illustration commit pending.
- Keep approved data/testChoices.ts and stable answer IDs, never restore the designer's old inline choices.

## Merge boundaries
- Take visual assets, adventureArt, scoped design.css and layout changes.
- Keep FreeEntry routing to ProfileShell, explicit intro transfer, truthful local/server storage messages.
- Keep backend authorization, registration gates, Telegram verification and public bundle boundary unchanged.
- Do not import App/course datasets into the public UI. No automatic paid access for free profiles.
- Keep existing pilot access and no overwriting saved profiles.
- Paid course visual redesign is not in this change.

## Acceptance
1. Unit suite, typecheck and SSR.
2. Public and backend builds, protected-build corpus guard.
3. Clean-browser intro: choose character and pseudonym, all five questions, result, guide, camp.
4. Reload and unfinished-test continuation with unchanged saved scores.
5. New free profile, explicit result transfer, reload, second-context code login.
6. Free profile cannot fetch protected course or AI; server denial has no materials.
7. Synthetic pilot login loads real protected module; progress save and reload.
8. Mobile widths 320 and 390: no horizontal overflow; badges centered, scenes/portraits load.
9. No real children, credentials, payment calls, live DB or bot used in QA.
10. User review before deployment. Telegram production, legal consent and payment remain separate activation steps.

## QA isolation
Use a separate copy with the already verified same-process Vite synthetic API middleware.
Never commit or deploy that middleware: its store, pilot code and trusted IP are test-only.
Do not reuse real YDB/API credentials. Preview infrastructure is shared; coordinate with designer.

## Verified integration, 2026-11-15
- Merged design UX cd0b63f and final artwork 8e1904b into protected profile base.
- 97/97 unit tests, TypeScript, SSR, public build, backend build and paid-corpus public-bundle guard passed.
- Real cloud browser, synthetic same-origin API: elf pseudonym -> all 5 questions -> Creator -> guide -> camp. Reload after Q1 restored Q2.
- Free registration -> explicit result transfer -> reload -> new-tab code login retained Creator and pseudonym. Course button remained unavailable.
- Synthetic legacy learner retained entitlement; real backend-provided Blob module opened the five-stage course, saved status shown.
- Mobile camp: iframe viewport320 gives body310/scroll310;390 gives380/380. All four visible camp images loaded. This is layout testing, not physical-device testing.
- Fixed integration-only navigation link contrast and separate footer link spacing.
- Prepared cloud-browser review handoff; no production deploy, payment, real YDB or Telegram connection used.
- Screenshot file export was unavailable because the browser runtime filesystem is read-only; screenshots were displayed live. Full-page screenshot timed out; viewport capture worked.

Still not verified: real Telegram token/bot deployment, production YDB registration/gateway, all paid lessons/media end-to-end, actual physical devices. Existing public source history remains readable. Payment is not connected. Test-only middleware remains outside this tracked checkout.
