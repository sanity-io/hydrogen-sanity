import {Await} from 'react-router';
import {CartForm} from '@shopify/hydrogen';
import {Cart} from '@shopify/hydrogen/storefront-api-types';
import clsx from 'clsx';
import {useEffect} from 'react';

import {CartDrawer, useDrawer} from '~/components/cart/CartDrawer';
import CartToggle from '~/components/cart/CartToggle';
import {CountrySelector} from '~/components/global/CountrySelector';
import {UserIcon} from '~/components/icons/User';
import {Link} from '~/components/Link';
import {useCartFetchers} from '~/hooks/useCartFetchers';
import {useRootLoaderData} from '~/root';

export default function HeaderActions() {
  const {isOpen, openDrawer, closeDrawer} = useDrawer();
  const {cart} = useRootLoaderData();

  const addToCartFetchers = useCartFetchers(CartForm.ACTIONS.LinesAdd);

  useEffect(() => {
    if (
      isOpen ||
      addToCartFetchers.length === 0 ||
      addToCartFetchers[0].state === 'submitting'
    )
      return;
    openDrawer();
  }, [addToCartFetchers, isOpen, openDrawer]);

  return (
    <>
      <div
        className={clsx(
          'absolute right-0 flex h-full items-center',
          'md:mr-4',
        )}
      >
        <div
          className={clsx(
            'hidden',
            'lg:block',
          )}
        >
          <CountrySelector />
        </div>
        <Link
          className={clsx([
            'hidden h-[2.4rem] items-center rounded-sm bg-darkGray bg-opacity-0 p-2',
            'lg:flex',
            'hover:bg-opacity-10',
          ])}
          to="/account"
        >
          <UserIcon />
        </Link>
        <div className="ml-2 mr-4 flex h-full items-center justify-center py-4">
          <Await resolve={cart}>
            {(cart) => (
              <CartToggle cart={cart as Cart} isOpen openDrawer={openDrawer} />
            )}
          </Await>
        </div>
      </div>

      <Await resolve={cart}>
        {(cart) => (
          <CartDrawer cart={cart as Cart} open={isOpen} onClose={closeDrawer} />
        )}
      </Await>
    </>
  );
}
