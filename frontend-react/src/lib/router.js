/**
 * Stores the React Router navigate function so api.js (and other non-React code)
 * can trigger client-side navigation (e.g. on 401) without full page reload.
 */
let navigateRef = null

export function setNavigate(fn) {
  navigateRef = fn
}

export function getNavigate() {
  return navigateRef
}
