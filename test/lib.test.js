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

const { findDescription, getPrimaryImage, extractPathDetails, getProductUrl } = require('../actions/pdp-renderer/lib');

describe('lib', () => {
    test('findDescription', () => {
        const product = {
            metaDescription: 'Meta description',
            shortDescription: 'Short description',
            description: 'Full description'
        };

        expect(findDescription(product)).toBe('Meta description');
        expect(findDescription(product, ['shortDescription', 'description'])).toBe('Short description');
        expect(findDescription({ ...product, shortDescription: null }, ['shortDescription', 'description'])).toBe('Full description');
        expect(findDescription({}, ['description'])).toBe('');
    });

    test('getPrimaryImage', () => {
        const product = {
            images: [
                { url: 'image1.jpg', roles: ['thumbnail'] },
                { url: 'image2.jpg', roles: ['image'] },
                { url: 'image3.jpg', roles: ['image', 'thumbnail'] }
            ]
        };

        expect(getPrimaryImage(product)).toEqual({ url: 'image2.jpg', roles: ['image'] });
        expect(getPrimaryImage(product, 'thumbnail')).toEqual({ url: 'image1.jpg', roles: ['thumbnail'] });
        expect(getPrimaryImage(null)).toBeUndefined();
        expect(getPrimaryImage({})).toBeUndefined();
        expect(getPrimaryImage({ images: [] })).toBeUndefined();
    });

    test('extractPathDetails', () => {
        expect(extractPathDetails('/products/urlKey/sku')).toEqual({ sku: 'SKU' });
        expect(extractPathDetails('products/urlKey/sku')).toEqual({ sku: 'SKU' });
        expect(() => extractPathDetails('/products/urlKey/sku/extra')).toThrow(`Invalid path. Expected '/products/{urlKey}/{sku}'`);
        expect(() => extractPathDetails('/product/urlKey/sku')).toThrow(`Invalid path. Expected '/products/{urlKey}/{sku}'`);
        expect(extractPathDetails('')).toEqual({});
        expect(extractPathDetails(null)).toEqual({});
    });

    test('getProductUrl', () => {
        const context = { storeUrl: 'https://example.com' };
        expect(getProductUrl('urlKey', 'sku', context)).toBe('https://example.com/products/urlKey/sku');
    });
});