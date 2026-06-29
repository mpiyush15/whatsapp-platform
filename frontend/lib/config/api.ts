// API Configuration
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api'
export const SOCKET_URL = API_URL.replace('/api', '')

export default {
  API_URL,
  SOCKET_URL,
}
