import type { Config } from 'jest';

const config: Config = {
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/test/unit/**/*.spec.ts'],
      preset: 'ts-jest',
      testEnvironment: 'node'
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/test/integration/**/*.spec.ts'],
      preset: 'ts-jest',
      testEnvironment: 'node'
    }
  ],
  collectCoverageFrom: ['src/**/*.ts', '!src/main.ts']
};

export default config;
