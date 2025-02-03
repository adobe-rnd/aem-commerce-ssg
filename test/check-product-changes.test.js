/*
Copyright 2025 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const assert = require('node:assert/strict');
const { loadState, saveState, getFileLocation, poll } = require('../actions/check-product-changes/poller.js');
const Files = require('./__mocks__/files.js');
const { AdminAPI } = require('../actions/check-product-changes/lib/aem');
const { requestSaaS, requestSpreadsheet, isValidUrl} = require('../actions/utils');
const { GetAllSkusQuery } = require('../actions/queries');

jest.mock('../actions/utils', () => ({
  requestSaaS: jest.fn(),
  requestSpreadsheet: jest.fn(),
  isValidUrl: jest.fn(() => true),
  getProductUrl: jest.fn(({ urlKey, sku }) => `https://store.com/${urlKey || sku}`),
  mapLocale: jest.fn((locale) => ({ locale })),
}));

jest.spyOn(AdminAPI.prototype, 'startProcessing').mockImplementation(jest.fn());
jest.spyOn(AdminAPI.prototype, 'stopProcessing').mockImplementation(jest.fn());
jest.spyOn(AdminAPI.prototype, 'unpublishAndDelete').mockImplementation(jest.fn());
jest.spyOn(AdminAPI.prototype, 'previewAndPublish').mockImplementation(({ sku }) => {
  return Promise.resolve({
    sku,
    previewedAt: sku === 'sku-failed-due-preview' ? null: new Date(),
    publishedAt: sku === 'sku-failed-due-publishing' ? null : new Date()
  });
});

describe('Poller', () => {
  const filesLibMock = {
    read: jest.fn().mockResolvedValue(null),
    write: jest.fn().mockResolvedValue(null),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

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

  it('Poller should fetch and process SKU updates and 2 sku failed', async () => {
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
          data: {
            productSearch: {
              items: [
                { productView: 'sku-123' },
                { productView: 'sku-456' },
                { productView: 'sku-failed-due-preview' },
                { productView: 'sku-failed-due-publishing' }
              ]
            }
          },
        });
      }
      if (operation === 'getLastModified') {
        return Promise.resolve({
          data: {
            products: [
              { urlKey: 'url-sku-123', sku: 'sku-123', lastModifiedAt: new Date().getTime() - 5000 },
              { urlKey: 'url-sku-456', sku: 'sku-456', lastModifiedAt: new Date().getTime() - 10000 },
              { urlKey: 'url-failed-due-preview', sku: 'sku-failed-due-preview', lastModifiedAt: new Date().getTime() - 20000 },
              { urlKey: 'url-failed-due-publishing', sku: 'sku-failed-due-publishing', lastModifiedAt: new Date().getTime() - 20000 },
            ],
          },
        });
      }
      return Promise.resolve({});
    });

    const result = await poll(params, filesLibMock);

    expect(result.state).toBe('completed');
    expect(result.status.published).toBe(2);
    expect(result.status.failed).toBe(2);
    expect(result.status.unpublished).toBe(0);
    expect(result.status.ignored).toBe(0);

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
    expect(filesLibMock.read).toHaveBeenCalled();
    expect(filesLibMock.write).toHaveBeenCalled();
    expect(AdminAPI.prototype.startProcessing).toHaveBeenCalledTimes(1);
    expect(AdminAPI.prototype.stopProcessing).toHaveBeenCalledTimes(1);
    expect(AdminAPI.prototype.previewAndPublish).toHaveBeenCalled();
    expect(AdminAPI.prototype.unpublishAndDelete).not.toHaveBeenCalled();
  });

  it('Poller should not fetch SKU and not process them', async () => {
    filesLibMock.read.mockImplementationOnce(() => {
      const lastQueriedAndPreviewedAt = new Date().getTime() - 10000;
      return Promise.resolve(
          `${lastQueriedAndPreviewedAt},sku-123,${lastQueriedAndPreviewedAt},sku-456,${lastQueriedAndPreviewedAt},sku-789,${lastQueriedAndPreviewedAt}`
      )
    });

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
      if (operation === 'getLastModified') {
        return Promise.resolve({
          data: {
            products: [
              { urlKey: 'url-sku-123', sku: 'sku-123', lastModifiedAt: new Date().getTime() - 20000 },
              { urlKey: 'url-sku-456', sku: 'sku-456', lastModifiedAt: new Date().getTime() - 30000 },
              { urlKey: null, sku: 'sku-789', lastModifiedAt: new Date().getTime() - 5000 },
            ],
          },
        });
      }
      return Promise.resolve({});
    });

    const result = await poll(params, filesLibMock);

    expect(result.state).toBe('completed');
    expect(result.status.published).toBe(0);
    expect(result.status.failed).toBe(0);
    expect(result.status.unpublished).toBe(0);
    expect(result.status.ignored).toBe(3);

    expect(requestSaaS).toBeCalledTimes(1);
    expect(requestSaaS).toHaveBeenNthCalledWith(
        1,
        expect.anything(),
        'getLastModified',
        expect.objectContaining({
          skus: expect.arrayContaining(['sku-123', 'sku-456']),
        }),
        expect.anything()
    );
    expect(filesLibMock.read).toHaveBeenCalled();
    expect(filesLibMock.write).not.toHaveBeenCalled();
    expect(AdminAPI.prototype.startProcessing).toHaveBeenCalledTimes(1);
    expect(AdminAPI.prototype.stopProcessing).toHaveBeenCalledTimes(1);
    expect(AdminAPI.prototype.previewAndPublish).not.toHaveBeenCalled();
    expect(AdminAPI.prototype.unpublishAndDelete).not.toHaveBeenCalled();
  });

  it('Poller should delete SKUs that are not in the catalog service, one of them is failed', async () => {
    const params = {
      HLX_SITE_NAME: 'siteName',
      HLX_PATH_FORMAT: 'pathFormat',
      PLPURIPrefix: 'prefix',
      HLX_ORG_NAME: 'orgName',
      HLX_CONFIG_NAME: 'configName',
      authToken: 'token',
      skusRefreshInterval: 600000,
    };

    filesLibMock.read.mockImplementationOnce(() => {
      const lastQueriedAndPreviewedAt = new Date().getTime() - 10000;
      return Promise.resolve(
          `${lastQueriedAndPreviewedAt},sku-123,${lastQueriedAndPreviewedAt},sku-456,${lastQueriedAndPreviewedAt},sku-failed,${lastQueriedAndPreviewedAt}`
      );
    });

    requestSaaS.mockImplementation((query, operation) => {
      if (operation === 'getLastModified') {
        return Promise.resolve({
          data: {
            products: [
              { urlKey: 'url-sku-123', sku: 'sku-123', lastModifiedAt: new Date().getTime() - 20000 },
            ],
          },
        });
      }
      return Promise.resolve({});
    });

    requestSpreadsheet.mockImplementation(() => {
      return Promise.resolve({
        data: [
          { sku: 'sku-456' },
          { sku: 'sku-failed' },
        ],
      });
    });

    AdminAPI.prototype.unpublishAndDelete.mockImplementation(({ sku }) => {
      return Promise.resolve({ deletedAt: sku === 'sku-failed' ? null : new Date() });
    });

    const result = await poll(params, filesLibMock);

    expect(result.state).toBe('completed');
    expect(result.status.published).toBe(0);
    expect(result.status.failed).toBe(1);
    expect(result.status.unpublished).toBe(1);
    expect(result.status.ignored).toBe(1);

    expect(requestSaaS).toBeCalledTimes(1);
    expect(requestSpreadsheet).toBeCalledTimes(1);
    expect(AdminAPI.prototype.unpublishAndDelete).toBeCalledTimes(2);
    expect(filesLibMock.read).toHaveBeenCalled();
    expect(filesLibMock.write).toHaveBeenCalled();
  });
});
