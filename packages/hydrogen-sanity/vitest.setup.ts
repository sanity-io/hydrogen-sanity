import {webcrypto} from 'node:crypto'

// eslint-disable-next-line no-undef
Object.defineProperty(globalThis, 'crypto', {
  value: webcrypto,
})
