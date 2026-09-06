# xyfer.lol

Static single-page site. No build step, no dependencies — just open `index.html`.

```
index.html         Discord landing page
discord/index.html /discord -> discord.gg/xyfer redirect
404.html           not-found page
logo.svg           the X mark, standalone
styles.css         all styling (colors live in :root at the top)
script.js          wordmark glitch + footer year
CNAME              xyfer.lol (used by GitHub Pages)
robots.txt         / sitemap.xml
```

## Local preview

```bash
python -m http.server 4173
```

Then open http://localhost:4173

## Deploy — GitHub Pages + Namecheap

Hosting is GitHub Pages, deployed straight from the `main` branch. There is no build
step and no workflow file: whatever is committed at the repo root is what goes live,
usually within a minute of pushing.

**1. Push the repo**

```
git remote add origin https://github.com/<username>/xyfer.lol.git
git push -u origin main
```

**2. Turn on Pages** — repo Settings → Pages → Source: *Deploy from a branch*,
Branch: `main`, folder: `/ (root)`. The `CNAME` file in this repo sets the custom
domain to `xyfer.lol`, so that field fills itself in.

**3. DNS at Namecheap** — Domain List → Manage → **Advanced DNS**. Delete the default
parking records first (`CNAME www → parkingpage.namecheap.com` and the URL Redirect on
`@`), then add:

```
A Record       @     185.199.108.153      Automatic
A Record       @     185.199.109.153      Automatic
A Record       @     185.199.110.153      Automatic
A Record       @     185.199.111.153      Automatic
CNAME Record   www   <username>.github.io.   Automatic
```

**4. HTTPS** — once DNS resolves, tick **Enforce HTTPS** in Settings → Pages. The
checkbox stays greyed out until GitHub can verify the domain and issue the certificate.

Note: `.nojekyll` stops GitHub from running the files through Jekyll. Do not delete it.

## Content

The site is a single landing page pointing at Discord (`discord.gg/xyfer`).
The invite appears in three places in `index.html` — the button, the handle
underneath it, and the `og:description` — plus `discord/index.html`. Update all
four if the invite ever changes.

The logo is inline SVG in each page so it inherits the text color; `logo.svg` is
the same mark as a standalone white file for use elsewhere.

## Theming

Every color is a variable at the top of `styles.css`:

```css
--red:      #ff2b39;   /* accent */
--red-deep: #c4101d;   /* gradient end, shadows */
--bg:       #08080a;   /* page black */
```
