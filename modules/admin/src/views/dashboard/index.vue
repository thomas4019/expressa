<template>
  <div class="dashboard-container">
    <div class="dashboard-text">Welcome: {{ email }}</div>
    <div class="dashboard-text">roles: <span v-for="role in roles" :key="role">{{ role }}</span></div>
    <div class="dashboard-text">listeners: <span v-for="handler in statusInfo.listeners" :key="handler">{{ handler }}</span>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import request from '@/utils/request'

export default {
  name: 'Dashboard',
  data: () => ({
    statusInfo: {}
  }),
  computed: {
    ...mapGetters([
      'email',
      'roles'
    ])
  },
  mounted() {
    this.update()
  },
  methods: {
    async update() {
      this.statusInfo = (await request({ url: `/status/` })).data
      console.log(this.statusInfo)
    }
  },
}
</script>

<style rel="stylesheet/scss" lang="scss" scoped>
.dashboard {
  &-container {
    margin: 30px;
  }
  &-text {
    font-size: 30px;
    line-height: 46px;
  }
}
</style>
