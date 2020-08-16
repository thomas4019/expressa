<template>
  <el-scrollbar wrap-class="scrollbar-wrapper">
    <el-menu
      :show-timeout="200"
      :default-active="$route.path"
      :collapse="isCollapse"
      :unique-opened="true"
      mode="vertical"
      background-color="#304156"
      text-color="#bfcbd9"
      active-text-color="#409EFF"
    >
      <sidebar-item v-for="route in routes" :key="route.path" :item="route" :base-path="route.path" />
    </el-menu>
  </el-scrollbar>
</template>

<script>
import { mapGetters } from 'vuex'
import SidebarItem from './SidebarItem'
const CORE_COLLECTIONS = ['users', 'requestlog', 'role']

const capitalize = (s) => {
  if (typeof s !== 'string') return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default {
  components: { SidebarItem },
  computed: {
    ...mapGetters([
      'sidebar',
      'statusInfo'
    ]),
    routes() {
      const routes = [...this.$router.options.routes]
      routes.push({
        name: 'Data',
        meta: { title: 'Schemas', icon: 'database' },
        path: '/edit/collection/',
        children: this.statusInfo.collections.map((coll) => ({
          meta: { title: capitalize(coll) },
          path: coll
        }))
      })
      routes.push({
        name: 'Data',
        meta: { title: 'Data', icon: 'database' },
        path: '/list',
        children: this.statusInfo.collections.filter((name) => !CORE_COLLECTIONS.includes(name)).map((coll) => ({
          meta: { title: capitalize(coll) },
          path: coll
        }))
      })
      return routes
    },
    isCollapse() {
      return !this.sidebar.opened
    }
  }
}
</script>
