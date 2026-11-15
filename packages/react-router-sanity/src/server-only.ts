/**
 * The `browser` condition of every server-only entry resolves to this module. The import fails at
 * build time or at first evaluation, so a server token can never reach a browser bundle.
 */
import {SanityRouterError} from './errors'

throw new SanityRouterError('RRS001')
