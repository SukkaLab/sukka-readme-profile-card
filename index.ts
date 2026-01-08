import fs from 'node:fs';
import { asyncRetry as retry } from 'foxts/async-retry';
import path from 'node:path';
import process from 'node:process';
import { githubSukka } from './github-stats-json';
import { nullthrow } from 'foxts/guard';

// const baseUrl = new URL('https://github-readme-stats.vercel.app/api');
// baseUrl.searchParams.set('username', 'sukkaw');
// baseUrl.searchParams.set('show_icons', 'true');
// baseUrl.searchParams.set('hide_border', 'true');
// baseUrl.searchParams.set('include_all_commits', 'true');
// baseUrl.searchParams.set('hide_title', 'true');
// baseUrl.searchParams.set('count_private', 'true');
// baseUrl.searchParams.set('rank_icon', 'percentile');
// baseUrl.searchParams.set('show', 'reviews,prs_merged' /** reviews,discussions_started,discussions_answered */);

// const lightUrl = new URL(baseUrl);
// lightUrl.searchParams.set('icon_color', '586069');
// lightUrl.searchParams.set('title_color', '60696f');

// const darkUrl = new URL(baseUrl);
// darkUrl.searchParams.set('icon_color', '60696f');
// darkUrl.searchParams.set('title_color', '8d939d');
// darkUrl.searchParams.set('bg_color', '1f2228');
// darkUrl.searchParams.set('text_color', '8d939d');

const publicDir = path.resolve(__dirname, 'public');

(async () => {
  try {
    const pat = nullthrow(process.env.GITHUB_TOKEN);
    const githubStats = await retry(() => githubSukka(pat), { retries: 10 });

    fs.writeFileSync(path.resolve(publicDir, 'github-stats.json'), JSON.stringify(githubStats));
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
