import request from '@/utils/request'

export function login(username, password) {
  return request({
    url: '/user/login',
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
    url: '/user/logout',
    method: 'post'
  }) */
}
