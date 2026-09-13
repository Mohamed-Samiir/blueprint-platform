export interface AuthGeneratorSchema {
  /** Which auth strategy's service + interceptor to copy. Default 'jwt'. */
  authType?: 'jwt' | 'session';
  /** Where auth tokens live. Default 'local'. */
  storeType?: 'local' | 'memory';
  /**
   * Which auth layout shell to add — foundation:layout's `auth-split` or
   * `auth-centered` catalog entry. Default 'split'.
   */
  authLayout?: 'split' | 'centered';
  /** Copy signup-form + wire its route. Default true. */
  includeSignup?: boolean;
  /**
   * Copy the three-step forgot-password flow + wire its routes, as one unit.
   * Default true.
   */
  includeForgotPassword?: boolean;
  /** Copy change-password-form + wire its route. Default true. */
  includeChangePassword?: boolean;
}
