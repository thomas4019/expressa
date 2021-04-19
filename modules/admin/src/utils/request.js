import axios from 'axios'
import { Message } from 'element-ui'
import store from '../store'
import { getToken } from '@/utils/auth'

const get = (o, p) =>
  p.reduce((xs, x) => (xs && xs[x]) ? xs[x] : null, o)

const service = axios.create({
  // eslint-disable-next-line
  baseURL: (typeof settings !== 'undefined' ? settings.apiurl : process.env.BASE_API),
  timeout: 5000 // 请求超时时间
})

// request拦截器
service.interceptors.request.use(
  config => {
    if (store.getters.token) {
      config.headers['x-access-token'] = getToken() // 让每个请求携带自定义token 请根据实际情况自行修改
    }
    return config
  },
  error => {
    // Do something with request error
    console.log(error) // for debug
    Promise.reject(error)
  }
)

// response 拦截器
service.interceptors.response.use(
  response => {
    return response
  },
  error => {
    console.log(error) // for debug
    const errorMessage = get(error, ['response', 'data', 'error']) || error.message
    Message({
      message: errorMessage,
      type: 'error',
      duration: 0,
      showClose: true,
    })
    return Promise.reject(error)
  }
)

export default service
