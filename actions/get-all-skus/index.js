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

const { ProductsQuery, } = require('../queries');
const { Core, Files } = require('@adobe/aio-sdk')
const { requestSaaS } = require('../utils');
const { SKU_FILE_LOCATION } = require('../utils');

async function getSkus(categoryPath, context) {
  let productsResp = await requestSaaS(ProductsQuery, 'getProducts', { currentPage: 1, categoryPath }, context);
  const products = [...productsResp.data.productSearch.items.map(({ productView }) => (
    {
      urlKey: productView.urlKey,
      sku: productView.sku
    }
  ))];  
  let maxPage = productsResp.data.productSearch.page_info.total_pages;

  if (maxPage > 20) {
    console.warn(`Category ${categoryPath} has more than 10000 products.`);
    maxPage = 20;
  }

  for (let currentPage = 2; currentPage <= maxPage; currentPage++) {
    productsResp = await requestSaaS(ProductsQuery, 'getProducts', { currentPage, categoryPath }, context);
     products.push(...productsResp.data.productSearch.items.map(({ productView }) => (
      {
        urlKey: productView.urlKey,
        sku: productView.sku
      }
    )));
  }

  return products;
}

async function main(params) {
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' })
  const context = { 
    configName: 'configs', 
    logger: logger, 
    contentUrl: process.env.CORE_ENDPOINT
  };

  const filesLib = await Files.init();

  const allSkus = await getSkus('', context);

  await filesLib.write(SKU_FILE_LOCATION, JSON.stringify(allSkus))

  let result = await filesLib.read(SKU_FILE_LOCATION);
  result = result.toString();
  result = JSON.parse(result);
  console.log("result", result);

  const response = {
    statusCode: 200
  }
  return response;
}

exports.main = main