<template>
  <div class="app-container">
    <el-table
      :data="listeners"
      element-loading-text="Loading"
      border
      fit
      highlight-current-row>
      <el-table-column align="left" label="Listener Name" width="250">
        <template slot-scope="scope">
          {{ scope.row.name }}
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
  name: 'ManagePermissions',
  data: () => ({
    listeners: [],
    columns: ['collections', 'get', 'post', 'put', 'delete', 'changed', 'deleted', 'priority'],
  }),
  mounted() {
    this.update()
  },
  methods: {
    async update() {
      const statusInfo = (await request({ url: `/status` })).data
      this.listeners = statusInfo.listeners;
      console.log(this.listeners)
    },
  }
}
</script>

<style scoped>
</style>
