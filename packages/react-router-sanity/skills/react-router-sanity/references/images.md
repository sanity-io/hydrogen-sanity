# Images

Read this when the task touches Sanity images.

```tsx
import {SanityImage} from 'react-router-sanity/image'

// Query: image{alt, crop, hotspot, asset->{_id, url, metadata{lqip}}}
<SanityImage value={page.image} sizes="(min-width: 64rem) 50vw, 100vw" priority />
```

- With `asset->url` in the query, the component reads the project and dataset from the URL.
  Otherwise pass `config={{projectId, dataset}}`.
- `aspectRatio={16 / 9}` crops around the hotspot.
- `priority` loads the image eagerly with `fetchpriority="high"`. Use it for the largest image
  above the fold.
- `metadata.lqip` in the query enables a blurred placeholder.
- `urlFor(value, config)` returns an `@sanity/image-url` builder for other sizes.

The component has no hooks and no effects, so it works in server components.

Media Library: query the dataset asset that Studio links (`asset->`). Do not pass a
`media-library:` reference to `urlFor`.
