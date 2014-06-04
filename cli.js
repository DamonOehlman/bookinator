#!/usr/bin/env node
var fs = require('fs');
var path = require('path');
var out = require('out');

var bookinator = require('./');
var known = {
  output: path,
  template: path
};

var shorthands = {
  o: '--output',
  t: '--template'
};

var parsed = require('nopt')(known, shorthands, process.argv, 2);
var arg = parsed.argv.remain[0];
var input;

if (process.stdin.isTTY && (! arg)) {
  return out.error('No input supplied');
}

input = (!process.stdin.isTTY || arg === '-') ? process.stdin : fs.createReadStream(arg);
input.pipe(bookinator(parsed, function(err) {
  if (err) {
    return out.error(err);
  }
}));
