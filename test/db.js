const assert = require('assert')
const chai = require('chai')
const expect = chai.expect
const expressa = require('../')
const api = expressa.api({
  'file_storage_path': 'testdata'
})

const collectionNames = ['memorytest', 'filetest']
// const collectionNames = ['filetest', 'memorytest', 'mongotest', 'pgtest']

collectionNames.forEach(function (collection) {
  describe(`${collection} basic functionality`, function () {
    let db

    before(function () {
      db = api.db[collection]
    })

    it('create without id', async function () {
      const id = await db.create({ title: 'first' })
      expect(id.length).to.be.greaterThan(6)
      await db.delete(id)
    })

    it('create with id', async function () {
      const id = await db.create({ _id: '5bfd9a1311771c805d161498', title: 'second' })
      expect(id).to.equal('5bfd9a1311771c805d161498')
    })

    xit('create with duplicate id returns 409', async function () {
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

    it('find by id', async function () {
      const docs = await db.find({ _id: '5bfd9a1311771c805d161498' })
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
    })
  })
})
