<template>
  <div>
    <el-pagination
      :page-size="pageSize"
      :total="count"
      :current-page.sync="page"
      layout="prev, pager, next"
      @current-change="update()"/>
    <el-table
      :data="data"
      element-loading-text="Loading"
      border
      fit
      highlight-current-row>
      <el-table-column v-for="(name, i) in listedProperties" :key="name" :label="name" align="center">
        <template slot-scope="scope">
          <router-link v-if="i === 0" :to="'/edit/'+collectionName+'/'+scope.row._id">{{ scope.row[name] }}</router-link>
          <span v-if="i !== 0">{{ scope.row[name] }}</span>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination
      :page-size="pageSize"
      :total="count"
      :current-page.sync="page"
      layout="prev, pager, next"
      @current-change="update()"/>
    <router-link :to="'/edit/' + collectionName + '/create'">
      <button class="btn btn-primary">Add</button>
    </router-link>
    <button class="btn btn-secondary download-button" @click="downloadCSV()">Download All</button>
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
    start: 0,
    page: 0,
    pageSize: 25,
    count: 0,
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
      console.log(this.page)
      const info = (await request({ url: `/${this.collectionName}/?page=${this.page}&limit=${this.pageSize}&orderby={"meta.created":-1}` })).data
      this.count = info.itemsTotal
      this.data = info.data
      this.collection = (await request({ url: `/collection/${this.collectionName}` })).data
      this.schema = this.collection.schema

      this.listedProperties = (this.collection.admin && this.collection.admin.columns) || Object.keys(this.schema.properties)
    }
  }
}
</script>

<style scoped>
</style>
