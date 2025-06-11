const AIParser = require('../../src/services/aiParser');

describe('AIParser', () => {
  test('should initialize correctly', () => {
    const parser = new AIParser();
    expect(parser).toBeDefined();
  });
});
