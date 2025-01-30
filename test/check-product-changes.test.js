const assert = require('node:assert/strict');
const { loadState, saveState, getFileLocation, poll } = require('../actions/check-product-changes/poller.js');
const Files = require('./__mocks__/files.js');
const { AdminAPI } = require('../actions/check-product-changes/lib/aem');
const { requestSaaS, requestSpreadsheet, isValidUrl, getProductUrl, mapLocale } = require('../actions/utils');
const { GetAllSkusQuery } = require('../actions/queries');

jest.mock('../actions/utils', () => ({
  requestSaaS: jest.fn(),
  requestSpreadsheet: jest.fn(),
  isValidUrl: jest.fn(() => true),
  getProductUrl: jest.fn(({ urlKey, sku }) => `https://store.com/${urlKey || sku}`),
  mapLocale: jest.fn((locale) => ({ locale })),
}));

jest.mock('../actions/check-product-changes/lib/aem', () => ({
  AdminAPI: jest.fn().mockImplementation(() => ({
    startProcessing: jest.fn(),
    stopProcessing: jest.fn(),
    previewAndPublish: jest.fn().mockResolvedValue({ sku: 'test-sku', previewedAt: new Date(), publishedAt: new Date() }),
    unpublishAndDelete: jest.fn().mockResolvedValue({ deletedAt: new Date() }),
    previewDurations: [],
  })),
}));

describe('Poller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const filesLibMock = {
    read: jest.fn().mockResolvedValue(null),
    write: jest.fn().mockResolvedValue(null),
  };

  it('loadState returns default state', async () => {
    const filesLib = new Files(0);
    const state = await loadState('uk', filesLib);
    assert.deepEqual(
      state,
      {
        locale: 'uk',
        skus: {},
        skusLastQueriedAt: new Date(0),
      }
    );
  });

  it('loadState returns parsed state', async () => {
    const filesLib = new Files(0);
    await filesLib.write(getFileLocation('uk'), '1,sku1,2,sku2,3,sku3,4');
    const state = await loadState('uk', filesLib);
    assert.deepEqual(
      state,
      {
        locale: 'uk',
        skus: {
          sku1: new Date(2),
          sku2: new Date(3),
          sku3: new Date(4),
        },
        skusLastQueriedAt: new Date(1),
      }
    );
  });

  it('loadState after saveState', async () => {
    const filesLib = new Files(0);
    await filesLib.write(getFileLocation('uk'), '1,sku1,2,sku2,3,sku3,4');
    const state = await loadState('uk', filesLib);
    state.skusLastQueriedAt = new Date(5);
    state.skus['sku1'] = new Date(5);
    state.skus['sku2'] = new Date(6);
    await saveState(state, filesLib);

    const serializedState = await filesLib.read(getFileLocation('uk'));
    assert.equal(serializedState, '5,sku1,5,sku2,6,sku3,4');

    const newState = await loadState('uk', filesLib);
    assert.deepEqual(newState, state);
  });

  it('loadState after saveState with null storeCode', async () => {
    const filesLib = new Files(0);
    await filesLib.write(getFileLocation('default'), '1,sku1,2,sku2,3,sku3,4');
    const state = await loadState(null, filesLib);
    state.skusLastQueriedAt = new Date(5);
    state.skus['sku1'] = new Date(5);
    state.skus['sku2'] = new Date(6);
    await saveState(state, filesLib);

    const serializedState = await filesLib.read(getFileLocation('default'));
    assert.equal(serializedState, '5,sku1,5,sku2,6,sku3,4');
  });

  it('checkParams should throw an error if required parameters are missing', async () => {
    const params = {
      HLX_SITE_NAME: 'siteName',
      HLX_PATH_FORMAT: 'pathFormat',
      PLPURIPrefix: 'prefix',
      HLX_ORG_NAME: 'orgName',
      // HLX_CONFIG_NAME is missing
      authToken: 'token',
    };

    await expect(poll(params, filesLibMock)).rejects.toThrow('Missing required parameters: HLX_CONFIG_NAME');
  });

  it('checkParams should throw an error if HLX_STORE_URL is invalid', async () => {
    isValidUrl.mockReturnValue(false);
    const params = {
      HLX_SITE_NAME: 'siteName',
      HLX_PATH_FORMAT: 'pathFormat',
      PLPURIPrefix: 'prefix',
      HLX_ORG_NAME: 'orgName',
      HLX_CONFIG_NAME: 'configName',
      authToken: 'token',
      HLX_STORE_URL: 'invalid-url',
    };

    await expect(poll(params, filesLibMock)).rejects.toThrow('Invalid storeUrl');
  });

  it('Poller should fetch and process SKU updates', async () => {
    const params = {
      HLX_SITE_NAME: 'siteName',
      HLX_PATH_FORMAT: 'pathFormat',
      PLPURIPrefix: 'prefix',
      HLX_ORG_NAME: 'orgName',
      HLX_CONFIG_NAME: 'configName',
      authToken: 'token',
      skusRefreshInterval: 600000,
    };

    requestSaaS.mockImplementation((query, operation) => {
      if (operation === 'getAllSkus') {
        return Promise.resolve({
          data: { productSearch: { items: [{ productView: 'sku-123' }, { productView: 'sku-456' }] } },
        });
      }
      if (operation === 'getLastModified') {
        return Promise.resolve({
          data: {
            products: [
              { urlKey: 'url-sku-123', sku: 'sku-123', lastModifiedAt: new Date().getTime() - 5000 },
              { urlKey: 'url-sku-456', sku: 'sku-456', lastModifiedAt: new Date().getTime() - 10000 },
            ],
          },
        });
      }
      return Promise.resolve({});
    });

    const result = await poll(params, filesLibMock);

    expect(result.state).toBe('completed');
    expect(result.status.published).toBeGreaterThan(0);
    expect(result.status.failed).toBe(0);

    expect(requestSaaS).toBeCalledTimes(2);
    expect(requestSaaS).toHaveBeenNthCalledWith(
        1,
        GetAllSkusQuery,
        'getAllSkus',
        {},
        expect.anything()
    );
    expect(requestSaaS).toHaveBeenNthCalledWith(
        2,
        expect.anything(),
        'getLastModified',
        expect.objectContaining({
          skus: expect.arrayContaining(['sku-123', 'sku-456']),
        }),
        expect.anything()
    );
    expect(filesLibMock.write).toHaveBeenCalled();
  });
});
