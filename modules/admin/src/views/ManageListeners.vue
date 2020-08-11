<template>
  <div class="app-container">
    <span>Filter by Collection</span>
    <select v-model="selectedCollection">
      <option value="">
        Any collection
      </option>
      <option v-for="c in collections" :key="c">
        {{ c }}
      </option>
    </select>
    <el-table
      :data="filterListeners(listeners)"
      element-loading-text="Loading"
      border
      fit
      highlight-current-row
    >
      <el-table-column align="left" label="Listener Name" width="250">
        <template slot-scope="scope">
          {{ scope.row.name }}
        </template>
      </el-table-column>
      <el-table-column align="left" label="Collections" width="150">
        <template slot-scope="scope">
          {{ scope.row.collections }}
        </template>
      </el-table-column>
      <el-table-column v-for="column in columns" :key="column" :label="column" align="center">
        <template slot-scope="scope">
          {{ scope.row[column] === true ? '✓' : scope.row[column] }}
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script>
import request from '@/utils/request'

export default {
  name: 'ManageListeners',
  data: () => ({
    listeners: [],
    columns: ['get', 'post', 'put', 'delete', 'changed', 'deleted', 'priority'],
    collections: [],
    selectedCollection: '',
  }),
  mounted() {
    this.update()
  },
  methods: {
    filterListeners(data) {
      const filtered = data.filter((l) => !this.selectedCollection || !l.collections || l.collections.includes(this.selectedCollection))
      return filtered
    },
    async update() {
      const statusInfo = (await request({ url: `/status` })).data
      this.listeners = statusInfo.listeners
      this.collections = statusInfo.collections
    },
  }
}
</script>

<style scoped>
</style>
