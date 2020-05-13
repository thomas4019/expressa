import Vue from 'vue'
import Router from 'vue-router'

// in development-env not use lazy-loading, because lazy-loading too many pages will cause webpack hot update too slow. so only in production use lazy-loading;
// detail: https://panjiachen.github.io/vue-element-admin-site/#/lazy-loading

Vue.use(Router)

/* Layout */
import Layout from '../views/layout/Layout'
import request from '@/utils/request'
import { getToken } from '@/utils/auth'

const collections = localStorage.collections ? JSON.parse(localStorage.collections) : ['collection', 'role', 'users']
if (getToken() && !localStorage.collections) {
  request({ url: '/collection' }).then((res) => {
    const colls = res.data.map((coll) => coll._id)
    localStorage.collections = JSON.stringify(colls)
    window.location.reload()
  })
}

const capitalize = (s) => {
  if (typeof s !== 'string') return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
* hidden: true                   if `hidden:true` will not show in the sidebar(default is false)
* alwaysShow: true               if set true, will always show the root menu, whatever its child routes length
*                                if not set alwaysShow, only more than one route under the children
*                                it will becomes nested mode, otherwise not show the root menu
* redirect: noredirect           if `redirect:noredirect` will no redirect in the breadcrumb
* name:'router-name'             the name is used by <keep-alive> (must set!!!)
* meta : {
    title: 'title'               the name show in submenu and breadcrumb (recommend set)
    icon: 'svg-name'             the icon show in the sidebar,
  }
**/

const CORE_COLLECTIONS = ['users', 'log', 'role', 'settings']

export const constantRouterMap = [
  { path: '/login', component: () => import('@/views/login/index'), hidden: true },
  { path: '/install', component: () => import('@/views/Install'), hidden: true },
  { path: '/404', component: () => import('@/views/404'), hidden: true },

  {
    path: '/',
    component: Layout,
    redirect: '/home',
    name: 'Dashboard',
    meta: { title: 'Home', icon: 'home-alt' },
    children: [{
      path: 'home',
      meta: { title: 'Home', icon: 'home-alt' },
      component: () => import('@/views/home')
    }, {
      path: '/edit/:collectionName/:id',
      component: () => import('@/views/EditDocument'),
      hidden: true
    }]
  },

  {
    path: '/users',
    redirect: '/users',
    component: Layout,
    name: 'Users',
    meta: { title: 'People', icon: 'users-alt' },
    children: [{
      path: 'list',
      meta: { title: 'Users', icon: 'users-alt' },
      name: 'users2',
      component: () => import('@/views/ListDocuments2'),
      props: { collectionName: 'users' },
    }, {
      path: 'role',
      meta: { title: 'Roles', icon: 'shield-check' },
      name: 'role',
      component: () => import('@/views/ListDocuments2'),
      props: { collectionName: 'role' },
    }],
  },

  {
    path: '/list',
    component: Layout,
    name: 'Data',
    meta: { title: 'Data', icon: 'database' },
    children: collections.filter((name) => !CORE_COLLECTIONS.includes(name)).map((name) => ({
      path: name,
      name: name,
      component: () => import('@/views/ListDocuments2'),
      props: { collectionName: name },
      meta: { title: capitalize(name) }
    }))
  },

  {
    path: '/manage/permissions',
    component: Layout,
    name: 'permissions',
    meta: { title: 'Manage' },
    children: [
      {
        path: '',
        name: 'permissions',
        component: () => import('@/views/ManagePermissions'),
        meta: { title: 'Permissions' }
      }
    ]
  },

  {
    path: '/dev',
    component: Layout,
    meta: {title: 'Dev', icon: 'flask' },
    children: [
      {
        path: '/listeners',
        name: 'listeners',
        component: () => import('@/views/ManageListeners'),
        meta: {title: 'Listeners'}
      },
      {
        path: '/middleware',
        name: 'middleware',
        component: () => import('@/views/ManageMiddleware'),
        meta: {title: 'Middleware'}
      }, {
        path: 'requestlogs',
        meta: {title: 'Request Logs', icon: 'diary'},
        name: 'requestlogs',
        component: () => import('@/views/ListDocuments2'),
        props: {collectionName: 'log', columns: ['method', 'url', 'req.ip', 'user', 'res.statusCode', 'res.headers.content-length']},
      },
      {
        path: '/edit/collection',
        component: Layout,
        name: 'Schema',
        meta: { title: 'Schemas', icon: 'cog' },
        children: collections.map((name) => ({
          path: name,
          name: name,
          meta: { title: capitalize(name) }
        }))
      },
]
  },

  {
    path: 'external-link',
    component: Layout,
    children: [
      {
        path: 'https://github.com/thomas4019/expressa',
        meta: { title: 'Expressa Docs', icon: 'link' }
      }
    ]
  },

  { path: '*', redirect: '/404', hidden: true }
]

export default new Router({
  // mode: 'history',
  scrollBehavior: () => ({ y: 0 }),
  routes: constantRouterMap
})
