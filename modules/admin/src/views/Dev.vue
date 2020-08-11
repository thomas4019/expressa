<template>
  <div class="app-container">
    <h1>Development Tools</h1>
    <ul class="list-group">
      <li class="list-group-item">
        <router-link to="/dev/listeners">
          Listeners
        </router-link>
      </li>
      <li class="list-group-item">
        <router-link to="/dev/middleware">
          Middleware
        </router-link>
      </li>
      <li class="list-group-item">
        <router-link to="/dev/requestlogs">
          Request Logs
        </router-link>
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  name: 'Dev',
  data: () => ({
  })
}
</script>

<style scoped>
</style>
