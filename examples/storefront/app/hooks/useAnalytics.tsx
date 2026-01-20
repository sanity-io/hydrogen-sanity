import {useLocation} from 'react-router';
import type {ShopifyPageViewPayload} from '@shopify/hydrogen';
import {
  AnalyticsEventName,
  getClientBrowserParameters,
  sendShopifyAnalytics,
  useShopifyCookies,
} from '@shopify/hydrogen';
import {useEffect, useRef} from 'react';

import {usePageAnalytics} from './usePageAnalytics';

export function useAnalytics(hasUserConsent: boolean) {
  useShopifyCookies({hasUserConsent});

  const location = useLocation();
  const lastLocationKey = useRef<string>('');
  const pageAnalytics = usePageAnalytics({hasUserConsent});

  useEffect(() => {
    if (lastLocationKey.current === location.key) return;

    lastLocationKey.current = location.key;

    const payload: ShopifyPageViewPayload = {
      ...getClientBrowserParameters(),
      ...pageAnalytics,
    };

    sendShopifyAnalytics({
      eventName: AnalyticsEventName.PAGE_VIEW,
      payload,
    });
  }, [location, pageAnalytics]);
}
