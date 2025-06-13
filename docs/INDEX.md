# AEM Commerce Prerender

Pluggable prerendering stack for ahead-of-time data fetching and embedding in Product Pages and framework for definining rendering templates and rules.

* ⚡️ Boost SEO by pre-rendering human-readable product data in the markup
* 💉 Inject JSON-LD Structured data in the page source code
* 📈 Aggregate data sources and inject resulting data ahead-of-time
* ⚙️ Define your custom rendering logic
* 🧠 Offload intensive computation to the rendering phase

## Getting started

  Setup of prerequisites and Edge Delivery Services is guided and some steps are automated.

  1. After cloning the repo, run `npx setup`
  1. Follow the steps to setup prerequisites and perform the initial setup
  1. Customise the code that contains the rendering logic according to your requirements, for [structured data](/actions/pdp-renderer/ldJson.js), [markup](/actions/pdp-renderer/render.js) and [templates](https://github.com/adobe-rnd/aem-commerce-prerender/tree/main/actions/pdp-renderer/templates)
  1. Deploy the solution with `aio app deploy`

### What's next?
 You might want to check out the [instructions and guidelines](./POST-SETUP.md) around operation and maintenance of the solution

## Considerations & Use Cases
 Few considerations around advantages, use cases and prerequisites are available in the [dedicated page](./USE-CASES.md)