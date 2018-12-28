// This is for starting a server with the test configuration/data.
const expressa = require('../index')
const api = expressa.api({
  'file_storage_path': 'testdata'
})

const express = require('express')
const app = express()
app.use('/api', api)

api.addListener('ready', function () {
  app.listen(3000, function () {
    // eslint-disable-next-line no-console
    console.log('Test server listening on port 3000!')
  })
})
