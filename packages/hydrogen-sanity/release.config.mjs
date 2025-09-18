export default {
  extends: '@sanity/semantic-release-preset',
  branches: [
    {
      name: 'main',
      channel: 'latest',
    },
    {
      name: 'beta',
      prerelease: true,
    },
    {
      name: 'next',
      prerelease: true,
    },
    {
      name: 'v4',
      channel: 'v4',
      range: '^4.0.0',
    },
  ],
}
