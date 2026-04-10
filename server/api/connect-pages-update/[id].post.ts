import { defineEventHandler } from 'h3'
import { handleConnectPagesPayloadUpdate } from '../../utils/connectPagesPayloadUpdate'

/** Dashboard → Payload `POST /api/connect-pages/update/:id` (session email in body). */
export default defineEventHandler((event) => handleConnectPagesPayloadUpdate(event))
