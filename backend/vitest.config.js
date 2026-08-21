export default {
  test: {
    environment: 'node',
    include: ['src/tests/**/*.test.js'],
    globals: true,
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
};
