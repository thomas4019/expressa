// This is for starting a server with the test configuration/data.
const expressa = require('../index')
const api = expressa.api({
  file_storage_path: 'testdata'
})

const express = require('express')
const app = express()
app.use('/api', api)
app.use('/admin', expressa.admin({ apiurl: 'http://localhost:3001/api/' }))

api.addListener('ready', function onStart() {
  app.listen(3001, function () {
    // eslint-disable-next-line no-console
    console.log('Test server listening on port 3001!')
  })
})
