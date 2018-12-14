var chai = require('chai')
var expect = chai.expect
var expressa = require('../')
var api = expressa.api({
  'file_storage_path': 'testdata'
})

// const collectionNames = ['memorytest']
const collectionNames = ['memorytest', 'mongotest', 'pgtest']

collectionNames.forEach(function (collection) {
  describe(`${collection} basic functionality`, function () {
    let db

    before(function () {
      db = api.db[collection]
    })

    it('create without id', async function () {
      const id = await db.create({ title: 'first' })
      expect(id.length).to.be.greaterThan(8)
      await db.delete(id)
    })

    it('create with id', async function () {
      const id = await db.create({ _id: '5bfd9a1311771c805d161498', title: 'second' })
      expect(id).to.equal('5bfd9a1311771c805d161498')
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
