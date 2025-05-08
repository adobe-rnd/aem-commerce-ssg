const action = require('../actions/get-overlay-url/index.js');

// Mock the Core.Logger
jest.mock('@adobe/aio-sdk', () => ({
  Core: {
    Logger: jest.fn().mockReturnValue({
      info: jest.fn(),
      error: jest.fn()
    })
  },
  Files: {
    init: jest.fn()
  }
}));

describe('get-overlay-url', () => {
  let mockFiles;
  
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Setup mock Files instance
    mockFiles = {
      write: jest.fn(),
      getProperties: jest.fn(),
      delete: jest.fn()
    };
    
    // Mock Files.init to return our mock instance
    require('@adobe/aio-sdk').Files.init.mockResolvedValue(mockFiles);
  });

  test('should extract base URL and return overlay URL', async () => {
    // Mock getProperties to return a URL
    mockFiles.getProperties.mockResolvedValue({
      url: 'https://example.com/abc123/test-dir'
    });

    const result = await action.main({});

    // Verify the result
    expect(result).toEqual({
      overlayUrl: 'https://example.com/abc123-public/public/pdps'
    });

    // Verify the mock calls
    expect(mockFiles.write).toHaveBeenCalledWith('/test-dir', expect.any(Buffer));
    expect(mockFiles.getProperties).toHaveBeenCalledWith('/test-dir');
    expect(mockFiles.delete).toHaveBeenCalledWith('/test-dir');
  });

  test('should handle URL extraction failure', async () => {
    // Mock getProperties to return a URL that doesn't match the expected pattern
    mockFiles.getProperties.mockResolvedValue({
      url: 'invalid-url'
    });

    const result = await action.main({});

    // Verify the result
    expect(result).toEqual({
      error: 'Failed to complete the operations',
      message: 'Failed to extract base URL'
    });
  });

  test('should handle getProperties error', async () => {
    // Mock getProperties to throw an error
    mockFiles.getProperties.mockRejectedValue(new Error('Failed to get properties'));

    const result = await action.main({});

    // Verify the result
    expect(result).toEqual({
      error: 'Failed to complete the operations',
      message: 'Failed to get properties'
    });
  });
});