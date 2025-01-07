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

module.exports = { extractPathDetails };