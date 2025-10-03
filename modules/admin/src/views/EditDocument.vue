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
    activeCollectionName: '',
    activeId: '',
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
      // Determine active collection/id without mutating props
      if (this.$route.params.collectionName) {
        this.activeCollectionName = this.$route.params.collectionName
      } else {
        this.activeCollectionName = this.collectionName
      }
      if (this.$route.params.id) {
        this.activeId = this.$route.params.id
      } else {
        this.activeId = this.id
      }
      try {
        if (this.activeId !== 'create') {
          this.data = (await request({ url: `/${this.activeCollectionName}/${this.activeId}` })).data
        } else {
          this.data = {}
        }
        this.schema = (await request({ url: `/${this.activeCollectionName}/schema` })).data
        this.ready = true
      } catch (e) {
        this.error = e.error || e
      }
    },
    async save() {
      if (this.activeId === 'create') {
        await request({ method: 'post', url: `/${this.activeCollectionName}`, data: this.data })
      } else {
        await request({ method: 'put', url: `/${this.activeCollectionName}/${this.activeId}`, data: this.data })
      }
      if (this.activeCollectionName === 'collection') {
        this.statusInfo = (await request({ url: `/status/` })).data
        store.dispatch('StatusInfo', this.statusInfo)
      }
      if (this.activeCollectionName === 'users') {
        this.$router.push(`/users/list`)
      } else if (this.collectionName === 'settings') {
        this.$router.push(`/home`)
      } else {
        this.$router.push(`/list/${this.activeCollectionName}/`)
      }
      // this.$router.go(-1);
    },
    async del() {
      await request({ method: 'delete', url: `/${this.activeCollectionName}/${this.activeId}` })
      this.$router.push(`/list/${this.activeCollectionName}/`)
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
