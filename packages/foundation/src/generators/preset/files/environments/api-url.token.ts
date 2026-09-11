import { InjectionToken } from '@angular/core';
import { environment } from './environment';

/**
 * API origin (scheme + host + port, no path). Single source of truth: the value
 * comes straight from `environment.ts`, so a build-time `fileReplacements` swap
 * (dev / test / stg / prd) changes it everywhere at once. Orval reads the same
 * `environment` module from its Node config — it cannot read this token.
 *
 * `providedIn: 'root'` + factory makes it self-registering — no provider entry
 * in `app.config.ts` is needed (unlike `BLUEPRINT_CONFIG`, which is overridable
 * and therefore provided explicitly).
 */
export const API_URL = new InjectionToken<string>('API_URL', {
  providedIn: 'root',
  factory: () => environment.apiUrl,
});
