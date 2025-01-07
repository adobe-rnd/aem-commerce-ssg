function renderMeta(productData) {
  const output = {
    string: '',
    appendIfExists(condition, content) {
      this.string += condition ? `${content}\n` : '';
    }
  };

  const { description, lastModifiedAt, sku, id } = productData;

  output.appendIfExists(description, `<meta name="description" content="${description}">`)
  output.appendIfExists(id, `<meta name="id" content="${id}">`)
  output.appendIfExists(sku, `<meta name="sku" content="${sku}">`)
  output.appendIfExists(lastModifiedAt, `<meta name="x-cs-lastModifiedAt" content="${lastModifiedAt}">`)
  output.string += '<meta name="type" content="og:product">';

  return output.string;
}

module.exports = renderMeta;
