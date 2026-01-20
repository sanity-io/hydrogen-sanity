import {
  Form,
  useActionData,
  useNavigation,
  useOutletContext,
  redirect,
} from 'react-router';
import {type SeoHandleFunction} from '@shopify/hydrogen';
import type {
  Customer,
  CustomerUpdateInput,
  CustomerUpdatePayload,
} from '@shopify/hydrogen/storefront-api-types';
import invariant from 'tiny-invariant';

import FormFieldText from '~/components/account/FormFieldText';
import Button from '~/components/elements/Button';
import {assertApiErrors, badRequest} from '~/lib/utils';

import {getCustomer} from './($lang).account';
import type {Route} from './+types/($lang).account.edit';

export interface AccountOutletContext {
  customer: Customer;
}

export interface ActionData {
  success?: boolean;
  formError?: string;
  fieldErrors?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    currentPassword?: string;
    newPassword?: string;
    newPassword2?: string;
  };
}

const formDataHas = (formData: FormData, key: string) => {
  if (!formData.has(key)) return false;

  const value = formData.get(key);
  return typeof value === 'string' && value.length > 0;
};

const seo: SeoHandleFunction = () => ({
  title: 'Update profile',
});

export const handle = {
  renderInModal: true,
  seo,
};

export async function action({request, context, params}: Route.ActionArgs) {
  const formData = await request.formData();

  const customerAccessToken = await context.session.get('customerAccessToken');

  invariant(
    customerAccessToken,
    'You must be logged in to update your account details.',
  );

  await getCustomer(context, customerAccessToken);

  if (
    formDataHas(formData, 'newPassword') &&
    !formDataHas(formData, 'currentPassword')
  ) {
    return badRequest<ActionData>({
      fieldErrors: {
        currentPassword:
          'Please enter your current password before entering a new password.',
      },
    });
  }

  if (
    formData.has('newPassword') &&
    formData.get('newPassword') !== formData.get('newPassword2')
  ) {
    return badRequest<ActionData>({
      fieldErrors: {
        newPassword2: 'New passwords must match.',
      },
    });
  }

  try {
    const customer: CustomerUpdateInput = {};

    formDataHas(formData, 'firstName') &&
      (customer.firstName = formData.get('firstName') as string);
    formDataHas(formData, 'lastName') &&
      (customer.lastName = formData.get('lastName') as string);
    formDataHas(formData, 'email') &&
      (customer.email = formData.get('email') as string);
    formDataHas(formData, 'phone') &&
      (customer.phone = formData.get('phone') as string);
    formDataHas(formData, 'newPassword') &&
      (customer.password = formData.get('newPassword') as string);

    const data = await context.storefront.mutate<{
      customerUpdate: CustomerUpdatePayload;
    }>(CUSTOMER_UPDATE_MUTATION, {
      variables: {
        customerAccessToken,
        customer,
      },
    });

    assertApiErrors(data.customerUpdate);

    return redirect(params?.lang ? `/${params.lang}/account` : '/account');
  } catch (error: any) {
    return badRequest({formError: error.message});
  }
}

export default function AccountDetailsEdit() {
  const actionData = useActionData<ActionData>();
  const {customer} = useOutletContext<AccountOutletContext>();
  const navigation = useNavigation();

  return (
    <>
      <Form method="post">
        {actionData?.formError && (
          <div className="mb-6 flex items-center justify-center rounded-sm border border-red p-4 text-sm text-red">
            <p>{actionData?.formError}</p>
          </div>
        )}

        <div className="space-y-12">
          <div className="space-y-4">
            <div className="flex w-full gap-3">
              <FormFieldText
                id="firstName"
                name="firstName"
                type="text"
                autoComplete="given-name"
                aria-label="First name"
                defaultValue={customer.firstName ?? ''}
                error={actionData?.fieldErrors?.firstName || ''}
                label="First name"
              />

              <FormFieldText
                id="lastName"
                name="lastName"
                type="text"
                autoComplete="family-name"
                aria-label="Last name"
                defaultValue={customer.lastName ?? ''}
                error={actionData?.fieldErrors?.lastName || ''}
                label="Last name"
              />
            </div>

            <FormFieldText
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              aria-label="Mobile"
              defaultValue={customer.phone ?? ''}
              error={actionData?.fieldErrors?.phone}
              label="Phone"
            />

            <FormFieldText
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              aria-label="Email"
              required
              defaultValue={customer.email ?? ''}
              error={actionData?.fieldErrors?.email}
              label="Email"
            />
          </div>

          <div className="space-y-4">
            <FormFieldText
              autoComplete="current-password"
              error={actionData?.fieldErrors?.currentPassword}
              label="Current password"
              type="password"
              name="currentPassword"
            />

            <FormFieldText
              error={actionData?.fieldErrors?.newPassword}
              label="New password"
              type="password"
              name="newPassword"
            />

            <FormFieldText
              error={actionData?.fieldErrors?.newPassword2}
              label="Re-enter new password"
              type="password"
              name="newPassword2"
            />
          </div>
        </div>

        <div className="mt-10 flex justify-end">
          <div className="flex gap-2">
            <Button to=".." mode="outline" type="button" preventScrollReset>
              Cancel
            </Button>
            <Button type="submit" disabled={navigation.state !== 'idle'}>
              {navigation.state !== 'idle' ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </Form>
    </>
  );
}

const CUSTOMER_UPDATE_MUTATION = `#graphql
  mutation customerUpdate($customerAccessToken: String!, $customer: CustomerUpdateInput!) {
    customerUpdate(customerAccessToken: $customerAccessToken, customer: $customer) {
      customerUserErrors {
        code
        field
        message
      }
    }
  }
  `;
