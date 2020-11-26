### Generic JSON Database API

You can access a collection's database using `expressa.db[collectionName].action where action is one of the following:

* all - returns all documents
* find - returns array of documents matching the mongo query
* get - retrieve a document by id
* create - create a new document
* update - modify an existing document
* delete - delete a document by id
* init - called once during startup, useful to create/ensure collection exists

### Implemented JSON databases
* MongoDB
* PostgreSQL (using [jsonb](http://www.postgresql.org/docs/9.4/static/datatype-json.html) and [mongo-query-to-postgres-jsonb](https://github.com/thomas4019/mongo-query-to-postgres-jsonb))
* Text files (using [json-file-store](https://github.com/flosse/json-file-store) and [mongo-query](https://github.com/Automattic/mongo-query))
* In-memory (useful for small/medium ephemeral datasets like logs)

Other JSON capable databases can be added easily (pull requests welcome!) by writing a wrapper that supports each of the above methods.

### Smart database objects

[expressa-folder](https://npmjs.org/package/expressa-folder) will automatically add functions to objects returned by `all`,`find` and `get`
