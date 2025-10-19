// Configure Cypress v10+ while preserving legacy folder structure
// https://docs.cypress.io/guides/references/configuration

const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    // Keep using the legacy integration tests directory
    specPattern: 'cypress/integration/**/*.js',
    supportFile: 'cypress/support/index.js',
    baseUrl: 'http://localhost:3001/admin',
    setupNodeEvents(on, config) {
      // no plugins yet
      return config
    }
  },
  video: false
})
