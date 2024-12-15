const fs = require('fs')

const expressa = require('../')
const request = require('supertest')
const util = require('../util')

// See https://stackoverflow.com/questions/18052762/remove-directory-which-is-not-empty
const deleteFolderRecursive = function(path) {
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach(function(file) {
      const curPath = path + '/' + file
      if (fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath)
      } else { // delete file
        fs.unlinkSync(curPath)
      }
    })
    fs.rmdirSync(path)
  }
}

deleteFolderRecursive('testdata')
fs.mkdirSync('testdata')

exports.api = expressa.api({
  file_storage_path: 'testdata'
})
const express = require('express')
const randomstring = require('randomstring')
exports.app = express()
exports.app.use(exports.api)

const tokens = {
  admin: ''
}

exports.setAdminToken = function(token) {
  tokens.admin = token
}

exports.getUserWithPermissions = async function(api, permissions) {
  const service = request(exports.app)
  if (typeof permissions === 'string') {
    permissions = [permissions]
  }
  permissions = permissions || []
  const permissionsMap = {}
  permissions.forEach(function (permission) {
    permissionsMap[permission] = true
  })

  const randId = randomstring.generate(12)
  const roleName = 'role' + randId
  const role = {
    _id: roleName,
    permissions: permissionsMap
  }

  const roleRes = await service.post('/role')
    .set('x-access-token', tokens.admin)
    .send(role)
    .expect(200)

  const user = {
    email: 'test' + randId + '@example.com',
    password: '123',
  }
  const registerRes = await service.post('/users/register')
    .send(user)
    .expect(200)

  const updateRes = await service.post(`/users/${registerRes.body.id}/update`)
    .send({ $push: { roles: roleName } })
    .set('x-access-token', tokens.admin)
    .expect(200)

  const loginRes = await service.post('/users/login')
    .send(user)
    .expect(200)

  user._id = loginRes.body.uid
  return loginRes.body.token
}

exports.getAccessKeyForUserWithPermissions = async function(api, permissions) {
  const service = request(exports.app)
  if (typeof permissions === 'string') {
    permissions = [permissions]
  }
  permissions = permissions || []
  const permissionsMap = {}
  permissions.forEach(function (permission) {
    permissionsMap[permission] = true
  })

  const randId = randomstring.generate(12)
  const roleName = 'role' + randId
  const role = {
    _id: roleName,
    permissions: permissionsMap
  }

  const roleRes = await service.post('/role')
    .set('x-access-token', tokens.admin)
    .send(role)
    .expect(200)

  const user = {
    email: 'test' + randId + '@example.com',
    password: '123',
  }
  const registerRes = await service.post('/users/register')
    .send(user)
    .expect(200)

  const updateRes = await service.post(`/users/${registerRes.body.id}/update`)
    .send({ $push: { roles: roleName } })
    .set('x-access-token', tokens.admin)
    .expect(200)

  const accessKey = randomstring.generate(8)
  await exports.api.db.access_keys.create({
    user_collection: 'users',
    user_id: registerRes.body.id,
    key: accessKey,
    expires_at: '2032-01-01T00:00:00'
  })

  return accessKey
}

exports.clone = util.clone
exports.sleep = function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
exports.generateDocumentId = util.generateDocumentId
