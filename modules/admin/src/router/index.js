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
export const constantRouterMap = [
  { path: '/login', component: () => import('@/views/login/index'), hidden: true },
  { path: '/install', component: () => import('@/views/Install'), hidden: true },
  { path: '/404', component: () => import('@/views/404'), hidden: true },

  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    name: 'Dashboard',
    hidden: true,
    children: [{
      path: 'dashboard',
      component: () => import('@/views/dashboard/index')
    }, {
      path: '/edit/:collectionName/:id',
      component: () => import('@/views/EditDocument'),
      hidden: true
    }]
  },

  {
    path: '/list',
    component: Layout,
    name: 'Data',
    meta: { title: 'Data', icon: 'table' },
    children: collections.map((name) => ({
      path: name,
      name: name,
      component: () => import('@/views/ListDocuments2'),
      props: { collectionName: name },
      meta: { title: capitalize(name) }
      /* children: [{
        path: 'amNia6HA',
        component: () => import('@/views/EditDocument'),
        hidden: true
      }] */
    }))
  },

  {
    path: '/edit',
    component: Layout,
    name: 'Insert',
    meta: { title: 'Insert', icon: 'table' },
    children: collections.map((name) => ({
      path: name + '/create',
      name: name,
      component: () => import('@/views/ListDocuments'),
      props: { collectionName: name },
      meta: { title: capitalize(name) }
      /* children: [{
        path: 'amNia6HA',
        component: () => import('@/views/EditDocument'),
        hidden: true
      }] */
    }))
  },

  {
    path: '/edit/collection',
    component: Layout,
    name: 'Schema',
    meta: { title: 'Schemas', icon: 'nested' },
    children: collections.map((name) => ({
      path: name,
      name: name,
      meta: { title: capitalize(name) }
    }))
  },

  /* {
    path: '/edit/collection/create',
    component: Layout,
    name: 'createcollection',
    meta: { title: 'Create Collection' },
    children: [
      {
        path: '',
        name: 'permissions',
        component: () => import('@/views/ManagePermissions'),
        meta: { title: 'Create Collection' }
      }
    ]
  }, */

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
