import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'

// ===== 接口类型定义 =====

export interface ChatResponse {
  success: boolean
  query: string
  response?: string
  recommendation?: string
  menu_ids?: string[]
}

export interface DeliveryResponse {
  success: boolean
  in_range: boolean
  distance: number
  formatted_address: string
  duration: number
  message: string
  travel_mode: string
  input_address: string
}

export interface MenuItem {
  id: number
  dish_name: string
  formatted_price: string
  description: string
  category: string
  spice_level: number
  spice_text: string
  is_vegetarian: boolean
}

export interface MenuListResponse {
  success: boolean
  menu_items: MenuItem[]
  count: number
  message: string
}

// ===== Axios 实例 =====

const api: AxiosInstance = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    console.log('API请求:', config.method?.toUpperCase(), config.url, config.data)
    return config
  },
  (error: unknown) => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  },
)

api.interceptors.response.use(
  (response) => {
    console.log('API响应:', response.status, response.data)
    return response.data
  },
  (error: unknown) => {
    const axiosError = error as { response?: { status?: number; data?: { detail?: string } } }
    console.error('响应错误:', axiosError.response?.status, axiosError.response?.data)
    if (axiosError.response?.status === 500) {
      throw new Error('处理中遇到问题，请稍后再试')
    } else if (axiosError.response?.status === 404) {
      throw new Error('请求的资源不存在')
    } else {
      throw new Error(axiosError.response?.data?.detail || '请求处理中，请稍候...')
    }
  },
)

// ===== API 模块 =====

export const chatAPI = {
  sendMessage: async (query: string): Promise<ChatResponse> => {
    return (await api.post('/chat', { query })) as unknown as ChatResponse
  },
}

export const deliveryAPI = {
  checkRange: async (
    address: string,
    travel_mode: string = '3',
  ): Promise<DeliveryResponse> => {
    return (await api.post('/delivery', { address, travel_mode })) as unknown as DeliveryResponse
  },
}

export const menuAPI = {
  getMenuList: async (): Promise<MenuListResponse> => {
    return (await api.get('/menu/list')) as unknown as MenuListResponse
  },
}

export const healthAPI = {
  checkHealth: async (): Promise<unknown> => {
    return await api.get('/health')
  },
}

export default api
