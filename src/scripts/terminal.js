// Terminal runtime: theme, accent palette, TOC scroll-spy, ASCII wave <-> logic-trace morph.
// Ported 1:1 from the original single-file design so the motion is identical.

const PALETTE = ['#2e9e95', '#3b82c4', '#4caf6d', '#d4638f', '#e08a3c', '#d1495b', '#8b6fd1', '#c9a227'];
const root = document.documentElement;

/* ── theme ── */
const applyTheme = (dark) => {
  root.classList.toggle('dark', dark);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = dark ? '* dark' : '* light';
};
try { applyTheme(localStorage.getItem('sr-theme') === 'dark'); } catch { applyTheme(false); }
document.getElementById('theme-toggle')?.addEventListener('click', () => {
  const dark = !root.classList.contains('dark');
  applyTheme(dark);
  try { localStorage.setItem('sr-theme', dark ? 'dark' : 'light'); } catch {}
});

/* ── accent ── */
const swatches = [...document.querySelectorAll('.swatch')];
const applyAccent = (i) => {
  root.style.setProperty('--accent', PALETTE[i]);
  swatches.forEach((s, n) => s.setAttribute('aria-pressed', String(n === i)));
};
let storedAccent = 0;
try { storedAccent = Number(localStorage.getItem('sr-accent')) || 0; } catch {}
if (swatches.length) applyAccent(storedAccent in PALETTE ? storedAccent : 0);
swatches.forEach((s, i) => s.addEventListener('click', () => {
  applyAccent(i);
  try { localStorage.setItem('sr-accent', String(i)); } catch {}
}));

/* ── table of contents scroll-spy ── */
const tocLinks = [...document.querySelectorAll('#toc a[data-toc]')];
if (tocLinks.length) {
  const spy = () => {
    let current = tocLinks[0];
    const threshold = window.innerHeight * 0.4;
    for (const a of tocLinks) {
      const el = document.getElementById(a.dataset.toc);
      if (el && el.getBoundingClientRect().top < threshold) current = a;
    }
    const max = root.scrollHeight - window.innerHeight;
    if (max > 0 && window.scrollY / max > 0.99) current = tocLinks[tocLinks.length - 1];
    tocLinks.forEach((a) => {
      const on = a === current;
      a.classList.toggle('active', on);
      a.querySelector('.mk').textContent = on ? '\u25b8' : '\u00b7';
    });
  };
  window.addEventListener('scroll', spy, { passive: true });
  spy();
}

/* ── ASCII animation ── */
const asciiEl = document.getElementById('ascii');
if (asciiEl) {
  const rows = 26, cols = 32;
  const traces = [
    { row: 0.16, period: 5, phase: 0 },
    { row: 0.5, period: 8, phase: 2 },
    { row: 0.84, period: 3, phase: 5 },
  ];
  const blank = () => Array.from({ length: rows }, () => Array(cols).fill(' '));

  const digitalFrame = (now) => {
    const t = now * 0.006;
    const out = blank();
    for (const tr of traces) {
      const base = rows * tr.row;
      const hi = Math.round(base - 1.4), lo = Math.round(base + 1.4);
      const bitAt = (c) => Math.floor((c + tr.phase + t * 4) / tr.period) % 2;
      for (let c = 0; c < cols; c++) {
        const bit = bitAt(c);
        if (bit !== bitAt(c - 1)) { for (let r = hi; r <= lo; r++) out[r][c] = '|'; }
        else out[bit ? hi : lo][c] = bit ? '\u203e' : '_';
      }
    }
    return out;
  };

  const waveSurface = (c, t) =>
    rows * 0.42 +
    Math.sin(c * 0.34 + t * 2.1) * 2.6 +
    Math.sin(c * 0.17 - t * 1.3) * 1.6 +
    Math.sin(c * 0.6 + t * 3.4) * 0.6;

  const waveFrame = (now) => {
    const t = now * 0.0016;
    const out = blank();
    const crest = ['~', '-', '\u2248'];
    for (let c = 0; c < cols; c++) {
      const surface = waveSurface(c, t);
      for (let r = 0; r < rows; r++) {
        const depth = r - surface;
        if (depth < -0.4) continue;
        if (depth < 0.5) out[r][c] = crest[Math.abs(Math.floor(t * 3 - c * 0.4)) % crest.length];
        else if (depth < 2.2) out[r][c] = '+';
        else if (depth < 5) out[r][c] = '.';
        else out[r][c] = r % 3 === 0 ? '.' : ' ';
      }
    }
    return out;
  };

  const blendFrame = (p, now, fromMode, toMode) => {
    const t = now * 0.0016, td = now * 0.006;
    const out = blank();
    const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    const fromIsDigital = fromMode !== 'waves';
    for (let i = 0; i < traces.length; i++) {
      const tr = traces[i];
      const targetRow = rows * tr.row;
      const targetHi = targetRow - 1.4, targetLo = targetRow + 1.4;
      const bitAt = (c) => Math.floor((c + tr.phase + td * 4) / tr.period) % 2;
      for (let c = 0; c < cols; c++) {
        const waveRow = waveSurface(c, t);
        const hiStart = fromMode === 'waves' ? waveRow : targetHi;
        const hiEnd = toMode === 'waves' ? waveRow : targetHi;
        const loStart = fromMode === 'waves' ? waveRow : targetLo;
        const loEnd = toMode === 'waves' ? waveRow : targetLo;
        const hi = Math.round(hiStart + (hiEnd - hiStart) * ease);
        const lo = Math.round(loStart + (loEnd - loStart) * ease);
        const digitalStyle = ease > c / cols ? !fromIsDigital : fromIsDigital;
        if (digitalStyle) {
          const bit = bitAt(c);
          if (bit !== bitAt(c - 1)) {
            const a = Math.min(hi, lo), b = Math.max(hi, lo);
            for (let r = a; r <= b; r++) if (r >= 0 && r < rows) out[r][c] = '|';
          } else {
            const row = bit ? hi : lo;
            if (row >= 0 && row < rows) out[row][c] = bit ? '\u203e' : '_';
          }
        } else {
          const row = Math.round((hi + lo) / 2);
          if (row >= 0 && row < rows) {
            const crest = ['~', '-', '\u2248'];
            out[row][c] = crest[Math.abs(Math.floor(t * 3 - c * 0.4)) % crest.length];
          }
          if (i === 1) {
            let f = fromIsDigital ? ease : 1 - ease;
            f = f * f * (3 - 2 * f);
            for (let off = 1; row + off < rows; off++) {
              const rr = row + off;
              if (rr < 0) continue;
              if (((c * 13 + off * 29) % 97) / 97 > f) continue;
              out[rr][c] = off <= 2 ? '+' : off <= 4 ? '.' : rr % 3 === 0 ? '.' : ' ';
            }
          }
        }
      }
    }
    return out;
  };

  let mode = 'waves', lastSwitch = performance.now(), pending, fromMode, morphStart;
  const MORPH = 2600, HOLD = 5000;
  const loop = (now) => {
    if (mode !== 'morphing' && now - lastSwitch > HOLD) {
      pending = mode === 'waves' ? 'digital' : 'waves';
      fromMode = mode;
      morphStart = now;
      mode = 'morphing';
    }
    let grid;
    if (mode === 'morphing') {
      const p = Math.min(1, (now - morphStart) / MORPH);
      grid = blendFrame(p, now, fromMode, pending);
      if (p >= 1) { mode = pending; lastSwitch = now; }
    } else {
      grid = mode === 'waves' ? waveFrame(now) : digitalFrame(now);
    }
    asciiEl.textContent = grid.map((r) => r.join('')).join('\n');
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
