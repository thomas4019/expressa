const request = require('supertest')
const chai = require('chai')
const expect = chai.expect
const testutils = require('./testutils')
const { app, api } = testutils

/**
 * Verify pagination
 * Note: these tests are not for verifying db implemementations, see db.js
 */
describe('querying collections', function () {
  it('create doc 1', async function () {
    const token = await testutils.getUserWithPermissions(api, 'testdoc: create')
    await request(app)
      .post('/testdoc')
      .set('x-access-token', token)
      .send({
        _id: 'test1',
        title: 'doc1',
        arr: ['testing'],
        data: {
          number: 0,
          field: 'test111'
        }
      })
      .expect(200)
  })

  it('create doc 2', async function () {
    const token = await testutils.getUserWithPermissions(api, 'testdoc: create')
    await request(app)
      .post('/testdoc')
      .set('x-access-token', token)
      .send({
        title: 'doc2',
        data: {
          number: -3
        }
      })
      .expect(200)
  })

  it('create doc 3', async function () {
    const token = await testutils.getUserWithPermissions(api, 'testdoc: create')
    await request(app)
      .post('/testdoc')
      .set('x-access-token', token)
      .send({
        _id: 'testid123',
        title: 'doc3',
        data: {
          number: 25,
          field: 'test'
        }
      })
      .expect(200)
  })

  it('create doc 4', async function () {
    const token = await testutils.getUserWithPermissions(api, 'testdoc: create')
    await request(app)
      .post('/testdoc')
      .set('x-access-token', token)
      .send({
        _id: 'testid1234',
        title: 'doc4',
        data: {
          number: 2,
        }
      })
      .expect(200)
  })


  let token

  it('read doc by id', async function () {
    token = await testutils.getUserWithPermissions(api, 'testdoc: view')
    const res = await request(app)
      .get('/testdoc/testid123')
      .set('x-access-token', token)
      .expect(200)
    expect(res.body.title).to.equal('doc3')
  })

  it('read doc by missing id returns 404', async function () {
    const res = await request(app)
      .get('/testdoc/missingdoc')
      .set('x-access-token', token)
      .expect(404)
    expect(res.body.error).to.equal('document not found')
  })

  it('read entire collection', async function () {
    const res = await request(app)
      .get('/testdoc')
      .set('x-access-token', token)
      .expect(200)
    expect(res.body).to.have.lengthOf(4)
  })

  it('return docs matching deep field', async function () {
    const res = await request(app)
      .get('/testdoc?query={"data.field":"test"}')
      .set('x-access-token', token)
      .expect(200)
    expect(res.body[0].title).to.equal('doc3')
    expect(res.body).to.have.lengthOf(1)
  })

  it('return docs matching array field', async function () {
    const res = await request(app)
      .get('/testdoc?query={"arr": "testing"}')
      .set('x-access-token', token)
      .expect(200)
    expect(res.body[0].title).to.equal('doc1')
    expect(res.body).to.have.lengthOf(1)
  })

  it('errors without permission', async function () {
    await request(app)
      .get('/testdoc')
      .expect(401)
  })

  it('page 0 returns an error', async function () {
    await request(app)
      .get('/testdoc?limit=2&page=0')
      .set('x-access-token', token)
      .expect(400)
  })

  it('returns page 1 correctly', async function () {
    const res = await request(app)
      .get('/testdoc?limit=2&page=1')
      .set('x-access-token', token)
      .expect(200)
    expect(res.body.itemsTotal).to.equal(4)
    expect(res.body.itemsPerPage).to.equal(2)
    expect(res.body.pages).to.equal(2)
    expect(res.body.pagePrev).to.equal(undefined)
    expect(res.body.pageNext).to.equal(2)
    expect(res.body.data).to.have.lengthOf(2)

    expect(res.body.data[0].title).to.equal('doc1')
    expect(res.body.data[1].title).to.equal('doc2')
  })

  it('returns page 2 correctly', async function () {
    const res = await request(app)
      .get('/testdoc?limit=2&page=2')
      .set('x-access-token', token)
      .expect(200)
    expect(res.body.itemsTotal).to.equal(4)
    expect(res.body.itemsPerPage).to.equal(2)
    expect(res.body.pages).to.equal(2)
    expect(res.body.pagePrev).to.equal(1)
    expect(res.body.pageNext).to.equal(undefined)
    expect(res.body.data).to.have.lengthOf(2)

    expect(res.body.data[0].title).to.equal('doc3')
    expect(res.body.data[1].title).to.equal('doc4')
  })

  it('pagemetadisable url parameter strips additional page detail', async function () {
    const res = await request(app)
      .get('/testdoc?limit=2&page=2&pagemetadisable=1')
      .set('x-access-token', token)
      .expect(200)
    expect(res.body.itemsTotal).to.equal(undefined)
    expect(res.body.itemsPerPage).to.equal(2)
    expect(res.body.pages).to.equal(undefined)
    expect(res.body.pagePrev).to.equal(1)
    expect(res.body.pageNext).to.equal(undefined)
    expect(res.body.data).to.have.lengthOf(2)

    expect(res.body.data[0].title).to.equal('doc3')
    expect(res.body.data[1].title).to.equal('doc4')
  })

  it('page 3 is empty', async function () {
    const res = await request(app)
      .get('/testdoc?limit=2&page=3')
      .set('x-access-token', token)
      .expect(200)
    expect(res.body.itemsTotal).to.equal(4)
    expect(res.body.itemsPerPage).to.equal(2)
    expect(res.body.pages).to.equal(2)
    expect(res.body.pagePrev).to.equal(2)
    expect(res.body.pageNext).to.equal(undefined)
    expect(res.body.data).to.have.lengthOf(0)
  })

  it('page 4 is empty', async function () {
    const res = await request(app)
      .get('/testdoc?limit=2&page=3')
      .set('x-access-token', token)
      .expect(200)
    expect(res.body.itemsTotal).to.equal(4)
    expect(res.body.itemsPerPage).to.equal(2)
    expect(res.body.pages).to.equal(2)
    expect(res.body.pagePrev).to.equal(2)
    expect(res.body.pageNext).to.equal(undefined)
    expect(res.body.data).to.have.lengthOf(0)
  })

  it('pagination works with query', async function () {
    const res = await request(app)
      .get('/testdoc?query={"data.number":2}&limit=2&page=1')
      .set('x-access-token', token)
      .expect(200)
    expect(res.body.itemsTotal).to.equal(1)
    expect(res.body.itemsPerPage).to.equal(2)
    expect(res.body.pages).to.equal(1)
    expect(res.body.pagePrev).to.equal(undefined)
    expect(res.body.pageNext).to.equal(undefined)
    expect(res.body.data).to.have.lengthOf(1)
    expect(res.body.data[0].title).to.equal('doc4')
  })

  it('sort by deep field ascending', async function () {
    const token = await testutils.getUserWithPermissions(api, 'testdoc: view')
    const res = await request(app)
      .get('/testdoc?orderby={"data.number":1}')
      .set('x-access-token', token)
      .expect(200)
    expect(res.body).to.have.lengthOf(4)
    expect(res.body[0].title).to.equal('doc2') // -2
    expect(res.body[1].title).to.equal('doc1') // 0
    expect(res.body[2].title).to.equal('doc4') // 2
    expect(res.body[3].title).to.equal('doc3') // 25
  })

  it('sort by deep field descending', async function () {
    const token = await testutils.getUserWithPermissions(api, 'testdoc: view')
    const res = await request(app)
      .get('/testdoc?orderby={"meta.created":-1}')
      .set('x-access-token', token)
      .expect(200)
    expect(res.body).to.have.lengthOf(4)
    expect(res.body[0].title).to.equal('doc4')
    expect(res.body[1].title).to.equal('doc3')
    expect(res.body[2].title).to.equal('doc2')
    expect(res.body[3].title).to.equal('doc1')
  })

  it('project a specific field', async function () {
    const token = await testutils.getUserWithPermissions(api, 'testdoc: view')
    const res = await request(app)
      .get('/testdoc?fields={"title":1}')
      .set('x-access-token', token)
      .expect(200)
    expect(res.body).to.have.lengthOf(4)
    expect(res.body[0].title.substring(0, 3)).to.equal('doc')
    expect(res.body[0].data).to.be.undefined
  })

  it('project a specific field on get', async function () {
    const token = await testutils.getUserWithPermissions(api, 'testdoc: view')
    const res = await request(app)
      .get('/testdoc/test1?fields={"title":1}')
      .set('x-access-token', token)
      .expect(200)
    expect(res.body.title).to.equal('doc1')
    expect(res.body.data).to.be.undefined
  })

  it('project deep fields', async function() {
    const token = await testutils.getUserWithPermissions(api, 'testdoc: view')
    const res = await request(app)
      .get('/testdoc?fields={"data":1}')
      .set('x-access-token', token)
      .expect(200)
    expect(res.body).to.have.lengthOf(4)
    expect(res.body[0].title).to.be.undefined
    expect(res.body[0].data.number).to.not.be.undefined
    expect(res.body[0].data.field).to.not.be.undefined

    const res2 = await request(app)
      .get('/testdoc?fields={"data.number":1}')
      .set('x-access-token', token)
      .expect(200)
    expect(res2.body).to.have.lengthOf(4)
    expect(res2.body[0].title).to.be.undefined
    expect(res2.body[0].data.number).to.not.be.undefined
    expect(res2.body[0].data.field).to.be.undefined
  })
  describe('code execution operators', function () {
    // The query parameter is parsed as JSON and handed to the query engine.
    // $where and $function compile into executable JavaScript; $expr can
    // reference any field. They are rejected before the query runs.
    // See GHSA-vx6m-5p2v-fcvg.
    let viewToken

    before(async function () {
      viewToken = await testutils.getUserWithPermissions(api, 'testdoc: view')
    })

    it('rejects $where at the top level', async function () {
      const res = await request(app)
        .get('/testdoc?query={"$where":"1 === 1"}')
        .set('x-access-token', viewToken)
        .expect(400)
      expect(res.body.error).to.contain('$where')
    })

    it('rejects $function at the top level', async function () {
      await request(app)
        .get('/testdoc?query={"$function":{"body":"function () { return true }","args":[],"lang":"js"}}')
        .set('x-access-token', viewToken)
        .expect(400)
    })

    it('rejects $expr at the top level', async function () {
      const res = await request(app)
        .get('/testdoc?query={"$expr":{"$eq":["$title","doc1"]}}')
        .set('x-access-token', viewToken)
        .expect(400)
      expect(res.body.error).to.contain('$expr')
    })

    it('rejects $expr nested inside $or', async function () {
      await request(app)
        .get('/testdoc?query={"$or":[{"title":"doc1"},{"$expr":{"$gt":["$data.number",0]}}]}')
        .set('x-access-token', viewToken)
        .expect(400)
    })

    it('rejects $where nested inside $or', async function () {
      await request(app)
        .get('/testdoc?query={"$or":[{"title":"doc1"},{"$where":"1 === 1"}]}')
        .set('x-access-token', viewToken)
        .expect(400)
    })

    it('rejects $where nested inside $and', async function () {
      await request(app)
        .get('/testdoc?query={"$and":[{"$where":"1 === 1"}]}')
        .set('x-access-token', viewToken)
        .expect(400)
    })

    it('rejects $where nested inside $elemMatch', async function () {
      await request(app)
        .get('/testdoc?query={"arr":{"$elemMatch":{"$where":"1 === 1"}}}')
        .set('x-access-token', viewToken)
        .expect(400)
    })

    it('rejects $where before permissions are checked', async function () {
      // The query runs inside find(), before the per-document permission
      // listener fires, so an unauthorized request must be rejected on the
      // operator rather than only on the eventual 401.
      await request(app)
        .get('/testdoc?query={"$where":"1 === 1"}')
        .expect(400)
    })

    it('still allows the ordinary operators', async function () {
      const res = await request(app)
        .get('/testdoc?query={"$or":[{"data.number":{"$in":[25,2]}},{"title":{"$regex":"^doc1$"}}]}')
        .set('x-access-token', viewToken)
        .expect(200)
      expect(res.body).to.have.lengthOf(3)
    })

    it('still allows a field whose value merely contains the operator name', async function () {
      const res = await request(app)
        .get('/testdoc?query={"title":"$where"}')
        .set('x-access-token', viewToken)
        .expect(200)
      expect(res.body).to.have.lengthOf(0)
    })

    it('allows $where when allow_where_in_api is enabled', async function () {
      api.settings.allow_where_in_api = true
      try {
        const res = await request(app)
          .get('/testdoc?query={"$where":"this.title === \'doc1\'"}')
          .set('x-access-token', viewToken)
          .expect(200)
        expect(res.body).to.have.lengthOf(1)
      } finally {
        delete api.settings.allow_where_in_api
      }
    })
  })
})
