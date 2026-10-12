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
'viewer_origin' => 'https://YOUR-PROJECT.pages.dev',
```

Replace the example hostname with the actual deployment hostname. If you continue using `https://stands.mennoo.sbs` as a custom domain, the existing setting can stay unchanged once that domain points to this deployment.

The main site's iframe URL and Content-Security-Policy use this setting. Its `/stands/boho` route embeds this viewer's `/boho?embed=1` route.

Embedding is allowed from `https://mennoo.cfd`, `https://www.mennoo.cfd`, `https://mennoo.sbs` and `https://www.mennoo.sbs`. If the parent domain changes, update both `PARENT_ORIGINS` in `public/assets/models.js` and `frame-ancestors` in `public/_headers`. Update the return/contact links in `public/index.html` and `public/404.html` too.

## Files

- `public/`: complete deployable viewer, models, images, fonts and Cloudflare rules.
- `src/studio.scss`: editable stylesheet source; the ready-to-serve CSS is committed at `public/assets/studio.css`.
- `tests/studio.test.mjs`: viewer behavior tests using Node's built-in test runner and DOM test doubles.
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
node --test tests/studio.test.mjs
```

SCSS editing is optional; deployment already includes compiled CSS. If you have Sass locally, compile `src/studio.scss` into `public/assets/studio.css` after changing the source.

## Viewer behavior

The initial view is a lightweight poster. A deliberate tap on **Εξερευνήστε σε 3D** loads model-viewer 4.4.0 from Google's CDN and downloads the selected stand and table. No camera permission is requested. Locking the view restores normal touch scrolling.

Automatic rotation starts and pauses with **Αυτόματα**. Manual interaction stops it; hidden tabs, offscreen viewers and reduced-motion preferences pause it. Camera controls include wide reset, close-up and top view. Loading errors preserve a poster and offer retry controls.

The table, cup, saucer and linen are 3D geometry. The distant café is a photographic backdrop. QR recess dimensions and model geometry were checked offline; apparent print texture and lighting are illustrative.

## Deployment acceptance check

After Pages reports a successful deployment, check all four direct model URLs, the activation/lock controls, auto rotation, QR close-up and return links. On a phone, check scrolling before activation, drag/pinch after activation, orientation changes and returning from another tab. Test embedding on the main site's `/stands` page as well.

Automated tests cover interaction logic with test doubles. They are not a browser rendering, mobile device or FPS certification. Live browser verification remains a deployment acceptance step.
