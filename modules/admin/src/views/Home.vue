<template>
  <div class="dashboard-container">
    <div class="dashboard-text">
      Welcome: {{ email }}
    </div>
    <div class="dashboard-text">
      roles: <span v-for="role in roles" :key="role">{{ role }}</span>
    </div>
    <div class="dashboard-text">
      listeners: {{ statusInfo.listeners.length }} active
    </div>
    <br>
    <div class="dashboard-text">
      uptime: {{ statusInfo.uptime }}
    </div>
    <div class="dashboard-text">
      Node.js version: {{ statusInfo.nodeVersion }}
    </div>
    <div class="dashboard-text">
      environment: {{ statusInfo.env }}
      <router-link id="settings-link" :to="'/edit/settings/' + statusInfo.env">
        (edit settings)
      </router-link>
    </div>
    <br>
    <br>
    <h3>Recent API Requests</h3>
    <ListDocuments2
      :show-paginate-on-bottom="false"
      :show-add-button="false"
      :filter="{ limit: 5, query: { method: { $ne: 'OPTIONS' } } }"
      :columns="['method', 'url', 'user', 'res.statusCode']"
      collection-name="requestlog"
    />
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import request from '@/utils/request'
import ListDocuments2 from './ListDocuments2'

export default {
  name: 'Dashboard',
  components: {
    ListDocuments2
  },
  data: () => ({
    statusInfo: {
      listeners: {}
    }
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
a#settings-link {
  color: #35A;
  padding-left: 25px;
}
</style>
