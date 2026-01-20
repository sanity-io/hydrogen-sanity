import clsx from 'clsx';

import HeaderActions from '~/components/global/HeaderActions';
import HeaderBackground from '~/components/global/HeaderBackground';
import MobileNavigation from '~/components/global/MobileNavigation';
import Navigation from '~/components/global/Navigation';
import {useRootLoaderData} from '~/root';

export default function Header() {
  const rootData = useRootLoaderData();
  const {menuLinks} = rootData?.layout || {};

  return (
    <header
      className={clsx(
        'align-center fixed top-0 z-40 flex h-header-sm w-full px-4',
        'md:px-8',
        'lg:h-header-lg',
      )}
      role="banner"
    >
      <HeaderBackground />
      {menuLinks && <MobileNavigation menuLinks={menuLinks} />}
      {menuLinks && <Navigation menuLinks={menuLinks} />}
      <HeaderActions />
    </header>
  );
}
