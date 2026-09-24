import {cp, mkdir, rm} from 'node:fs/promises';

const files = ['index.html', '404.html', 'styles.css', 'script.js', 'logo.svg', 'robots.txt', 'sitemap.xml', 'CNAME'];
const directories = ['discord', 'purchase', 'root-mods'];

await rm('dist', {recursive: true, force: true});
await mkdir('dist', {recursive: true});
await Promise.all(files.map(file => cp(file, `dist/${file}`)));
await Promise.all(directories.map(directory => cp(directory, `dist/${directory}`, {recursive: true})));
