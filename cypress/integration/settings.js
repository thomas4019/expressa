describe('Settings', function() {
  it('Can turn off enforce permissions', function() {
    cy.request({ url: 'http://localhost:3001/api/role/Admin', failOnStatusCode: false })
    .then((response) => {
      expect(response.status).to.equal(401)
    });

    cy.login()
    cy.visit('/')

    cy.wait(250)
    cy.get('a').contains('(edit settings)').click()
    cy.wait(1500)

    cy.get('[name="root[enforce_permissions]"]').uncheck()
    cy.get('button.btn-primary').click()
  })

  it('Changed settings should take affect', function() {
    cy.request({url: 'http://localhost:3001/api/role/Admin', failOnStatusCode: false})
  })

  it('Turn back on enforce permissions', function() {
    cy.login()
    cy.visit('/')

    cy.wait(250)
    cy.get('a').contains('(edit settings)').click()
    cy.wait(1500)

    cy.get('[name="root[enforce_permissions]"]').check()
    cy.get('button.btn-primary').click()
  })
})
