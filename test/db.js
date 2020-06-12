const assert = require('assert')
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
  describe(`${collection} basic functionality`, function () {
    let db

    before(async function () {
      const coll = {
        _id: collection,
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
              properties: {}
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
                }
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
    })

    let id

    it('create without id', async function () {
      id = await db.create({ title: 'first', data: { field: '123' } })
      expect(id.length).to.be.greaterThan(6)
    })

    it('create with id', async function () {
      const id = await db.create({ _id: '5bfd9a1311771c805d161498', title: 'second' })
      expect(id).to.equal('5bfd9a1311771c805d161498')
    })

    it('create with duplicate id returns 409', async function () {
      await assert.rejects(async () => db.create({ _id: '5bfd9a1311771c805d161498' }), { name: 'ApiError' })
    })

    it('get by id', async function () {
      const doc = await db.get('5bfd9a1311771c805d161498')
      expect(doc.title).to.equal('second')
    })

    it('get by missing id returns 404 error', async function () {
      await assert.rejects(async () => db.get('111d9a1311771c805d161555'), { name: 'ApiError', message: 'document not found' })
    })

    xit('update missing id returns 404 error', async function () {
      await assert.rejects(async () => db.update('111d9a1311771c805d161555'), { name: 'ApiError', message: 'document not found' })
    })

    it('delete missing id returns 404 error', async function () {
      await assert.rejects(async () => db.delete('111d9a1311771c805d161555'), { name: 'ApiError', message: 'document not found' })
    })

    it('find all', async function () {
      const docs = await db.find()
      expect(docs.length).to.equal(2)
    })

    it('find with offset', async function () {
      const docs = await db.find({}, 1)
      expect(docs.length).to.equal(1)
    })

    it('find orderby asc', async function () {
      const docs = await db.find({}, 0, 1, [['title', 1]])
      expect(docs.length).to.equal(1)
      expect(docs[0].title).to.equal('first')
    })

    it('find orderby desc', async function () {
      const docs = await db.find({}, 0, 1, [['title', -1]])
      expect(docs.length).to.equal(1)
      expect(docs[0].title).to.equal('second')
    })

    it('find by id', async function () {
      const docs = await db.find({ _id: '5bfd9a1311771c805d161498' })
      expect(docs.length).to.equal(1)
    })

    it('find using nested $exists', async function () {
      const docs = await db.find({ 'data.field': { $exists: true } })
      expect(docs.length).to.equal(1)
    })

    it('find by id', async function () {
      const docs = await db.find({ title: 'second' })
      expect(docs.length).to.equal(1)
    })

    it('not find with mising title', async function () {
      const docs = await db.find({ title: 'invalid' })
      expect(docs.length).to.equal(0)
    })

    it('update with id', async function () {
      const doc = await db.update('5bfd9a1311771c805d161498', { title: 'second-updated', data: { more: true } })
      expect(doc._id).to.equal('5bfd9a1311771c805d161498')
    })

    after(async function () {
      await db.delete('5bfd9a1311771c805d161498')
      await db.delete(id)
      await api.db.collection.delete(collection)
    })
  })
})
