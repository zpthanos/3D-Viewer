# Embedded presentation framing correction

The previous presentation inherited its iframe's full height through `100dvh`. The real MENNOO host was observed with a 1,272 px presentation. Desktop presentations are now bounded to 520–680 px; narrow embeds to 560–640 px. Width-based sizing avoids feeding the host's assigned height back into its own measurement.

Camera presets use wider distances. The overhead preset moved from 0.15 m to 0.30 m before aspect correction; detail views from 0.165/0.22 m to 0.30/0.34 m. Each preset also restores the 36° lens, so manual zoom does not carry into the wide finale. The minimum manual orbit is 0.28 m. The actual product dimensions, QR texture and recess geometry are unchanged.

## Validation

- 39 Node tests pass, including new regression checks for the final wide camera after overhead/manual zoom and horizontal clearance at five aspect ratios for both product heights.
- Preview deployment: `https://1ec787ce.standsmennoo.pages.dev/framing-diagnostic`.
- Browser test host starts at 1,272 px and applies the same authenticated height-message protocol as the main site.
- Presentation measured 1224 × 680, 690 × 640, 390 × 566 and 320 × 560 px. Height reports settle instead of growing. No horizontal overflow at the tested narrow widths.
- Final QR, caption and navigation rectangles do not overlap at mobile widths. Closing restores the model choices and normal intrinsic content height; reopening returns to 680 px on desktop.
- The QA browser cannot provide WebGL. These browser checks cover the real responsive layout and image fallback. Camera changes are tested through the production controller and projection checks, not a claim of GPU-rendered playback or frame-rate validation.
- Preview-only same-origin embedding and diagnostic public routes are excluded from the production tree. Production keeps the existing allowed parent origins and CSP.

## Production verification — 17 October 2026

Commit `ad6f0c391c9b469a86ef332aaa6a5214d925b3d9` deployed successfully through Cloudflare Pages. The real parent page, `https://mennoo.cfd/stands/#stand-viewer`, loads `framing-20261012c` from `stands.mennoo.cfd`. The presentation scene measured 680 px high (684 px for the enclosing iframe). Chapter 4 shows the QR and final menu link. The live browser screenshot is `framing-live-20261017.jpg`; it shows the image fallback because WebGL is unavailable in this QA browser.
