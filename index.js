var async = require('async');
var bcsv = require('binary-csv');
var concat = require('concat-stream');
var path = require('path');
var fs = require('fs');
var extend = require('extend');
var mkdirp = require('mkdirp');
var handlebars = require('handlebars');
var formatter = require('formatter');
var pageFile = formatter('page-{{ Page|len:2:0 }}');
var exec = require('child_process').exec;

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

  This will generate a number of paged pdf files in the `output` folder, and
  you then use a tool such as
  [pdftk](http://www.ubuntuhowtos.com/howtos/merge_pdf_files) to concatenate
  the files together in a single document:

  ```
  pdftk output/page-*.pdf cat output merged.pdf
  ```
**/

module.exports = function(opts, callback) {
  var templateFile = path.resolve((opts || {}).template || '');
  var output = path.resolve((opts || {}).output || 'output');
  var csv = bcsv({ json: true });
  var template;

  function generatePage(data, callback) {
    var filename = path.join(output, pageFile(data));

    async.series([
      mkdirp.bind(mkdirp, output),
      fs.writeFile.bind(fs, filename + '.svg', template(data), 'utf8'),
      exec.bind(null, 'inkscape -z -d 300 -f ' + filename + '.svg -A ' + filename + '.pdf'),
      fs.unlink.bind(fs, filename + '.svg')
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
