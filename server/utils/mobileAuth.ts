import { getHeader } from 'h3'
import { SignJWT, createRemoteJWKSet, jwtVerify } from 'jose'

type AzureIdentity = {
  subject: string
  email: string | null
  name: string | null
  groups: string[]
}

export type MobileAccessClaims = {
  sub: string
  email: string
  name: string | null
  groups: string[]
}

const MICROSOFT_ISSUER_ROOT = 'https://login.microsoftonline.com'
const MOBILE_ACCESS_AUDIENCE = 'connect-app-mobile'
const MOBILE_REFRESH_AUDIENCE = 'connect-app-mobile-refresh'
const MOBILE_ACCESS_ISSUER = 'connect-api'

function getAzureConfig() {
  const config = useRuntimeConfig()
  const tenantId = (config.azureAdTenantId || '').trim()
  const clientId = ((config as any).azureAdMobileClientId || config.azureAdClientId || '').trim()

  if (!tenantId || !clientId) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Azure AD mobile auth is not configured.',
    })
  }

  const v2Issuer = `${MICROSOFT_ISSUER_ROOT}/${tenantId}/v2.0`
  const allowedIssuers = [v2Issuer, `${v2Issuer}/`, `https://sts.windows.net/${tenantId}/`]
  const jwks = createRemoteJWKSet(new URL(`${MICROSOFT_ISSUER_ROOT}/${tenantId}/discovery/v2.0/keys`))

  return { allowedIssuers, clientId, jwks }
}

function getMobileJwtSecret() {
  const config = useRuntimeConfig()
  const secret = ((config as any).mobileAuthJwtSecret || '').trim()
  if (!secret || secret.length < 32) {
    throw createError({
      statusCode: 500,
      statusMessage: 'MOBILE_AUTH_JWT_SECRET must be set and at least 32 characters.',
    })
  }
  return new TextEncoder().encode(secret)
}

export async function verifyAzureIdToken(idToken: string): Promise<AzureIdentity> {
  const { allowedIssuers, clientId, jwks } = getAzureConfig()
  const { payload } = await jwtVerify(idToken, jwks, {
    issuer: allowedIssuers,
    audience: clientId,
  })

  const email =
    typeof payload.email === 'string'
      ? payload.email
      : typeof payload.preferred_username === 'string'
        ? payload.preferred_username
        : null

  const groups = Array.isArray(payload.groups)
    ? payload.groups.filter((g): g is string => typeof g === 'string')
    : []

  return {
    subject: typeof payload.oid === 'string' ? payload.oid : String(payload.sub || ''),
    email,
    name: typeof payload.name === 'string' ? payload.name : null,
    groups,
  }
}

export async function issueMobileAccessToken(claims: MobileAccessClaims) {
  const secret = getMobileJwtSecret()
  return new SignJWT({
    email: claims.email,
    name: claims.name,
    groups: claims.groups,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(claims.sub)
    .setAudience(MOBILE_ACCESS_AUDIENCE)
    .setIssuer(MOBILE_ACCESS_ISSUER)
    .setIssuedAt()
    .setExpirationTime('30m')
    .setJti(crypto.randomUUID())
    .sign(secret)
}

export async function issueMobileRefreshToken(claims: MobileAccessClaims) {
  const secret = getMobileJwtSecret()
  return new SignJWT({
    email: claims.email,
    name: claims.name,
    groups: claims.groups,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(claims.sub)
    .setAudience(MOBILE_REFRESH_AUDIENCE)
    .setIssuer(MOBILE_ACCESS_ISSUER)
    .setIssuedAt()
    .setExpirationTime('14d')
    .setJti(crypto.randomUUID())
    .sign(secret)
}

export async function verifyMobileAccessToken(token: string): Promise<MobileAccessClaims> {
  const secret = getMobileJwtSecret()
  const { payload } = await jwtVerify(token, secret, {
    audience: MOBILE_ACCESS_AUDIENCE,
    issuer: MOBILE_ACCESS_ISSUER,
  })

  const email = typeof payload.email === 'string' ? payload.email : null
  if (!email || typeof payload.sub !== 'string') {
    throw createError({ statusCode: 401, statusMessage: 'Invalid mobile token payload.' })
  }

  const groups = Array.isArray(payload.groups)
    ? payload.groups.filter((g): g is string => typeof g === 'string')
    : []

  return {
    sub: payload.sub,
    email,
    name: typeof payload.name === 'string' ? payload.name : null,
    groups,
  }
}

export async function verifyMobileRefreshToken(token: string): Promise<MobileAccessClaims> {
  const secret = getMobileJwtSecret()
  const { payload } = await jwtVerify(token, secret, {
    audience: MOBILE_REFRESH_AUDIENCE,
    issuer: MOBILE_ACCESS_ISSUER,
  })

  const email = typeof payload.email === 'string' ? payload.email : null
  if (!email || typeof payload.sub !== 'string') {
    throw createError({ statusCode: 401, statusMessage: 'Invalid mobile refresh token payload.' })
  }

  const groups = Array.isArray(payload.groups)
    ? payload.groups.filter((g): g is string => typeof g === 'string')
    : []

  return {
    sub: payload.sub,
    email,
    name: typeof payload.name === 'string' ? payload.name : null,
    groups,
  }
}

export function getBearerTokenFromEvent(event: any): string | null {
  const header = getHeader(event, 'authorization') || ''
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1] || null
}
