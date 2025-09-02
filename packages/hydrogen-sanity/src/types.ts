import type {WithCache} from '@shopify/hydrogen'

export type CacheActionFunctionParam = Parameters<Parameters<WithCache['run']>[1]>[0]

export type WaitUntil = (promise: Promise<unknown>) => void

export type Any = any
