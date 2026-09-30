// Auto-login with the saved VIP credentials (PRD F5.4) and auto-entry of the saved Sync Code on My Lists (F5.6).
(async () => {
  const s = await chrome.storage.local.get(['vipEmail', 'vipPassword', 'syncCode', 'lastLoginAttempt', 'manualLogout']);

  // A deliberate sign-out must stick: remember it, and don't auto-login until the user signs in again themselves.
  document.addEventListener('click', (e) => {
    if (e.target.closest?.(SEL.logoutLinks)) chrome.storage.local.set({ manualLogout: true });
  }, true);

  const loggedIn = !!document.querySelector(SEL.loggedIn);
  if (loggedIn) {
    if (s.manualLogout) chrome.storage.local.set({ manualLogout: false });
    return enterSyncCode(s.syncCode);
  }

  const loggedOut = !!document.querySelector(SEL.siteNav) && location.pathname !== SEL.signInPath;
  if (!loggedOut || s.manualLogout || !s.vipEmail || !s.vipPassword) return;
  if (Date.now() - (s.lastLoginAttempt ?? 0) < 10 * 60e3) return; // ≤ 1 try per 10 min: a wrong password can't loop into a lockout
  await chrome.storage.local.set({ lastLoginAttempt: Date.now() });

  // Same request the site's own loginSubmit() sends, including the CSRF header its $.ajaxSetup adds to every POST.
  const r = await fetch(SEL.loginEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      'X-CSRF-Token': document.querySelector(SEL.csrfMeta)?.content ?? '',
    },
    body: JSON.stringify({ uname: s.vipEmail, passw: s.vipPassword }),
  }).catch(() => null);
  const body = r ? await r.text() : '';
  const error = !r ? 'Auto-login failed: network error'
    : r.status === 401 ? `Auto-login failed: ${body.slice(0, 120) || 'wrong email or password'}`
    : !r.ok ? `Auto-login failed (HTTP ${r.status})`
    : /"status"\s*:\s*"expired"/.test(body) ? 'Auto-login: your VIP membership has expired'
    : null;
  await chrome.storage.local.set({ loginError: error });
  if (!error) location.reload();
})();

// Only when this browser has no active code, so a code the user picked on the site is never replaced.
async function enterSyncCode(code) {
  const input = document.querySelector(SEL.syncInput);
  if (!input || !code || localStorage.getItem(SEL.syncCodeKey)) return;
  await new Promise((r) => setTimeout(r, 500)); // let the site bind its input handler
  input.value = code;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}
