import fs from 'node:fs';
import { asyncRetry as retry } from 'foxts/async-retry';
import path from 'node:path';
import process from 'node:process';
import { githubSukka } from './github-stats-json';
import { nullthrow } from 'foxts/guard';

const baseUrl = new URL('https://github-readme-stats.vercel.app/api');
baseUrl.searchParams.set('username', 'sukkaw');
baseUrl.searchParams.set('show_icons', 'true');
baseUrl.searchParams.set('hide_border', 'true');
baseUrl.searchParams.set('include_all_commits', 'true');
baseUrl.searchParams.set('hide_title', 'true');
baseUrl.searchParams.set('count_private', 'true');
baseUrl.searchParams.set('rank_icon', 'percentile');
baseUrl.searchParams.set('show', 'reviews,prs_merged' /** reviews,discussions_started,discussions_answered */);

if (process.env.CARD_INSTANCE_DOMAIN) {
  baseUrl.hostname = process.env.CARD_INSTANCE_DOMAIN;
}

const lightUrl = new URL(baseUrl);
lightUrl.searchParams.set('icon_color', '586069');
lightUrl.searchParams.set('title_color', '60696f');

const darkUrl = new URL(baseUrl);
darkUrl.searchParams.set('icon_color', '60696f');
darkUrl.searchParams.set('title_color', '8d939d');
darkUrl.searchParams.set('bg_color', '1f2228');
darkUrl.searchParams.set('text_color', '8d939d');

async function fetchSvg(url: URL) {
  // const random = Math.random().toString(36).slice(2);
  // url.searchParams.set('_cache_busting', random);

  const svg = await fetch(url, { signal: AbortSignal.timeout(10 * 1000) })
    .then(r => r.text())
    .catch(e => {
      console.log('[GitHub README Stats Error] fetch failed', url.pathname + url.search, e);
      throw e;
    });

  if (svg.includes('went wrong') || svg.includes('file an issue') || svg.includes('rate limit')) {
    console.log('[GitHub README Stats Error] Backend issue', url.pathname + url.search, svg);
    throw new Error('Failed to fetch');
  } else if (svg.includes('>0</text>')) {
    console.log('[GitHub README Stats Error] Some 0 value', url.pathname + url.search, svg);
    throw new Error('Failed to fetch');
  }
  return svg;
}

const publicDir = path.resolve(__dirname, 'public');

(async () => {
  try {
    const pat = nullthrow(process.env.GITHUB_TOKEN);
    const githubStats = await retry(() => githubSukka(pat), { retries: 10 });

    fs.writeFileSync(path.resolve(publicDir, 'github-stats.json'), JSON.stringify(githubStats));

    const [light, dark] = await Promise.all([
      retry(() => fetchSvg(lightUrl), { retries: 10 }),
      retry(() => fetchSvg(darkUrl), { retries: 10 })
    ]);

    fs.writeFileSync(path.resolve(publicDir, 'light.svg'), light);
    fs.writeFileSync(path.resolve(publicDir, 'dark.svg'), dark);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
