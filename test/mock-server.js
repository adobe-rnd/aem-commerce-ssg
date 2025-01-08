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
const { setupServer } = require('msw/node');
const { http, graphql, HttpResponse } = require('msw');

const mockConfig = JSON.parse('{"total":18,"offset":0,"limit":18,"data":[{"key":"commerce-endpoint","value":"https://www.aemshop.net/cs-graphql"},{"key":"commerce-environment-id","value":"f38a0de0-764b-41fa-bd2c-5bc2f3c7b39a"},{"key":"commerce-website-code","value":"base"},{"key":"commerce-store-view-code","value":"default"},{"key":"commerce-store-code","value":"main_website_store"},{"key":"commerce-customer-group","value":"b6589fc6ab0dc82cf12099d1c2d40ab994e8410c"},{"key":"commerce-x-api-key","value":"4dfa19c9fe6f4cccade55cc5b3da94f7"},{"key":"commerce-core-endpoint","value":"https://www.aemshop.net/graphql"},{"key":"commerce-root-category-id","value":"2"},{"key":"commerce-environment","value":"Production"},{"key":"commerce-store-id","value":"1"},{"key":"commerce-store-name","value":"Main Website Store"},{"key":"commerce-store-url","value":"https://www.aemshop.net/"},{"key":"commerce-store-view-id","value":"1"},{"key":"commerce-store-view-name","value":"Default Store View"},{"key":"commerce-website-id","value":"1"},{"key":"commerce-website-name","value":"Main Website"},{"key":"commerce-base-currency-code","value":"USD"}],":type":"sheet"}')
const mockProduct = JSON.parse('{"data":{"products":[{"__typename":"SimpleProductView","id":"TWpRdFRVSXdNdwBaR1ZtWVhWc2RBAFpqTTRZVEJrWlRBdE56WTBZaTAwTVdaaExXSmtNbU10TldKak1tWXpZemRpTXpsaABiV0ZwYmw5M1pXSnphWFJsWDNOMGIzSmwAWW1GelpRAFRVRkhNREExTXpZeE56STU","sku":"24-MB03","name":"Crown Summit Backpack","url":"http://www.aemshop.net/crown-summit-backpack.html","description":"<p>The Crown Summit Backpack is equally at home in a gym locker, study cube or a pup tent, so be sure yours is packed with books, a bag lunch, water bottles, yoga block, laptop, or whatever else you want in hand. Rugged enough for day hikes and camping trips, it has two large zippered compartments and padded, adjustable shoulder straps.</p>\\r\\n<ul>\\r\\n<li>Top handle.</li>\\r\\n<li>Grommet holes.</li>\\r\\n<li>Two-way zippers.</li>\\r\\n<li>H 20\\" x W 14\\" x D 12\\".</li>\\r\\n<li>Weight: 2 lbs, 8 oz. Volume: 29 L.</li>\\r\\n<ul>","shortDescription":"","metaDescription":"","metaKeyword":"","metaTitle":"","urlKey":"crown-summit-backpack","inStock":true,"externalId":"7","lastModifiedAt":"2024-10-03T15:26:48.850Z","images":[{"url":"http://www.aemshop.net/media/catalog/product/m/b/mb03-black-0.jpg","label":"Image","roles":["image","small_image","thumbnail"]},{"url":"http://www.aemshop.net/media/catalog/product/m/b/mb03-black-0_alt1.jpg","label":"Image","roles":[]}],"attributes":[{"name":"activity","label":"Activity","value":["Gym","Hiking","Overnight","School","Trail","Travel","Urban"],"roles":["visible_in_pdp","visible_in_compare_list","visible_in_search"]},{"name":"color","label":"Color","value":"","roles":["visible_in_pdp","visible_in_compare_list","visible_in_plp","visible_in_search"]},{"name":"cost","label":"Cost","value":"","roles":["visible_in_pdp"]},{"name":"eco_collection","label":"Eco Collection","value":"no","roles":["visible_in_pdp"]},{"name":"erin_recommends","label":"Erin Recommends","value":"no","roles":["visible_in_pdp"]},{"name":"features_bags","label":"Features","value":["Audio Pocket","Waterproof","Lightweight","Reflective","Laptop Sleeve"],"roles":["visible_in_pdp","visible_in_search"]},{"name":"material","label":"Material","value":["Nylon","Polyester"],"roles":["visible_in_pdp","visible_in_search"]},{"name":"new","label":"New","value":"no","roles":["visible_in_pdp"]},{"name":"performance_fabric","label":"Performance Fabric","value":"no","roles":["visible_in_pdp"]},{"name":"sale","label":"Sale","value":"no","roles":["visible_in_pdp"]},{"name":"strap_bags","label":"Strap/Handle","value":["Adjustable","Double","Padded"],"roles":["visible_in_pdp","visible_in_search"]},{"name":"style_bags","label":"Style","value":"Backpack","roles":["visible_in_pdp","visible_in_search"]}],"price":{"roles":["visible"],"regular":{"amount":{"currency":"USD","value":38}},"final":{"amount":{"currency":"USD","value":38}}}}]},"extensions":{"request-id":"46810aaf0cead43d360d86efa51338a20ab2ff82b838a2f6d9943969f2799092"}}');

const handlers = {
  defaultProduct: (matcher) => graphql.query('ProductQuery', (req) => {
    matcher?.(req);
    return HttpResponse.json(mockProduct);
  }),
  return404: (matcher) => graphql.query('ProductQuery', (req) => {
    matcher?.(req);
    return HttpResponse.json({ data: { products: [] }});
  }),
}

function useMockServer() {
  const handlers = [
    http.get('https://content.com/config.json', async () => {
      return HttpResponse.json(mockConfig);
    }),
  ];

  const server = setupServer(...handlers);

  jest.setTimeout(10000)

  beforeAll(() => {
    server.listen();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => server.close());

  return server;
}


module.exports = { useMockServer, handlers };
