/* ===========================================================
   BOARDCAST ｜ セクション背景エフェクト・エンジン
   -----------------------------------------------------------
   使い方：<section data-fx="led"> のように属性を付けるだけ。
     led    … LEDパネル表面のドットマトリクス（輝度が波打つ）
     beam   … 斜めの光線が横切る
     scan   … 走査線が流れる（画面表面の質感）
     paper  … 方眼＋トンボ＋断ち切り線（明るい背景向け／製図用紙のニュアンス）
     geo    … 幾何格子の線画がゆっくり漂う（旧・現在は未使用）
     wave   … LEDドットの波が中央から広がる
   複数指定は "led beam" のようにスペース区切り。
   オプション：data-fx-opt="dense"（濃く）/ "trim"（断ち切り枠）/ "light"（明るい背景用の波紋）
   -----------------------------------------------------------
   ・画面内に入ったセクションだけ描画（省電力）
   ・OSの「視差効果を減らす」設定時は静止画1コマのみ
   =========================================================== */
(() => {
  "use strict";
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const NAVY = [1, 42, 86];
  const ORANGE = [246, 107, 38];
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  /* ---------- 各エフェクトの描画関数 ---------- */
  const FX = {
    /* LEDパネル表面：ドット格子の輝度が波打ち、時々オレンジが混じる */
    led(ctx, W, H, t, o) {
      const gap = o.includes("dense") ? 13 : 19;
      const cols = Math.ceil(W / gap), rows = Math.ceil(H / gap);
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const px = x * gap + gap / 2, py = y * gap + gap / 2;
          const wv = Math.sin((px * 0.008 + py * 0.013) - t * 0.0011);
          const lum = Math.pow((wv + 1) / 2, 3.2);
          if (lum < 0.04) continue;
          const hot = Math.sin(px * 0.02 - t * 0.0016) > 0.986;
          ctx.beginPath();
          ctx.arc(px, py, 1.35, 0, 6.284);
          ctx.fillStyle = hot ? rgba(ORANGE, lum * 0.62) : `rgba(255,255,255,${(lum * 0.2).toFixed(3)})`;
          ctx.fill();
        }
      }
    },

    /* 光線：斜めの帯がゆっくり横切る */
    beam(ctx, W, H, t, o) {
      const n = o.includes("dense") ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const cycle = 13000 + i * 5200;
        const p = ((t + i * 4300) % cycle) / cycle;
        const x = -W * 0.4 + p * W * 1.8;
        const w = 240 + i * 120;
        const g = ctx.createLinearGradient(x - w, 0, x + w, H);
        g.addColorStop(0, "rgba(255,255,255,0)");
        g.addColorStop(0.44, `rgba(190,220,255,${0.022 + i * 0.006})`);
        g.addColorStop(0.5, i === 0 ? rgba(ORANGE, 0.036) : "rgba(255,255,255,.032)");
        g.addColorStop(0.56, `rgba(190,220,255,${0.022 + i * 0.006})`);
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.save();
        ctx.translate(x, 0);
        ctx.rotate(-0.32);
        ctx.fillStyle = g;
        ctx.translate(-x, 0);
        ctx.fillRect(x - w, -H, w * 2, H * 3);
        ctx.restore();
      }
    },

    /* 走査線：画面表面を舐めるように上下へ */
    scan(ctx, W, H, t) {
      const p = ((t % 7200) / 7200);
      const y = p * (H + 260) - 130;
      const g = ctx.createLinearGradient(0, y - 130, 0, y + 130);
      g.addColorStop(0, "rgba(255,255,255,0)");
      g.addColorStop(0.5, "rgba(200,225,255,.055)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, y - 130, W, 260);
      /* 細い走査ライン（LEDの行） */
      ctx.fillStyle = "rgba(255,255,255,.022)";
      for (let ly = (t * 0.012) % 4; ly < H; ly += 4) ctx.fillRect(0, ly, W, 1);
    },

    /* 製図用紙／原稿用紙：方眼＋トンボ＋断ち切り線（明るい背景用） */
    paper(ctx, W, H, t, o) {
      const N = c => rgba(NAVY, c);
      /* 方眼（ごく薄く・ゆっくり呼吸） */
      const breathe = 0.011 + 0.003 * Math.sin(t * 0.00042);   /* さらに薄く */
      ctx.lineWidth = 1;
      ctx.strokeStyle = N(breathe);
      ctx.beginPath();
      for (let x = 24; x < W; x += 24) { ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, H); }
      for (let y = 24; y < H; y += 24) { ctx.moveTo(0, y + .5); ctx.lineTo(W, y + .5); }
      ctx.stroke();
      /* 基準線（120mmピッチのイメージ） */
      ctx.strokeStyle = N(0.022);   /* さらに薄く */
      ctx.beginPath();
      for (let x = 120; x < W; x += 120) { ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, H); }
      for (let y = 120; y < H; y += 120) { ctx.moveTo(0, y + .5); ctx.lineTo(W, y + .5); }
      ctx.stroke();

      const m = Math.max(28, Math.min(56, W * 0.033));   /* 断ち切りマージン */
      /* 断ち切り線（内側の破線枠） */
      if (o.includes("trim")) {
        ctx.save();
        ctx.strokeStyle = N(0.085);
        ctx.setLineDash([7, 8]);
        ctx.lineDashOffset = -(t * 0.008) % 15;          /* ごく微かに流れる */
        ctx.strokeRect(m + .5, m + .5, W - m * 2, H - m * 2);
        ctx.restore();
      }
      /* 角トンボ（四隅） */
      const L = 26, g2 = 9;
      const corners = [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]];
      const lit = Math.floor(t / 2100) % 4;
      corners.forEach(([cx, cy, sx, sy], i) => {
        ctx.strokeStyle = i === lit ? rgba(ORANGE, 0.5) : N(0.19);
        ctx.lineWidth = i === lit ? 1.4 : 1;
        ctx.beginPath();
        /* L字（内側に g2 空ける） */
        ctx.moveTo(cx + sx * g2, cy); ctx.lineTo(cx + sx * (g2 + L), cy);
        ctx.moveTo(cx, cy + sy * g2); ctx.lineTo(cx, cy + sy * (g2 + L));
        /* 直交トンボ（外側の短い十字） */
        ctx.moveTo(cx - sx * 4, cy - sy * (g2 + L * 0.55));
        ctx.lineTo(cx - sx * (4 + L * 0.5), cy - sy * (g2 + L * 0.55));
        ctx.stroke();
      });
      /* センタートンボ（上下辺の中央・十字） */
      ctx.strokeStyle = N(0.15);
      ctx.lineWidth = 1;
      ctx.beginPath();
      [[W / 2, m], [W / 2, H - m]].forEach(([cx, cy]) => {
        ctx.moveTo(cx - 11, cy); ctx.lineTo(cx + 11, cy);
        ctx.moveTo(cx, cy - 11); ctx.lineTo(cx, cy + 11);
      });
      ctx.stroke();
    },

    /* 幾何格子：明るい背景に淡いネイビーの線画 */
    geo(ctx, W, H, t, o) {
      const drift = (t * 0.006) % 68;
      ctx.lineWidth = 1;
      ctx.strokeStyle = rgba(NAVY, 0.055);
      if (o.includes("vline")) {
        for (let x = -68 + drift; x < W + 68; x += 68) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 44, H); ctx.stroke();
        }
      } else if (o.includes("hline")) {
        for (let y = -68 + drift; y < H + 68; y += 68) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y - 30); ctx.stroke();
        }
      } else if (o.includes("tri")) {
        const s = 96;
        for (let y = -s + drift; y < H + s; y += s) {
          for (let x = -s; x < W + s; x += s) {
            ctx.beginPath();
            ctx.moveTo(x, y); ctx.lineTo(x + s / 2, y + s * 0.86); ctx.lineTo(x + s, y);
            ctx.stroke();
          }
        }
      } else { /* diamond */
        const s = 84;
        for (let y = -s + drift; y < H + s; y += s) {
          for (let x = -s; x < W + s; x += s) {
            ctx.beginPath();
            ctx.moveTo(x + s / 2, y); ctx.lineTo(x + s, y + s / 2);
            ctx.lineTo(x + s / 2, y + s); ctx.lineTo(x, y + s / 2);
            ctx.closePath(); ctx.stroke();
          }
        }
      }
      /* 交点のノードが明滅（LEDの点灯を想起） */
      const gap = 84;
      for (let y = gap; y < H; y += gap) {
        for (let x = gap; x < W; x += gap) {
          const tw = Math.sin(x * 0.05 + y * 0.04 - t * 0.0013);
          if (tw < 0.9) continue;
          ctx.beginPath();
          ctx.arc(x, y + drift % gap, 2.1, 0, 6.284);
          ctx.fillStyle = rgba(ORANGE, (tw - 0.9) * 3.4);
          ctx.fill();
        }
      }
    },

    /* ドットの波が中央から広がる（＝1点の光が発信になる） */
    wave(ctx, W, H, t, o = "") {
      const light = o.includes("light");
      const gap = light ? 19 : 17, cx = W / 2, cy = H * 0.44;
      for (let y = gap / 2; y < H; y += gap) {
        for (let x = gap / 2; x < W; x += gap) {
          const d = Math.hypot(x - cx, y - cy);
          const wv = Math.sin(d * 0.022 - t * 0.0022);
          const lum = Math.pow(Math.max(0, wv), 3.6) * Math.max(0, 1 - d / (W * 0.62));
          if (lum < 0.02) continue;
          ctx.beginPath();
          ctx.arc(x, y, 1.5, 0, 6.284);
          ctx.fillStyle = light
            ? (d < 150 ? rgba(ORANGE, lum * 0.55) : rgba(NAVY, lum * 0.2))
            : (d < 130 ? rgba(ORANGE, lum * 0.72) : `rgba(255,255,255,${(lum * 0.3).toFixed(3)})`);
          ctx.fill();
        }
      }
    }
  };

  /* ---------- セクションへの適用 ---------- */
  const hosts = [...document.querySelectorAll("[data-fx]")];
  if (!hosts.length) return;

  hosts.forEach(host => {
    const kinds = (host.dataset.fx || "").trim().split(/\s+/).filter(k => FX[k]);
    if (!kinds.length) return;
    const opt = host.dataset.fxOpt || "";

    const cv = document.createElement("canvas");
    cv.className = "fx-canvas";
    cv.setAttribute("aria-hidden", "true");
    host.insertBefore(cv, host.firstChild);
    const ctx = cv.getContext("2d");
    const DPR = Math.min(devicePixelRatio || 1, 1.6);
    let W = 0, H = 0, raf = null;

    const resize = () => {
      W = host.clientWidth; H = host.clientHeight;
      if (!W || !H) return;
      cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };

    const frame = t => {
      ctx.clearRect(0, 0, W, H);
      for (const k of kinds) FX[k](ctx, W, H, t, opt);
      if (!REDUCED) raf = requestAnimationFrame(frame);
    };

    resize();
    addEventListener("resize", () => { resize(); if (REDUCED) frame(1200); }, { passive: true });

    if (REDUCED) { frame(1200); return; }   /* 静止1コマだけ描く */

    new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) {
        if (!raf) { resize(); raf = requestAnimationFrame(frame); }
      } else if (raf) { cancelAnimationFrame(raf); raf = null; }
    }), { rootMargin: "120px 0px" }).observe(host);

    /* 保険：IO不発の環境でも1コマは描いて模様を見せる */
    setTimeout(() => { if (!raf) frame(1200); }, 900);
  });
})();
