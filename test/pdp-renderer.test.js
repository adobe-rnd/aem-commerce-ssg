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

const cheerio = require('cheerio');
const { useMockServer, handlers } = require('./mock-server.js');

jest.mock('@adobe/aio-sdk', () => ({
  Core: {
    Logger: jest.fn()
  }
}))


const { Core } = require('@adobe/aio-sdk')
const mockLoggerInstance = { info: jest.fn(), debug: jest.fn(), error: jest.fn() }
Core.Logger.mockReturnValue(mockLoggerInstance)

const action = require('./../actions/pdp-renderer/index.js')
const fs = require("fs");
const path = require("path");
const Handlebars = require("handlebars");

beforeEach(() => {
  Core.Logger.mockClear()
  mockLoggerInstance.info.mockReset()
  mockLoggerInstance.debug.mockReset()
  mockLoggerInstance.error.mockReset()
})

const fakeParams = {
  __ow_headers: {},
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

  test('render with product template', async () => {
    server.use(handlers.defaultProductTemplate);
    server.use(handlers.defaultProduct());

    const response = await action.main({
      HLX_STORE_URL: 'https://store.com',
      HLX_CONTENT_URL: 'https://content.com',
      HLX_CONFIG_NAME: 'config',
      HLX_PRODUCTS_TEMPLATE: "https://content.com/products/default",
      __ow_path: `/products/crown-summit-backpack/24-MB03`,
    });

    // Validate that product recommendations block is there
    const $ = cheerio.load(response.body);
    expect($('.product-recommendations')).toHaveLength(1);
    expect($('body > main > div')).toHaveLength(2);
  });

  test('render without product template', async () => {
    server.use(handlers.defaultProduct());

    const response = await action.main({
      HLX_STORE_URL: 'https://store.com',
      HLX_CONTENT_URL: 'https://content.com',
      HLX_CONFIG_NAME: 'config',
      __ow_path: `/products/crown-summit-backpack/24-MB03`,
    });

    // Validate that product details is the only block in body
    const $ = cheerio.load(response.body);
    expect($('body > main > div')).toHaveLength(1);
  });

  test('render images', async () => {
    server.use(handlers.defaultProduct());

    const response = await action.main({
      HLX_STORE_URL: 'https://store.com',
      HLX_CONTENT_URL: 'https://content.com',
      HLX_CONFIG_NAME: 'config',
      __ow_path: `/products/crown-summit-backpack/24-MB03`,
    });

    const $ = cheerio.load(response.body);
    expect($('body > main > div.product-details > div > div:contains("Images")').next().find('a').map((_,e) => $(e).prop('outerHTML')).toArray()).toEqual([
      '<a href="http://www.aemshop.net/media/catalog/product/m/b/mb03-black-0.jpg">http://www.aemshop.net/media/catalog/product/m/b/mb03-black-0.jpg</a>',
      '<a href="http://www.aemshop.net/media/catalog/product/m/b/mb03-black-0_alt1.jpg">http://www.aemshop.net/media/catalog/product/m/b/mb03-black-0_alt1.jpg</a>'
    ]);
  });

  test('render description', async () => {
    server.use(handlers.defaultProduct());

    const response = await action.main({
      HLX_STORE_URL: 'https://store.com',
      HLX_CONTENT_URL: 'https://content.com',
      HLX_CONFIG_NAME: 'config',
      __ow_path: `/products/crown-summit-backpack/24-MB03`,
    });

    const $ = cheerio.load(response.body);
    expect($('body > main > div.product-details > div > div:contains("Description")').next().html().trim()).toMatchInlineSnapshot(`
"<p>The Crown Summit Backpack is equally at home in a gym locker, study cube or a pup tent, so be sure yours is packed with books, a bag lunch, water bottles, yoga block, laptop, or whatever else you want in hand. Rugged enough for day hikes and camping trips, it has two large zippered compartments and padded, adjustable shoulder straps.</p>
    <ul>
    <li>Top handle.</li>
    <li>Grommet holes.</li>
    <li>Two-way zippers.</li>
    <li>H 20" x W 14" x D 12".</li>
    <li>Weight: 2 lbs, 8 oz. Volume: 29 L.</li>
    <ul></ul></ul>"
`);
  });

  test('render price', async () => {
    server.use(handlers.defaultProduct());

    const response = await action.main({
      HLX_STORE_URL: 'https://store.com',
      HLX_CONTENT_URL: 'https://content.com',
      HLX_CONFIG_NAME: 'config',
      __ow_path: `/products/crown-summit-backpack/24-MB03`,
    });

    const $ = cheerio.load(response.body);
    expect($('body > main > div.product-details > div > div:contains("Price")').next().text()).toBe('$38.00');
  });

  test('render title', async () => {
    server.use(handlers.defaultProduct());

    const response = await action.main({
      HLX_STORE_URL: 'https://store.com',
      HLX_CONTENT_URL: 'https://content.com',
      HLX_CONFIG_NAME: 'config',
      __ow_path: `/products/crown-summit-backpack/24-MB03`,
    });

    const $ = cheerio.load(response.body);
    expect($('body > main > div.product-details > div > div > h1').text()).toEqual('Crown Summit Backpack');
  });

  test('render product without options', async () => {
    server.use(handlers.defaultProduct());

    const response = await action.main({
      HLX_STORE_URL: 'https://store.com',
      HLX_CONTENT_URL: 'https://content.com',
      HLX_CONFIG_NAME: 'config',
      __ow_path: `/products/crown-summit-backpack/24-MB03`,
    });

    const $ = cheerio.load(response.body);
    expect($('body > main > div.product-details > div > div:contains("Options")')).toHaveLength(0);
  });

  test('render product with options', async () => {
    server.use(handlers.defaultComplexProduct());
    server.use(handlers.defaultVariant());

    const response = await action.main({
      HLX_STORE_URL: 'https://store.com',
      HLX_CONTENT_URL: 'https://content.com',
      HLX_CONFIG_NAME: 'config',
      __ow_path: `/products/crown-summit-backpack/24-MB03`,
    });

    const $ = cheerio.load(response.body);
    expect($('body > main > div.product-details > div > div:contains("Options")')).toHaveLength(1);
    expect($('body > main > div.product-details > div > div:contains("Options")').next().html().trim()).toMatchInlineSnapshot(`
"<ul>
            <li>
              Size
              <ul>
                <li>XS</li>
                <li>S</li>
                <li>M</li>
                <li>L</li>
                <li>XL</li>
              </ul>
            </li>
            <li>
              Color
              <ul>
                <li>Green</li>
                <li>Red</li>
                <li>White</li>
              </ul>
            </li>
          </ul>"
`);
  });

  test('render metadata', async () => {
    server.use(handlers.defaultProduct());

    const response = await action.main({
      HLX_STORE_URL: 'https://store.com',
      HLX_CONTENT_URL: 'https://content.com',
      HLX_CONFIG_NAME: 'config',
      __ow_path: `/products/crown-summit-backpack/24-MB03`,
    });

    const $ = cheerio.load(response.body);
    expect($('head > meta')).toHaveLength(8);
    expect($('head > meta[name="description"]').attr('content')).toMatchInlineSnapshot(`"The Crown Summit Backpack is equally at home in a gym locker, study cube or a pup tent, so be sure yours is packed with books, a bag lunch, water bottles, yoga block, laptop, or whatever else you want in hand. Rugged enough for day hikes and camping trips, it has two large zippered compartments and padded, adjustable shoulder straps.Top handle.Grommet holes.Two-way zippers.H 20" x W 14" x D 12".Weight: 2 lbs, 8 oz. Volume: 29 L."`);
    expect($('head > meta[name="keywords"]').attr('content')).toEqual('backpack, hiking, camping');
    expect($('head > meta[name="image"]').attr('content')).toEqual('http://www.aemshop.net/media/catalog/product/m/b/mb03-black-0.jpg');
    expect($('head > meta[name="id"]').attr('content')).toEqual('7');
    expect($('head > meta[name="sku"]').attr('content')).toEqual('24-MB03');
    expect($('head > meta[name="x-cs-lastModifiedAt"]').attr('content')).toEqual('2024-10-03T15:26:48.850Z');
    expect($('head > meta[property="og:type"]').attr('content')).toEqual('og:product');
  });

  test('render ld+json', async () => {
    server.use(handlers.defaultProduct());

    const response = await action.main({
      HLX_STORE_URL: 'https://store.com',
      HLX_CONTENT_URL: 'https://content.com',
      HLX_CONFIG_NAME: 'config',
      __ow_path: `/products/crown-summit-backpack/24-MB03`,
    });

    const $ = cheerio.load(response.body);
    const ldJson = JSON.parse($('script[type="application/ld+json"]').html());
    expect(ldJson).toEqual({
      "@context": "http://schema.org",
      "@id": "https://store.com/products/crown-summit-backpack/24-MB03",
      "@type": "Product",
      "description": 'The Crown Summit Backpack is equally at home in a gym locker, study cube or a pup tent, so be sure yours is packed with books, a bag lunch, water bottles, yoga block, laptop, or whatever else you want in hand. Rugged enough for day hikes and camping trips, it has two large zippered compartments and padded, adjustable shoulder straps.Top handle.Grommet holes.Two-way zippers.H 20" x W 14" x D 12".Weight: 2 lbs, 8 oz. Volume: 29 L.',
      "gtin": "",
      "image": "http://www.aemshop.net/media/catalog/product/m/b/mb03-black-0.jpg",
      "name": "Crown Summit Backpack",
      "offers": [
        {
          "@type": "Offer",
          "availability": "https://schema.org/InStock",
          "itemCondition": "https://schema.org/NewCondition",
          "price": 38,
          "priceCurrency": "USD",
          "sku": "24-MB03",
          "url": "https://store.com/products/crown-summit-backpack/24-MB03",
        },
      ],
      "sku": "24-MB03",
    });
  });

  test('returns 404 if product does not exist', async () => {
    server.use(handlers.return404());

    const response = await action.main({
      HLX_STORE_URL: 'https://aemstore.net',
      HLX_CONTENT_URL: 'https://content.com',
      HLX_CONFIG_NAME: 'config',
      __ow_path: '/products/crown-summit-backpack/sku-is-404',
    });

    expect(response.error.statusCode).toEqual(404);
  });
})

