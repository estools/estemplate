'use strict';

var estemplate = require('../lib/estemplate.js');
var parse = require('esprima').parse;
var generate = require('escodegen').generate;
var readFile = require('fs').readFile;

function tmplTest(tmpl, data, code) {
  return function (test) {
    var ast = estemplate(tmpl, data);
    test.equal(generate(ast), code);
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

  'array spread': tmplTest('var a = [%= items %];', {
    items: [{type: 'Literal', value: 123}, {type: 'Literal', value: 456}]
  }, 'var a = [\n    123,\n    456\n];'),

  'call arguments spread': tmplTest('var x = f(%= items %);', {
    items: [{type: 'Literal', value: 123}, {type: 'Literal', value: 456}]
  }, 'var x = f(123, 456);'),

  'function declaration params spread': tmplTest('function f(%= params %) {}', {
    params: [{type: 'Identifier', name: 'a'}, {type: 'Identifier', name: 'b'}]
  }, 'function f(a, b) {\n}'),

  'block spread': tmplTest('define(function () {%= body %});', {
    body: parse('module.exports = require("./module").property;').body
  }, 'define(function () {\n    module.exports = require(\'./module\').property;\n});')
};
