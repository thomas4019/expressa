<template>
  <div>
    <div class="container">
      <div class="error-message">
        {{ error }}
      </div>
      <template v-if="ready">
        <JSONEditor v-if="ready" v-model="data" :schema="schema" />
        <div>
          <button class="btn btn-primary" @click="install">Install</button>
        </div>
      </template>
    </div>
  </div>
</template>

<script>
import request from '@/utils/request'
import JSONEditor from '@/components/JSONEditor'
import login from '@/api/login'

export default {
  name: 'Install',
  components: {
    JSONEditor
  },
  data: () => ({
    data: {},
    ready: false
  }),
  watch: {
    '$route.path': {
      handler: 'update'
    }
  },
  mounted: async function() {
    this.update()
  },
  methods: {
    async update() {
      this.schema = (await request({ url: `/install/settings/schema` })).data.schema
      console.log(this.schema)
      this.ready = true
    },
    async install() {
      console.log(this.data)
      await request({ method: 'post', url: `/install`, data: {
        settings: this.data,
        modules: ['collections', 'core', 'logging', 'permissions'],
      }})

      const email = 'a@example.com'
      const password = '123'

      await request({
        method: 'post',
        url: '/user/register',
        data: {
          email,
          roles: ['Admin'],
          password,
        },
      })

      this.$store.dispatch('Login', { username: email, password }).then(() => {
        this.loading = false
        this.$router.push({ path: this.redirect || '/' })
      }).catch(() => {
        this.loading = false
      })

      // login.login(email, password)
    },
  }
}
</script>

<style scoped>
  .error-message {
    color: red;
  }
</style>
