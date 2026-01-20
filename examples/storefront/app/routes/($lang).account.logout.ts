import {redirect} from 'react-router';

import type {Route} from './+types/($lang).account.logout';

export async function doLogout(context: Route.ActionArgs['context']) {
  const {session, cart} = context;
  session.unset('customerAccessToken');

  const localeCountry = context?.storefront?.i18n?.country;

  const result = await cart.updateBuyerIdentity({
    customerAccessToken: null,
    countryCode: localeCountry,
  });

  const headers = cart.setCartId(result.cart.id);

  headers.append('Set-Cookie', await session.commit());

  return redirect(`${context.storefront.i18n.pathPrefix}/account/login`, {
    headers,
  });
}

export async function loader({context}: Route.LoaderArgs) {
  return redirect(context.storefront.i18n.pathPrefix);
}

export async function action({context}: Route.ActionArgs) {
  return doLogout(context);
}
