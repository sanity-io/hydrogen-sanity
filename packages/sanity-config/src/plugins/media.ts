import {definePlugin} from 'sanity'

export const media = definePlugin({
  name: 'media',

  mediaLibrary: {
    enabled: true,
  },

  form: {
    image: {
      assetSources: (sources) => sources.filter((source) => source.name !== 'sanity-default'),
    },
    file: {
      assetSources: (sources) => sources.filter((source) => source.name !== 'sanity-default'),
    },
  },
})
