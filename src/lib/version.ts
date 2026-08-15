// Keep this in sync with android/app/build.gradle -> versionName.
export const APP_VERSION = '1.0.0';
export const GITHUB_REPO = 'ridhanbholakiya198-code/nova-arcade-collection';
export const GITHUB_RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases`;

export type VersionCheckResult =
  | { status: 'latest'; current: string }
  | { status: 'update-available'; current: string; latest: string; url: string }
  | { status: 'error'; message: string };

function cleanVersion(v: string): string {
  return v.trim().replace(/^v/i, '');
}

// Compares two dotted version strings, e.g. "1.2.0" vs "1.10.0".
// Returns >0 if a > b, <0 if a < b, 0 if equal.
function compareVersions(a: string, b: string): number {
  const pa = cleanVersion(a).split('.').map(n => parseInt(n, 10) || 0);
  const pb = cleanVersion(b).split('.').map(n => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

async function fetchJsonWithTimeout(url: string, ms = 7000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// Checks GitHub for the latest published release first (this is where real
// APKs get uploaded), and falls back to tags if no release exists yet so the
// menu still says something sensible before the first release is cut.
export async function checkForUpdate(): Promise<VersionCheckResult> {
  try {
    let latestTag: string | null = null;
    let releaseUrl = GITHUB_RELEASES_URL;

    try {
      const release = await fetchJsonWithTimeout(
        `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`
      );
      if (release?.tag_name) {
        latestTag = release.tag_name;
        releaseUrl = release.html_url || releaseUrl;
      }
    } catch {
      // No releases yet (404) or a network hiccup — try tags next.
    }

    if (!latestTag) {
      const tags = await fetchJsonWithTimeout(
        `https://api.github.com/repos/${GITHUB_REPO}/tags`
      );
      if (Array.isArray(tags) && tags.length > 0 && tags[0]?.name) {
        latestTag = tags[0].name;
      }
    }

    if (!latestTag) {
      return { status: 'latest', current: APP_VERSION };
    }

    const cleanLatest = cleanVersion(latestTag);
    if (compareVersions(cleanLatest, APP_VERSION) > 0) {
      return { status: 'update-available', current: APP_VERSION, latest: cleanLatest, url: releaseUrl };
    }
    return { status: 'latest', current: APP_VERSION };
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : 'Could not check for updates' };
  }
}
