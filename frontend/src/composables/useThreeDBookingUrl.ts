export function getThreeDApiHost() {
  const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8082/api/v1'
  try {
    return new URL(base).host
  } catch {
    return 'localhost:8082'
  }
}

export function buildThreeDBookingUrl(options?: { venueId?: string | null }) {
  const threeDUrl = import.meta.env.VITE_THREE_D_URL ?? 'http://localhost:3000'
  const url = new URL(threeDUrl)
  url.searchParams.set('mode', 'book')
  url.searchParams.set('apiHost', getThreeDApiHost())

  const token = localStorage.getItem('spaceflow_token')
  if (token) url.searchParams.set('token', token)

  if (options?.venueId) {
    url.searchParams.set('venue_id', options.venueId)
  }

  return url.toString()
}

export function useThreeDBookingUrl() {
  return {
    buildThreeDBookingUrl,
    getThreeDApiHost,
  }
}
