import {defineConfig, isDev} from 'sanity'

import {structureTool} from 'sanity/structure'
import {schemaTypes} from './schemaTypes'
import {structure} from './structure'

import {visionTool} from '@sanity/vision'
import {colorInput} from '@sanity/color-input'
import {imageHotspotArrayPlugin} from 'sanity-plugin-hotspot-array'
import {media, mediaAssetSource} from 'sanity-plugin-media'
import {customDocumentActions} from './plugins/customDocumentActions'
import Navbar from './components/studio/Navbar'

const devOnlyPlugins = [visionTool()]

type Config = {
  projectId: string
  basePath?: string
}

export function defineStudioConfig(config: Config) {
  return defineConfig({
    ...config,
    dataset: 'production',

    name: 'default',
    title: 'Hydrogen Sanity',

    plugins: [
      structureTool({structure}),
      colorInput(),
      imageHotspotArrayPlugin(),
      customDocumentActions(),
      media(),
      ...(isDev ? devOnlyPlugins : []),
    ],

    schema: {
      types: schemaTypes,
    },

    form: {
      file: {
        assetSources: (previousAssetSources) => {
          return previousAssetSources.filter((assetSource) => assetSource !== mediaAssetSource)
        },
      },
      image: {
        assetSources: (previousAssetSources) => {
          return previousAssetSources.filter((assetSource) => assetSource === mediaAssetSource)
        },
      },
    },

    studio: {
      components: {
        navbar: Navbar,
      },
    },
  })
}
