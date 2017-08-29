// This is for starting a server with the test configuration/data.
var expressa = require('.')
var api = expressa.api({
  'file_storage_path': 'testdata'
})

var express = require('express')
var app = express()
app.use('/api', api)

api.addListener('ready', function() {
  app.listen(3000, function () {
    console.log('Test server listening on port 3000!');
  });
});