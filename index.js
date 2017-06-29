var fs = require('fs')
var express = require('express')
var router = express.Router()
var bodyParser  = require('body-parser')
var auth = require('./auth')
var mongoQuery = require('mongo-query');
var MongoQS = require('mongo-querystring')
var debug = require('debug')('expressa')
var sequential = require('promise-sequential')
var onFinished = require('on-finished')

router.queryStringParser = new MongoQS({});

var rolePermissions = require('./role_permissions')(router);

var dbTypes = {
	file: require('./db/file'),
	memory: require('./db/memory'),
	postgres: require('./db/postgres'),
	mongo: require('./db/mongo'),
	mongodb: require('./db/mongo'),
}
router.dbTypes = dbTypes

var db = {}
db.settings = dbTypes['file']({}, 'settings')
router.db = db

router.settings = {}

process.env.NODE_ENV = process.env.NODE_ENV || "development"

db.settings.get( process.env.NODE_ENV )
	.then(function(data) {
		router.settings = data;

		db.collection = dbTypes[router.settings.collection_db_type||'file'](router.settings, 'collection')

		return db.collection.all()
			.then(function(result) {
				var promises = result.map(function(collection) {
					if (typeof dbTypes[collection.storage] != 'function') {
						console.error('missing ' + collection.storage + ' dbtype which is used by ' + collection._id);
						console.error('try updating to the latest version of expressa')
					}
					db[collection._id] = dbTypes[collection.storage](router.settings, collection._id);
					return Promise.resolve(db[collection._id].init())
						.then(function(sucess) {
							debug('initialized ' + collection._id + ' using '+ collection.storage);
						}, function(err) {
							console.error('failed to initialize ' + collection._id + ' using '+ collection.storage);
						})
				});
				return Promise.all(promises);
			}, function(err) {
				console.error('failed to load collections');
				console.error(err);
			});
	}, function(err) {
		if (!fs.existsSync('data/settings/'+process.env.NODE_ENV+'.json')) {
		    console.error(process.env.NODE_ENV + ' settings file does not exist.')
		    console.error('Please visit the expressa admin page to run the installation process.')
		    console.error('This is likely at http://localhost:3000/admin but may be different if you changed ports, etc.')
		} else {
			console.error('error reading settings')
			console.error(err.stack)
		}
		db.collection = dbTypes[router.settings.collection_db_type||'file'](router.settings, 'collection')
	})
	.then(function(data) {
		debug('collections loaded.');

		var promises = [
			require('./collection_permissions')(router), // Add standard collection based permissions
			require('./listeners')(router),
			require('./validation_listeners')(router)
		];
		Promise.all(promises)
			.then(function() {
				notify('ready')
			}, function(err) {
				console.error(err);
				console.error('Expressa error setting up validators');
			})

	}, function(err) {
		console.error('error during startup')
		console.error(err.stack);
	})

var eventListeners = {};
router.eventListeners = eventListeners;

router.addListener = function addListener(events, priority, listener) {
	if (typeof events == 'string') {
		events = [events];
	}
	if (typeof priority == 'function') {
		listener = priority;
		priority = 0;
	}
	listener.priority = priority;
	events.forEach(function(event) {
		eventListeners[event] = eventListeners[event] || [];
		eventListeners[event].push(listener);
		eventListeners[event].sort(function(a,b) {
			return a.priority - b.priority
		})
	})
}

var severities = ["critical", "error", "warning", "notice", "info", "debug"]
function getSeverity(status) {
	var severity = status >= 500 ? 'error'
		: status >= 400 ? 'warning'
		: status >= 300 ? 'notice'
		: status >= 200 ? 'info'
		: 'debug'
	return severity;
}

router.use(function logger(req, res, next)  {
	if (db.log) {
		onFinished(res, function (err) {
			var severity = getSeverity(res.statusCode)
			var severityLoggingIndex = severities.indexOf(req.settings.logging_level || 'warning');
			var severityIndex = severities.indexOf(severity)
			if (severityIndex <= severityLoggingIndex) {
				var entry = {
					severity: severity,
					user: req.user ? req.user._id : undefined,
					url: decodeURI(req.originalUrl || req.url),
					method: req.method,
					referer: req.headers['referer'],
					req: {
						ip: req.ip,
						headers: req.headers,
					},
					res: {
						statusCode: res.statusCode,
						headers: res._headers
					},
					meta: {
						created: new Date().toISOString(),
						updated: new Date().toISOString(),
					}
				}
				db.log.create(entry, function(res) {

					}, function(err) {
						console.error(err);
						console.error('failed to write log entry.')
					});
			}
		})
	}
	next()
})

// The wildcard type ensures it works without the application/json header
router.use(bodyParser.json({ type: "*/*" }))

