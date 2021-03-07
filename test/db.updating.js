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
  describe(`${collection} updating`, function () {
    let db
    let id
    const collectionName = collection + '3'

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
            data: {
              type: 'object',
              additionalProperties: true,
              properties: {
                nestedArr: {
                  type: 'array',
                  items: {
                    type: 'string'
                  }
                },
              }
            },
            arr: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  color: {
                    type: 'string'
                  },
                  num: {
                    type: 'number'
                  },
                  subarray: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        v: {
                          type: 'string'
                        }
                      }
                    }
                  }
                }
              }
            },
            meta: {
              type: 'object',
              propertyOrder: 2000,
              properties: {
                created: {
                  type: 'string'
                },
                updated: {
                  type: 'string'
                },
              }
            }
          },
          required: [
            'title'
          ]
        },
        storage: collection.replace('test', ''),
        documentsHaveOwners: false,
      }

      const token = await testutils.getUserWithPermissions(api, 'collection: create')
      await request(app)
        .post('/collection')
        .set('x-access-token', token)
        .send(coll)
        .expect(200)

      db = api.db[collection]

      id = await db.create({
        title: 'first',
        data: { field: '123' },
        arr: [{ color: 'red', subarray: [{ v: 'abc' }] }],
      })

      await db.create({
        title: 'second',
        data: { field: '123' },
        arr: [{ color: 'red', subarray: [{ v: 'abc' }] }],
      })

      await db.create({
        title: 'third',
        data: { field: '12345' },
        arr: [{ color: 'red', subarray: [{ v: 'abc' }] }],
      })
    })

    it('update by query with id', async function () {
      const res = await db.updateWithQuery({ _id: id }, { $set: { title: 'first22' } })
      expect(res.matchedCount).to.equal(1)

      const doc = await db.get(id)
      expect(doc.title).to.equal('first22')
    })

    it('update by query with sub field', async function () {
      let docs = await db.find({})
      expect(docs).to.have.length(3)

      const res1 = await db.updateWithQuery({ 'data.field': '123' }, { $set: { test: true } })
      docs = await db.find({test: true })
      expect(docs).to.have.length(2)
      expect(res1.matchedCount).to.equal(2)

      const res2 = await db.updateWithQuery({ 'data.field': { $in: ['123', '12345'] } }, { $set: { test: true } })
      docs = await db.find({ test: true })
      expect(docs).to.have.length(3)
      expect(res2.matchedCount).to.equal(3)
    })
  })
})

