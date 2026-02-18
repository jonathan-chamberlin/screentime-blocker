# Publishing Materials

Copy/paste templates for Chrome Web Store submission.

## Files

1. `01-store-listing-copy.md`
2. `02-single-purpose-and-permissions.md`
3. `03-privacy-disclosure-answers.md`
4. `04-reviewer-notes.md`
5. `05-assets-checklist.md`
6. `06-launch-morning-checklist.md`
7. `07-support-and-links-template.md`

## How To Use

1. Run preflight:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\cws-preflight.ps1
```

2. Build release zip:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\package-extension.ps1
```

3. In Chrome Web Store Dashboard, fill each section using the corresponding file above.
