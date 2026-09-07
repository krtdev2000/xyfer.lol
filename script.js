// xyfer.lol

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── starfield ──────────────────────────────────────────────

(function stars() {
  const bg = document.querySelector('.bg');
  if (!bg) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'stars';
  bg.insertBefore(canvas, bg.querySelector('.bg-glow'));

  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, dpr = 1;
  let field = [];
  let shooter = null;
  let nextShot = 2600;

  const rand = (a, b) => a + Math.random() * (b - a);

  function build() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // density scales with area, capped so big screens stay tasteful
    const count = Math.min(260, Math.round((w * h) / 5200));
    field = [];
    for (let i = 0; i < count; i++) {
      const depth = Math.random();          // 0 = far, 1 = near
      field.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.35 + depth * 1.25,
        base: 0.2 + depth * 0.6,
        phase: Math.random() * Math.PI * 2,
        speed: rand(0.6, 2.1),
        vx: rand(-3.4, 3.4) * (0.25 + depth),
        vy: rand(-2.6, 2.6) * (0.25 + depth),
        red: Math.random() < 0.18
      });
    }
  }

  function drawStar(s, alpha) {
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = s.red
      ? 'rgba(255, 96, 108, ' + alpha + ')'
      : 'rgba(255, 255, 255, ' + alpha + ')';
    ctx.fill();

    if (s.r > 1.15) {                        // faint halo on the near ones
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * 3.4, 0, Math.PI * 2);
      ctx.fillStyle = s.red
        ? 'rgba(255, 43, 57, ' + alpha * 0.13 + ')'
        : 'rgba(255, 210, 214, ' + alpha * 0.1 + ')';
      ctx.fill();
    }
  }

  function drawShooter() {
    const p = shooter.t / shooter.life;
    // fade in over the first fifth, out over the rest
    const fade = p < 0.2 ? p / 0.2 : 1 - (p - 0.2) / 0.8;
    const x = shooter.x + shooter.dx * shooter.t;
    const y = shooter.y + shooter.dy * shooter.t;
    const tx = x - shooter.dx * shooter.tail;
    const ty = y - shooter.dy * shooter.tail;

    const g = ctx.createLinearGradient(x, y, tx, ty);
    g.addColorStop(0, 'rgba(255, 255, 255, ' + fade * 0.9 + ')');
    g.addColorStop(0.35, 'rgba(255, 96, 108, ' + fade * 0.45 + ')');
    g.addColorStop(1, 'rgba(255, 43, 57, 0)');

    ctx.beginPath();
    ctx.strokeStyle = g;
    ctx.lineWidth = 1.7;
    ctx.lineCap = 'round';
    ctx.moveTo(tx, ty);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function spawnShooter() {
    const dir = Math.random() < 0.5 ? 1 : -1;   // travelling right or left
    const angle = rand(0.32, 0.62);             // always slanting downward
    const speed = rand(0.55, 0.95);
    shooter = {
      x: dir === 1 ? rand(-40, w * 0.45) : rand(w * 0.55, w + 40),
      y: rand(-20, h * 0.5),
      dx: Math.cos(angle) * speed * dir,
      dy: Math.sin(angle) * speed,
      t: 0,
      life: rand(620, 980),
      tail: rand(90, 170)
    };
  }

  let last = performance.now();

  function frame(now) {
    const dt = Math.min(now - last, 60);
    last = now;
    ctx.clearRect(0, 0, w, h);

    for (const s of field) {
      s.phase += (s.speed * dt) / 1000;
      const alpha = s.base * (0.5 + 0.5 * Math.sin(s.phase));

      s.x += (s.vx * dt) / 1000;
      s.y += (s.vy * dt) / 1000;
      if (s.x < -4) s.x = w + 4; else if (s.x > w + 4) s.x = -4;
      if (s.y < -4) s.y = h + 4; else if (s.y > h + 4) s.y = -4;

      drawStar(s, alpha);
    }

    if (shooter) {
      shooter.t += dt;
      if (shooter.t >= shooter.life) shooter = null;
      else drawShooter();
    } else {
      nextShot -= dt;
      if (nextShot <= 0) {
        spawnShooter();
        nextShot = rand(6000, 14000);
      }
    }

    raf = requestAnimationFrame(frame);
  }

  function still() {                          // reduced-motion: one static pass
    ctx.clearRect(0, 0, w, h);
    for (const s of field) drawStar(s, s.base * 0.8);
  }

  let raf = null;
  function start() {
    if (raf || reduced) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  build();
  if (reduced) still(); else start();

  let resizeTimer;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      build();
      if (reduced) still();
    }, 160);
  });

  // don't burn cycles on a hidden tab
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop(); else start();
  });
})();

// ── wordmark glitch ────────────────────────────────────────

const title = document.querySelector('.title');
if (title && !reduced) {
  const glitch = () => {
    title.classList.add('glitch');
    setTimeout(() => title.classList.remove('glitch'), 120);
    setTimeout(glitch, 2600 + Math.random() * 5200);
  };
  setTimeout(glitch, 1800);
}
