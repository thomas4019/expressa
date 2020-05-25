describe('Home', function() {
  it('Logs and shows 404s', function() {
    cy.request({ url: 'http://localhost:3001/api/notexist', failOnStatusCode: false })
    cy.login()
    cy.visit('/')
    cy.get('.el-table__body').contains('notexist')
    cy.get('.el-table__body').contains('404')
  })
})
