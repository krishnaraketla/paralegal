import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - log all outgoing API calls
api.interceptors.request.use(
  (config) => {
    const timestamp = new Date().toISOString()
    console.log(
      `%c[API REQUEST] ${timestamp}`,
      'color: #2196F3; font-weight: bold;',
      {
        method: config.method?.toUpperCase(),
        url: `${config.baseURL}${config.url}`,
        params: config.params,
        data: config.data instanceof FormData ? '[FormData]' : config.data,
        headers: config.headers,
      }
    )
    return config
  },
  (error) => {
    console.error(
      '%c[API REQUEST ERROR]',
      'color: #f44336; font-weight: bold;',
      error
    )
    return Promise.reject(error)
  }
)

// Response interceptor - log all API responses
api.interceptors.response.use(
  (response) => {
    const timestamp = new Date().toISOString()
    console.log(
      `%c[API RESPONSE] ${timestamp}`,
      'color: #4CAF50; font-weight: bold;',
      {
        status: response.status,
        statusText: response.statusText,
        url: response.config.url,
        data: response.data,
        duration: response.headers['x-response-time'] || 'N/A',
      }
    )
    return response
  },
  (error) => {
    const timestamp = new Date().toISOString()
    console.error(
      `%c[API RESPONSE ERROR] ${timestamp}`,
      'color: #f44336; font-weight: bold;',
      {
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        message: error.message,
        data: error.response?.data,
      }
    )
    return Promise.reject(error)
  }
)

