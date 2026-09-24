const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const title = document.querySelector('.title');

if (title && !reduced) {
  const glitch = () => {
    title.classList.add('glitch');
    setTimeout(() => title.classList.remove('glitch'), 120);
    setTimeout(glitch, 2600 + Math.random() * 5200);
  };
  setTimeout(glitch, 1800);
}
