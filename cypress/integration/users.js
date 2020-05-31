import { randomId } from '../support/util'

describe('User Management', function() {
  it('Lists users', function() {
    cy.server()
    cy.route('/api/users/schema').as('userschema')
    cy.route('/api/collection/users').as('users')
    cy.login()
    cy.visit('/')

    // cy.visit('#/users/list')
    cy.get('.hamburger-container').click();
    cy.wait(100)
    cy.get('span').contains('People').click();
    cy.get('span').contains('Users').click();
    cy.wait('@users')
    // cy.get('a').contains('a@example.com').click();


    cy.get('table tr:last-child td:first-child').click();
    // cy.visit()
    cy.wait('@userschema')
    cy.get('input[name="root[email]"]').should('have.value', 'a@example.com')
    // cy.get('a[href="#/users/list"]').click()
    // cy.get('form').submit()
  })

  it('Can create a user', function () {
    cy.server()
    cy.route('/api/users/schema').as('userschema')
    cy.route('/api/collection/users').as('users')
    cy.login()
    cy.visit('/')

    cy.get('.hamburger-container').click();
    cy.get('span').contains('People').click();
    cy.wait(100)
    cy.get('span').contains('Add').click();
    let id = randomId();
    cy.get('input[name="root[email]"]').type(`${id}@example.com`)
    cy.get('input[name="root[password]"]').type('expressa')
    cy.get('.btn-primary').click()
    cy.wait('@users')
    cy.get('div').should('contain', 'a@example.com')
  })
})
