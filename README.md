## Summary

expressapi is a framework for adding an API to an express app. Collections are described via [JSON schema](http://json-schema.org). Documents can be stored in text files (for small collections), MongoDB, or PostgreSQL (using the [jsonb field](http://www.postgresql.org/docs/9.4/static/datatype-json.html)).

Provides a django-like admin interface for creating and editing documents (using [JSON Editor](https://github.com/jdorn/json-editor)), editing collection schemas, and managing permisions.

## Getting Started

Install via npm

    npm install nbackend nbackend-admin

Run the following to start off with useful collections.

    cp node_modules/nbackend/data ./

Create a file `app.js` with the following code.

    var express = require('express');
    var app = express();

    var connURL = 'postgres://thomas:334123@localhost/nbackend';
    var nbackend = require('nbackend')({postgres: connURL});

    app.use('/api', nbackend.api());
    app.use('/admin', nbackend.admin());

    app.listen(3000, function () {
      console.log('Example app listening on port 3000!');
    });

