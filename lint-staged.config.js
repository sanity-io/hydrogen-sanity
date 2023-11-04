module.exports = {
  '**/*': [() => 'npm run format', () => 'npm run lint -- -- --fix'],
}
