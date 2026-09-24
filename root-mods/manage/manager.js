const API_URL = 'https://api.github.com/repos/krtdev2000/xyfer.lol/contents/root-mods/data.json';
const TOKEN_KEY = 'xyfer-publish-token';
const gate = document.querySelector('#key-gate');
const manager = document.querySelector('#manager');
const form = document.querySelector('#mod-form');
let mods = [];
let fileSha = '';

function token() {
  return sessionStorage.getItem(TOKEN_KEY) || '';
}

async function api(method = 'GET', body) {
  const response = await fetch(API_URL, {
    method,
    headers: {Accept: 'application/vnd.github+json', Authorization: `Bearer ${token()}`, 'X-GitHub-Api-Version': '2022-11-28'},
    body: body ? JSON.stringify(body) : undefined
  });
  if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? 'That publishing key is invalid or cannot edit this repository.' : 'GitHub could not save the mod library.');
  return response.json();
}

function decodeContent(value) {
  const binary = atob(value.replace(/\n/g, ''));
  return new TextDecoder().decode(Uint8Array.from(binary, char => char.charCodeAt(0)));
}

function encodeContent(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach(byte => binary += String.fromCharCode(byte));
  return btoa(binary);
}

async function loadMods() {
  const file = await api();
  fileSha = file.sha;
  const value = JSON.parse(decodeContent(file.content));
  mods = Array.isArray(value) ? value : [];
  renderLibrary();
}

async function saveMods(nextMods) {
  const button = form.querySelector('.primary-btn');
  button.disabled = true;
  button.textContent = 'Publishing…';
  try {
    const result = await api('PUT', {message: 'Update Root Mods library', content: encodeContent(JSON.stringify(nextMods, null, 2) + '\n'), sha: fileSha, branch: 'main'});
    fileSha = result.content.sha;
    mods = nextMods;
    renderLibrary();
    return true;
  } catch (error) {
    alert(error.message);
    return false;
  } finally {
    button.disabled = false;
    button.textContent = 'Save mod';
  }
}

function setUnlocked(value) {
  gate.hidden = value;
  manager.hidden = !value;
  if (!value) sessionStorage.removeItem(TOKEN_KEY);
}

function resetForm() {
  form.reset();
  document.querySelector('#mod-id').value = '';
  document.querySelector('#mod-color').value = '#ef233c';
  document.querySelector('#mod-published').checked = true;
  document.querySelector('#form-title').textContent = 'Add a mod';
  document.querySelector('#cancel-edit').hidden = true;
}

function renderLibrary() {
  const list = document.querySelector('#manager-list');
  list.replaceChildren();
  document.querySelector('#library-count').textContent = `${mods.length} saved`;
  if (!mods.length) {
    const message = document.createElement('p');
    message.className = 'library-empty';
    message.textContent = 'Your mod library is empty.';
    list.append(message);
    return;
  }
  mods.forEach(mod => {
    const item = document.createElement('div');
    item.className = 'manager-item';
    const info = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = mod.name;
    const status = document.createElement('span');
    status.textContent = mod.published ? 'Published' : 'Draft';
    status.className = mod.published ? 'status live' : 'status';
    info.append(name, status);
    const actions = document.createElement('div');
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.textContent = 'Edit';
    edit.addEventListener('click', () => editMod(mod.id));
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.textContent = mod.published ? 'Unpublish' : 'Publish';
    toggle.addEventListener('click', () => saveMods(mods.map(value => value.id === mod.id ? {...value, published: !value.published} : value)));
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'danger';
    remove.textContent = 'Delete';
    remove.addEventListener('click', async () => {
      if (confirm(`Delete ${mod.name}?`)) await saveMods(mods.filter(value => value.id !== mod.id));
    });
    actions.append(edit, toggle, remove);
    item.append(info, actions);
    list.append(item);
  });
}

function editMod(id) {
  const mod = mods.find(item => item.id === id);
  if (!mod) return;
  document.querySelector('#mod-id').value = mod.id;
  document.querySelector('#mod-name').value = mod.name || '';
  document.querySelector('#mod-version').value = mod.version || '';
  document.querySelector('#mod-description').value = mod.description || '';
  document.querySelector('#mod-author').value = mod.author || '';
  document.querySelector('#mod-tags').value = mod.tags || '';
  document.querySelector('#mod-download').value = mod.download || '';
  document.querySelector('#mod-logo-url').value = mod.logo && !mod.logo.startsWith('data:') ? mod.logo : '';
  document.querySelector('#mod-color').value = mod.color || '#ef233c';
  document.querySelector('#mod-published').checked = Boolean(mod.published);
  document.querySelector('#form-title').textContent = 'Edit mod';
  document.querySelector('#cancel-edit').hidden = false;
  scrollTo({top: 0, behavior: 'smooth'});
}

function readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

document.querySelector('#key-form').addEventListener('submit', async event => {
  event.preventDefault();
  const input = document.querySelector('#secret-key');
  const error = document.querySelector('#key-error');
  error.textContent = '';
  sessionStorage.setItem(TOKEN_KEY, input.value.trim());
  try {
    await loadMods();
    input.value = '';
    setUnlocked(true);
  } catch (failure) {
    sessionStorage.removeItem(TOKEN_KEY);
    error.textContent = failure.message;
  }
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  const id = document.querySelector('#mod-id').value || crypto.randomUUID();
  const existing = mods.find(item => item.id === id);
  const file = document.querySelector('#mod-logo-file').files[0];
  const logoUrl = document.querySelector('#mod-logo-url').value.trim();
  const logo = file ? await readImage(file) : logoUrl || existing?.logo || '';
  const mod = {id, name: document.querySelector('#mod-name').value.trim(), version: document.querySelector('#mod-version').value.trim(), description: document.querySelector('#mod-description').value.trim(), author: document.querySelector('#mod-author').value.trim(), tags: document.querySelector('#mod-tags').value.trim(), download: document.querySelector('#mod-download').value.trim(), logo, color: document.querySelector('#mod-color').value, published: document.querySelector('#mod-published').checked, updatedAt: new Date().toISOString()};
  const saved = await saveMods(existing ? mods.map(item => item.id === id ? mod : item) : [mod, ...mods]);
  if (saved) resetForm();
});

document.querySelector('#cancel-edit').addEventListener('click', resetForm);
document.querySelector('#lock-manager').addEventListener('click', () => setUnlocked(false));
document.querySelector('#export-mods').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(mods, null, 2)], {type: 'application/json'});
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'xyfer-root-mods.json';
  link.click();
  URL.revokeObjectURL(link.href);
});
document.querySelector('#import-mods').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const value = JSON.parse(await file.text());
    if (!Array.isArray(value)) throw new Error();
    await saveMods(value);
  } catch {
    alert('That file is not a valid mod export.');
  }
  event.target.value = '';
});

if (token()) loadMods().then(() => setUnlocked(true)).catch(() => setUnlocked(false));
