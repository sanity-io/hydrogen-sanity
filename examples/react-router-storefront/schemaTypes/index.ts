import {defineField, defineType} from 'sanity';

export const schemaTypes = [
  defineType({
    name: 'product',
    title: 'Product',
    type: 'document',
    fields: [
      defineField({
        name: 'image',
        type: 'image',
      }),
    ],
  }),
];
