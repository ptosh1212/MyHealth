import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GITHUB_OWNER = 'ptosh1212';
const GITHUB_REPO = 'MyHealth';
const GITHUB_RELEASE_TAG = 'MyHealth';

// IMPORTANT:
// Change this to the EXACT APK filename in your GitHub release.
const APK_FILENAME = 'app-release.1.apk';

export async function GET() {
  try {
    const githubToken = process.env.GITHUB_TOKEN;

    if (!githubToken) {
      console.error('GITHUB_TOKEN is not configured.');
      return NextResponse.json(
        { error: 'Download service is not configured.' },
        { status: 500 }
      );
    }

    // Get the release
    const releaseResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/tags/${GITHUB_RELEASE_TAG}`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${githubToken}`,
          'X-GitHub-Api-Version': '2022-11-28',
        },
        cache: 'no-store',
      }
    );

    if (!releaseResponse.ok) {
      console.error(
        'GitHub release request failed:',
        releaseResponse.status,
        await releaseResponse.text()
      );

      return NextResponse.json(
        { error: 'Could not find the app release.' },
        { status: 404 }
      );
    }

    const release = await releaseResponse.json();

    // Find the APK asset
    const asset = release.assets?.find(
      (item: { name: string }) => item.name === APK_FILENAME
    );

    if (!asset) {
      console.error(
        `APK "${APK_FILENAME}" was not found in the GitHub release.`
      );

      return NextResponse.json(
        {
          error: `APK "${APK_FILENAME}" was not found in the release.`,
        },
        { status: 404 }
      );
    }

    // Download the private GitHub release asset
    const apkResponse = await fetch(asset.url, {
      headers: {
        Accept: 'application/octet-stream',
        Authorization: `Bearer ${githubToken}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
      cache: 'no-store',
    });

    if (!apkResponse.ok) {
      console.error(
        'GitHub APK download failed:',
        apkResponse.status,
        await apkResponse.text()
      );

      return NextResponse.json(
        { error: 'Could not download the APK.' },
        { status: 502 }
      );
    }

    if (!apkResponse.body) {
      return NextResponse.json(
        { error: 'APK download returned no data.' },
        { status: 502 }
      );
    }

    return new NextResponse(apkResponse.body, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.android.package-archive',
        'Content-Disposition': `attachment; filename="${APK_FILENAME}"`,
        'Content-Length':
          apkResponse.headers.get('content-length') || '',
        'Cache-Control':
          'private, no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('APK download error:', error);

    return NextResponse.json(
      { error: 'Something went wrong while downloading the APK.' },
      { status: 500 }
    );
  }
}