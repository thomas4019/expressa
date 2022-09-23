<template>
  <div class="px-3">
    <div class="d-flex align-items-start py-2">
      <div>
        Endpoint

        <div class="d-flex align-items-center mb-2">
          <el-input v-model="apiBaseUrl" placeholder="key" />
          <el-input v-model="apiSuffix" placeholder="races" />
        </div>

        Params
        <div v-for="(parameter, index) in params" :key="index" class="d-flex align-items-center mb-1">
          <el-checkbox v-model="parameter.isEnabled" class="mr-2" />

          <el-input v-model="parameter.key" placeholder="key" @input="handleParamKeyChange(index)" />

          <el-input v-model="parameter.value" placeholder="value" class="ml-1" />

          <el-button
            v-if="params.length > 1"
            icon="el-icon-close"
            circle
            type="text"
            @click="removeParam(index)"
          />
        </div>
      </div>

      <span class="mx-auto" />

      <div class="d-flex align-items-center">
        <el-dropdown
          multiple
          class="mr-4"
          :hide-on-click="false"
        >
          <span class="el-dropdown-link">
            Select columns
            <i class="el-icon-arrow-down el-icon--right" />
          </span>

          <el-dropdown-menu slot="dropdown" style="max-height: 300px; overflow: auto">
            <el-checkbox-group v-model="selectedColumns" @input="update">
              <el-dropdown-item
                v-for="column in allPossibleColumns"
                :key="column"
                :label="column"
                :value="column"
              >
                <el-checkbox
                  class="mb-0 mr-4"
                  :label="column"
                  :disabled="selectedColumns.length === 1 && selectedColumns[0] === column"
                />
              </el-dropdown-item>
            </el-checkbox-group>
          </el-dropdown-menu>
        </el-dropdown>

        <el-checkbox
          v-model="isFiltersVisible"
          class="mb-0 mr-4"
        >
          Show Filters
        </el-checkbox>

        <el-pagination
          :page-size="pageSize"
          :total="count"
          :page-sizes="pageSizes"
          :current-page.sync="page"
          layout="sizes, prev, pager, next"
          @current-change="update()"
          @size-change="pageSize = $event, update()"
        />
      </div>
    </div>

    <el-button class="btn btn-primary mb-3" @click="update">
      Search
    </el-button>

    <el-table
      :data="tableRows"
      element-loading-text="Loading"
      border
      fit
      highlight-current-row
      @sort-change="handleSortChange"
    >
      <el-table-column
        v-for="(name, i) in selectedColumns"
        :key="name"
        :label="name"
        :prop="name"
        align="center"
        :sortable="true"
      >
        <template slot-scope="scope">
          <div class="text-left">
            <div v-if="scope.$index === 0 && isFiltersVisible">
              <el-input
                v-model="searchFilters[name]"
                :placeholder="`Search by ${name}`"
                :type="getFieldType(name) === 'number' ? 'number' : 'text'"
                @change="update()"
              />

              <el-checkbox
                v-model="exactSearches[name]"
                :disabled="getFieldType(name) === 'number'"
                class="mt-3"
                @change="update()"
              >
                Exact match
              </el-checkbox>
            </div>

            <router-link v-if="i === 0 && collectionName !== 'requestlog'" :to="'/edit/'+collectionName+'/'+scope.row._id">
              {{ getPath(scope.row, name) }}
            </router-link>
            <router-link v-if="i === 0 && collectionName === 'requestlog'" :to="'/dev/viewrequest/'+scope.row._id">
              {{ getPath(scope.row, name) }}
            </router-link>
            <span v-if="i !== 0">{{ getPath(scope.row, name) }}</span>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="data.length" class="d-flex align-items-center my-3">
      <button class="btn btn-secondary download-button mr-2" @click="downloadCSV()">
        Download
      </button>

      <button class="btn btn-secondary download-button" @click="downloadAllCSV()">
        Download All
      </button>

      <span class="mx-auto" />

      <el-pagination
        :page-size="pageSize"
        :total="count"
        :page-sizes="pageSizes"
        :current-page.sync="page"
        layout="sizes, prev, pager, next"
        @current-change="update()"
        @size-change="pageSize = $event, update()"
      />
    </div>
  </div>
</template>

<script>
import ListDocuments2 from '@/views/ListDocuments2.vue'
import request from '@/utils/request'
var dot = require('dot-object')
dot.keepArray = true

export default {
  name: 'Endpoints',
  mixins: [ListDocuments2],
  data() {
    return {
      apiBaseUrl: request.defaults.baseURL,
      apiSuffix: '',
    }
  },
  methods: {
    async update() {
      if (!this.apiSuffix) {
        return
      }

      // Fetch and Set table data
      const params = {
        page: this.page,
        limit: this.pageSize,
        ...this.allFilters,
        query: undefined
      }
      const info = (await request({ url: `/${this.apiSuffix}?${this.customParams}`, params })).data
      this.count = info.itemsTotal
      this.data = this.applyCustomColumnFilter(info.data)

      // Set columns data if not set.
      if (!this.selectedColumns.length) {
        const columns = Array.from(this.data.reduce((acc, row) => {
          const rowWithDottedKeys = dot.dot(row)

          return new Set([
            ...Object.keys(rowWithDottedKeys),
            ...acc
          ])
        }, []))

        this.selectedColumns = ['_id']
        this.allPossibleColumns = columns
      }
    },
    applyCustomColumnFilter(tableData) {
      const customColumnSearches = Object.keys(this.searchFilters)

      return tableData.filter((row) => {
        return customColumnSearches.every(fieldName => {
          const searchKeyword = this.searchFilters[fieldName]

          if (!searchKeyword) {
            return true
          }

          const rowWithDottedKeys = dot.dot(row)
          const stringified = rowWithDottedKeys[fieldName].toString()

          if (this.exactSearches[fieldName]) {
            return stringified.trim() === searchKeyword.trim()
          } else {
            return stringified.toLowerCase().includes(searchKeyword.toLowerCase())
          }
        })
      })
    },
    async downloadAllCSV() {
      let rows = []
      let page = 1

      while (this.count > rows.length) {
        const params = {
          ...this.allFilters,
          page: page,
          limit: 500,
          query: undefined
        }

        const url = `/${this.apiSuffix}?${this.customParams}`
        const response = (await request({ url, params })).data
        rows = [...response.data, ...rows]
        page += 1
      }

      this.downloadCSV(this.applyCustomColumnFilter(rows))
    },
  }
}
</script>