router.use(function(req, res, next) {
	req.settings = router.settings;
	next()
})

router.get('/status', function(req, res, next) {
	res.send({
		installed: req.settings.installed || false
	})
})

router.post('/user/register', function(req, res, next) {
	req.url = '/users';
	next('route')
})
router.post('/user/login', auth.getLoginRoute(router))

router.use(auth.middleware) // Add user id to request, if logged in
router.use(rolePermissions.middleware) // Add user and permissions to request

router.get('/user/me', function(req, res, next) {
	req.params.collection = 'users';
	req.params.id = req.uid;
	getById(req, res, next);
	//res.redirect('/users/' + req.uid)
});

function notify(event, req, collection, data) {
	if (typeof eventListeners[event] == 'undefined' || eventListeners[event].length == 0) {
		return Promise.resolve(true);
	}
	debug('notifying '+ eventListeners[event].length +  ' of ' + event)
	var promises = eventListeners[event].map(function(listener) {
		debug('calling ' + listener.name)
		try {
			return () => listener(req, collection, data)
		} catch (e) {
			console.error('error in listener')
			console.error(e.stack)
		}
	})
	return sequential(promises)
		.then(function(results) {
			//console.log('notifying done')
			// Result is the first defined value
			var result = results.reduce(function(prev, current) {
				return (prev == undefined) ? current : prev;
			})
			return result || result === undefined
		}, function(err) {
			console.error('ERROR during listeners ' + event + ' ' + collection)
			console.error(data)
			console.error(err.stack);
			return err;
		});	
}
router.notify = notify

function createPagination(data, req, limit){
	var pagination = {
		page: parseInt(req.query.page),
		itemsTotal: data.length, 
		itemsPerPage: limit, 
		pages: Math.ceil( data.length / limit ), 
	}
	pagination.page = pagination.page > pagination.pages ? pagination.pages : pagination.page 
	if ( pagination.page + 1 <= pagination.pages   ) pagination.pageNext = pagination.page + 1 
	if ( pagination.page - 1 > -1                  ) pagination.pagePrev = pagination.page - 1 
	pagination.data = data.splice( pagination.page * limit, limit )
	return pagination
}

router.get('/:collection/schema', function (req, res, next) {
	db.collection.get(req.params.collection)
		.then(function(collection) {
			notify('get', req, 'schemas', collection)
				.then(function(allowed) {
					if (allowed === true)
						res.send(collection.schema);
					else 
						res.status(allowed.code||500).send(allowed.message || 'forbidden');
				}, function(err) {
					next(err)
				})

		}, function(err, code) {
			res.errCode = code;
			next(err);
		})
})

router.get('/:collection', function (req, res, next) {
	var total = 0
	if (typeof db[req.params.collection] == 'undefined') {
		return res.status(404).send('page not found')
	}
	if (Object.keys(req.query).length > 0) {
		var query, orderby;
		if (typeof req.query.query != 'undefined') {
			query = JSON.parse(req.query.query)
		} else {
			var params = JSON.parse(JSON.stringify(req.query));
			delete params['skip']
			delete params['offset']
			delete params['limit']
			delete params['orderby']
			query = router.queryStringParser.parse(params)
		}
		if (req.query.skip) {
			req.query.skip = parseInt(req.query.skip)
		}
		if (req.query.offset) {
			req.query.offset = parseInt(req.query.offset)
		}
		if (req.query.limit) {
			req.query.limit = parseInt(req.query.limit)
			if( req.query.page ) {
				req.query.pageitems = req.query.limit
				delete req.query.limit
			} 
		}
		if (typeof req.query.orderby != 'undefined') {
			orderby = JSON.parse(req.query.orderby)

			if (Array.isArray(orderby)) {
				orderby = orderby.map(function(ordering) {
					if (typeof ordering == 'string') {
						return [ordering, 1]
					} else if (Array.isArray(ordering)) {
						if (ordering.length == 1) {
							return [ordering[0], 1] // add 1 (default to ascending sort)
						}
					}
					return ordering
				})
			} else {
				var arr = []
				for (var key in orderby) {
					arr.push([key, orderby[key]])
				}
				orderby = arr
			}
		} else {
			orderby = undefined
		}
		db[req.params.collection].find(query, req.query.skip || req.query.offset, req.query.limit, orderby)
			.then(function(data) {
				total = data.length
				var limit = req.query.pageitems || (total > 10 ? 10 : total ) 
				// calculate pagination in case `page`-queryarg was passed
				var pagination = {}
				if( req.query.page ) pagination = createPagination(data, req, limit)
				var promises = data.map(function(doc) {
					return notify('get', req, req.params.collection, doc);
				});
				Promise.all(promises)
					.then(function(allowed) {
						data = data.filter( (doc, i) => allowed[i] === true )
						var result = req.query.page ? pagination : data;
						notify('getpresend', req, req.params.collection, result)
							.then(function() {
								res.send(result)
							}, next);
					}, function(err) {
						next(err);
					})
			}, function(err, code) {
				res.errCode = code;
				next(err);
			});
	} else {
		db[req.params.collection].all()
			.then(function(data) {
				var promises = data.map(function(doc) {
					return notify('get', req, req.params.collection, doc);
				});
				Promise.all(promises)
					.then(function(allowed) {
						var result = data.filter(function(doc, i) {
							return allowed[i] === true;
						});
						notify('getpresend', req, req.params.collection, result)
							.then(function() {
								res.send(result)
							}, next);
					}, function(err) {
						next(err);
					})
			}, function(err, code) {
				res.errCode = code;
				next(err);
			});
	}
})

