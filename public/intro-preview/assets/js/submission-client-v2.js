// One mail POST per deliberate submission. Recovery ONLY reads the receipt endpoint.
export function createSubmissionClient({submitUrl, statusUrl, kind, onState, fetcher = globalThis.fetch.bind(globalThis), storage,
  sendTimeout = 120000, statusTimeout = 8000, delays = [0, 2000, 4000, 8000, 12000, 15000]}) {
  const key = `mennoo:submission:v2:${kind}`;
  let ticket = null;
  let busy = false;
  let completed = false;
  const notify = (state, payload = {}) => onState({state, ...payload});
  const persist = () => { try { storage?.setItem(key, JSON.stringify(ticket)); } catch { /* Private browsing can deny storage. */ } };
  const clear = () => { ticket = null; completed = false; try { storage?.removeItem(key); } catch { /* Optional storage. */ } };
  const accepted = payload => payload?.accepted === true && /^MN-\d{6}-[A-F0-9]{12}$/.test(payload.reference || '');
  const reference = payload => /^MN-\d{6}-[A-F0-9]{12}$/.test(payload?.reference || '') ? payload.reference : ticket?.reference || '';

  async function request(url, body, timeout) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetcher(url, {method:'POST', body, credentials:'same-origin', cache:'no-store',
        headers:{Accept:'application/json'}, signal:controller.signal});
      if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('Invalid response format');
      const payload = await response.json();
      if (!payload || payload.protocol !== 2) throw new Error('Incompatible response');
      return {response, payload};
    } finally { clearTimeout(timer); }
  }

  function resolve(response, payload, fromStatus = false) {
    if (response.ok && accepted(payload)) {
      ticket.reference = payload.reference; persist(); completed = true;
      notify('accepted', {message:payload.message, reference:payload.reference});
      return true;
    }
    if (payload.outcome === 'rejected' && payload.safe_to_retry === true && response.status >= 400
        && (!fromStatus || payload.recorded === true)) {
      clear(); notify('rejected', {payload}); return true;
    }
    ticket.reference = reference(payload); persist();
    return false;
  }

  async function poll() {
    for (const delay of delays) {
      if (delay) await new Promise(resolve => setTimeout(resolve, delay));
      try {
        const body = new URLSearchParams({protocol:'2', csrf:ticket.csrf, kind});
        const {response, payload} = await request(statusUrl, body, statusTimeout);
        if (resolve(response, payload, true)) return;
        if (response.status === 429) break; // Respect the server; do not hammer a shared host.
        notify('checking', {reference:ticket.reference});
        if (payload.outcome === 'unconfirmed') break;
      } catch { /* A lost response is unknown, never evidence of rejection. */ }
    }
    notify('unconfirmed', {reference:ticket?.reference || ''});
  }

  return {
    async submit(body) {
      if (busy || ticket || completed) return false;
      const csrf = body.get('csrf');
      if (!/^[a-f0-9]{64}$/.test(csrf || '') || body.get('kind') !== kind) {
        notify('rejected', {payload:{error:'Η φόρμα χρειάζεται ανανέωση πριν από την αποστολή.'}}); return false;
      }
      busy = true;
      ticket = {csrf, created:Date.now(), reference:''}; persist();
      // Set in this module, not HTML: old cached scripts cannot opt in accidentally.
      body.set('protocol', '2');
      notify('sending');
      try {
        try {
          const {response, payload} = await request(submitUrl, body, sendTimeout);
          if (resolve(response, payload)) return true;
        } catch { /* Recover via read-only status requests, never POST the form again. */ }
        notify('checking', {reference:ticket.reference});
        await poll();
        return true;
      } finally { busy = false; }
    },
    async check() {
      if (busy || !ticket || completed) return;
      busy = true; notify('checking', {reference:ticket.reference});
      try { await poll(); } finally { busy = false; }
    },
    async resume() {
      if (busy || ticket) return;
      try {
        const saved = JSON.parse(storage?.getItem(key) || 'null');
        if (!saved) return;
        if (!/^[a-f0-9]{64}$/.test(saved.csrf || '') || !Number.isFinite(saved.created)
            || Date.now() - saved.created > 86400000 || saved.created > Date.now()) { clear(); return; }
        ticket = {csrf:saved.csrf, created:saved.created, reference:reference(saved)};
      } catch { clear(); return; }
      await this.check();
    },
    clear,
  };
}
