import {Form, useActionData, useNavigation, redirect} from 'react-router';
import type {SeoHandleFunction} from '@shopify/hydrogen';
import type {CustomerAccessTokenCreatePayload} from '@shopify/hydrogen/storefront-api-types';
import clsx from 'clsx';
import {useState} from 'react';

import FormCardWrapper from '~/components/account/FormCardWrapper';
import FormFieldText from '~/components/account/FormFieldText';
import Button from '~/components/elements/Button';
import {Link} from '~/components/Link';
import {badRequest} from '~/lib/utils';
import type {Route} from './+types/($lang).account.login';

const seo: SeoHandleFunction<typeof loader> = () => ({
  title: 'Login',
});

export const handle = {
  seo,
  isPublic: true,
};

export async function loader({context, params}: Route.LoaderArgs) {
  const customerAccessToken = await context.session.get('customerAccessToken');

  if (customerAccessToken) {
    return redirect(params.lang ? `/${params.lang}/account` : '/account');
  }

  return null;
}

type ActionData = {
  formError?: string;
};

export async function action({request, context, params}: Route.ActionArgs) {
  const formData = await request.formData();

  const email = formData.get('email');
  const password = formData.get('password');

  if (
    !email ||
    !password ||
    typeof email !== 'string' ||
    typeof password !== 'string'
  ) {
    return badRequest<ActionData>({
      formError: 'Please provide both an email and a password.',
    });
  }

  const {session, storefront, cart} = context;

  try {
    const customerAccessToken = await doLogin(context, {email, password});
    session.set('customerAccessToken', customerAccessToken);

    const result = await cart.updateBuyerIdentity({customerAccessToken});

    const headers = cart.setCartId(result.cart.id);

    headers.append('Set-Cookie', await session.commit());

    return redirect(params.lang ? `/${params.lang}/account` : '/account', {
      headers,
    });
  } catch (error: any) {
    if (storefront.isApiError(error)) {
      return badRequest({
        formError: 'Something went wrong. Please try again later.',
      });
    }

    return badRequest({
      formError:
        'Sorry. We did not recognize either your email or password. Please try to sign in again or create a new account.',
    });
  }
}

export default function Login() {
  const actionData = useActionData<ActionData>();
  const [nativeEmailError, setNativeEmailError] = useState<null | string>(null);
  const [nativePasswordError, setNativePasswordError] = useState<null | string>(
    null,
  );
  const navigation = useNavigation();

  return (
    <div
      className={clsx(
        'my-32 px-4',
        'md:px-8',
      )}
    >
      <div className="flex justify-center">
        <FormCardWrapper title="Sign in">
          <Form method="post" noValidate>
            {actionData?.formError && (
              <div className="mb-6 flex items-center justify-center rounded-sm border border-red p-4 text-sm text-red">
                <p>{actionData.formError}</p>
              </div>
            )}

            <div className="space-y-4">
              <FormFieldText
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                aria-label="Email address"
                error={nativeEmailError || ''}
                label="Email address"
                onBlur={(event) => {
                  setNativeEmailError(
                    event.currentTarget.value.length &&
                      !event.currentTarget.validity.valid
                      ? 'Invalid email address'
                      : null,
                  );
                }}
              />

              <FormFieldText
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                aria-label="Password"
                minLength={8}
                required
                error={nativePasswordError || ''}
                label="Password"
                onBlur={(event) => {
                  if (
                    event.currentTarget.validity.valid ||
                    !event.currentTarget.value.length
                  ) {
                    setNativePasswordError(null);
                  } else {
                    setNativePasswordError(
                      event.currentTarget.validity.valueMissing
                        ? 'Please enter a password'
                        : 'Passwords must be at least 8 characters',
                    );
                  }
                }}
              />
            </div>

            <div className="mt-4 space-y-4">
              <Button
                type="submit"
                disabled={
                  !!(
                    nativePasswordError ||
                    nativeEmailError ||
                    navigation.state !== 'idle'
                  )
                }
              >
                {navigation.state !== 'idle' ? 'Signing in...' : 'Sign In'}
              </Button>
              <div className="flex justify-between">
                <p className="text-sm">
                  New user?&nbsp;
                  <Link className="inline underline" to="/account/register">
                    Create an account
                  </Link>
                </p>

                <p className="text-sm">
                  <Link
                    className="text-primary/50 inline-block align-baseline text-sm"
                    to="/account/recover"
                  >
                    Forgot password?
                  </Link>
                </p>
              </div>
            </div>
          </Form>
        </FormCardWrapper>
      </div>
    </div>
  );
}

const LOGIN_MUTATION = `#graphql
  mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
    customerAccessTokenCreate(input: $input) {
      customerUserErrors {
        code
        field
        message
      }
      customerAccessToken {
        accessToken
        expiresAt
      }
    }
  }
`;

export async function doLogin(
  {storefront}: Route.ActionArgs['context'],
  {
    email,
    password,
  }: {
    email: string;
    password: string;
  },
) {
  const data = await storefront.mutate<{
    customerAccessTokenCreate: CustomerAccessTokenCreatePayload;
  }>(LOGIN_MUTATION, {
    variables: {
      input: {
        email,
        password,
      },
    },
  });

  if (data?.customerAccessTokenCreate?.customerAccessToken?.accessToken) {
    return data.customerAccessTokenCreate.customerAccessToken.accessToken;
  }

  throw new Error(
    data?.customerAccessTokenCreate?.customerUserErrors.join(', '),
  );
}
