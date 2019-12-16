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
        this.schema.required = ['postgresql_uri', 'mongodb_uri']
        console.log(this.schema)
        this.ready = true
      },
      async install() {
        console.log(this.data);
        await request({ method: 'post', url: `/install`, data: {
          settings: this.data,
          modules: ['collections', 'core', 'logging', 'permissions'],
        }})

        await request({
          method: 'post',
          url: '/user/register',
          data: {
            email: 'a@example.com',
            roles: ['Admin'],
            password: '123'
          },
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
