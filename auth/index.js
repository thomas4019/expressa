var bcrypt = require('bcryptjs')
var handler = require('./jwt')
var debug = require('debug')('expressa')

var createHash = function (password) {
  var salt = bcrypt.genSaltSync(10)
  return bcrypt.hashSync(password, salt)
}

var isValidPassword = function (password, hashedPassword) {
  return bcrypt.compareSync(password, hashedPassword)
}

module.exports = {
  createHash: createHash,
  middleware: function (req, res, next) {
    handler.isLoggedIn(req, function (err, user) {
      if (err) {
        debug('error decrypting user token.')
        debug(err)
      }
      if (user) {
        req.uid = user._id
      }
      next()
    })
  },
  getLoginRoute: function (api) {
    return function (req, res, next) {
      var password = req.body.password

      // check if user exists
      api.db.users.find({
        'email': req.body.email
      })
        .then(function (result) {
          if (result.length === 0) {
            return res.status(400).send({
              error: 'No user found with this email.'
            })
          }
          var user = result[0]
          if (isValidPassword(password, user.password)) {
            handler.doLogin(user, req, res, next)
          } else {
            res.status(401).send({
              error: 'Incorrect password'
            })
          }
        }, next)
    }
  }
}
