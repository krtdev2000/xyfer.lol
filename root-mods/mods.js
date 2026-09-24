const grid = document.querySelector('#mods-grid');
const empty = document.querySelector('#mods-empty');
const count = document.querySelector('#mod-count');
const search = document.querySelector('#mod-search');
let allMods = [];

function safeUrl(value) {
  try {
    const url = new URL(value, location.origin);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '#';
  } catch {
    return '#';
  }
}

function render() {
  const term = search.value.trim().toLowerCase();
  const mods = allMods.filter(mod => mod.published && [mod.name, mod.description, mod.author, mod.tags].join(' ').toLowerCase().includes(term));
  grid.replaceChildren();
  count.textContent = `${mods.length} ${mods.length === 1 ? 'mod' : 'mods'}`;
  empty.hidden = mods.length > 0;
  grid.hidden = mods.length === 0;
  mods.forEach(mod => {
    const article = document.createElement('article');
    article.className = 'mod-card';
    article.style.setProperty('--card-accent', mod.color || '#ef233c');
    const visual = document.createElement('div');
    visual.className = 'mod-visual';
    if (mod.logo) {
      const image = document.createElement('img');
      image.src = mod.logo;
      image.alt = '';
      visual.append(image);
    } else visual.textContent = (mod.name || 'X').slice(0, 1).toUpperCase();
    const body = document.createElement('div');
    body.className = 'mod-body';
    const meta = document.createElement('div');
    meta.className = 'mod-meta';
    const version = document.createElement('span');
    version.textContent = mod.version || 'Latest';
    const author = document.createElement('span');
    author.textContent = mod.author ? `by ${mod.author}` : 'by xyfer';
    meta.append(version, author);
    const name = document.createElement('h2');
    name.textContent = mod.name || 'Untitled mod';
    const description = document.createElement('p');
    description.textContent = mod.description || 'No description provided.';
    const tags = document.createElement('div');
    tags.className = 'tags';
    String(mod.tags || '').split(',').map(tag => tag.trim()).filter(Boolean).slice(0, 4).forEach(tag => {
      const chip = document.createElement('span');
      chip.textContent = tag;
      tags.append(chip);
    });
    const link = document.createElement('a');
    link.className = 'download-btn';
    link.href = safeUrl(mod.download);
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'Download mod ↗';
    if (link.href.endsWith('#')) link.setAttribute('aria-disabled', 'true');
    body.append(meta, name, description, tags, link);
    article.append(visual, body);
    grid.append(article);
  });
}

async function loadMods() {
  try {
    const response = await fetch(`data.json?v=${Date.now()}`, {cache: 'no-store'});
    if (!response.ok) throw new Error();
    const data = await response.json();
    allMods = Array.isArray(data) ? data : [];
  } catch {
    allMods = [];
  }
  render();
}

search.addEventListener('input', render);
loadMods();
