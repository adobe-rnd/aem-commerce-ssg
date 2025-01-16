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

require('dotenv').config();

const { performSaaSQuery, queries } = require('../actions/check-product-changes/lib/commerce');
const { getSpreadsheet } = require('../actions/check-product-changes/lib/aem');

async function main() {
    // TODO: fetch from app.config.yaml (incl. mapped env vars)?
    // https://jira.corp.adobe.com/browse/SITES-28254
    const {
        COMMERCE_STORE_CODE: storeCode,
        COMMERCE_STORE_URL: storeUrl,
        COMMERCE_CONFIG_NAME: configName,
    // eslint-disable-next-line no-undef
    } = process.env;

    const context = { storeCode, storeUrl, configName };
    const { total: actualCount } = await getSpreadsheet('published-products-index', context);
    let [productsCount, currentPage, expectedCount] = [-1, 1, 0];
    while (productsCount !== 0) {
        const { data: { productSearch: { items: products } } } = await performSaaSQuery(queries.getAllSkusPaginated, 'getAllSkusPaginated', { currentPage }, context);
        productsCount = products.length;
        expectedCount += productsCount;
        currentPage++;
    }

    if (actualCount !== expectedCount) {
        throw new Error(`Expected ${expectedCount} products, but found ${actualCount} products`);
    }
}

main().catch(console.error);