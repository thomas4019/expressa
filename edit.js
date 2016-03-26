module.exports = (function() {

var express = require('express')
var bodyParser  = require('body-parser')
var router = express.Router()
var Store = require("jfs")
var schemaDb = new Store("data/schemas")
var pg = require('pg')
var conString = require('./config.js').getConnectionURL()
var auth = require('./auth')
var handlebars = require('handlebars')
var path = require('path')
var fs = require('fs')

var ajv = require('ajv')({allErrors: true});

router.use(bodyParser.json())

//router.use(auth.middleware)

pg.connect(conString, function(err, client, done) {
	if (err) { 
		console.error(err)
	}

	var p = path.dirname(fs.realpathSync(__filename));
	router.use('/node_modules', express.static(p+'/node_modules'))
	router.use('/templates', express.static(p+'/templates'))


	router.get('/:schema', function (req, res) {
		var p = path.join(path.dirname(fs.realpathSync(__filename)), 'templates/edit.html')
		var t = fs.readFileSync(p, "utf8")
		res.send(t)
	})

	router.get('/schema/:schema', function (req, res) {
		var p = path.join(path.dirname(fs.realpathSync(__filename)), 'templates/schema.html')
		var t = fs.readFileSync(p, "utf8")
		res.send(t)
	})
})

return router;
});