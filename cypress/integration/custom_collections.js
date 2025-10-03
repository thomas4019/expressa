import { randomId } from '../support/util'

// TODO: remove error from JSONSchemaEditor so that this isn't necessary
Cypress.on('uncaught:exception', (err, runnable) => {
  // returning false here prevents Cypress from
  // failing the test
  return false
})

describe('Custom Collections', function() {
  it('Supports creating new collections', function() {
    cy.login()
    cy.visit('/')
    cy.get('.hamburger-container').click();
    cy.wait(100)
    cy.get('span').contains('Data').click();
    cy.wait(1000)
    cy.get('.is-opened span').contains('Collection').click();

    cy.get('.btn-primary').contains('Add').click();
    let id = `coll-${randomId()}`;
    cy.fillValue('_id', id)

    cy.wait(100)
    cy.get('button').contains('Add another field').click();
    cy.wait(100)
    cy.get('input[name="field"]').type('field_1')

    cy.get('.btn-primary').click();
  })
})