describe('My First Test', function() {
  it('Does not do much!', function() {
    cy.visit('/')
    cy.get('input[name="root[email]"]').type('test@example.com')
    cy.get('input[name="root[password]"]').type('expressa')
    cy.get('.btn-primary').click()
    cy.contains('Welcome: a@example.com')
  })
})