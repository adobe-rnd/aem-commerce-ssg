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

require('dotenv').config();
const openwhisk = require('openwhisk');
const { exit, env } = require('process');
const { program } = require('commander');
const vega = require('vega');
const vegaLite = require('vega-lite');
const fs = require('fs');

const {
  AIO_RUNTIME_NAMESPACE,
  AIO_RUNTIME_AUTH,
} = env;

if (!AIO_RUNTIME_NAMESPACE || !AIO_RUNTIME_AUTH) {
  console.log('Missing required environment variables AIO_RUNTIME_AUTH and AIO_RUNTIME_NAMESPACE');
  exit(1);
}

const actionName = 'poller';
const opts = {};
const ow = openwhisk({
  apihost: 'https://adobeioruntime.net',
  api_key: AIO_RUNTIME_AUTH,
  namespace: AIO_RUNTIME_NAMESPACE,
});

function generateChart(rawData, filename) {
  // eslint-disable-next-line no-unused-vars
  const processedData = rawData.flatMap(([id, startDate, duration, state, failed, ignored, published, unpublished, previewDuration]) => [
    { date: startDate, value: failed, metric: 'Failed', type: 'count' },
    { date: startDate, value: published, metric: 'Published', type: 'count' },
    { date: startDate, value: unpublished, metric: 'Unpublished', type: 'count' },
    { date: startDate, value: duration, metric: 'Duration', type: 'duration' }
  ]);

  const spec = {
    "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
    "width": 4096,
    "height": 2048,
    "data": { "values": processedData },
    "encoding": {
      "x": {
        "field": "date",
        "type": "temporal",
        "axis": { "title": "Date" }
      }
    },
    "layer": [
      {
        "transform": [{ "filter": "datum.type === 'count'" }],
        "mark": "line",
        "encoding": {
          "y": {
            "field": "value",
            "type": "quantitative",
            "axis": { "title": "Count" }
          },
          "color": {
            "field": "metric",
            "type": "nominal",
            "legend": { "title": "Metrics (Count)" },
            "scale": {
              "domain": ["Failed", "Published", "Unpublished"],
              "range": ["#ff0000", "#00ff00", "#0000ff"]
            }
          }
        }
      },
      {
        "transform": [{ "filter": "datum.type === 'duration'" }],
        "mark": {
          "type": "line",
          "strokeDash": [4, 4]
        },
        "encoding": {
          "y": {
            "field": "value",
            "type": "quantitative",
            "axis": { "title": "Duration (ms)" },
            "scale": { "zero": true }
          },
          "color": {
            "field": "metric",
            "type": "nominal",
            "scale": {
              "domain": ["Duration"],
              "range": ["#FFA500"]
            },
            "legend": { "title": "Duration" }
          }
        }
      }
    ],
    "resolve": {
      "scale": {
        "y": "independent",
        "color": "independent"  // Add this to resolve color scale conflicts
      }
    }
  };


  const vegaSpec = vegaLite.compile(spec).spec;
  const view = new vega.View(vega.parse(vegaSpec), { renderer: 'none' });

  const format = filename.split('.').pop();

  if (format === 'svg') {
    view.toSVG()
      .then(function (svg) {
        fs.writeFileSync(filename, svg);
        console.log('Chart has been generated successfully as SVG!');
      })
      .catch(console.error);
  } else {
    console.error('Invalid file format. Please choose either png or svg.');
    exit(1);
  }
}

async function* listActivations() {
  const { activations } = await ow.activations.list({ count: true, ...opts });
  for (let limit = 50, skip = 0, retry = true; skip < activations; skip += limit) {
    let activations;
    try {
      activations = await ow.activations.list({ limit, skip, ...opts });
    } catch (e) {
      if (retry) {
        // retry only once
        retry = false;
        continue;
      }
      throw e;
    }

    for (const activation of activations) {
      yield activation;
    }
  }
}

async function downloadActivations() {
  program
    .option('-d, --date <YYYY-MM-DD>', 'Select data for a specific day')
    .option('-c, --chart <chart_filename.svg>', 'Generate a chart from the data, showing latency distribution and correlation with other factors. Generates JSON file with corresponding data series.')
    .option('-h, --help', 'Display help for cli')
    .option('-f, --file <records_filename.{csv,json}>', 'The filename to save the records, JSON and CSV formats are supported.');

  program.parse(process.argv);
  const options = program.opts();

  if (options.help) {
    program.help();
  }

  // Defaults to today
  const targetDate = new Date();
  targetDate.setHours(0, 0, 0, 0);

  if (options.date) {
    const parsedDate = new Date(options.date);
    if (isNaN(parsedDate)) {
      console.log('Invalid date format. Please use YYYY-MM-DD.');
      exit(1);
    }
    targetDate.setTime(parsedDate.getTime());
  }

  let filename = options.file;

  if (!filename) {
    filename = `poller-stats-${targetDate.getFullYear()}-${targetDate.getMonth() < 10 ? '0' : ''}${targetDate.getMonth() + 1}`
      + `-${targetDate.getDate() < 10 ? '0' : ''}${targetDate.getDate()}.json`;
  }

  let format = filename.split('.').pop();

  if (options.chart && format !== 'json') {
    // force JSON format for chart data
    format = 'json';
  }

  console.log(`Saving activations to ${filename}...`);

  if (format === 'json') {
    fs.writeFileSync(filename, '[');
  } else if (format === 'csv') {
    fs.writeFileSync(filename, 'activationId,startDate,duration,state,failed,ignored,published,unpublished,previewDuration\n');
  } else {
    console.error('Invalid file format. Please choose either csv or json.');
    exit(1);
  }

  for await (const activation of listActivations()) {
    const { name, duration, activationId, start } = activation;

    if (actionName === name) {
      const startDate = new Date(start)
        .toISOString()
        .replace('T', ' ')
        .replace(/\.\d+Z$/, '');

      const activationDate = new Date(startDate);

      let result;
      try {
        result = await ow.activations.result({ name: activationId });
        // eslint-disable-next-line no-unused-vars
      } catch (e) {
        // ignore and retry
        result = await ow.activations.result({ name: activationId });
      }

      // skip skipped and activations before today, if requested
      if (!result?.result ||
        result.result.state === 'skipped' ||
        activationDate.toDateString() !== targetDate.toDateString()) {
        continue;
      }

      const { state, status = {}, timings = {} } = result.result;
      const { failed, ignored, published, unpublished } = status;
      const { previewDuration } = timings;

      const columns = [
        activationId,
        startDate,
        duration,
        state,
        failed,
        ignored,
        published,
        unpublished,
        previewDuration?.avg || 0
      ];

      if (format === 'json') {
        fs.appendFileSync(filename, JSON.stringify(columns) + ',');
      } else {
        fs.appendFileSync(filename, `${columns.join(',')}\n`);
      }
    }
  }
  if (format === 'json') {
    // remove trailing comma
    const data = fs
      .readFileSync(filename, 'utf8')
      .replace(/,$/, '');
    fs.writeFileSync(filename, data);
    fs.appendFileSync(filename, ']');
  }

  if (options.chart) {
    generateChart(JSON.parse(fs.readFileSync(filename)), options.chart);
  }
}

downloadActivations();
