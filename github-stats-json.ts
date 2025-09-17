import { tagged as gql } from 'foxts/tagged';

const query = gql`
    query userInfo($login: String!) {
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
        openIssues: issues(states: OPEN) {
          totalCount
        }
        closedIssues: issues(states: CLOSED) {
          totalCount
        }
        followers {
          totalCount
        }
        repositories(first: 100, ownerAffiliations: OWNER, orderBy: {direction: DESC, field: STARGAZERS}) {
          totalCount
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

function fetcher(ghPAT: string) {
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
          login: 'sukkaw'
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
      return null;
    }),
    fetcherTotalCommit(ghPAT).then((res) => {
      if (res.ok) return res.json();
      return null;
    })
  ]);

  try {
    if (statDataResp) {
      const statData = (statDataResp).data.user;
      stats.totalIssues = statData.openIssues.totalCount + statData.closedIssues.totalCount;
      stats.followers = statData.followers.totalCount;
      stats.totalPRs = statData.pullRequests.totalCount;
      stats.contributedTo = statData.repositoriesContributedTo.totalCount;
      stats.totalStars = statData.repositories.nodes.reduce((prev: number, curr: any) => prev + curr.stargazers.totalCount, 0);
      stats.totalForks = statData.repositories.nodes.reduce((prev: number, curr: any) => prev + curr.forks.totalCount, 0);
      if (totalCommitData) {
        stats.totalCommits = (totalCommitData).total_count + statData.contributionsCollection.restrictedContributionsCount;
      }
    }
  } catch (e) {
    console.log(e);
  }

  return stats;
  // return new Response(JSON.stringify(stats), {
  //   headers: {
  //     'access-control-allow-origin': '*',
  //     'cache-control': 'public, max-age=28800, stale-while-revalidate=3600, stale-if-error=3600'
  //   }
  // });
};
