import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Group validator: keeps a `mismatch` error on the *confirm* control whenever it
 * has a value that differs from the password control. Other errors already on
 * the confirm control (e.g. `required`) are preserved. Attach to the `FormGroup`
 * that holds both controls.
 */
export function passwordsMatchValidator(passwordKey: string, confirmKey: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const password = String(group.get(passwordKey)?.value ?? '');
    const confirm = group.get(confirmKey);
    if (!confirm) return null;

    const others = { ...(confirm.errors ?? {}) };
    delete others['mismatch'];

    const mismatched = String(confirm.value ?? '').length > 0 && password !== confirm.value;
    if (mismatched) {
      confirm.setErrors({ ...others, mismatch: true });
    } else {
      confirm.setErrors(Object.keys(others).length ? others : null);
    }
    return null;
  };
}
