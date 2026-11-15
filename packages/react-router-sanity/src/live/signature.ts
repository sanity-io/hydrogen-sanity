/** The request header that carries the invalidation signature. */
export const SIGNATURE_HEADER = 'X-Sanity-Invalidate-Signature'

/** Rejects signatures older or newer than 5 minutes. */
export const SIGNATURE_TOLERANCE_SECONDS = 300

const encoder = new TextEncoder()

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', encoder.encode(secret), {name: 'HMAC', hash: 'SHA-256'}, false, [
    'sign',
    'verify',
  ])
}

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> | undefined {
  if (!/^(?:[0-9a-f]{2})+$/i.test(hex)) return undefined
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return bytes
}

/**
 * Returns the signature header value for an invalidation body.
 *
 * The value is `t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<body>">`.
 *
 * @param secret - The shared secret.
 * @param body - The exact request body.
 * @param timestamp - The time in Unix seconds.
 * @returns The header value.
 * @public
 */
export async function signInvalidation(
  secret: string,
  body: string,
  timestamp = Math.floor(Date.now() / 1000),
): Promise<string> {
  const signature = await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(`${timestamp}.${body}`))
  return `t=${timestamp},v1=${toHex(signature)}`
}

/**
 * Verifies an invalidation signature in constant time.
 *
 * @param secret - The shared secret.
 * @param body - The exact request body.
 * @param header - The signature header value.
 * @param now - The current time in Unix seconds.
 * @returns `true` when the signature is valid and inside the time tolerance.
 * @internal
 */
export async function verifyInvalidation(
  secret: string,
  body: string,
  header: string | null,
  now = Math.floor(Date.now() / 1000),
): Promise<boolean> {
  if (!header) return false
  const parts = new Map(
    header.split(',').map((part): [string, string] => {
      const index = part.indexOf('=')
      return [part.slice(0, index).trim(), part.slice(index + 1).trim()]
    }),
  )
  const timestamp = Number(parts.get('t'))
  const signature = fromHex(parts.get('v1') ?? '')
  if (!Number.isInteger(timestamp) || !signature) return false
  if (Math.abs(now - timestamp) > SIGNATURE_TOLERANCE_SECONDS) return false
  return crypto.subtle.verify('HMAC', await hmacKey(secret), signature, encoder.encode(`${timestamp}.${body}`))
}
