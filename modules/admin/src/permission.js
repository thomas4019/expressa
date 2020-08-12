import router from './router'
import store from './store'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import { Message } from 'element-ui'
import { getToken } from '@/utils/auth'
import request from '@/utils/request'

const whiteList = ['/login', '/install']
router.beforeEach((to, from, next) => {
  NProgress.start()
  if (getToken()) {
    if (to.path === '/login') {
      next({ path: '/' })
      NProgress.done() // if current page is dashboard will not trigger	afterEach hook, so manually handle it
    } else {
      if (store.getters.roles.length === 0) {
        store.dispatch('GetInfo').then(res => {
          next()
        }).catch((err) => {
          store.dispatch('FedLogOut').then(() => {
            Message.error(err || 'Verification failed, please login again')
            next({ path: '/' })
          })
        })
      } else {
        next()
      }
    }
  } else {
    request({ url: `/status` }).then((res) => {
      if (!res.data.installed && to.path !== '/install') {
        next(`/install`)
        NProgress.done()
      } else {
        if (whiteList.indexOf(to.path) !== -1) {
          next()
        } else {
          next(`/login?redirect=${to.path}`)
          NProgress.done()
        }
      }
    })
  }
})

router.afterEach(() => {
  NProgress.done()
})
