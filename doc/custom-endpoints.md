## Custom Endpoints

Since Expressa exports a middleware you can include it in express apps that have other endpoints. These other endpoints
do not have access to the current user and other expressa objects attached to the request object. If you need these see
the section below.

## Add endpoints within expressa

The api middleware exposes a "custom" which is an express router you can attach additional endpoints to. These endpoints
are called after internal expressa middleware, but before any expressa endpoints.

Note: you can use req.hasPermission('users: edit') to check if the user has a specific permission.

Example:
```javascript
const api = expressa.api();
api.custom.get('/test', function (req, res) {
    res.send(req.user)
})
```
