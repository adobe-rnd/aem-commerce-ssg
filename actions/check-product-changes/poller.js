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

const { Timings, aggregate } = require('./lib/benchmark');
const { AdminAPI } = require('./lib/aem');
const { requestSaaS, requestSpreadsheet, isValidUrl, getProductUrl, mapLocale } = require('../utils');
const { GetAllSkusQuery, GetLastModifiedQuery } = require('../queries');
const { Core } = require('@adobe/aio-sdk');
const { generateProductHtml } = require('../pdp-renderer/render');
const crypto = require('crypto');

const BATCH_SIZE = 50;
const STATE_FILE_PREFIX = 'check-product-changes';
const STATE_FILE_EXT = 'csv';

function getStateFileLocation(stateKey) {
  return `${STATE_FILE_PREFIX}/${stateKey}.${STATE_FILE_EXT}`;
}

function getSkusLastQueriedStateKey(stateKey) {
  return `${stateKey}.skusLastQueriedAt`;
}

/**
 * @typedef {Object} PollerState
 * @property {string} locale - The locale (or store code).
 * @property {Array<String>} skus - The SKUs to be saved.
 * @property {Date} skusLastQueriedAt - Last time when the SKUs have been queried.
 */

/**
 * @typedef {import('@adobe/aio-sdk').Files.Files} FilesProvider
 */

/**
 * Saves the state to the cloud file system.
 *
 * @param {String} locale - The locale (or store code).
 * @param {Object} aioLibs - The libraries required for loading the state.
 * @param {Object} aioLibs.filesLib - The file library for reading state files.
 * @param {Object} aioLibs.stateLib - The state library for retrieving state information.
 * @returns {Promise<PollerState>} - A promise that resolves when the state is loaded, returning the state object.
 */
async function loadState(locale, aioLibs) {
  const { filesLib, stateLib } = aioLibs;
  const stateObj = { locale };
  try {
    const stateKey = locale || 'default';
    stateObj.skusLastQueriedAt = new Date(0);
    const skusLastQueriedState = await stateLib.get(getSkusLastQueriedStateKey(stateKey));
    if (skusLastQueriedState && skusLastQueriedState.value) {
      stateObj.skusLastQueriedAt = new Date(parseInt(skusLastQueriedState.value));
    }
    const fileLocation = getStateFileLocation(stateKey);
    const buffer = await filesLib.read(fileLocation);
    const stateData = buffer?.toString();
    if (stateData) {
      const lines = stateData.split('\n');
      stateObj.skus = lines.reduce((acc, line) => {
        // the format of the state object is:
        // <sku1>,<timestamp>,<hash>
        // <sku2>,<timestamp>,<hash>
        // ...
        // each row is a set of SKUs, last previewed timestamp and hash
        const [sku, time, hash] = line.split(',');
        acc[sku] = { lastPreviewedAt: new Date(parseInt(time)), hash };
        return acc;
      }, {});
    } else {
      stateObj.skus = {};
    }
  // eslint-disable-next-line no-unused-vars
  } catch (e) {
    stateObj.skus = {};
  }
  return stateObj;
}

/**
 * Saves the state to the cloud file system.
 *
 * @param {PollerState} state - The object describing state and metadata.
 * @param {Object} aioLibs - The libraries required for loading the state.
 * @param {Object} aioLibs.filesLib - The file library for reading state files.
 * @param {Object} aioLibs.stateLib - The state library for retrieving state information.
 * @returns {Promise<void>} - A promise that resolves when the state is saved.
 */
async function saveState(state, aioLibs) {
  const { filesLib, stateLib } = aioLibs;
  let { locale } = state;
  const stateKey = locale || 'default';
  await stateLib.put(getSkusLastQueriedStateKey(stateKey), state.skusLastQueriedAt.getTime().toString());
  const fileLocation = getStateFileLocation(stateKey);
  const csvData = [
    ...Object.entries(state.skus)
      .map(([sku, { lastPreviewedAt, hash }]) => {
        return `${sku},${lastPreviewedAt.getTime()},${hash || ''}`;
      }),
  ].join('\n');
  return await filesLib.write(fileLocation, csvData);
}

