# Task list: Environments, Orval, proxy, and API interceptor in foundation

Read `CLAUDE.md` first. This is a **foundation-level, unconditional** addition — unlike `layout`-gated pieces (theme/language switchers), environments and API wiring apply to every generated project regardless of `layout`, since API access is not a layout concern.

## Two corrections to the original request — read before starting

1. **`apiUrl` value shape must not double up `/api`.** Orval-generated service methods call paths like `` `/api/Auth/Login` `` (confirmed from real generated output) — the `/api` segment comes from the backend's own route templates, baked into every generated method. If `environment.apiUrl` also ends in `/api`, an interceptor prefixing it produces `.../api/api/Auth/Login`. **Convention to use: `apiUrl` holds the origin only** (e.g. `http://10.1.21.26:8100`), never a path suffix — Task 9 verifies this concretely with a real network call before considering this done.

2. **Orval cannot read from an Angular `InjectionToken`** — that's a browser-runtime DI construct with no meaning inside Orval's Node-based config file, which runs before any Angular app exists. Instead: `orval.config.ts` imports the plain exported `environment` object directly from `environment.ts` (it's just a TS module, nothing DI-specific about it). The injection token and Orval's config end up reading the **same underlying value from the same file** — that's the actual single-source-of-truth guarantee, achieved differently than literally "reading the token."

---

## Task 0 — Discovery

0.1. Confirm current `preset.ts`/`schema.json` state — nothing environments-related should already exist; confirm rather than assume.
0.2. Check whether this Nx/Angular version's `project.json` `configurations` support an `"extends"` key (letting `dev`/`test` extend the existing `development` configuration, and `stg`/`prd` extend `production`, rather than duplicating budget/optimization settings four times). Verify against real Angular/Nx docs for the version in use, or by testing directly — don't assume support exists without checking, per this project's established caution around unverified Nx-version-specific features.

---

## Task 1 — Environment files (templates)

Location in the generator: `packages/foundation/src/generators/preset/files/environments/`.

**`environment.ts.template`** (the default/local file — the only one substituted at generation time):
```ts
export const environment = {
  production: false,
  apiUrl: '<%= apiUrl %>',
  appVersion: '<%= appVersion %>',
};
```

**`environment.dev.ts`**, **`environment.test.ts`** (plain files, no substitution — `production: false`):
```ts
export const environment = {
  production: false,
  apiUrl: '',
  appVersion: '0.1.0',
};
```

**`environment.stg.ts`**, **`environment.prd.ts`** (plain files — `production: true`, since both represent production-grade builds):
```ts
export const environment = {
  production: true,
  apiUrl: '',
  appVersion: '0.1.0',
};
```

Leave `apiUrl: ''` as a placeholder in the four non-default files — a developer fills these in per real deployment target; only the base `environment.ts` gets a generation-time value (Task 2).

---

## Task 2 — Schema addition (lightweight, optional)

Add to `schema.json`:
```json
"apiUrl": { "type": "string", "default": "" },
"appVersion": { "type": "string", "default": "0.1.0" }
```
Pass both into the `files/environments` `generateFiles` substitution object in `preset.ts`. This exists specifically so the Task 10 end-to-end test can pass a real value at generation time rather than requiring a manual post-generation edit.

---

## Task 3 — Injection token

New file, `files/environments/api-url.token.ts` (or alongside — confirm the most consistent location with this project's existing `core/` conventions before finalizing):
```ts
import { InjectionToken } from '@angular/core';
import { environment } from '../../environments/environment'; // verify real relative path once placed

export const API_URL = new InjectionToken<string>('API_URL', {
  providedIn: 'root',
  factory: () => environment.apiUrl,
});
```
Using a `factory`-based token (rather than a manual `provide` entry in `app.config.ts`) means no `ts-morph` patch is needed for this specific piece — it's self-registering. Confirm this pattern doesn't conflict with how `BLUEPRINT_CONFIG` is provided elsewhere before finalizing, since that one *does* need an explicit provider — don't silently make them inconsistent without a reason.

---

## Task 4 — `project.json` configurations

Add four new configurations, each doing a `fileReplacements` swap of `environment.ts` for its real counterpart. Use `"extends"` if Task 0.2 confirmed support; otherwise duplicate the necessary `optimization`/`sourceMap` settings explicitly rather than guessing that extension works:

```json
"configurations": {
  "dev": {
    "fileReplacements": [{ "replace": "src/environments/environment.ts", "with": "src/environments/environment.dev.ts" }]
  },
  "test": {
    "fileReplacements": [{ "replace": "src/environments/environment.ts", "with": "src/environments/environment.test.ts" }]
  },
  "stg": {
    "fileReplacements": [{ "replace": "src/environments/environment.ts", "with": "src/environments/environment.stg.ts" }],
    "optimization": true
  },
  "prd": {
    "fileReplacements": [{ "replace": "src/environments/environment.ts", "with": "src/environments/environment.prd.ts" }],
    "optimization": true
  }
}
```
Merge into the existing `configurations` object in `project.json` — don't overwrite `production`/`development`, which already exist from the base Angular scaffold.

---

## Task 5 — `package.json` scripts

```json
"scripts": {
  "build:dev": "nx build --configuration=dev",
  "build:test": "nx build --configuration=test",
  "build:stg": "nx build --configuration=stg",
  "build:prd": "nx build --configuration=prd",
  "serve:dev": "nx serve --configuration=dev",
  "serve:test": "nx serve --configuration=test",
  "serve:stg": "nx serve --configuration=stg",
  "serve:prd": "nx serve --configuration=prd"
}
```
This is a `generateFiles`/`updateJson` addition inside `preset.ts`, same mechanism as everything else — not something requiring a new file.

---

## Task 6 — Orval dependency and config

6.1. Add `orval@^7.20.0` (patched CVE range, per earlier discussion) to `devDependencies`.

6.2. `files/orval.config.ts.template`:
```ts
import { defineConfig } from 'orval';
import { environment } from './src/environments/environment';

const apiOrigin = process.env.ORVAL_API_URL || environment.apiUrl;

export default defineConfig({
  api: {
    input: {
      target: `${apiOrigin}/swagger/v1/swagger.json`, // adjust path per backend's actual OpenAPI route
      validation: true,
    },
    output: {
      target: './src/app/core/api',
      client: 'angular',
      mode: 'tags-split',
      override: {
        angular: {
          retrievalClient: 'both',
          runtimeValidation: true,
        },
      },
    },
    hooks: {
      afterAllFilesWrite: 'prettier --write',
    },
  },
});
```
The `process.env.ORVAL_API_URL` fallback lets a developer generate against a different backend URL for one run without editing `environment.ts` — optional convenience, not required for correctness.

6.3. Add `"generate:api": "orval"` to `package.json` scripts.

---

## Task 7 — `proxy.config.json`

```json
{
  "/api": {
    "target": "<%= apiUrl %>",
    "secure": false,
    "changeOrigin": true
  }
}
```
`target` must be the **origin only** (per the correction at the top) — if `options.apiUrl` includes a path, strip it before substitution rather than passing it through as-is. Wire `"proxyConfig": "proxy.config.json"` into `project.json`'s `serve` target options.

---

## Task 8 — API interceptor

```ts
// core/api/api.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { API_URL } from '../../environments/api-url.token';

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const apiUrl = inject(API_URL);
  // req.url already contains its own leading /api (from generated Orval
  // calls) — apiUrl must be origin-only, or this doubles the segment.
  return next(req.clone({ url: `${apiUrl}${req.url}` }));
};
```
Register via `withInterceptors([apiInterceptor])` in the `provideHttpClient(...)` call — add `provideHttpClient` itself if it isn't already present in `app.config.ts` (confirm via Task 0, don't assume).

This is **unconditional** — not gated behind `layout !== 'none'`, unlike the theme/language switchers. Confirm this distinction is actually implemented correctly, since it's easy to accidentally copy the wrong gating pattern from nearby code.

---

## Task 9 — Verify the `/api` double-prefix concern directly, don't just trust the convention

Using a real generated project (Task 10's scratch test), open browser DevTools' Network tab while triggering one real API call, and confirm the actual outgoing request URL is exactly `http://10.1.21.26:8100/api/Auth/...` — **one** `/api`, not two. If it's doubled, the bug is that `apiUrl` was passed with a path suffix somewhere it shouldn't have been (check Task 10's test command first) or that the interceptor/proxy each independently added the prefix (double-application, a different bug with the same symptom) — diagnose which one before patching blindly.

---

## Task 10 — Build, publish, and end-to-end test

10.1. Standard build/publish cycle per `CLAUDE.md` (clean build, dry-run pack, publish to Verdaccio, tag `latest`).

10.2. Test in `D:/temp`, `layout=none`, with the given API origin — per Task 1's correction, pass the **origin only**, not `.../api`:
```bash
cd D:/temp && rm -rf scratch-env-test

npx create-nx-workspace@latest scratch-env-test \
  --preset=@blueprint-platform/foundation@latest \
  --layout=none \
  --apiUrl=http://10.1.21.26:8100 \
  --registry=http://localhost:4873
```
If the real backend's Orval-generated paths turn out to **not** already include a leading `/api` (verify against the actual spec, don't assume it matches the earlier example project), then `apiUrl` may legitimately need to include `/api` after all — Task 9's live network check is what actually settles this, not the convention stated here in isolation.

10.3. Confirm: `environment.ts` has the passed `apiUrl`; `npm run build:dev`/`build:stg`/`build:prd` each produce output referencing the correct swapped environment file (inspect the compiled JS output for the literal `apiUrl` string per configuration, not just trust that `fileReplacements` ran); `npm run serve:dev` works with the proxy active; `npm run generate:api` succeeds against the real backend (adjust the swagger path in Task 6.2's config if `/swagger/v1/swagger.json` isn't correct for this specific backend — verify in a browser first, per the earlier Orval setup guide).

---

## Task 11 — Update `CLAUDE.md`

Record the environments convention, the apiUrl-origin-only rule (with the reasoning, so it isn't silently "fixed" back to including a path later by someone who doesn't know why), the injection-token/Orval-can't-share-a-token clarification, and the new schema fields.
