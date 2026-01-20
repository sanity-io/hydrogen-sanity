import {useEffect, useState} from 'react';
import {InstagramEmbed} from 'react-social-media-embed';

import type {SanityModuleInstagram} from '~/lib/sanity';

export default function InstagramModule({
  module,
}: {
  module: SanityModuleInstagram;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!module.url) {
    return null;
  }

  return (
    <div className="mx-auto min-h-full max-w-[400px] overflow-hidden">
      {mounted && <InstagramEmbed url={module.url} />}
    </div>
  );
}