/**
 * Deletes the state from the cloud file system.
 *
 * @param {String} locale - The key of the state to be deleted.
 * @param {FilesProvider} filesLib - The Files library instance from '@adobe/aio-sdk'.
 * @returns {Promise<void>} - A promise that resolves when the state is deleted.
 */
async function deleteState(locale, filesLib) {
  const stateKey = `${locale}`;
  const fileLocation = getStateFileLocation(stateKey);
  await filesLib.delete(fileLocation);
}

/**
 * Checks the Adobe Commerce store for product changes, performs
 * preview/publish/delete operstions if needed, then updates the
 * state accordingly.
 *
 * @param {Object} params - The parameters object.
 * @param {string} params.HLX_SITE_NAME - The name of the site (repo or repoless).
 * @param {string} params.HLX_PATH_FORMAT - The URL format for product detail pages.
 * @param {string} params.HLX_ORG_NAME - The name of the organization.
 * @param {string} params.HLX_CONFIG_NAME - The name of the configuration json/xlsx.
 * @param {string} params.HLX_PRODUCTS_TEMPLATE URL to the products template page
 * @param {string} params.authToken - The authentication token.
 * @param {number} [params.skusRefreshInterval=600000] - The interval for refreshing SKUs in milliseconds.
 * @param {string} [params.HLX_STORE_URL] - The store's base URL.
 * @param {string} [params.HLX_LOCALES] - Comma-separated list of allowed locales.
 * @param {string} [params.LOG_LEVEL] - The log level.
 * @param {FilesProvider} filesLib - The files provider object.
 * @returns {Promise<Object>} The result of the polling action.
 */
function checkParams(params) {
  const requiredParams = ['HLX_SITE_NAME', 'HLX_PATH_FORMAT', 'HLX_ORG_NAME', 'HLX_CONFIG_NAME', 'authToken'];
  const missingParams = requiredParams.filter(param => !params[param]);
  if (missingParams.length > 0) {
    throw new Error(`Missing required parameters: ${missingParams.join(', ')}`);
  }

  if (params.HLX_STORE_URL && !isValidUrl(params.HLX_STORE_URL)) {
    throw new Error('Invalid storeUrl');
  }
}

/**
 * Creates batches of products for processing
 * @param products
 * @param context
 * @returns {*}
 */
function createBatches(products, context) {
  return products.reduce((acc, product) => {
        const { sku, urlKey } = product;
        const path = getProductUrl({ urlKey, sku }, context, false).toLowerCase();

        if (!acc.length || acc[acc.length - 1].length === BATCH_SIZE) {
          acc.push([]);
        }
        acc[acc.length - 1].push({ path, sku });

        return acc;
      }, []);
}

/**
 * Returns array of promises for preview and publish
 * @param batches
 * @param locale
 * @param adminApi
 * @returns {*}
 */
function previewAndPublish(batches, locale, adminApi) {
  let batchNumber = 0;
  return batches.reduce((acc, batch) => {
    batchNumber++;
    acc.push(adminApi.previewAndPublish(batch, locale, batchNumber));
    return acc;
  }, []);
}

/**
 * Returns array of promises for unpublish and delete
 * @param batches
 * @param locale
 * @param adminApi
 * @returns {*}
 */
function unpublishAndDelete(batches, locale, adminApi) {
    let batchNumber = 0;
    return batches.reduce((acc, batch) => {
        batchNumber++;
        acc.push(adminApi.unpublishAndDelete(batch, locale, batchNumber));
        return acc;
    }, []);
}

/**
 * Checks if a product should be processed
 * @param product
 * @returns {*|boolean}
 */
