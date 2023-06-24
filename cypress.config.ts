import { defineConfig } from 'cypress'
import getCompareSnapshotsPlugin from 'cypress-visual-regression/dist/plugin'

export default defineConfig({
  fixturesFolder: false,
  projectId: '8wbmgj',
  screenshotsFolder: './cypress/snapshots/actual',
  trashAssetsBeforeRuns: true,
  video: false,
  env: {
    failSilently: false,
    type: "base",
  },
  e2e: {
    setupNodeEvents(on, config) {
      // Visual Regression
      getCompareSnapshotsPlugin(on, config);
    },
    baseUrl: 'http://localhost:8080/',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    experimentalStudio: true,
  },
})
