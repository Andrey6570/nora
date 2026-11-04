import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { markSvg, iconSvg, ART, COLORS } from "../src/logo.js";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const RES = ROOT + "android/app/src/main/res/";
// width and height from the PNG header, plus whether the file has an alpha channel
function png(path) {
  const b = readFileSync(path);
  assert.equal(b.subarray(1, 4).toString(), "PNG", path);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), alpha: b[25] === 6 };
}

test("Android launcher icons exist in every density at the right size", () => {
  const DENSITY = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
  for (const [d, k] of Object.entries(DENSITY)) {
    for (const [name, size] of [["ic_launcher", 48 * k], ["ic_launcher_round", 48 * k], ["ic_launcher_foreground", 108 * k], ["ic_launcher_monochrome", 108 * k]]) {
      const f = png(`${RES}mipmap-${d}/${name}.png`);
      assert.deepEqual([f.w, f.h], [size, size], `${d}/${name}`);
    }
    // the adaptive layers are transparent so the launcher can put its own mask and background behind them
    assert.ok(png(`${RES}mipmap-${d}/ic_launcher_foreground.png`).alpha && png(`${RES}mipmap-${d}/ic_launcher_monochrome.png`).alpha, d);
  }
});

test("the adaptive icon has a background, a foreground and a themed layer", () => {
  for (const f of ["ic_launcher", "ic_launcher_round"]) {
    const xml = readFileSync(`${RES}mipmap-anydpi-v26/${f}.xml`, "utf8");
    for (const part of ["background", "foreground", "monochrome"]) assert.match(xml, new RegExp(`<${part} android:drawable`), `${f} ${part}`);
  }
  const colors = readFileSync(`${RES}values/ic_launcher_background.xml`, "utf8");
  for (const c of ["ic_launcher_background", "nora_accent", "nora_splash"]) assert.match(colors, new RegExp(`name="${c}"`), c);
});

test("the splash screens exist for portrait, landscape and the default, in proportion", () => {
  const SIZES = { mdpi: [320, 480], hdpi: [480, 800], xhdpi: [720, 1280], xxhdpi: [960, 1600], xxxhdpi: [1280, 1920] };
  for (const [d, [w, h]] of Object.entries(SIZES)) {
    assert.deepEqual(Object.values({ ...png(`${RES}drawable-port-${d}/splash.png`) }).slice(0, 2), [w, h], "port " + d);
    assert.deepEqual(Object.values({ ...png(`${RES}drawable-land-${d}/splash.png`) }).slice(0, 2), [h, w], "land " + d);
  }
  assert.equal(png(`${RES}drawable/splash.png`).w, 480);
  const styles = readFileSync(`${RES}values/styles.xml`, "utf8");
  assert.match(styles, /windowSplashScreenBackground/);
  assert.match(styles, /windowSplashScreenAnimatedIcon/);
});

test("the old Capacitor icon pictures are gone and the notification icon is the fox", () => {
  assert.equal(existsSync(`${RES}drawable-v24/ic_launcher_foreground.xml`), false);
  assert.equal(existsSync(`${RES}drawable/ic_launcher_background.xml`), false);
  const stat = readFileSync(`${RES}drawable/ic_stat_nora.xml`, "utf8");
  assert.match(stat, /evenOdd/);
  assert.match(readFileSync(ROOT + "android/app/src/main/AndroidManifest.xml", "utf8"), /default_notification_color" android:resource="@color\/nora_accent"/);
});

test("web icons, store images and the favicon links are in place", () => {
  assert.deepEqual([png(ROOT + "public/apple-touch-icon.png").w, png(ROOT + "public/icon-192.png").w, png(ROOT + "public/icon-512.png").w, png(ROOT + "public/favicon-32.png").w], [180, 192, 512, 32]);
  const play = png(ROOT + "branding/play-icon-512.png");
  assert.deepEqual([play.w, play.h], [512, 512]);
  for (const l of ["en", "ru", "el"]) { const g = png(`${ROOT}branding/feature-graphic-${l}-1024x500.png`); assert.deepEqual([g.w, g.h], [1024, 500], l); }
  const html = readFileSync(ROOT + "index.html", "utf8");
  for (const f of ["icon.svg", "favicon-32.png", "apple-touch-icon.png"]) assert.ok(html.includes(f) && existsSync(ROOT + "public/" + f), f);
});

test("the drawing: one source, valid SVG strings, the brand colours", () => {
  assert.match(markSvg(64, "Folia"), /^<svg [^>]*width="64"[^>]*role="img" aria-label="Folia"/);
  assert.match(markSvg(64), /aria-hidden="true"/);
  assert.ok(iconSvg({}).includes("linearGradient") && !iconSvg({ background: false }).includes("linearGradient"));
  assert.ok(ART.includes(COLORS.orange) && ART.includes(COLORS.star));
  assert.equal(readFileSync(ROOT + "public/icon.svg", "utf8"), iconSvg({ size: 512 }));
});
