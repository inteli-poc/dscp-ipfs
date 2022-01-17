module.exports = {
  recursive: true,
  slow: 10000,
  timeout: 20000,
  extension: ['.test.js'],
  require: ['./test/integration/fixtures.js'],
  exit: true,
}
