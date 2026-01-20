import {Form, useActionData, redirect} from 'react-router';
import type {SeoHandleFunction} from '@shopify/hydrogen';
import type {CustomerActivatePayload} from '@shopify/hydrogen/storefront-api-types';
import clsx from 'clsx';
import {useRef, useState} from 'react';

import FormCardWrapper from '~/components/account/FormCardWrapper';
import FormFieldText from '~/components/account/FormFieldText';
import Button from '~/components/elements/Button';
import {badRequest} from '~/lib/utils';
import type {Route} from './+types/($lang).account.activate.$id.$activationToken';

type ActionData = {
  formError?: string;
};

const seo: SeoHandleFunction = () => ({
  title: 'Activate account',
});

export const handle = {
  seo,
  isPublic: true,
};

export async function action({request, context, params}: Route.ActionArgs) {
  const {lang, id, activationToken} = params;
  if (
    !id ||
    !activationToken ||
    typeof id !== 'string' ||
    typeof activationToken !== 'string'
  ) {
    return badRequest<ActionData>({
      formError: 'Wrong token. The link you followed might be wrong.',
    });
  }

  const formData = await request.formData();

  const password = formData.get('password');
  const passwordConfirm = formData.get('passwordConfirm');

  if (
    !password ||
    !passwordConfirm ||
    typeof password !== 'string' ||
    typeof passwordConfirm !== 'string' ||
    password !== passwordConfirm
  ) {
    return badRequest({
      formError: 'Please provide matching passwords',
    });
  }

  const {session, storefront} = context;

  try {
    const data = await storefront.mutate<{
      customerActivate: CustomerActivatePayload;
    }>(CUSTOMER_ACTIVATE_MUTATION, {
      variables: {
        id: `gid://shopify/Customer/${id}`,
        input: {
          password,
          activationToken,
        },
      },
    });

    const {accessToken} = data?.customerActivate?.customerAccessToken ?? {};

    if (!accessToken) {
      throw new Error(data?.customerActivate?.customerUserErrors.join(', '));
    }

    session.set('customerAccessToken', accessToken);

    return redirect(lang ? `/${lang}/account` : '/account', {
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
      formError: 'Sorry. We could not activate your account.',
    });
  }
}

export default function Activate() {
  const actionData = useActionData<ActionData>();
  const [nativePasswordError, setNativePasswordError] = useState<null | string>(
    null,
  );
  const [nativePasswordConfirmError, setNativePasswordConfirmError] = useState<
    null | string
  >(null);

  const passwordInput = useRef<HTMLInputElement>(null);
  const passwordConfirmInput = useRef<HTMLInputElement>(null);

  const validatePasswordConfirm = () => {
    if (!passwordConfirmInput.current) return;

    if (
      passwordConfirmInput.current.value.length &&
      passwordConfirmInput.current.value !== passwordInput.current?.value
    ) {
      setNativePasswordConfirmError('The two passwords entered did not match.');
    } else if (
      passwordConfirmInput.current.validity.valid ||
      !passwordConfirmInput.current.value.length
    ) {
      setNativePasswordConfirmError(null);
    } else {
      setNativePasswordConfirmError(
        passwordConfirmInput.current.validity.valueMissing
          ? 'Please re-enter the password'
          : 'Passwords must be at least 8 characters',
      );
    }
  };

  return (
    <div
      className={clsx(
        'my-32 px-4',
        'md:px-8',
      )}
    >
      <div className="flex justify-center">
        <FormCardWrapper title="Activate account">
          <p className="my-4 text-sm">
            Create your password to activate your account.
          </p>
          <Form method="post" noValidate>
            {actionData?.formError && (
              <div className="mb-6 flex items-center justify-center rounded-sm border border-red p-4 text-sm text-red">
                <p>{actionData.formError}</p>
              </div>
            )}

            <div className="space-y-4">
              <FormFieldText
                ref={passwordInput}
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
                    validatePasswordConfirm();
                  } else {
                    setNativePasswordError(
                      event.currentTarget.validity.valueMissing
                        ? 'Please enter a password'
                        : 'Passwords must be at least 8 characters',
                    );
                  }
                }}
              />

              <FormFieldText
                ref={passwordConfirmInput}
                error={nativePasswordConfirmError || ''}
                label="Repeat password"
                type="password"
                id="passwordConfirm"
                name="passwordConfirm"
                autoComplete="current-password"
                aria-label="Re-enter password"
                minLength={8}
                required
                onBlur={validatePasswordConfirm}
              />
            </div>

            <div className="mt-4 space-y-4">
              <Button type="submit">Save</Button>
            </div>
          </Form>
        </FormCardWrapper>
      </div>
    </div>
  );
}

const CUSTOMER_ACTIVATE_MUTATION = `#graphql
  mutation customerActivate($id: ID!, $input: CustomerActivateInput!) {
    customerActivate(id: $id, input: $input) {
      customerAccessToken {
        accessToken
        expiresAt
      }
      customerUserErrors {
        code
        field
        message
      }
    }
  }
`;
