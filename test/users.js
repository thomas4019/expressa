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
  let validId

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
})
