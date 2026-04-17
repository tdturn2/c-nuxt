export function normalizeApiError(error: any, fallback = 'Request failed.') {
  const data = error?.data ?? error?.response?._data ?? error?.response?.data
  const statusCode =
    error?.statusCode ??
    error?.response?.status ??
    error?.response?.statusCode ??
    error?.status ??
    500
  const message = data?.message ?? error?.statusMessage ?? error?.message ?? fallback
  return {
    statusCode,
    message,
    data,
  }
}
