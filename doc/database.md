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

