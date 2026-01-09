import { appendArrayInPlace } from 'foxts/append-array-in-place';
import { tagged as gql } from 'foxts/tagged';

const query = gql`
  query userInfo($login: String!, $repoAfter: String) {
      user(login: $login) {
        name
        login
        contributionsCollection {
          restrictedContributionsCount
        }
        repositoriesContributedTo(first: 1, contributionTypes: [COMMIT, ISSUE, PULL_REQUEST, REPOSITORY]) {
          totalCount
        }
        pullRequests(first: 1) {
          totalCount
        }
        pullRequestsMerged: pullRequests(states: MERGED, first: 1) {
          totalCount
        }
        openIssues: issues(states: OPEN) {
          totalCount
        }
        closedIssues: issues(states: CLOSED) {
          totalCount
        }
        followers {
          totalCount
        }
        repositories(first: 100, after: $repoAfter, ownerAffiliations: OWNER, orderBy: {direction: DESC, field: STARGAZERS}) {
          totalCount
          pageInfo {
            endCursor
            hasNextPage
          }
          nodes {
            stargazers {
              totalCount
            }
            forks {
              totalCount
            }
          }
        }
      }
  }
`;

function fetcher(ghPAT: string, repoCursor?: string) {
  return fetch(
    'https://api.github.com/graphql',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ghPAT}`,
        'User-Agent': 'Sukka API - Fetch My GitHub User Info'
      },
      body: JSON.stringify({
        variables: {
          login: 'sukkaw',
          repoAfter: repoCursor || null
        },
        query
      })
    }
  );
}

function fetcherTotalCommit(ghPAT: string) {
  return fetch('https://api.github.com/search/commits?q=author:sukkaw', {
    headers: {
      Accept: 'application/vnd.github.cloak-preview',
      'User-Agent': 'Sukka API - Fetch My GitHub User Info',
      Authorization: `Bearer ${ghPAT}`
    }
  });
}

export async function githubSukka(ghPAT: string) {
  const stats = {
    totalPRs: 'N/A',
    totalMergedPRs: 'N/A',
    followers: 'N/A',
    totalCommits: 'N/A',
    totalIssues: 'N/A',
    totalStars: 'N/A',
    totalForks: 'N/A',
    contributedTo: 'N/A'
  };

  const [statDataResp, totalCommitData] = await Promise.all([
    fetcher(ghPAT).then((res) => {
      if (res.ok) return res.json();
      throw new Error(`GitHub GraphQL API responded with status ${res.status}`);
    }),
    fetcherTotalCommit(ghPAT).then((res) => {
      if (res.ok) return res.json();
      throw new Error(`GitHub Search API responded with status ${res.status}`);
    })
  ]);

  if (statDataResp) {
    const statData = (statDataResp).data.user;
    // If there is a next page of repositories, fetch one more page to count up to ~200 repos
    const repos = statData.repositories;
    if (repos.pageInfo?.hasNextPage && repos.nodes.length < 200) {
      const nextResp = await fetcher(ghPAT, repos.pageInfo.endCursor).then((res) => {
        if (res.ok) return res.json();
        return null;
      });
      if (nextResp?.data?.user?.repositories) {
        appendArrayInPlace(statData.repositories.nodes, nextResp.data.user.repositories.nodes);
      }
    }

    stats.totalIssues = statData.openIssues.totalCount + statData.closedIssues.totalCount;
    stats.followers = statData.followers.totalCount;
    stats.totalPRs = statData.pullRequests.totalCount;
    stats.totalMergedPRs = statData.pullRequestsMerged.totalCount;
    stats.contributedTo = statData.repositoriesContributedTo.totalCount;
    stats.totalStars = statData.repositories.nodes.reduce((prev: number, curr: any) => prev + curr.stargazers.totalCount, 0);
    stats.totalForks = statData.repositories.nodes.reduce((prev: number, curr: any) => prev + curr.forks.totalCount, 0);
    if (totalCommitData) {
      stats.totalCommits = (totalCommitData).total_count + statData.contributionsCollection.restrictedContributionsCount;
    }
  }

  return stats;
  // return new Response(JSON.stringify(stats), {
  //   headers: {
  //     'access-control-allow-origin': '*',
  //     'cache-control': 'public, max-age=28800, stale-while-revalidate=3600, stale-if-error=3600'
  //   }
  // });
};
