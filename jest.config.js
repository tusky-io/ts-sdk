module.exports = {
  // Automatically clear mock calls and instances between every test
  clearMocks: true,

  bail: true,

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
  }
};
