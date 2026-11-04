# Folia branding

The logo is a little fox peeking out of its burrow with a star above it: a game for two about home and caring for each other.
It is drawn in code in `src/logo.js` and every file here and in `android/` and `public/` is built from that one drawing:

```
node tools/make-icons.mjs   # needs Playwright with Chromium; the results are committed
```

| File | Use |
|---|---|
| `logo-mark.svg` | the mark alone, transparent background |
| `icon.svg` | the app icon (cream rounded square) |
| `play-icon-512.png` | Google Play Console: app icon, 512 x 512 (full square, Google rounds it) |
| `feature-graphic-{en,ru,el}-1024x500.png` | Google Play Console: feature graphic per language |
| `logo-lockup-light.png`, `logo-lockup-dark.png` | mark with the name, for light and dark backgrounds |

## Colours

| Name | Value |
|---|---|
| Fox orange | `#F2762E` |
| Burrow brown | `#B5603A` |
| Star gold | `#FFC857` |
| Cream (icon background) | `#FFF1E4` to `#FFDFC6` |
| Ink | `#2B1A12` |
| App accent | `#C8643B` |

Android: the adaptive icon keeps the drawing inside the central 66 % circle, so any launcher mask shows it whole; the themed
(monochrome) icon is the same drawing as a white silhouette. The notification icon (`drawable/ic_stat_nora.xml`) is the fox head.
