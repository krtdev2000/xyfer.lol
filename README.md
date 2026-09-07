# xyfer.lol

Static single-page site. No build step, no dependencies — just open `index.html`.

```
index.html          Discord landing page
purchase/index.html purchase page -> store.reseller.best listing
discord/index.html  /discord -> discord.gg/xyfer redirect
404.html            not-found page
logo.svg            the X mark, standalone
styles.css          all styling (colors live in :root at the top)
script.js           canvas starfield + wordmark glitch
CNAME               xyfer.lol (used by GitHub Pages)
robots.txt          / sitemap.xml
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

The landing page points at Discord (`discord.gg/xyfer`); the invite appears in
`index.html` (button + `og:description`) and in `discord/index.html`. Update both
if it changes.

`purchase/index.html` mirrors the store listing — price, description and the
included-items list are copied from store.reseller.best and are not fetched live,
so they need editing by hand if the listing changes.

The logo is inline SVG in each page so it inherits the text color; `logo.svg` is
the same mark as a standalone white file for use elsewhere.

The starfield is drawn on a canvas that `script.js` injects into `.bg`. Density
scales with viewport area (capped at 260 stars); it pauses on hidden tabs and
renders a single static frame under `prefers-reduced-motion`.

## Theming

Every color is a variable at the top of `styles.css`:

```css
--bg:         #0a0a0c;   /* page black */
--bg-2:       #131317;   /* cards, ghost buttons */
--line:       #26262d;   /* borders */
--accent:     #d9dbe1;   /* silver highlight */
--fg-dim:     #9698a1;   /* body copy */
```

The palette is greyscale throughout — the primary button is a light silver
gradient on near-black, and the starfield uses white with a fraction of cooler
grey-blue stars. Star colors live in `drawStar()` in `script.js`, not in the CSS.
