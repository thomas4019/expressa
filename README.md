# Expressa
## a data-driven extendable API framework for Node.js

Expressa makes it easy to create basic APIs without custom code. It's easily extendable so you can add complex features as well. It includes a django-like admin interface for creating documents and managing permissions without doing any code. Furthermore, the collection schema's themselves can be edited through the admin interface which makes adding new collections simple.

Those with experience in node and express can mix expressa with their own endpoints, since expressa is just a middleware. It allows adding event listeners which can stop requests and/or modify the results, so advanced functionality can be cleanly added.

The [JSON schema](http://json-schema.org) standard format is used for describing the documents in a collection. This makes your schemas portable, so you can easily use them for another app and with other libraries.

Expressa lets you store different collections in different databases (thus taking advantage of each one's unique benefits). Documents can be stored in MongoDB, PostgreSQL, or just text files (useful for version control). Support for other JSON capable databases can be easily added.

--------------------------------

### The main page of the admin app
![home](https://cloud.githubusercontent.com/assets/406149/15307573/a43b1508-1b91-11e6-8ff3-c8a24dd4efa1.png)

--------------------------------

### Creating the "post" collection and its schema
![post schema 3](https://cloud.githubusercontent.com/assets/406149/15308189/c3612ade-1b97-11e6-8f87-faeee4aba8bd.png)

--------------------------------

### Creating a post
![create post 3](https://cloud.githubusercontent.com/assets/406149/15308188/c361368c-1b97-11e6-869a-ac40ba838dde.png)

## Getting Started

Create a directory to hold your application, make that your working directory, and initialize npm

    mkdir myapp
    cd myapp
    npm init

Install via npm

    npm install expressa expressa-admin express

Create a file `app.js` with the following code (or just copy the middle 3 lines into your existing express app)

    var express = require('express');
    var app = express();

    var expressa = require('expressa');
    app.use('/api', expressa);
    app.use('/admin', expressa.admin());

    app.listen(3000, function () {
      console.log('Example app listening on port 3000!');
    });

Note: you can run the api server on a different host or prefix and then by passing the url like so expressa.admin({ apiurl:'/' })

### Start the server

`node app.js`

### Install via the admin app

Navigate to [http://localhost:3000/admin/](http://localhost:3000/admin/) or to wherever the admin site is being served from and fill out the form.

## Collections

### API endpoints

* `GET /:collection>/` - get an array of all documents in a collection
* `GET /:collection>/:id` - get a specific document
* `GET /:collection>/?query={}` - get an array of documents matching the mongo query
* `GET /:collection>/?fieldname=value` - get an array of documents matching with the specified values. See [node-mongo-querystring](https://github.com/Turistforeningen/node-mongo-querystring) for details.
* `GET /:collection>/schema` - get the collection schema
* `POST /:collection/` - create a new document, the message body should be the JSON document
* `PUT /:collection/:id` - replace the document with `id`. The message body should be the JSON document. If the _id in document is different (the old document `_id` is deleted and a new one with `id` is created.)
* `POST /:collection/:id/update` - modify the document with `id` using a [mongo update query](https://docs.mongodb.com/manual/reference/method/db.collection.update/#update-parameter). The message body should be the update query
* `DELETE /:collection/:id` - delete the document

### Supported Data

Only standard JSON (strings, numbers, booleans, null) is supported. Dates can be stored as strings using [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601)

### Special endpoints

* `POST /user/login` - expects JSON in the message body. e.g. `{"email": "email@example.com", password: "<the password>"}`

Returns the following
```javascript
{
  "success": true,
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJfaWQiOiI1NmNkNWM5NmY4MjA4N2I1MDQ0OTM3YjEiLCJ1bml2ZXJzaXR5IjoiQllVIiwiZnVsbE5hbWUiOiJUaG9tYXMgSGFuc2VuIiwicGFzc3dvcmQiOiIkMmEkMTAkb0prdlBnTTlkR2FJRTIzaWFabGEvT0tjZC9PL3phSGFJOHFRUDBuZ2pPUVV1Ums3Vng2QkciLCJlbWFpbCI6InRoNDAxOUBnbWFpbC5jb20iLCJfX3YiOjAsImxpc3RpbmdzIjpbXSwiaWF0IjoxNDU2NDMwMjE5LCJleHAiOjE0NTY1MTY2MTl9._ijngdgwLU9AJnAjbySUgEFsR8hJCSw8PhH1AnyBHuM"
}
```
Or it will respond with a status code of 401 and a message explaing why they can't login.

```javascript
{
  "success": false,
  "message": "Authentication failed. Wrong password."
}
```

The returned token must then be passed in as a header on future requests using the header x-access-token

* `GET /user/me` - returns the logged in user's object

## Authentication using [JSON Web Tokens](https://jwt.io/)

Obtain a token by sending a POST to `/user/login`. This returns:
```
{
  "id": "572d93513688657feede5877",
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJfaWQiOiI1NmNkNWM5NmY4MjA4N2I1MDQ0OTM3YjEiLCJ1bml2ZXJzaXR5IjoiQllVIiwiZnV._ijngdgwLU9AJnAjbySUgEFsR8hJCSw8PhH1AnyBHuM"
}
```
This token can then be passed as a queryparam (e.g. ?token=) or using the `x-access-token` header.

## Permissions

Expressa lets you manage CRUD permissions for collections easily through the admin interface. Collections that are marked as having documents with owners have additional permissions for users interacting with their own documents.

![post permissions](https://cloud.githubusercontent.com/assets/406149/15307975/8c609530-1b95-11e6-9888-36a76a9a8248.png)

Note: additional roles can be added through the interface

## Automatic Metadata

A meta property is added to objects which looks like the following.
```javascript
  "meta": {
    "created": "2016-05-16T23:56:11.615Z",
    "updated": "2016-05-16T23:56:28.262Z",
    "owner": "56cb5df7f56ef0b92f7b984b"
  },
```

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

### Generic JSON Database API

Each of the database implementations provides the following methods. You can access a collection's database using `api.db[collectionName]

* all - returns all documents
* find - returns array of documents matching the mongo query
* get - retrieve a document by id
* create - create a new document
* update - modify an existing document
* delete - delete a document by id
* init - called once during startup, useful to create/ensure collection exists

### Implemented JSON databases
* MongoDB
* PostgreSQL (using [jsonb](http://www.postgresql.org/docs/9.4/static/datatype-json.html))
* Text files (using [json-file-store](https://github.com/flosse/json-file-store) and [mongo-query](https://github.com/Automattic/mongo-query))

Other JSON capable databases can be added easily.

## Todo - contributions welcome!
* JWT token expiration
* Support cookie based authentication as well
* JavaScript client library (something like [dpd.js](http://docs.deployd.com/docs/collections/reference/dpd-js.html))
* File uploads

## Inspired by

* [deployd](http://deployd.com/) (API design)
* [Django](https://www.djangoproject.com/) (admin UI)
* [Drupal](https://www.drupal.org/) (roles/permissions)