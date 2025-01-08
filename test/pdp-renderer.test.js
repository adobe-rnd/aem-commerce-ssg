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
  __ow_headers: { },
};

describe('pdp-renderer', () => {
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
