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