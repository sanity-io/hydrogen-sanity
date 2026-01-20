import {Form, useActionData, redirect} from 'react-router';
import type {SeoHandleFunction} from '@shopify/hydrogen';
import type {CustomerCreatePayload} from '@shopify/hydrogen/storefront-api-types';
import clsx from 'clsx';
import {useState} from 'react';

import FormCardWrapper from '~/components/account/FormCardWrapper';
import FormFieldText from '~/components/account/FormFieldText';
import Button from '~/components/elements/Button';
import {Link} from '~/components/Link';
import {badRequest} from '~/lib/utils';
import {doLogin} from './($lang).account.login';
import type {Route} from './+types/($lang).account.register';

const seo: SeoHandleFunction<typeof loader> = () => ({
  title: 'Register',
});

export const handle = {
  seo,
};

export async function loader({context, params}: Route.LoaderArgs) {
  const customerAccessToken = await context.session.get('customerAccessToken');

  if (customerAccessToken) {
    return redirect(params.lang ? `/${params.lang}/account` : '/account');
  }

  return new Response(null);
}

type ActionData = {
  formError?: string;
};

export async function action({request, context, params}: Route.ActionArgs) {
  const {session, storefront} = context;
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

  try {
    const data = await storefront.mutate<{
      customerCreate: CustomerCreatePayload;
    }>(CUSTOMER_CREATE_MUTATION, {
      variables: {
        input: {email, password},
      },
    });

    if (!data?.customerCreate?.customer?.id) {
      throw new Error(data?.customerCreate?.customerUserErrors.join(', '));
    }

    const customerAccessToken = await doLogin(context, {email, password});
    session.set('customerAccessToken', customerAccessToken);

    return redirect(params.lang ? `/${params.lang}/account` : '/account', {
      headers: {
        'Set-Cookie': await session.commit(),
      },
    });
  } catch (error: any) {
    if (storefront.isApiError(error)) {
      return badRequest({
        formError: 'Something went wrong. Please try again later.',
      });
    }

    return badRequest({
      formError:
        'Sorry. We could not create an account with this email. User might already exist, try to login instead.',
    });
  }
}

export default function Register() {
  const actionData = useActionData<ActionData>();
  const [nativeEmailError, setNativeEmailError] = useState<null | string>(null);
  const [nativePasswordError, setNativePasswordError] = useState<null | string>(
    null,
  );

  return (
    <div
      className={clsx(
        'my-32 px-4',
        'md:px-8',
      )}
    >
      <div className="flex justify-center">
        <FormCardWrapper title="Create an account">
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
                label="Email address"
                error={nativeEmailError || ''}
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
                disabled={!!(nativePasswordError || nativeEmailError)}
              >
                Create account
              </Button>
              <div className="flex justify-between">
                <p className="text-sm">
                  Already have an account? &nbsp;
                  <Link className="inline underline" to="/account/login">
                    Sign in
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

const CUSTOMER_CREATE_MUTATION = `#graphql
  mutation customerCreate($input: CustomerCreateInput!) {
    customerCreate(input: $input) {
      customer {
        id
      }
      customerUserErrors {
        code
        field
        message
      }
    }
  }
`;
