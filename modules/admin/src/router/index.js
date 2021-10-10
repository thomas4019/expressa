import Vue from 'vue'
import Router from 'vue-router'

// in development-env not use lazy-loading, because lazy-loading too many pages will cause webpack hot update too slow. so only in production use lazy-loading;
// detail: https://panjiachen.github.io/vue-element-admin-site/#/lazy-loading

Vue.use(Router)

/* Layout */
import Layout from '../views/layout/Layout'

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
    redirect: '/home',
    name: 'Home',
    meta: { title: 'Home', icon: 'home' },
    children: [{
      path: 'home',
      meta: { title: 'Home', icon: 'home' },
      component: () => import('@/views/Home')
    }, {
      path: '/edit/:collectionName/:id',
      component: () => import('@/views/EditDocument'),
      hidden: true
    }]
  },

  {
    path: '/users',
    redirect: '/users/list',
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
      path: 'add',
      meta: { title: 'Add User', icon: 'plus' },
      name: 'newuser',
      component: () => import('@/views/EditDocument'),
      props: { collectionName: 'users', id: 'create' },
    }, {
      path: 'role',
      meta: { title: 'Roles', icon: 'shield-check' },
      name: 'role',
      component: () => import('@/views/ListDocuments2'),
      props: { collectionName: 'role' },
    }, {
      path: 'addrole',
      meta: { title: 'Add Role', icon: 'plus' },
      name: 'newrole',
      component: () => import('@/views/EditDocument'),
      props: { collectionName: 'role', id: 'create' },
    }],
  },

  {
    path: '/list/:collectionName',
    component: Layout,
    hidden: true,
    name: 'Data',
    meta: { title: 'Data', icon: 'database' },
    children: [{
      path: '',
      name: ':collectionName',
      component: () => import('@/views/ListDocuments2'),
      props: route => ({ collectionName: route.params.collectionName }),
      meta: { title: capitalize(name) }
    }]
  },

  {
    path: '/manage/permissions',
    component: Layout,
    name: 'permissions',
    meta: { title: 'Manage', icon: 'shield-check' },
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
    meta: { title: 'Dev', icon: 'flask' },
    name: 'Dev',
    children: [
      {
        path: '',
        name: '',
        component: () => import('@/views/Dev'),
        meta: { title: '' },
        hidden: true,
      },
      {
        path: 'listeners',
        name: 'listeners',
        component: () => import('@/views/ManageListeners'),
        meta: { title: 'Listeners' }
      },
      {
        path: 'middleware',
        name: 'middleware',
        component: () => import('@/views/ManageMiddleware'),
        meta: { title: 'Middleware' }
      }, {
        path: 'requestlogs',
        meta: { title: 'Request Logs', icon: 'diary' },
        name: 'requestlogs',
        component: () => import('@/views/ListDocuments2'),
        props: { collectionName: 'requestlog', columns: ['method', 'url', 'req.ip', 'user', 'res.message', 'res.statusCode', 'res.headers.content-length'] },
      }, {
        path: 'viewrequest/:requestId',
        hidden: true,
        meta: { title: 'View Request', icon: 'diary' },
        name: 'viewrequest',
        component: () => import('@/views/ViewRequest'),
      }, {
        path: '/edit/collection',
        component: Layout,
        name: 'Schema',
        hidden: true,
        meta: { title: 'Schemas', icon: 'cog' },
        children: [{
          hidden: true,
          path: '/:collectionName',
          name: name,
          meta: { title: capitalize(name) }
        }]
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
