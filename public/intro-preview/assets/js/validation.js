export const MAX_ATTACHMENT = 5 * 1024 * 1024;
const text = value => typeof value === 'string' ? value.trim() : '';
const length = value => Array.from(value).length;

export function validateLead(raw, config, now = Date.now()) {
  const data = Object.fromEntries(['kind', 'business', 'name', 'email', 'phone', 'category', 'package', 'url', 'notes', 'website'].map(key => [key, text(raw[key])]));
  const errors = {};
  if (!['start', 'preview', 'package', 'contact'].includes(data.kind)) errors.form = 'Επιλέξτε ξανά το είδος αιτήματος.';
  if (length(data.name) < 2 || length(data.name) > 120) errors.name = 'Γράψτε το ονοματεπώνυμό σας (2–120 χαρακτήρες).';
  if (length(data.email) > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(data.email)) errors.email = 'Γράψτε μια έγκυρη διεύθυνση email.';
  if (['start', 'preview'].includes(data.kind)) {
    if (length(data.business) < 2 || length(data.business) > 160) errors.business = 'Γράψτε την επωνυμία της επιχείρησής σας.';
    if (!config.categories.includes(data.category)) errors.category = 'Επιλέξτε κατηγορία επιχείρησης.';
    if ((data.kind === 'start' || data.phone) && !/^\+?[\d\s().-]{8,25}$/.test(data.phone)) errors.phone = 'Γράψτε ένα έγκυρο τηλέφωνο, π.χ. 210 802 80 80.';
  }
  if (['start', 'package'].includes(data.kind) && (data.kind === 'package' || data.package) && !config.packages.some(plan => plan.id === data.package)) errors.package = 'Επιλέξτε ένα από τα διαθέσιμα πακέτα.';
  if (data.kind === 'preview' && data.url) {
    try {
      const url = new URL(data.url);
      if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || length(data.url) > 500 || /\s/u.test(data.url)) throw new Error();
    } catch { errors.url = 'Γράψτε ολόκληρο τον σύνδεσμο, π.χ. https://example.gr.'; }
  }
  if (length(data.notes) > 2000 || (data.kind === 'contact' && length(data.notes) < 10)) errors.notes = 'Γράψτε το μήνυμά σας (10–2.000 χαρακτήρες).';
  if (![true, '1'].includes(raw.consent)) errors.consent = 'Χρειάζεται η συγκατάθεσή σας για τον έλεγχο.';
  const elapsed = now - Number(raw.startedAt);
  if (data.website || !Number.isFinite(elapsed) || elapsed < 1200 || elapsed > 86400000) errors.form = 'Περιμένετε λίγο και δοκιμάστε ξανά. Αν η φόρμα έμεινε ανοιχτή πάνω από μία ημέρα, ανοίξτε την ξανά.';
  return { data, errors };
}

export function attachmentError(name, size, bytes) {
  if (!size || size > MAX_ATTACHMENT) return 'Επιλέξτε αρχείο έως 5 MB που δεν είναι κενό.';
  const extension = name.split('.').pop().toLowerCase();
  const starts = prefix => prefix.every((value, i) => bytes[i] === value);
  const valid = extension === 'pdf' ? starts([37,80,68,70,45])
    : extension === 'png' ? starts([137,80,78,71,13,10,26,10])
    : ['jpg','jpeg'].includes(extension) ? starts([255,216,255])
    : extension === 'webp' && starts([82,73,70,70]) && [87,69,66,80].every((value, i) => bytes[i+8] === value);
  return valid ? '' : 'Επιλέξτε έγκυρο PDF, JPG, PNG ή WebP.';
}
