# Task list: Flag-gated auth forms (login always included, everything else optional)

Read `CLAUDE.md` first, and read `task-auth-module-platform-sync-v2.md` for context — this task list assumes that generator's structure (schema, `authType`/`storeType`/`authLayout`, composition into `foundation:layout` via `generator-kit`) either already exists or is being built alongside this. This task list adds three new independent flags on top of it, sized so that a future CLI multi-select can map directly onto them — one checkbox per flag, nothing more to design later.

## The new flags

```json
"includeSignup": { "type": "boolean", "default": true },
"includeForgotPassword": { "type": "boolean", "default": true },
"includeChangePassword": { "type": "boolean", "default": true }
```

**Forgot-password stays one flag for all three of its steps** (email → code → new password), not three separate flags — having only some steps of a single linear flow present doesn't make sense standalone, so it's gated as one unit. **Change-password is its own separate flag**, matching its existing status as a genuinely separate flow from forgot-password (established in the original reference task list). **Login has no flag at all** — it's the one form that's always present, unconditionally, in every generated auth setup.

Defaults are all `true` specifically so existing behavior (everything included) doesn't change for anyone already using the generator without these flags — they're additive, not a behavior change until someone actually sets one to `false`.

---

## The real problem this creates, worth solving properly rather than papering over

`login-form` — the one form that's *always* present — currently links to both "Sign up" and "Forgot password?" **Those routes might not exist** if the corresponding flag is `false`. A dangling link to a route that was never generated is a real, user-facing bug, not a cosmetic issue. This needs runtime conditional rendering inside `login-form` itself, not just conditional route registration.

**The mechanism: a small, dedicated config token, following the exact pattern already established for `BLUEPRINT_CONFIG`/`API_URL`** — not a giant new object, just three booleans the always-present `login-form` can read:

```ts
// core/auth/auth-features.token.ts (this one file needs `.template` treatment —
// it's the only genuinely generation-time-substituted file in this whole task)
import { InjectionToken } from '@angular/core';

export interface AuthFeatures {
  signup: boolean;
  forgotPassword: boolean;
  changePassword: boolean;
}

export const AUTH_FEATURES = new InjectionToken<AuthFeatures>('AUTH_FEATURES', {
  providedIn: 'root',
  factory: () => ({
    signup: <%= includeSignup %>,
    forgotPassword: <%= includeForgotPassword %>,
    changePassword: <%= includeChangePassword %>,
  }),
});
```

This means `login-form.ts` itself **stays a zero-edit copy** — it reads `inject(AUTH_FEATURES)` and conditionally renders its two links, but that conditional logic is written once, in `blueprint-reference`, and never needs per-flag templating of the form component itself. Only this one small token file needs `.template` substitution.

---

## Task 0 — Update `blueprint-reference` first (small, but genuinely needs the browser, not skippable like the Orval/ngx-translate config-only work)

This is UI conditional-rendering behavior, not plain config wiring — worth actually seeing it toggle in the browser before syncing, per the project's normal discipline (unlike the ngx-translate/Orval scope decisions, which were justified specifically because there was nothing visual to verify).

0.1. Add `auth-features.token.ts` to `blueprint-reference`'s `core/auth/` (a plain hardcoded-`true`-for-all version here — the `.template` EJS substitution only happens in `blueprint-platform`'s copy).

0.2. Update `login-form.ts` to inject it and wrap the sign-up and forgot-password links:
```html
@if (authFeatures.signup) {
  <a routerLink="/auth/signup">Don't have an account? Sign up</a>
}
@if (authFeatures.forgotPassword) {
  <a routerLink="/auth/forgot-password">Forgot password?</a>
}
```

0.3. In the existing auth preview page, add three toggles (one per flag) that swap which value the local token provides, and confirm both links independently show/hide correctly, with no broken layout when either or both are absent (check spacing/alignment doesn't look awkward with one link missing — a real visual detail, not just "does the `@if` work").

0.4. Log this small update in `SYNC_LOG.md` as a preparation entry, same as before.

---

## Task 1 — Update the `modules:auth` generator schema

Add the three flags from the top of this document to `schema.json`.

---

## Task 2 — Conditional copying in `auth.ts`

- `login-form`: always copied, unconditionally.
- `signup-form`: copied only if `includeSignup`.
- `forgot-password-email-form`, `forgot-password-code-form`, `forgot-password-new-password-form`: copied only if `includeForgotPassword` (all three together, per the "one flow, one flag" decision above).
- `change-password-form`: copied only if `includeChangePassword`.
- `auth-features.token.ts`: **always copied**, as a `.template` (per the design above) with the three flag values substituted in — this file must exist regardless of which flags are set, since `login-form` always depends on it.

---

## Task 3 — Route wiring — build the `children` array conditionally

Extending Task 5 from the v2 sync task list's `addLayoutBranch` call — the `children` array passed to it must now be assembled dynamically:

```ts
const children = [
  { path: 'login', componentImportPath: '...', componentClassName: 'LoginForm' }, // always
];
if (options.includeSignup) {
  children.push({ path: 'signup', componentImportPath: '...', componentClassName: 'SignupForm' });
}
if (options.includeForgotPassword) {
  children.push(
    { path: 'forgot-password', componentImportPath: '...', componentClassName: 'ForgotPasswordEmailForm' },
    { path: 'forgot-password/code', componentImportPath: '...', componentClassName: 'ForgotPasswordCodeForm' },
    { path: 'forgot-password/new-password', componentImportPath: '...', componentClassName: 'ForgotPasswordNewPasswordForm' },
  );
}
if (options.includeChangePassword) {
  children.push({ path: 'change-password', componentImportPath: '...', componentClassName: 'ChangePasswordForm' });
}
```
Confirm real exported class names from the actual copied files rather than assuming the names shown here, same discipline as every prior route-wiring task.

---

## Task 4 — Manifest

Record the three flags in the `modules` entry for `auth` in `.blueprint/manifest.json`, alongside `authType`/`storeType`/`authLayout` — e.g. `{ name: 'auth', authType, storeType, authLayout, features: { signup, forgotPassword, changePassword } }`.

---

## Task 5 — Update `CLAUDE.md`

Record the three flags, the "login always included, everything else optional" rule, and the `AUTH_FEATURES` token pattern — specifically note *why* it exists (a dangling link from the one always-present form to a form that might not exist), so a future CLI multi-select implementer understands what each checkbox needs to wire through, not just that the flags exist.
