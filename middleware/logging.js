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
      // This callback runs detached after the response finishes, so anything
      // thrown or rejected here is an unhandled rejection that crashes the
      // process. A failed log write must never take the server down.
      try {
        if (err) {
          console.error('error found while logging.')
          console.error(err)
          return
        }
        if (util.shouldLogRequest(req, res)) {
          const entry = util.createLogEntry(req, res)
          await req.db.requestlog.create(entry)
        }
      } catch (logErr) {
        console.error('error while writing request log entry')
        console.error(logErr)
      }
    })
  }
  next()
}
