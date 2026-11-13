#!/usr/bin/env node
/**
 * Tell Bing, Yandex, Seznam and Naver (IndexNow) about every URL in the
 * sitemap, so new and changed pages are crawled within hours instead of days.
 * Google does not use IndexNow; it reads the sitemap submitted in Search Console.
 *
 *   node scripts/seo/indexnow.mjs [path ...]   (no paths: the whole sitemap)
 *
 * The key is public by design: dashboard/public/<key>.txt proves the site
 * owns it.
 */
const HOST = 'irishpropertydata.com';
const KEY = 'f9eebf1e32e6e59a9fb8acee7c3ca949';
const ORIGIN = `https://${HOST}`;

const paths = process.argv.slice(2).filter((a) => a.startsWith('/'));
let urls = paths.map((p) => ORIGIN + p);
if (!urls.length) {
  const xml = await (await fetch(`${ORIGIN}/sitemap.xml`)).text();
  urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}
const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `${ORIGIN}/${KEY}.txt`, urlList: urls }),
});
// 200 and 202 both mean accepted
console.log(`IndexNow: ${res.status} ${res.statusText} for ${urls.length} URLs`);
if (res.status >= 400) {
  console.log(await res.text());
  process.exitCode = 1;
}
