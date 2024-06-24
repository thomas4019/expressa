exports.collections = function () {
  const access_keys = {
    _id: 'access_keys',
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        user_collection: {
          type: 'string'
        },
        user_id: {
          type: 'string'
        },
        key: {
          type: 'string',
          description: 'randomly generated secret'
        },
        expires_at: {
          type: 'string'
        },
      },
      required: [
        'user_id',
        'key',
        'expires_at',
      ]
    },
    storage: 'file',
    documentsHaveOwners: true
  }

  return [access_keys]
}