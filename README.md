# xyfer.lol

Static single-page site. No build step, no dependencies — just open `index.html`.

```
index.html    landing page
404.html      not-found page
styles.css    all styling (colors live in :root at the top)
script.js     scroll reveals, stat counters, cursor spotlight, title glitch
CNAME         xyfer.lol (used by GitHub Pages)
robots.txt    / sitemap.xml
```

## Local preview

```bash
python -m http.server 4173
```

Then open http://localhost:4173

## Deploy

**Cloudflare Pages** — connect the repo, framework preset "None", build command empty,
output directory `/`. Add `xyfer.lol` under Custom domains; DNS is automatic if the
domain is already in the same Cloudflare account.

**GitHub Pages** — push to `main`, Settings → Pages → deploy from branch `main` / root.
The `CNAME` file sets the domain. At your registrar point:

```
A     @    185.199.108.153
A     @    185.199.109.153
A     @    185.199.110.153
A     @    185.199.111.153
CNAME www  <username>.github.io
```

**Netlify** — drag the folder onto app.netlify.com, then Domain settings → add `xyfer.lol`.

## Things to swap out

- `hi@xyfer.lol` and the discord/github/x handles in `index.html` (the three placeholder
  socials are wired to a "soon" state until you give them real URLs)
- the numbers in the `.stats` block (`data-count` attributes)
- copy in the hero, cards, and the `stack.txt` terminal block

## Theming

Every color is a variable at the top of `styles.css`:

```css
--red:      #ff2b39;   /* accent */
--red-deep: #c4101d;   /* gradient end, shadows */
--bg:       #08080a;   /* page black */
```
