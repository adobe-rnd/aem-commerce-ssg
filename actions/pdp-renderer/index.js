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
const { errorResponse, stringParameters, requestSaaS, mapLocale } = require('../utils');
const { extractPathDetails, findDescription, prepareBaseTemplate, getPrimaryImage, generatePriceString, getImageList } = require('./lib');
const { ProductQuery, ProductByUrlKeyQuery } = require('../queries');
const { generateLdJson } = require('./ldJson');

function toTemplateProductData(baseProduct) {
  const templateProductData = { ...baseProduct };
  const primaryImage = getPrimaryImage(baseProduct)?.url;

  templateProductData.hasImages = baseProduct.images?.length > 0;
  templateProductData.imageList = getImageList(primaryImage, baseProduct.images);
  templateProductData.priceString = generatePriceString(baseProduct);
  templateProductData.metaDescription = findDescription(baseProduct);
  templateProductData.metaImage = primaryImage;
  templateProductData.primaryImage = primaryImage;
  templateProductData.metaTitle = baseProduct.metaTitle || baseProduct.name || 'Product Details';

  return templateProductData;
}

/**
 * Parameters
 * @param {Object} params The parameters object
 * @param {string} params.__ow_path The path of the request
 * @param {string} params.configName Overwrite for HLX_CONFIG_NAME using query parameter
 * @param {string} params.contentUrl Overwrite for HLX_CONTENT_URL using query parameter
 * @param {string} params.storeUrl Overwrite for HLX_STORE_URL using query parameter
 * @param {string} params.productsTemplate Overwrite for HLX_PRODUCTS_TEMPLATE using query parameter
 * @param {string} params.pathFormat Overwrite for HLX_PATH_FORMAT using query parameter
 * @param {string} params.HLX_CONFIG_NAME The config sheet to use (e.g. configs for prod, configs-dev for dev)
 * @param {string} params.HLX_CONTENT_URL Edge Delivery URL of the store (e.g. aem.live)
 * @param {string} params.HLX_STORE_URL Public facing URL of the store
 * @param {string} params.HLX_PRODUCTS_TEMPLATE URL to the products template page
 * @param {string} params.HLX_PATH_FORMAT The path format to use for parsing
 */
async function main (params) {
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' })

  try {
    logger.debug(stringParameters(params))
    const {
      __ow_path,
      pathFormat : pathFormatQuery,
      configName : configNameQuery,
      contentUrl : contentUrlQuery,
      storeUrl : storeUrlQuery,
      productsTemplate : productsTemplateQuery,
      HLX_STORE_URL,
      HLX_CONTENT_URL,
      HLX_CONFIG_NAME,
      HLX_PRODUCTS_TEMPLATE,
      HLX_PATH_FORMAT,
      HLX_LOCALES,
    } = params;

    const pathFormat = pathFormatQuery || HLX_PATH_FORMAT || '/products/{urlKey}/{sku}';
    const configName = configNameQuery || HLX_CONFIG_NAME;
    const contentUrl = contentUrlQuery || HLX_CONTENT_URL;
    const storeUrl = storeUrlQuery || HLX_STORE_URL || contentUrl;
    const productsTemplate = productsTemplateQuery || HLX_PRODUCTS_TEMPLATE;
    const allowedLocales = HLX_LOCALES ? HLX_LOCALES.split(',').map(a => a.trim()) : [];
    let context = { contentUrl, storeUrl, configName, logger, pathFormat, allowedLocales };

    const result = extractPathDetails(__ow_path, pathFormat);
    logger.debug('Path parse results', JSON.stringify(result, null, 4));
    const { sku, urlKey, locale } = result;

    if ((!sku && !urlKey) || !contentUrl) {
      return errorResponse(400, 'Invalid path', logger);
    }

    // Map locale to context
    if (locale) {
      try {
      context = { ...context, ...mapLocale(locale, context) };
      // eslint-disable-next-line no-unused-vars
      } catch(e) {
        return errorResponse(400, 'Invalid locale', logger);
      }
    }

    // Retrieve base product
    let baseProduct;
    if (sku) {
      const baseProductData = await requestSaaS(ProductQuery, 'ProductQuery', { sku: sku.toUpperCase() }, context);
      if (!baseProductData?.data?.products || baseProductData?.data?.products?.length === 0) {
        return errorResponse(404, 'Product not found', logger);
      }
      baseProduct = baseProductData.data.products[0];
    } else if (urlKey) {
      const baseProductData = await requestSaaS(ProductByUrlKeyQuery, 'ProductByUrlKey', { urlKey }, context);
      if (!baseProductData?.data?.productSearch || baseProductData?.data?.productSearch?.items?.length === 0) {
        return errorResponse(404, 'Product not found', logger);
      }
      baseProduct = baseProductData.data.productSearch.items[0].productView;
    }
    logger.debug('Retrieved base product', JSON.stringify(baseProduct, null, 4));

    // Assign meta tag data for template
    const templateProductData = toTemplateProductData(baseProduct);

    // Generate LD-JSON
    const ldJson = await generateLdJson(baseProduct, context);

    // Load the Handlebars template
    const [pageHbs, headHbs, productDetailsHbs] = ['page', 'head', 'product-details'].map((template) => fs.readFileSync(path.join(__dirname, 'templates', `${template}.hbs`), 'utf8'));
    const pageTemplate = Handlebars.compile(pageHbs);
    Handlebars.registerPartial('head', headHbs);

    if (productsTemplate) {
      // Retrieve default product page as template
      const blocksToReplace = [
        'product-details',
      ];
      const baseTemplate = await prepareBaseTemplate(productsTemplate, blocksToReplace);

      Handlebars.registerPartial('product-details', productDetailsHbs);
      Handlebars.registerPartial('content', baseTemplate);
    } else {
      // Use product details block as sole content if no products template is defined
      Handlebars.registerPartial('content', productDetailsHbs);
    }

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
