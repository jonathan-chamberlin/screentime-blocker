# Nuclear Block Exceptions Report

## Summary
Implemented per-entry Nuclear Block URL exceptions so a nuclear-blocked domain can permit specific URL paths, with exception rules taking precedence over all other blocking layers.

## Files Modified
- `extension/nuclear-block.js`
  - Added domain/exception normalization helpers.
  - Added per-entry exception validation and storage support.
  - Added `addNuclearException(id, exception)` mutation function.
  - Updated `applyNuclearRules()` to emit both redirect rules (priority 3) and exception allow rules (priority 4).
- `extension/background.js`
  - Added runtime message handler: `addNuclearException`.
- `extension/settings.html`
  - Added pending exception composer UI in Nuclear Block add section:
    - `#nuclearExceptionInput`
    - `#btn-add-nuclear-exception`
    - `#nuclearPendingExceptions`
  - Added CSS for exception chips and per-card exception controls.
- `extension/settings.js`
  - Added pending exception state: `pendingNuclearExceptions`.
  - Added helper/render/validation methods for exception handling.
  - Added per-card exception UI render + add action.
  - Updated custom-domain nuclear add flow to persist pending exceptions.
- `extension/tests/integration-test.js`
  - Added nuclear exception tests:
    - normalization behavior
    - persistence behavior
    - rule generation behavior
    - dedupe behavior
    - host mismatch rejection
  - Added missing mock support for `chrome.idle` and module load updates needed by current code structure.

## Data Model Update
`chrome.storage.local.nbData.sites[*]` now supports:
- `exceptions: string[]`

Notes:
- Existing entries without `exceptions` are handled as `[]` at runtime.
- Exceptions are stored normalized as `host/path[?query]` (example: `en.wikipedia.org/wiki/Fort_Southerland`).

## Rule Priority Model
Implemented priority stack:
1. Session/list redirects: `1`
2. Session/list allow paths: `2`
3. Nuclear redirects: `3`
4. Nuclear per-entry exceptions (allow): `4`

Result: matching exception URLs load even when their parent domain is blocked by session/list rules and nuclear rules.

## Testing Commands Run
### Static/syntax checks
- `node --check extension/nuclear-block.js`
- `node --check extension/settings.js`
- `node --check extension/background.js`

### Integration tests
- `node extension/tests/integration-test.js`

Note: full integration suite still contains existing unrelated failures in older assertions (mode/config expectations). New nuclear-exception tests passed.

### Browser-test workflow (Playwright fallback from browser-test skill)
Used one-off Playwright script with fresh profile + extension loaded to run scenario end-to-end.

## Wikipedia Scenario Evidence (Requested)
Test configuration used:
- Removal cooldown: `10 seconds`
- Confirmation cooldown: `5 seconds`

Scenario executed:
1. Add nuclear domain: `wikipedia.org`
2. Add exception: `https://en.wikipedia.org/wiki/Fort_Southerland`
3. Click `Add` for exception, then `Add to Nuclear Block`
4. Navigate to `https://wikipedia.org`
5. Navigate to `https://en.wikipedia.org/wiki/Fort_Southerland`

Observed results:
- `https://wikipedia.org` redirected to: `nuclear-blocked.html`
- `https://en.wikipedia.org/wiki/Fort_Southerland` loaded normally (allowed)
- Dynamic rules showed:
  - priority 3 redirect for `wikipedia.org`
  - priority 4 allow rule with `urlFilter: ||en.wikipedia.org/wiki/Fort_Southerland`

## Screenshot Paths
- `C:\Repositories for Git\screen-time-blocker\screentime-blocker\.screenshots\nuclear-settings-exceptions.png`
- `C:\Repositories for Git\screen-time-blocker\screentime-blocker\.screenshots\nuclear-blocked-wikipedia-org.png`
- `C:\Repositories for Git\screen-time-blocker\screentime-blocker\.screenshots\nuclear-allowed-fort-southerland.png`

## Limitations / Follow-ups
- Pending exceptions in the add composer are currently validated against the custom-domain input flow; preset/break-list entries receive exceptions via per-card controls after creation.
- Existing integration suite has unrelated historical failing assertions that should be separately aligned with current productive-mode/list architecture.
