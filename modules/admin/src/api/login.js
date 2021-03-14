import request from '@/utils/request'

export function login(username, password) {
  return request({
    url: '/users/login',
    method: 'post',
    data: {
      email: username,
      password
    }
  })
}

export function getInfo(token) {
  return request({
    url: '/users/me',
    method: 'get'
  })
}

export async function logout() {
  /* return request({
    url: '/users/logout',
    method: 'post'
  }) */
}
