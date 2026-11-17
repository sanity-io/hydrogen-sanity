import {type ReactNode, type Ref, useCallback} from 'react'

import {getImageProps, type GetImagePropsOptions} from './getImageProps'

export interface ImageProps extends GetImagePropsOptions {
  ref?: Ref<HTMLImageElement>
}

/**
 * Renders an image from the Sanity Image CDN, with the same sizing props as
 * Hydrogen's `<Image>` (`width`, `aspectRatio`, `sizes`, `loader`,
 * `srcSetOptions`).
 *
 * Pass the whole image object from a GROQ query: the crop set in the Studio
 * is applied, the CDN crop is positioned around the hotspot when
 * `aspectRatio` differs, and `placeholder="blur"` uses
 * `asset->metadata.lqip`. The project and dataset come from the Sanity
 * provider. See {@link getImageProps} for every option.
 *
 * @example
 * ```tsx
 * <Image src={page.image} aspectRatio="4/5" sizes="(min-width: 45em) 50vw, 100vw" placeholder="blur" />
 * ```
 */
export function Image({ref, onLoad, ...options}: ImageProps): ReactNode {
  const {props} = getImageProps(options)
  const hasPlaceholder =
    options.placeholder === 'blur' && options.style?.backgroundImage === undefined

  // The image can finish loading before hydration, in which case `onLoad` never fires.
  const setRef = useCallback(
    (img: HTMLImageElement | null) => {
      if (img && hasPlaceholder && img.complete && img.naturalWidth > 0) {
        clearPlaceholder(img)
      }
      if (typeof ref === 'function') return ref(img)
      if (ref) ref.current = img
      return undefined
    },
    [ref, hasPlaceholder],
  )

  return (
    <img
      {...props}
      ref={setRef}
      onLoad={(event) => {
        if (hasPlaceholder) clearPlaceholder(event.currentTarget)
        onLoad?.(event)
      }}
    />
  )
}

function clearPlaceholder(img: HTMLImageElement) {
  img.style.backgroundImage = 'none'
}
