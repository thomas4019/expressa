#!/usr/bin/env node
var util     = require('./../lib/util.js')
var app      = require('./../example/app.js')
var expressa = app.expressa
var testuser = { email: "foo@gmail.com" }
var request = require('superagent')

util.test("create user", function(next, error){
  expressa.db.users.create(testuser)
  .then(function(user){
    console.dir(user)
    if( user ) next()
    else error("no user")
  })
  .catch(error)
})

util.test("delete user", function(next, error){
  expressa.db.users.find({email: testuser.email })
  .then(function(users){
    if( users.length == 0 ) next()
    expressa.db.users.delete( users[0]._id )
    .then(next)
    .catch(error)
  })
  .catch(error)
})

app.onServerReady = util.run.bind(this, function(){
  app.server.close()
  process.exit(0)
})
