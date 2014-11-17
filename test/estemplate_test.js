'use strict';

var estemplate = require('../lib/estemplate.js');
var parse = require('esprima').parse;
var generate = require('escodegen').generate;
var genOpts = {
  format: {
    indent: {
      style: ''
    },
    newline: ' ',
    quotes: 'double'
  }
};
var readFile = require('fs').readFile;

function tmplTest(tmpl, data, code) {
  return function (test) {
    var ast = estemplate(tmpl, data);
    test.equal(generate(ast, genOpts), code);
    test.done();
  };
}

exports.estemplate = {
  'ast locations': function (test) {
    var ast = estemplate('define(function () { <%= stmt %> });', {loc: true, source: 'template.jst'}, {
      stmt: parse('module.exports = require("./module").property;', {loc: true, source: 'source.js'}).body[0]
    });

    readFile(__dirname + '/custom_options.ast.json', 'utf-8', function (err, expectedAstJson) {
      if (err) {
        throw err;
      }

      var expectedAst = JSON.parse(expectedAstJson);

      test.deepEqual(ast, expectedAst);
      test.done();
    });
  },

  'simple substitution': tmplTest('var <%= varName %> = <%= value %> + 1;', {
    varName: {type: 'Identifier', name: 'myVar'},
    value: {type: 'Literal', value: 123}
  }, 'var myVar = 123 + 1;'),

  spread: {
    'array elements': tmplTest('var a = [%= items %];', {
      items: [{type: 'Literal', value: 123}, {type: 'Literal', value: 456}]
    }, 'var a = [ 123, 456 ];'),

    'call arguments': tmplTest('var x = f(%= items %);', {
      items: [{type: 'Literal', value: 123}, {type: 'Literal', value: 456}]
    }, 'var x = f(123, 456);'),

    'function params': tmplTest('function f(%= params %) {}', {
      params: [{type: 'Identifier', name: 'a'}, {type: 'Identifier', name: 'b'}]
    }, 'function f(a, b) { }'),

    'block statements': tmplTest('define(function () {%= body %});', {
      body: parse('module.exports = require("./module").property;').body
    }, 'define(function () { module.exports = require("./module").property; });'),

    'literals': tmplTest('var a = "%= x %"; var b = \'%= y %\';', {
      x: 'alpha',
      y: 'beta'
    }, 'var a = "alpha"; var b = "beta";'),

    'concatenate with inline elements': {
      'in the beginning': tmplTest('var a = [123, %= items %];', {
        items: [{type: 'Literal', value: 456}, {type: 'Literal', value: 789}]
      }, 'var a = [ 123, 456, 789 ];'),

      'in the end': tmplTest('function f(%= params %, callback) {}', {
        params: [{type: 'Identifier', name: 'a'}, {type: 'Identifier', name: 'b'}]
      }, 'function f(a, b, callback) { }'),

      'around': tmplTest('function f() { console.time("module"); %= body %; console.timeEnd("module"); }', {
        body: parse('init(); doSmth(); finalize();').body
      }, 'function f() { console.time("module"); init(); doSmth(); finalize(); console.timeEnd("module"); }'),

      'in between': tmplTest('function f() { %= init %; doSmth(); %= finalize %; }', {
        init: parse('console.time("module"); init();').body,
        finalize: parse('finalize(); console.timeEnd("module");').body
      }, 'function f() { console.time("module"); init(); doSmth(); finalize(); console.timeEnd("module"); }')
    }
  }
};
