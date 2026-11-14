// Display budgets for the existing 5-minute measurement/pull chain; never rewrite source times.
export const BROWSER_POLL_MS = 300000;
export const REFRESH_WAIT_MS = 8000;
export const CATCHUP_DELAY_MS = 2000;
export const CATCHUP_LIMIT = 6;
// Health: Mac cache 300s + browser 300s + collector sample 15s + transport/jitter 45s.
export const HEALTH_FRESH_SECONDS = 660;
// Accounts: EA export 300s + Mac 300s + browser 300s + transport/jitter 60s.
export const ACCOUNT_FRESH_SECONDS = 960;
