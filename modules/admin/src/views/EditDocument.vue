<template>
  <div>
    <div class="container">
      <div class="error-message">
        {{ error }}
      </div>
      <template v-if="ready">
        <JSONEditor v-if="ready" v-model="data" :schema="schema" />
        <div>
          <button class="btn btn-primary" @click="save">
            Save
          </button>
          <button class="btn btn-danger" @click="del">
            Delete
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script>
import request from '@/utils/request'
import JSONEditor from '@/components/JSONEditor'
import store from '../store'

export default {
  name: 'CollectionTable',
  components: {
    JSONEditor
  },
  props: {
    collectionName: {
      type: String,
      default: ''
    },
    id: {
      type: String,
      default: ''
    }
  },
  data: () => ({
    data: {},
    collectionName: '',
    id: '',
    error: '',
    options: {
      mode: 'text'
    },
    schema: {},
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
      this.ready = false
      if (this.$route.params.collectionName) {
        this.collectionName = this.$route.params.collectionName
      }
      if (this.$route.params.id) {
        this.id = this.$route.params.id
      }
      try {
        if (this.id !== 'create') {
          this.data = (await request({ url: `/${this.collectionName}/${this.id}` })).data
        } else {
          this.data = {}
        }
        this.schema = (await request({ url: `/${this.collectionName}/schema` })).data
        this.ready = true
      } catch (e) {
        this.error = e.error || e
      }
    },
    async save() {
      if (this.id === 'create') {
        await request({ method: 'post', url: `/${this.collectionName}`, data: this.data })
      } else {
        await request({ method: 'put', url: `/${this.collectionName}/${this.id}`, data: this.data })
      }
      if (this.collectionName === 'collection') {
        this.statusInfo = (await request({ url: `/status/` })).data
        store.dispatch('StatusInfo', this.statusInfo)
      }
      if (this.collectionName === 'users') {
        this.$router.push(`/users/list`)
      } else if (this.collectionName === 'settings') {
        this.$router.push(`/home`)
      } else {
        this.$router.push(`/list/${this.collectionName}/`)
      }
      // this.$router.go(-1);
    },
    async del() {
      await request({ method: 'delete', url: `/${this.collectionName}/${this.id}` })
      this.$router.push(`/list/${this.collectionName}/`)
    }
  }
}
</script>

<style>
  .comment-link {
    margin-top: -15px;
  }
  .error-message {
    color: red;
  }
</style>
