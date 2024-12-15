const request = require('supertest')
const chai = require('chai')
const expect = chai.expect

const testutils = require('./testutils')
const { app, api } = testutils

const validUser = {
  email: 'test@example.com',
  password: 'test123'
}
const badPasswordUser = {
  email: 'test@example.com',
  password: 'test2'
}
const invalidEmailUser = {
  email: 'test2@example.com',
  password: 'test'
}
describe('user functionality', function () {
  let validId, userToken

  it('can signup', async function () {
    const res = await request(app)
      .post('/users/register')
      .send(validUser)
      .expect(200)
    validId = res.body.id
  })

  it('can login', async function () {
    const res = await request(app)
      .post('/users/login')
      .send(validUser)
      .expect(200)
    expect(res.body.uid).to.equal(validId)
    userToken = res.body.token
  })

  it('rejects unknown email', async function () {
    await request(app)
      .post('/users/login')
      .send(invalidEmailUser)
      .expect({
        error: 'No users found with this email.'
      })
      .expect(400)
  })

  it('rejects invalid password', async function () {
    await request(app)
      .post('/users/login')
      .send(badPasswordUser)
      .expect({
        error: 'Incorrect password'
      })
      .expect(401)
  })

  it('rejects signup of duplicate email', async function () {
    await request(app)
      .post('/users/register')
      .send(validUser)
      .expect({
        error: 'This email is already registered.'
      })
      .expect(409)
  })

  it ('new token required after password change', async function () {

    validUser.password = '123test'

    await request(app)
      .post(`/users/${validId}/update`)
      .set('x-access-token', userToken)
      .send({ $set: { password: validUser.password } })
      .expect(200)

    const res = await request(app)
      .get('/users/me')
      .set('x-access-token', userToken)
      .expect(404)

    expect(res.body.error).to.exist
    expect(res.body.tokenError).to.equal('expired token')

    const res2 = await request(app)
      .post('/users/login')
      .send(validUser)
      .expect(200)

    expect(res2.body.uid).to.equal(validId)
    userToken = res2.body.token

    const res3 = await request(app)
      .get('/users/me')
      .set('x-access-token', userToken)
      .expect(200)

    expect(res3.body.error).to.not.exist
    expect(res3.body.tokenError).to.not.exist
  })

  let user
  it('get my user', async function () {
    const token = await testutils.getUserWithPermissions(api, 'users: view own')
    const res = await request(app)
      .get('/users/me')
      .set('x-access-token', token)
    expect(res.body.email).to.include('@example.com')

    const res2 = await request(app)
      .get('/users/' + res.body._id)
      .set('x-access-token', token)
    expect(res2.body.email).to.include('@example.com')
    expect(res2.body.password).to.be.undefined

    user = res.body
  })

  it('sees password hash with permission', async function () {
    const token = await testutils.getUserWithPermissions(api, ['users: view', 'users: view hashed passwords'])

    const res = await request(app)
      .get('/users/' + user._id)
      .set('x-access-token', token)
    expect(res.body.email).to.include('@example.com')
    expect(res.body.password).to.not.be.undefined
  })

  it('cannot change role by default', async function () {
    const token = await testutils.getUserWithPermissions(api, ['users: view', 'users: edit'])
    delete user.collection
    await request(app)
      .put(`/users/${user._id}`)
      .set('x-access-token', token)
      .send(Object.assign({}, user, { password: 'test', roles: ['Admin'] }))
      .expect(200)

    await request(app)
      .post(`/users/${user._id}/update`)
      .set('x-access-token', token)
      .send({ $set: { roles: ['Admin'] } })
      .expect(200)

    const res2 = await request(app)
      .get(`/users/${user._id}`)
      .set('x-access-token', token)
    expect(res2.body.roles).to.not.include('Admin')
  })

  it('can change role with correct permission', async function () {
    const token = await testutils.getUserWithPermissions(api, ['users: view', 'users: edit', 'users: modify roles'])
    await request(app)
      .post(`/users/${user._id}/update`)
      .set('x-access-token', token)
      .send({ $set: { roles: ['Admin'] } })
      .expect(200)

    const res2 = await request(app)
      .get(`/users/${user._id}`)
      .set('x-access-token', token)
    expect(res2.body.roles).to.include('Admin')
  })

  it('adding a role modifies user schema', async function () {
    const token = await testutils.getUserWithPermissions(api, ['role: create', 'role: delete', 'schemas: view'])
    await request(app)
      .post('/role')
      .set('x-access-token', token)
      .send({ _id: 'testrole', permissions: {} })
      .expect(200)

    const res2 = await request(app)
      .get('/users/schema')
      .set('x-access-token', token)
      .expect(200)
    expect(res2.body.properties.roles.items.enum).to.include('testrole')

    await request(app)
      .delete('/role/testrole')
      .set('x-access-token', token)
      .expect(200)

    const res3 = await request(app)
      .get('/users/schema')
      .set('x-access-token', token)
      .expect(200)
    expect(res3.body.properties.roles.items.enum).to.not.include('testrole')
  })

  it('cannot change owner by default', async function () {
    const token = await testutils.getUserWithPermissions(api, ['users: view', 'users: edit'])

    const res = await request(app)
      .get('/users/me')
      .set('x-access-token', token)
    const newUser = res.body

    await request(app)
      .post(`/users/${newUser._id}/update`)
      .set('x-access-token', token)
      .send({ $set: { 'meta.owner': user._id } }) // try change owner to another user
      .expect(200) // will succeed but owner will not change

    const res2 = await request(app)
      .get(`/users/${newUser._id}`)
      .set('x-access-token', token)
    expect(res2.body.meta.owner).to.not.equal(user._id)
    expect(res2.body.meta.owner).to.equal(newUser._id)

  })

  it('can change owner with correct permission', async function () {
    const token = await testutils.getUserWithPermissions(api, ['users: view', 'users: edit', 'users: modify owner'])

    const res = await request(app)
      .get('/users/me')
      .set('x-access-token', token)
    const newUser = res.body

    await request(app)
      .post(`/users/${newUser._id}/update`)
      .set('x-access-token', token)
      .send({ $set: { 'meta.owner': user._id } }) // try change owner to another user
      .expect(200)

    const res2 = await request(app)
      .get(`/users/${newUser._id}`)
      .set('x-access-token', token)
    expect(res2.body.meta.owner).to.equal(user._id)
  })

  it('cannot change owner with a PUT by default', async function () {
    const token = await testutils.getUserWithPermissions(api, ['users: view', 'users: edit', 'users: view hashed passwords'])

    const res = await request(app)
      .get('/users/me')
      .set('x-access-token', token)
    const newUser = JSON.parse(JSON.stringify(res.body))

    res.body.meta.owner = user._id
    await request(app)
      .put(`/users/${newUser._id}`)
      .set('x-access-token', token)
      .send(res.body)
      .expect(200)

    const res2 = await request(app)
      .get(`/users/${newUser._id}`)
      .set('x-access-token', token)
    expect(res2.body.meta.owner).to.not.equal(user._id)
    expect(res2.body.meta.owner).to.equal(newUser._id)

  })

  it('can change owner with a PUT with correct permission', async function () {
    const token = await testutils.getUserWithPermissions(api, ['users: view', 'users: edit', 'users: view hashed passwords', 'users: modify owner'])

    const res = await request(app)
      .get('/users/me')
      .set('x-access-token', token)
    const newUser = JSON.parse(JSON.stringify(res.body))

    res.body.meta.owner = user._id
    await request(app)
      .put(`/users/${newUser._id}`)
      .set('x-access-token', token)
      .send(res.body) // try change owner to another user
      .expect(200)

    const res2 = await request(app)
      .get(`/users/${newUser._id}`)
      .set('x-access-token', token)
    expect(res2.body.meta.owner).to.equal(user._id)
  })

  it('changing to bogus owner fails', async function () {
    const token = await testutils.getUserWithPermissions(api, ['users: view', 'users: edit', 'users: modify owner'])

    const res = await request(app)
      .get('/users/me')
      .set('x-access-token', token)
    const newUser = res.body

    await request(app)
      .post(`/users/${newUser._id}/update`)
      .set('x-access-token', token)
      .send({ $set: { 'meta.owner': 'owner-that-doesnt-exist' } }) // try change owner to another user
      .expect(417)
  })

  it('cannot set owner on creation by default', async function () {
    const token = await testutils.getUserWithPermissions(api, ['users: view', 'users: edit', 'testdoc: create', 'testdoc: view own'])

    const res = await request(app)
      .get('/users/me')
      .set('x-access-token', token)
    const newUser = res.body

    const doc = {
      title: 'Test Title',
      meta: {
        owner: user._id,
        owner_collection: 'users',
      }
    }

    const res2 = await request(app)
      .post('/testdoc')
      .set('x-access-token', token)
      .send(doc)
      .expect(200) // will succeed but owner will not change
    doc._id = res2.body.id

    const res3 = await request(app)
      .get(`/testdoc/${doc._id}`)
      .set('x-access-token', token)
      .expect(200)
    expect(res3.body.meta.owner).to.not.equal(user._id)
    expect(res3.body.meta.owner).to.equal(newUser._id)
  })

  it('can set owner on creation with correct permission', async function () {
    const token = await testutils.getUserWithPermissions(api, ['users: view', 'users: edit', 'testdoc: create', 'testdoc: view', 'testdoc: modify owner'])

    const res = await request(app)
      .get('/users/me')
      .set('x-access-token', token)
    const newUser = res.body

    const doc = {
      title: 'Test Title',
      meta: {
        owner: user._id,
        owner_collection: 'users',
      }
    }

    const res2 = await request(app)
      .post('/testdoc')
      .set('x-access-token', token)
      .send(doc)
      .expect(200) // will succeed but owner will not change
    doc._id = res2.body.id

    const res3 = await request(app)
      .get(`/testdoc/${doc._id}`)
      .set('x-access-token', token)
      .expect(200)
    expect(res3.body.meta.owner).to.not.equal(newUser._id)
    expect(res3.body.meta.owner).to.equal(user._id)
  })

  it('cannot set owner with a PUT on creation by default', async function () {
    const token = await testutils.getUserWithPermissions(api, ['users: view', 'users: edit', 'testdoc: edit', 'testdoc: view own'])

    const res = await request(app)
      .get('/users/me')
      .set('x-access-token', token)
    const newUser = res.body

    const doc = {
      title: 'Test Title',
      meta: {
        owner: user._id,
        owner_collection: 'users',
      }
    }

    const docId = testutils.generateDocumentId()

    const res2 = await request(app)
      .put(`/testdoc/${docId}`)
      .set('x-access-token', token)
      .send(doc)
      .expect(200) // will succeed but owner will not change

    expect(res2.body.id).to.equal(docId)
    doc._id = docId

    const res3 = await request(app)
      .get(`/testdoc/${doc._id}`)
      .set('x-access-token', token)
      .expect(200)
    expect(res3.body.meta.owner).to.not.equal(user._id)
    expect(res3.body.meta.owner).to.equal(newUser._id)
  })

  it('can set owner with a PUT on creation with correct permission', async function () {
    const token = await testutils.getUserWithPermissions(api, ['users: view', 'users: edit', 'testdoc: edit', 'testdoc: view', 'testdoc: modify owner'])

    const res = await request(app)
      .get('/users/me')
      .set('x-access-token', token)
    const newUser = res.body

    const doc = {
      title: 'Test Title',
      meta: {
        owner: user._id,
        owner_collection: 'users',
      }
    }

    const docId = testutils.generateDocumentId()

    const res2 = await request(app)
      .put(`/testdoc/${docId}`)
      .set('x-access-token', token)
      .send(doc)
      .expect(200) // will succeed but owner will not change

    expect(res2.body.id).to.equal(docId)
    doc._id = docId

    const res3 = await request(app)
      .get(`/testdoc/${doc._id}`)
      .set('x-access-token', token)
      .expect(200)
    expect(res3.body.meta.owner).to.not.equal(newUser._id)
    expect(res3.body.meta.owner).to.equal(user._id)
  })
})
