describe('Install', function() {
  it('Creates a user', function() {
    cy.visit('/')
    cy.get('input[name="root[email]"]').type('test@example.com')
    cy.get('input[name="root[password]"]').type('expressa')
    cy.get('.btn-primary').click()
    cy.contains('Welcome: test@example.com')
  })
})