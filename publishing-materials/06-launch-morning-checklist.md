# Launch Morning Checklist

## 1. Final local checks

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\cws-preflight.ps1
node extension/tests/integration-test.js
```

## 2. Build release zip

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\package-extension.ps1
```

Output:
- `dist/brainrot-blocker-v<version>.zip`

## 3. Store dashboard submission

1. Open Chrome Web Store Developer Dashboard.
2. Upload the zip from `dist/`.
3. Paste listing text from `publishing-materials/01-store-listing-copy.md`.
4. Paste single-purpose/permission text from `publishing-materials/02-single-purpose-and-permissions.md`.
5. Fill privacy fields using `publishing-materials/03-privacy-disclosure-answers.md`.
6. Add reviewer note text from `publishing-materials/04-reviewer-notes.md`.
7. Upload screenshots/icons per `publishing-materials/05-assets-checklist.md`.
8. Add support and policy URLs from `publishing-materials/07-support-and-links-template.md`.

## 4. Final submit gate

1. Re-read permission justifications in dashboard.
2. Confirm no misleading claims (especially payments and companion app requirements).
3. Submit for review.

