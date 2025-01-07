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

/**
 * Parameters
 * @param {Object} params The parameters object
 * @param {string} params.__ow_path The path of the request
 * @param {string} params.siteName The repo name of the site
 * @param {string} params.orgName The GitHub org of the site
 * @param {string} params.configName The config sheet to use (e.g. configs for prod, configs-dev for dev)
 */
async function main (params) {
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' })

  try {
    logger.info('Calling the main action')
    logger.debug(stringParameters(params))

    const { __ow_path, siteName = "aem-boilerplate-commerce", orgName = "hlxsites", configName } = params;
    const { sku } = extractPathDetails(__ow_path);

    if (!sku) {
      return errorResponse(400, 'Invalid path', logger);
    }

    const contentUrl = `https://main--${siteName}--${orgName}.aem.live`;
    const storeUrl = params.storeUrl ? params.storeUrl : contentUrl;
    const context = { contentUrl, storeUrl, configName };
  
    // Retrieve base product
    const baseProductData = await requestSaaS(ProductQuery, 'ProductQuery', { sku }, context);
    if (!baseProductData.data.products || baseProductData.data.products.length === 0) {
        return errorResponse(404, 'Product not found', logger);
    }
    const baseProduct = baseProductData.data.products[0];

    logger.debug('Retrieved base product', JSON.stringify(baseProduct, null, 4));

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
      }),
    }
    logger.info(`${response.statusCode}: successful request`)
    return response;

  } catch (error) {
    // log any server errors
    logger.error(error)
    // return with 500
    return errorResponse(500, 'server error', logger)
  }
}

exports.main = main
