# Privacy Disclosure Answers (Draft)

Use this file to fill the Chrome Web Store Data usage questionnaire.

## Data Usage Checkboxes (recommended for current build)

Select:

- Personally identifiable information
- Authentication information
- Web history
- User activity

Do not select:

- Health information
- Financial and payment information
- Personal communications
- Location
- Website content

## Why these are selected

`Personally identifiable information`
- Optional sign-in can involve profile identifiers (for example display name/profile image).

`Authentication information`
- Optional sign-in uses authentication tokens/credentials flow.

`Web history`
- The extension evaluates visited domains/URLs to enforce blocking and productivity logic.

`User activity`
- The extension tracks focus-session state, timer progression, and blocked-attempt/session metrics.

## Why these are not selected

`Health information`
- Not collected.

`Financial and payment information`
- Not collected. Penalty features are reminder-only and do not process payments.

`Personal communications`
- Not collected.

`Location`
- Not collected.

`Website content`
- The extension does not collect page content (text/images/video bodies) as a product data category.

## Remote Code Question

Answer:

- `No, I am not using remote code`

Reason:

- Chrome defines remote hosted code as executable JS/Wasm loaded from outside the extension package.
- Current extension logic is packaged locally (Manifest V3), and release preflight validates no remote JS references.
- External data/API calls are not remote executable code.

## Data Use Summary Text (for free-form fields)

Brainrot Blocker uses user-configured settings plus browsing/session context to block distracting sites during focus sessions, run timers, and unlock earned break time. Optional sign-in enables leaderboard/account features, and optional companion mode reads local desktop process names for app tracking/blocking. The extension does not collect payment data, health data, personal communications, website content, or location data.

## User Controls

- Extension-only mode works without companion app install.
- Users can sign out to disable account-linked features.
- Users can clear local extension data from Settings (Delete All Data) or by removing extension data.
- Delete All Data intentionally preserves Nuclear Block entries.

## Final Verify Before Submit

- Keep these answers aligned with `PRIVACY_POLICY.md`.
- If you add new backend fields or tracking later, update this file and the CWS form immediately.
