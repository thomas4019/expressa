// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add("login", (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite("visit", (originalFn, url, options) => { ... })

Cypress.Commands.add('randomId', (length) => {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < length || 10; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
})

Cypress.Commands.add('fillValue', (path, value) => {
    cy.get(`input[name="root[${path}]"]`).type(value)
})

Cypress.Commands.add('login', (email, password) => {
    cy.request({
        method: 'POST',
        url: 'http://localhost:3001/api/user/login',
        body: {
            email: email || 'test@example.com',
            password: password || 'expressa',
        }
    })
        .then((resp) => {
            cy.setCookie('Admin-Token', resp.body.token);
        })

})