#!/usr/bin/env node
var util     = require('./../lib/util.js')
var app      = require('./../example/app.js')
var expressa = app.expressa
var testuser = { email: "foo@gmail.com" }
var request = require('superagent')

util.test("create settings collection", function(next, error){
  expressa.db.collection.create({
    "_id": "settings",
    "schema": {
      "type": "object",
      "additionalProperties": true,
      "properties": {
        "_id": {
          "type": "string"
        }
      }
    },
    "storage": "file",
    "documentsHaveOwners": false,
    "meta": {
      "updated": "2017-02-16T16:49:26.521Z",
      "created": "2017-02-16T16:49:26.521Z"
    }
  })
  .then( function(id){
    if( !id ) return error("no id returned")
    next()
  })
})

util.test("create settings 'production'", function(next, error){
  expressa.db.settings.create({
    "_id": "production",
    "postgresql_uri": "postgres://<username>:<password>@localhost/<database name>",
    "mongodb_uri": "mongodb://localhost:27017/test",
    "jwt_secret": "123123",
    "enforce_permissions": true,
    "installed": true,
    "meta": {
      "created": "2017-02-16T16:49:27.354Z",
      "updated": "2017-02-16T16:49:27.354Z"
    }
  })
  .then( function(id){
    if( !id ) return error("no id returned")
    next()
  })
})

util.test("create usercollection", function(next, error){
  expressa.db.collection.create({
    "_id": "users",
    "schema": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "meta": {
          "type": "object",
          "additionalProperties": true,
          "properties": {}
        },
        "email": {
          "type": "string"
        },
        "password": {
          "type": "string"
        },
        "fullName": {
          "type": "string"
        },
        "roles": {
          "items": {
            "type": "string",
            "enum": [
              "Admin",
              "Anonymous",
              "Authenticated",
              "Test",
              "TierLow",
              "TierMedium",
              "TierPremium"
            ]
          },
          "uniqueItems": true,
          "format": "checkbox",
          "type": "array"
        },
        "passport": {
          "type": "object",
          "properties": {
            "schema": {
              "type": "string",
              "enum": [
                "github"
              ]
            },
            "data": {
              "type": "object",
              "properties": {}
            }
          }
        },
        "id_remote": {
          "type": "string"
        }
      },
      "required": [
        "email",
        "password"
      ]
    },
    "storage": "file",
    "documentsHaveOwners": true,
    "meta": {
      "updated": "2017-02-22T15:44:05.098Z",
      "created": "2017-02-16T16:49:27.133Z"
    }
  })
  .then( function(id){
    if( !id ) return error("no id returned")
    next()
  })
})


app.onServerReady = util.run.bind(this, function(){
  app.server.close()
  process.exit(0)
})
