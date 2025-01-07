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

function getProductUrl(urlKey, sku, context) {
  const { storeUrl } = context;
  return `${storeUrl}/products/${urlKey}/${sku}`;
}

function findDescription(product, priority = ['metaDescription', 'shortDescription', 'description']) {
  return priority
    .map(d => product[d]?.trim() || '')
    .map(d => striptags(d))
    .map(d => d.replace(/\r?\n|\r/g, ''))
    .find(d => d.length > 0) || '';
}

function getPrimaryImage(product, role = 'image') {
  if (role) {
    return product.images.find(img => img.roles.includes(role));
  }

  return product.images.length > 0 ? product.images[0] : null;
}

module.exports = { extractPathDetails, getProductUrl, findDescription, getPrimaryImage };