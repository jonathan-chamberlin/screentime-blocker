# Launch Morning Checklist

## 1. Final Local Checks

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\cws-preflight.ps1
node extension/tests/integration-test.js
```

## 2. Build Release Zip

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\package-extension.ps1
```

Expected output:
- `dist/brainrot-blocker-v<version>.zip`

## 3. Store Dashboard Submission

1. Open Chrome Web Store Developer Dashboard.
2. Upload zip from `dist/`.
3. Paste listing copy from `publishing-materials/01-store-listing-copy.md`.
4. Paste single-purpose and permissions from `publishing-materials/02-single-purpose-and-permissions.md`.
5. Fill privacy prompts using `publishing-materials/03-privacy-disclosure-answers.md`.
6. Add reviewer notes from `publishing-materials/04-reviewer-notes.md`.
7. Upload screenshots/icons per `publishing-materials/05-assets-checklist.md`.
8. Add URLs/contact from `publishing-materials/07-support-and-links-template.md`.

## 4. Final Submit Gate

1. Recheck permissions text in the dashboard.
2. Confirm no misleading claims about payment processing or required companion install.
3. Submit for review.
