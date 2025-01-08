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

const { useMockServer } = require('./mock-server.js');

jest.mock('@adobe/aio-sdk', () => ({
  Core: {
    Logger: jest.fn()
  }
}))


const { Core } = require('@adobe/aio-sdk')
const mockLoggerInstance = { info: jest.fn(), debug: jest.fn(), error: jest.fn() }
Core.Logger.mockReturnValue(mockLoggerInstance)

const action = require('./../actions/pdp-renderer/index.js')

beforeEach(() => {
  Core.Logger.mockClear()
  mockLoggerInstance.info.mockReset()
  mockLoggerInstance.debug.mockReset()
  mockLoggerInstance.error.mockReset()
})

const fakeParams = {
  __ow_headers: { },
};

describe('pdp-renderer', () => {
  const server = useMockServer();

  test('main should be defined', () => {
    expect(action.main).toBeInstanceOf(Function)
  })

  test('should set logger to use LOG_LEVEL param', async () => {
    await action.main({ ...fakeParams, LOG_LEVEL: 'fakeLevel' })
    expect(Core.Logger).toHaveBeenCalledWith(expect.any(String), { level: 'fakeLevel' })
  })

  test('should return an http response', async () => {
    const response = await action.main(fakeParams)
    expect(response).toEqual({
      error: {
        statusCode: 400,
        body: {
          error: 'Invalid path',
        },
      },
    })
  })

  test('returns correct template', async () => {
    const response = await action.main({
      HLX_STORE_URL: 'https://store.com',
      HLX_CONTENT_URL: 'https://content.com',
      HLX_CONFIG_NAME: 'config',
      __ow_path: '/products/crown-summit-backpack/24-MB03',
    });

    expect(response.statusCode).toEqual(200);
    expect(response.body).toMatchInlineSnapshot(`
"<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title></title>

  <script type="application/ld+json">{"@context":"http://schema.org","@type":"Product","sku":"24-MB03","name":"Crown Summit Backpack","gtin":"","description":"The Crown Summit Backpack is equally at home in a gym locker, study cube or a pup tent, so be sure yours is packed with books, a bag lunch, water bottles, yoga block, laptop, or whatever else you want in hand. Rugged enough for day hikes and camping trips, it has two large zippered compartments and padded, adjustable shoulder straps.Top handle.Grommet holes.Two-way zippers.H 20\\" x W 14\\" x D 12\\".Weight: 2 lbs, 8 oz. Volume: 29 L.","@id":"https://store.com/products/crown-summit-backpack/24-MB03","image":"http://www.aemshop.net/media/catalog/product/m/b/mb03-black-0.jpg","offers":[{"@type":"Offer","sku":"24-MB03","url":"https://store.com/products/crown-summit-backpack/24-MB03","gtin":"","availability":"InStock","price":38,"priceCurrency":"USD","image":"http://www.aemshop.net/media/catalog/product/m/b/mb03-black-0.jpg","itemCondition":"NewCondition"}]}</script>
</head><body>
  <header></header>
  <main>
    <div class="product-details">
      <div>
        <div>
          <h1>Crown Summit Backpack</h1>
        </div>
      </div>
    </div>  </main>
  <footer></footer>
</body>
</html>"
`);
  });

  test('returns 404 if product doesnt exist', async () => {
    const response = await action.main({
      HLX_STORE_URL: 'https://aemstore.net',
      HLX_CONTENT_URL: 'https://content.com',
      HLX_CONFIG_NAME: 'config',
      __ow_path: '/products/crown-summit-backpack/sku-is-404',
    });

    expect(response.error.statusCode).toEqual(404);
  });
})
