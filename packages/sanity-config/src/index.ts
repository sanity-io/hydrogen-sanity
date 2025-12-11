import {defineConfig, isDev, type Config, type PluginOptions} from 'sanity'
import {presentationTool, type PresentationPluginOptions} from 'sanity/presentation'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {colorInput} from '@sanity/color-input'
import {imageHotspotArrayPlugin} from 'sanity-plugin-hotspot-array'
import {media, mediaAssetSource} from 'sanity-plugin-media'

import {schemaTypes} from './schemaTypes'
import {structure} from './structure'
import {customDocumentActions} from './plugins/customDocumentActions'
import Navbar from './components/studio/Navbar'

const devOnlyPlugins = [visionTool()] as PluginOptions[]

type StudioConfig = {
  projectId: string
  basePath?: string
  presentation?: PresentationPluginOptions
}

export function defineStudioConfig(config: StudioConfig): Config {
  return defineConfig({
    ...config,
    dataset: 'production',

    name: 'default',
    title: 'Hydrogen Sanity',

    plugins: [
      ...(config.presentation ? [presentationTool(config.presentation)] : []),
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
