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
}
