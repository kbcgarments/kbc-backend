/**
 * Unified request context for guest & authenticated users.
 *
 * - customerId → present when logged in
 * - deviceId   → always present for guests, sometimes for logged-in users
 *
 * Services MUST prefer customerId when available.
 */
export interface RequestContext {
  customerId?: string;
  deviceId?: string;
}
