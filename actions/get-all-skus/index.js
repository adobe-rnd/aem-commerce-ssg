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

const { CategoriesQuery, ProductCountQuery, ProductsQuery, } = require('../queries');
const { Core, Files } = require('@adobe/aio-sdk')
const { requestSaaS, requestAPIMesh } = require('../utils');

async function getSkus(categoryPath, context) {
  const productsResp = await requestSaaS(ProductsQuery, 'getProducts', { currentPage: 1, categoryPath }, context);
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
    requestSaaS(ProductsQuery, 'getProducts', { currentPage, categoryPath }, context)
      .then((resp) => products.push(...resp.data.productSearch.items.map(({ productView }) => (
        productView.sku
      ))));
  }

  return products;
}

async function getAllCategories(context) {
  const categories = [];
  let currentPage = 1;
  let totalPages = 1;

  do {
    const categoriesResp = await requestAPIMesh(CategoriesQuery, 'getCategories', {
      currentPage: currentPage,
      pageSize: 200
    }, context);
    const { items, page_info } = categoriesResp.data.commerce_categories;

    for (const {url_path, level, name} of items) {
      const index = parseInt(level);
      categories[index] = categories[index] || [];
      categories[index].push({url_path, name, level});
    }

    currentPage = page_info.current_page + 1;
    totalPages = page_info.total_pages;
  } while (currentPage <= totalPages);

  return categories;
}

async function getAllSkus(context) {
  // TODO: Add measurements like timer
  try {
    const productCountResp = await requestSaaS(ProductCountQuery, 'getProductCount', { categoryPath: '' }, context);
    const productCount = productCountResp.data.productSearch?.page_info?.total_pages;

    if (!productCount) {
      throw new Error('Unknown product count.');
    }

    if (productCount <= 10000) {
      // we can get everything from the default category
      return getSkus('', context);
    }

    const products = new Set();
    // we have to traverse the category tree
    const categories = await getAllCategories(context);

    outer: for (const category of categories) {
      if (!category) continue;
      while (category.length) {
        const slice = category.splice(0, 50);
        const fetchedProducts = await Promise.all(slice.map((category) => getSkus(category.urlPath, context)));
        fetchedProducts.flatMap((skus) => skus).forEach((sku) => products.add(sku));
        if (products.size >= productCount) {
          // break if we got all products already
          break outer;
        }
      }
    }

    if (products.size !== productCount) {
      console.warn(`Expected ${productCount} products, but got ${products.size}.`);
    }

    return [...products];
  } finally {
    // timer.stop();
  }
}

async function main(params) {
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' })
  const context = { 
    storeCode: process.env.MAGENTO_STORE_VIEW_CODE, 
    storeUrl: process.env.CATALOG_ENDPOINT, 
    configName: 'configs', 
    logger: logger, 
    contentUrl: process.env.CORE_ENDPOINT
  };

  const filesLib = await Files.init();

  const allSkus = await getAllSkus(context);

  await filesLib.write('check-product-changes/allSkus.json', JSON.stringify(allSkus))

  const response = {
    statusCode: 200
  }
  return response;
}

exports.main = main