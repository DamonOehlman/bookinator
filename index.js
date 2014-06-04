var async = require('async');
var bcsv = require('binary-csv');
var concat = require('concat-stream');
var path = require('path');
var fs = require('fs');
var extend = require('extend');
var mkdirp = require('mkdirp');
var handlebars = require('handlebars');

/**
  # bookinator

  A simple bit of code that does the following:

  - reads an input CSV (using the `binary-csv` module)
  - generates an SVG file using that input data and an SVG template
    file (using handlebars for template rendering)
  - automates inkscape to generate a pdf for each SVG "page"

  ## Usage

  Designed for command line use, an example command:

  ```
  bookinator -t templatefile.svg < inputcsv.csv
  ```
**/

module.exports = function(opts, callback) {
  var templateFile = path.resolve((opts || {}).template || '');
  var output = path.resolve((opts || {}).output || 'output');
  var csv = bcsv({ json: true });
  var template;

  function generatePage(data, callback) {
    var filename = path.join(output, 'page-' + data.Page + '.svg');

    async.series([
      mkdirp.bind(mkdirp, output),
      fs.writeFile.bind(fs, filename, template(data), 'utf8'),
      function(itemCallback) {
        itemCallback();
      }
    ], callback);
  }

  csv.on('error', callback);
  csv.pipe(concat(function(data) {
    fs.readFile(templateFile, { encoding: 'utf8' }, function(err, content) {
      if (err) {
        return callback(err);
      }

      // compile the template
      template = handlebars.compile(content);

      // add a page number to the data
      data = data.map(function(page, idx) {
        return extend({}, page, { Page: idx + 1 });
      });

      // generate the pages
      async.forEach(data, generatePage, callback);
    });
  }));

  return csv;
};
