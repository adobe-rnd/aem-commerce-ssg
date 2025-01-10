require('dotenv').config();

const { performSaaSQuery } = require('../../actions/check-product-changes/lib/commerce')
const { queries } = require('../../actions/check-product-changes/lib/commerce');

async function main() {
    //TODO: fetch from app.config.yaml (incl. mapped env vars)?
    const {
        COMMERCE_STORE_CODE: storeCode,
        COMMERCE_STORE_URL: storeUrl,
        COMMERCE_CONFIG_NAME: configName,
    // eslint-disable-next-line no-undef
    } = process.env;
    const context = { storeUrl, storeCode, configName };
    const storeCodePrefix = storeCode ? `/${storeCode}` : '';
    const { total: actualCount } = await (await fetch(`${storeUrl}${storeCodePrefix}/published-products-index.json`)).json();
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