describe('Meta Tags Template', () => {
  let headTemplate;
  beforeAll(() => {
    const headTemplateFile = fs.readFileSync(path.join(__dirname, '..', 'actions', 'pdp-renderer', 'templates', `head.hbs`), 'utf8');
    headTemplate = Handlebars.compile(headTemplateFile);
  });

  test('template renders with no params passed', () => {
    const result = headTemplate();
    expect(result).toMatchInlineSnapshot(`
"<head>
  <meta charset="UTF-8">
  <title></title>

  <meta property="og:type" content="og:product">

  <script type="application/ld+json"></script>
</head>

"
`);
  });

  it('renders meta tags with all parameters provided', () => {
    const result = headTemplate({
      metaDescription: "Product Description",
      metaKeyword: "foo, bar",
      metaImage: "https://example.com/image.jpg",
      lastModifiedAt: "2023-10-01",
      sku: "12345",
      externalId: "67890"
    });

    expect(result).toMatchInlineSnapshot(`
"<head>
  <meta charset="UTF-8">
  <title></title>

  <meta name="description" content="Product Description"><meta name="keywords" content="foo, bar"><meta name="image" content="https://example.com/image.jpg"><meta name="id" content="67890"><meta name="sku" content="12345"><meta name="x-cs-lastModifiedAt" content="2023-10-01"><meta property="og:type" content="og:product">

  <script type="application/ld+json"></script>
</head>

"
`);
  });

  it('renders only type meta tag when no parameters are provided', () => {
    const result = headTemplate({});

    expect(result).toMatchInlineSnapshot(`
"<head>
  <meta charset="UTF-8">
  <title></title>

  <meta property="og:type" content="og:product">

  <script type="application/ld+json"></script>
</head>

"
`);
  });

  it('renders only description meta tag when only description is provided', () => {
    const result = headTemplate({ description: "Product Description" });

    expect(result).toMatchInlineSnapshot(`
"<head>
  <meta charset="UTF-8">
  <title></title>

  <meta property="og:type" content="og:product">

  <script type="application/ld+json"></script>
</head>

"
`);
  });

  it('renders only id meta tag when only id is provided', () => {
    const result = headTemplate({ id: "67890" });

    expect(result).toMatchInlineSnapshot(`
"<head>
  <meta charset="UTF-8">
  <title></title>

  <meta property="og:type" content="og:product">

  <script type="application/ld+json"></script>
</head>

"
`);
  });

  it('renders only sku meta tag when only sku is provided', () => {
    const result = headTemplate({ sku: "12345" });

    expect(result).toMatchInlineSnapshot(`
"<head>
  <meta charset="UTF-8">
  <title></title>

  <meta name="sku" content="12345"><meta property="og:type" content="og:product">

  <script type="application/ld+json"></script>
</head>

"
`);
  });

  it('renders only lastModifiedAt meta tag when only lastModifiedAt is provided', () => {
    const result = headTemplate({ lastModifiedAt: "2023-10-01" });

    expect(result).toMatchInlineSnapshot(`
"<head>
  <meta charset="UTF-8">
  <title></title>

  <meta name="x-cs-lastModifiedAt" content="2023-10-01"><meta property="og:type" content="og:product">

  <script type="application/ld+json"></script>
</head>

"
`);
  });


});
