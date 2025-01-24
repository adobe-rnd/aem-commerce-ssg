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

const BATCH_SIZE = 50;

async function loadState(locale, stateMgr) {
  const stateKey = locale ? `${locale}` : 'default';
  const stateData = await stateMgr.get(stateKey);
  if (!stateData?.value) {
    return {
      locale,
      skusLastQueriedAt: new Date(0),
      skus: {},
    };
  }
  // the format of the state object is:
  // <timestamp>,<sku1>,<timestamp>,<sku2>,<timestamp>,<sku3>,...,<timestamp>
  // the first timestamp is the last time the SKUs were fetched from Adobe Commerce
  // folloed by a pair of SKUs and timestamps which are the last preview times per SKU
  const [catalogQueryTimestamp, ...skus] = stateData && stateData.value ? stateData.value.split(',') : [0];
  return {
    locale,
    skusLastQueriedAt: new Date(parseInt(catalogQueryTimestamp)),
    skus: Object.fromEntries(skus
      .map((sku, i, arr) => (i % 2 === 0 ? [sku, new Date(parseInt(arr[i + 1]))] : null))
      .filter(Boolean)),
  };
}

async function saveState(state, stateMgr) {
  let { locale } = state;
  if (!locale) {
    locale = 'default';
  }
  const stateKey = `${locale}`;
  const stateData = [
    state.skusLastQueriedAt.getTime(),
    ...Object.entries(state.skus).flatMap(([sku, lastPreviewedAt]) => [sku, lastPreviewedAt.getTime()]),
  ].join(',');
  await stateMgr.put(stateKey, stateData);
}

/**
 * Checks the Adobe Commerce store for product changes, performs
 * preview/publish/delete operstions if needed, then updates the
 * state accordingly.
 *
 * @param {Object} params - The parameters object.
 * @param {string} params.HLX_SITE_NAME - The name of the site (repo or repoless).
 * @param {string} params.HLX_PATH_FORMAT - The URL format for product detail pages.
 * @param {string} params.PLPURIPrefix - The URI prefix for Product List Pages.
 * @param {string} params.HLX_ORG_NAME - The name of the organization.
 * @param {string} params.HLX_CONFIG_NAME - The name of the configuration json/xlsx.
 * @param {number} [params.requestPerSecond=5] - The number of requests per second allowed by the throttling logic.
 * @param {string} params.authToken - The authentication token.
 * @param {number} [params.skusRefreshInterval=600000] - The interval for refreshing SKUs in milliseconds.
 * @param {string} [params.HLX_STORE_URL] - The store's base URL.
 * @param {string} [params.HLX_LOCALES] - Comma-separated list of allowed locales.
 * @param {string} [params.LOG_LEVEL] - The log level.
 * @param {Object} stateMgr - The StateManager instance object.
 * @returns {Promise<Object>} The result of the polling action.
 */
function checkParams(params) {
  const requiredParams = ['HLX_SITE_NAME', 'HLX_PATH_FORMAT', 'PLPURIPrefix', 'HLX_ORG_NAME', 'HLX_CONFIG_NAME', 'authToken'];
  const missingParams = requiredParams.filter(param => !params[param]);
  if (missingParams.length > 0) {
    throw new Error(`Missing required parameters: ${missingParams.join(', ')}`);
  }

  if (params.HLX_STORE_URL && !isValidUrl(params.HLX_STORE_URL)) {
    throw new Error('Invalid storeUrl');
  }
}

async function deleteBatch({ counts, batch, state, adminApi }) {
  return Promise.all(batch.map(async ({ path, sku }) => {
    const result = await adminApi.unpublishAndDelete({ path, sku });
    if (result.deletedAt) {
      counts.unpublished++;
    } else {
      counts.failed++;
    }
    // always delete the sku from the state if it needs to be re-published this will happen automatically.
    // If we remove it only if the delete was successful we might end up with a sku that is the state
    // but was not fully un-published
    delete state.skus[sku];
  }));
}

function shouldProcessProduct(product) {
  const { urlKey, lastModifiedDate, lastPreviewDate } = product;
  return urlKey?.match(/^[a-zA-Z0-9-]+$/) && lastModifiedDate >= lastPreviewDate;
}

