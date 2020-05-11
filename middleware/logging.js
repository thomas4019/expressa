const onFinished = require('on-finished')

const util = require('../util')

module.exports = function logRequests(req, res, next) {
  if (req.db.log) {
    onFinished(res, async function (err) {
      if (err) {
        console.error('error found while logging.')
        console.error(err)
        return
      }
      if (util.shouldLogRequest(req, res)) {
        const entry = util.createLogEntry(req, res)
        await req.db.log.create(entry)
      }
    })
  }
  next()
}
