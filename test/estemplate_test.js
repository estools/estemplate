'use strict';

var estemplate = require('../lib/estemplate.js');
var parse = require('esprima').parse;
var generate = require('escodegen').generate;
var readFile = require('fs').readFile;

exports.estemplate = {
  'simple substitution': function (test) {
    var ast = estemplate('var <%= varName %> = <%= value %> + 1;', {
      varName: {type: 'Identifier', name: 'myVar'},
      value: {type: 'Literal', value: 123}
    });

    test.equal(generate(ast), 'var myVar = 123 + 1;');

    test.done();
  },

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

  'array spread': function (test) {
    var ast = estemplate('var a = [%= items %];', {
      items: [{type: 'Literal', value: 123}, {type: 'Literal', value: 456}]
    });

    test.equal(generate(ast), 'var a = [\n    123,\n    456\n];');

    test.done();
  },

  'call arguments spread': function (test) {
    var ast = estemplate('var x = f(%= items %);', {
      items: [{type: 'Literal', value: 123}, {type: 'Literal', value: 456}]
    });

    test.equal(generate(ast), 'var x = f(123, 456);');

    test.done();
  },

  'function declaration params spread': function (test) {
    var ast = estemplate('function f(%= params %) {}', {
      params: [{type: 'Identifier', name: 'a'}, {type: 'Identifier', name: 'b'}]
    });

    test.equal(generate(ast), 'function f(a, b) {\n}');

    test.done();
  },

  'block spread': function (test) {
    var ast = estemplate('define(function () {%= body %});', {
      body: parse('module.exports = require("./module").property;').body
    });

    test.equal(generate(ast), 'define(function () {\n    module.exports = require(\'./module\').property;\n});');

    test.done();
  }
};
