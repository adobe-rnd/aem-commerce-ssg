const getUnpublishedReplacements = (adunpublishedattributes) => {
  if (!adunpublishedattributes) return null

  const unpublishedAttributes = JSON.parse(adunpublishedattributes)
  const directReplacementProduct = unpublishedAttributes?.directReplacementProduct
    ? [unpublishedAttributes.directReplacementProduct]
    : []
  const alternativeProducts = unpublishedAttributes?.alternativeProducts || []
  return [...directReplacementProduct, ...alternativeProducts].reduce((acc, product) => {
    if (product.status === 'ACTIVE' && !acc.find((p) => p.productCode === product.productCode)) {
      acc.push(product)
    }
    return acc
  }, [])
}

module.exports = { getUnpublishedReplacements }
