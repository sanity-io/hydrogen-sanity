import {
  Link as RouterLink,
  type LinkProps as RouterLinkProps,
  NavLink as RouterNavLink,
  type NavLinkProps as RouterNavLinkProps,
} from 'react-router';
import {forwardRef} from 'react';
import {useRootLoaderData} from '~/root';

type LinkProps = Omit<RouterLinkProps, 'className'> & {
  className?: RouterNavLinkProps['className'] | RouterLinkProps['className'];
};

const ABSOLUTE_URL_REGEX = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

export const Link = forwardRef<HTMLAnchorElement, LinkProps>((props, ref) => {
  const {to, className, ...resOfProps} = props;
  const {selectedLocale} = useRootLoaderData();

  let toWithLocale = to;

  if (typeof to === 'string' && !ABSOLUTE_URL_REGEX.test(to) && to != '..') {
    toWithLocale = selectedLocale ? `${selectedLocale.pathPrefix}${to}` : to;
  }

  if (typeof className === 'function') {
    return (
      <RouterNavLink
        to={toWithLocale}
        className={className}
        {...resOfProps}
        ref={ref}
      />
    );
  }

  return (
    <RouterLink
      to={toWithLocale}
      className={className}
      {...resOfProps}
      ref={ref}
    />
  );
});
