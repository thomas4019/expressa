var chai = require('chai')
var expect = chai.expect
var expressa = require('../')
var api = expressa.api({
  'file_storage_path': 'testdata'
})

const collectionNames = ['memorytest']
// const collectionNames = ['memorytest' 'mongotest', 'pgtest']

collectionNames.forEach(function (collection) {
  describe(`${collection} basic functionality`, function () {
    let db

    before(function () {
      db = api.db[collection]
    })

    it('create without id', function (done) {
      db.create({ title: 'first' })
        .then(function (id) {
          expect(id.length).to.be.greaterThan(8)
          db.delete(id)
            .then(() => done())
        })
    })

    it('create with id', function (done) {
      db.create({ _id: '5bfd9a1311771c805d161498', title: 'second' })
        .then(function (id) {
          expect(id).to.equal('5bfd9a1311771c805d161498')
          done()
        })
    })

    it('find by id', function (done) {
      db.find({ _id: '5bfd9a1311771c805d161498' })
        .then(function (docs) {
          expect(docs.length).to.equal(1)
          done()
        })
    })

    it('find by id', function (done) {
      db.find({ title: 'second' })
        .then(function (docs) {
          expect(docs.length).to.equal(1)
          done()
        })
    })

    it('not find with mising title', function (done) {
      db.find({ title: 'invalid' })
        .then(function (docs) {
          expect(docs.length).to.equal(0)
          done()
        })
    })

    xit('update with id', function (done) {
      db.update('5bfd9a1311771c805d161498', { title: 'second-updated', data: { more: true } })
        .then(function (doc) {
          expect(doc._id).to.equal('5bfd9a1311771c805d161498')
            .then(() => done())
        })
    })

    after(function (done) {
      db.delete('5bfd9a1311771c805d161498')
        .then(() => done())
    })
  })
})
