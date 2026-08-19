const chai = require('chai')
const expect = chai.expect
const { spawnSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const util = require('../util')
const testutils = require('./testutils')
const { api } = testutils

// These cover the seams that make the storage drivers optional peer
// dependencies. None of them are reachable from the normal request-level
// tests, and two of them are consumer-facing API that expressa itself never
// calls - so a regression here passes the rest of the suite unnoticed.
describe('module loading', function () {
  // util.js re-exports these from ./auth at module scope, by value. There is a
  // require cycle (util -> auth/index -> auth/jwt -> util), so if auth enters
  // the cycle first, auth/index is only half-evaluated when util reads it and
  // these silently become undefined. Expressa never calls them itself - it uses
  // auth.doLogin directly - so nothing else in this suite would notice.
  describe('auth helpers re-exported by util', function () {
    const helpers = ['doLogin', 'createHash', 'isHashed']

    helpers.forEach(function (name) {
      it(`exports ${name} as a function`, function () {
        expect(util[name], `util.${name}`).to.be.a('function')
      })

      it(`exposes ${name} on router.util`, function () {
        expect(api.util[name], `router.util.${name}`).to.be.a('function')
      })
    })

    it('re-exports the same function identity as auth', function () {
      const auth = require('../auth/index')
      helpers.forEach(function (name) {
        expect(util[name], name).to.equal(auth[name])
      })
    })
  })

  // dbTypes is public API (router.dbTypes) and is now backed by lazy getters
  // rather than a plain object of eagerly required modules. These pin the
  // behaviour that has to survive that change.
  describe('dbTypes', function () {
    it('enumerates every storage type, including the mongodb alias', function () {
      expect(Object.keys(api.dbTypes)).to.have.members([
        'cached', 'file', 'memory', 'postgres', 'mongo', 'mongodb'
      ])
    })

    it('spreads and supports `in` like a plain object', function () {
      expect(Object.keys({ ...api.dbTypes })).to.have.members(Object.keys(api.dbTypes))
      expect('mongo' in api.dbTypes).to.equal(true)
      expect('doesnotexist' in api.dbTypes).to.equal(false)
    })

    it('resolves the mongodb alias to the same adapter as mongo', function () {
      expect(api.dbTypes.mongodb).to.equal(api.dbTypes.mongo)
    })

    it('returns undefined for an unknown storage type', function () {
      expect(api.dbTypes.doesnotexist).to.equal(undefined)
    })

    it('returns the same adapter on repeated access', function () {
      expect(api.dbTypes.memory).to.equal(api.dbTypes.memory)
    })
  })

  // The actual promise of the optional peer dependencies: requiring expressa
  // must not pull in a driver for a backend the app does not use. Checked in a
  // child process because the db suites in this same mocha run load both
  // drivers, which would poison require.cache here.
  describe('storage drivers are not loaded eagerly', function () {
    it('loads neither pg nor mongodb for a file-storage config', function () {
      this.timeout(30000)

      const storagePath = fs.mkdtempSync(path.join(os.tmpdir(), 'expressa-lazy-'))
      const script = `
        const path = require('path')
        require(${JSON.stringify(path.join(__dirname, '..', 'index.js'))})
          .api({ file_storage_path: ${JSON.stringify(storagePath)} })
        setTimeout(function () {
          const loaded = function (mod) {
            const needle = path.sep + 'node_modules' + path.sep + mod + path.sep
            return Object.keys(require.cache).some(function (p) { return p.includes(needle) })
          }
          process.stdout.write(
            '<<RESULT>>' + JSON.stringify({ pg: loaded('pg'), mongodb: loaded('mongodb') })
          )
          process.exit(0)
        }, 2000)
      `

      const res = spawnSync(process.execPath, ['-e', script], {
        cwd: path.join(__dirname, '..'),
        encoding: 'utf8'
      })
      fs.rmSync(storagePath, { recursive: true, force: true })

      expect(res.status, `child exited ${res.status}: ${res.stderr}`).to.equal(0)
      // expressa logs a startup banner to stdout, so read only our marker
      const marker = res.stdout.split('<<RESULT>>')[1]
      expect(marker, `no result in child stdout: ${res.stdout}`).to.be.a('string')
      const loaded = JSON.parse(marker)
      expect(loaded.pg, 'pg was loaded on boot').to.equal(false)
      expect(loaded.mongodb, 'mongodb was loaded on boot').to.equal(false)
    })
  })
})
