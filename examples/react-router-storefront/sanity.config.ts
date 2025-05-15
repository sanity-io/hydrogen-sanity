import {defineConfig} from 'sanity';
import {structureTool} from 'sanity/structure';
import {visionTool} from '@sanity/vision';
import {schemaTypes} from './schemaTypes';

const projectId = import.meta.env.SANITY_STUDIO_PROJECT_ID;
const dataset = import.meta.env.SANITY_STUDIO_DATASET;

export default defineConfig([
  {
    name: 'default',
    title: 'Hydrogen Storefront',
    basePath: '/studio/default',

    projectId,
    dataset,

    plugins: [structureTool(), visionTool()],

    schema: {
      types: schemaTypes,
    },
  },
  {
    name: 'other',
    title: 'Hydrogen Storefront',
    basePath: '/studio/other',

    projectId,
    dataset,

    plugins: [structureTool(), visionTool()],

    schema: {
      types: schemaTypes,
    },
  },
]);
