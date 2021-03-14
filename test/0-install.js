const request = require('supertest')
const chai = require('chai')
const expect = chai.expect
const testutils = require('./testutils')
const { app, api } = testutils

describe('install flow', function () {
  it('can get settings schema', async function() {
    const { body } = await request(app)
      .get('/install/settings/schema')
      .expect(200)
    expect(body.schema.properties.jwt_secret).to.eql({
      type: 'string',
      description: 'The secret key used to encode your json web tokens. It\'s important this is kept unique and secret.'
    })
  })

  it('call install', async function () {
    expect(api.db.collections).to.not.exist

    await request(app)
      .post('/install')
      .send({
        modules: ['collections', 'core', 'logging', 'permissions'],
        settings: {
          jwt_secret: 'testing 123',
          mongodb_uri: 'mongodb://localhost:27017/test',
          postgresql_uri: 'postgresql://postgres:expressa@localhost/pgtest',
          enforce_permissions: true,
          user_storage: 'mongo'
        }
      })
      .expect(200)

    expect(api.db.collection).to.exist
    expect(api.db.role).to.exist
    expect(api.db.users).to.exist
    expect(api.settings.jwt_secret.length).to.be.greaterThan(20)

    // Check storage of users set correctly and then restore to 'file'
    const userCollection = (await api.db.collection.find({ _id: 'users' }))[0]
    expect(userCollection.storage).to.eql('mongo')
    userCollection.storage = 'file'
    await api.db.collection.update(null, userCollection)
    api.setupCollectionDb(userCollection)

    const userCollection2 = (await api.db.collection.find({ _id: 'users' }))[0]
    expect(userCollection2.storage).to.eql('file')
  })

  it('can create admin account', async function() {
    const res = await request(app)
      .post('/users/register')
      .send({
        email: 'a@example.com',
        roles: ['Admin'],
        password: '123'
      })
      .expect(200)
    const id = res.body.id
    const u = await api.db.users.get(id)
    expect(u.roles || []).to.include('Admin')
  })

  it('2nd account cannot be admin account', async function() {
    await request(app)
      .post('/users/register')
      .send({
        email: 'try2@example.com',
        roles: ['Admin'],
        password: 'admin2'
      })
      .expect(400)
  })

  it('admin should have many permissions set', async function () {
    const admin = await api.db.role.get('Admin')
    expect(admin.permissions).deep.include({
      'view errors': 1,
      'collection: create': 1,
      'users: edit own': 1
    })
  })
})
