Error.stackTraceLimit = 500;
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testPathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
  ],
  globals: {
    'ts-jest': {
        tsconfig: 'tsconfig.json',
        compiler: require.resolve('typescript')
    },
  }
};