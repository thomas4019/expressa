const chai = require('chai')
const expect = chai.expect
const request = require('supertest')
const testutils = require('./testutils')
const { app, api } = testutils

const collectionNames = ['memorytest', 'filetest']
if (process.env.TEST_MONGO) {
  collectionNames.push('mongotest')
}
if (process.env.TEST_POSTGRES) {
  collectionNames.push('postgrestest')
}

collectionNames.forEach(function (collection) {
  describe(`${collection} string ids`, function () {
    let db
    const collectionName = collection + '2'

    before(async function () {
      const coll = {
        _id: collectionName,
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            _id: {
              type: 'string'
            },
            title: {
              type: 'string'
            },
          }
        },
        storage: collection.replace('test', ''),
        documentsHaveOwners: false,
        plainStringIds: true
      }

      const token = await testutils.getUserWithPermissions(api, 'collection: create')
      await request(app)
        .post('/collection')
        .set('x-access-token', token)
        .send(coll)
        .expect(200)

      db = api.db[collectionName]
    })

    let id
    const id2 = 'short_custom_id'

    it('create without id', async function () {
      id = await db.create({
        title: 'first',
        data: { field: '123' },
        arr: [{ color: 'red', subarray: [{ v: 'abc' }] }],
      })
      expect(id.length).to.be.greaterThan(6)
    })

    it('create with id', async function () {
      const id = await db.create({
        _id: id2,
        title: 'second',
        arr: [ { color: 'blue', num: 1337 }],
        data: { nestedArr: ['abc'] }
      })
      expect(id).to.equal(id2)
    })
  })
})

