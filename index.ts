import fs from 'node:fs';
import { asyncRetry as retry } from 'foxts/async-retry';
import path from 'node:path';
import process from 'node:process';
import { githubSukka } from './github-stats-json';
import { nullthrow } from 'foxts/guard';

const publicDir = path.resolve(__dirname, 'public');

(async () => {
  try {
    const pat = nullthrow(process.env.PAT_1);
    const githubStats = await retry(() => githubSukka(pat), { retries: 10 });

    fs.writeFileSync(path.resolve(publicDir, 'github-stats.json'), JSON.stringify(githubStats));
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
