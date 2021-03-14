<template>
  <div>
    <div class="container">
      <div class="error-message">
        {{ error }}
      </div>
      <template v-if="ready">
        <JSONEditor v-if="ready" v-model="data" :schema="schema" />
        <div>
          <button class="btn btn-primary" @click="install">
            Install
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script>
import request from '@/utils/request'
import JSONEditor from '@/components/JSONEditor'

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
      this.ready = true
    },
    async install() {
      await request({ method: 'post', url: `/install`, data: {
        settings: this.data,
        modules: ['collections', 'core', 'logging', 'permissions'],
      }})

      const email = this.data.email
      const password = this.data.password

      await request({
        method: 'post',
        url: '/users/register',
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
    },
  }
}
</script>

<style scoped>
  .error-message {
    color: red;
  }
</style>
