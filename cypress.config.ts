import { defineConfig } from 'cypress'

export default defineConfig({
  video: false,
  screenshotOnRunFailure: true,
  e2e: {
    baseUrl: 'http://127.0.0.1:3000',
    supportFile: false,
    specPattern: 'cypress/e2e/**/*.cy.ts',
  },
})
