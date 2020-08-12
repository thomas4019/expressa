import { login, logout, getInfo } from '@/api/login'
import { getToken, setToken, removeToken } from '@/utils/auth'
import { Message } from 'element-ui'

const user = {
  state: {
    statusInfo: {
      collections: []
    },
    token: getToken(),
    name: '',
    email: '',
    avatar: '',
    roles: []
  },

  mutations: {
    SET_TOKEN: (state, token) => {
      state.token = token
    },
    SET_NAME: (state, name) => {
      state.name = name
    },
    SET_EMAIL: (state, email) => {
      state.email = email
    },
    SET_STATUS_INFO: (state, statusInfo) => {
      state.statusInfo = statusInfo
    },
    SET_AVATAR: (state, avatar) => {
      state.avatar = avatar
    },
    SET_ROLES: (state, roles) => {
      state.roles = roles
    }
  },

  actions: {
    Login({ commit }, userInfo) {
      const username = userInfo.username.trim()
      return new Promise((resolve, reject) => {
        login(username, userInfo.password).then(response => {
          const data = response.data
          if (!data.canUseAdmin) {
            Message.error('This user is not authorized to use this tool')
            resolve()
            return
          }
          setToken(data.token)
          commit('SET_TOKEN', data.token)
          resolve()
        }).catch(error => {
          reject(error)
        })
      })
    },

    StatusInfo({ commit, state }, statusInfo) {
      commit('SET_STATUS_INFO', statusInfo)
    },

    GetInfo({ commit, state }) {
      return new Promise((resolve, reject) => {
        getInfo(state.token).then(response => {
          const data = response.data
          if (data.roles) {
            commit('SET_ROLES', data.roles)
          } else {
            reject('getInfo: roles must be a non-null array !')
          }
          commit('SET_NAME', data.name)
          commit('SET_EMAIL', data.email)
          commit('SET_AVATAR', 'https://www.podplus.co.uk/wp-content/uploads/2018/09/person-icon.jpg')
          resolve(response)
        }).catch(error => {
          reject(error)
        })
      })
    },

    LogOut({ commit, state }) {
      return new Promise((resolve, reject) => {
        logout(state.token).then(() => {
          commit('SET_TOKEN', '')
          commit('SET_ROLES', [])
          removeToken()
          resolve()
        }).catch(error => {
          reject(error)
        })
      })
    },

    FedLogOut({ commit }) {
      return new Promise(resolve => {
        commit('SET_TOKEN', '')
        removeToken()
        resolve()
      })
    }
  }
}

export default user
