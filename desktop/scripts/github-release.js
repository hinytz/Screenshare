'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const https = require('https');
const path = require('path');

const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = pkg.version;
const tag = `v${version}`;
const owner = pkg.build && pkg.build.publish && pkg.build.publish.owner;
const repo = pkg.build && pkg.build.publish && pkg.build.publish.repo;
const token = String(process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '').trim();

if (!owner || !repo) {
  throw new Error('build.publish.owner and build.publish.repo must be set in package.json');
}
if (!token) {
  throw new Error('GH_TOKEN is not set');
}

function git(args) {
  return execFileSync('git', args, { cwd: path.join(root, '..'), encoding: 'utf8' }).trim();
}

function github(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const payload = body == null ? null : JSON.stringify(body);
    const req = https.request(
      {
        hostname: 'api.github.com',
        path: apiPath,
        method,
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'User-Agent': 'screenshare-desktop-release',
          'X-GitHub-Api-Version': '2022-11-28',
          ...(payload
            ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
            : {}),
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          let json = null;
          if (text) {
            try {
              json = JSON.parse(text);
            } catch {
              json = { message: text };
            }
          }
          if (res.statusCode >= 400) {
            const error = new Error(`${method} ${apiPath} ${res.statusCode}: ${text}`);
            error.statusCode = res.statusCode;
            error.body = json;
            reject(error);
            return;
          }
          resolve(json);
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function findRelease() {
  const releases = await github('GET', `/repos/${owner}/${repo}/releases?per_page=100`);
  return (releases || []).find((release) => release.tag_name === tag || release.tag_name === version) || null;
}

function remoteTagSha() {
  try {
    const line = git(['ls-remote', '--tags', 'origin', `refs/tags/${tag}`]);
    const sha = String(line).split(/\s+/)[0];
    return sha || '';
  } catch {
    return '';
  }
}

function ensureGitTag() {
  let sha = remoteTagSha();
  if (sha) {
    try {
      git(['rev-parse', tag]);
    } catch {
      git(['fetch', 'origin', `refs/tags/${tag}:refs/tags/${tag}`]);
    }
    console.log(`Git tag ${tag} already on origin (${sha.slice(0, 7)})`);
    return sha;
  }

  try {
    sha = git(['rev-parse', tag]);
  } catch {
    sha = git(['rev-parse', 'HEAD']);
    git(['tag', tag, sha]);
    console.log(`Created git tag ${tag} at ${sha.slice(0, 7)}`);
  }

  git(['push', 'origin', `refs/tags/${tag}`]);
  console.log(`Pushed git tag ${tag}`);
  return sha;
}

async function ensureRelease() {
  const sha = ensureGitTag();
  const existing = await findRelease();
  if (existing) {
    console.log(`GitHub release for ${tag} already exists (${existing.draft ? 'draft' : 'published'})`);
    return existing;
  }

  const payload = {
    tag_name: tag,
    target_commitish: sha,
    name: version,
    draft: false,
    prerelease: false,
  };

  try {
    const created = await github('POST', `/repos/${owner}/${repo}/releases`, payload);
    console.log(`Created GitHub release ${created.html_url}`);
    return created;
  } catch (error) {
    if (error.statusCode !== 422) throw error;
    console.warn('Published release was rejected; creating a draft instead');
    const draft = await github('POST', `/repos/${owner}/${repo}/releases`, { ...payload, draft: true });
    console.log(`Created draft GitHub release ${draft.html_url}`);
    return draft;
  }
}

async function publishRelease() {
  const release = await findRelease();
  if (!release) {
    throw new Error(`No GitHub release found for ${tag}`);
  }
  if (!release.draft) {
    console.log(`GitHub release ${tag} is already published`);
    return release;
  }
  const published = await github('PATCH', `/repos/${owner}/${repo}/releases/${release.id}`, { draft: false });
  console.log(`Published GitHub release ${published.html_url}`);
  return published;
}

const action = process.argv[2];
const run = action === 'publish' ? publishRelease : ensureRelease;
run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
