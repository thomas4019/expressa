<template>
  <div class="app-container">
    <el-table
      :data="data"
      element-loading-text="Loading"
      border
      fit
      highlight-current-row
    >
      <el-table-column align="left" label="Permission Name" width="250">
        <template slot-scope="scope">
          {{ scope.row.name }}
        </template>
      </el-table-column>
      <el-table-column v-for="role in roles" :key="role._id" :label="role._id" align="center">
        <template slot-scope="scope">
          <input v-model="scope.row[role._id]" :name="scope.row.role" :disabled="role._id=='Admin'" type="checkbox" @change="save">
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
    roles: [],
    data: []
  }),
  mounted() {
    this.update()
  },
  methods: {
    async update() {
      this.roles = (await request({ url: '/role/' })).data

      const Admin = this.roles.find((r) => r._id === 'Admin')
      const permissions = Object.keys(Admin.permissions)
      const ordering = ['Admin', 'Authenticated', 'Anonymous']
      this.roles.sort(function(a, b) {
        const ai = ordering.indexOf(a._id)
        const bi = ordering.indexOf(b._id)
        return (ai !== bi) ? ai - bi : a._id.localeCompare(b._id)
      })
      const reducer = (row, role) => {
        row[role._id] = role.permissions[row.name]
        return row
      }
      const permissionData = permissions.map((permissionName) => this.roles.reduce(reducer, { name: permissionName }))
      this.data = permissionData.sort((a, b) => (a.name < b.name) ? -1 : 1)
    },
    async save() {
      // eslint-disable-next-line
      for (const role of this.roles) {
        role.permissions = {}
        this.data.forEach((row) => {
          if (row[role._id]) {
            role.permissions[row.name] = 1
          }
        })
        await request({ method: 'put', url: `/role/${role._id}`, data: role })
      }
    }
  }
}
</script>

<style scoped>
  input[type=checkbox] {
    transform: scale(1.5);
  }
</style>
