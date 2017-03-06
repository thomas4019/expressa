var express             = require('express')
var expressa            = require('./../../.')

var port                = process.env.PORT || 3000
var host                = process.env.HOST || 'http://localhost:'+port
var app = express()

app.use('/api', expressa )

app.get('/foo/bar', function(req, res, next){
  res.send({}).end()
})

module.exports = { 
  server:false, 
  expressa:expressa, 
  express:express, 
  app:app, 
  server: app.listen(port, function(){
    if( module.exports.onServerReady ) setTimeout(module.exports.onServerReady, 500 )
  })
}

