import Vue from 'vue'

import 'normalize.css/normalize.css' // A modern alternative to CSS resets

import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'
import locale from 'element-ui/lib/locale/lang/en' // lang i18n

import '@/styles/index.scss' // global css

import App from './App'
import router from './router'
import store from './store'

import 'bootstrap'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/css/bootstrap-grid.min.css'
import 'vue-material-design-icons/styles.css'

import '@/icons' // icon
import '@/permission' // permission control

import { VuePlugin } from 'vuera'

import Unicon from 'vue-unicons/dist/vue-unicons-vue2.umd'
import { uniDatabase, uniHome, uniUsersAlt, uniShieldCheck, uniBookOpen, uniDiary, uniFlask, uniCog, uniPlus, uniLink } from 'vue-unicons/dist/icons'

Unicon.add([uniDatabase, uniHome, uniUsersAlt, uniShieldCheck, uniBookOpen, uniDiary, uniFlask, uniCog, uniPlus, uniLink])
Vue.use(Unicon)

Vue.use(ElementUI, { locale })
Vue.use(VuePlugin)

Vue.config.productionTip = false

new Vue({
  el: '#app',
  router,
  store,
  render: h => h(App)
})
