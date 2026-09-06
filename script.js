// xyfer.lol

document.getElementById('year').textContent = new Date().getFullYear();

// occasional wordmark glitch
const title = document.querySelector('.title');
if (title && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const glitch = () => {
    title.classList.add('glitch');
    setTimeout(() => title.classList.remove('glitch'), 120);
    setTimeout(glitch, 2600 + Math.random() * 5200);
  };
  setTimeout(glitch, 1800);
}
