const baseConfig = {
  // Automatically clear mock calls and instances between every test
  clearMocks: true,

  moduleFileExtensions: ['ts', 'js', 'node'],

  testPathIgnorePatterns: [
    "/.yalc/",
    "/data/",
    "/unit/",
    "/common",
    "/_helpers",
  ],

  testEnvironment: 'node',

  "transformIgnorePatterns": [
    "<rootDir>/node_modules/(?!@assemblyscript/.*)"
  ],

  moduleNameMapper: {
    '^@env/types(.*)$': '<rootDir>/src/types/node/$1',
    '^@env/core(.*)$': '<rootDir>/src/core/node/$1',
  },
  
  transform: {
    '^.+\\.(ts|js)$': 'ts-jest'
  },
};

module.exports = {
  ...baseConfig,
  // general config
  testTimeout: 180000, // 3 minutes
  bail: false,
  projects: [
    {
      ...baseConfig,
      displayName: 'encrypted vault tests',
      globals: {
        isEncrypted: true,
      },
      testMatch: ['<rootDir>/src/__tests__/vault/*.test.ts'],
    },
    {
      ...baseConfig,
      displayName: 'public vault tests',
      globals: {
        isEncrypted: false,
      },
      testMatch: ['<rootDir>/src/__tests__/vault/*.test.ts'],
    },
    {
      ...baseConfig,
      displayName: 'user tests',
      testMatch: ['<rootDir>/src/__tests__/user/*.test.ts'],
    },
  ],
};
