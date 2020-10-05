## Setup for developing expressa
1. git clone git@github.com:thomas4019/expressa.git
1. cd expressa
1. npm install
1. npm link
1. cd modules/admin
1. npm install
1. npm run build

In another folder, create a project using app.js from the readme.
1. npm link expressa
1. node app.js

## Developing admin UI locally
* npm run testserver
* (cd modules/admin && npm run dev)
* npm run cypress (to manually run specific tests)

## Before committing/releasing
* npm run test
* npm run testdbs (if changing Postgres or Mongo code)
* npm run testcypress (if changing admin UI or related)
* npm run fixlint
* (cd modules/admin && npm run lint) (if changing admin UI)

## To release
* Update version in package.json
* (cd modules/admin && npm run build)
* npm publish
* ls -la modules/admin/dist/static/js
* Create release on GitHub

## More info
[Modules](doc/modules.md)