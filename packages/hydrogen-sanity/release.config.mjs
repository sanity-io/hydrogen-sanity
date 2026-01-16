export default {
  extends: '@sanity/semantic-release-preset',
  branches: ['main', {name: 'v5', channel: '5', range: '5.x.x'}],
}
