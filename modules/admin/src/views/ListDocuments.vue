<template>
  <div>
    <table class="table">
      <thead class="thead-dark">
        <tr>
          <th v-for="name in listedProperties" :key="name">
            {{ name }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="record in data" :key="record._id">
          <td v-for="(name, i) in listedProperties" :key="name">
            <router-link v-if="i === 0" :to="'/edit/'+collectionName+'/'+record._id">
              {{ record[name] }}
            </router-link>
            <span v-if="i !== 0">{{ record[name] }}</span>
          </td>
        </tr>
      </tbody>
    </table>
    <router-link :to="'/edit/' + collectionName + '/create'">
      <button class="btn btn-primary">
        Add
      </button>
    </router-link>
    <button class="btn btn-secondary download-button" @click="downloadCSV()">
      Download All
    </button>
  </div>
</template>

<script>
import request from '@/utils/request'

export default {
  name: 'ListDocuments',
  props: {
    collectionName: {
      type: String,
      default: 'collection'
    }
  },
  data: () => ({
    data: [],
    schema: {},
    listedProperties: []
  }),
  watch: {
    collectionName: {
      handler: 'update'
    }
  },
  mounted() {
    this.update()
  },
  methods: {
    async update() {
      if (this.$route.params.collectionName) {
        this.collectionName = this.$route.params.collectionName
      }
      this.data = (await request({ url: `/${this.collectionName}/?orderby={"meta.created":-1}` })).data
      this.schema = (await request({ url: `/${this.collectionName}/schema` })).data

      this.listedProperties = (this.schema.listing && this.schema.listing.columns) || Object.keys(this.schema.properties)
    }
  }
}
</script>

<style scoped>
</style>
