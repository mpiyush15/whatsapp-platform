/**
 * API error handler for frontend API calls
 * Detects 429 quota exceeded responses and provides appropriate UX
 */

export interface ApiErrorResponse {
  success: boolean
  error?: string
  message?: string
  code?: number
  limit?: number
  used?: number
  remaining?: number
}

export interface QuotaError {
  type: "quota"
  resourceType: "message" | "contact" | "phone"
  limit: number
  used: number
  message: string
}

/**
 * Makes an authenticated API request with error handling
 */
export async function apiFetch(
  url: string,
  options: RequestInit & { token?: string } = {}
) {
  const { token, ...fetchOptions } = options

  const headers = new Headers(fetchOptions.headers || {})

  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  } else if (typeof window !== "undefined") {
    const storedToken = localStorage.getItem("token")
    if (storedToken) {
      headers.set("Authorization", `Bearer ${storedToken}`)
    }
  }

  headers.set("Content-Type", "application/json")

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  })

  const data = (await response.json()) as ApiErrorResponse

  // Handle 429 Quota Exceeded
  if (response.status === 429) {
    const error: QuotaError = {
      type: "quota",
      resourceType: inferResourceType(url),
      limit: data.limit || 0,
      used: data.used || 0,
      message: data.error || data.message || "Quota exceeded",
    }
    throw error
  }

  // Handle other errors
  if (!response.ok) {
    throw new Error(data.message || data.error || `API error: ${response.status}`)
  }

  return data
}

/**
 * Infer resource type from request URL
 */
function inferResourceType(url: string): "message" | "contact" | "phone" {
  if (url.includes("/messages") || url.includes("/send")) {
    return "message"
  }
  if (url.includes("/contacts") || url.includes("/contact")) {
    return "contact"
  }
  if (url.includes("/phone")) {
    return "phone"
  }
  return "message"
}

/**
 * Check if error is a quota error
 */
export function isQuotaError(error: unknown): error is QuotaError {
  return (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    (error as any).type === "quota"
  )
}
