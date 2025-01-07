const renderMeta = require('../actions/pdp-ssg/render-meta');

describe('renderMeta', () => {
  it('renders all meta tags correctly', () => {
  const result = renderMeta({
    description: "The Description",
    lastModifiedAt: "2023-10-01",
    sku: "12345",
    id: "67890"
  });

  expect(result).toBe(`<meta name="description" content="The Description">
<meta name="id" content="67890">
<meta name="sku" content="12345">
<meta name="x-cs-lastModifiedAt" content="2023-10-01">
<meta name="type" content="og:product">`);
});

it('renders only type meta tag when no data is provided', () => {
  const result = renderMeta({});

  expect(result).toBe(`<meta name="type" content="og:product">`);
});

it('renders only description meta tag when only description is provided', () => {
  const result = renderMeta({ description: "The Description" });

  expect(result).toBe(`<meta name="description" content="The Description">
<meta name="type" content="og:product">`);
});

it('renders only id meta tag when only id is provided', () => {
  const result = renderMeta({ id: "67890" });

  expect(result).toBe(`<meta name="id" content="67890">
<meta name="type" content="og:product">`);
});

it('renders only sku meta tag when only sku is provided', () => {
  const result = renderMeta({ sku: "12345" });

  expect(result).toBe(`<meta name="sku" content="12345">
<meta name="type" content="og:product">`);
});

it('renders only lastModifiedAt meta tag when only lastModifiedAt is provided', () => {
  const result = renderMeta({ lastModifiedAt: "2023-10-01" });

  expect(result).toBe(`<meta name="x-cs-lastModifiedAt" content="2023-10-01">
<meta name="type" content="og:product">`);
});

});
