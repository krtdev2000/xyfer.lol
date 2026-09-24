
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    const count = Math.min(260, Math.round((w * h) / 5200));
    field = [];
    for (let i = 0; i < count; i++) {
      const depth = Math.random();
      field.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.35 + depth * 1.25,
        base: 0.2 + depth * 0.6,
        phase: Math.random() * Math.PI * 2,
        speed: rand(0.6, 2.1),
        vx: rand(-2.2, 2.2) * (0.2 + depth),
        vy: rand(9, 22) * (0.35 + depth),
        cool: Math.random() < 0.22
      });
    }
  }

  function drawStar(s, alpha) {
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = s.cool
      ? 'rgba(239, 35, 60, ' + alpha + ')'
      : 'rgba(255, 110, 128, ' + alpha + ')';
    ctx.fill();

    if (s.r > 1.15) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * 3.4, 0, Math.PI * 2);
      ctx.fillStyle = s.cool
        ? 'rgba(180, 0, 25, ' + alpha * 0.18 + ')'
        : 'rgba(239, 35, 60, ' + alpha * 0.14 + ')';
      ctx.fill();
    }
  }

  function drawShooter() {
    const p = shooter.t / shooter.life;
    const fade = p < 0.2 ? p / 0.2 : 1 - (p - 0.2) / 0.8;
    const x = shooter.x + shooter.dx * shooter.t;
    const y = shooter.y + shooter.dy * shooter.t;
    const tx = x - shooter.dx * shooter.tail;
    const ty = y - shooter.dy * shooter.tail;

    const g = ctx.createLinearGradient(x, y, tx, ty);
    g.addColorStop(0, 'rgba(255, 110, 128, ' + fade * 0.9 + ')');
    g.addColorStop(0.35, 'rgba(239, 35, 60, ' + fade * 0.45 + ')');
    g.addColorStop(1, 'rgba(120, 0, 16, 0)');

    ctx.beginPath();
    ctx.strokeStyle = g;
    ctx.lineWidth = 1.7;
    ctx.lineCap = 'round';
    ctx.moveTo(tx, ty);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function spawnShooter() {
    const dir = Math.random() < 0.5 ? 1 : -1;
    const angle = rand(0.32, 0.62);
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
      const alpha = s.base * (0.64 + 0.36 * Math.sin(s.phase));

      s.x += (s.vx * dt) / 1000;
      s.y += (s.vy * dt) / 1000;
      if (s.x < -4) s.x = w + 4; else if (s.x > w + 4) s.x = -4;
      if (s.y > h + 4) {
        s.y = -4;
        s.x = Math.random() * w;
      }

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

  function still() {
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
  still();
  if (!reduced) start();

  let resizeTimer;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      build();
      still();
    }, 160);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop(); else start();
  });
})();

const title = document.querySelector('.title');
if (title && !reduced) {
  const glitch = () => {
    title.classList.add('glitch');
    setTimeout(() => title.classList.remove('glitch'), 120);
    setTimeout(glitch, 2600 + Math.random() * 5200);
  };
  setTimeout(glitch, 1800);
}
