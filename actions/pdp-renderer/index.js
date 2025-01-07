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

const fs = require('fs');
const path = require('path');

const { Core } = require('@adobe/aio-sdk')
const Handlebars = require('handlebars');

const { errorResponse, stringParameters, requestSaaS } = require('../utils');
const { extractPathDetails } = require('./lib');
const { ProductQuery } = require('./queries');
const { generateLdJson } = require('./ldJson');

/**
 * Parameters
 * @param {Object} params The parameters object
 * @param {string} params.__ow_path The path of the request
 * @param {string} params.HLX_CONFIG_NAME The config sheet to use (e.g. configs for prod, configs-dev for dev)
 * @param {string} params.HLX_CONTENT_URL Edge Delivery URL of the store (e.g. aem.live)
 * @param {string} params.HLX_STORE_URL Public facing URL of the store
 */
async function main (params) {
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' })

  try {
    logger.info('Calling the main action')
    logger.debug(stringParameters(params))

    const { __ow_path, HLX_STORE_URL, HLX_CONTENT_URL, HLX_CONFIG_NAME } = params;
    const { sku } = extractPathDetails(__ow_path);

    if (!sku || !HLX_CONTENT_URL) {
      return errorResponse(400, 'Invalid path', logger);
    }

    const storeUrl = HLX_STORE_URL ? HLX_STORE_URL : HLX_CONTENT_URL;
    const context = { contentUrl: HLX_CONTENT_URL, storeUrl, configName: HLX_CONFIG_NAME };

    // Retrieve base product
    const baseProductData = await requestSaaS(ProductQuery, 'ProductQuery', { sku }, context);
    if (!baseProductData.data.products || baseProductData.data.products.length === 0) {
        return errorResponse(404, 'Product not found', logger);
    }
    const baseProduct = baseProductData.data.products[0];

    logger.debug('Retrieved base product', JSON.stringify(baseProduct, null, 4));

    // Generate LD-JSON
    const ldJson = await generateLdJson(baseProduct, context);

    // TODO: Add base template logic
    // Load the Handlebars template
    const [pageHbs, headHbs, productDetailsHbs] = ['page', 'head', 'product-details'].map((template) => fs.readFileSync(path.join(__dirname, 'templates', `${template}.hbs`), 'utf8'));
    const pageTemplate = Handlebars.compile(pageHbs);
    Handlebars.registerPartial('head', headHbs);
    Handlebars.registerPartial('product-details', productDetailsHbs);

    const response = {
      statusCode: 200,
      body: pageTemplate({
        ...baseProduct,
        ldJson,
      }),
    }
    logger.info(`${response.statusCode}: successful request`)
    return response;

  } catch (error) {
    logger.error(error)
    return errorResponse(500, 'server error', logger)
  }
}

exports.main = main
