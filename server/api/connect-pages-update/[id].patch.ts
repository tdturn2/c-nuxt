import { defineEventHandler } from 'h3'
import { handleConnectPagesPayloadUpdate } from '../../utils/connectPagesPayloadUpdate'

/** Same as POST; lets the dashboard keep using PATCH without a second code path. */
export default defineEventHandler((event) => handleConnectPagesPayloadUpdate(event))