async function poll(params, stateMgr) {
  checkParams(params);

  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' });
  const {
    HLX_SITE_NAME: siteName,
    HLX_PATH_FORMAT: pathFormat,
    HLX_ORG_NAME: orgName,
    HLX_CONFIG_NAME: configName,
    requestPerSecond = 5,
    authToken,
    skusRefreshInterval = 600000,
  } = params;
  const storeUrl = params.HLX_STORE_URL ? params.HLX_STORE_URL : `https://main--${siteName}--${orgName}.aem.live`;
  const locales = params.HLX_LOCALES ? params.HLX_LOCALES.split(',') : [null];

  const counts = {
    published: 0, unpublished: 0, ignored: 0, failed: 0,
  };
  const sharedContext = {
    storeUrl, configName, logger, counts, pathFormat,
  };
  const timings = new Timings();
  const adminApi = new AdminAPI({
    org: orgName,
    site: siteName,
  }, sharedContext, { requestPerSecond, authToken });

  logger.info(`Starting poll from ${storeUrl} for locales ${locales}`);

  try {
    // start processing preview and publish queues
    await adminApi.startProcessing();

    const results = await Promise.all(locales.map(async (locale) => {
      const timings = new Timings();
      // load state
      const state = await loadState(locale, stateMgr);
      timings.sample('loadedState');

      let context = { ...sharedContext };
      if (locale) {
        context = { ...context, ...mapLocale(locale, context) };
      }

      // setup preview / publish queues

      // get all skus
      // check if the skus were last queried within the last 10 minutes
      if (timings.now - state.skusLastQueriedAt >= skusRefreshInterval) {
        state.skusLastQueriedAt = new Date();
        const allSkusResp = await requestSaaS(GetAllSkusQuery, 'getAllSkus', {}, context);
        const allSkus = allSkusResp.data.productSearch.items
          .map(({ productView }) => productView || {})
          .filter(Boolean);
        // add new skus to state if any
        for (const sku of allSkus) {
          if (!state.skus[sku]) {
            state.skus[sku] = new Date(0);
          }
        }
        timings.sample('fetchedSkus');
      } else {
        timings.sample('fetchedSkus', 0);
      }

      // get last modified dates
      const skus = Object.keys(state.skus);
      const lastModifiedResp = await requestSaaS(GetLastModifiedQuery, 'getLastModified', { skus }, context);
      timings.sample('fetchedLastModifiedDates');
      logger.info(`Fetched last modified date for ${lastModifiedResp.data.products.length} skus, total ${skus.length}`);

      // group preview in batches of 50
      let products = lastModifiedResp.data.products
        .map((product) => {
          const { sku, lastModifiedAt } = product;
          const lastPreviewedAt = state.skus[sku] || 0;
          const lastPreviewDate = new Date(lastPreviewedAt);
          const lastModifiedDate = new Date(lastModifiedAt);

          return { ...product, lastModifiedDate, lastPreviewDate };
        }) // inject the lastModifiedDate and lastPreviewDate into the product object

      products.forEach((product) => {
        const { sku } = product;
        // remove the sku from the list of currently known skus
        skus.splice(skus.indexOf(sku), 1);

        // increment count of ignored products if condition is not met
        if (!shouldProcessProduct(product)) counts.ignored += 1;
      })

      const batches = products.filter(shouldProcessProduct)
        .reduce((acc, product, i, arr) => {
          const { sku, urlKey } = product;
          const path = getProductUrl({ urlKey, sku }, context, false).toLowerCase();
          const req = adminApi.previewAndPublish({ path, sku });
          acc.push(req);
          if (acc.length === BATCH_SIZE || i === arr.length - 1) {
            return [...acc];
          }
          return acc;
        });

      // preview batches , then save state in case we get interrupted
      for (const batch of batches) {
        const response = await Promise.all(batch);
        for (const { sku, previewedAt, publishedAt } of response) {
          if (previewedAt && publishedAt) {
            state.skus[sku] = previewedAt;
            counts.published++;
          } else {
            counts.failed++;
          }
        }
        await saveState(state, stateMgr);
      }

      timings.sample('publishedPaths');

    // if there are still skus left, they were not in Catalog Service and may
    // have been disabled/deleted
    if (skus.length) {
      try {
        const publishedProducts = await requestSpreadsheet('published-products-index', null, context);
        // if any of the indexed PDPs is in the remaining list of skus that were not returned by the catalog service
        // consider them deleted
        const deletedProducts = publishedProducts.data.filter(({ sku }) => skus.includes(sku));
        // we batch the deleted products to avoid the risk of HTTP 429 from the AEM Admin API
        if (deletedProducts.length) {
          // delete in batches of BATCH_SIZE, then save state in case we get interrupted
          let batch = [];
          for (const product of deletedProducts) {
            batch.push(product);
            if (batch.length === BATCH_SIZE) {
              // deleteBatch has side effects on state and counts, by design
              await deleteBatch({ counts, batch, state, adminApi });
              batch = [];
            }
          }
          if (batch.length > 0) {
            await deleteBatch({ counts, batch, state, adminApi });
          }
          // save state after deletes
          await saveState(state, stateMgr);
        }
      } catch (e) {
        // in case the index doesn't yet exist or any other error
        logger.error(e);
      }

      timings.sample('unpublishedPaths');
    } else {
      timings.sample('unpublishedPaths', 0);
    }

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

module.exports = { poll, loadState, saveState };