function shouldProcessProduct(product) {
  const { urlKey, lastModifiedDate, lastPreviewDate, currentHash, newHash } = product;
  return urlKey?.match(/^[a-zA-Z0-9-]+$/) && lastModifiedDate >= lastPreviewDate && currentHash !== newHash;
}

/**
 * Processes a product to determine if it needs to be updated
 * @param {Object} product - The product to process
 * @param {Object} state - The current state
 * @returns {Object} Enhanced product with additional metadata
 */
async function enrichProductWithMetadata(product, state, context) {
  const { logger } = context;
  const { sku, urlKey, lastModifiedAt } = product;
  const lastPreviewDate = state.skus[sku]?.lastPreviewedAt || new Date(0);
  const lastModifiedDate = new Date(lastModifiedAt);
  let newHash = null;
  try {
    const productHtml = await generateProductHtml(sku, urlKey, context);
    newHash = crypto.createHash('sha256').update(productHtml).digest('hex');
  } catch (e) {
    logger.error(`Error generating product HTML for SKU ${sku}:`, e);
  }

  return {
    ...product,
    lastModifiedDate,
    lastPreviewDate,
    currentHash: state.skus[sku]?.hash || null,
    newHash
  };
}

/**
 * Processes publish batches and updates state
 */
async function processPublishBatches(promiseBatches, state, counts, products, aioLibs) {
  const response = await Promise.all(promiseBatches);
  for (const { records, previewedAt, publishedAt } of response) {
    if (previewedAt && publishedAt) {
      records.map((record) => {
        const product = products.find(p => p.sku === record.sku);
        state.skus[record.sku] = {
          lastPreviewedAt: previewedAt,
          hash: product?.newHash
        };
        counts.published++;
      });
    } else {
      counts.failed += records.length;
    }
    await saveState(state, aioLibs);
  }
}

/**
 * Identifies and processes products that need to be deleted
 */
async function processDeletedProducts(remainingSkus, locale, state, counts, context, adminApi, aioLibs, logger) {
  if (!remainingSkus.length) return;

  try {
    const publishedProducts = await requestSpreadsheet('published-products-index', null, context);
    const deletedProducts = publishedProducts.data.filter(({ sku }) => remainingSkus.includes(sku));

    // Process in batches
    if (deletedProducts.length) {
      // delete in batches of BATCH_SIZE, then save state in case we get interrupted
      const batches = createBatches(deletedProducts, context);
      const promiseBatches = unpublishAndDelete(batches, locale, adminApi);

      const response = await Promise.all(promiseBatches);
      for (const { records, liveUnpublishedAt, previewUnpublishedAt } of response) {
        if (liveUnpublishedAt && previewUnpublishedAt) {
          records.map((record) => {
            delete state.skus[record.sku];
            counts.unpublished++;
          });
        } else {
          counts.failed += records.length;
        }
        await saveState(state, aioLibs);
      }
    }
  } catch (e) {
    logger.error('Error processing deleted products:', e);
  }
}

