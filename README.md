## Summary

expressa is an api framework for express apps. Collections are described via [JSON schema](http://json-schema.org). Documents can be stored in text files (for small collections), MongoDB, or PostgreSQL (using the [jsonb field](http://www.postgresql.org/docs/9.4/static/datatype-json.html)).

Provides a django-like admin interface for creating and editing documents (using [JSON Editor](https://github.com/jdorn/json-editor)), editing collection schemas, and managing permisions.

## Getting Started

Install via npm

    npm install expressa express

Create a file `app.js` with the following code (or integrate the middle 4 lines into your existing express app)

    var express = require('express');
    var app = express();

    var expressa = require('expressa')();
    var api = expressa.api;
    app.use('/api', api);
    app.use('/admin', expressa.admin());

    app.listen(3000, function () {
      console.log('Example app listening on port 3000!');
    });

## Collections

### API endpoints

* `GET /:collection>/` - get an array of all objects in a collection
* `GET /:collection>/:id` - get a specific object
* `GET /:collection>/?query={}` - get an array of objects matching the mongo style query
* `GET /:collection>/schema` - get the collection schema
* `POST /:collection/` - create a new document
* `POST /:collection/:id/update` - modify the document with `id` using a [mongo update query](https://docs.mongodb.com/manual/reference/method/db.collection.update/#update-parameter)
* `PUT /:collection/:id` - replace the document with `id`. The id may be changed by supplying a different `_id` in the document (this is equivalent to creating a new document and deleting the old one.)
* `DELETE /:collection/:id`

### Supported Data

Only standard JSON (strings, numbers, booleans, null). Dates can be stored as strings using [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601)

### Special endpoints

* `POST /user/login`
* `GET /user/me` - return the logged in user's object


## Authentication using [JSON Web Tokens](https://jwt.io/)

Obtain a token by sending a POST to `/user/login`. This returns:
```
{
  "id": "572d93513688657feede5877",
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJfaWQiOiI1NmNkNWM5NmY4MjA4N2I1MDQ0OTM3YjEiLCJ1bml2ZXJzaXR5IjoiQllVIiwiZnV._ijngdgwLU9AJnAjbySUgEFsR8hJCSw8PhH1AnyBHuM"
}
```
This token can then be passed as a queryparam (e.g. ?token=) or using the `x-access-token` header.

## Modifying behavior using listeners
Use one of the two functions to add a listener
`api.addListener(eventTypes, priority, callback)`

`eventTypes` is a string or array of the event types listed below  
`priority` determines the order of callback execution. Listeners with lower priority are executed first.  
`callback` is a function like the following: `function(req, collection, doc)` 

    `req` is the request
    `collection` is a string of the name of the collection acted upon
    `doc` is generally the relevant . Sometimes only doc._id is available.

Before Event Types

* get
* post
* put
* delete

After Event Types

* changed
* deleted

## Todo - contributions welcome!
* JWT token expiration
* Support cookie based authentication as well
* JavaScript client library (something like [dpd.js](http://docs.deployd.com/docs/collections/reference/dpd-js.html))
* File uploads

## Inspired by

* deployd (API design)
* Django (admin UI)
* Drupal (roles/permissions)