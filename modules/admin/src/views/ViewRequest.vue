<template>
  <div class="app-container" style="display: flex; width: 100%;">
    <div class="side-panel">
      <h2>Request</h2>
      <p>
        {{ log.method }} {{ log.url }}
      </p>
      <dl>
        <dt>Request Time</dt>
        <dd>{{ log.meta.created }}</dd>
        <dt>IP</dt>
        <dd>{{ req.ip }}</dd>
        <dt>Access token</dt>
        <dd>{{ req.headers.x-access-token }}</dd>
        <dt>User-Agent</dt>
        <dd>{{ req.headers.user-agent }}</dd>
        <dt>Referrer</dt>
        <dd>{{ req.headers.referer }}</dd>
        <dt>Origin</dt>
        <dd>{{ req.headers.origin }}</dd>
      </dl>
    </div>

    <div class="side-panel">
      <h2>Response</h2>
      <dl>
        <dt>ID</dt>
        <dd>{{ res.requestId }}</dd>
        <dt>Response Time</dt>
        <dd>{{ log.meta.created }}</dd>
        <dt>Status Code</dt>
        <dd>{{ res.statusCode }}</dd>
        <dt>Content-Length</dt>
        <dd>{{ res.headers['content-length'] }} bytes</dd>
      </dl>
    </div>
  </div>
</template>

<script>
import request from '@/utils/request'

export default {
  name: 'ViewRequest',
  data: () => ({
    log: {},
    req: {},
    res: {},
  }),
  mounted() {
    this.update()
  },
  methods: {
    async update() {
      const id = this.$route.params.requestId
      console.log('id')
      console.log(id)
      const log = (await request({ url: `/requestlog/${id}` })).data
      this.log = log
      this.req = log.req
      this.res = log.res
    },
  }
}
</script>

<style scoped>
  .side-panel {
    flex-grow: 1;
  }
</style>
