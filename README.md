# MENNOO 3D Stand Studio

The MENNOO café viewer, ready for Cloudflare Pages. Plain HTML, CSS and JavaScript; no application server or build dependencies. Four actual stand designs in matte black PLA, the supplied QR artwork, a 41 × 41 × 3 mm recess and a real 3D walnut table with café props.

## Deploy from GitHub

In Cloudflare, choose **Workers & Pages → Create application → Pages → Import an existing Git repository**, then select **zpthanos/3D-Viewer**.

Use these exact values:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Framework preset | `None` |
| Build command | `exit 0` |
| Build output directory | `public` |
| Root directory (advanced) / Path | Leave blank |
| Environment variables | None required |

Select **Save and Deploy**. Cloudflare serves the contents of `public` at the domain root. Future pushes to `main` trigger production deployments. The main address is `/`; model links are `/boho`, `/mini-polygon`, `/mini-votsalo` and `/chonaki`. `_redirects` and `_headers` are already included in the deployment directory.

An existing **Direct Upload** Pages project cannot be converted to Git integration. Create a new Git-connected Pages project in that case. Test its assigned `pages.dev` address before moving the existing viewer custom domain to it.

Official references: [Static HTML deployment](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/), [Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/), [Direct Upload restrictions](https://developers.cloudflare.com/pages/get-started/direct-upload/).

## Connect the main MENNOO website

The main PHP website stays on its existing hosting. On that site, set `viewer_origin` in `config/production.local.php` to the exact HTTPS origin assigned by Pages, without a path or trailing slash:

```php
'viewer_origin' => 'https://stands.mennoo.gr',
```

The production custom domain is `https://stands.mennoo.gr`. Keep it attached to this Pages project.

The main site's iframe URL and Content-Security-Policy use this setting. Its `/stands/boho` route embeds this viewer's `/boho?embed=1` route.

Embedding is allowed from `https://mennoo.gr`, `https://www.mennoo.gr` and the exact private preview origin `https://mennoo-private-preview.ohiosanta-og.chatgpt.site`. If the parent domain changes, update both `PARENT_ORIGINS` in `public/assets/models.js` and `frame-ancestors` in `public/_headers`. Update the return/contact links in `public/index.html` and `public/404.html` too.

The viewer uses CSP `frame-ancestors` to restrict embedding. `public/_headers` removes `X-Frame-Options`, which cannot represent this cross-origin allowlist. If a zone-level Transform Rule or Worker injects `SAMEORIGIN` or an old CSP after Pages, update that rule for `stands.mennoo.gr` as well. See [the migration checklist](docs/DOMAIN-MIGRATION-20261028.md).

After editing JavaScript, run `npm run build` and commit the regenerated `public/build/` modules together with `public/index.html`. Existing hashed files stay available for cached HTML; do not edit their contents in place.

## Files

- `public/`: complete deployable viewer, models, images, fonts and Cloudflare rules.
- `src/studio.scss`: editable stylesheet source; the ready-to-serve CSS is committed at `public/assets/studio.css`.
- `tests/`: viewer behavior, rendering capability and deployment-policy regression tests.
- `tools/`: optional offline GLB surface refinement and native OpenGL preview rendering; never run on the hosting server.
- `ASSET-SHA256SUMS.txt`: integrity hashes for every deployable file.

No original 3MF printing files, PHP backend credentials or private configuration are included. GLB files are public browser assets. The main PHP application is supplied separately in the full source package.

## Local preview and tests

From the repository folder, with Python 3 installed:

```sh
python -m http.server 8080 --directory public
```

Open `http://localhost:8080/`. The simple local server does not interpret Cloudflare's clean-route rewrites or response headers; check direct model links and embedding on the Pages deployment.

With Node.js 20 or later installed, run the tests without installing packages:

```sh
node --test tests/*.test.mjs
```

SCSS editing is optional; deployment includes ready-to-serve CSS. The source currently uses CSS-compatible syntax. After editing it, run `node tools/sync-styles.mjs` locally to copy the stylesheet and update the HTML to its content-hashed filename. This avoids stale styles on custom domains whose caches ignore query-string versions. No build command or runtime dependency is added to Cloudflare. The original `studio.css` URL is retained for older cached HTML.

## Viewer behavior

Embedded presentations have a bounded, width-based height: 520–680 px on desktop and 560–640 px on narrower screens. They never derive their height from the iframe's own viewport. The existing parent height-message handler can shrink the iframe when a presentation starts and restore the controls when it closes. Standalone presentations use the browser window.

Wide, detail and overhead cameras retain space around the real 65–70 mm stands. Every preset resets lens zoom as well as the orbit, so a previous pinch cannot carry into the final wide view. A separate QR panel supplies a readable scan target.

The initial view is a lightweight poster. A deliberate tap on **Εξερευνήστε σε 3D** loads model-viewer 4.4.0 from Google's CDN and downloads the selected stand and table. No camera permission is requested. Locking the view restores normal touch scrolling.

Automatic rotation starts and pauses with **Αυτόματα**. Manual interaction stops it; hidden tabs, offscreen viewers and reduced-motion preferences pause it. Camera controls include wide reset, close-up and top view. Loading errors preserve a poster and offer retry controls.

The table, cup, saucer and linen are 3D geometry. The distant café is a photographic backdrop. QR recess dimensions and model geometry were checked offline; apparent print texture and lighting are illustrative.

## Texture and preview correction — 12 October 2026

Embedded GLB images are loaded through `fetch(blob:...)` by the renderer. The Pages CSP now permits those blob fetches and the SDK's WebAssembly module, while JavaScript `eval`, inline scripts and arbitrary external origins remain blocked.

Flat crown and recess surfaces have independent normals and planar UV coordinates. The supplied QR image bytes and the 41 × 41 × 3 mm recess are preserved. Preview images are rendered from these GLBs, with separate mobile framing and content-hashed filenames so a cached older stand cannot replace the new preview. WebGL is checked on activation; unsupported devices retain the poster with a clear explanation.

The optional offline tools use Python 3, NumPy and Pillow; native preview rendering additionally needs EGL/OpenGL ES. These dependencies are not needed for Cloudflare deployment. Run `python tools/check_models.py` to validate asset geometry and QR integrity locally. The browser texture diagnostic in `tests/` can be temporarily copied to `public/` on a preview branch to test the actual response policy without requiring a GPU; it is not deployed in production.

## Deployment acceptance check

After Pages reports a successful deployment, check all four direct model URLs, the activation/lock controls, auto rotation, QR close-up and return links. On a phone, check scrolling before activation, drag/pinch after activation, orientation changes and returning from another tab. Test embedding on the main site's `/stands` page as well.

Automated tests cover interaction logic with test doubles. They are not a browser rendering, mobile device or FPS certification. Live browser verification remains a deployment acceptance step.

## Presentation and café sound

The materials desk switches between the real 3D walnut table and a new honed limestone finish. Each finish has matching desktop/mobile previews for all four stands. Geometry, scale and the supplied QR artwork are unchanged. `tools/build_stone_table.py` creates the original procedural stone texture offline; no texture service or extra server software is used.

**Παρουσίαση** opens a full-window, four-chapter tour: the table, the stand's detail, the recessed QR, then a scannable real demo QR with a direct menu link. The final frame waits for the salesperson. Previous/next, chapter selection, pause, replay, Escape and a visible close button remain available. Touching the model pauses the tour. Reduced motion starts with manual chapter navigation. Hidden tabs and offscreen viewers pause the timeline; loading time does not consume chapters. On devices without WebGL the tour explicitly uses the rendered previews.

Music starts only after the music or presentation button is pressed. `public/assets/cafe-sound.js` synthesizes an original 72 BPM lounge arrangement using sine partials, bass and seeded brush noise: no recordings, third-party samples, streaming account, MP3 download or audio library. A soft limiter, quiet default level, volume control and mute are included. Audio scheduling pauses when the tab/viewer is hidden and stops on navigation. Explicit mute is remembered for subsequent presentations in the same page session. The original score and audio module are dedicated under CC0-1.0; see `AUDIO-LICENSE.md`. This does not change the ownership/license of the logo, QR, models or other site assets.

No fullscreen, microphone, camera or wake-lock permission is needed. In an embedded viewer the presentation fills the iframe; use the standalone Pages address for an entire browser-window presentation. The host iframe must allow audio playback if it sets a restrictive autoplay Permissions Policy.
