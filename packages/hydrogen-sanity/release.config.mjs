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
      range: '4.x.x',
    },
    {
      name: 'v5',
      channel: '5',
      range: '5.x.x',
    },
  ],
}
