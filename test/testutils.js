const fs = require('fs')

const expressa = require('../')
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
exports.app = express()
exports.app.use(exports.api)

exports.getUserWithPermissions = util.getUserWithPermissions
exports.clone = util.clone
exports.sleep = function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}