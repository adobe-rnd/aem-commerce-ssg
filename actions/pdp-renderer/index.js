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
const { extractPathDetails, findDescription} = require('./lib');
const { ProductQuery } = require('./queries');
const { generateLdJson } = require('./ldJson');

function toMetaTemplateData(baseProduct) {
  const templateProductData = { ...baseProduct };
  templateProductData.metaDescription = findDescription(baseProduct);
  templateProductData.metaImage = baseProduct.images?.[0]?.url;
  templateProductData.metaTitle = baseProduct.metaTitle || baseProduct.name || 'Product Details';
  return templateProductData;
}

/**
 * Parameters
 * @param {Object} params The parameters object
 * @param {string} params.__ow_path The path of the request
 * @param {string} params.__ow_query The query parameters of the request
 * @param {string} params.__ow_query.configName Overwrite for HLX_CONFIG_NAME
 * @param {string} params.__ow_query.contentUrl Overwrite for HLX_CONTENT_URL
 * @param {string} params.__ow_query.storeUrl Overwrite for HLX_STORE_URL
 * @param {string} params.HLX_CONFIG_NAME The config sheet to use (e.g. configs for prod, configs-dev for dev)
 * @param {string} params.HLX_CONTENT_URL Edge Delivery URL of the store (e.g. aem.live)
 * @param {string} params.HLX_STORE_URL Public facing URL of the store
 */
async function main (params) {
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' })

  try {
    logger.debug(stringParameters(params))
    const { __ow_path, __ow_query, HLX_STORE_URL, HLX_CONTENT_URL, HLX_CONFIG_NAME } = params;
    const { sku } = extractPathDetails(__ow_path);

    const configName = __ow_query?.configName || HLX_CONFIG_NAME;
    const contentUrl = __ow_query?.contentUrl || HLX_CONTENT_URL;
    const storeUrl = __ow_query?.storeUrl || HLX_STORE_URL || contentUrl;
    const context = { contentUrl, storeUrl, configName };

    if (!sku || !contentUrl) {
      return errorResponse(400, 'Invalid path', logger);
    }

    // Retrieve base product
    const baseProductData = await requestSaaS(ProductQuery, 'ProductQuery', { sku }, context);
    if (!baseProductData.data.products || baseProductData.data.products.length === 0) {
        return errorResponse(404, 'Product not found', logger);
    }
    const baseProduct = baseProductData.data.products[0];

    logger.debug('Retrieved base product', JSON.stringify(baseProduct, null, 4));

    // Assign meta tag data for template
    const templateProductData = toMetaTemplateData(baseProduct);
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
        ...templateProductData,
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
