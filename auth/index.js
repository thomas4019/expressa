const bcrypt = require('bcryptjs')
const handler = require('./jwt')
const util = require('../util')

var createHash = function (password) {
  var salt = bcrypt.genSaltSync(10)
  return bcrypt.hashSync(password, salt)
}

var isValidPassword = function (password, hashedPassword) {
  return bcrypt.compareSync(password, hashedPassword)
}

module.exports = {
  createHash: createHash,
  middleware: util.asyncMiddleware(async (req, res, next) => {
    const user = await handler.isLoggedIn(req)
    if (user) {
      req.uid = user._id
    }
    next()
  }),
  getLoginRoute: function (api) {
    return async (req, res, next) => {
      var password = req.body.password

      // check if user exists
      const result = await api.db.users.find({
        'email': req.body.email
      })
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
    }
  }
}
