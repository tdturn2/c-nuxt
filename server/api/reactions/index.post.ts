import { defineEventHandler, readBody, createError } from 'h3'
import { authenticateWithPayloadCMS, getPayloadProxyHeaders } from '../../utils/payloadAuth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const payloadBaseUrl = config.public.payloadBaseUrl || 'http://localhost:3002'
  const payloadApiUrl = `${payloadBaseUrl}/api/connect-post-reactions/react`
  
  try {
    const body = await readBody(event) as { post: number; user?: number; reactionType: string }
    
    // Authenticate with PayloadCMS using SSO email
    const auth = await authenticateWithPayloadCMS(event)
    const { token, email } = auth
    
    if (!email) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - must be signed in to react'
      })
    }
    
    // Use /react endpoint format: { postId, reactionType, email }
    // PayloadCMS will authenticate using email for SSO users
    const reactBody: any = {
      postId: body.post,
      reactionType: body.reactionType
    }
    
    // Include email for email-based authentication if no token
    if (!token && email) {
      reactBody.email = email
    }
    
    const headers = getPayloadProxyHeaders(event, auth)
    
    const response = await $fetch(payloadApiUrl, {
      method: 'POST',
      headers,
      body: reactBody
    })
    
    return response
  } catch (error: any) {
    console.error('PayloadCMS API Error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to create reaction in PayloadCMS',
      data: error.data
    })
  }
})
