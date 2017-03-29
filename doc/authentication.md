## Authentication
Uses [JSON Web Tokens](https://jwt.io/)

| method | endpoint                      | description  |
|--------|-------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| POST   | /user/login                   | expects JSON in the message body. e.g. `{"email": "email@example.com", password: "<the password>"}                                                                                             |

Returns the following
```javascript
{
  "uid": "a52ee085-ff47-4ee1-bac3-a8a319f674ed",
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

## Making authenticated requests

After obtaining a token as described above you need to pass it with your request in one of these ways

1. Using the `x-access-token`

	`curl --header "x-access-token: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJfaWQiOiI1NmNkNWM5NmY4MjA4N2I1MDQ0OTM3YjEiLCJ1bml2ZXJzaXR5IjoiQllVIiwiZnVsbE5hbWUiOiJUaG9tYXMgSGFuc2VuIiwicGFzc3dvcmQiOiIkMmEkMTAkb0prdlBnTTlkR2FJRTIzaWFabGEvT0tjZC9PL3phSGFJOHFRUDBuZ2pPUVV1Ums3Vng2QkciLCJlbWFpbCI6InRoNDAxOUBnbWFpbC5jb20iLCJfX3YiOjAsImxpc3RpbmdzIjpbXSwiaWF0IjoxNDU2NDMwMjE5LCJleHAiOjE0NTY1MTY2MTl9._ijngdgwLU9AJnAjbySUgEFsR8hJCSw8PhH1AnyBHuM" api.example.com/user/me`

2. Pass the token as a query parameter.

	`curl api.example.com/user/me?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJfaWQiOiI1NmNkNWM5NmY4MjA4N2I1MDQ0OTM3YjEiLCJ1bml2ZXJzaXR5IjoiQllVIiwiZnVsbE5hbWUiOiJUaG9tYXMgSGFuc2VuIiwicGFzc3dvcmQiOiIkMmEkMTAkb0prdlBnTTlkR2FJRTIzaWFabGEvT0tjZC9PL3phSGFJOHFRUDBuZ2pPUVV1Ums3Vng2QkciLCJlbWFpbCI6InRoNDAxOUBnbWFpbC5jb20iLCJfX3YiOjAsImxpc3RpbmdzIjpbXSwiaWF0IjoxNDU2NDMwMjE5LCJleHAiOjE0NTY1MTY2MTl9._ijngdgwLU9AJnAjbySUgEFsR8hJCSw8PhH1AnyBHuM`