exports.settingSchema = {
  print_400_errors: {
    type: 'boolean',
    description: 'Print messages to console for each request with a 4xx response code.',
    format: 'checkbox',
  },
  logging_level: {
    type: 'string',
    description: 'The minimum severity level to preserve logs in the log collection.',
    enum: ['critical', 'error', 'warning', 'notice', 'info', 'debug'],
    default: 'warning',
  }
}

exports.collections = [{
  _id: 'requestlog',
  schema: {
    type: 'object',
    properties: {
      severity: {
        type: 'string',
        enum: [
          'critical',
          'error',
          'warning',
          'notice',
          'info',
          'debug'
        ]
      },
      user: {
        type: 'string'
      },
      req: {
        type: 'object',
        properties: {
          ip: {
            type: 'string'
          },
          headers: {
            type: 'object',
            additionalProperties: true,
            properties: {}
          }
        }
      },
      res: {
        type: 'object',
        properties: {
          statusCode: {
            type: 'string'
          },
          headers: {
            type: 'object',
            additionalProperties: true,
            properties: {}
          }
        }
      },
      method: {
        type: 'string'
      },
      url: {
        type: 'string'
      },
      referer: {
        type: 'string'
      }
    },
    listing: {
      columns: [
        'severity',
        'user',
        'req.ip',
        'res.statusCode',
        'method',
        'url',
        'referer',
        'meta.created'
      ]
    }
  },
  storage: 'memory',
  documentsHaveOwners: false,
}]
