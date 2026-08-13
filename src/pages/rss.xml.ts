import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { site } from '../config/site';

const escapeXml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

const wrapCdata = (value: string) => `<![CDATA[${value.replaceAll(']]>', ']]]]><![CDATA[>')}]]>`;

export const GET: APIRoute = async () => {
  const now = Date.now();
  const [articles, archiveRecords] = await Promise.all([
    getCollection('articles', ({ data }) => !data.draft && data.pubDate.valueOf() <= now),
    getCollection('archive', ({ data }) => !data.draft && data.pubDate.valueOf() <= now),
  ]);

  const items = [
    ...articles.map((entry) => ({
      title: entry.data.title,
      description: entry.data.description,
      body: entry.body ?? entry.data.description,
      pubDate: entry.data.pubDate,
      url: `${site.url}/${entry.data.category}/${entry.id}/`,
    })),
    ...archiveRecords.map((entry) => ({
      title: entry.data.title,
      description: entry.data.description,
      body: entry.body ?? entry.data.description,
      pubDate: entry.data.pubDate,
      url: `${site.url}/archive/${entry.data.branch}/${entry.data.index}/${entry.id}/`,
    })),
  ]
    .sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf())
    .slice(0, 50);

  const itemXml = items
    .map(
      (item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.url)}</link>
      <description>${wrapCdata(item.body)}</description>
      <pubDate>${item.pubDate.toUTCString()}</pubDate>
      <guid isPermaLink="true">${escapeXml(item.url)}</guid>
    </item>`
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(site.name)}</title>
    <link>${escapeXml(`${site.url}/`)}</link>
    <description>${escapeXml(site.tagline)}</description>
    <language>ko-KR</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${itemXml}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
};