async function poll(params, aioLibs) {
  checkParams(params);

  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' });
  const {
    HLX_SITE_NAME: siteName,
    HLX_PATH_FORMAT: pathFormat,
    HLX_ORG_NAME: orgName,
    HLX_CONFIG_NAME: configName,
    HLX_PRODUCTS_TEMPLATE: productsTemplate,
    authToken,
    skusRefreshInterval = 600000,
  } = params;
  const storeUrl = params.HLX_STORE_URL ? params.HLX_STORE_URL : `https://main--${siteName}--${orgName}.aem.live`;
  const contentUrl = params.HLX_CONTENT_URL ? params.HLX_CONTENT_URL : `https://main--${siteName}--${orgName}.aem.live`;
  const locales = params.HLX_LOCALES ? params.HLX_LOCALES.split(',') : [null];

  const counts = {
    published: 0, unpublished: 0, ignored: 0, failed: 0,
  };
  const sharedContext = {
    storeUrl, contentUrl, configName, logger, counts, pathFormat, productsTemplate
  };
  const timings = new Timings();
  const adminApi = new AdminAPI({
    org: orgName,
    site: siteName,
  }, sharedContext, { authToken });

  logger.info(`Starting poll from ${storeUrl} for locales ${locales}`);

  try {
    // start processing preview and publish queues
    await adminApi.startProcessing();

    const results = await Promise.all(locales.map(async (locale) => {
      const timings = new Timings();
      logger.info(`Polling for locale ${locale}`);
      // load state
      const state = await loadState(locale, aioLibs);
      timings.sample('loadedState');

      let context = { ...sharedContext };
      if (locale) {
        context = { ...context, ...mapLocale(locale, context) };
      }

      // Refresh SKUs if needed
      if (timings.now - state.skusLastQueriedAt >= skusRefreshInterval) {
        state.skusLastQueriedAt = new Date();
        const allSkusResp = await requestSaaS(GetAllSkusQuery, 'getAllSkus', {}, context);
        const allSkus = allSkusResp.data.productSearch.items
          .map(({ productView }) => productView || {})
          .filter(Boolean);

        // add new skus to state if any
        for (const sku of allSkus) {
          if (!state.skus[sku.sku]) {
            state.skus[sku.sku] = { lastPreviewedAt: new Date(0), hash: null };
          }
        }
        timings.sample('fetchedSkus');
      } else {
        timings.sample('fetchedSkus', 0);
      }

      // get last modified dates
      const skus = Object.keys(state.skus);
      const lastModifiedResp = await requestSaaS(GetLastModifiedQuery, 'getLastModified', { skus: [...skus] }, context);
      timings.sample('fetchedLastModifiedDates');
      logger.info(`Fetched last modified date for ${lastModifiedResp.data.products.length} skus, total ${skus.length}`);

      // Enrich products with metadata
      const products = await Promise.all(
        lastModifiedResp.data.products.map(product =>
          enrichProductWithMetadata(product, state, context)
        )
      );

      // Track remaining SKUs for deletion processing
      const remainingSkus = [...skus];
      products.forEach(product => {
        const { sku } = product;
        // remove the sku from the list of currently known skus
        const index = remainingSkus.indexOf(sku);
        if (index !== -1) {
          remainingSkus.splice(index, 1);
        }

        // increment count of ignored products if condition is not met
        if (!shouldProcessProduct(product)) counts.ignored += 1;
      });

      const batches = createBatches(products.filter(shouldProcessProduct), context);
      const promiseBatches = previewAndPublish(batches, locale, adminApi);
      await processPublishBatches(promiseBatches, state, counts, products, aioLibs);
      timings.sample('publishedPaths');

      // if there are still skus left, they were not in Catalog Service and may
      // have been disabled/deleted
      await processDeletedProducts(remainingSkus, locale, state, counts, context, adminApi, aioLibs, logger);
      timings.sample('unpublishedPaths', remainingSkus.length ? undefined : 0);

      return timings.measures;
    }));

    await adminApi.stopProcessing();

    // aggregate timings
    for (const measure of results) {
      for (const [name, value] of Object.entries(measure)) {
        if (!timings.measures[name]) timings.measures[name] = [];
        if (!Array.isArray(timings.measures[name])) timings.measures[name] = [timings.measures[name]];
        timings.measures[name].push(value);
      }
    }
    for (const [name, values] of Object.entries(timings.measures)) {
      timings.measures[name] = aggregate(values);
    }
    timings.measures.previewDuration = aggregate(adminApi.previewDurations);
  } catch (e) {
    logger.error(e);
    // wait for queues to finish, even in error case
    await adminApi.stopProcessing();
  }

  const elapsed = new Date() - timings.now;

  logger.info(`Finished polling, elapsed: ${elapsed}ms`);

  return {
    state: 'completed',
    elapsed,
    status: { ...counts },
    timings: timings.measures,
  };
}

module.exports = {
  poll,
  deleteState,
  loadState,
  saveState,
  getStateFileLocation,
};