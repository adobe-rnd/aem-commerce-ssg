const striptags = require('striptags');

function extractPathDetails(path) {
    if (!path) {
        return {};
    }
    // TODO: Extend to support store code as well if configured

    // Strip leading slash if present
    if (path.startsWith('/')) {
        path = path.substring(1);
    }

    const pathParts = path.split('/');
    if (pathParts.length !== 3 || pathParts[0] !== 'products') {
        // TODO: Throw error
        console.log(`Invalid path. Expected '/products/{urlKey}/{sku}', got ${path}`);
        return { storeCode: '', sku: '' };
    }

    const sku = pathParts[2].toUpperCase();

    return { sku };
}

function findDescription(product, priority = ['metaDescription', 'shortDescription', 'description']) {
    return priority
      .map(d => product[d]?.trim() || '')
      .map(d => striptags(d))
      .map(d => d.replace(/\r?\n|\r/g, ''))
      .find(d => d.length > 0) || '';
}

module.exports = { extractPathDetails, findDescription };
