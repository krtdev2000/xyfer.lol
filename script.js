// xyfer.lol

// year
document.getElementById('year').textContent = new Date().getFullYear();

// reveal on scroll
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll('.reveal').forEach((el, i) => {
  el.style.transitionDelay = (i % 4) * 70 + 'ms';
  io.observe(el);
});

// count-up stats
const counters = document.querySelectorAll('.stats b');
const cio = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    cio.unobserve(e.target);
    const el = e.target;
    const target = +el.dataset.count;
    const suffix = el.dataset.suffix || '';
    const start = performance.now();
    const dur = 1200;
    const tick = (now) => {
      const t = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}, { threshold: 0.5 });
counters.forEach((c) => cio.observe(c));

// card spotlight follows the cursor
document.querySelectorAll('.card').forEach((card) => {
  card.addEventListener('pointermove', (e) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', ((e.clientX - r.left) / r.width) * 100 + '%');
    card.style.setProperty('--my', ((e.clientY - r.top) / r.height) * 100 + '%');
  });
});

// occasional title glitch
const title = document.querySelector('.title');
const glitch = () => {
  title.classList.add('glitch');
  setTimeout(() => title.classList.remove('glitch'), 120);
  setTimeout(glitch, 2600 + Math.random() * 5200);
};
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  setTimeout(glitch, 1800);
}

// placeholder links: mark as coming soon instead of navigating nowhere
document.querySelectorAll('[data-soon]').forEach((a) => {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    a.classList.add('soon');
  });
});
