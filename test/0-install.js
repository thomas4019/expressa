const request = require('supertest')
const chai = require('chai')
const expect = chai.expect
const testutils = require('./testutils')
const { app, api } = testutils

describe('install flow', function () {
  it('call install', async function () {
    await request(app)
      .post('/install')
      .send({
        modules: ['collections', 'core', 'logging', 'permissions'],
        settings: {
          core: {
            jwt_secret: 'testing 123',
            mongodb_uri: 'mongodb://localhost:27017/test',
            postgresql_uri: 'postgresql://localhost/pgtest',
          },
          permissions: {
            enforce_permissions: true
          }
        }
      })
      .expect(200)
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
