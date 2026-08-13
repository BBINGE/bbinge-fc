// @ts-check
import { defineConfig } from 'astro/config';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

const contentRoot = fileURLToPath(new URL('./src/content/', import.meta.url));
/** @type {{ categories: Array<{ slug: string, parentSlug: string | null }> }} */
const categoryData = JSON.parse(readFileSync(fileURLToPath(new URL('./src/data/categories.json', import.meta.url)), 'utf8'));
const categoryParents = new Map(categoryData.categories.map((category) => [category.slug, category.parentSlug]));
const categoryPaths = new Map();
for (const category of categoryData.categories) {
  const chain = [];
  /** @type {string | null | undefined} */
  let slug = category.slug;
  while (slug) {
    chain.unshift(slug);
    slug = categoryParents.get(slug);
  }
  categoryPaths.set(category.slug, `/${chain.join('/')}/`);
}

/** @param {string} directory @returns {string[]} */
function markdownFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? markdownFiles(path) : entry.name.endsWith('.md') ? [path] : [];
  });
}

/** @param {string} source @param {string} key @returns {string | undefined} */
function frontmatterValue(source, key) {
  return source.match(new RegExp(`^${key}:\\s*["']?([^"'\\r\\n]+)`, 'm'))?.[1].trim();
}

const populatedArchiveBranches = new Set();
const populatedArchiveIndexes = new Set();
const populatedArticleCategories = new Set();
const contentLastModified = new Map();

for (const file of markdownFiles(join(contentRoot, 'archive'))) {
  const source = readFileSync(file, 'utf8');
  if (frontmatterValue(source, 'draft') === 'true') continue;
  const branch = frontmatterValue(source, 'branch');
  const index = frontmatterValue(source, 'index');
  const slug = relative(join(contentRoot, 'archive'), file).split(sep).join('/').replace(/\.md$/, '');
  const modified = frontmatterValue(source, 'updatedDate') ?? frontmatterValue(source, 'pubDate');
  if (branch) populatedArchiveBranches.add(branch);
  if (branch && index) populatedArchiveIndexes.add(`${branch}/${index}`);
  if (branch && index && modified) contentLastModified.set(`/archive/${branch}/${index}/${slug}/`, new Date(modified));
}

for (const file of markdownFiles(join(contentRoot, 'articles'))) {
  const source = readFileSync(file, 'utf8');
  if (frontmatterValue(source, 'draft') === 'true') continue;
  const category = frontmatterValue(source, 'category');
  const slug = relative(join(contentRoot, 'articles'), file).split(sep).join('/').replace(/\.md$/, '');
  const modified = frontmatterValue(source, 'updatedDate') ?? frontmatterValue(source, 'pubDate');
  /** @type {string | null | undefined} */
  let populatedSlug = category;
  while (populatedSlug) {
    populatedArticleCategories.add(populatedSlug);
    populatedSlug = categoryParents.get(populatedSlug);
  }
  if (category && modified) contentLastModified.set(`/${category}/${slug}/`, new Date(modified));
}

// https://astro.build/config
export default defineConfig({
  site: 'https://bbingefc.com',
  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [
    sitemap({
      filter: (page) => {
        const pathname = new URL(page).pathname;
        if (pathname.startsWith('/admin/')) return false;
        if (pathname === '/search/') return false;
        for (const [categorySlug, categoryPath] of categoryPaths) {
          if (pathname === categoryPath && categorySlug !== 'play') return populatedArticleCategories.has(categorySlug);
        }
        const segments = pathname.split('/').filter(Boolean);
        if (segments[0] !== 'archive') return true;
        if (segments.length === 2) return populatedArchiveBranches.has(segments[1]);
        if (segments.length === 3) return populatedArchiveIndexes.has(`${segments[1]}/${segments[2]}`);
        return true;
      },
      serialize: (item) => {
        const pathname = new URL(item.url).pathname;
        const lastmod = contentLastModified.get(pathname);
        return lastmod ? { ...item, lastmod } : item;
      },
    }),
  ]
});