router.post('/:collection', function (req, res, next) {
	var data = req.body
	notify('post', req, req.params.collection, data)
		.then(function(allowed) {
			if (allowed === true) {
				db[req.params.collection].create(data)
					.then(function(id) {
						notify('changed', req, req.params.collection, data)
						res.send({
							status: 'OK',
							id: id
						});
					}, function(err, code) {
						res.errCode = code;
						next(err);
					});
			} else {
				res.status(allowed.code||500).send(allowed.message);
			}
		}, function(err) {
			next(err)
		});
})

function getById(req, res, next) {
	if (req.params.id == 'schema' || !db[req.params.collection])
		return next();
	db[req.params.collection].get(req.params.id)
		.then(function(data) {
			notify('get', req, req.params.collection, data)
				.then(function(allowed) {
					if (allowed === true) {
						notify('getpresend', req, req.params.collection, data)
							.then(function() {
								res.send(data)
							}, next);
					} else {
						res.status(allowed.code||403).send(allowed.message || 'forbidden');
					}
				});
		}, function(err, code) {
			res.status(404).send('document not found')
		});
}
router.get('/:collection/:id', getById)

router.put('/:collection/:id', function(req, res, next) {
	var data = req.body
	data._id = req.params.id
	notify('put', req, req.params.collection, data)
		.then(function(allowed) {
			if (allowed === true) {
				db[req.params.collection].update(req.params.id, req.body)
					.then(function(data) {
						notify('changed', req, req.params.collection, req.body)
						res.send('OK');
					}, function(err, code) {
						res.errCode = code;
						next(err);
					});
			} else {
				res.status(allowed.code||500).send(allowed.message || 'forbidden');
			}
		}, function(err) {
			next(err);
		})
})

router.post('/:collection/:id/update', function (req, res, next) {
	var modifier = req.body

	db[req.params.collection].get(req.params.id)
		.then(function(doc) {
			var changes = mongoQuery(doc, {}, modifier);
			req.body = doc;
			notify('put', req, req.params.collection, doc)
				.then(function(allowed) {
					if (allowed === true) {
						db[req.params.collection].update(req.params.id, req.body)
							.then(function(data) {
								notify('changed', req, req.params.collection, req.body)
								res.send(doc);
							}, function(err, code) {
								res.errCode = code;
								next(err);
							});
					} else {
						res.status(allowed.code||500).send(allowed.message || 'forbidden');
					}
				}, function(err) {
					next(err);
				})
		}, function(err) {
			next(err);
		});
})

router.delete('/:collection/:id', function (req, res, next) {
	notify('delete', req, req.params.collection, {_id: req.params.id})
		.then(function(allowed) {
			if (allowed) {
				db[req.params.collection].delete(req.params.id)
					.then(function(data) {
						notify('deleted', req, req.params.collection, {_id: req.params.id})
						res.send('OK');
					}, function(err, code) {
						res.errCode = code;
						next(err); 
					});
			}
			else {
				res.status(allowed.code||500).send(allowed.message || 'forbidden');
			}
		}, function(err) {
			next(err)
		})
})

// Error handler, log and send to user
router.use(function(err, req, res, next) {
	console.log('my err handler')
	console.error(err.stack);
	res.status(res.errCode || 500)
	if( process.env.DEBUG || (req.hasPermission && req.hasPermission('view errors')) ){      
		res.send(err);           
	} else {
		res.send('something wrong happened')
	} 
})

router.admin = function(settings) {
	var router = express.Router()
	router.get('/settings.js', function(req, res) {
		res.set('Content-Type', 'text/javascript');
		res.send('window.settings = ' + JSON.stringify(settings||{}) + ';')
	})
	router.use(express.static('node_modules/expressa-admin'))
	return router
}

module.exports = router;
