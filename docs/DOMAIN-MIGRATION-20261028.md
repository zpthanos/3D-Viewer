# Viewer migration to mennoo.gr — 28 October 2026

Production viewer: https://stands.mennoo.gr

The iframe failed because both the deployed CSP and the JavaScript parent-origin allowlist still named the previous domains. The live response also included `X-Frame-Options: SAMEORIGIN`, although that header was not in this repository.

This change updates both allowlists to exactly:

- https://mennoo.gr
- https://www.mennoo.gr
- https://mennoo-private-preview.ohiosanta-og.chatgpt.site

Return/contact links and the offline Apache catalogue exporter now use `.gr`. No PHP files, credentials, consent bypasses, models or geometry changes are included. Consent remains controlled by the main website. The iframe loads only after its existing external-content permission is granted; the viewer still activates WebGL on an explicit interaction.

## Deploy and verify

1. Deploy `main` with output directory `public`; the generated modules are committed, so the existing `exit 0` build command remains valid.
2. Verify the response at `https://stands.mennoo.gr/?embed=1`: its single CSP must contain the three origins above. It must not include `X-Frame-Options: SAMEORIGIN` or `DENY`.
3. If the header persists, remove the viewer host from the Cloudflare Transform Rule/Worker that injects it. Also remove any additional CSP containing the old origins. A Pages `_headers` rule cannot guarantee removal of headers injected by a later zone rule. Keep the main website's independent framing protection.
4. Verify the root and all four clean model URLs load the new hashed entry module. HTML revalidates; hashed modules retain immutable caching.
5. In the main website, decline external content and confirm the iframe does not load. Then grant it, check the poster, activate 3D, change the design and check height updates. Repeat on the private preview, including mobile scrolling and consent withdrawal.

Automated tests exercise parent authentication with and without a referrer, rejected origins/sources, CSP parity, lazy activation and immutable module imports. They do not replace a real browser/WebGL check after deployment.

Earlier dated Cloudflare documents describe historical domains; this checklist and the current README supersede those domain values.

Reference: https://developers.cloudflare.com/pages/configuration/headers/
