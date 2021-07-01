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
      :data="tableRows"
      element-loading-text="Loading"
      border
      fit
      highlight-current-row
    >
      <el-table-column v-for="(name, i) in listedProperties" :key="name" :label="name" align="center">
        <template slot-scope="scope">
          <div v-if="scope.$index === 0" class="text-left">
            <el-input
              v-model="searchFilters[name]"
              :placeholder="`Search by ${name}`"
              @change="update()"
            />

            <el-checkbox v-model="exactSearches[name]" class="mt-3" @change="update()">
              Exact match
            </el-checkbox>
          </div>

          <template v-else>
            <router-link v-if="i === 0 && collectionName !== 'requestlog'" :to="'/edit/'+collectionName+'/'+scope.row._id">
              {{ getPath(scope.row, name) }}
            </router-link>
            <router-link v-if="i === 0 && collectionName === 'requestlog'" :to="'/dev/viewrequest/'+scope.row._id">
              {{ getPath(scope.row, name) }}
            </router-link>
            <span v-if="i !== 0">{{ getPath(scope.row, name) }}</span>
          </template>
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
    exactSearches: {},
    searchFilters: {},
    listedProperties: [],
  }),
  computed: {
    tableRows() {
      return [
        // INFO: This empty row is used to display the search filters.
        {},
        ...this.data
      ]
    },
    appliedSearchFilters() {
      return Object.keys(this.searchFilters).reduce((filter, fieldName) => {
        const searchKeyword = this.searchFilters[fieldName]

        if (!searchKeyword) {
          return filter
        }

        const regexQuery = { '$regex': searchKeyword, '$options': 'i' }

        return {
          ...filter,
          [fieldName]: this.exactSearches[fieldName] ? searchKeyword : regexQuery
        }
      }, {})
    }
  },
  watch: {
    collectionName: {
      handler: 'update'
    },
    '$route.params.collectionName': {
      handler: 'resetFilters'
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
      // Avoid refetching schema info if name hasn't changed
      if (!this.collection || this.collection._id !== this.collectionName) {
        this.collection = (await request({ url: `/collection/${this.collectionName}` })).data
        this.schema = this.collection.schema
      }
      const params = {
        page: this.page,
        limit: this.pageSize,
        orderby: '{"meta.created":-1}',
        ...this.filter,
        query: { ...this.appliedSearchFilters }
      }
      const columns = this.columns || (this.collection.admin && this.collection.admin.columns)
      if (columns) {
        params.fields = columns.reduce((map, field) => {
          map[field] = 1
          return map
        }, {})
      }
      const info = (await request({ url: `/${this.collectionName}/`, params })).data
      this.count = info.itemsTotal
      this.data = info.data
      this.listedProperties = columns || Object.keys(this.schema.properties)
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
    resetFilters() {
      this.exactSearches = {}
      this.searchFilters = {}
    }
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
