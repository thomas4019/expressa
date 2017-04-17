## When to use listeners

* decorate endpoint responses with relational data
* fine grained role-permissions: hide certain properties based on role
* save bandwidth: hide certain properties like file/image-data 
* do additional actions like sending emails when content is created or changed
* add fields whose values are computed from others
* custom validation like ensuring a user doesn't create too many documents of a collection type.

> TIP: to prevent having listenercode all over the place, use [expressa-folder](https://npmjs.org/package/expressa-folder) to automatically map listeners to files.

## Modifying behavior using listeners
Use `expressa.addListener(eventTypes, priority, callback)`

`eventTypes` is a string or array of the event types listed below e.g. 'get' or ['put', 'post']

`priority` is a number which determines the order of callback execution. Listeners with lower priority are executed first. If you don't care about order just use 0.

`callback` is a function like the following: 

`function(req, collection, doc)`  where

> `req` is the request  
> `collection` is a string of the name of the collection acted upon  
> `doc` is the relevant document.

### Before Event Types

Using these listeners you can control whether an action is allowed. Return `true` to allow the action. Return `false`  (or an object with a custom message, as shown in the example below) to deny the action. Don't return anything or `undefined` to let other listeners decide. If all listeners return undefined the action is allowed. Order is significant because it's the first defined return value that controls whether the action is allowed.

A promise can be returned so that asynchronous logic can be perfomed. In this case, it will wait for the promise to fulfill and use the resolved value.

* `get` - called once for each document being retrieved. Returning false in a request involving multiple documents (e.g. all or find) will simply remove that document from the list.
* `post` - called before creating a new document
* `put` - called before changing a document
* `delete` - called before deleting a document. Note: only the _id of the document is available in the callback. If the full document is needed you will need to load it yourself.

For example to prevent modifying old posts you could add the following listener:

    expressa.addListener('put', 10, function(req, collection, doc) {
      if (collection == 'listing') {
        if (Date.now() - new Date(doc.meta.created) > (1000*60*60*24)) { //older than a day
          return {
            code: 403,
            message: 'You cannot modify posts older than a day'
          }
        }
      }
    })

### After Event Types

With these, the value returned from the listener is ignored.

* `changed` - called after a put or post has succeeded
* `deleted` - called after a successful deletion

## Debugging 

Run `DEBUG=expressa node --use-strict app.js` or `DEBUG=* --use-strict node app.js` to see what's going on in your app

## Async wrapper example 

    var request = require('request');
    expressa.addListener('put', -10, function(req, collection, doc) {
      if (collection == 'users') {
        var key = your google maps api key;
        var loc = doc.address;
        return new Promise(function(resolve, reject) {
          request('https://maps.googleapis.com/maps/api/geocode/json?address=' + loc + '&key=' + key, function(err, response, body) {
            if (err) {
              console.error('failed to geolocate address');
              return reject();
            }
            var data = JSON.parse(body);
            if (!data.results[0]) {
              console.error('Geolocation of user address had empty response.');
              return reject();
            }
            doc.coordinates = data.results[0].geometry.location;
            resolve();
          });
        });
      }

## Manual wrappers

Sometimes you may need to wrap an expressa endpoint so you have full control before and after (like recovering from expressa errors, or other middleware). In those cases we can wrap an expressa-point like so:

    app.post('/api/myendpoint', require('./lib/listener/myendpoint/post.js')(expressa) ) 
    app.use('/api', expressa )

> NOTE: put it above the expressa init

And `lib/listener/myendpoint/post.js` like so:

		module.exports = function(expressa) {
			return function(req, res, next) {
				          // do stuff before expressa handler 
        next()    // run expressa handler
									// do stuff after expressa handler
     }
   }
