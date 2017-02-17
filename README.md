# Expressa
## data-driven extendable API framework for Node.js

Expressa makes it easy to create basic APIs by using [JSON schema](http://json-schema.org):

* django-like admin interface for creating collection-endpoints and managing permissions 
* collection schema's can be edited *and* added through the admin interface 
* re-use collection schema's in your frontend to generate forms
* easily extendable so you can add complex features as well
* define collection as [JSON schema](http://json-schema.org) instead of custom code
* per-collection database storage: *MongoDB*, *PostgreSQL*, or *JSON-files* (userful for version control)

> Best of all: it's just middleware, not a framework 

* mix-and-mash: easily thrown in other express middleware and endpoints 
* decorate expressa-endpoints: add event listeners which stop/modify requests (responses)

--------------------------------

## Getting Started

It's very easy to install expressa in your project directory:

    mkdir myapp
    cd myapp
    npm init
    npm install expressa expressa-admin express

Create a file `app.js` with the following code (or just copy the middle 3 lines into your existing express app)

    var express = require('express');
    var app = express();

    var expressa = require('expressa');         // 
    app.use('/api', expressa);                  //
    app.use('/admin', expressa.admin());        // pass expressa.admin({ apiurl:'/myprefix' }) if you're running the api on another host or prefix

    app.listen(3000, function () {
      console.log('Example app listening on port 3000!');
    });

Now start the server by running `node app.js` and navigate your browser to [http://localhost:3000/admin/](http://localhost:3000/admin/)

### The main page of the admin app
![home](https://cloud.githubusercontent.com/assets/406149/15307573/a43b1508-1b91-11e6-8ff3-c8a24dd4efa1.png)

--------------------------------

### Creating the "post" collection and its schema
![post schema 3](https://cloud.githubusercontent.com/assets/406149/15308189/c3612ade-1b97-11e6-8f87-faeee4aba8bd.png)

--------------------------------

### Creating a post
![create post 3](https://cloud.githubusercontent.com/assets/406149/15308188/c361368c-1b97-11e6-869a-ac40ba838dde.png)

### Start the server

`node app.js`

## Collections

### API endpoints

You can easily add collections in the admin interface, every collection will be exposing several RESTful endpoints:

| method | endpoint                      | description  |
|--------|-------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| POST   | /user/login                   | expects JSON in the message body. e.g. `{"email": "email@example.com", password: "<the password>"}                                                                                             |
| GET    | /:collection                  | get an array of all documents in a collection                                                                                                                                                  |
| GET    | /:collection/:id              | get a specific document                                                                                                                                                                        |
| GET    | /:collection/?query={}        | get an array of documents matching the mongo query                                                                                                                                             |
| GET    | /:collection/?fieldname=value | get an array of documents matching with the specified values. See [node-mongo-querystring](https://github.com/Turistforeningen/node-mongo-querystring) for details.                            |
| GET    | /:collection/schema           | get the collection schema                                                                                                                                                                      |
| POST   | /:collection/                 | create a new document, the message body should be the JSON document                                                                                                                            |
| PUT    | /:collection/:id              | replace the document with id. The message body should be the JSON document. If the _id in document is different (the old document _id is deleted and a new one with id is created.)            |
| POST   | /:collection/:id/update       | modify the document with id using a [mongo update query](https://docs.mongodb.com/manual/reference/method/db.collection.update/#update-parameter). The message body should be the update query |
| DELETE | /:collection/:id              | delete the document                                                                                                                                                                            |

> Supported Data: Only standard JSON (strings, numbers, booleans, null) is supported. Dates can be stored as strings using [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601)

Each object will contain this meta property:

```javascript
  "meta": {
    "created": "2016-05-16T23:56:11.615Z",
    "updated": "2016-05-16T23:56:28.262Z",
    "owner": "56cb5df7f56ef0b92f7b984b"
  },
```

## Documentation 

* [Authentication](doc/permissions.md)
* [Authentication using JSON Web Tokens](doc/permissions.md)
* [Managing CRUD permissions using the admin interface](doc/permissions.md)
* [Modifying behavior using listeners](doc/listeners.md)
* [Accessing the database](md/database.md)

## Todo - contributions welcome!
* JWT token expiration
* Support cookie based authentication as well
* JavaScript client library (something like [dpd.js](http://docs.deployd.com/docs/collections/reference/dpd-js.html))
* File uploads

## Inspired by

* [deployd](http://deployd.com/) (API design)
* [Django](https://www.djangoproject.com/) (admin UI)
* [Drupal](https://www.drupal.org/) (roles/permissions)
