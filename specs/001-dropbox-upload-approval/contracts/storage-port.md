# Storage Port Contract

**Date**: 2026-09-02 | **Plan**: [../plan.md](../plan.md)

`src/lib/storage/port.ts` is the **only** storage contract the application knows. Two implementations
satisfy it — the Dropbox adapter (`lib/storage/dropbox/`) and an in-memory fake (`lib/storage/fake/`).
Both are exercised by the *same* contract suite, so the fake cannot drift from the real adapter
(Constitution V).

**Boundary rules**

- The Dropbox SDK is imported **nowhere** outside `lib/storage/dropbox/`. Enforce with a lint rule on
  import paths; it is the single check that keeps the GCP migration a deployment change
  (Constitution III).
- No method accepts or returns file content. There is no `upload(bytes)` — by design. The port
  authorizes transfers and inspects results; the bytes travel browser → provider
  (Constitution I).

## Operations

```text
resolveFolder(path)              → { exists: boolean }
ensureFolder(path)               → { created: boolean }        // idempotent
fileExists(path, name)           → { exists: boolean, id?, size? }
getMetadata(path, name)          → { id, size, modifiedAt } | NotFound
beginUpload(path, name, size)    → { sessionId, token, tokenExpiresAt, chunkSize }
moveFile(fromPath, toPath, name) → { id }
createTemporaryLink(path, name)  → { url, expiresAt }
```

## Behavioural contract

Each numbered item is one test in the shared suite. Both implementations must pass all of them.

**`ensureFolder`**

1. Creating an absent folder reports `created: true`.
2. Creating an existing folder **succeeds** with `created: false` — an existing folder is never an
   error (FR-036 relies on this).
3. Creating a nested path creates every missing ancestor.
4. A path with an invalid segment is rejected before any provider call.

**`fileExists` / `getMetadata`**

5. A present file reports `exists: true` with its size.
6. An absent file reports `exists: false` — it does **not** throw.
7. `getMetadata` on an absent file raises `NotFound`, distinguishable from a transport failure. This
   distinction is what lets `/api/uploads/confirm` tell "the upload did not land" apart from "Dropbox
   is unreachable", and what drives `integrity_state = 'broken'` (FR-042).

**`beginUpload`**

8. Returns a session id and a credential whose scope permits writing only — never reading, listing,
   sharing, or deleting ([research.md R-002](../research.md)).
9. `tokenExpiresAt` is in the future and is reported, not assumed.
10. The returned credential is never the app's refresh token or full-scope token (Constitution IV).

**`moveFile`**

11. Moving to a free destination succeeds and preserves the file's provider id.
12. Moving onto an **occupied** destination fails with `DestinationOccupied` and moves nothing — the
    provider's autorename behaviour must be disabled (FR-039). Silent renaming here would break
    SC-001.
13. Moving an absent source raises `NotFound`.
14. A failed move leaves the source in place.

**`createTemporaryLink`**

15. Returns a URL with an expiry (FR-043).
16. Never returns a permanent public link.

**Failures**

17. Transport and provider errors surface as a single `StorageUnavailable` type carrying the
    provider's message — callers must not need to know Dropbox error shapes.
18. Rate limiting surfaces as `StorageUnavailable` with a retry hint, not as a generic failure.

## Why the fake shares the suite

The fake exists so the test suite runs with no network access, as Constitution Principle V requires.
A fake that passes a *different* suite is worse than no fake: it would let tests pass while the
adapter mishandles real behaviour. Items 2, 7, and 12 are precisely where a naive fake would drift —
they encode "already exists is fine", "absent is not a failure", and "never silently autorename",
each of which a correctness requirement depends on.
