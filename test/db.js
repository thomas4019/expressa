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
    })

    let id
    const id2 = '6c4b9d57-4c89-4ad8-90e2-9a5337c1572c'

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

    it('create with duplicate id returns 409', async function () {
      await assert.rejects(async () => db.create({ _id: id2 }), { name: 'ApiError' })
    })

    it('get by id', async function () {
      const doc = await db.get(id2)
      expect(doc.title).to.equal('second')
      expect(doc.arr[0].color).to.equal('blue')
    })

    it('get by missing id returns 404 error', async function () {
      await assert.rejects(async () => db.get('7c6f4426-f99f-4764-bebc-3b61c6710488'), { name: 'ApiError', message: 'document not found' })
    })

    xit('update missing id returns 404 error', async function () {
      await assert.rejects(async () => db.update('7c6f4426-f99f-4764-bebc-3b61c6710488'), { name: 'ApiError', message: 'document not found' })
    })

    it('delete missing id returns 404 error', async function () {
      await assert.rejects(async () => db.delete('7c6f4426-f99f-4764-bebc-3b61c6710488'), { name: 'ApiError', message: 'document not found' })
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
      const docs = await db.find({ _id: id2 })
      expect(docs.length).to.equal(1)
    })

    it('find using nested $exists', async function () {
      const docs = await db.find({ 'data.field': { $exists: true } })
      expect(docs.length).to.equal(1)
    })

    it('find matching array field', async function () {
      const docs = await db.find({ arr: { color: 'blue', num: 1337 }  })
      expect(docs.length).to.equal(1)
    })

    it('find matching deeper array field', async function () {
      const docs = await db.find({ 'data.nestedArr': 'abc' })
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

    it('project field', async function () {
      const docs = await db.find({ title: 'first' }, 0, 10, undefined, { data: 1 })
      expect(docs[0]).to.eql( {data: { field: '123' }, _id: docs[0]._id })
    })

    it('project field with get', async function () {
      const doc = await db.get(id, { data: 1 })
      expect(doc).to.eql( {data: { field: '123' }, _id: doc._id })
    })

    it('project object field within array', async function () {
      const docs = await db.find({ title: 'second' }, 0, 10, undefined, { 'arr.color': 1 })
      expect(docs[0]).to.eql( {arr: [ { color: 'blue' }], _id: docs[0]._id })
    })

    it('project object field within nested arrays', async function () {
      const docs = await db.find({ title: 'first' }, 0, 10, undefined, { 'arr.subarray.v': 1 })
      expect(docs[0]).to.eql( {arr: [ { subarray: [{ v: 'abc' }] }], _id: docs[0]._id })
    })

    it('project deep field', async function () {
      const docs = await db.find({ title: 'first' }, 0, 10, undefined, { 'data.field': 1 })
      expect(docs[0]).to.eql( {data: { field: '123' }, _id: docs[0]._id })
    })

    it('project field exclude id', async function () {
      const docs = await db.find({ title: 'first' }, 0, 10, undefined, { data: 1, _id: 0 })
      expect(docs[0]).to.eql( {data: { field: '123' } })
    })

    it('project exclude field', async function () {
      const docs = await db.find({ title: 'first' }, 0, 10, undefined, { data: 0, arr: 0 })
      expect(docs[0]).to.eql( { title: 'first', _id: docs[0]._id })
    })

    it('update with id', async function () {
      const doc = await db.update(id2, { title: 'second-updated', data: { more: true } })
      expect(doc._id).to.equal(id2)
    })

    if (collection === 'postgrestest') {
      it('use pool to do query', async function () {
        const res = await api.util.pgpool.query('SELECT $1::text as message', ['Hello world!'])
        expect(res.rows[0].message).to.equal('Hello world!')
      })
    }

    after(async function () {
      await db.delete(id2)
      await db.delete(id)
      await api.db.collection.delete(collection)
    })
  })
})
