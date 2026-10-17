# Embedded Studio spacing — 17 October 2026

The normal embedded toolbar and its explanatory paragraph now have responsive horizontal insets. The scene continues to fill its frame. Presentation-mode framing is unchanged.

Verified in the live parent page at https://mennoo.cfd/stands/#stand-viewer after deployment `dd950acfc4c5216dc146237242b58ea465c58c29`:

- The child loads `/assets/studio.152955c68f93.css`.
- At 1223px, horizontal padding is 30.575px and the presentation button has a 30.5625px right inset.
- Document scroll width equals viewport width.

Responsive checks used the same stylesheet on the preview-only diagnostic page at https://e4ec8127.standsmennoo.pages.dev/framing-diagnostic:

- At 320px and 390px, the toolbar and explanatory text have 18px horizontal insets.
- No horizontal document overflow, including with the music volume control shown.
- At 320px with music enabled, the presentation button wraps onto its own row inside the inset.

The live custom domain initially retained the old CSS despite a query-string revision. Content-hashed stylesheet filenames now prevent that collision; `node tools/sync-styles.mjs` updates the filename and HTML reference after CSS changes.

Screenshot: `studio-insets-live-20261017.jpg`.

## Separate PHP change

The requested 3MF paragraph belongs to the parent PHP site's `stands.php`, outside this Cloudflare deployment. It is still present on the live PHP site. `integrations/apache/remove-3mf-note.patch` removes that single paragraph without replacing the user's other PHP changes. Applying it to the PHP hosting requires access to that separate deployment. No claim is made that a viewer push removes parent-page markup.

This was a layout check. GPU rendering and rotation were not re-verified in the browser environment.
