/*
 * estemplate
 * https://github.com/RReverser/estemplate
 *
 * Copyright (c) 2014 Ingvar Stepanyan
 * Licensed under the MIT license.
 */

'use strict';

var parse = require('esprima').parse;
var estraverse = require('estraverse');
var reCode = /(.)%(=?)\s+([\s\S]+?)\s+%(.)/g;
var reInternalVar = /^__ASTER_DATA_\d+$/;
var reInternalMarker = /\"(__ASTER_DATA_\d+)\"/g;

function tmpl(str, options, data) {
	if (!data) {
		data = options;
		options = undefined;
	}
	return tmpl.compile(str, options)(data);
}

function isInternalVar(node) {
	return node.type === 'Identifier' && reInternalVar.test(node.name);
}

function isInternalStmt(node) {
	return node.type === 'ExpressionStatement' && typeof node.expression === 'string';
}

var brackets = {
	'<': '>',
	'[': ']',
	'(': ')',
	'{': '}'
};

var spread = {
	'ArrayExpression': 'elements',
	'CallExpression': 'arguments',
	'BlockStatement': 'body',
	'FunctionExpression': 'params',
	'FunctionDeclaration': 'params'
};

function fixAST(ast) {
	estraverse.traverse(ast, {
		enter: function (node) {
			var propName = spread[node.type];
			if (propName) {
				var propValue = node[propName];
				if (propValue.length === 1 && propValue[0].type === '...') {
					node[propName] = propValue[0].argument;
				}
			}
		}
	});
	return ast;
}

tmpl.compile = function (str, options) {
	var code = [],
		index = 0;

	var ast = parse(str.replace(reCode, function (match, open, isEval, codePart, close) {
		var expectedClose = brackets[open];
		if (!expectedClose || expectedClose !== close) {
			return match;
		}
		if (isEval) {
			var varName = '__ASTER_DATA_' + (index++);
			var isSpread = open !== '<';
			if (isSpread) {
				codePart = '{type: "...", argument: ' + codePart + '}';
			}
			code.push('\t\tvar ' + varName + ' = ' + codePart);
			return isSpread ? (open + varName + close) : varName;
		} else {
			code.push(codePart);
			return '';
		}
	}), options);

	ast = estraverse.replace(ast, {
		leave: function (node) {
			if (isInternalVar(node)) {
				return node.name;
			}

			if (isInternalStmt(node)) {
				return node.expression;
			}
		}
	});

	code.unshift(
		'return function template(data) {',
		'\twith (data) {'
	);

	code.push(
		'\t}',
		'\treturn fixAST(' + JSON.stringify(ast).replace(reInternalMarker, '$1') + ')',
		'}'
	);

	return new Function('fixAST', code.join('\n'))(fixAST);
};

module.exports = tmpl;