<template>
  <div>
    <el-pagination
      v-if="count > pageSize"
      :page-size="pageSize"
      :total="count"
      :current-page.sync="page"
      layout="prev, pager, next"
      @current-change="update()"
    />
    <el-table
      :data="data"
      element-loading-text="Loading"
      border
      fit
      highlight-current-row
    >
      <el-table-column v-for="(name, i) in listedProperties" :key="name" :label="name" align="center">
        <template slot-scope="scope">
          <router-link v-if="i === 0 && collectionName !== 'requestlog'" :to="'/edit/'+collectionName+'/'+scope.row._id">
            {{ getPath(scope.row, name) }}
          </router-link>
          <router-link v-if="i === 0 && collectionName === 'requestlog'" :to="'/dev/viewrequest/'+scope.row._id">
            {{ getPath(scope.row, name) }}
          </router-link>
          <span v-if="i !== 0">{{ getPath(scope.row, name) }}</span>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination
      v-if="count > pageSize && showPaginateOnBottom"
      :page-size="pageSize"
      :total="count"
      :current-page.sync="page"
      layout="prev, pager, next"
      @current-change="update()"
    />
    <router-link v-if="showAddButton" :to="'/edit/' + collectionName + '/create'">
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
import saveAs from 'file-saver'
import objectPath from 'object-path'

export default {
  name: 'ListDocuments',
  props: {
    collectionName: {
      type: String,
      default: 'collection'
    },
    filter: {
      type: Object,
      default: () => {}
    },
    columns: {
      type: Array,
      default: () => undefined
    },
    showAddButton: {
      type: Boolean,
      default: true
    },
    showPaginateOnBottom: {
      type: Boolean,
      default: true
    },
  },
  data: () => ({
    start: 0,
    page: 1,
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
    getPath(obj, path, defaultValue) {
      const result = String.prototype.split.call(path, /[,[\].]+?/)
        .filter(Boolean)
        .reduce((res, key) => (res !== null && res !== undefined) ? res[key] : res, obj)
      return (result === undefined || result === obj) ? defaultValue : result
    },
    async update() {
      if (this.$route.params.collectionName) {
        this.collectionName = this.$route.params.collectionName
      }
      const params = {
        page: this.page,
        limit: this.pageSize,
        orderby: '{"meta.created":-1}',
        ...this.filter,
      }
      const info = (await request({ url: `/${this.collectionName}/`, params })).data
      this.count = info.itemsTotal
      this.data = info.data
      if (!this.collection || this.collection._id !== this.collectionName) {
        this.collection = (await request({ url: `/collection/${this.collectionName}` })).data
        this.schema = this.collection.schema
      }
      this.listedProperties = this.columns || (this.collection.admin && this.collection.admin.columns) || Object.keys(this.schema.properties)
    },
    downloadCSV() {
      const collection = this.collectionName
      let text = this.listedProperties.map((name) => '"' + name + '"').join(',') + '\n'
      if (this.data) {
        text += this.data.map((row) =>
          this.listedProperties.map((key) => '"' + String(objectPath.get(row, key) || '').replace(/"/g, '""') + '"')
        ).join('\n')
        console.log(text)
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
        saveAs(blob, collection + '.csv')
      }
    },
  }
}
</script>

<style scoped>
.el-table >>> th {
 background-color: #343a40 !important;
 border-color: #454d55;
 color: #fff;
}
</style>
