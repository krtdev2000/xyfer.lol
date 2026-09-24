const jsonHeaders = {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store'};

async function equalSecret(left, right) {
  if (!left || !right) return false;
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all([crypto.subtle.digest('SHA-256', encoder.encode(left)), crypto.subtle.digest('SHA-256', encoder.encode(right))]);
  const first = new Uint8Array(a);
  const second = new Uint8Array(b);
  let difference = first.length ^ second.length;
  for (let index = 0; index < Math.min(first.length, second.length); index += 1) difference |= first[index] ^ second[index];
  return difference === 0;
}

function cleanText(value, length) {
  return String(value || '').trim().slice(0, length);
}

function cleanLogo(value) {
  const logo = cleanText(value, 1400000);
  if (!logo) return '';
  if (logo.startsWith('data:image/') || logo.startsWith('https://')) return logo;
  return '';
}

function cleanMods(value) {
  if (!Array.isArray(value) || value.length > 250) throw new Error('Invalid mod library.');
  return value.map(item => ({
    id: cleanText(item.id, 80) || crypto.randomUUID(),
    name: cleanText(item.name, 70),
    version: cleanText(item.version, 24),
    description: cleanText(item.description, 500),
    author: cleanText(item.author, 50),
    tags: cleanText(item.tags, 100),
    download: cleanText(item.download, 2000),
    logo: cleanLogo(item.logo),
    color: /^#[0-9a-f]{6}$/i.test(item.color || '') ? item.color : '#ef233c',
    published: Boolean(item.published),
    updatedAt: new Date().toISOString()
  }));
}

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {status, headers: jsonHeaders});
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/mods' && request.method === 'GET') {
      const mods = await env.MODS.get('library', 'json');
      return json(mods || []);
    }
    if (url.pathname === '/api/verify' && request.method === 'POST') {
      const valid = await equalSecret(request.headers.get('X-Admin-Key'), env.ADMIN_KEY);
      return valid ? json({ok: true}) : json({error: 'Unauthorized'}, 401);
    }
    if (url.pathname === '/api/mods' && request.method === 'PUT') {
      const valid = await equalSecret(request.headers.get('X-Admin-Key'), env.ADMIN_KEY);
      if (!valid) return json({error: 'Unauthorized'}, 401);
      const length = Number(request.headers.get('Content-Length') || 0);
      if (length > 5000000) return json({error: 'Payload too large'}, 413);
      try {
        const mods = cleanMods(await request.json());
        await env.MODS.put('library', JSON.stringify(mods));
        return json({ok: true, count: mods.length});
      } catch (error) {
        return json({error: error.message}, 400);
      }
    }
    if (url.pathname.startsWith('/api/')) return json({error: 'Not found'}, 404);
    return env.ASSETS.fetch(request);
  }
};
