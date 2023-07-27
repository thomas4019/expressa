const onFinished = require('on-finished')

const util = require('../util')

module.exports = function logRequests(req, res, next) {
  if (req.db.requestlog) {
    const oldSend = res.send
    res.send = function(...params) {
      const data = params[0]
      // ensure requests using custom middleware log error messages
      if (typeof data?.error === 'string') {
        req.returnedError ??= new util.ApiError(res.statusCode, data.error)
      }
      res.send = oldSend // set function back to avoid the 'double-send'
      return res.send(...params) // just call as normal with data
    }
    onFinished(res, async function (err) {
      if (err) {
        console.error('error found while logging.')
        console.error(err)
        return
      }
      if (util.shouldLogRequest(req, res)) {
        const entry = util.createLogEntry(req, res)
        await req.db.requestlog.create(entry)
      }
    })
  }
  next()
}
