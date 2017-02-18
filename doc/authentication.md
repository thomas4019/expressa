## Authentication

| method | endpoint                      | description  |
|--------|-------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| POST   | /user/login                   | expects JSON in the message body. e.g. `{"email": "email@example.com", password: "<the password>"}                                                                                             |

Returns the following
```javascript
{
  "success": true,
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJfaWQiOiI1NmNkNWM5NmY4MjA4N2I1MDQ0OTM3YjEiLCJ1bml2ZXJzaXR5IjoiQllVIiwiZnVsbE5hbWUiOiJUaG9tYXMgSGFuc2VuIiwicGFzc3dvcmQiOiIkMmEkMTAkb0prdlBnTTlkR2FJRTIzaWFabGEvT0tjZC9PL3phSGFJOHFRUDBuZ2pPUVV1Ums3Vng2QkciLCJlbWFpbCI6InRoNDAxOUBnbWFpbC5jb20iLCJfX3YiOjAsImxpc3RpbmdzIjpbXSwiaWF0IjoxNDU2NDMwMjE5LCJleHAiOjE0NTY1MTY2MTl9._ijngdgwLU9AJnAjbySUgEFsR8hJCSw8PhH1AnyBHuM"
}
```
Or it will respond with a status code of 401 and a message explaining why they can't login.

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

