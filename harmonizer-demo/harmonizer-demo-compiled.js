/* compiled with quickstart@0.10.0-dev */(function (main, modules) {
  'use strict';
  var cache = require.cache = {};
  function require(id) {
    var module = cache[id];
    if (!module) {
      var moduleFn = modules[id];
      if (!moduleFn)
        throw new Error('module ' + id + ' not found');
      module = cache[id] = {};
      var exports = module.exports = {};
      moduleFn.call(exports, require, module, exports, window);
    }
    return module.exports;
  }
  require.resolve = function (resolved) {
    return resolved;
  };
  require.node = function () {
    return {};
  };
  require(main);
}('./index.js', {
  './index.js': function (require, module, exports, global) {
    'use strict';
    var throttle = require('./util/throttle.js');
    var $ = require('../../../node_modules/elements/index.js');
    var ready = require('../../../node_modules/elements/domready.js');
    var harmonize = require('../../../node_modules/harmonizer/index.js').transform;
    var esprima = require('../../../node_modules/esprima/esprima.js');
    var escodegen = require('../../../node_modules/escodegen/escodegen.js');
    var tosource = require('../../../node_modules/tosource/tosource.js');
    Object.defineProperty(Array.prototype, '@@iterator', {
      writable: true,
      configurable: true,
      value: function () {
        var array = this, i = 0;
        var next = function () {
          if (i === array.length)
            return {
              value: void 0,
              done: true
            };
          return {
            value: array[i++],
            done: false
          };
        };
        var it = { next: next };
        it['@@iterator'] = function () {
          return it;
        };
        return it;
      }
    });
    var generate = function (object) {
      return escodegen.generate(object, {
        format: {
          indent: { style: '  ' },
          quotes: 'single'
        }
      });
    };
    var destruct = function (string) {
      return new Function('return ' + string)();
    };
    var inspect = function (object) {
      var inspected = tosource(object);
      var parsed = esprima.parse('(' + inspected + ')');
      return generate(parsed);
    };
    var createEditor = function (node, mode, hideLine, readOnly) {
      var editor = ace.edit(node.id());
      editor.setTheme('ace/theme/tomorrow');
      editor.setShowPrintMargin(false);
      editor.setOption('showLineNumbers', false);
      if (hideLine)
        editor.setHighlightActiveLine(false);
      if (readOnly)
        editor.setReadOnly(true);
      var editorSession = editor.getSession();
      editorSession.setMode('ace/mode/' + mode);
      editorSession.setTabSize(2);
      editorSession.setUseSoftTabs(true);
      editorSession.setUseWrapMode(false);
      editorSession.setUseWorker(false);
      var throttled = throttle.timeout(function () {
          editorSession._emit('throttled-change');
        });
      editorSession.on('change', throttled);
      return editor;
    };
    ready(function () {
      var es6CodeNode = $('#es6-code');
      var es5CodeNode = $('#es5-code');
      var es6AstNode = $('#es6-ast');
      var es5AstNode = $('#es5-ast');
      var es6CodeEditor = createEditor(es6CodeNode, 'javascript');
      var es6CodeSession = es6CodeEditor.getSession();
      var es5CodeEditor = createEditor(es5CodeNode, 'javascript', true);
      var es5CodeSession = es5CodeEditor.getSession();
      var es6AstEditor = createEditor(es6AstNode, 'javascript', true);
      var es6AstSession = es6AstEditor.getSession();
      var es5AstEditor = createEditor(es5AstNode, 'javascript', true);
      var es5AstSession = es5AstEditor.getSession();
      var es6AstString, es5AstString, es6CodeString, es5CodeString;
      var es6AstObject, es5AstObject;
      var es6CodeChange = false;
      var es6AstChange = false;
      es6CodeSession.on('throttled-change', function () {
        es6CodeChange = true;
        var es6CodeString = es6CodeEditor.getValue();
        localStorage.setItem('code', es6CodeString);
        try {
          es6AstObject = esprima.parse(es6CodeString);
          es6AstEditor.setValue(inspect(es6AstObject), -1);
        } catch (e) {
          es6AstObject = false;
          es6AstEditor.setValue(e.message, -1);
        }
      });
      var harmonizationError;
      es6AstSession.on('throttled-change', function () {
        es6AstChange = true;
        if (es6AstObject === false) {
          es5AstObject = false;
          es5AstEditor.setValue(null, -1);
        } else {
          if (!es6CodeChange)
            try {
              es6AstObject = destruct(es6AstEditor.getValue());
            } catch (e) {
              es5AstObject = false;
              es5AstEditor.setValue(e.message, -1);
              return;
            }
          try {
            es5AstObject = harmonize(es6AstObject);
            es5AstEditor.setValue(inspect(es5AstObject), -1);
          } catch (e) {
            harmonizationError = e;
            es5AstObject = false;
            es5AstEditor.setValue(e.message, -1);
          }
        }
        es6CodeChange = false;
      });
      es5AstSession.on('throttled-change', function () {
        if (es5AstObject === false) {
          es5CodeString = false;
          es5CodeEditor.setValue(null, -1);
        } else {
          if (!es6AstChange)
            try {
              es5AstObject = destruct(es5AstEditor.getValue());
            } catch (e) {
              es5CodeString = false;
              es5CodeEditor.setValue(e.message, -1);
              return;
            }
          try {
            es5CodeString = generate(es5AstObject);
            es5CodeEditor.setValue(es5CodeString, -1);
          } catch (e) {
            es5CodeString = false;
            es5CodeEditor.setValue(e.message, -1);
          }
        }
        es6AstChange = false;
        if (harmonizationError) {
          var x = harmonizationError;
          harmonizationError = false;
          throw x;
        }
      });
      $('#run').on('click', function () {
        eval(es5CodeEditor.getValue());
      });
      var localCode = localStorage.getItem('code');
      if (localCode)
        es6CodeEditor.setValue(localCode, -1);
    });
  },
  './util/throttle.js': function (require, module, exports, global) {
    'use strict';
    var isInteger = require('../../../node_modules/mout/lang/isInteger.js');
    var slice = require('../../../node_modules/mout/array/slice.js');
    var defer = require('../../../node_modules/prime/defer.js');
    var _throttle = function (fn, method, context) {
      var queued, args, cancel;
      return function () {
        args = arguments;
        if (!queued) {
          queued = true;
          cancel = method(function (time) {
            queued = false;
            fn.apply(context, slice(args).concat(time));
          });
        }
        return cancel;
      };
    };
    var throttle = function (callback, argument, context) {
      if (isInteger(argument))
        return throttle.timeout(callback, argument, context);
      else
        return throttle.immediate(callback, argument);
    };
    throttle.timeout = function (callback, ms, context) {
      return _throttle(callback, function (run) {
        return defer.timeout(run, ms, context);
      }, context);
    };
    throttle.frame = function (callback, context) {
      return _throttle(callback, function (run) {
        return defer.frame(run, context);
      }, context);
    };
    throttle.immediate = function (callback, context) {
      return _throttle(callback, function (run) {
        return defer.immediate(run, context);
      }, context);
    };
    module.exports = throttle;
  },
  '../../../node_modules/harmonizer/index.js': function (require, module, exports, global) {
    'use strict';
    var callExpressionA = require('../../../node_modules/nodes/index.js');
    var build = callExpressionA.build, nodes = callExpressionA.nodes;
    var callExpression = require('../../../node_modules/harmonizer/util/iterators.js');
    var values = callExpression.values;
    var deshorthandify = require('../../../node_modules/harmonizer/transform/shorthands.js').default;
    var arrowify = require('../../../node_modules/harmonizer/transform/arrow-functions.js').default;
    var comprehendify = require('../../../node_modules/harmonizer/transform/comprehensions.js').default;
    var forofify = require('../../../node_modules/harmonizer/transform/for-of.js').default;
    var patternify = require('../../../node_modules/harmonizer/transform/patterns.js').default;
    var defaultify = require('../../../node_modules/harmonizer/transform/default-params.js').default;
    var classify = require('../../../node_modules/harmonizer/transform/classes.js').default;
    var restify = require('../../../node_modules/harmonizer/transform/rest-param.js').default;
    var spreadify = require('../../../node_modules/harmonizer/transform/spread.js').default;
    var templateify = require('../../../node_modules/harmonizer/transform/template-literals.js').default;
    var letify = require('../../../node_modules/harmonizer/transform/let-declarations.js').default;
    var modulize = require('../../../node_modules/harmonizer/transform/modules.js').default;
    function blockify(program) {
      var statementBodies = function () {
          var comprehension = [];
          for (var iterator = values([
                '#IfStatement > alternate',
                '#IfStatement > consequent',
                '#ForStatement > body',
                '#ForInStatement > body',
                '#ForOfStatement > body',
                '#WhileStatement > body',
                '#DoWhileStatement > body'
              ])['@@iterator'](), step; !(step = iterator.next()).done;) {
            var selector = step.value;
            comprehension.push(selector + '[type!=BlockStatement]');
          }
          return comprehension;
        }();
      program.search(statementBodies).forEach(function (statement) {
        var parentNode = statement.parentNode;
        var key = parentNode.indexOf(statement);
        parentNode[key] = new nodes.BlockStatement({ body: [statement] });
      });
      program.search('#ArrowFunctionExpression[expression=true]').forEach(function (node) {
        node.expression = false;
        node.body = new nodes.BlockStatement({ body: [new nodes.ReturnStatement({ argument: node.body })] });
      });
    }
    function transform(tree) {
      var program = build(tree);
      blockify(program);
      modulize(program);
      deshorthandify(program);
      arrowify(program);
      comprehendify(program);
      forofify(program);
      patternify(program);
      defaultify(program);
      classify(program);
      restify(program);
      spreadify(program);
      templateify(program);
      letify(program);
      return program.toJSON();
    }
    exports.transform = transform;
    exports.default = transform;
    ;
  },
  '../../../node_modules/esprima/esprima.js': function (require, module, exports, global) {
    (function (root, factory) {
      'use strict';
      if (typeof define === 'function' && define.amd) {
        define(['exports'], factory);
      } else if (typeof exports !== 'undefined') {
        factory(exports);
      } else {
        factory(root.esprima = {});
      }
    }(this, function (exports) {
      'use strict';
      var Token, TokenName, FnExprTokens, Syntax, PropertyKind, Messages, Regex, SyntaxTreeDelegate, ClassPropertyType, source, strict, index, lineNumber, lineStart, length, delegate, lookahead, state, extra;
      Token = {
        BooleanLiteral: 1,
        EOF: 2,
        Identifier: 3,
        Keyword: 4,
        NullLiteral: 5,
        NumericLiteral: 6,
        Punctuator: 7,
        StringLiteral: 8,
        RegularExpression: 9,
        Template: 10
      };
      TokenName = {};
      TokenName[Token.BooleanLiteral] = 'Boolean';
      TokenName[Token.EOF] = '<end>';
      TokenName[Token.Identifier] = 'Identifier';
      TokenName[Token.Keyword] = 'Keyword';
      TokenName[Token.NullLiteral] = 'Null';
      TokenName[Token.NumericLiteral] = 'Numeric';
      TokenName[Token.Punctuator] = 'Punctuator';
      TokenName[Token.StringLiteral] = 'String';
      TokenName[Token.RegularExpression] = 'RegularExpression';
      FnExprTokens = [
        '(',
        '{',
        '[',
        'in',
        'typeof',
        'instanceof',
        'new',
        'return',
        'case',
        'delete',
        'throw',
        'void',
        '=',
        '+=',
        '-=',
        '*=',
        '/=',
        '%=',
        '<<=',
        '>>=',
        '>>>=',
        '&=',
        '|=',
        '^=',
        ',',
        '+',
        '-',
        '*',
        '/',
        '%',
        '++',
        '--',
        '<<',
        '>>',
        '>>>',
        '&',
        '|',
        '^',
        '!',
        '~',
        '&&',
        '||',
        '?',
        ':',
        '===',
        '==',
        '>=',
        '<=',
        '<',
        '>',
        '!=',
        '!=='
      ];
      Syntax = {
        ArrayExpression: 'ArrayExpression',
        ArrayPattern: 'ArrayPattern',
        ArrowFunctionExpression: 'ArrowFunctionExpression',
        AssignmentExpression: 'AssignmentExpression',
        BinaryExpression: 'BinaryExpression',
        BlockStatement: 'BlockStatement',
        BreakStatement: 'BreakStatement',
        CallExpression: 'CallExpression',
        CatchClause: 'CatchClause',
        ClassBody: 'ClassBody',
        ClassDeclaration: 'ClassDeclaration',
        ClassExpression: 'ClassExpression',
        ComprehensionBlock: 'ComprehensionBlock',
        ComprehensionExpression: 'ComprehensionExpression',
        ConditionalExpression: 'ConditionalExpression',
        ContinueStatement: 'ContinueStatement',
        DebuggerStatement: 'DebuggerStatement',
        DoWhileStatement: 'DoWhileStatement',
        EmptyStatement: 'EmptyStatement',
        ExportDeclaration: 'ExportDeclaration',
        ExportBatchSpecifier: 'ExportBatchSpecifier',
        ExportSpecifier: 'ExportSpecifier',
        ExpressionStatement: 'ExpressionStatement',
        ForInStatement: 'ForInStatement',
        ForOfStatement: 'ForOfStatement',
        ForStatement: 'ForStatement',
        FunctionDeclaration: 'FunctionDeclaration',
        FunctionExpression: 'FunctionExpression',
        Identifier: 'Identifier',
        IfStatement: 'IfStatement',
        ImportDeclaration: 'ImportDeclaration',
        ImportSpecifier: 'ImportSpecifier',
        LabeledStatement: 'LabeledStatement',
        Literal: 'Literal',
        LogicalExpression: 'LogicalExpression',
        MemberExpression: 'MemberExpression',
        MethodDefinition: 'MethodDefinition',
        ModuleDeclaration: 'ModuleDeclaration',
        NewExpression: 'NewExpression',
        ObjectExpression: 'ObjectExpression',
        ObjectPattern: 'ObjectPattern',
        Program: 'Program',
        Property: 'Property',
        ReturnStatement: 'ReturnStatement',
        SequenceExpression: 'SequenceExpression',
        SpreadElement: 'SpreadElement',
        SwitchCase: 'SwitchCase',
        SwitchStatement: 'SwitchStatement',
        TaggedTemplateExpression: 'TaggedTemplateExpression',
        TemplateElement: 'TemplateElement',
        TemplateLiteral: 'TemplateLiteral',
        ThisExpression: 'ThisExpression',
        ThrowStatement: 'ThrowStatement',
        TryStatement: 'TryStatement',
        UnaryExpression: 'UnaryExpression',
        UpdateExpression: 'UpdateExpression',
        VariableDeclaration: 'VariableDeclaration',
        VariableDeclarator: 'VariableDeclarator',
        WhileStatement: 'WhileStatement',
        WithStatement: 'WithStatement',
        YieldExpression: 'YieldExpression'
      };
      PropertyKind = {
        Data: 1,
        Get: 2,
        Set: 4
      };
      ClassPropertyType = {
        'static': 'static',
        prototype: 'prototype'
      };
      Messages = {
        UnexpectedToken: 'Unexpected token %0',
        UnexpectedNumber: 'Unexpected number',
        UnexpectedString: 'Unexpected string',
        UnexpectedIdentifier: 'Unexpected identifier',
        UnexpectedReserved: 'Unexpected reserved word',
        UnexpectedTemplate: 'Unexpected quasi %0',
        UnexpectedEOS: 'Unexpected end of input',
        NewlineAfterThrow: 'Illegal newline after throw',
        InvalidRegExp: 'Invalid regular expression',
        UnterminatedRegExp: 'Invalid regular expression: missing /',
        InvalidLHSInAssignment: 'Invalid left-hand side in assignment',
        InvalidLHSInFormalsList: 'Invalid left-hand side in formals list',
        InvalidLHSInForIn: 'Invalid left-hand side in for-in',
        MultipleDefaultsInSwitch: 'More than one default clause in switch statement',
        NoCatchOrFinally: 'Missing catch or finally after try',
        UnknownLabel: 'Undefined label \'%0\'',
        Redeclaration: '%0 \'%1\' has already been declared',
        IllegalContinue: 'Illegal continue statement',
        IllegalBreak: 'Illegal break statement',
        IllegalDuplicateClassProperty: 'Illegal duplicate property in class definition',
        IllegalReturn: 'Illegal return statement',
        IllegalYield: 'Illegal yield expression',
        IllegalSpread: 'Illegal spread element',
        StrictModeWith: 'Strict mode code may not include a with statement',
        StrictCatchVariable: 'Catch variable may not be eval or arguments in strict mode',
        StrictVarName: 'Variable name may not be eval or arguments in strict mode',
        StrictParamName: 'Parameter name eval or arguments is not allowed in strict mode',
        StrictParamDupe: 'Strict mode function may not have duplicate parameter names',
        ParameterAfterRestParameter: 'Rest parameter must be final parameter of an argument list',
        DefaultRestParameter: 'Rest parameter can not have a default value',
        ObjectPatternAsRestParameter: 'Invalid rest parameter',
        ObjectPatternAsSpread: 'Invalid spread argument',
        StrictFunctionName: 'Function name may not be eval or arguments in strict mode',
        StrictOctalLiteral: 'Octal literals are not allowed in strict mode.',
        StrictDelete: 'Delete of an unqualified identifier in strict mode.',
        StrictDuplicateProperty: 'Duplicate data property in object literal not allowed in strict mode',
        AccessorDataProperty: 'Object literal may not have data and accessor property with the same name',
        AccessorGetSet: 'Object literal may not have multiple get/set accessors with the same name',
        StrictLHSAssignment: 'Assignment to eval or arguments is not allowed in strict mode',
        StrictLHSPostfix: 'Postfix increment/decrement may not have eval or arguments operand in strict mode',
        StrictLHSPrefix: 'Prefix increment/decrement may not have eval or arguments operand in strict mode',
        StrictReservedWord: 'Use of future reserved word in strict mode',
        NewlineAfterModule: 'Illegal newline after module',
        NoFromAfterImport: 'Missing from after import',
        InvalidModuleSpecifier: 'Invalid module specifier',
        NestedModule: 'Module declaration can not be nested',
        NoUnintializedConst: 'Const must be initialized',
        ComprehensionRequiresBlock: 'Comprehension must have at least one block',
        ComprehensionError: 'Comprehension Error',
        EachNotAllowed: 'Each is not supported'
      };
      Regex = {
        NonAsciiIdentifierStart: new RegExp('[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0\u08A2-\u08AC\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097F\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C33\u0C35-\u0C39\u0C3D\u0C58\u0C59\u0C60\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D60\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F0\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191C\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19C1-\u19C7\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA697\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA793\uA7A0-\uA7AA\uA7F8-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA80-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uABC0-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]'),
        NonAsciiIdentifierPart: new RegExp('[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0300-\u0374\u0376\u0377\u037A-\u037D\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u0483-\u0487\u048A-\u0527\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u05D0-\u05EA\u05F0-\u05F2\u0610-\u061A\u0620-\u0669\u066E-\u06D3\u06D5-\u06DC\u06DF-\u06E8\u06EA-\u06FC\u06FF\u0710-\u074A\u074D-\u07B1\u07C0-\u07F5\u07FA\u0800-\u082D\u0840-\u085B\u08A0\u08A2-\u08AC\u08E4-\u08FE\u0900-\u0963\u0966-\u096F\u0971-\u0977\u0979-\u097F\u0981-\u0983\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BC-\u09C4\u09C7\u09C8\u09CB-\u09CE\u09D7\u09DC\u09DD\u09DF-\u09E3\u09E6-\u09F1\u0A01-\u0A03\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A59-\u0A5C\u0A5E\u0A66-\u0A75\u0A81-\u0A83\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABC-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AD0\u0AE0-\u0AE3\u0AE6-\u0AEF\u0B01-\u0B03\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3C-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B5C\u0B5D\u0B5F-\u0B63\u0B66-\u0B6F\u0B71\u0B82\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD0\u0BD7\u0BE6-\u0BEF\u0C01-\u0C03\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C33\u0C35-\u0C39\u0C3D-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C58\u0C59\u0C60-\u0C63\u0C66-\u0C6F\u0C82\u0C83\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBC-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CDE\u0CE0-\u0CE3\u0CE6-\u0CEF\u0CF1\u0CF2\u0D02\u0D03\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D-\u0D44\u0D46-\u0D48\u0D4A-\u0D4E\u0D57\u0D60-\u0D63\u0D66-\u0D6F\u0D7A-\u0D7F\u0D82\u0D83\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DF2\u0DF3\u0E01-\u0E3A\u0E40-\u0E4E\u0E50-\u0E59\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB9\u0EBB-\u0EBD\u0EC0-\u0EC4\u0EC6\u0EC8-\u0ECD\u0ED0-\u0ED9\u0EDC-\u0EDF\u0F00\u0F18\u0F19\u0F20-\u0F29\u0F35\u0F37\u0F39\u0F3E-\u0F47\u0F49-\u0F6C\u0F71-\u0F84\u0F86-\u0F97\u0F99-\u0FBC\u0FC6\u1000-\u1049\u1050-\u109D\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u135D-\u135F\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F0\u1700-\u170C\u170E-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176C\u176E-\u1770\u1772\u1773\u1780-\u17D3\u17D7\u17DC\u17DD\u17E0-\u17E9\u180B-\u180D\u1810-\u1819\u1820-\u1877\u1880-\u18AA\u18B0-\u18F5\u1900-\u191C\u1920-\u192B\u1930-\u193B\u1946-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19D9\u1A00-\u1A1B\u1A20-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AA7\u1B00-\u1B4B\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1BF3\u1C00-\u1C37\u1C40-\u1C49\u1C4D-\u1C7D\u1CD0-\u1CD2\u1CD4-\u1CF6\u1D00-\u1DE6\u1DFC-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u200C\u200D\u203F\u2040\u2054\u2071\u207F\u2090-\u209C\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D7F-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2DE0-\u2DFF\u2E2F\u3005-\u3007\u3021-\u302F\u3031-\u3035\u3038-\u303C\u3041-\u3096\u3099\u309A\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA62B\uA640-\uA66F\uA674-\uA67D\uA67F-\uA697\uA69F-\uA6F1\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA793\uA7A0-\uA7AA\uA7F8-\uA827\uA840-\uA873\uA880-\uA8C4\uA8D0-\uA8D9\uA8E0-\uA8F7\uA8FB\uA900-\uA92D\uA930-\uA953\uA960-\uA97C\uA980-\uA9C0\uA9CF-\uA9D9\uAA00-\uAA36\uAA40-\uAA4D\uAA50-\uAA59\uAA60-\uAA76\uAA7A\uAA7B\uAA80-\uAAC2\uAADB-\uAADD\uAAE0-\uAAEF\uAAF2-\uAAF6\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uABC0-\uABEA\uABEC\uABED\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE00-\uFE0F\uFE20-\uFE26\uFE33\uFE34\uFE4D-\uFE4F\uFE70-\uFE74\uFE76-\uFEFC\uFF10-\uFF19\uFF21-\uFF3A\uFF3F\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]')
      };
      function assert(condition, message) {
        if (!condition) {
          throw new Error('ASSERT: ' + message);
        }
      }
      function isDecimalDigit(ch) {
        return ch >= 48 && ch <= 57;
      }
      function isHexDigit(ch) {
        return '0123456789abcdefABCDEF'.indexOf(ch) >= 0;
      }
      function isOctalDigit(ch) {
        return '01234567'.indexOf(ch) >= 0;
      }
      function isWhiteSpace(ch) {
        return ch === 32 || ch === 9 || ch === 11 || ch === 12 || ch === 160 || ch >= 5760 && '\u1680\u180E\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\uFEFF'.indexOf(String.fromCharCode(ch)) > 0;
      }
      function isLineTerminator(ch) {
        return ch === 10 || ch === 13 || ch === 8232 || ch === 8233;
      }
      function isIdentifierStart(ch) {
        return ch === 36 || ch === 95 || ch >= 65 && ch <= 90 || ch >= 97 && ch <= 122 || ch === 92 || ch >= 128 && Regex.NonAsciiIdentifierStart.test(String.fromCharCode(ch));
      }
      function isIdentifierPart(ch) {
        return ch === 36 || ch === 95 || ch >= 65 && ch <= 90 || ch >= 97 && ch <= 122 || ch >= 48 && ch <= 57 || ch === 92 || ch >= 128 && Regex.NonAsciiIdentifierPart.test(String.fromCharCode(ch));
      }
      function isFutureReservedWord(id) {
        switch (id) {
        case 'class':
        case 'enum':
        case 'export':
        case 'extends':
        case 'import':
        case 'super':
          return true;
        default:
          return false;
        }
      }
      function isStrictModeReservedWord(id) {
        switch (id) {
        case 'implements':
        case 'interface':
        case 'package':
        case 'private':
        case 'protected':
        case 'public':
        case 'static':
        case 'yield':
        case 'let':
          return true;
        default:
          return false;
        }
      }
      function isRestrictedWord(id) {
        return id === 'eval' || id === 'arguments';
      }
      function isKeyword(id) {
        if (strict && isStrictModeReservedWord(id)) {
          return true;
        }
        switch (id.length) {
        case 2:
          return id === 'if' || id === 'in' || id === 'do';
        case 3:
          return id === 'var' || id === 'for' || id === 'new' || id === 'try' || id === 'let';
        case 4:
          return id === 'this' || id === 'else' || id === 'case' || id === 'void' || id === 'with' || id === 'enum';
        case 5:
          return id === 'while' || id === 'break' || id === 'catch' || id === 'throw' || id === 'const' || id === 'class' || id === 'super';
        case 6:
          return id === 'return' || id === 'typeof' || id === 'delete' || id === 'switch' || id === 'export' || id === 'import';
        case 7:
          return id === 'default' || id === 'finally' || id === 'extends';
        case 8:
          return id === 'function' || id === 'continue' || id === 'debugger';
        case 10:
          return id === 'instanceof';
        default:
          return false;
        }
      }
      function skipComment() {
        var ch, blockComment, lineComment;
        blockComment = false;
        lineComment = false;
        while (index < length) {
          ch = source.charCodeAt(index);
          if (lineComment) {
            ++index;
            if (isLineTerminator(ch)) {
              lineComment = false;
              if (ch === 13 && source.charCodeAt(index) === 10) {
                ++index;
              }
              ++lineNumber;
              lineStart = index;
            }
          } else if (blockComment) {
            if (isLineTerminator(ch)) {
              if (ch === 13 && source.charCodeAt(index + 1) === 10) {
                ++index;
              }
              ++lineNumber;
              ++index;
              lineStart = index;
              if (index >= length) {
                throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
              }
            } else {
              ch = source.charCodeAt(index++);
              if (index >= length) {
                throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
              }
              if (ch === 42) {
                ch = source.charCodeAt(index);
                if (ch === 47) {
                  ++index;
                  blockComment = false;
                }
              }
            }
          } else if (ch === 47) {
            ch = source.charCodeAt(index + 1);
            if (ch === 47) {
              index += 2;
              lineComment = true;
            } else if (ch === 42) {
              index += 2;
              blockComment = true;
              if (index >= length) {
                throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
              }
            } else {
              break;
            }
          } else if (isWhiteSpace(ch)) {
            ++index;
          } else if (isLineTerminator(ch)) {
            ++index;
            if (ch === 13 && source.charCodeAt(index) === 10) {
              ++index;
            }
            ++lineNumber;
            lineStart = index;
          } else {
            break;
          }
        }
      }
      function scanHexEscape(prefix) {
        var i, len, ch, code = 0;
        len = prefix === 'u' ? 4 : 2;
        for (i = 0; i < len; ++i) {
          if (index < length && isHexDigit(source[index])) {
            ch = source[index++];
            code = code * 16 + '0123456789abcdef'.indexOf(ch.toLowerCase());
          } else {
            return '';
          }
        }
        return String.fromCharCode(code);
      }
      function scanUnicodeCodePointEscape() {
        var ch, code, cu1, cu2;
        ch = source[index];
        code = 0;
        if (ch === '}') {
          throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
        }
        while (index < length) {
          ch = source[index++];
          if (!isHexDigit(ch)) {
            break;
          }
          code = code * 16 + '0123456789abcdef'.indexOf(ch.toLowerCase());
        }
        if (code > 1114111 || ch !== '}') {
          throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
        }
        if (code <= 65535) {
          return String.fromCharCode(code);
        }
        cu1 = (code - 65536 >> 10) + 55296;
        cu2 = (code - 65536 & 1023) + 56320;
        return String.fromCharCode(cu1, cu2);
      }
      function getEscapedIdentifier() {
        var ch, id;
        ch = source.charCodeAt(index++);
        id = String.fromCharCode(ch);
        if (ch === 92) {
          if (source.charCodeAt(index) !== 117) {
            throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
          }
          ++index;
          ch = scanHexEscape('u');
          if (!ch || ch === '\\' || !isIdentifierStart(ch.charCodeAt(0))) {
            throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
          }
          id = ch;
        }
        while (index < length) {
          ch = source.charCodeAt(index);
          if (!isIdentifierPart(ch)) {
            break;
          }
          ++index;
          id += String.fromCharCode(ch);
          if (ch === 92) {
            id = id.substr(0, id.length - 1);
            if (source.charCodeAt(index) !== 117) {
              throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
            }
            ++index;
            ch = scanHexEscape('u');
            if (!ch || ch === '\\' || !isIdentifierPart(ch.charCodeAt(0))) {
              throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
            }
            id += ch;
          }
        }
        return id;
      }
      function getIdentifier() {
        var start, ch;
        start = index++;
        while (index < length) {
          ch = source.charCodeAt(index);
          if (ch === 92) {
            index = start;
            return getEscapedIdentifier();
          }
          if (isIdentifierPart(ch)) {
            ++index;
          } else {
            break;
          }
        }
        return source.slice(start, index);
      }
      function scanIdentifier() {
        var start, id, type;
        start = index;
        id = source.charCodeAt(index) === 92 ? getEscapedIdentifier() : getIdentifier();
        if (id.length === 1) {
          type = Token.Identifier;
        } else if (isKeyword(id)) {
          type = Token.Keyword;
        } else if (id === 'null') {
          type = Token.NullLiteral;
        } else if (id === 'true' || id === 'false') {
          type = Token.BooleanLiteral;
        } else {
          type = Token.Identifier;
        }
        return {
          type: type,
          value: id,
          lineNumber: lineNumber,
          lineStart: lineStart,
          range: [
            start,
            index
          ]
        };
      }
      function scanPunctuator() {
        var start = index, code = source.charCodeAt(index), code2, ch1 = source[index], ch2, ch3, ch4;
        switch (code) {
        case 40:
        case 41:
        case 59:
        case 44:
        case 123:
        case 125:
        case 91:
        case 93:
        case 58:
        case 63:
        case 126:
          ++index;
          if (extra.tokenize) {
            if (code === 40) {
              extra.openParenToken = extra.tokens.length;
            } else if (code === 123) {
              extra.openCurlyToken = extra.tokens.length;
            }
          }
          return {
            type: Token.Punctuator,
            value: String.fromCharCode(code),
            lineNumber: lineNumber,
            lineStart: lineStart,
            range: [
              start,
              index
            ]
          };
        default:
          code2 = source.charCodeAt(index + 1);
          if (code2 === 61) {
            switch (code) {
            case 37:
            case 38:
            case 42:
            case 43:
            case 45:
            case 47:
            case 60:
            case 62:
            case 94:
            case 124:
              index += 2;
              return {
                type: Token.Punctuator,
                value: String.fromCharCode(code) + String.fromCharCode(code2),
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [
                  start,
                  index
                ]
              };
            case 33:
            case 61:
              index += 2;
              if (source.charCodeAt(index) === 61) {
                ++index;
              }
              return {
                type: Token.Punctuator,
                value: source.slice(start, index),
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [
                  start,
                  index
                ]
              };
            default:
              break;
            }
          }
          break;
        }
        ch2 = source[index + 1];
        ch3 = source[index + 2];
        ch4 = source[index + 3];
        if (ch1 === '>' && ch2 === '>' && ch3 === '>') {
          if (ch4 === '=') {
            index += 4;
            return {
              type: Token.Punctuator,
              value: '>>>=',
              lineNumber: lineNumber,
              lineStart: lineStart,
              range: [
                start,
                index
              ]
            };
          }
        }
        if (ch1 === '>' && ch2 === '>' && ch3 === '>') {
          index += 3;
          return {
            type: Token.Punctuator,
            value: '>>>',
            lineNumber: lineNumber,
            lineStart: lineStart,
            range: [
              start,
              index
            ]
          };
        }
        if (ch1 === '<' && ch2 === '<' && ch3 === '=') {
          index += 3;
          return {
            type: Token.Punctuator,
            value: '<<=',
            lineNumber: lineNumber,
            lineStart: lineStart,
            range: [
              start,
              index
            ]
          };
        }
        if (ch1 === '>' && ch2 === '>' && ch3 === '=') {
          index += 3;
          return {
            type: Token.Punctuator,
            value: '>>=',
            lineNumber: lineNumber,
            lineStart: lineStart,
            range: [
              start,
              index
            ]
          };
        }
        if (ch1 === '.' && ch2 === '.' && ch3 === '.') {
          index += 3;
          return {
            type: Token.Punctuator,
            value: '...',
            lineNumber: lineNumber,
            lineStart: lineStart,
            range: [
              start,
              index
            ]
          };
        }
        if (ch1 === ch2 && '+-<>&|'.indexOf(ch1) >= 0) {
          index += 2;
          return {
            type: Token.Punctuator,
            value: ch1 + ch2,
            lineNumber: lineNumber,
            lineStart: lineStart,
            range: [
              start,
              index
            ]
          };
        }
        if (ch1 === '=' && ch2 === '>') {
          index += 2;
          return {
            type: Token.Punctuator,
            value: '=>',
            lineNumber: lineNumber,
            lineStart: lineStart,
            range: [
              start,
              index
            ]
          };
        }
        if ('<>=!+-*%&|^/'.indexOf(ch1) >= 0) {
          ++index;
          return {
            type: Token.Punctuator,
            value: ch1,
            lineNumber: lineNumber,
            lineStart: lineStart,
            range: [
              start,
              index
            ]
          };
        }
        if (ch1 === '.') {
          ++index;
          return {
            type: Token.Punctuator,
            value: ch1,
            lineNumber: lineNumber,
            lineStart: lineStart,
            range: [
              start,
              index
            ]
          };
        }
        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
      }
      function scanHexLiteral(start) {
        var number = '';
        while (index < length) {
          if (!isHexDigit(source[index])) {
            break;
          }
          number += source[index++];
        }
        if (number.length === 0) {
          throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
        }
        if (isIdentifierStart(source.charCodeAt(index))) {
          throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
        }
        return {
          type: Token.NumericLiteral,
          value: parseInt('0x' + number, 16),
          lineNumber: lineNumber,
          lineStart: lineStart,
          range: [
            start,
            index
          ]
        };
      }
      function scanOctalLiteral(prefix, start) {
        var number, octal;
        if (isOctalDigit(prefix)) {
          octal = true;
          number = '0' + source[index++];
        } else {
          octal = false;
          ++index;
          number = '';
        }
        while (index < length) {
          if (!isOctalDigit(source[index])) {
            break;
          }
          number += source[index++];
        }
        if (!octal && number.length === 0) {
          throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
        }
        if (isIdentifierStart(source.charCodeAt(index)) || isDecimalDigit(source.charCodeAt(index))) {
          throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
        }
        return {
          type: Token.NumericLiteral,
          value: parseInt(number, 8),
          octal: octal,
          lineNumber: lineNumber,
          lineStart: lineStart,
          range: [
            start,
            index
          ]
        };
      }
      function scanNumericLiteral() {
        var number, start, ch, octal;
        ch = source[index];
        assert(isDecimalDigit(ch.charCodeAt(0)) || ch === '.', 'Numeric literal must start with a decimal digit or a decimal point');
        start = index;
        number = '';
        if (ch !== '.') {
          number = source[index++];
          ch = source[index];
          if (number === '0') {
            if (ch === 'x' || ch === 'X') {
              ++index;
              return scanHexLiteral(start);
            }
            if (ch === 'b' || ch === 'B') {
              ++index;
              number = '';
              while (index < length) {
                ch = source[index];
                if (ch !== '0' && ch !== '1') {
                  break;
                }
                number += source[index++];
              }
              if (number.length === 0) {
                throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
              }
              if (index < length) {
                ch = source.charCodeAt(index);
                if (isIdentifierStart(ch) || isDecimalDigit(ch)) {
                  throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                }
              }
              return {
                type: Token.NumericLiteral,
                value: parseInt(number, 2),
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [
                  start,
                  index
                ]
              };
            }
            if (ch === 'o' || ch === 'O' || isOctalDigit(ch)) {
              return scanOctalLiteral(ch, start);
            }
            if (ch && isDecimalDigit(ch.charCodeAt(0))) {
              throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
            }
          }
          while (isDecimalDigit(source.charCodeAt(index))) {
            number += source[index++];
          }
          ch = source[index];
        }
        if (ch === '.') {
          number += source[index++];
          while (isDecimalDigit(source.charCodeAt(index))) {
            number += source[index++];
          }
          ch = source[index];
        }
        if (ch === 'e' || ch === 'E') {
          number += source[index++];
          ch = source[index];
          if (ch === '+' || ch === '-') {
            number += source[index++];
          }
          if (isDecimalDigit(source.charCodeAt(index))) {
            while (isDecimalDigit(source.charCodeAt(index))) {
              number += source[index++];
            }
          } else {
            throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
          }
        }
        if (isIdentifierStart(source.charCodeAt(index))) {
          throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
        }
        return {
          type: Token.NumericLiteral,
          value: parseFloat(number),
          lineNumber: lineNumber,
          lineStart: lineStart,
          range: [
            start,
            index
          ]
        };
      }
      function scanStringLiteral() {
        var str = '', quote, start, ch, code, unescaped, restore, octal = false;
        quote = source[index];
        assert(quote === '\'' || quote === '"', 'String literal must starts with a quote');
        start = index;
        ++index;
        while (index < length) {
          ch = source[index++];
          if (ch === quote) {
            quote = '';
            break;
          } else if (ch === '\\') {
            ch = source[index++];
            if (!ch || !isLineTerminator(ch.charCodeAt(0))) {
              switch (ch) {
              case 'n':
                str += '\n';
                break;
              case 'r':
                str += '\r';
                break;
              case 't':
                str += '\t';
                break;
              case 'u':
              case 'x':
                if (source[index] === '{') {
                  ++index;
                  str += scanUnicodeCodePointEscape();
                } else {
                  restore = index;
                  unescaped = scanHexEscape(ch);
                  if (unescaped) {
                    str += unescaped;
                  } else {
                    index = restore;
                    str += ch;
                  }
                }
                break;
              case 'b':
                str += '\b';
                break;
              case 'f':
                str += '\f';
                break;
              case 'v':
                str += '\x0B';
                break;
              default:
                if (isOctalDigit(ch)) {
                  code = '01234567'.indexOf(ch);
                  if (code !== 0) {
                    octal = true;
                  }
                  if (index < length && isOctalDigit(source[index])) {
                    octal = true;
                    code = code * 8 + '01234567'.indexOf(source[index++]);
                    if ('0123'.indexOf(ch) >= 0 && index < length && isOctalDigit(source[index])) {
                      code = code * 8 + '01234567'.indexOf(source[index++]);
                    }
                  }
                  str += String.fromCharCode(code);
                } else {
                  str += ch;
                }
                break;
              }
            } else {
              ++lineNumber;
              if (ch === '\r' && source[index] === '\n') {
                ++index;
              }
            }
          } else if (isLineTerminator(ch.charCodeAt(0))) {
            break;
          } else {
            str += ch;
          }
        }
        if (quote !== '') {
          throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
        }
        return {
          type: Token.StringLiteral,
          value: str,
          octal: octal,
          lineNumber: lineNumber,
          lineStart: lineStart,
          range: [
            start,
            index
          ]
        };
      }
      function scanTemplate() {
        var cooked = '', ch, start, terminated, tail, restore, unescaped, code, octal;
        terminated = false;
        tail = false;
        start = index;
        ++index;
        while (index < length) {
          ch = source[index++];
          if (ch === '`') {
            tail = true;
            terminated = true;
            break;
          } else if (ch === '$') {
            if (source[index] === '{') {
              ++index;
              terminated = true;
              break;
            }
            cooked += ch;
          } else if (ch === '\\') {
            ch = source[index++];
            if (!isLineTerminator(ch.charCodeAt(0))) {
              switch (ch) {
              case 'n':
                cooked += '\n';
                break;
              case 'r':
                cooked += '\r';
                break;
              case 't':
                cooked += '\t';
                break;
              case 'u':
              case 'x':
                if (source[index] === '{') {
                  ++index;
                  cooked += scanUnicodeCodePointEscape();
                } else {
                  restore = index;
                  unescaped = scanHexEscape(ch);
                  if (unescaped) {
                    cooked += unescaped;
                  } else {
                    index = restore;
                    cooked += ch;
                  }
                }
                break;
              case 'b':
                cooked += '\b';
                break;
              case 'f':
                cooked += '\f';
                break;
              case 'v':
                cooked += '\x0B';
                break;
              default:
                if (isOctalDigit(ch)) {
                  code = '01234567'.indexOf(ch);
                  if (code !== 0) {
                    octal = true;
                  }
                  if (index < length && isOctalDigit(source[index])) {
                    octal = true;
                    code = code * 8 + '01234567'.indexOf(source[index++]);
                    if ('0123'.indexOf(ch) >= 0 && index < length && isOctalDigit(source[index])) {
                      code = code * 8 + '01234567'.indexOf(source[index++]);
                    }
                  }
                  cooked += String.fromCharCode(code);
                } else {
                  cooked += ch;
                }
                break;
              }
            } else {
              ++lineNumber;
              if (ch === '\r' && source[index] === '\n') {
                ++index;
              }
            }
          } else if (isLineTerminator(ch.charCodeAt(0))) {
            ++lineNumber;
            if (ch === '\r' && source[index] === '\n') {
              ++index;
            }
            cooked += '\n';
          } else {
            cooked += ch;
          }
        }
        if (!terminated) {
          throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
        }
        return {
          type: Token.Template,
          value: {
            cooked: cooked,
            raw: source.slice(start + 1, index - (tail ? 1 : 2))
          },
          tail: tail,
          octal: octal,
          lineNumber: lineNumber,
          lineStart: lineStart,
          range: [
            start,
            index
          ]
        };
      }
      function scanTemplateElement(option) {
        var startsWith, template;
        lookahead = null;
        skipComment();
        startsWith = option.head ? '`' : '}';
        if (source[index] !== startsWith) {
          throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
        }
        template = scanTemplate();
        peek();
        return template;
      }
      function scanRegExp() {
        var str, ch, start, pattern, flags, value, classMarker = false, restore, terminated = false;
        lookahead = null;
        skipComment();
        start = index;
        ch = source[index];
        assert(ch === '/', 'Regular expression literal must start with a slash');
        str = source[index++];
        while (index < length) {
          ch = source[index++];
          str += ch;
          if (classMarker) {
            if (ch === ']') {
              classMarker = false;
            }
          } else {
            if (ch === '\\') {
              ch = source[index++];
              if (isLineTerminator(ch.charCodeAt(0))) {
                throwError({}, Messages.UnterminatedRegExp);
              }
              str += ch;
            } else if (ch === '/') {
              terminated = true;
              break;
            } else if (ch === '[') {
              classMarker = true;
            } else if (isLineTerminator(ch.charCodeAt(0))) {
              throwError({}, Messages.UnterminatedRegExp);
            }
          }
        }
        if (!terminated) {
          throwError({}, Messages.UnterminatedRegExp);
        }
        pattern = str.substr(1, str.length - 2);
        flags = '';
        while (index < length) {
          ch = source[index];
          if (!isIdentifierPart(ch.charCodeAt(0))) {
            break;
          }
          ++index;
          if (ch === '\\' && index < length) {
            ch = source[index];
            if (ch === 'u') {
              ++index;
              restore = index;
              ch = scanHexEscape('u');
              if (ch) {
                flags += ch;
                for (str += '\\u'; restore < index; ++restore) {
                  str += source[restore];
                }
              } else {
                index = restore;
                flags += 'u';
                str += '\\u';
              }
            } else {
              str += '\\';
            }
          } else {
            flags += ch;
            str += ch;
          }
        }
        try {
          value = new RegExp(pattern, flags);
        } catch (e) {
          throwError({}, Messages.InvalidRegExp);
        }
        peek();
        if (extra.tokenize) {
          return {
            type: Token.RegularExpression,
            value: value,
            lineNumber: lineNumber,
            lineStart: lineStart,
            range: [
              start,
              index
            ]
          };
        }
        return {
          literal: str,
          value: value,
          range: [
            start,
            index
          ]
        };
      }
      function isIdentifierName(token) {
        return token.type === Token.Identifier || token.type === Token.Keyword || token.type === Token.BooleanLiteral || token.type === Token.NullLiteral;
      }
      function advanceSlash() {
        var prevToken, checkToken;
        prevToken = extra.tokens[extra.tokens.length - 1];
        if (!prevToken) {
          return scanRegExp();
        }
        if (prevToken.type === 'Punctuator') {
          if (prevToken.value === ')') {
            checkToken = extra.tokens[extra.openParenToken - 1];
            if (checkToken && checkToken.type === 'Keyword' && (checkToken.value === 'if' || checkToken.value === 'while' || checkToken.value === 'for' || checkToken.value === 'with')) {
              return scanRegExp();
            }
            return scanPunctuator();
          }
          if (prevToken.value === '}') {
            if (extra.tokens[extra.openCurlyToken - 3] && extra.tokens[extra.openCurlyToken - 3].type === 'Keyword') {
              checkToken = extra.tokens[extra.openCurlyToken - 4];
              if (!checkToken) {
                return scanPunctuator();
              }
            } else if (extra.tokens[extra.openCurlyToken - 4] && extra.tokens[extra.openCurlyToken - 4].type === 'Keyword') {
              checkToken = extra.tokens[extra.openCurlyToken - 5];
              if (!checkToken) {
                return scanRegExp();
              }
            } else {
              return scanPunctuator();
            }
            if (FnExprTokens.indexOf(checkToken.value) >= 0) {
              return scanPunctuator();
            }
            return scanRegExp();
          }
          return scanRegExp();
        }
        if (prevToken.type === 'Keyword') {
          return scanRegExp();
        }
        return scanPunctuator();
      }
      function advance() {
        var ch;
        skipComment();
        if (index >= length) {
          return {
            type: Token.EOF,
            lineNumber: lineNumber,
            lineStart: lineStart,
            range: [
              index,
              index
            ]
          };
        }
        ch = source.charCodeAt(index);
        if (ch === 40 || ch === 41 || ch === 58) {
          return scanPunctuator();
        }
        if (ch === 39 || ch === 34) {
          return scanStringLiteral();
        }
        if (ch === 96) {
          return scanTemplate();
        }
        if (isIdentifierStart(ch)) {
          return scanIdentifier();
        }
        if (ch === 46) {
          if (isDecimalDigit(source.charCodeAt(index + 1))) {
            return scanNumericLiteral();
          }
          return scanPunctuator();
        }
        if (isDecimalDigit(ch)) {
          return scanNumericLiteral();
        }
        if (extra.tokenize && ch === 47) {
          return advanceSlash();
        }
        return scanPunctuator();
      }
      function lex() {
        var token;
        token = lookahead;
        index = token.range[1];
        lineNumber = token.lineNumber;
        lineStart = token.lineStart;
        lookahead = advance();
        index = token.range[1];
        lineNumber = token.lineNumber;
        lineStart = token.lineStart;
        return token;
      }
      function peek() {
        var pos, line, start;
        pos = index;
        line = lineNumber;
        start = lineStart;
        lookahead = advance();
        index = pos;
        lineNumber = line;
        lineStart = start;
      }
      function lookahead2() {
        var adv, pos, line, start, result;
        adv = typeof extra.advance === 'function' ? extra.advance : advance;
        pos = index;
        line = lineNumber;
        start = lineStart;
        if (lookahead === null) {
          lookahead = adv();
        }
        index = lookahead.range[1];
        lineNumber = lookahead.lineNumber;
        lineStart = lookahead.lineStart;
        result = adv();
        index = pos;
        lineNumber = line;
        lineStart = start;
        return result;
      }
      function markerCreate() {
        if (!extra.loc && !extra.range) {
          return undefined;
        }
        skipComment();
        return {
          offset: index,
          line: lineNumber,
          col: index - lineStart
        };
      }
      function markerApply(marker, node) {
        if (extra.range) {
          node.range = [
            marker.offset,
            index
          ];
        }
        if (extra.loc) {
          node.loc = {
            start: {
              line: marker.line,
              column: marker.col
            },
            end: {
              line: lineNumber,
              column: index - lineStart
            }
          };
          node = delegate.postProcess(node);
        }
        return node;
      }
      SyntaxTreeDelegate = {
        name: 'SyntaxTree',
        postProcess: function (node) {
          return node;
        },
        createArrayExpression: function (elements) {
          return {
            type: Syntax.ArrayExpression,
            elements: elements
          };
        },
        createAssignmentExpression: function (operator, left, right) {
          return {
            type: Syntax.AssignmentExpression,
            operator: operator,
            left: left,
            right: right
          };
        },
        createBinaryExpression: function (operator, left, right) {
          var type = operator === '||' || operator === '&&' ? Syntax.LogicalExpression : Syntax.BinaryExpression;
          return {
            type: type,
            operator: operator,
            left: left,
            right: right
          };
        },
        createBlockStatement: function (body) {
          return {
            type: Syntax.BlockStatement,
            body: body
          };
        },
        createBreakStatement: function (label) {
          return {
            type: Syntax.BreakStatement,
            label: label
          };
        },
        createCallExpression: function (callee, args) {
          return {
            type: Syntax.CallExpression,
            callee: callee,
            'arguments': args
          };
        },
        createCatchClause: function (param, body) {
          return {
            type: Syntax.CatchClause,
            param: param,
            body: body
          };
        },
        createConditionalExpression: function (test, consequent, alternate) {
          return {
            type: Syntax.ConditionalExpression,
            test: test,
            consequent: consequent,
            alternate: alternate
          };
        },
        createContinueStatement: function (label) {
          return {
            type: Syntax.ContinueStatement,
            label: label
          };
        },
        createDebuggerStatement: function () {
          return { type: Syntax.DebuggerStatement };
        },
        createDoWhileStatement: function (body, test) {
          return {
            type: Syntax.DoWhileStatement,
            body: body,
            test: test
          };
        },
        createEmptyStatement: function () {
          return { type: Syntax.EmptyStatement };
        },
        createExpressionStatement: function (expression) {
          return {
            type: Syntax.ExpressionStatement,
            expression: expression
          };
        },
        createForStatement: function (init, test, update, body) {
          return {
            type: Syntax.ForStatement,
            init: init,
            test: test,
            update: update,
            body: body
          };
        },
        createForInStatement: function (left, right, body) {
          return {
            type: Syntax.ForInStatement,
            left: left,
            right: right,
            body: body,
            each: false
          };
        },
        createForOfStatement: function (left, right, body) {
          return {
            type: Syntax.ForOfStatement,
            left: left,
            right: right,
            body: body
          };
        },
        createFunctionDeclaration: function (id, params, defaults, body, rest, generator, expression) {
          return {
            type: Syntax.FunctionDeclaration,
            id: id,
            params: params,
            defaults: defaults,
            body: body,
            rest: rest,
            generator: generator,
            expression: expression
          };
        },
        createFunctionExpression: function (id, params, defaults, body, rest, generator, expression) {
          return {
            type: Syntax.FunctionExpression,
            id: id,
            params: params,
            defaults: defaults,
            body: body,
            rest: rest,
            generator: generator,
            expression: expression
          };
        },
        createIdentifier: function (name) {
          return {
            type: Syntax.Identifier,
            name: name
          };
        },
        createIfStatement: function (test, consequent, alternate) {
          return {
            type: Syntax.IfStatement,
            test: test,
            consequent: consequent,
            alternate: alternate
          };
        },
        createLabeledStatement: function (label, body) {
          return {
            type: Syntax.LabeledStatement,
            label: label,
            body: body
          };
        },
        createLiteral: function (token) {
          return {
            type: Syntax.Literal,
            value: token.value,
            raw: source.slice(token.range[0], token.range[1])
          };
        },
        createMemberExpression: function (accessor, object, property) {
          return {
            type: Syntax.MemberExpression,
            computed: accessor === '[',
            object: object,
            property: property
          };
        },
        createNewExpression: function (callee, args) {
          return {
            type: Syntax.NewExpression,
            callee: callee,
            'arguments': args
          };
        },
        createObjectExpression: function (properties) {
          return {
            type: Syntax.ObjectExpression,
            properties: properties
          };
        },
        createPostfixExpression: function (operator, argument) {
          return {
            type: Syntax.UpdateExpression,
            operator: operator,
            argument: argument,
            prefix: false
          };
        },
        createProgram: function (body) {
          return {
            type: Syntax.Program,
            body: body
          };
        },
        createProperty: function (kind, key, value, method, shorthand, computed) {
          return {
            type: Syntax.Property,
            key: key,
            value: value,
            kind: kind,
            method: method,
            shorthand: shorthand,
            computed: computed
          };
        },
        createReturnStatement: function (argument) {
          return {
            type: Syntax.ReturnStatement,
            argument: argument
          };
        },
        createSequenceExpression: function (expressions) {
          return {
            type: Syntax.SequenceExpression,
            expressions: expressions
          };
        },
        createSwitchCase: function (test, consequent) {
          return {
            type: Syntax.SwitchCase,
            test: test,
            consequent: consequent
          };
        },
        createSwitchStatement: function (discriminant, cases) {
          return {
            type: Syntax.SwitchStatement,
            discriminant: discriminant,
            cases: cases
          };
        },
        createThisExpression: function () {
          return { type: Syntax.ThisExpression };
        },
        createThrowStatement: function (argument) {
          return {
            type: Syntax.ThrowStatement,
            argument: argument
          };
        },
        createTryStatement: function (block, guardedHandlers, handlers, finalizer) {
          return {
            type: Syntax.TryStatement,
            block: block,
            guardedHandlers: guardedHandlers,
            handlers: handlers,
            finalizer: finalizer
          };
        },
        createUnaryExpression: function (operator, argument) {
          if (operator === '++' || operator === '--') {
            return {
              type: Syntax.UpdateExpression,
              operator: operator,
              argument: argument,
              prefix: true
            };
          }
          return {
            type: Syntax.UnaryExpression,
            operator: operator,
            argument: argument,
            prefix: true
          };
        },
        createVariableDeclaration: function (declarations, kind) {
          return {
            type: Syntax.VariableDeclaration,
            declarations: declarations,
            kind: kind
          };
        },
        createVariableDeclarator: function (id, init) {
          return {
            type: Syntax.VariableDeclarator,
            id: id,
            init: init
          };
        },
        createWhileStatement: function (test, body) {
          return {
            type: Syntax.WhileStatement,
            test: test,
            body: body
          };
        },
        createWithStatement: function (object, body) {
          return {
            type: Syntax.WithStatement,
            object: object,
            body: body
          };
        },
        createTemplateElement: function (value, tail) {
          return {
            type: Syntax.TemplateElement,
            value: value,
            tail: tail
          };
        },
        createTemplateLiteral: function (quasis, expressions) {
          return {
            type: Syntax.TemplateLiteral,
            quasis: quasis,
            expressions: expressions
          };
        },
        createSpreadElement: function (argument) {
          return {
            type: Syntax.SpreadElement,
            argument: argument
          };
        },
        createTaggedTemplateExpression: function (tag, quasi) {
          return {
            type: Syntax.TaggedTemplateExpression,
            tag: tag,
            quasi: quasi
          };
        },
        createArrowFunctionExpression: function (params, defaults, body, rest, expression) {
          return {
            type: Syntax.ArrowFunctionExpression,
            id: null,
            params: params,
            defaults: defaults,
            body: body,
            rest: rest,
            generator: false,
            expression: expression
          };
        },
        createMethodDefinition: function (propertyType, kind, key, value) {
          return {
            type: Syntax.MethodDefinition,
            key: key,
            value: value,
            kind: kind,
            'static': propertyType === ClassPropertyType.static
          };
        },
        createClassBody: function (body) {
          return {
            type: Syntax.ClassBody,
            body: body
          };
        },
        createClassExpression: function (id, superClass, body) {
          return {
            type: Syntax.ClassExpression,
            id: id,
            superClass: superClass,
            body: body
          };
        },
        createClassDeclaration: function (id, superClass, body) {
          return {
            type: Syntax.ClassDeclaration,
            id: id,
            superClass: superClass,
            body: body
          };
        },
        createExportSpecifier: function (id, name) {
          return {
            type: Syntax.ExportSpecifier,
            id: id,
            name: name
          };
        },
        createExportBatchSpecifier: function () {
          return { type: Syntax.ExportBatchSpecifier };
        },
        createExportDeclaration: function (declaration, specifiers, source, isDefault) {
          return {
            type: Syntax.ExportDeclaration,
            declaration: declaration,
            specifiers: specifiers,
            source: source,
            default: isDefault
          };
        },
        createImportSpecifier: function (id, name) {
          return {
            type: Syntax.ImportSpecifier,
            id: id,
            name: name
          };
        },
        createImportDeclaration: function (specifiers, kind, source) {
          return {
            type: Syntax.ImportDeclaration,
            specifiers: specifiers,
            kind: kind,
            source: source
          };
        },
        createYieldExpression: function (argument, delegate) {
          return {
            type: Syntax.YieldExpression,
            argument: argument,
            delegate: delegate
          };
        },
        createModuleDeclaration: function (id, source, body) {
          return {
            type: Syntax.ModuleDeclaration,
            id: id,
            source: source,
            body: body
          };
        },
        createComprehensionExpression: function (filter, blocks, body) {
          return {
            type: Syntax.ComprehensionExpression,
            filter: filter,
            blocks: blocks,
            body: body
          };
        }
      };
      function peekLineTerminator() {
        var pos, line, start, found;
        pos = index;
        line = lineNumber;
        start = lineStart;
        skipComment();
        found = lineNumber !== line;
        index = pos;
        lineNumber = line;
        lineStart = start;
        return found;
      }
      function throwError(token, messageFormat) {
        var error, args = Array.prototype.slice.call(arguments, 2), msg = messageFormat.replace(/%(\d)/g, function (whole, index) {
            assert(index < args.length, 'Message reference must be in range');
            return args[index];
          });
        if (typeof token.lineNumber === 'number') {
          error = new Error('Line ' + token.lineNumber + ': ' + msg);
          error.index = token.range[0];
          error.lineNumber = token.lineNumber;
          error.column = token.range[0] - lineStart + 1;
        } else {
          error = new Error('Line ' + lineNumber + ': ' + msg);
          error.index = index;
          error.lineNumber = lineNumber;
          error.column = index - lineStart + 1;
        }
        error.description = msg;
        throw error;
      }
      function throwErrorTolerant() {
        try {
          throwError.apply(null, arguments);
        } catch (e) {
          if (extra.errors) {
            extra.errors.push(e);
          } else {
            throw e;
          }
        }
      }
      function throwUnexpected(token) {
        if (token.type === Token.EOF) {
          throwError(token, Messages.UnexpectedEOS);
        }
        if (token.type === Token.NumericLiteral) {
          throwError(token, Messages.UnexpectedNumber);
        }
        if (token.type === Token.StringLiteral) {
          throwError(token, Messages.UnexpectedString);
        }
        if (token.type === Token.Identifier) {
          throwError(token, Messages.UnexpectedIdentifier);
        }
        if (token.type === Token.Keyword) {
          if (isFutureReservedWord(token.value)) {
            throwError(token, Messages.UnexpectedReserved);
          } else if (strict && isStrictModeReservedWord(token.value)) {
            throwErrorTolerant(token, Messages.StrictReservedWord);
            return;
          }
          throwError(token, Messages.UnexpectedToken, token.value);
        }
        if (token.type === Token.Template) {
          throwError(token, Messages.UnexpectedTemplate, token.value.raw);
        }
        throwError(token, Messages.UnexpectedToken, token.value);
      }
      function expect(value) {
        var token = lex();
        if (token.type !== Token.Punctuator || token.value !== value) {
          throwUnexpected(token);
        }
      }
      function expectKeyword(keyword) {
        var token = lex();
        if (token.type !== Token.Keyword || token.value !== keyword) {
          throwUnexpected(token);
        }
      }
      function match(value) {
        return lookahead.type === Token.Punctuator && lookahead.value === value;
      }
      function matchKeyword(keyword) {
        return lookahead.type === Token.Keyword && lookahead.value === keyword;
      }
      function matchContextualKeyword(keyword) {
        return lookahead.type === Token.Identifier && lookahead.value === keyword;
      }
      function matchAssign() {
        var op;
        if (lookahead.type !== Token.Punctuator) {
          return false;
        }
        op = lookahead.value;
        return op === '=' || op === '*=' || op === '/=' || op === '%=' || op === '+=' || op === '-=' || op === '<<=' || op === '>>=' || op === '>>>=' || op === '&=' || op === '^=' || op === '|=';
      }
      function consumeSemicolon() {
        var line;
        if (source.charCodeAt(index) === 59) {
          lex();
          return;
        }
        line = lineNumber;
        skipComment();
        if (lineNumber !== line) {
          return;
        }
        if (match(';')) {
          lex();
          return;
        }
        if (lookahead.type !== Token.EOF && !match('}')) {
          throwUnexpected(lookahead);
        }
      }
      function isLeftHandSide(expr) {
        return expr.type === Syntax.Identifier || expr.type === Syntax.MemberExpression;
      }
      function isAssignableLeftHandSide(expr) {
        return isLeftHandSide(expr) || expr.type === Syntax.ObjectPattern || expr.type === Syntax.ArrayPattern;
      }
      function parseArrayInitialiser() {
        var elements = [], blocks = [], filter = null, tmp, possiblecomprehension = true, body, marker = markerCreate();
        expect('[');
        while (!match(']')) {
          if (lookahead.value === 'for' && lookahead.type === Token.Keyword) {
            if (!possiblecomprehension) {
              throwError({}, Messages.ComprehensionError);
            }
            matchKeyword('for');
            tmp = parseForStatement({ ignoreBody: true });
            tmp.of = tmp.type === Syntax.ForOfStatement;
            tmp.type = Syntax.ComprehensionBlock;
            if (tmp.left.kind) {
              throwError({}, Messages.ComprehensionError);
            }
            blocks.push(tmp);
          } else if (lookahead.value === 'if' && lookahead.type === Token.Keyword) {
            if (!possiblecomprehension) {
              throwError({}, Messages.ComprehensionError);
            }
            expectKeyword('if');
            expect('(');
            filter = parseExpression();
            expect(')');
          } else if (lookahead.value === ',' && lookahead.type === Token.Punctuator) {
            possiblecomprehension = false;
            lex();
            elements.push(null);
          } else {
            tmp = parseSpreadOrAssignmentExpression();
            elements.push(tmp);
            if (!(match(']') || matchKeyword('for') || matchKeyword('if'))) {
              expect(',');
              possiblecomprehension = false;
            }
          }
        }
        expect(']');
        if (filter && !blocks.length) {
          throwError({}, Messages.ComprehensionRequiresBlock);
        }
        if (blocks.length) {
          if (elements.length !== 1) {
            throwError({}, Messages.ComprehensionError);
          }
          return markerApply(marker, delegate.createComprehensionExpression(filter, blocks, elements[0]));
        }
        return markerApply(marker, delegate.createArrayExpression(elements));
      }
      function parsePropertyFunction(options) {
        var previousStrict, previousYieldAllowed, params, defaults, body, marker = markerCreate();
        previousStrict = strict;
        previousYieldAllowed = state.yieldAllowed;
        state.yieldAllowed = options.generator;
        params = options.params || [];
        defaults = options.defaults || [];
        body = parseConciseBody();
        if (options.name && strict && isRestrictedWord(params[0].name)) {
          throwErrorTolerant(options.name, Messages.StrictParamName);
        }
        strict = previousStrict;
        state.yieldAllowed = previousYieldAllowed;
        return markerApply(marker, delegate.createFunctionExpression(null, params, defaults, body, options.rest || null, options.generator, body.type !== Syntax.BlockStatement));
      }
      function parsePropertyMethodFunction(options) {
        var previousStrict, tmp, method;
        previousStrict = strict;
        strict = true;
        tmp = parseParams();
        if (tmp.stricted) {
          throwErrorTolerant(tmp.stricted, tmp.message);
        }
        method = parsePropertyFunction({
          params: tmp.params,
          defaults: tmp.defaults,
          rest: tmp.rest,
          generator: options.generator
        });
        strict = previousStrict;
        return method;
      }
      function parseObjectPropertyKey() {
        var marker = markerCreate(), token = lex(), propertyKey, result;
        if (token.type === Token.StringLiteral || token.type === Token.NumericLiteral) {
          if (strict && token.octal) {
            throwErrorTolerant(token, Messages.StrictOctalLiteral);
          }
          return markerApply(marker, delegate.createLiteral(token));
        }
        if (token.type === Token.Punctuator && token.value === '[') {
          marker = markerCreate();
          propertyKey = parseAssignmentExpression();
          result = markerApply(marker, propertyKey);
          expect(']');
          return result;
        }
        return markerApply(marker, delegate.createIdentifier(token.value));
      }
      function parseObjectProperty() {
        var token, key, id, value, param, expr, computed, marker = markerCreate();
        token = lookahead;
        computed = token.value === '[';
        if (token.type === Token.Identifier || computed) {
          id = parseObjectPropertyKey();
          if (token.value === 'get' && !(match(':') || match('('))) {
            computed = lookahead.value === '[';
            key = parseObjectPropertyKey();
            expect('(');
            expect(')');
            return markerApply(marker, delegate.createProperty('get', key, parsePropertyFunction({ generator: false }), false, false, computed));
          }
          if (token.value === 'set' && !(match(':') || match('('))) {
            computed = lookahead.value === '[';
            key = parseObjectPropertyKey();
            expect('(');
            token = lookahead;
            param = [parseVariableIdentifier()];
            expect(')');
            return markerApply(marker, delegate.createProperty('set', key, parsePropertyFunction({
              params: param,
              generator: false,
              name: token
            }), false, false, computed));
          }
          if (match(':')) {
            lex();
            return markerApply(marker, delegate.createProperty('init', id, parseAssignmentExpression(), false, false, computed));
          }
          if (match('(')) {
            return markerApply(marker, delegate.createProperty('init', id, parsePropertyMethodFunction({ generator: false }), true, false, computed));
          }
          if (computed) {
            throwUnexpected(lookahead);
          }
          return markerApply(marker, delegate.createProperty('init', id, id, false, true, false));
        }
        if (token.type === Token.EOF || token.type === Token.Punctuator) {
          if (!match('*')) {
            throwUnexpected(token);
          }
          lex();
          computed = lookahead.type === Token.Punctuator && lookahead.value === '[';
          id = parseObjectPropertyKey();
          if (!match('(')) {
            throwUnexpected(lex());
          }
          return markerApply(marker, delegate.createProperty('init', id, parsePropertyMethodFunction({ generator: true }), true, false, computed));
        }
        key = parseObjectPropertyKey();
        if (match(':')) {
          lex();
          return markerApply(marker, delegate.createProperty('init', key, parseAssignmentExpression(), false, false, false));
        }
        if (match('(')) {
          return markerApply(marker, delegate.createProperty('init', key, parsePropertyMethodFunction({ generator: false }), true, false, false));
        }
        throwUnexpected(lex());
      }
      function parseObjectInitialiser() {
        var properties = [], property, name, key, kind, map = {}, toString = String, marker = markerCreate();
        expect('{');
        while (!match('}')) {
          property = parseObjectProperty();
          if (property.key.type === Syntax.Identifier) {
            name = property.key.name;
          } else {
            name = toString(property.key.value);
          }
          kind = property.kind === 'init' ? PropertyKind.Data : property.kind === 'get' ? PropertyKind.Get : PropertyKind.Set;
          key = '$' + name;
          if (Object.prototype.hasOwnProperty.call(map, key)) {
            if (map[key] === PropertyKind.Data) {
              if (strict && kind === PropertyKind.Data) {
                throwErrorTolerant({}, Messages.StrictDuplicateProperty);
              } else if (kind !== PropertyKind.Data) {
                throwErrorTolerant({}, Messages.AccessorDataProperty);
              }
            } else {
              if (kind === PropertyKind.Data) {
                throwErrorTolerant({}, Messages.AccessorDataProperty);
              } else if (map[key] & kind) {
                throwErrorTolerant({}, Messages.AccessorGetSet);
              }
            }
            map[key] |= kind;
          } else {
            map[key] = kind;
          }
          properties.push(property);
          if (!match('}')) {
            expect(',');
          }
        }
        expect('}');
        return markerApply(marker, delegate.createObjectExpression(properties));
      }
      function parseTemplateElement(option) {
        var marker = markerCreate(), token = scanTemplateElement(option);
        if (strict && token.octal) {
          throwError(token, Messages.StrictOctalLiteral);
        }
        return markerApply(marker, delegate.createTemplateElement({
          raw: token.value.raw,
          cooked: token.value.cooked
        }, token.tail));
      }
      function parseTemplateLiteral() {
        var quasi, quasis, expressions, marker = markerCreate();
        quasi = parseTemplateElement({ head: true });
        quasis = [quasi];
        expressions = [];
        while (!quasi.tail) {
          expressions.push(parseExpression());
          quasi = parseTemplateElement({ head: false });
          quasis.push(quasi);
        }
        return markerApply(marker, delegate.createTemplateLiteral(quasis, expressions));
      }
      function parseGroupExpression() {
        var expr;
        expect('(');
        ++state.parenthesizedCount;
        expr = parseExpression();
        expect(')');
        return expr;
      }
      function parsePrimaryExpression() {
        var marker, type, token, expr;
        type = lookahead.type;
        if (type === Token.Identifier) {
          marker = markerCreate();
          return markerApply(marker, delegate.createIdentifier(lex().value));
        }
        if (type === Token.StringLiteral || type === Token.NumericLiteral) {
          if (strict && lookahead.octal) {
            throwErrorTolerant(lookahead, Messages.StrictOctalLiteral);
          }
          marker = markerCreate();
          return markerApply(marker, delegate.createLiteral(lex()));
        }
        if (type === Token.Keyword) {
          if (matchKeyword('this')) {
            marker = markerCreate();
            lex();
            return markerApply(marker, delegate.createThisExpression());
          }
          if (matchKeyword('function')) {
            return parseFunctionExpression();
          }
          if (matchKeyword('class')) {
            return parseClassExpression();
          }
          if (matchKeyword('super')) {
            marker = markerCreate();
            lex();
            return markerApply(marker, delegate.createIdentifier('super'));
          }
        }
        if (type === Token.BooleanLiteral) {
          marker = markerCreate();
          token = lex();
          token.value = token.value === 'true';
          return markerApply(marker, delegate.createLiteral(token));
        }
        if (type === Token.NullLiteral) {
          marker = markerCreate();
          token = lex();
          token.value = null;
          return markerApply(marker, delegate.createLiteral(token));
        }
        if (match('[')) {
          return parseArrayInitialiser();
        }
        if (match('{')) {
          return parseObjectInitialiser();
        }
        if (match('(')) {
          return parseGroupExpression();
        }
        if (match('/') || match('/=')) {
          marker = markerCreate();
          return markerApply(marker, delegate.createLiteral(scanRegExp()));
        }
        if (type === Token.Template) {
          return parseTemplateLiteral();
        }
        throwUnexpected(lex());
      }
      function parseArguments() {
        var args = [], arg;
        expect('(');
        if (!match(')')) {
          while (index < length) {
            arg = parseSpreadOrAssignmentExpression();
            args.push(arg);
            if (match(')')) {
              break;
            }
            expect(',');
          }
        }
        expect(')');
        return args;
      }
      function parseSpreadOrAssignmentExpression() {
        if (match('...')) {
          var marker = markerCreate();
          lex();
          return markerApply(marker, delegate.createSpreadElement(parseAssignmentExpression()));
        }
        return parseAssignmentExpression();
      }
      function parseNonComputedProperty() {
        var marker = markerCreate(), token = lex();
        if (!isIdentifierName(token)) {
          throwUnexpected(token);
        }
        return markerApply(marker, delegate.createIdentifier(token.value));
      }
      function parseNonComputedMember() {
        expect('.');
        return parseNonComputedProperty();
      }
      function parseComputedMember() {
        var expr;
        expect('[');
        expr = parseExpression();
        expect(']');
        return expr;
      }
      function parseNewExpression() {
        var callee, args, marker = markerCreate();
        expectKeyword('new');
        callee = parseLeftHandSideExpression();
        args = match('(') ? parseArguments() : [];
        return markerApply(marker, delegate.createNewExpression(callee, args));
      }
      function parseLeftHandSideExpressionAllowCall() {
        var expr, args, marker = markerCreate();
        expr = matchKeyword('new') ? parseNewExpression() : parsePrimaryExpression();
        while (match('.') || match('[') || match('(') || lookahead.type === Token.Template) {
          if (match('(')) {
            args = parseArguments();
            expr = markerApply(marker, delegate.createCallExpression(expr, args));
          } else if (match('[')) {
            expr = markerApply(marker, delegate.createMemberExpression('[', expr, parseComputedMember()));
          } else if (match('.')) {
            expr = markerApply(marker, delegate.createMemberExpression('.', expr, parseNonComputedMember()));
          } else {
            expr = markerApply(marker, delegate.createTaggedTemplateExpression(expr, parseTemplateLiteral()));
          }
        }
        return expr;
      }
      function parseLeftHandSideExpression() {
        var expr, marker = markerCreate();
        expr = matchKeyword('new') ? parseNewExpression() : parsePrimaryExpression();
        while (match('.') || match('[') || lookahead.type === Token.Template) {
          if (match('[')) {
            expr = markerApply(marker, delegate.createMemberExpression('[', expr, parseComputedMember()));
          } else if (match('.')) {
            expr = markerApply(marker, delegate.createMemberExpression('.', expr, parseNonComputedMember()));
          } else {
            expr = markerApply(marker, delegate.createTaggedTemplateExpression(expr, parseTemplateLiteral()));
          }
        }
        return expr;
      }
      function parsePostfixExpression() {
        var marker = markerCreate(), expr = parseLeftHandSideExpressionAllowCall(), token;
        if (lookahead.type !== Token.Punctuator) {
          return expr;
        }
        if ((match('++') || match('--')) && !peekLineTerminator()) {
          if (strict && expr.type === Syntax.Identifier && isRestrictedWord(expr.name)) {
            throwErrorTolerant({}, Messages.StrictLHSPostfix);
          }
          if (!isLeftHandSide(expr)) {
            throwError({}, Messages.InvalidLHSInAssignment);
          }
          token = lex();
          expr = markerApply(marker, delegate.createPostfixExpression(token.value, expr));
        }
        return expr;
      }
      function parseUnaryExpression() {
        var marker, token, expr;
        if (lookahead.type !== Token.Punctuator && lookahead.type !== Token.Keyword) {
          return parsePostfixExpression();
        }
        if (match('++') || match('--')) {
          marker = markerCreate();
          token = lex();
          expr = parseUnaryExpression();
          if (strict && expr.type === Syntax.Identifier && isRestrictedWord(expr.name)) {
            throwErrorTolerant({}, Messages.StrictLHSPrefix);
          }
          if (!isLeftHandSide(expr)) {
            throwError({}, Messages.InvalidLHSInAssignment);
          }
          return markerApply(marker, delegate.createUnaryExpression(token.value, expr));
        }
        if (match('+') || match('-') || match('~') || match('!')) {
          marker = markerCreate();
          token = lex();
          expr = parseUnaryExpression();
          return markerApply(marker, delegate.createUnaryExpression(token.value, expr));
        }
        if (matchKeyword('delete') || matchKeyword('void') || matchKeyword('typeof')) {
          marker = markerCreate();
          token = lex();
          expr = parseUnaryExpression();
          expr = markerApply(marker, delegate.createUnaryExpression(token.value, expr));
          if (strict && expr.operator === 'delete' && expr.argument.type === Syntax.Identifier) {
            throwErrorTolerant({}, Messages.StrictDelete);
          }
          return expr;
        }
        return parsePostfixExpression();
      }
      function binaryPrecedence(token, allowIn) {
        var prec = 0;
        if (token.type !== Token.Punctuator && token.type !== Token.Keyword) {
          return 0;
        }
        switch (token.value) {
        case '||':
          prec = 1;
          break;
        case '&&':
          prec = 2;
          break;
        case '|':
          prec = 3;
          break;
        case '^':
          prec = 4;
          break;
        case '&':
          prec = 5;
          break;
        case '==':
        case '!=':
        case '===':
        case '!==':
          prec = 6;
          break;
        case '<':
        case '>':
        case '<=':
        case '>=':
        case 'instanceof':
          prec = 7;
          break;
        case 'in':
          prec = allowIn ? 7 : 0;
          break;
        case '<<':
        case '>>':
        case '>>>':
          prec = 8;
          break;
        case '+':
        case '-':
          prec = 9;
          break;
        case '*':
        case '/':
        case '%':
          prec = 11;
          break;
        default:
          break;
        }
        return prec;
      }
      function parseBinaryExpression() {
        var expr, token, prec, previousAllowIn, stack, right, operator, left, i, marker, markers;
        previousAllowIn = state.allowIn;
        state.allowIn = true;
        marker = markerCreate();
        left = parseUnaryExpression();
        token = lookahead;
        prec = binaryPrecedence(token, previousAllowIn);
        if (prec === 0) {
          return left;
        }
        token.prec = prec;
        lex();
        markers = [
          marker,
          markerCreate()
        ];
        right = parseUnaryExpression();
        stack = [
          left,
          token,
          right
        ];
        while ((prec = binaryPrecedence(lookahead, previousAllowIn)) > 0) {
          while (stack.length > 2 && prec <= stack[stack.length - 2].prec) {
            right = stack.pop();
            operator = stack.pop().value;
            left = stack.pop();
            expr = delegate.createBinaryExpression(operator, left, right);
            markers.pop();
            marker = markers.pop();
            markerApply(marker, expr);
            stack.push(expr);
            markers.push(marker);
          }
          token = lex();
          token.prec = prec;
          stack.push(token);
          markers.push(markerCreate());
          expr = parseUnaryExpression();
          stack.push(expr);
        }
        state.allowIn = previousAllowIn;
        i = stack.length - 1;
        expr = stack[i];
        markers.pop();
        while (i > 1) {
          expr = delegate.createBinaryExpression(stack[i - 1].value, stack[i - 2], expr);
          i -= 2;
          marker = markers.pop();
          markerApply(marker, expr);
        }
        return expr;
      }
      function parseConditionalExpression() {
        var expr, previousAllowIn, consequent, alternate, marker = markerCreate();
        expr = parseBinaryExpression();
        if (match('?')) {
          lex();
          previousAllowIn = state.allowIn;
          state.allowIn = true;
          consequent = parseAssignmentExpression();
          state.allowIn = previousAllowIn;
          expect(':');
          alternate = parseAssignmentExpression();
          expr = markerApply(marker, delegate.createConditionalExpression(expr, consequent, alternate));
        }
        return expr;
      }
      function reinterpretAsAssignmentBindingPattern(expr) {
        var i, len, property, element;
        if (expr.type === Syntax.ObjectExpression) {
          expr.type = Syntax.ObjectPattern;
          for (i = 0, len = expr.properties.length; i < len; i += 1) {
            property = expr.properties[i];
            if (property.kind !== 'init') {
              throwError({}, Messages.InvalidLHSInAssignment);
            }
            reinterpretAsAssignmentBindingPattern(property.value);
          }
        } else if (expr.type === Syntax.ArrayExpression) {
          expr.type = Syntax.ArrayPattern;
          for (i = 0, len = expr.elements.length; i < len; i += 1) {
            element = expr.elements[i];
            if (element) {
              reinterpretAsAssignmentBindingPattern(element);
            }
          }
        } else if (expr.type === Syntax.Identifier) {
          if (isRestrictedWord(expr.name)) {
            throwError({}, Messages.InvalidLHSInAssignment);
          }
        } else if (expr.type === Syntax.SpreadElement) {
          reinterpretAsAssignmentBindingPattern(expr.argument);
          if (expr.argument.type === Syntax.ObjectPattern) {
            throwError({}, Messages.ObjectPatternAsSpread);
          }
        } else {
          if (expr.type !== Syntax.MemberExpression && expr.type !== Syntax.CallExpression && expr.type !== Syntax.NewExpression) {
            throwError({}, Messages.InvalidLHSInAssignment);
          }
        }
      }
      function reinterpretAsDestructuredParameter(options, expr) {
        var i, len, property, element;
        if (expr.type === Syntax.ObjectExpression) {
          expr.type = Syntax.ObjectPattern;
          for (i = 0, len = expr.properties.length; i < len; i += 1) {
            property = expr.properties[i];
            if (property.kind !== 'init') {
              throwError({}, Messages.InvalidLHSInFormalsList);
            }
            reinterpretAsDestructuredParameter(options, property.value);
          }
        } else if (expr.type === Syntax.ArrayExpression) {
          expr.type = Syntax.ArrayPattern;
          for (i = 0, len = expr.elements.length; i < len; i += 1) {
            element = expr.elements[i];
            if (element) {
              reinterpretAsDestructuredParameter(options, element);
            }
          }
        } else if (expr.type === Syntax.Identifier) {
          validateParam(options, expr, expr.name);
        } else {
          if (expr.type !== Syntax.MemberExpression) {
            throwError({}, Messages.InvalidLHSInFormalsList);
          }
        }
      }
      function reinterpretAsCoverFormalsList(expressions) {
        var i, len, param, params, defaults, defaultCount, options, rest;
        params = [];
        defaults = [];
        defaultCount = 0;
        rest = null;
        options = { paramSet: {} };
        for (i = 0, len = expressions.length; i < len; i += 1) {
          param = expressions[i];
          if (param.type === Syntax.Identifier) {
            params.push(param);
            defaults.push(null);
            validateParam(options, param, param.name);
          } else if (param.type === Syntax.ObjectExpression || param.type === Syntax.ArrayExpression) {
            reinterpretAsDestructuredParameter(options, param);
            params.push(param);
            defaults.push(null);
          } else if (param.type === Syntax.SpreadElement) {
            assert(i === len - 1, 'It is guaranteed that SpreadElement is last element by parseExpression');
            reinterpretAsDestructuredParameter(options, param.argument);
            rest = param.argument;
          } else if (param.type === Syntax.AssignmentExpression) {
            params.push(param.left);
            defaults.push(param.right);
            ++defaultCount;
            validateParam(options, param.left, param.left.name);
          } else {
            return null;
          }
        }
        if (options.message === Messages.StrictParamDupe) {
          throwError(strict ? options.stricted : options.firstRestricted, options.message);
        }
        if (defaultCount === 0) {
          defaults = [];
        }
        return {
          params: params,
          defaults: defaults,
          rest: rest,
          stricted: options.stricted,
          firstRestricted: options.firstRestricted,
          message: options.message
        };
      }
      function parseArrowFunctionExpression(options, marker) {
        var previousStrict, previousYieldAllowed, body;
        expect('=>');
        previousStrict = strict;
        previousYieldAllowed = state.yieldAllowed;
        state.yieldAllowed = false;
        body = parseConciseBody();
        if (strict && options.firstRestricted) {
          throwError(options.firstRestricted, options.message);
        }
        if (strict && options.stricted) {
          throwErrorTolerant(options.stricted, options.message);
        }
        strict = previousStrict;
        state.yieldAllowed = previousYieldAllowed;
        return markerApply(marker, delegate.createArrowFunctionExpression(options.params, options.defaults, body, options.rest, body.type !== Syntax.BlockStatement));
      }
      function parseAssignmentExpression() {
        var marker, expr, token, params, oldParenthesizedCount;
        if (state.yieldAllowed && matchContextualKeyword('yield') || strict && matchKeyword('yield')) {
          return parseYieldExpression();
        }
        oldParenthesizedCount = state.parenthesizedCount;
        marker = markerCreate();
        if (match('(')) {
          token = lookahead2();
          if (token.type === Token.Punctuator && token.value === ')' || token.value === '...') {
            params = parseParams();
            if (!match('=>')) {
              throwUnexpected(lex());
            }
            return parseArrowFunctionExpression(params, marker);
          }
        }
        token = lookahead;
        expr = parseConditionalExpression();
        if (match('=>') && (state.parenthesizedCount === oldParenthesizedCount || state.parenthesizedCount === oldParenthesizedCount + 1)) {
          expr = expr.type === Syntax.SequenceExpression ? expr.expressions : [expr];
          params = reinterpretAsCoverFormalsList(expr);
          if (params) {
            return parseArrowFunctionExpression(params, marker);
          }
        }
        if (matchAssign()) {
          if (strict && expr.type === Syntax.Identifier && isRestrictedWord(expr.name)) {
            throwErrorTolerant(token, Messages.StrictLHSAssignment);
          }
          if (match('=') && (expr.type === Syntax.ObjectExpression || expr.type === Syntax.ArrayExpression)) {
            reinterpretAsAssignmentBindingPattern(expr);
          } else if (!isLeftHandSide(expr)) {
            throwError({}, Messages.InvalidLHSInAssignment);
          }
          expr = markerApply(marker, delegate.createAssignmentExpression(lex().value, expr, parseAssignmentExpression()));
        }
        return expr;
      }
      function parseExpression() {
        var marker, expr, expressions, sequence, coverFormalsList, spreadFound, oldParenthesizedCount;
        oldParenthesizedCount = state.parenthesizedCount;
        marker = markerCreate();
        expr = parseAssignmentExpression();
        expressions = [expr];
        if (match(',')) {
          while (index < length) {
            if (!match(',')) {
              break;
            }
            lex();
            expr = parseSpreadOrAssignmentExpression();
            expressions.push(expr);
            if (expr.type === Syntax.SpreadElement) {
              spreadFound = true;
              break;
            }
          }
          sequence = markerApply(marker, delegate.createSequenceExpression(expressions));
        }
        if (match('=>')) {
          if (state.parenthesizedCount === oldParenthesizedCount || state.parenthesizedCount === oldParenthesizedCount + 1) {
            expr = expr.type === Syntax.SequenceExpression ? expr.expressions : expressions;
            coverFormalsList = reinterpretAsCoverFormalsList(expr);
            if (coverFormalsList) {
              return parseArrowFunctionExpression(coverFormalsList, marker);
            }
          }
          throwUnexpected(lex());
        }
        if (spreadFound && lookahead2().value !== '=>') {
          throwError({}, Messages.IllegalSpread);
        }
        return sequence || expr;
      }
      function parseStatementList() {
        var list = [], statement;
        while (index < length) {
          if (match('}')) {
            break;
          }
          statement = parseSourceElement();
          if (typeof statement === 'undefined') {
            break;
          }
          list.push(statement);
        }
        return list;
      }
      function parseBlock() {
        var block, marker = markerCreate();
        expect('{');
        block = parseStatementList();
        expect('}');
        return markerApply(marker, delegate.createBlockStatement(block));
      }
      function parseVariableIdentifier() {
        var marker = markerCreate(), token = lex();
        if (token.type !== Token.Identifier) {
          throwUnexpected(token);
        }
        return markerApply(marker, delegate.createIdentifier(token.value));
      }
      function parseVariableDeclaration(kind) {
        var id, marker = markerCreate(), init = null;
        if (match('{')) {
          id = parseObjectInitialiser();
          reinterpretAsAssignmentBindingPattern(id);
        } else if (match('[')) {
          id = parseArrayInitialiser();
          reinterpretAsAssignmentBindingPattern(id);
        } else {
          id = state.allowKeyword ? parseNonComputedProperty() : parseVariableIdentifier();
          if (strict && isRestrictedWord(id.name)) {
            throwErrorTolerant({}, Messages.StrictVarName);
          }
        }
        if (kind === 'const') {
          if (!match('=')) {
            throwError({}, Messages.NoUnintializedConst);
          }
          expect('=');
          init = parseAssignmentExpression();
        } else if (match('=')) {
          lex();
          init = parseAssignmentExpression();
        }
        return markerApply(marker, delegate.createVariableDeclarator(id, init));
      }
      function parseVariableDeclarationList(kind) {
        var list = [];
        do {
          list.push(parseVariableDeclaration(kind));
          if (!match(',')) {
            break;
          }
          lex();
        } while (index < length);
        return list;
      }
      function parseVariableStatement() {
        var declarations, marker = markerCreate();
        expectKeyword('var');
        declarations = parseVariableDeclarationList();
        consumeSemicolon();
        return markerApply(marker, delegate.createVariableDeclaration(declarations, 'var'));
      }
      function parseConstLetDeclaration(kind) {
        var declarations, marker = markerCreate();
        expectKeyword(kind);
        declarations = parseVariableDeclarationList(kind);
        consumeSemicolon();
        return markerApply(marker, delegate.createVariableDeclaration(declarations, kind));
      }
      function parseModuleDeclaration() {
        var id, src, body, marker = markerCreate();
        lex();
        if (peekLineTerminator()) {
          throwError({}, Messages.NewlineAfterModule);
        }
        switch (lookahead.type) {
        case Token.StringLiteral:
          id = parsePrimaryExpression();
          body = parseModuleBlock();
          src = null;
          break;
        case Token.Identifier:
          id = parseVariableIdentifier();
          body = null;
          if (!matchContextualKeyword('from')) {
            throwUnexpected(lex());
          }
          lex();
          src = parsePrimaryExpression();
          if (src.type !== Syntax.Literal) {
            throwError({}, Messages.InvalidModuleSpecifier);
          }
          break;
        }
        consumeSemicolon();
        return markerApply(marker, delegate.createModuleDeclaration(id, src, body));
      }
      function parseExportBatchSpecifier() {
        var marker = markerCreate();
        expect('*');
        return markerApply(marker, delegate.createExportBatchSpecifier());
      }
      function parseExportSpecifier() {
        var id, name = null, marker = markerCreate();
        id = parseVariableIdentifier();
        if (matchContextualKeyword('as')) {
          lex();
          name = parseNonComputedProperty();
        }
        return markerApply(marker, delegate.createExportSpecifier(id, name));
      }
      function parseExportDeclaration() {
        var previousAllowKeyword, decl, def, src, specifiers, marker = markerCreate();
        specifiers = [];
        expectKeyword('export');
        if (lookahead.type === Token.Keyword) {
          switch (lookahead.value) {
          case 'let':
          case 'const':
          case 'var':
          case 'class':
          case 'function':
            return markerApply(marker, delegate.createExportDeclaration(parseSourceElement(), specifiers, null, false));
          case 'default':
            expectKeyword('default');
            return markerApply(marker, delegate.createExportDeclaration(parseAssignmentExpression(), specifiers, null, true));
          }
        }
        src = null;
        if (match('*')) {
          specifiers.push(parseExportBatchSpecifier());
        } else {
          expect('{');
          do {
            specifiers.push(parseExportSpecifier());
          } while (match(',') && lex());
          expect('}');
        }
        if (matchContextualKeyword('from')) {
          lex();
          src = parsePrimaryExpression();
          if (src.type !== Syntax.Literal) {
            throwError({}, Messages.InvalidModuleSpecifier);
          }
        }
        consumeSemicolon();
        return markerApply(marker, delegate.createExportDeclaration(null, specifiers, src, false));
      }
      function parseImportDeclaration() {
        var specifiers, kind, src, marker = markerCreate();
        expectKeyword('import');
        specifiers = [];
        if (isIdentifierName(lookahead)) {
          var specifier = parseImportSpecifier();
          if (!specifier.name) {
            kind = 'default';
          } else {
            kind = 'named';
          }
          specifiers.push(specifier);
          if (!matchContextualKeyword('from')) {
            throwError({}, Messages.NoFromAfterImport);
          }
          lex();
        } else if (match('{')) {
          kind = 'named';
          lex();
          do {
            specifiers.push(parseImportSpecifier());
          } while (match(',') && lex());
          expect('}');
          if (!matchContextualKeyword('from')) {
            throwError({}, Messages.NoFromAfterImport);
          }
          lex();
        }
        src = parsePrimaryExpression();
        if (src.type !== Syntax.Literal) {
          throwError({}, Messages.InvalidModuleSpecifier);
        }
        consumeSemicolon();
        return markerApply(marker, delegate.createImportDeclaration(specifiers, kind, src));
      }
      function parseImportSpecifier() {
        var id, name = null, marker = markerCreate();
        id = parseNonComputedProperty();
        if (matchContextualKeyword('as')) {
          lex();
          name = parseVariableIdentifier();
        }
        return markerApply(marker, delegate.createImportSpecifier(id, name));
      }
      function parseEmptyStatement() {
        var marker = markerCreate();
        expect(';');
        return markerApply(marker, delegate.createEmptyStatement());
      }
      function parseExpressionStatement() {
        var marker = markerCreate(), expr = parseExpression();
        consumeSemicolon();
        return markerApply(marker, delegate.createExpressionStatement(expr));
      }
      function parseIfStatement() {
        var test, consequent, alternate, marker = markerCreate();
        expectKeyword('if');
        expect('(');
        test = parseExpression();
        expect(')');
        consequent = parseStatement();
        if (matchKeyword('else')) {
          lex();
          alternate = parseStatement();
        } else {
          alternate = null;
        }
        return markerApply(marker, delegate.createIfStatement(test, consequent, alternate));
      }
      function parseDoWhileStatement() {
        var body, test, oldInIteration, marker = markerCreate();
        expectKeyword('do');
        oldInIteration = state.inIteration;
        state.inIteration = true;
        body = parseStatement();
        state.inIteration = oldInIteration;
        expectKeyword('while');
        expect('(');
        test = parseExpression();
        expect(')');
        if (match(';')) {
          lex();
        }
        return markerApply(marker, delegate.createDoWhileStatement(body, test));
      }
      function parseWhileStatement() {
        var test, body, oldInIteration, marker = markerCreate();
        expectKeyword('while');
        expect('(');
        test = parseExpression();
        expect(')');
        oldInIteration = state.inIteration;
        state.inIteration = true;
        body = parseStatement();
        state.inIteration = oldInIteration;
        return markerApply(marker, delegate.createWhileStatement(test, body));
      }
      function parseForVariableDeclaration() {
        var marker = markerCreate(), token = lex(), declarations = parseVariableDeclarationList();
        return markerApply(marker, delegate.createVariableDeclaration(declarations, token.value));
      }
      function parseForStatement(opts) {
        var init, test, update, left, right, body, operator, oldInIteration, marker = markerCreate();
        init = test = update = null;
        expectKeyword('for');
        if (matchContextualKeyword('each')) {
          throwError({}, Messages.EachNotAllowed);
        }
        expect('(');
        if (match(';')) {
          lex();
        } else {
          if (matchKeyword('var') || matchKeyword('let') || matchKeyword('const')) {
            state.allowIn = false;
            init = parseForVariableDeclaration();
            state.allowIn = true;
            if (init.declarations.length === 1) {
              if (matchKeyword('in') || matchContextualKeyword('of')) {
                operator = lookahead;
                if (!((operator.value === 'in' || init.kind !== 'var') && init.declarations[0].init)) {
                  lex();
                  left = init;
                  right = parseExpression();
                  init = null;
                }
              }
            }
          } else {
            var options = { paramSet: {} };
            var isPattern = match('{') || match('[');
            state.allowIn = false;
            init = parseExpression();
            state.allowIn = true;
            if (matchContextualKeyword('of')) {
              operator = lex();
              if (isPattern) {
                reinterpretAsDestructuredParameter(options, init);
              }
              left = init;
              right = parseExpression();
              init = null;
            } else if (matchKeyword('in')) {
              if (isPattern) {
                reinterpretAsDestructuredParameter(options, init);
              }
              if (!isAssignableLeftHandSide(init)) {
                throwError({}, Messages.InvalidLHSInForIn);
              }
              operator = lex();
              left = init;
              right = parseExpression();
              init = null;
            }
          }
          if (typeof left === 'undefined') {
            expect(';');
          }
        }
        if (typeof left === 'undefined') {
          if (!match(';')) {
            test = parseExpression();
          }
          expect(';');
          if (!match(')')) {
            update = parseExpression();
          }
        }
        expect(')');
        oldInIteration = state.inIteration;
        state.inIteration = true;
        if (!(opts !== undefined && opts.ignoreBody)) {
          body = parseStatement();
        }
        state.inIteration = oldInIteration;
        if (typeof left === 'undefined') {
          return markerApply(marker, delegate.createForStatement(init, test, update, body));
        }
        if (operator.value === 'in') {
          return markerApply(marker, delegate.createForInStatement(left, right, body));
        }
        return markerApply(marker, delegate.createForOfStatement(left, right, body));
      }
      function parseContinueStatement() {
        var label = null, key, marker = markerCreate();
        expectKeyword('continue');
        if (source.charCodeAt(index) === 59) {
          lex();
          if (!state.inIteration) {
            throwError({}, Messages.IllegalContinue);
          }
          return markerApply(marker, delegate.createContinueStatement(null));
        }
        if (peekLineTerminator()) {
          if (!state.inIteration) {
            throwError({}, Messages.IllegalContinue);
          }
          return markerApply(marker, delegate.createContinueStatement(null));
        }
        if (lookahead.type === Token.Identifier) {
          label = parseVariableIdentifier();
          key = '$' + label.name;
          if (!Object.prototype.hasOwnProperty.call(state.labelSet, key)) {
            throwError({}, Messages.UnknownLabel, label.name);
          }
        }
        consumeSemicolon();
        if (label === null && !state.inIteration) {
          throwError({}, Messages.IllegalContinue);
        }
        return markerApply(marker, delegate.createContinueStatement(label));
      }
      function parseBreakStatement() {
        var label = null, key, marker = markerCreate();
        expectKeyword('break');
        if (source.charCodeAt(index) === 59) {
          lex();
          if (!(state.inIteration || state.inSwitch)) {
            throwError({}, Messages.IllegalBreak);
          }
          return markerApply(marker, delegate.createBreakStatement(null));
        }
        if (peekLineTerminator()) {
          if (!(state.inIteration || state.inSwitch)) {
            throwError({}, Messages.IllegalBreak);
          }
          return markerApply(marker, delegate.createBreakStatement(null));
        }
        if (lookahead.type === Token.Identifier) {
          label = parseVariableIdentifier();
          key = '$' + label.name;
          if (!Object.prototype.hasOwnProperty.call(state.labelSet, key)) {
            throwError({}, Messages.UnknownLabel, label.name);
          }
        }
        consumeSemicolon();
        if (label === null && !(state.inIteration || state.inSwitch)) {
          throwError({}, Messages.IllegalBreak);
        }
        return markerApply(marker, delegate.createBreakStatement(label));
      }
      function parseReturnStatement() {
        var argument = null, marker = markerCreate();
        expectKeyword('return');
        if (!state.inFunctionBody) {
          throwErrorTolerant({}, Messages.IllegalReturn);
        }
        if (source.charCodeAt(index) === 32) {
          if (isIdentifierStart(source.charCodeAt(index + 1))) {
            argument = parseExpression();
            consumeSemicolon();
            return markerApply(marker, delegate.createReturnStatement(argument));
          }
        }
        if (peekLineTerminator()) {
          return markerApply(marker, delegate.createReturnStatement(null));
        }
        if (!match(';')) {
          if (!match('}') && lookahead.type !== Token.EOF) {
            argument = parseExpression();
          }
        }
        consumeSemicolon();
        return markerApply(marker, delegate.createReturnStatement(argument));
      }
      function parseWithStatement() {
        var object, body, marker = markerCreate();
        if (strict) {
          throwErrorTolerant({}, Messages.StrictModeWith);
        }
        expectKeyword('with');
        expect('(');
        object = parseExpression();
        expect(')');
        body = parseStatement();
        return markerApply(marker, delegate.createWithStatement(object, body));
      }
      function parseSwitchCase() {
        var test, consequent = [], sourceElement, marker = markerCreate();
        if (matchKeyword('default')) {
          lex();
          test = null;
        } else {
          expectKeyword('case');
          test = parseExpression();
        }
        expect(':');
        while (index < length) {
          if (match('}') || matchKeyword('default') || matchKeyword('case')) {
            break;
          }
          sourceElement = parseSourceElement();
          if (typeof sourceElement === 'undefined') {
            break;
          }
          consequent.push(sourceElement);
        }
        return markerApply(marker, delegate.createSwitchCase(test, consequent));
      }
      function parseSwitchStatement() {
        var discriminant, cases, clause, oldInSwitch, defaultFound, marker = markerCreate();
        expectKeyword('switch');
        expect('(');
        discriminant = parseExpression();
        expect(')');
        expect('{');
        cases = [];
        if (match('}')) {
          lex();
          return markerApply(marker, delegate.createSwitchStatement(discriminant, cases));
        }
        oldInSwitch = state.inSwitch;
        state.inSwitch = true;
        defaultFound = false;
        while (index < length) {
          if (match('}')) {
            break;
          }
          clause = parseSwitchCase();
          if (clause.test === null) {
            if (defaultFound) {
              throwError({}, Messages.MultipleDefaultsInSwitch);
            }
            defaultFound = true;
          }
          cases.push(clause);
        }
        state.inSwitch = oldInSwitch;
        expect('}');
        return markerApply(marker, delegate.createSwitchStatement(discriminant, cases));
      }
      function parseThrowStatement() {
        var argument, marker = markerCreate();
        expectKeyword('throw');
        if (peekLineTerminator()) {
          throwError({}, Messages.NewlineAfterThrow);
        }
        argument = parseExpression();
        consumeSemicolon();
        return markerApply(marker, delegate.createThrowStatement(argument));
      }
      function parseCatchClause() {
        var param, body, marker = markerCreate();
        expectKeyword('catch');
        expect('(');
        if (match(')')) {
          throwUnexpected(lookahead);
        }
        param = parseExpression();
        if (strict && param.type === Syntax.Identifier && isRestrictedWord(param.name)) {
          throwErrorTolerant({}, Messages.StrictCatchVariable);
        }
        expect(')');
        body = parseBlock();
        return markerApply(marker, delegate.createCatchClause(param, body));
      }
      function parseTryStatement() {
        var block, handlers = [], finalizer = null, marker = markerCreate();
        expectKeyword('try');
        block = parseBlock();
        if (matchKeyword('catch')) {
          handlers.push(parseCatchClause());
        }
        if (matchKeyword('finally')) {
          lex();
          finalizer = parseBlock();
        }
        if (handlers.length === 0 && !finalizer) {
          throwError({}, Messages.NoCatchOrFinally);
        }
        return markerApply(marker, delegate.createTryStatement(block, [], handlers, finalizer));
      }
      function parseDebuggerStatement() {
        var marker = markerCreate();
        expectKeyword('debugger');
        consumeSemicolon();
        return markerApply(marker, delegate.createDebuggerStatement());
      }
      function parseStatement() {
        var type = lookahead.type, marker, expr, labeledBody, key;
        if (type === Token.EOF) {
          throwUnexpected(lookahead);
        }
        if (type === Token.Punctuator) {
          switch (lookahead.value) {
          case ';':
            return parseEmptyStatement();
          case '{':
            return parseBlock();
          case '(':
            return parseExpressionStatement();
          default:
            break;
          }
        }
        if (type === Token.Keyword) {
          switch (lookahead.value) {
          case 'break':
            return parseBreakStatement();
          case 'continue':
            return parseContinueStatement();
          case 'debugger':
            return parseDebuggerStatement();
          case 'do':
            return parseDoWhileStatement();
          case 'for':
            return parseForStatement();
          case 'function':
            return parseFunctionDeclaration();
          case 'class':
            return parseClassDeclaration();
          case 'if':
            return parseIfStatement();
          case 'return':
            return parseReturnStatement();
          case 'switch':
            return parseSwitchStatement();
          case 'throw':
            return parseThrowStatement();
          case 'try':
            return parseTryStatement();
          case 'var':
            return parseVariableStatement();
          case 'while':
            return parseWhileStatement();
          case 'with':
            return parseWithStatement();
          default:
            break;
          }
        }
        marker = markerCreate();
        expr = parseExpression();
        if (expr.type === Syntax.Identifier && match(':')) {
          lex();
          key = '$' + expr.name;
          if (Object.prototype.hasOwnProperty.call(state.labelSet, key)) {
            throwError({}, Messages.Redeclaration, 'Label', expr.name);
          }
          state.labelSet[key] = true;
          labeledBody = parseStatement();
          delete state.labelSet[key];
          return markerApply(marker, delegate.createLabeledStatement(expr, labeledBody));
        }
        consumeSemicolon();
        return markerApply(marker, delegate.createExpressionStatement(expr));
      }
      function parseConciseBody() {
        if (match('{')) {
          return parseFunctionSourceElements();
        }
        return parseAssignmentExpression();
      }
      function parseFunctionSourceElements() {
        var sourceElement, sourceElements = [], token, directive, firstRestricted, oldLabelSet, oldInIteration, oldInSwitch, oldInFunctionBody, oldParenthesizedCount, marker = markerCreate();
        expect('{');
        while (index < length) {
          if (lookahead.type !== Token.StringLiteral) {
            break;
          }
          token = lookahead;
          sourceElement = parseSourceElement();
          sourceElements.push(sourceElement);
          if (sourceElement.expression.type !== Syntax.Literal) {
            break;
          }
          directive = source.slice(token.range[0] + 1, token.range[1] - 1);
          if (directive === 'use strict') {
            strict = true;
            if (firstRestricted) {
              throwErrorTolerant(firstRestricted, Messages.StrictOctalLiteral);
            }
          } else {
            if (!firstRestricted && token.octal) {
              firstRestricted = token;
            }
          }
        }
        oldLabelSet = state.labelSet;
        oldInIteration = state.inIteration;
        oldInSwitch = state.inSwitch;
        oldInFunctionBody = state.inFunctionBody;
        oldParenthesizedCount = state.parenthesizedCount;
        state.labelSet = {};
        state.inIteration = false;
        state.inSwitch = false;
        state.inFunctionBody = true;
        state.parenthesizedCount = 0;
        while (index < length) {
          if (match('}')) {
            break;
          }
          sourceElement = parseSourceElement();
          if (typeof sourceElement === 'undefined') {
            break;
          }
          sourceElements.push(sourceElement);
        }
        expect('}');
        state.labelSet = oldLabelSet;
        state.inIteration = oldInIteration;
        state.inSwitch = oldInSwitch;
        state.inFunctionBody = oldInFunctionBody;
        state.parenthesizedCount = oldParenthesizedCount;
        return markerApply(marker, delegate.createBlockStatement(sourceElements));
      }
      function validateParam(options, param, name) {
        var key = '$' + name;
        if (strict) {
          if (isRestrictedWord(name)) {
            options.stricted = param;
            options.message = Messages.StrictParamName;
          }
          if (Object.prototype.hasOwnProperty.call(options.paramSet, key)) {
            options.stricted = param;
            options.message = Messages.StrictParamDupe;
          }
        } else if (!options.firstRestricted) {
          if (isRestrictedWord(name)) {
            options.firstRestricted = param;
            options.message = Messages.StrictParamName;
          } else if (isStrictModeReservedWord(name)) {
            options.firstRestricted = param;
            options.message = Messages.StrictReservedWord;
          } else if (Object.prototype.hasOwnProperty.call(options.paramSet, key)) {
            options.firstRestricted = param;
            options.message = Messages.StrictParamDupe;
          }
        }
        options.paramSet[key] = true;
      }
      function parseParam(options) {
        var token, rest, param, def = null;
        token = lookahead;
        if (token.value === '...') {
          token = lex();
          rest = true;
        }
        if (match('[')) {
          param = parseArrayInitialiser();
          reinterpretAsDestructuredParameter(options, param);
        } else if (match('{')) {
          if (rest) {
            throwError({}, Messages.ObjectPatternAsRestParameter);
          }
          param = parseObjectInitialiser();
          reinterpretAsDestructuredParameter(options, param);
        } else {
          param = parseVariableIdentifier();
          validateParam(options, token, token.value);
        }
        if (match('=')) {
          if (rest) {
            throwErrorTolerant(lookahead, Messages.DefaultRestParameter);
          }
          lex();
          def = parseAssignmentExpression();
          ++options.defaultCount;
        }
        if (rest) {
          if (!match(')')) {
            throwError({}, Messages.ParameterAfterRestParameter);
          }
          options.rest = param;
          return false;
        }
        options.params.push(param);
        options.defaults.push(def);
        return !match(')');
      }
      function parseParams(firstRestricted) {
        var options, marker = markerCreate();
        options = {
          params: [],
          defaultCount: 0,
          defaults: [],
          rest: null,
          firstRestricted: firstRestricted
        };
        expect('(');
        if (!match(')')) {
          options.paramSet = {};
          while (index < length) {
            if (!parseParam(options)) {
              break;
            }
            expect(',');
          }
        }
        expect(')');
        if (options.defaultCount === 0) {
          options.defaults = [];
        }
        return markerApply(marker, options);
      }
      function parseFunctionDeclaration() {
        var id, body, token, tmp, firstRestricted, message, previousStrict, previousYieldAllowed, generator, marker = markerCreate();
        expectKeyword('function');
        generator = false;
        if (match('*')) {
          lex();
          generator = true;
        }
        token = lookahead;
        id = parseVariableIdentifier();
        if (strict) {
          if (isRestrictedWord(token.value)) {
            throwErrorTolerant(token, Messages.StrictFunctionName);
          }
        } else {
          if (isRestrictedWord(token.value)) {
            firstRestricted = token;
            message = Messages.StrictFunctionName;
          } else if (isStrictModeReservedWord(token.value)) {
            firstRestricted = token;
            message = Messages.StrictReservedWord;
          }
        }
        tmp = parseParams(firstRestricted);
        firstRestricted = tmp.firstRestricted;
        if (tmp.message) {
          message = tmp.message;
        }
        previousStrict = strict;
        previousYieldAllowed = state.yieldAllowed;
        state.yieldAllowed = generator;
        body = parseFunctionSourceElements();
        if (strict && firstRestricted) {
          throwError(firstRestricted, message);
        }
        if (strict && tmp.stricted) {
          throwErrorTolerant(tmp.stricted, message);
        }
        strict = previousStrict;
        state.yieldAllowed = previousYieldAllowed;
        return markerApply(marker, delegate.createFunctionDeclaration(id, tmp.params, tmp.defaults, body, tmp.rest, generator, false));
      }
      function parseFunctionExpression() {
        var token, id = null, firstRestricted, message, tmp, body, previousStrict, previousYieldAllowed, generator, marker = markerCreate();
        expectKeyword('function');
        generator = false;
        if (match('*')) {
          lex();
          generator = true;
        }
        if (!match('(')) {
          token = lookahead;
          id = parseVariableIdentifier();
          if (strict) {
            if (isRestrictedWord(token.value)) {
              throwErrorTolerant(token, Messages.StrictFunctionName);
            }
          } else {
            if (isRestrictedWord(token.value)) {
              firstRestricted = token;
              message = Messages.StrictFunctionName;
            } else if (isStrictModeReservedWord(token.value)) {
              firstRestricted = token;
              message = Messages.StrictReservedWord;
            }
          }
        }
        tmp = parseParams(firstRestricted);
        firstRestricted = tmp.firstRestricted;
        if (tmp.message) {
          message = tmp.message;
        }
        previousStrict = strict;
        previousYieldAllowed = state.yieldAllowed;
        state.yieldAllowed = generator;
        body = parseFunctionSourceElements();
        if (strict && firstRestricted) {
          throwError(firstRestricted, message);
        }
        if (strict && tmp.stricted) {
          throwErrorTolerant(tmp.stricted, message);
        }
        strict = previousStrict;
        state.yieldAllowed = previousYieldAllowed;
        return markerApply(marker, delegate.createFunctionExpression(id, tmp.params, tmp.defaults, body, tmp.rest, generator, false));
      }
      function parseYieldExpression() {
        var yieldToken, delegateFlag, expr, marker = markerCreate();
        yieldToken = lex();
        assert(yieldToken.value === 'yield', 'Called parseYieldExpression with non-yield lookahead.');
        if (!state.yieldAllowed) {
          throwErrorTolerant({}, Messages.IllegalYield);
        }
        delegateFlag = false;
        if (match('*')) {
          lex();
          delegateFlag = true;
        }
        expr = parseAssignmentExpression();
        return markerApply(marker, delegate.createYieldExpression(expr, delegateFlag));
      }
      function parseMethodDefinition(existingPropNames) {
        var token, key, param, propType, isValidDuplicateProp = false, marker = markerCreate();
        if (lookahead.value === 'static') {
          propType = ClassPropertyType.static;
          lex();
        } else {
          propType = ClassPropertyType.prototype;
        }
        if (match('*')) {
          lex();
          return markerApply(marker, delegate.createMethodDefinition(propType, '', parseObjectPropertyKey(), parsePropertyMethodFunction({ generator: true })));
        }
        token = lookahead;
        key = parseObjectPropertyKey();
        if (token.value === 'get' && !match('(')) {
          key = parseObjectPropertyKey();
          if (existingPropNames[propType].hasOwnProperty(key.name)) {
            isValidDuplicateProp = existingPropNames[propType][key.name].get === undefined && existingPropNames[propType][key.name].data === undefined && existingPropNames[propType][key.name].set !== undefined;
            if (!isValidDuplicateProp) {
              throwError(key, Messages.IllegalDuplicateClassProperty);
            }
          } else {
            existingPropNames[propType][key.name] = {};
          }
          existingPropNames[propType][key.name].get = true;
          expect('(');
          expect(')');
          return markerApply(marker, delegate.createMethodDefinition(propType, 'get', key, parsePropertyFunction({ generator: false })));
        }
        if (token.value === 'set' && !match('(')) {
          key = parseObjectPropertyKey();
          if (existingPropNames[propType].hasOwnProperty(key.name)) {
            isValidDuplicateProp = existingPropNames[propType][key.name].set === undefined && existingPropNames[propType][key.name].data === undefined && existingPropNames[propType][key.name].get !== undefined;
            if (!isValidDuplicateProp) {
              throwError(key, Messages.IllegalDuplicateClassProperty);
            }
          } else {
            existingPropNames[propType][key.name] = {};
          }
          existingPropNames[propType][key.name].set = true;
          expect('(');
          token = lookahead;
          param = [parseVariableIdentifier()];
          expect(')');
          return markerApply(marker, delegate.createMethodDefinition(propType, 'set', key, parsePropertyFunction({
            params: param,
            generator: false,
            name: token
          })));
        }
        if (existingPropNames[propType].hasOwnProperty(key.name)) {
          throwError(key, Messages.IllegalDuplicateClassProperty);
        } else {
          existingPropNames[propType][key.name] = {};
        }
        existingPropNames[propType][key.name].data = true;
        return markerApply(marker, delegate.createMethodDefinition(propType, '', key, parsePropertyMethodFunction({ generator: false })));
      }
      function parseClassElement(existingProps) {
        if (match(';')) {
          lex();
          return;
        }
        return parseMethodDefinition(existingProps);
      }
      function parseClassBody() {
        var classElement, classElements = [], existingProps = {}, marker = markerCreate();
        existingProps[ClassPropertyType.static] = {};
        existingProps[ClassPropertyType.prototype] = {};
        expect('{');
        while (index < length) {
          if (match('}')) {
            break;
          }
          classElement = parseClassElement(existingProps);
          if (typeof classElement !== 'undefined') {
            classElements.push(classElement);
          }
        }
        expect('}');
        return markerApply(marker, delegate.createClassBody(classElements));
      }
      function parseClassExpression() {
        var id, previousYieldAllowed, superClass = null, marker = markerCreate();
        expectKeyword('class');
        if (!matchKeyword('extends') && !match('{')) {
          id = parseVariableIdentifier();
        }
        if (matchKeyword('extends')) {
          expectKeyword('extends');
          previousYieldAllowed = state.yieldAllowed;
          state.yieldAllowed = false;
          superClass = parseAssignmentExpression();
          state.yieldAllowed = previousYieldAllowed;
        }
        return markerApply(marker, delegate.createClassExpression(id, superClass, parseClassBody()));
      }
      function parseClassDeclaration() {
        var id, previousYieldAllowed, superClass = null, marker = markerCreate();
        expectKeyword('class');
        id = parseVariableIdentifier();
        if (matchKeyword('extends')) {
          expectKeyword('extends');
          previousYieldAllowed = state.yieldAllowed;
          state.yieldAllowed = false;
          superClass = parseAssignmentExpression();
          state.yieldAllowed = previousYieldAllowed;
        }
        return markerApply(marker, delegate.createClassDeclaration(id, superClass, parseClassBody()));
      }
      function matchModuleDeclaration() {
        var id;
        if (matchContextualKeyword('module')) {
          id = lookahead2();
          return id.type === Token.StringLiteral || id.type === Token.Identifier;
        }
        return false;
      }
      function parseSourceElement() {
        if (lookahead.type === Token.Keyword) {
          switch (lookahead.value) {
          case 'const':
          case 'let':
            return parseConstLetDeclaration(lookahead.value);
          case 'function':
            return parseFunctionDeclaration();
          case 'export':
            return parseExportDeclaration();
          case 'import':
            return parseImportDeclaration();
          default:
            return parseStatement();
          }
        }
        if (matchModuleDeclaration()) {
          throwError({}, Messages.NestedModule);
        }
        if (lookahead.type !== Token.EOF) {
          return parseStatement();
        }
      }
      function parseProgramElement() {
        if (lookahead.type === Token.Keyword) {
          switch (lookahead.value) {
          case 'export':
            return parseExportDeclaration();
          case 'import':
            return parseImportDeclaration();
          }
        }
        if (matchModuleDeclaration()) {
          return parseModuleDeclaration();
        }
        return parseSourceElement();
      }
      function parseProgramElements() {
        var sourceElement, sourceElements = [], token, directive, firstRestricted;
        while (index < length) {
          token = lookahead;
          if (token.type !== Token.StringLiteral) {
            break;
          }
          sourceElement = parseProgramElement();
          sourceElements.push(sourceElement);
          if (sourceElement.expression.type !== Syntax.Literal) {
            break;
          }
          directive = source.slice(token.range[0] + 1, token.range[1] - 1);
          if (directive === 'use strict') {
            strict = true;
            if (firstRestricted) {
              throwErrorTolerant(firstRestricted, Messages.StrictOctalLiteral);
            }
          } else {
            if (!firstRestricted && token.octal) {
              firstRestricted = token;
            }
          }
        }
        while (index < length) {
          sourceElement = parseProgramElement();
          if (typeof sourceElement === 'undefined') {
            break;
          }
          sourceElements.push(sourceElement);
        }
        return sourceElements;
      }
      function parseModuleElement() {
        return parseSourceElement();
      }
      function parseModuleElements() {
        var list = [], statement;
        while (index < length) {
          if (match('}')) {
            break;
          }
          statement = parseModuleElement();
          if (typeof statement === 'undefined') {
            break;
          }
          list.push(statement);
        }
        return list;
      }
      function parseModuleBlock() {
        var block, marker = markerCreate();
        expect('{');
        block = parseModuleElements();
        expect('}');
        return markerApply(marker, delegate.createBlockStatement(block));
      }
      function parseProgram() {
        var body, marker = markerCreate();
        strict = false;
        peek();
        body = parseProgramElements();
        return markerApply(marker, delegate.createProgram(body));
      }
      function addComment(type, value, start, end, loc) {
        var comment;
        assert(typeof start === 'number', 'Comment must have valid position');
        if (state.lastCommentStart >= start) {
          return;
        }
        state.lastCommentStart = start;
        comment = {
          type: type,
          value: value
        };
        if (extra.range) {
          comment.range = [
            start,
            end
          ];
        }
        if (extra.loc) {
          comment.loc = loc;
        }
        extra.comments.push(comment);
      }
      function scanComment() {
        var comment, ch, loc, start, blockComment, lineComment;
        comment = '';
        blockComment = false;
        lineComment = false;
        while (index < length) {
          ch = source[index];
          if (lineComment) {
            ch = source[index++];
            if (isLineTerminator(ch.charCodeAt(0))) {
              loc.end = {
                line: lineNumber,
                column: index - lineStart - 1
              };
              lineComment = false;
              addComment('Line', comment, start, index - 1, loc);
              if (ch === '\r' && source[index] === '\n') {
                ++index;
              }
              ++lineNumber;
              lineStart = index;
              comment = '';
            } else if (index >= length) {
              lineComment = false;
              comment += ch;
              loc.end = {
                line: lineNumber,
                column: length - lineStart
              };
              addComment('Line', comment, start, length, loc);
            } else {
              comment += ch;
            }
          } else if (blockComment) {
            if (isLineTerminator(ch.charCodeAt(0))) {
              if (ch === '\r' && source[index + 1] === '\n') {
                ++index;
                comment += '\r\n';
              } else {
                comment += ch;
              }
              ++lineNumber;
              ++index;
              lineStart = index;
              if (index >= length) {
                throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
              }
            } else {
              ch = source[index++];
              if (index >= length) {
                throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
              }
              comment += ch;
              if (ch === '*') {
                ch = source[index];
                if (ch === '/') {
                  comment = comment.substr(0, comment.length - 1);
                  blockComment = false;
                  ++index;
                  loc.end = {
                    line: lineNumber,
                    column: index - lineStart
                  };
                  addComment('Block', comment, start, index, loc);
                  comment = '';
                }
              }
            }
          } else if (ch === '/') {
            ch = source[index + 1];
            if (ch === '/') {
              loc = {
                start: {
                  line: lineNumber,
                  column: index - lineStart
                }
              };
              start = index;
              index += 2;
              lineComment = true;
              if (index >= length) {
                loc.end = {
                  line: lineNumber,
                  column: index - lineStart
                };
                lineComment = false;
                addComment('Line', comment, start, index, loc);
              }
            } else if (ch === '*') {
              start = index;
              index += 2;
              blockComment = true;
              loc = {
                start: {
                  line: lineNumber,
                  column: index - lineStart - 2
                }
              };
              if (index >= length) {
                throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
              }
            } else {
              break;
            }
          } else if (isWhiteSpace(ch.charCodeAt(0))) {
            ++index;
          } else if (isLineTerminator(ch.charCodeAt(0))) {
            ++index;
            if (ch === '\r' && source[index] === '\n') {
              ++index;
            }
            ++lineNumber;
            lineStart = index;
          } else {
            break;
          }
        }
      }
      function collectToken() {
        var start, loc, token, range, value;
        skipComment();
        start = index;
        loc = {
          start: {
            line: lineNumber,
            column: index - lineStart
          }
        };
        token = extra.advance();
        loc.end = {
          line: lineNumber,
          column: index - lineStart
        };
        if (token.type !== Token.EOF) {
          range = [
            token.range[0],
            token.range[1]
          ];
          value = source.slice(token.range[0], token.range[1]);
          extra.tokens.push({
            type: TokenName[token.type],
            value: value,
            range: range,
            loc: loc
          });
        }
        return token;
      }
      function collectRegex() {
        var pos, loc, regex, token;
        skipComment();
        pos = index;
        loc = {
          start: {
            line: lineNumber,
            column: index - lineStart
          }
        };
        regex = extra.scanRegExp();
        loc.end = {
          line: lineNumber,
          column: index - lineStart
        };
        if (!extra.tokenize) {
          if (extra.tokens.length > 0) {
            token = extra.tokens[extra.tokens.length - 1];
            if (token.range[0] === pos && token.type === 'Punctuator') {
              if (token.value === '/' || token.value === '/=') {
                extra.tokens.pop();
              }
            }
          }
          extra.tokens.push({
            type: 'RegularExpression',
            value: regex.literal,
            range: [
              pos,
              index
            ],
            loc: loc
          });
        }
        return regex;
      }
      function filterTokenLocation() {
        var i, entry, token, tokens = [];
        for (i = 0; i < extra.tokens.length; ++i) {
          entry = extra.tokens[i];
          token = {
            type: entry.type,
            value: entry.value
          };
          if (extra.range) {
            token.range = entry.range;
          }
          if (extra.loc) {
            token.loc = entry.loc;
          }
          tokens.push(token);
        }
        extra.tokens = tokens;
      }
      function patch() {
        if (extra.comments) {
          extra.skipComment = skipComment;
          skipComment = scanComment;
        }
        if (typeof extra.tokens !== 'undefined') {
          extra.advance = advance;
          extra.scanRegExp = scanRegExp;
          advance = collectToken;
          scanRegExp = collectRegex;
        }
      }
      function unpatch() {
        if (typeof extra.skipComment === 'function') {
          skipComment = extra.skipComment;
        }
        if (typeof extra.scanRegExp === 'function') {
          advance = extra.advance;
          scanRegExp = extra.scanRegExp;
        }
      }
      function extend(object, properties) {
        var entry, result = {};
        for (entry in object) {
          if (object.hasOwnProperty(entry)) {
            result[entry] = object[entry];
          }
        }
        for (entry in properties) {
          if (properties.hasOwnProperty(entry)) {
            result[entry] = properties[entry];
          }
        }
        return result;
      }
      function tokenize(code, options) {
        var toString, token, tokens;
        toString = String;
        if (typeof code !== 'string' && !(code instanceof String)) {
          code = toString(code);
        }
        delegate = SyntaxTreeDelegate;
        source = code;
        index = 0;
        lineNumber = source.length > 0 ? 1 : 0;
        lineStart = 0;
        length = source.length;
        lookahead = null;
        state = {
          allowKeyword: true,
          allowIn: true,
          labelSet: {},
          inFunctionBody: false,
          inIteration: false,
          inSwitch: false,
          lastCommentStart: -1
        };
        extra = {};
        options = options || {};
        options.tokens = true;
        extra.tokens = [];
        extra.tokenize = true;
        extra.openParenToken = -1;
        extra.openCurlyToken = -1;
        extra.range = typeof options.range === 'boolean' && options.range;
        extra.loc = typeof options.loc === 'boolean' && options.loc;
        if (typeof options.comment === 'boolean' && options.comment) {
          extra.comments = [];
        }
        if (typeof options.tolerant === 'boolean' && options.tolerant) {
          extra.errors = [];
        }
        if (length > 0) {
          if (typeof source[0] === 'undefined') {
            if (code instanceof String) {
              source = code.valueOf();
            }
          }
        }
        patch();
        try {
          peek();
          if (lookahead.type === Token.EOF) {
            return extra.tokens;
          }
          token = lex();
          while (lookahead.type !== Token.EOF) {
            try {
              token = lex();
            } catch (lexError) {
              token = lookahead;
              if (extra.errors) {
                extra.errors.push(lexError);
                break;
              } else {
                throw lexError;
              }
            }
          }
          filterTokenLocation();
          tokens = extra.tokens;
          if (typeof extra.comments !== 'undefined') {
            tokens.comments = extra.comments;
          }
          if (typeof extra.errors !== 'undefined') {
            tokens.errors = extra.errors;
          }
        } catch (e) {
          throw e;
        } finally {
          unpatch();
          extra = {};
        }
        return tokens;
      }
      function parse(code, options) {
        var program, toString;
        toString = String;
        if (typeof code !== 'string' && !(code instanceof String)) {
          code = toString(code);
        }
        delegate = SyntaxTreeDelegate;
        source = code;
        index = 0;
        lineNumber = source.length > 0 ? 1 : 0;
        lineStart = 0;
        length = source.length;
        lookahead = null;
        state = {
          allowKeyword: false,
          allowIn: true,
          labelSet: {},
          parenthesizedCount: 0,
          inFunctionBody: false,
          inIteration: false,
          inSwitch: false,
          lastCommentStart: -1,
          yieldAllowed: false
        };
        extra = {};
        if (typeof options !== 'undefined') {
          extra.range = typeof options.range === 'boolean' && options.range;
          extra.loc = typeof options.loc === 'boolean' && options.loc;
          if (extra.loc && options.source !== null && options.source !== undefined) {
            delegate = extend(delegate, {
              'postProcess': function (node) {
                node.loc.source = toString(options.source);
                return node;
              }
            });
          }
          if (typeof options.tokens === 'boolean' && options.tokens) {
            extra.tokens = [];
          }
          if (typeof options.comment === 'boolean' && options.comment) {
            extra.comments = [];
          }
          if (typeof options.tolerant === 'boolean' && options.tolerant) {
            extra.errors = [];
          }
        }
        if (length > 0) {
          if (typeof source[0] === 'undefined') {
            if (code instanceof String) {
              source = code.valueOf();
            }
          }
        }
        patch();
        try {
          program = parseProgram();
          if (typeof extra.comments !== 'undefined') {
            program.comments = extra.comments;
          }
          if (typeof extra.tokens !== 'undefined') {
            filterTokenLocation();
            program.tokens = extra.tokens;
          }
          if (typeof extra.errors !== 'undefined') {
            program.errors = extra.errors;
          }
        } catch (e) {
          throw e;
        } finally {
          unpatch();
          extra = {};
        }
        return program;
      }
      exports.version = '1.1.0-dev-harmony';
      exports.tokenize = tokenize;
      exports.parse = parse;
      exports.Syntax = function () {
        var name, types = {};
        if (typeof Object.create === 'function') {
          types = Object.create(null);
        }
        for (name in Syntax) {
          if (Syntax.hasOwnProperty(name)) {
            types[name] = Syntax[name];
          }
        }
        if (typeof Object.freeze === 'function') {
          Object.freeze(types);
        }
        return types;
      }();
    }));
  },
  '../../../node_modules/escodegen/escodegen.js': function (require, module, exports, global) {
    (function () {
      'use strict';
      var Syntax, Precedence, BinaryPrecedence, SourceNode, estraverse, esutils, isArray, base, indent, json, renumber, hexadecimal, quotes, escapeless, newline, space, parentheses, semicolons, safeConcatenation, directive, extra, parse, sourceMap, FORMAT_MINIFY, FORMAT_DEFAULTS;
      estraverse = require('../../../node_modules/estraverse/estraverse.js');
      esutils = require('../../../node_modules/escodegen/node_modules/esutils/lib/utils.js');
      Syntax = {
        AssignmentExpression: 'AssignmentExpression',
        ArrayExpression: 'ArrayExpression',
        ArrayPattern: 'ArrayPattern',
        ArrowFunctionExpression: 'ArrowFunctionExpression',
        BlockStatement: 'BlockStatement',
        BinaryExpression: 'BinaryExpression',
        BreakStatement: 'BreakStatement',
        CallExpression: 'CallExpression',
        CatchClause: 'CatchClause',
        ComprehensionBlock: 'ComprehensionBlock',
        ComprehensionExpression: 'ComprehensionExpression',
        ConditionalExpression: 'ConditionalExpression',
        ContinueStatement: 'ContinueStatement',
        DirectiveStatement: 'DirectiveStatement',
        DoWhileStatement: 'DoWhileStatement',
        DebuggerStatement: 'DebuggerStatement',
        EmptyStatement: 'EmptyStatement',
        ExportDeclaration: 'ExportDeclaration',
        ExpressionStatement: 'ExpressionStatement',
        ForStatement: 'ForStatement',
        ForInStatement: 'ForInStatement',
        ForOfStatement: 'ForOfStatement',
        FunctionDeclaration: 'FunctionDeclaration',
        FunctionExpression: 'FunctionExpression',
        GeneratorExpression: 'GeneratorExpression',
        Identifier: 'Identifier',
        IfStatement: 'IfStatement',
        ImportDeclaration: 'ImportDeclaration',
        Literal: 'Literal',
        LabeledStatement: 'LabeledStatement',
        LogicalExpression: 'LogicalExpression',
        MemberExpression: 'MemberExpression',
        NewExpression: 'NewExpression',
        ObjectExpression: 'ObjectExpression',
        ObjectPattern: 'ObjectPattern',
        Program: 'Program',
        Property: 'Property',
        ReturnStatement: 'ReturnStatement',
        SequenceExpression: 'SequenceExpression',
        SwitchStatement: 'SwitchStatement',
        SwitchCase: 'SwitchCase',
        ThisExpression: 'ThisExpression',
        ThrowStatement: 'ThrowStatement',
        TryStatement: 'TryStatement',
        UnaryExpression: 'UnaryExpression',
        UpdateExpression: 'UpdateExpression',
        VariableDeclaration: 'VariableDeclaration',
        VariableDeclarator: 'VariableDeclarator',
        WhileStatement: 'WhileStatement',
        WithStatement: 'WithStatement',
        YieldExpression: 'YieldExpression'
      };
      Precedence = {
        Sequence: 0,
        Yield: 1,
        Assignment: 1,
        Conditional: 2,
        ArrowFunction: 2,
        LogicalOR: 3,
        LogicalAND: 4,
        BitwiseOR: 5,
        BitwiseXOR: 6,
        BitwiseAND: 7,
        Equality: 8,
        Relational: 9,
        BitwiseSHIFT: 10,
        Additive: 11,
        Multiplicative: 12,
        Unary: 13,
        Postfix: 14,
        Call: 15,
        New: 16,
        Member: 17,
        Primary: 18
      };
      BinaryPrecedence = {
        '||': Precedence.LogicalOR,
        '&&': Precedence.LogicalAND,
        '|': Precedence.BitwiseOR,
        '^': Precedence.BitwiseXOR,
        '&': Precedence.BitwiseAND,
        '==': Precedence.Equality,
        '!=': Precedence.Equality,
        '===': Precedence.Equality,
        '!==': Precedence.Equality,
        'is': Precedence.Equality,
        'isnt': Precedence.Equality,
        '<': Precedence.Relational,
        '>': Precedence.Relational,
        '<=': Precedence.Relational,
        '>=': Precedence.Relational,
        'in': Precedence.Relational,
        'instanceof': Precedence.Relational,
        '<<': Precedence.BitwiseSHIFT,
        '>>': Precedence.BitwiseSHIFT,
        '>>>': Precedence.BitwiseSHIFT,
        '+': Precedence.Additive,
        '-': Precedence.Additive,
        '*': Precedence.Multiplicative,
        '%': Precedence.Multiplicative,
        '/': Precedence.Multiplicative
      };
      function getDefaultOptions() {
        return {
          indent: null,
          base: null,
          parse: null,
          comment: false,
          format: {
            indent: {
              style: '    ',
              base: 0,
              adjustMultilineComment: false
            },
            newline: '\n',
            space: ' ',
            json: false,
            renumber: false,
            hexadecimal: false,
            quotes: 'single',
            escapeless: false,
            compact: false,
            parentheses: true,
            semicolons: true,
            safeConcatenation: false
          },
          moz: {
            comprehensionExpressionStartsWithAssignment: false,
            starlessGenerator: false,
            parenthesizedComprehensionBlock: false
          },
          sourceMap: null,
          sourceMapRoot: null,
          sourceMapWithCode: false,
          directive: false,
          raw: true,
          verbatim: null
        };
      }
      function stringRepeat(str, num) {
        var result = '';
        for (num |= 0; num > 0; num >>>= 1, str += str) {
          if (num & 1) {
            result += str;
          }
        }
        return result;
      }
      isArray = Array.isArray;
      if (!isArray) {
        isArray = function isArray(array) {
          return Object.prototype.toString.call(array) === '[object Array]';
        };
      }
      function hasLineTerminator(str) {
        return /[\r\n]/g.test(str);
      }
      function endsWithLineTerminator(str) {
        var len = str.length;
        return len && esutils.code.isLineTerminator(str.charCodeAt(len - 1));
      }
      function updateDeeply(target, override) {
        var key, val;
        function isHashObject(target) {
          return typeof target === 'object' && target instanceof Object && !(target instanceof RegExp);
        }
        for (key in override) {
          if (override.hasOwnProperty(key)) {
            val = override[key];
            if (isHashObject(val)) {
              if (isHashObject(target[key])) {
                updateDeeply(target[key], val);
              } else {
                target[key] = updateDeeply({}, val);
              }
            } else {
              target[key] = val;
            }
          }
        }
        return target;
      }
      function generateNumber(value) {
        var result, point, temp, exponent, pos;
        if (value !== value) {
          throw new Error('Numeric literal whose value is NaN');
        }
        if (value < 0 || value === 0 && 1 / value < 0) {
          throw new Error('Numeric literal whose value is negative');
        }
        if (value === 1 / 0) {
          return json ? 'null' : renumber ? '1e400' : '1e+400';
        }
        result = '' + value;
        if (!renumber || result.length < 3) {
          return result;
        }
        point = result.indexOf('.');
        if (!json && result.charCodeAt(0) === 48 && point === 1) {
          point = 0;
          result = result.slice(1);
        }
        temp = result;
        result = result.replace('e+', 'e');
        exponent = 0;
        if ((pos = temp.indexOf('e')) > 0) {
          exponent = +temp.slice(pos + 1);
          temp = temp.slice(0, pos);
        }
        if (point >= 0) {
          exponent -= temp.length - point - 1;
          temp = +(temp.slice(0, point) + temp.slice(point + 1)) + '';
        }
        pos = 0;
        while (temp.charCodeAt(temp.length + pos - 1) === 48) {
          --pos;
        }
        if (pos !== 0) {
          exponent -= pos;
          temp = temp.slice(0, pos);
        }
        if (exponent !== 0) {
          temp += 'e' + exponent;
        }
        if ((temp.length < result.length || hexadecimal && value > 1000000000000 && Math.floor(value) === value && (temp = '0x' + value.toString(16)).length < result.length) && +temp === value) {
          result = temp;
        }
        return result;
      }
      function escapeRegExpCharacter(ch, previousIsBackslash) {
        if ((ch & ~1) === 8232) {
          return (previousIsBackslash ? 'u' : '\\u') + (ch === 8232 ? '2028' : '2029');
        } else if (ch === 10 || ch === 13) {
          return (previousIsBackslash ? '' : '\\') + (ch === 10 ? 'n' : 'r');
        }
        return String.fromCharCode(ch);
      }
      function generateRegExp(reg) {
        var match, result, flags, i, iz, ch, characterInBrack, previousIsBackslash;
        result = reg.toString();
        if (reg.source) {
          match = result.match(/\/([^/]*)$/);
          if (!match) {
            return result;
          }
          flags = match[1];
          result = '';
          characterInBrack = false;
          previousIsBackslash = false;
          for (i = 0, iz = reg.source.length; i < iz; ++i) {
            ch = reg.source.charCodeAt(i);
            if (!previousIsBackslash) {
              if (characterInBrack) {
                if (ch === 93) {
                  characterInBrack = false;
                }
              } else {
                if (ch === 47) {
                  result += '\\';
                } else if (ch === 91) {
                  characterInBrack = true;
                }
              }
              result += escapeRegExpCharacter(ch, previousIsBackslash);
              previousIsBackslash = ch === 92;
            } else {
              result += escapeRegExpCharacter(ch, previousIsBackslash);
              previousIsBackslash = false;
            }
          }
          return '/' + result + '/' + flags;
        }
        return result;
      }
      function escapeAllowedCharacter(code, next) {
        var hex, result = '\\';
        switch (code) {
        case 8:
          result += 'b';
          break;
        case 12:
          result += 'f';
          break;
        case 9:
          result += 't';
          break;
        default:
          hex = code.toString(16).toUpperCase();
          if (json || code > 255) {
            result += 'u' + '0000'.slice(hex.length) + hex;
          } else if (code === 0 && !esutils.code.isDecimalDigit(next)) {
            result += '0';
          } else if (code === 11) {
            result += 'x0B';
          } else {
            result += 'x' + '00'.slice(hex.length) + hex;
          }
          break;
        }
        return result;
      }
      function escapeDisallowedCharacter(code) {
        var result = '\\';
        switch (code) {
        case 92:
          result += '\\';
          break;
        case 10:
          result += 'n';
          break;
        case 13:
          result += 'r';
          break;
        case 8232:
          result += 'u2028';
          break;
        case 8233:
          result += 'u2029';
          break;
        default:
          throw new Error('Incorrectly classified character');
        }
        return result;
      }
      function escapeDirective(str) {
        var i, iz, code, quote;
        quote = quotes === 'double' ? '"' : '\'';
        for (i = 0, iz = str.length; i < iz; ++i) {
          code = str.charCodeAt(i);
          if (code === 39) {
            quote = '"';
            break;
          } else if (code === 34) {
            quote = '\'';
            break;
          } else if (code === 92) {
            ++i;
          }
        }
        return quote + str + quote;
      }
      function escapeString(str) {
        var result = '', i, len, code, singleQuotes = 0, doubleQuotes = 0, single, quote;
        for (i = 0, len = str.length; i < len; ++i) {
          code = str.charCodeAt(i);
          if (code === 39) {
            ++singleQuotes;
          } else if (code === 34) {
            ++doubleQuotes;
          } else if (code === 47 && json) {
            result += '\\';
          } else if (esutils.code.isLineTerminator(code) || code === 92) {
            result += escapeDisallowedCharacter(code);
            continue;
          } else if (json && code < 32 || !(json || escapeless || code >= 32 && code <= 126)) {
            result += escapeAllowedCharacter(code, str.charCodeAt(i + 1));
            continue;
          }
          result += String.fromCharCode(code);
        }
        single = !(quotes === 'double' || quotes === 'auto' && doubleQuotes < singleQuotes);
        quote = single ? '\'' : '"';
        if (!(single ? singleQuotes : doubleQuotes)) {
          return quote + result + quote;
        }
        str = result;
        result = quote;
        for (i = 0, len = str.length; i < len; ++i) {
          code = str.charCodeAt(i);
          if (code === 39 && single || code === 34 && !single) {
            result += '\\';
          }
          result += String.fromCharCode(code);
        }
        return result + quote;
      }
      function flattenToString(arr) {
        var i, iz, elem, result = '';
        for (i = 0, iz = arr.length; i < iz; ++i) {
          elem = arr[i];
          result += isArray(elem) ? flattenToString(elem) : elem;
        }
        return result;
      }
      function toSourceNodeWhenNeeded(generated, node) {
        if (!sourceMap) {
          if (isArray(generated)) {
            return flattenToString(generated);
          } else {
            return generated;
          }
        }
        if (node == null) {
          if (generated instanceof SourceNode) {
            return generated;
          } else {
            node = {};
          }
        }
        if (node.loc == null) {
          return new SourceNode(null, null, sourceMap, generated, node.name || null);
        }
        return new SourceNode(node.loc.start.line, node.loc.start.column, sourceMap === true ? node.loc.source || null : sourceMap, generated, node.name || null);
      }
      function noEmptySpace() {
        return space ? space : ' ';
      }
      function join(left, right) {
        var leftSource = toSourceNodeWhenNeeded(left).toString(), rightSource = toSourceNodeWhenNeeded(right).toString(), leftCharCode = leftSource.charCodeAt(leftSource.length - 1), rightCharCode = rightSource.charCodeAt(0);
        if ((leftCharCode === 43 || leftCharCode === 45) && leftCharCode === rightCharCode || esutils.code.isIdentifierPart(leftCharCode) && esutils.code.isIdentifierPart(rightCharCode) || leftCharCode === 47 && rightCharCode === 105) {
          return [
            left,
            noEmptySpace(),
            right
          ];
        } else if (esutils.code.isWhiteSpace(leftCharCode) || esutils.code.isLineTerminator(leftCharCode) || esutils.code.isWhiteSpace(rightCharCode) || esutils.code.isLineTerminator(rightCharCode)) {
          return [
            left,
            right
          ];
        }
        return [
          left,
          space,
          right
        ];
      }
      function addIndent(stmt) {
        return [
          base,
          stmt
        ];
      }
      function withIndent(fn) {
        var previousBase, result;
        previousBase = base;
        base += indent;
        result = fn.call(this, base);
        base = previousBase;
        return result;
      }
      function calculateSpaces(str) {
        var i;
        for (i = str.length - 1; i >= 0; --i) {
          if (esutils.code.isLineTerminator(str.charCodeAt(i))) {
            break;
          }
        }
        return str.length - 1 - i;
      }
      function adjustMultilineComment(value, specialBase) {
        var array, i, len, line, j, spaces, previousBase, sn;
        array = value.split(/\r\n|[\r\n]/);
        spaces = Number.MAX_VALUE;
        for (i = 1, len = array.length; i < len; ++i) {
          line = array[i];
          j = 0;
          while (j < line.length && esutils.code.isWhiteSpace(line.charCodeAt(j))) {
            ++j;
          }
          if (spaces > j) {
            spaces = j;
          }
        }
        if (typeof specialBase !== 'undefined') {
          previousBase = base;
          if (array[1][spaces] === '*') {
            specialBase += ' ';
          }
          base = specialBase;
        } else {
          if (spaces & 1) {
            --spaces;
          }
          previousBase = base;
        }
        for (i = 1, len = array.length; i < len; ++i) {
          sn = toSourceNodeWhenNeeded(addIndent(array[i].slice(spaces)));
          array[i] = sourceMap ? sn.join('') : sn;
        }
        base = previousBase;
        return array.join('\n');
      }
      function generateComment(comment, specialBase) {
        if (comment.type === 'Line') {
          if (endsWithLineTerminator(comment.value)) {
            return '//' + comment.value;
          } else {
            return '//' + comment.value + '\n';
          }
        }
        if (extra.format.indent.adjustMultilineComment && /[\n\r]/.test(comment.value)) {
          return adjustMultilineComment('/*' + comment.value + '*/', specialBase);
        }
        return '/*' + comment.value + '*/';
      }
      function addComments(stmt, result) {
        var i, len, comment, save, tailingToStatement, specialBase, fragment;
        if (stmt.leadingComments && stmt.leadingComments.length > 0) {
          save = result;
          comment = stmt.leadingComments[0];
          result = [];
          if (safeConcatenation && stmt.type === Syntax.Program && stmt.body.length === 0) {
            result.push('\n');
          }
          result.push(generateComment(comment));
          if (!endsWithLineTerminator(toSourceNodeWhenNeeded(result).toString())) {
            result.push('\n');
          }
          for (i = 1, len = stmt.leadingComments.length; i < len; ++i) {
            comment = stmt.leadingComments[i];
            fragment = [generateComment(comment)];
            if (!endsWithLineTerminator(toSourceNodeWhenNeeded(fragment).toString())) {
              fragment.push('\n');
            }
            result.push(addIndent(fragment));
          }
          result.push(addIndent(save));
        }
        if (stmt.trailingComments) {
          tailingToStatement = !endsWithLineTerminator(toSourceNodeWhenNeeded(result).toString());
          specialBase = stringRepeat(' ', calculateSpaces(toSourceNodeWhenNeeded([
            base,
            result,
            indent
          ]).toString()));
          for (i = 0, len = stmt.trailingComments.length; i < len; ++i) {
            comment = stmt.trailingComments[i];
            if (tailingToStatement) {
              if (i === 0) {
                result = [
                  result,
                  indent
                ];
              } else {
                result = [
                  result,
                  specialBase
                ];
              }
              result.push(generateComment(comment, specialBase));
            } else {
              result = [
                result,
                addIndent(generateComment(comment))
              ];
            }
            if (i !== len - 1 && !endsWithLineTerminator(toSourceNodeWhenNeeded(result).toString())) {
              result = [
                result,
                '\n'
              ];
            }
          }
        }
        return result;
      }
      function parenthesize(text, current, should) {
        if (current < should) {
          return [
            '(',
            text,
            ')'
          ];
        }
        return text;
      }
      function maybeBlock(stmt, semicolonOptional, functionBody) {
        var result, noLeadingComment;
        noLeadingComment = !extra.comment || !stmt.leadingComments;
        if (stmt.type === Syntax.BlockStatement && noLeadingComment) {
          return [
            space,
            generateStatement(stmt, { functionBody: functionBody })
          ];
        }
        if (stmt.type === Syntax.EmptyStatement && noLeadingComment) {
          return ';';
        }
        withIndent(function () {
          result = [
            newline,
            addIndent(generateStatement(stmt, {
              semicolonOptional: semicolonOptional,
              functionBody: functionBody
            }))
          ];
        });
        return result;
      }
      function maybeBlockSuffix(stmt, result) {
        var ends = endsWithLineTerminator(toSourceNodeWhenNeeded(result).toString());
        if (stmt.type === Syntax.BlockStatement && (!extra.comment || !stmt.leadingComments) && !ends) {
          return [
            result,
            space
          ];
        }
        if (ends) {
          return [
            result,
            base
          ];
        }
        return [
          result,
          newline,
          base
        ];
      }
      function generateVerbatimString(string) {
        var i, iz, result;
        result = string.split(/\r\n|\n/);
        for (i = 1, iz = result.length; i < iz; i++) {
          result[i] = newline + base + result[i];
        }
        return result;
      }
      function generateVerbatim(expr, option) {
        var verbatim, result, prec;
        verbatim = expr[extra.verbatim];
        if (typeof verbatim === 'string') {
          result = parenthesize(generateVerbatimString(verbatim), Precedence.Sequence, option.precedence);
        } else {
          result = generateVerbatimString(verbatim.content);
          prec = verbatim.precedence != null ? verbatim.precedence : Precedence.Sequence;
          result = parenthesize(result, prec, option.precedence);
        }
        return toSourceNodeWhenNeeded(result, expr);
      }
      function generateIdentifier(node) {
        return toSourceNodeWhenNeeded(node.name, node);
      }
      function generatePattern(node, options) {
        var result;
        if (node.type === Syntax.Identifier) {
          result = generateIdentifier(node);
        } else {
          result = generateExpression(node, {
            precedence: options.precedence,
            allowIn: options.allowIn,
            allowCall: true
          });
        }
        return result;
      }
      function generateFunctionBody(node) {
        var result, i, len, expr, arrow;
        arrow = node.type === Syntax.ArrowFunctionExpression;
        if (arrow && node.params.length === 1 && node.params[0].type === Syntax.Identifier) {
          result = [generateIdentifier(node.params[0])];
        } else {
          result = ['('];
          for (i = 0, len = node.params.length; i < len; ++i) {
            result.push(generatePattern(node.params[i], {
              precedence: Precedence.Assignment,
              allowIn: true
            }));
            if (i + 1 < len) {
              result.push(',' + space);
            }
          }
          result.push(')');
        }
        if (arrow) {
          result.push(space);
          result.push('=>');
        }
        if (node.expression) {
          result.push(space);
          expr = generateExpression(node.body, {
            precedence: Precedence.Assignment,
            allowIn: true,
            allowCall: true
          });
          if (expr.toString().charAt(0) === '{') {
            expr = [
              '(',
              expr,
              ')'
            ];
          }
          result.push(expr);
        } else {
          result.push(maybeBlock(node.body, false, true));
        }
        return result;
      }
      function generateIterationForStatement(operator, stmt, semicolonIsNotNeeded) {
        var result = ['for' + space + '('];
        withIndent(function () {
          if (stmt.left.type === Syntax.VariableDeclaration) {
            withIndent(function () {
              result.push(stmt.left.kind + noEmptySpace());
              result.push(generateStatement(stmt.left.declarations[0], { allowIn: false }));
            });
          } else {
            result.push(generateExpression(stmt.left, {
              precedence: Precedence.Call,
              allowIn: true,
              allowCall: true
            }));
          }
          result = join(result, operator);
          result = [
            join(result, generateExpression(stmt.right, {
              precedence: Precedence.Sequence,
              allowIn: true,
              allowCall: true
            })),
            ')'
          ];
        });
        result.push(maybeBlock(stmt.body, semicolonIsNotNeeded));
        return result;
      }
      function generateLiteral(expr) {
        var raw;
        if (expr.hasOwnProperty('raw') && parse && extra.raw) {
          try {
            raw = parse(expr.raw).body[0].expression;
            if (raw.type === Syntax.Literal) {
              if (raw.value === expr.value) {
                return expr.raw;
              }
            }
          } catch (e) {
          }
        }
        if (expr.value === null) {
          return 'null';
        }
        if (typeof expr.value === 'string') {
          return escapeString(expr.value);
        }
        if (typeof expr.value === 'number') {
          return generateNumber(expr.value);
        }
        if (typeof expr.value === 'boolean') {
          return expr.value ? 'true' : 'false';
        }
        return generateRegExp(expr.value);
      }
      function generateExpression(expr, option) {
        var result, precedence, type, currentPrecedence, i, len, fragment, multiline, leftCharCode, leftSource, rightCharCode, allowIn, allowCall, allowUnparenthesizedNew, property, isGenerator;
        precedence = option.precedence;
        allowIn = option.allowIn;
        allowCall = option.allowCall;
        type = expr.type || option.type;
        if (extra.verbatim && expr.hasOwnProperty(extra.verbatim)) {
          return generateVerbatim(expr, option);
        }
        switch (type) {
        case Syntax.SequenceExpression:
          result = [];
          allowIn |= Precedence.Sequence < precedence;
          for (i = 0, len = expr.expressions.length; i < len; ++i) {
            result.push(generateExpression(expr.expressions[i], {
              precedence: Precedence.Assignment,
              allowIn: allowIn,
              allowCall: true
            }));
            if (i + 1 < len) {
              result.push(',' + space);
            }
          }
          result = parenthesize(result, Precedence.Sequence, precedence);
          break;
        case Syntax.AssignmentExpression:
          allowIn |= Precedence.Assignment < precedence;
          result = parenthesize([
            generateExpression(expr.left, {
              precedence: Precedence.Call,
              allowIn: allowIn,
              allowCall: true
            }),
            space + expr.operator + space,
            generateExpression(expr.right, {
              precedence: Precedence.Assignment,
              allowIn: allowIn,
              allowCall: true
            })
          ], Precedence.Assignment, precedence);
          break;
        case Syntax.ArrowFunctionExpression:
          allowIn |= Precedence.ArrowFunction < precedence;
          result = parenthesize(generateFunctionBody(expr), Precedence.ArrowFunction, precedence);
          break;
        case Syntax.ConditionalExpression:
          allowIn |= Precedence.Conditional < precedence;
          result = parenthesize([
            generateExpression(expr.test, {
              precedence: Precedence.LogicalOR,
              allowIn: allowIn,
              allowCall: true
            }),
            space + '?' + space,
            generateExpression(expr.consequent, {
              precedence: Precedence.Assignment,
              allowIn: allowIn,
              allowCall: true
            }),
            space + ':' + space,
            generateExpression(expr.alternate, {
              precedence: Precedence.Assignment,
              allowIn: allowIn,
              allowCall: true
            })
          ], Precedence.Conditional, precedence);
          break;
        case Syntax.LogicalExpression:
        case Syntax.BinaryExpression:
          currentPrecedence = BinaryPrecedence[expr.operator];
          allowIn |= currentPrecedence < precedence;
          fragment = generateExpression(expr.left, {
            precedence: currentPrecedence,
            allowIn: allowIn,
            allowCall: true
          });
          leftSource = fragment.toString();
          if (leftSource.charCodeAt(leftSource.length - 1) === 47 && esutils.code.isIdentifierPart(expr.operator.charCodeAt(0))) {
            result = [
              fragment,
              noEmptySpace(),
              expr.operator
            ];
          } else {
            result = join(fragment, expr.operator);
          }
          fragment = generateExpression(expr.right, {
            precedence: currentPrecedence + 1,
            allowIn: allowIn,
            allowCall: true
          });
          if (expr.operator === '/' && fragment.toString().charAt(0) === '/' || expr.operator.slice(-1) === '<' && fragment.toString().slice(0, 3) === '!--') {
            result.push(noEmptySpace());
            result.push(fragment);
          } else {
            result = join(result, fragment);
          }
          if (expr.operator === 'in' && !allowIn) {
            result = [
              '(',
              result,
              ')'
            ];
          } else {
            result = parenthesize(result, currentPrecedence, precedence);
          }
          break;
        case Syntax.CallExpression:
          result = [generateExpression(expr.callee, {
              precedence: Precedence.Call,
              allowIn: true,
              allowCall: true,
              allowUnparenthesizedNew: false
            })];
          result.push('(');
          for (i = 0, len = expr['arguments'].length; i < len; ++i) {
            result.push(generateExpression(expr['arguments'][i], {
              precedence: Precedence.Assignment,
              allowIn: true,
              allowCall: true
            }));
            if (i + 1 < len) {
              result.push(',' + space);
            }
          }
          result.push(')');
          if (!allowCall) {
            result = [
              '(',
              result,
              ')'
            ];
          } else {
            result = parenthesize(result, Precedence.Call, precedence);
          }
          break;
        case Syntax.NewExpression:
          len = expr['arguments'].length;
          allowUnparenthesizedNew = option.allowUnparenthesizedNew === undefined || option.allowUnparenthesizedNew;
          result = join('new', generateExpression(expr.callee, {
            precedence: Precedence.New,
            allowIn: true,
            allowCall: false,
            allowUnparenthesizedNew: allowUnparenthesizedNew && !parentheses && len === 0
          }));
          if (!allowUnparenthesizedNew || parentheses || len > 0) {
            result.push('(');
            for (i = 0; i < len; ++i) {
              result.push(generateExpression(expr['arguments'][i], {
                precedence: Precedence.Assignment,
                allowIn: true,
                allowCall: true
              }));
              if (i + 1 < len) {
                result.push(',' + space);
              }
            }
            result.push(')');
          }
          result = parenthesize(result, Precedence.New, precedence);
          break;
        case Syntax.MemberExpression:
          result = [generateExpression(expr.object, {
              precedence: Precedence.Call,
              allowIn: true,
              allowCall: allowCall,
              allowUnparenthesizedNew: false
            })];
          if (expr.computed) {
            result.push('[');
            result.push(generateExpression(expr.property, {
              precedence: Precedence.Sequence,
              allowIn: true,
              allowCall: allowCall
            }));
            result.push(']');
          } else {
            if (expr.object.type === Syntax.Literal && typeof expr.object.value === 'number') {
              fragment = toSourceNodeWhenNeeded(result).toString();
              if (fragment.indexOf('.') < 0 && !/[eExX]/.test(fragment) && esutils.code.isDecimalDigit(fragment.charCodeAt(fragment.length - 1)) && !(fragment.length >= 2 && fragment.charCodeAt(0) === 48)) {
                result.push('.');
              }
            }
            result.push('.');
            result.push(generateIdentifier(expr.property));
          }
          result = parenthesize(result, Precedence.Member, precedence);
          break;
        case Syntax.UnaryExpression:
          fragment = generateExpression(expr.argument, {
            precedence: Precedence.Unary,
            allowIn: true,
            allowCall: true
          });
          if (space === '') {
            result = join(expr.operator, fragment);
          } else {
            result = [expr.operator];
            if (expr.operator.length > 2) {
              result = join(result, fragment);
            } else {
              leftSource = toSourceNodeWhenNeeded(result).toString();
              leftCharCode = leftSource.charCodeAt(leftSource.length - 1);
              rightCharCode = fragment.toString().charCodeAt(0);
              if ((leftCharCode === 43 || leftCharCode === 45) && leftCharCode === rightCharCode || esutils.code.isIdentifierPart(leftCharCode) && esutils.code.isIdentifierPart(rightCharCode)) {
                result.push(noEmptySpace());
                result.push(fragment);
              } else {
                result.push(fragment);
              }
            }
          }
          result = parenthesize(result, Precedence.Unary, precedence);
          break;
        case Syntax.YieldExpression:
          if (expr.delegate) {
            result = 'yield*';
          } else {
            result = 'yield';
          }
          if (expr.argument) {
            result = join(result, generateExpression(expr.argument, {
              precedence: Precedence.Yield,
              allowIn: true,
              allowCall: true
            }));
          }
          result = parenthesize(result, Precedence.Yield, precedence);
          break;
        case Syntax.UpdateExpression:
          if (expr.prefix) {
            result = parenthesize([
              expr.operator,
              generateExpression(expr.argument, {
                precedence: Precedence.Unary,
                allowIn: true,
                allowCall: true
              })
            ], Precedence.Unary, precedence);
          } else {
            result = parenthesize([
              generateExpression(expr.argument, {
                precedence: Precedence.Postfix,
                allowIn: true,
                allowCall: true
              }),
              expr.operator
            ], Precedence.Postfix, precedence);
          }
          break;
        case Syntax.FunctionExpression:
          isGenerator = expr.generator && !extra.moz.starlessGenerator;
          result = isGenerator ? 'function*' : 'function';
          if (expr.id) {
            result = [
              result,
              isGenerator ? space : noEmptySpace(),
              generateIdentifier(expr.id),
              generateFunctionBody(expr)
            ];
          } else {
            result = [
              result + space,
              generateFunctionBody(expr)
            ];
          }
          break;
        case Syntax.ArrayPattern:
        case Syntax.ArrayExpression:
          if (!expr.elements.length) {
            result = '[]';
            break;
          }
          multiline = expr.elements.length > 1;
          result = [
            '[',
            multiline ? newline : ''
          ];
          withIndent(function (indent) {
            for (i = 0, len = expr.elements.length; i < len; ++i) {
              if (!expr.elements[i]) {
                if (multiline) {
                  result.push(indent);
                }
                if (i + 1 === len) {
                  result.push(',');
                }
              } else {
                result.push(multiline ? indent : '');
                result.push(generateExpression(expr.elements[i], {
                  precedence: Precedence.Assignment,
                  allowIn: true,
                  allowCall: true
                }));
              }
              if (i + 1 < len) {
                result.push(',' + (multiline ? newline : space));
              }
            }
          });
          if (multiline && !endsWithLineTerminator(toSourceNodeWhenNeeded(result).toString())) {
            result.push(newline);
          }
          result.push(multiline ? base : '');
          result.push(']');
          break;
        case Syntax.Property:
          if (expr.kind === 'get' || expr.kind === 'set') {
            result = [
              expr.kind,
              noEmptySpace(),
              generateExpression(expr.key, {
                precedence: Precedence.Sequence,
                allowIn: true,
                allowCall: true
              }),
              generateFunctionBody(expr.value)
            ];
          } else {
            if (expr.shorthand) {
              result = generateExpression(expr.key, {
                precedence: Precedence.Sequence,
                allowIn: true,
                allowCall: true
              });
            } else if (expr.method) {
              result = [];
              if (expr.value.generator) {
                result.push('*');
              }
              result.push(generateExpression(expr.key, {
                precedence: Precedence.Sequence,
                allowIn: true,
                allowCall: true
              }));
              result.push(generateFunctionBody(expr.value));
            } else {
              result = [
                generateExpression(expr.key, {
                  precedence: Precedence.Sequence,
                  allowIn: true,
                  allowCall: true
                }),
                ':' + space,
                generateExpression(expr.value, {
                  precedence: Precedence.Assignment,
                  allowIn: true,
                  allowCall: true
                })
              ];
            }
          }
          break;
        case Syntax.ObjectExpression:
          if (!expr.properties.length) {
            result = '{}';
            break;
          }
          multiline = expr.properties.length > 1;
          withIndent(function () {
            fragment = generateExpression(expr.properties[0], {
              precedence: Precedence.Sequence,
              allowIn: true,
              allowCall: true,
              type: Syntax.Property
            });
          });
          if (!multiline) {
            if (!hasLineTerminator(toSourceNodeWhenNeeded(fragment).toString())) {
              result = [
                '{',
                space,
                fragment,
                space,
                '}'
              ];
              break;
            }
          }
          withIndent(function (indent) {
            result = [
              '{',
              newline,
              indent,
              fragment
            ];
            if (multiline) {
              result.push(',' + newline);
              for (i = 1, len = expr.properties.length; i < len; ++i) {
                result.push(indent);
                result.push(generateExpression(expr.properties[i], {
                  precedence: Precedence.Sequence,
                  allowIn: true,
                  allowCall: true,
                  type: Syntax.Property
                }));
                if (i + 1 < len) {
                  result.push(',' + newline);
                }
              }
            }
          });
          if (!endsWithLineTerminator(toSourceNodeWhenNeeded(result).toString())) {
            result.push(newline);
          }
          result.push(base);
          result.push('}');
          break;
        case Syntax.ObjectPattern:
          if (!expr.properties.length) {
            result = '{}';
            break;
          }
          multiline = false;
          if (expr.properties.length === 1) {
            property = expr.properties[0];
            if (property.value.type !== Syntax.Identifier) {
              multiline = true;
            }
          } else {
            for (i = 0, len = expr.properties.length; i < len; ++i) {
              property = expr.properties[i];
              if (!property.shorthand) {
                multiline = true;
                break;
              }
            }
          }
          result = [
            '{',
            multiline ? newline : ''
          ];
          withIndent(function (indent) {
            for (i = 0, len = expr.properties.length; i < len; ++i) {
              result.push(multiline ? indent : '');
              result.push(generateExpression(expr.properties[i], {
                precedence: Precedence.Sequence,
                allowIn: true,
                allowCall: true
              }));
              if (i + 1 < len) {
                result.push(',' + (multiline ? newline : space));
              }
            }
          });
          if (multiline && !endsWithLineTerminator(toSourceNodeWhenNeeded(result).toString())) {
            result.push(newline);
          }
          result.push(multiline ? base : '');
          result.push('}');
          break;
        case Syntax.ThisExpression:
          result = 'this';
          break;
        case Syntax.Identifier:
          result = generateIdentifier(expr);
          break;
        case Syntax.Literal:
          result = generateLiteral(expr);
          break;
        case Syntax.GeneratorExpression:
        case Syntax.ComprehensionExpression:
          result = type === Syntax.GeneratorExpression ? ['('] : ['['];
          if (extra.moz.comprehensionExpressionStartsWithAssignment) {
            fragment = generateExpression(expr.body, {
              precedence: Precedence.Assignment,
              allowIn: true,
              allowCall: true
            });
            result.push(fragment);
          }
          if (expr.blocks) {
            withIndent(function () {
              for (i = 0, len = expr.blocks.length; i < len; ++i) {
                fragment = generateExpression(expr.blocks[i], {
                  precedence: Precedence.Sequence,
                  allowIn: true,
                  allowCall: true
                });
                if (i > 0 || extra.moz.comprehensionExpressionStartsWithAssignment) {
                  result = join(result, fragment);
                } else {
                  result.push(fragment);
                }
              }
            });
          }
          if (expr.filter) {
            result = join(result, 'if' + space);
            fragment = generateExpression(expr.filter, {
              precedence: Precedence.Sequence,
              allowIn: true,
              allowCall: true
            });
            if (extra.moz.parenthesizedComprehensionBlock) {
              result = join(result, [
                '(',
                fragment,
                ')'
              ]);
            } else {
              result = join(result, fragment);
            }
          }
          if (!extra.moz.comprehensionExpressionStartsWithAssignment) {
            fragment = generateExpression(expr.body, {
              precedence: Precedence.Assignment,
              allowIn: true,
              allowCall: true
            });
            result = join(result, fragment);
          }
          result.push(type === Syntax.GeneratorExpression ? ')' : ']');
          break;
        case Syntax.ComprehensionBlock:
          if (expr.left.type === Syntax.VariableDeclaration) {
            fragment = [
              expr.left.kind,
              noEmptySpace(),
              generateStatement(expr.left.declarations[0], { allowIn: false })
            ];
          } else {
            fragment = generateExpression(expr.left, {
              precedence: Precedence.Call,
              allowIn: true,
              allowCall: true
            });
          }
          fragment = join(fragment, expr.of ? 'of' : 'in');
          fragment = join(fragment, generateExpression(expr.right, {
            precedence: Precedence.Sequence,
            allowIn: true,
            allowCall: true
          }));
          if (extra.moz.parenthesizedComprehensionBlock) {
            result = [
              'for' + space + '(',
              fragment,
              ')'
            ];
          } else {
            result = join('for' + space, fragment);
          }
          break;
        default:
          throw new Error('Unknown expression type: ' + expr.type);
        }
        if (extra.comment) {
          result = addComments(expr, result);
        }
        return toSourceNodeWhenNeeded(result, expr);
      }
      function generateStatement(stmt, option) {
        var i, len, result, node, specifier, allowIn, functionBody, directiveContext, fragment, semicolon, isGenerator;
        allowIn = true;
        semicolon = ';';
        functionBody = false;
        directiveContext = false;
        if (option) {
          allowIn = option.allowIn === undefined || option.allowIn;
          if (!semicolons && option.semicolonOptional === true) {
            semicolon = '';
          }
          functionBody = option.functionBody;
          directiveContext = option.directiveContext;
        }
        switch (stmt.type) {
        case Syntax.BlockStatement:
          result = [
            '{',
            newline
          ];
          withIndent(function () {
            for (i = 0, len = stmt.body.length; i < len; ++i) {
              fragment = addIndent(generateStatement(stmt.body[i], {
                semicolonOptional: i === len - 1,
                directiveContext: functionBody
              }));
              result.push(fragment);
              if (!endsWithLineTerminator(toSourceNodeWhenNeeded(fragment).toString())) {
                result.push(newline);
              }
            }
          });
          result.push(addIndent('}'));
          break;
        case Syntax.BreakStatement:
          if (stmt.label) {
            result = 'break ' + stmt.label.name + semicolon;
          } else {
            result = 'break' + semicolon;
          }
          break;
        case Syntax.ContinueStatement:
          if (stmt.label) {
            result = 'continue ' + stmt.label.name + semicolon;
          } else {
            result = 'continue' + semicolon;
          }
          break;
        case Syntax.DirectiveStatement:
          if (extra.raw && stmt.raw) {
            result = stmt.raw + semicolon;
          } else {
            result = escapeDirective(stmt.directive) + semicolon;
          }
          break;
        case Syntax.DoWhileStatement:
          result = join('do', maybeBlock(stmt.body));
          result = maybeBlockSuffix(stmt.body, result);
          result = join(result, [
            'while' + space + '(',
            generateExpression(stmt.test, {
              precedence: Precedence.Sequence,
              allowIn: true,
              allowCall: true
            }),
            ')' + semicolon
          ]);
          break;
        case Syntax.CatchClause:
          withIndent(function () {
            var guard;
            result = [
              'catch' + space + '(',
              generateExpression(stmt.param, {
                precedence: Precedence.Sequence,
                allowIn: true,
                allowCall: true
              }),
              ')'
            ];
            if (stmt.guard) {
              guard = generateExpression(stmt.guard, {
                precedence: Precedence.Sequence,
                allowIn: true,
                allowCall: true
              });
              result.splice(2, 0, ' if ', guard);
            }
          });
          result.push(maybeBlock(stmt.body));
          break;
        case Syntax.DebuggerStatement:
          result = 'debugger' + semicolon;
          break;
        case Syntax.EmptyStatement:
          result = ';';
          break;
        case Syntax.ExportDeclaration:
          result = 'export ';
          if (stmt.declaration) {
            result = [
              result,
              generateStatement(stmt.declaration, { semicolonOptional: semicolon === '' })
            ];
            break;
          }
          break;
        case Syntax.ExpressionStatement:
          result = [generateExpression(stmt.expression, {
              precedence: Precedence.Sequence,
              allowIn: true,
              allowCall: true
            })];
          fragment = toSourceNodeWhenNeeded(result).toString();
          if (fragment.charAt(0) === '{' || fragment.slice(0, 8) === 'function' && '* ('.indexOf(fragment.charAt(8)) >= 0 || directive && directiveContext && stmt.expression.type === Syntax.Literal && typeof stmt.expression.value === 'string') {
            result = [
              '(',
              result,
              ')' + semicolon
            ];
          } else {
            result.push(semicolon);
          }
          break;
        case Syntax.ImportDeclaration:
          if (stmt.specifiers.length === 0) {
            result = [
              'import',
              space,
              generateLiteral(stmt.source)
            ];
          } else {
            if (stmt.kind === 'default') {
              result = [
                'import',
                noEmptySpace(),
                stmt.specifiers[0].id.name,
                noEmptySpace()
              ];
            } else {
              result = [
                'import',
                space,
                '{'
              ];
              if (stmt.specifiers.length === 1) {
                specifier = stmt.specifiers[0];
                result.push(space + specifier.id.name);
                if (specifier.name) {
                  result.push(noEmptySpace() + 'as' + noEmptySpace() + specifier.name.name);
                }
                result.push(space + '}' + space);
              } else {
                withIndent(function (indent) {
                  var i, iz;
                  result.push(newline);
                  for (i = 0, iz = stmt.specifiers.length; i < iz; ++i) {
                    specifier = stmt.specifiers[i];
                    result.push(indent + specifier.id.name);
                    if (specifier.name) {
                      result.push(noEmptySpace() + 'as' + noEmptySpace() + specifier.name.name);
                    }
                    if (i + 1 < iz) {
                      result.push(',' + newline);
                    }
                  }
                });
                if (!endsWithLineTerminator(toSourceNodeWhenNeeded(result).toString())) {
                  result.push(newline);
                }
                result.push(base + '}' + space);
              }
            }
            result.push('from' + space);
            result.push(generateLiteral(stmt.source));
          }
          result.push(semicolon);
          break;
        case Syntax.VariableDeclarator:
          if (stmt.init) {
            result = [
              generateExpression(stmt.id, {
                precedence: Precedence.Assignment,
                allowIn: allowIn,
                allowCall: true
              }),
              space,
              '=',
              space,
              generateExpression(stmt.init, {
                precedence: Precedence.Assignment,
                allowIn: allowIn,
                allowCall: true
              })
            ];
          } else {
            result = generatePattern(stmt.id, {
              precedence: Precedence.Assignment,
              allowIn: allowIn
            });
          }
          break;
        case Syntax.VariableDeclaration:
          result = [stmt.kind];
          if (stmt.declarations.length === 1 && stmt.declarations[0].init && stmt.declarations[0].init.type === Syntax.FunctionExpression) {
            result.push(noEmptySpace());
            result.push(generateStatement(stmt.declarations[0], { allowIn: allowIn }));
          } else {
            withIndent(function () {
              node = stmt.declarations[0];
              if (extra.comment && node.leadingComments) {
                result.push('\n');
                result.push(addIndent(generateStatement(node, { allowIn: allowIn })));
              } else {
                result.push(noEmptySpace());
                result.push(generateStatement(node, { allowIn: allowIn }));
              }
              for (i = 1, len = stmt.declarations.length; i < len; ++i) {
                node = stmt.declarations[i];
                if (extra.comment && node.leadingComments) {
                  result.push(',' + newline);
                  result.push(addIndent(generateStatement(node, { allowIn: allowIn })));
                } else {
                  result.push(',' + space);
                  result.push(generateStatement(node, { allowIn: allowIn }));
                }
              }
            });
          }
          result.push(semicolon);
          break;
        case Syntax.ThrowStatement:
          result = [
            join('throw', generateExpression(stmt.argument, {
              precedence: Precedence.Sequence,
              allowIn: true,
              allowCall: true
            })),
            semicolon
          ];
          break;
        case Syntax.TryStatement:
          result = [
            'try',
            maybeBlock(stmt.block)
          ];
          result = maybeBlockSuffix(stmt.block, result);
          if (stmt.handlers) {
            for (i = 0, len = stmt.handlers.length; i < len; ++i) {
              result = join(result, generateStatement(stmt.handlers[i]));
              if (stmt.finalizer || i + 1 !== len) {
                result = maybeBlockSuffix(stmt.handlers[i].body, result);
              }
            }
          } else {
            stmt.guardedHandlers = stmt.guardedHandlers || [];
            for (i = 0, len = stmt.guardedHandlers.length; i < len; ++i) {
              result = join(result, generateStatement(stmt.guardedHandlers[i]));
              if (stmt.finalizer || i + 1 !== len) {
                result = maybeBlockSuffix(stmt.guardedHandlers[i].body, result);
              }
            }
            if (stmt.handler) {
              if (isArray(stmt.handler)) {
                for (i = 0, len = stmt.handler.length; i < len; ++i) {
                  result = join(result, generateStatement(stmt.handler[i]));
                  if (stmt.finalizer || i + 1 !== len) {
                    result = maybeBlockSuffix(stmt.handler[i].body, result);
                  }
                }
              } else {
                result = join(result, generateStatement(stmt.handler));
                if (stmt.finalizer) {
                  result = maybeBlockSuffix(stmt.handler.body, result);
                }
              }
            }
          }
          if (stmt.finalizer) {
            result = join(result, [
              'finally',
              maybeBlock(stmt.finalizer)
            ]);
          }
          break;
        case Syntax.SwitchStatement:
          withIndent(function () {
            result = [
              'switch' + space + '(',
              generateExpression(stmt.discriminant, {
                precedence: Precedence.Sequence,
                allowIn: true,
                allowCall: true
              }),
              ')' + space + '{' + newline
            ];
          });
          if (stmt.cases) {
            for (i = 0, len = stmt.cases.length; i < len; ++i) {
              fragment = addIndent(generateStatement(stmt.cases[i], { semicolonOptional: i === len - 1 }));
              result.push(fragment);
              if (!endsWithLineTerminator(toSourceNodeWhenNeeded(fragment).toString())) {
                result.push(newline);
              }
            }
          }
          result.push(addIndent('}'));
          break;
        case Syntax.SwitchCase:
          withIndent(function () {
            if (stmt.test) {
              result = [
                join('case', generateExpression(stmt.test, {
                  precedence: Precedence.Sequence,
                  allowIn: true,
                  allowCall: true
                })),
                ':'
              ];
            } else {
              result = ['default:'];
            }
            i = 0;
            len = stmt.consequent.length;
            if (len && stmt.consequent[0].type === Syntax.BlockStatement) {
              fragment = maybeBlock(stmt.consequent[0]);
              result.push(fragment);
              i = 1;
            }
            if (i !== len && !endsWithLineTerminator(toSourceNodeWhenNeeded(result).toString())) {
              result.push(newline);
            }
            for (; i < len; ++i) {
              fragment = addIndent(generateStatement(stmt.consequent[i], { semicolonOptional: i === len - 1 && semicolon === '' }));
              result.push(fragment);
              if (i + 1 !== len && !endsWithLineTerminator(toSourceNodeWhenNeeded(fragment).toString())) {
                result.push(newline);
              }
            }
          });
          break;
        case Syntax.IfStatement:
          withIndent(function () {
            result = [
              'if' + space + '(',
              generateExpression(stmt.test, {
                precedence: Precedence.Sequence,
                allowIn: true,
                allowCall: true
              }),
              ')'
            ];
          });
          if (stmt.alternate) {
            result.push(maybeBlock(stmt.consequent));
            result = maybeBlockSuffix(stmt.consequent, result);
            if (stmt.alternate.type === Syntax.IfStatement) {
              result = join(result, [
                'else ',
                generateStatement(stmt.alternate, { semicolonOptional: semicolon === '' })
              ]);
            } else {
              result = join(result, join('else', maybeBlock(stmt.alternate, semicolon === '')));
            }
          } else {
            result.push(maybeBlock(stmt.consequent, semicolon === ''));
          }
          break;
        case Syntax.ForStatement:
          withIndent(function () {
            result = ['for' + space + '('];
            if (stmt.init) {
              if (stmt.init.type === Syntax.VariableDeclaration) {
                result.push(generateStatement(stmt.init, { allowIn: false }));
              } else {
                result.push(generateExpression(stmt.init, {
                  precedence: Precedence.Sequence,
                  allowIn: false,
                  allowCall: true
                }));
                result.push(';');
              }
            } else {
              result.push(';');
            }
            if (stmt.test) {
              result.push(space);
              result.push(generateExpression(stmt.test, {
                precedence: Precedence.Sequence,
                allowIn: true,
                allowCall: true
              }));
              result.push(';');
            } else {
              result.push(';');
            }
            if (stmt.update) {
              result.push(space);
              result.push(generateExpression(stmt.update, {
                precedence: Precedence.Sequence,
                allowIn: true,
                allowCall: true
              }));
              result.push(')');
            } else {
              result.push(')');
            }
          });
          result.push(maybeBlock(stmt.body, semicolon === ''));
          break;
        case Syntax.ForInStatement:
          result = generateIterationForStatement('in', stmt, semicolon === '');
          break;
        case Syntax.ForOfStatement:
          result = generateIterationForStatement('of', stmt, semicolon === '');
          break;
        case Syntax.LabeledStatement:
          result = [
            stmt.label.name + ':',
            maybeBlock(stmt.body, semicolon === '')
          ];
          break;
        case Syntax.Program:
          len = stmt.body.length;
          result = [safeConcatenation && len > 0 ? '\n' : ''];
          for (i = 0; i < len; ++i) {
            fragment = addIndent(generateStatement(stmt.body[i], {
              semicolonOptional: !safeConcatenation && i === len - 1,
              directiveContext: true
            }));
            result.push(fragment);
            if (i + 1 < len && !endsWithLineTerminator(toSourceNodeWhenNeeded(fragment).toString())) {
              result.push(newline);
            }
          }
          break;
        case Syntax.FunctionDeclaration:
          isGenerator = stmt.generator && !extra.moz.starlessGenerator;
          result = [
            isGenerator ? 'function*' : 'function',
            isGenerator ? space : noEmptySpace(),
            generateIdentifier(stmt.id),
            generateFunctionBody(stmt)
          ];
          break;
        case Syntax.ReturnStatement:
          if (stmt.argument) {
            result = [
              join('return', generateExpression(stmt.argument, {
                precedence: Precedence.Sequence,
                allowIn: true,
                allowCall: true
              })),
              semicolon
            ];
          } else {
            result = ['return' + semicolon];
          }
          break;
        case Syntax.WhileStatement:
          withIndent(function () {
            result = [
              'while' + space + '(',
              generateExpression(stmt.test, {
                precedence: Precedence.Sequence,
                allowIn: true,
                allowCall: true
              }),
              ')'
            ];
          });
          result.push(maybeBlock(stmt.body, semicolon === ''));
          break;
        case Syntax.WithStatement:
          withIndent(function () {
            result = [
              'with' + space + '(',
              generateExpression(stmt.object, {
                precedence: Precedence.Sequence,
                allowIn: true,
                allowCall: true
              }),
              ')'
            ];
          });
          result.push(maybeBlock(stmt.body, semicolon === ''));
          break;
        default:
          throw new Error('Unknown statement type: ' + stmt.type);
        }
        if (extra.comment) {
          result = addComments(stmt, result);
        }
        fragment = toSourceNodeWhenNeeded(result).toString();
        if (stmt.type === Syntax.Program && !safeConcatenation && newline === '' && fragment.charAt(fragment.length - 1) === '\n') {
          result = sourceMap ? toSourceNodeWhenNeeded(result).replaceRight(/\s+$/, '') : fragment.replace(/\s+$/, '');
        }
        return toSourceNodeWhenNeeded(result, stmt);
      }
      function generate(node, options) {
        var defaultOptions = getDefaultOptions(), result, pair;
        if (options != null) {
          if (typeof options.indent === 'string') {
            defaultOptions.format.indent.style = options.indent;
          }
          if (typeof options.base === 'number') {
            defaultOptions.format.indent.base = options.base;
          }
          options = updateDeeply(defaultOptions, options);
          indent = options.format.indent.style;
          if (typeof options.base === 'string') {
            base = options.base;
          } else {
            base = stringRepeat(indent, options.format.indent.base);
          }
        } else {
          options = defaultOptions;
          indent = options.format.indent.style;
          base = stringRepeat(indent, options.format.indent.base);
        }
        json = options.format.json;
        renumber = options.format.renumber;
        hexadecimal = json ? false : options.format.hexadecimal;
        quotes = json ? 'double' : options.format.quotes;
        escapeless = options.format.escapeless;
        newline = options.format.newline;
        space = options.format.space;
        if (options.format.compact) {
          newline = space = indent = base = '';
        }
        parentheses = options.format.parentheses;
        semicolons = options.format.semicolons;
        safeConcatenation = options.format.safeConcatenation;
        directive = options.directive;
        parse = json ? null : options.parse;
        sourceMap = options.sourceMap;
        extra = options;
        if (sourceMap) {
          if (!exports.browser) {
            SourceNode = require('../../../node_modules/source-map/lib/source-map.js').SourceNode;
          } else {
            SourceNode = global.sourceMap.SourceNode;
          }
        }
        switch (node.type) {
        case Syntax.BlockStatement:
        case Syntax.BreakStatement:
        case Syntax.CatchClause:
        case Syntax.ContinueStatement:
        case Syntax.DirectiveStatement:
        case Syntax.DoWhileStatement:
        case Syntax.DebuggerStatement:
        case Syntax.EmptyStatement:
        case Syntax.ExpressionStatement:
        case Syntax.ForStatement:
        case Syntax.ForInStatement:
        case Syntax.ForOfStatement:
        case Syntax.FunctionDeclaration:
        case Syntax.IfStatement:
        case Syntax.LabeledStatement:
        case Syntax.Program:
        case Syntax.ReturnStatement:
        case Syntax.SwitchStatement:
        case Syntax.SwitchCase:
        case Syntax.ThrowStatement:
        case Syntax.TryStatement:
        case Syntax.VariableDeclaration:
        case Syntax.VariableDeclarator:
        case Syntax.WhileStatement:
        case Syntax.WithStatement:
          result = generateStatement(node);
          break;
        case Syntax.AssignmentExpression:
        case Syntax.ArrayExpression:
        case Syntax.ArrayPattern:
        case Syntax.BinaryExpression:
        case Syntax.CallExpression:
        case Syntax.ConditionalExpression:
        case Syntax.FunctionExpression:
        case Syntax.Identifier:
        case Syntax.Literal:
        case Syntax.LogicalExpression:
        case Syntax.MemberExpression:
        case Syntax.NewExpression:
        case Syntax.ObjectExpression:
        case Syntax.ObjectPattern:
        case Syntax.Property:
        case Syntax.SequenceExpression:
        case Syntax.ThisExpression:
        case Syntax.UnaryExpression:
        case Syntax.UpdateExpression:
        case Syntax.YieldExpression:
          result = generateExpression(node, {
            precedence: Precedence.Sequence,
            allowIn: true,
            allowCall: true
          });
          break;
        default:
          throw new Error('Unknown node type: ' + node.type);
        }
        if (!sourceMap) {
          pair = {
            code: result.toString(),
            map: null
          };
          return options.sourceMapWithCode ? pair : pair.code;
        }
        pair = result.toStringWithSourceMap({
          file: options.file,
          sourceRoot: options.sourceMapRoot
        });
        if (options.sourceContent) {
          pair.map.setSourceContent(options.sourceMap, options.sourceContent);
        }
        if (options.sourceMapWithCode) {
          return pair;
        }
        return pair.map.toString();
      }
      FORMAT_MINIFY = {
        indent: {
          style: '',
          base: 0
        },
        renumber: true,
        hexadecimal: true,
        quotes: 'auto',
        escapeless: true,
        compact: true,
        parentheses: false,
        semicolons: false
      };
      FORMAT_DEFAULTS = getDefaultOptions().format;
      exports.version = '1.3.3';
      exports.generate = generate;
      exports.attachComments = estraverse.attachComments;
      exports.Precedence = updateDeeply({}, Precedence);
      exports.browser = false;
      exports.FORMAT_MINIFY = FORMAT_MINIFY;
      exports.FORMAT_DEFAULTS = FORMAT_DEFAULTS;
    }());
  },
  '../../../node_modules/elements/domready.js': function (require, module, exports, global) {
    'use strict';
    var $ = require('../../../node_modules/elements/events.js');
    var readystatechange = 'onreadystatechange' in document, shouldPoll = false, loaded = false, readys = [], checks = [], ready = null, timer = null, test = document.createElement('div'), doc = $(document), win = $(window);
    var domready = function () {
      if (timer)
        timer = clearTimeout(timer);
      if (!loaded) {
        if (readystatechange)
          doc.off('readystatechange', check);
        doc.off('DOMContentLoaded', domready);
        win.off('load', domready);
        loaded = true;
        for (var i = 0; ready = readys[i++];)
          ready();
      }
      return loaded;
    };
    var check = function () {
      for (var i = checks.length; i--;)
        if (checks[i]())
          return domready();
      return false;
    };
    var poll = function () {
      clearTimeout(timer);
      if (!check())
        timer = setTimeout(poll, 1000 / 60);
    };
    if (document.readyState) {
      var complete = function () {
        return !!/loaded|complete/.test(document.readyState);
      };
      checks.push(complete);
      if (!complete()) {
        if (readystatechange)
          doc.on('readystatechange', check);
        else
          shouldPoll = true;
      } else {
        domready();
      }
    }
    if (test.doScroll) {
      var scrolls = function () {
        try {
          test.doScroll();
          return true;
        } catch (e) {
        }
        return false;
      };
      if (!scrolls()) {
        checks.push(scrolls);
        shouldPoll = true;
      }
    }
    if (shouldPoll)
      poll();
    doc.on('DOMContentLoaded', domready);
    win.on('load', domready);
    module.exports = function (ready) {
      loaded ? ready() : readys.push(ready);
      return null;
    };
  },
  '../../../node_modules/elements/index.js': function (require, module, exports, global) {
    'use strict';
    var $ = require('../../../node_modules/elements/base.js');
    require('../../../node_modules/elements/attributes.js');
    require('../../../node_modules/elements/events.js');
    require('../../../node_modules/elements/insertion.js');
    require('../../../node_modules/elements/traversal.js');
    require('../../../node_modules/elements/delegation.js');
    module.exports = $;
  },
  '../../../node_modules/tosource/tosource.js': function (require, module, exports, global) {
    module.exports = function (object, filter, indent, startingIndent) {
      var seen = [];
      return walk(object, filter, indent === undefined ? '  ' : indent || '', startingIndent || '', seen);
      function walk(object, filter, indent, currentIndent, seen) {
        var nextIndent = currentIndent + indent;
        object = filter ? filter(object) : object;
        switch (typeof object) {
        case 'string':
          return JSON.stringify(object);
        case 'boolean':
        case 'number':
        case 'function':
        case 'undefined':
          return '' + object;
        }
        if (object === null)
          return 'null';
        if (object instanceof RegExp)
          return object.toString();
        if (object instanceof Date)
          return 'new Date(' + object.getTime() + ')';
        if (seen.indexOf(object) >= 0)
          return '{$circularReference:1}';
        seen.push(object);
        function join(elements) {
          return indent.slice(1) + elements.join(',' + (indent && '\n') + nextIndent) + (indent ? ' ' : '');
        }
        if (Array.isArray(object)) {
          return '[' + join(object.map(function (element) {
            return walk(element, filter, indent, nextIndent, seen.slice());
          })) + ']';
        }
        var keys = Object.keys(object);
        return keys.length ? '{' + join(keys.map(function (key) {
          return (legalKey(key) ? key : JSON.stringify(key)) + ':' + walk(object[key], filter, indent, nextIndent, seen.slice());
        })) + '}' : '{}';
      }
    };
    var KEYWORD_REGEXP = /^(abstract|boolean|break|byte|case|catch|char|class|const|continue|debugger|default|delete|do|double|else|enum|export|extends|false|final|finally|float|for|function|goto|if|implements|import|in|instanceof|int|interface|long|native|new|null|package|private|protected|public|return|short|static|super|switch|synchronized|this|throw|throws|transient|true|try|typeof|undefined|var|void|volatile|while|with)$/;
    function legalKey(string) {
      return /^[a-z_$][0-9a-z_$]*$/gi.test(string) && !KEYWORD_REGEXP.test(string);
    }
  },
  '../../../node_modules/elements/events.js': function (require, module, exports, global) {
    'use strict';
    var Emitter = require('../../../node_modules/prime/emitter.js');
    var $ = require('../../../node_modules/elements/base.js');
    var html = document.documentElement;
    var addEventListener = html.addEventListener ? function (node, event, handle, useCapture) {
        node.addEventListener(event, handle, useCapture || false);
        return handle;
      } : function (node, event, handle) {
        node.attachEvent('on' + event, handle);
        return handle;
      };
    var removeEventListener = html.removeEventListener ? function (node, event, handle, useCapture) {
        node.removeEventListener(event, handle, useCapture || false);
      } : function (node, event, handle) {
        node.detachEvent('on' + event, handle);
      };
    $.implement({
      on: function (event, handle, useCapture) {
        return this.forEach(function (node) {
          var self = $(node);
          var internalEvent = event + (useCapture ? ':capture' : '');
          Emitter.prototype.on.call(self, internalEvent, handle);
          var domListeners = self._domListeners || (self._domListeners = {});
          if (!domListeners[internalEvent])
            domListeners[internalEvent] = addEventListener(node, event, function (e) {
              Emitter.prototype.emit.call(self, internalEvent, e || window.event, Emitter.EMIT_SYNC);
            }, useCapture);
        });
      },
      off: function (event, handle, useCapture) {
        return this.forEach(function (node) {
          var self = $(node);
          var internalEvent = event + (useCapture ? ':capture' : '');
          var domListeners = self._domListeners, domEvent, listeners = self._listeners, events;
          if (domListeners && (domEvent = domListeners[internalEvent]) && listeners && (events = listeners[internalEvent])) {
            Emitter.prototype.off.call(self, internalEvent, handle);
            if (!self._listeners || !self._listeners[event]) {
              removeEventListener(node, event, domEvent);
              delete domListeners[event];
              for (var l in domListeners)
                return;
              delete self._domListeners;
            }
          }
        });
      },
      emit: function () {
        var args = arguments;
        return this.forEach(function (node) {
          Emitter.prototype.emit.apply($(node), args);
        });
      }
    });
    module.exports = $;
  },
  '../../../node_modules/elements/base.js': function (require, module, exports, global) {
    'use strict';
    var prime = require('../../../node_modules/prime/index.js');
    var forEach = require('../../../node_modules/mout/array/forEach.js'), map = require('../../../node_modules/mout/array/map.js'), filter = require('../../../node_modules/mout/array/filter.js'), every = require('../../../node_modules/mout/array/every.js'), some = require('../../../node_modules/mout/array/some.js');
    var index = 0, __dc = document.__counter, counter = document.__counter = (__dc ? parseInt(__dc, 36) + 1 : 0).toString(36), key = 'uid:' + counter;
    var uniqueID = function (n) {
      if (n === window)
        return 'window';
      if (n === document)
        return 'document';
      if (n === document.documentElement)
        return 'html';
      return n[key] || (n[key] = (index++).toString(36));
    };
    var instances = {};
    var $ = prime({
        constructor: function $(n, context) {
          if (n == null)
            return this && this.constructor === $ ? new Elements() : null;
          var self, uid;
          if (n.constructor !== Elements) {
            self = new Elements();
            if (typeof n === 'string') {
              if (!self.search)
                return null;
              self[self.length++] = context || document;
              return self.search(n);
            }
            if (n.nodeType || n === window) {
              self[self.length++] = n;
            } else if (n.length) {
              var uniques = {};
              for (var i = 0, l = n.length; i < l; i++) {
                var nodes = $(n[i], context);
                if (nodes && nodes.length)
                  for (var j = 0, k = nodes.length; j < k; j++) {
                    var node = nodes[j];
                    uid = uniqueID(node);
                    if (!uniques[uid]) {
                      self[self.length++] = node;
                      uniques[uid] = true;
                    }
                  }
              }
            }
          } else {
            self = n;
          }
          if (!self.length)
            return null;
          if (self.length === 1) {
            uid = uniqueID(self[0]);
            return instances[uid] || (instances[uid] = self);
          }
          return self;
        }
      });
    var Elements = prime({
        inherits: $,
        constructor: function Elements() {
          this.length = 0;
        },
        unlink: function () {
          return this.map(function (node) {
            delete instances[uniqueID(node)];
            return node;
          });
        },
        forEach: function (method, context) {
          forEach(this, method, context);
          return this;
        },
        map: function (method, context) {
          return map(this, method, context);
        },
        filter: function (method, context) {
          return filter(this, method, context);
        },
        every: function (method, context) {
          return every(this, method, context);
        },
        some: function (method, context) {
          return some(this, method, context);
        }
      });
    module.exports = $;
  },
  '../../../node_modules/elements/attributes.js': function (require, module, exports, global) {
    'use strict';
    var $ = require('../../../node_modules/elements/base.js');
    var trim = require('../../../node_modules/mout/string/trim.js'), forEach = require('../../../node_modules/mout/array/forEach.js'), filter = require('../../../node_modules/mout/array/filter.js'), indexOf = require('../../../node_modules/mout/array/indexOf.js');
    $.implement({
      setAttribute: function (name, value) {
        return this.forEach(function (node) {
          node.setAttribute(name, value);
        });
      },
      getAttribute: function (name) {
        var attr = this[0].getAttributeNode(name);
        return attr && attr.specified ? attr.value : null;
      },
      hasAttribute: function (name) {
        var node = this[0];
        if (node.hasAttribute)
          return node.hasAttribute(name);
        var attr = node.getAttributeNode(name);
        return !!(attr && attr.specified);
      },
      removeAttribute: function (name) {
        return this.forEach(function (node) {
          var attr = node.getAttributeNode(name);
          if (attr)
            node.removeAttributeNode(attr);
        });
      }
    });
    var accessors = {};
    forEach([
      'type',
      'value',
      'name',
      'href',
      'title',
      'id'
    ], function (name) {
      accessors[name] = function (value) {
        return value !== undefined ? this.forEach(function (node) {
          node[name] = value;
        }) : this[0][name];
      };
    });
    forEach([
      'checked',
      'disabled',
      'selected'
    ], function (name) {
      accessors[name] = function (value) {
        return value !== undefined ? this.forEach(function (node) {
          node[name] = !!value;
        }) : !!this[0][name];
      };
    });
    var classes = function (className) {
      var classNames = trim(className).replace(/\s+/g, ' ').split(' '), uniques = {};
      return filter(classNames, function (className) {
        if (className !== '' && !uniques[className])
          return uniques[className] = className;
      }).sort();
    };
    accessors.className = function (className) {
      return className !== undefined ? this.forEach(function (node) {
        node.className = classes(className).join(' ');
      }) : classes(this[0].className).join(' ');
    };
    $.implement({
      attribute: function (name, value) {
        var accessor = accessors[name];
        if (accessor)
          return accessor.call(this, value);
        if (value != null)
          return this.setAttribute(name, value);
        if (value === null)
          return this.removeAttribute(name);
        if (value === undefined)
          return this.getAttribute(name);
      }
    });
    $.implement(accessors);
    $.implement({
      check: function () {
        return this.checked(true);
      },
      uncheck: function () {
        return this.checked(false);
      },
      disable: function () {
        return this.disabled(true);
      },
      enable: function () {
        return this.disabled(false);
      },
      select: function () {
        return this.selected(true);
      },
      deselect: function () {
        return this.selected(false);
      }
    });
    $.implement({
      classNames: function () {
        return classes(this[0].className);
      },
      hasClass: function (className) {
        return indexOf(this.classNames(), className) > -1;
      },
      addClass: function (className) {
        return this.forEach(function (node) {
          var nodeClassName = node.className;
          var classNames = classes(nodeClassName + ' ' + className).join(' ');
          if (nodeClassName !== classNames)
            node.className = classNames;
        });
      },
      removeClass: function (className) {
        return this.forEach(function (node) {
          var classNames = classes(node.className);
          forEach(classes(className), function (className) {
            var index = indexOf(classNames, className);
            if (index > -1)
              classNames.splice(index, 1);
          });
          node.className = classNames.join(' ');
        });
      }
    });
    $.prototype.toString = function () {
      var tag = this.tag(), id = this.id(), classes = this.classNames();
      var str = tag;
      if (id)
        str += '#' + id;
      if (classes.length)
        str += '.' + classes.join('.');
      return str;
    };
    var textProperty = document.createElement('div').textContent == null ? 'innerText' : 'textContent';
    $.implement({
      tag: function () {
        return this[0].tagName.toLowerCase();
      },
      html: function (html) {
        return html !== undefined ? this.forEach(function (node) {
          node.innerHTML = html;
        }) : this[0].innerHTML;
      },
      text: function (text) {
        return text !== undefined ? this.forEach(function (node) {
          node[textProperty] = text;
        }) : this[0][textProperty];
      },
      data: function (key, value) {
        switch (value) {
        case undefined:
          return this.getAttribute('data-' + key);
        case null:
          return this.removeAttribute('data-' + key);
        default:
          return this.setAttribute('data-' + key, value);
        }
      }
    });
    module.exports = $;
  },
  '../../../node_modules/elements/insertion.js': function (require, module, exports, global) {
    'use strict';
    var $ = require('../../../node_modules/elements/base.js');
    $.implement({
      appendChild: function (child) {
        this[0].appendChild($(child)[0]);
        return this;
      },
      insertBefore: function (child, ref) {
        this[0].insertBefore($(child)[0], $(ref)[0]);
        return this;
      },
      removeChild: function (child) {
        this[0].removeChild($(child)[0]);
        return this;
      },
      replaceChild: function (child, ref) {
        this[0].replaceChild($(child)[0], $(ref)[0]);
        return this;
      }
    });
    $.implement({
      before: function (element) {
        element = $(element)[0];
        var parent = element.parentNode;
        if (parent)
          this.forEach(function (node) {
            parent.insertBefore(node, element);
          });
        return this;
      },
      after: function (element) {
        element = $(element)[0];
        var parent = element.parentNode;
        if (parent)
          this.forEach(function (node) {
            parent.insertBefore(node, element.nextSibling);
          });
        return this;
      },
      bottom: function (element) {
        element = $(element)[0];
        return this.forEach(function (node) {
          element.appendChild(node);
        });
      },
      top: function (element) {
        element = $(element)[0];
        return this.forEach(function (node) {
          element.insertBefore(node, element.firstChild);
        });
      }
    });
    $.implement({
      insert: $.prototype.bottom,
      remove: function () {
        return this.forEach(function (node) {
          var parent = node.parentNode;
          if (parent)
            parent.removeChild(node);
        });
      },
      replace: function (element) {
        element = $(element)[0];
        element.parentNode.replaceChild(this[0], element);
        return this;
      }
    });
    module.exports = $;
  },
  '../../../node_modules/elements/traversal.js': function (require, module, exports, global) {
    'use strict';
    var map = require('../../../node_modules/mout/array/map.js');
    var slick = require('../../../node_modules/slick/index.js');
    var $ = require('../../../node_modules/elements/base.js');
    var gen = function (combinator, expression) {
      return map(slick.parse(expression || '*'), function (part) {
        return combinator + ' ' + part;
      }).join(', ');
    };
    var push_ = Array.prototype.push;
    $.implement({
      search: function (expression) {
        if (this.length === 1)
          return $(slick.search(expression, this[0], new $()));
        var buffer = [];
        for (var i = 0, node; node = this[i]; i++)
          push_.apply(buffer, slick.search(expression, node));
        buffer = $(buffer);
        return buffer && buffer.sort();
      },
      find: function (expression) {
        if (this.length === 1)
          return $(slick.find(expression, this[0]));
        for (var i = 0, node; node = this[i]; i++) {
          var found = slick.find(expression, node);
          if (found)
            return $(found);
        }
        return null;
      },
      sort: function () {
        return slick.sort(this);
      },
      matches: function (expression) {
        return slick.matches(this[0], expression);
      },
      contains: function (node) {
        return slick.contains(this[0], node);
      },
      nextSiblings: function (expression) {
        return this.search(gen('~', expression));
      },
      nextSibling: function (expression) {
        return this.find(gen('+', expression));
      },
      previousSiblings: function (expression) {
        return this.search(gen('!~', expression));
      },
      previousSibling: function (expression) {
        return this.find(gen('!+', expression));
      },
      children: function (expression) {
        return this.search(gen('>', expression));
      },
      firstChild: function (expression) {
        return this.find(gen('^', expression));
      },
      lastChild: function (expression) {
        return this.find(gen('!^', expression));
      },
      parent: function (expression) {
        var buffer = [];
        loop:
          for (var i = 0, node; node = this[i]; i++)
            while ((node = node.parentNode) && node !== document) {
              if (!expression || slick.matches(node, expression)) {
                buffer.push(node);
                break loop;
                break;
              }
            }
        return $(buffer);
      },
      parents: function (expression) {
        var buffer = [];
        for (var i = 0, node; node = this[i]; i++)
          while ((node = node.parentNode) && node !== document) {
            if (!expression || slick.matches(node, expression))
              buffer.push(node);
          }
        return $(buffer);
      }
    });
    module.exports = $;
  },
  '../../../node_modules/elements/delegation.js': function (require, module, exports, global) {
    'use strict';
    var Map = require('../../../node_modules/prime/map.js');
    var $ = require('../../../node_modules/elements/events.js');
    require('../../../node_modules/elements/traversal.js');
    $.implement({
      delegate: function (event, selector, handle) {
        return this.forEach(function (node) {
          var self = $(node);
          var delegation = self._delegation || (self._delegation = {}), events = delegation[event] || (delegation[event] = {}), map = events[selector] || (events[selector] = new Map());
          if (map.get(handle))
            return;
          var action = function (e) {
            var target = $(e.target || e.srcElement), match = target.matches(selector) ? target : target.parent(selector);
            var res;
            if (match)
              res = handle.call(self, e, match);
            return res;
          };
          map.set(handle, action);
          self.on(event, action);
        });
      },
      undelegate: function (event, selector, handle) {
        return this.forEach(function (node) {
          var self = $(node), delegation, events, map;
          if (!(delegation = self._delegation) || !(events = delegation[event]) || !(map = events[selector]))
            return;
          var action = map.get(handle);
          if (action) {
            self.off(event, action);
            map.remove(action);
            if (!map.count())
              delete events[selector];
            var e1 = true, e2 = true, x;
            for (x in events) {
              e1 = false;
              break;
            }
            if (e1)
              delete delegation[event];
            for (x in delegation) {
              e2 = false;
              break;
            }
            if (e2)
              delete self._delegation;
          }
        });
      }
    });
    module.exports = $;
  },
  '../../../node_modules/harmonizer/util/iterators.js': function (require, module, exports, global) {
    'use strict';
    var iterator = function (next) {
      var it = { next: next };
      it['@@iterator'] = function () {
        return it;
      };
      return it;
    };
    exports.iterator = iterator;
    var arrayValuesNext = function (array) {
      var i = 0;
      return function () {
        return i === array.length ? {
          value: void 0,
          done: true
        } : {
          value: array[i++],
          done: false
        };
      };
    };
    var arrayKeysNext = function (array) {
      var i = 0;
      return function () {
        return i === array.length ? {
          value: void 0,
          done: true
        } : {
          value: i++,
          done: false
        };
      };
    };
    var arrayEntriesNext = function (array) {
      var i = 0;
      return function () {
        return i === array.length ? {
          value: void 0,
          done: true
        } : {
          value: [
            i,
            array[i++]
          ],
          done: false
        };
      };
    };
    var objectValuesNext = function (object) {
      var keys = Object.keys(object), i = 0;
      return function () {
        return i === keys.length ? {
          value: void 0,
          done: true
        } : {
          value: object[keys[i++]],
          done: false
        };
      };
    };
    var objectKeysNext = function (object) {
      var keys = Object.keys(object), i = 0;
      return function () {
        return i === keys.length ? {
          value: void 0,
          done: true
        } : {
          value: keys[i++],
          done: false
        };
      };
    };
    var objectEntriesNext = function (object) {
      var keys = Object.keys(object), i = 0;
      return function () {
        if (i === keys.length) {
          return {
            value: void 0,
            done: true
          };
        }
        var key = keys[i++], value = object[key];
        return {
          value: [
            key,
            value
          ],
          done: false
        };
      };
    };
    var values = function values(object) {
      return iterator(object instanceof Array ? arrayValuesNext(object) : objectValuesNext(object));
    };
    exports.values = values;
    var keys = function keys(object) {
      return iterator(object instanceof Array ? arrayKeysNext(object) : objectKeysNext(object));
    };
    exports.keys = keys;
    var entries = function entries(object) {
      return iterator(object instanceof Array ? arrayEntriesNext(object) : objectEntriesNext(object));
    };
    exports.entries = entries;
  },
  '../../../node_modules/harmonizer/transform/shorthands.js': function (require, module, exports, global) {
    'use strict';
    exports.default = function deshorthandify(program) {
      program.search('#Property').forEach(function (node) {
        node.shorthand = false;
        node.method = false;
      });
    };
  },
  '../../../node_modules/harmonizer/transform/arrow-functions.js': function (require, module, exports, global) {
    'use strict';
    var callExpressionB = require('../../../node_modules/nodes/index.js');
    var nodes = callExpressionB.nodes, syntax = callExpressionB.syntax;
    var callExpressionA = require('../../../node_modules/harmonizer/util/self.js');
    var getSelfId = callExpressionA.getSelfId;
    var callExpression = require('../../../node_modules/harmonizer/util/arguments.js');
    var getArgumentsId = callExpression.getArgumentsId;
    exports.default = function arrowify(program) {
      var q = [
          '#ArrowFunctionExpression => #ThisExpression',
          '#ArrowFunctionExpression => #Identifier:reference[name=arguments]'
        ];
      program.search(q).forEach(function (expression) {
        var arrowFunction = expression.scope();
        var arrowScope = arrowFunction.scope('[type!=ArrowFunctionExpression]');
        var id;
        if (expression.type === syntax.ThisExpression) {
          id = getSelfId(arrowScope);
        } else {
          id = getArgumentsId(arrowScope);
        }
        expression.parentNode.replaceChild(expression, id.clone());
      });
      program.search('#ArrowFunctionExpression').forEach(function (node) {
        var shallow = new nodes.FunctionExpression(node);
        node.parentNode.replaceChild(node, shallow);
      });
    };
  },
  '../../../node_modules/harmonizer/transform/comprehensions.js': function (require, module, exports, global) {
    'use strict';
    var callExpressionC = require('../../../node_modules/nodes/index.js');
    var nodes = callExpressionC.nodes;
    var callExpressionB = require('../../../node_modules/harmonizer/util/self.js');
    var getSelfId = callExpressionB.getSelfId;
    var callExpressionA = require('../../../node_modules/harmonizer/util/string.js');
    var express = callExpressionA.express;
    var callExpression = require('../../../node_modules/harmonizer/util/id.js');
    var getUniqueName = callExpression.getUniqueName;
    exports.default = function comprehendify(program) {
      program.search('#ComprehensionExpression').forEach(function (node) {
        var parentNode = node.parentNode;
        var blocks = node.blocks;
        var wrapper = express('(function(){})()').expression;
        var body = wrapper.callee.body.body;
        var comprehensionId = new nodes.Identifier({ name: '$' });
        var identifiers = [comprehensionId];
        var comprehensionDeclaration = new nodes.VariableDeclaration({
            declarations: [new nodes.VariableDeclarator({
                id: comprehensionId,
                init: new nodes.ArrayExpression()
              })]
          });
        var forOfRoot, forOfInnermost;
        blocks.forEach(function (block) {
          var forOfStatement = new nodes.ForOfStatement();
          forOfStatement.left = new nodes.VariableDeclaration({ declarations: [new nodes.VariableDeclarator({ id: block.left })] });
          forOfStatement.right = block.right;
          forOfStatement.body = new nodes.BlockStatement();
          if (forOfInnermost) {
            forOfInnermost.body.body.push(forOfStatement);
          } else {
            forOfRoot = forOfStatement;
          }
          forOfInnermost = forOfStatement;
        });
        var pushCallExpression = express(comprehensionId.name + '.push()');
        pushCallExpression.expression.arguments.push(node.body);
        identifiers.push(pushCallExpression.expression.callee.object);
        if (node.filter) {
          var ifStatement = new nodes.IfStatement({
              test: node.filter,
              consequent: pushCallExpression
            });
          forOfInnermost.body.body.push(ifStatement);
        } else {
          forOfInnermost.body.body.push(pushCallExpression);
        }
        var returnStatement = new nodes.ReturnStatement({ argument: comprehensionId.clone() });
        identifiers.push(returnStatement.argument);
        body.push(comprehensionDeclaration, forOfRoot, returnStatement);
        parentNode.replaceChild(node, wrapper);
        var comprehensionName = getUniqueName(wrapper.callee, 'comprehension');
        identifiers.forEach(function (id) {
          id.name = comprehensionName;
        });
        body.search('=> #ThisExpression').forEach(function (node) {
          var selfId = getSelfId(wrapper.scope());
          node.parentNode.replaceChild(node, selfId.clone());
        });
      });
    };
  },
  '../../../node_modules/harmonizer/transform/for-of.js': function (require, module, exports, global) {
    'use strict';
    var callExpressionB = require('../../../node_modules/nodes/index.js');
    var nodes = callExpressionB.nodes, syntax = callExpressionB.syntax;
    var callExpressionA = require('../../../node_modules/harmonizer/util/id.js');
    var getUniqueId = callExpressionA.getUniqueId;
    var callExpression = require('../../../node_modules/harmonizer/util/string.js');
    var express = callExpression.express;
    exports.default = function forofify(program) {
      program.search('#ForOfStatement').forEach(function (node) {
        var forStatement = new nodes.ForStatement();
        var left = node.left;
        var iteratorId = getUniqueId(node.scope(), 'iterator');
        var stepId = getUniqueId(node.scope(), 'step');
        forStatement.body = node.body;
        var init = new nodes.CallExpression({
            callee: new nodes.MemberExpression({
              computed: true,
              object: node.right,
              property: new nodes.Literal({ value: '@@iterator' })
            })
          });
        forStatement.init = new nodes.VariableDeclaration({
          declarations: [
            new nodes.VariableDeclarator({
              id: iteratorId,
              init: init
            }),
            new nodes.VariableDeclarator({ id: stepId })
          ]
        });
        forStatement.test = express('!(' + stepId.name + ' = ' + iteratorId.name + '.next()).done').expression;
        var expression, xp = express(stepId.name + '.value').expression;
        if (left.type === syntax.VariableDeclaration) {
          left.declarations[0].init = xp;
          expression = left;
        } else {
          expression = new nodes.ExpressionStatement({
            expression: new nodes.AssignmentExpression({
              operator: '=',
              left: left,
              right: xp
            })
          });
        }
        forStatement.body.body.unshift(expression);
        node.parentNode.replaceChild(node, forStatement);
      });
    };
  },
  '../../../node_modules/harmonizer/transform/patterns.js': function (require, module, exports, global) {
    'use strict';
    var callExpressionC = require('../../../node_modules/nodes/index.js');
    var nodes = callExpressionC.nodes, syntax = callExpressionC.syntax;
    var callExpressionB = require('../../../node_modules/harmonizer/util/string.js');
    var express = callExpressionB.express, lower = callExpressionB.lower, upper = callExpressionB.upper;
    var callExpressionA = require('../../../node_modules/harmonizer/util/insertion.js');
    var insertBefore = callExpressionA.insertBefore;
    var callExpression = require('../../../node_modules/harmonizer/util/id.js');
    var getUniqueId = callExpression.getUniqueId;
    var createDeclarator = function (id, init) {
      return new nodes.VariableDeclarator({
        id: id,
        init: init
      });
    };
    var createAssignment = function (left, right) {
      return new nodes.AssignmentExpression({
        operator: '=',
        left: left,
        right: right
      });
    };
    var destruct = {
        ArrayPattern: function (pattern, declarations, valueId, assign) {
          var create = assign ? createAssignment : createDeclarator;
          pattern.elements.forEachRight(function (element, i) {
            if (element == null) {
              return;
            }
            var memberString = valueId ? valueId.name + '[' + i + ']' : null;
            if (element.type === syntax.Identifier) {
              declarations.unshift(create(element, memberString ? express(memberString).expression : null));
            } else {
              if (element.search('properties > * > value#Identifier, elements > #Identifier').length) {
                var nestedId;
                if (valueId) {
                  nestedId = getUniqueId(declarations.scope(), valueId.name + i);
                  var declaration = express('var ' + nestedId.name + ' = ' + memberString);
                  insertBefore(declarations, declaration);
                }
                destruct[element.type](element, declarations, nestedId, assign);
              }
            }
          });
        },
        ObjectPattern: function (pattern, declarations, valueId, assign) {
          var create = assign ? createAssignment : createDeclarator;
          var properties = pattern.properties;
          properties.forEachRight(function (property) {
            var memberString = valueId ? valueId.name + '.' + property.key.name : null;
            var value = property.value;
            if (value.type === syntax.Identifier) {
              declarations.unshift(create(value, memberString ? express(memberString).expression : null));
            } else {
              if (value.search('properties > * > value#Identifier, elements > #Identifier').length) {
                var nestedId;
                if (valueId) {
                  nestedId = getUniqueId(declarations.scope(), valueId.name + upper(property.key.name));
                  var declaration = express('var ' + nestedId.name + ' = ' + memberString);
                  insertBefore(declarations, declaration);
                }
                destruct[value.type](value, declarations, nestedId, assign);
              }
            }
          });
        }
      };
    exports.default = function patternify(program) {
      var q;
      q = [
        '#ForOfStatement > left > declarations > * > #ArrayPattern',
        '#ForOfStatement > left > declarations > * > #ObjectPattern',
        '#ForInStatement > left > declarations > * > #ArrayPattern',
        '#ForInStatement > left > declarations > * > #ObjectPattern'
      ];
      program.search(q).forEachRight(function (pattern) {
        var declarator = pattern.parentNode;
        var declarations = declarator.parentNode;
        var declaration = declarations.parentNode;
        var forStatement = declaration.parentNode;
        var valueId = getUniqueId(forStatement.scope(), lower(pattern.type));
        declarations.replaceChild(declarator, new nodes.VariableDeclarator({
          id: valueId,
          kind: declaration.kind
        }));
        var newDeclaration = new nodes.VariableDeclaration();
        forStatement.body.body.unshift(newDeclaration);
        destruct[pattern.type](pattern, newDeclaration.declarations, valueId);
      });
      q = [
        '#ForOfStatement > left#ArrayPattern',
        '#ForOfStatement > left#ObjectPattern',
        '#ForInStatement > left#ArrayPattern',
        '#ForInStatement > left#ObjectPattern'
      ];
      program.search(q).forEachRight(function (pattern) {
        var forStatement = pattern.parentNode;
        var valueId = getUniqueId(forStatement.scope(), lower(pattern.type));
        forStatement.left = express('var ' + valueId.name);
        var expression = new nodes.ExpressionStatement();
        var sequence = new nodes.SequenceExpression();
        expression.expression = sequence;
        forStatement.body.body.unshift(expression);
        destruct[pattern.type](pattern, sequence.expressions, valueId, true);
      });
      q = '#VariableDeclarator > #ArrayPattern, #VariableDeclarator > #ObjectPattern';
      program.search(q).forEachRight(function (pattern) {
        var declarator = pattern.parentNode;
        var declarations = declarator.parentNode;
        var declaration = declarations.parentNode;
        declarations.removeChild(declarator);
        if (declarator.init == null) {
          destruct[pattern.type](pattern, declarations);
        } else {
          var valueId;
          if (declarator.init.type === syntax.Identifier) {
            valueId = declarator.init;
          } else {
            valueId = getUniqueId(declarations.scope(), lower(declarator.init.type));
            var valueDeclaration = express('var ' + valueId.name + ' = $');
            valueDeclaration.declarations[0].init = declarator.init;
            insertBefore(declarations, valueDeclaration);
          }
          destruct[pattern.type](pattern, declarations, valueId);
        }
        if (!declarations.length) {
          declaration.parentNode.removeChild(declaration);
        }
      });
      q = '#AssignmentExpression > left#ArrayPattern, #AssignmentExpression > left#ObjectPattern';
      program.search(q).forEachRight(function (pattern) {
        var expression = pattern.parentNode;
        var right = expression.right;
        var expressions = expression.parentNode;
        var sequence = expressions.parentNode;
        if (sequence.type !== syntax.SequenceExpression) {
          var key = expressions.indexOf(expression);
          expressions[key] = new nodes.SequenceExpression({ expressions: [expressions[key]] });
          expressions = expressions[key].expressions;
        }
        expressions.removeChild(expression);
        sequence = expressions.parentNode;
        var valueId;
        if (right.type === syntax.Identifier) {
          valueId = right;
        } else {
          valueId = getUniqueId(sequence.scope(), lower(right.type));
          var declaration = express('var ' + valueId.name + ' = $');
          declaration.declarations[0].init = right;
          insertBefore(sequence, declaration);
        }
        destruct[pattern.type](pattern, expressions, valueId, true);
      });
      q = '#Function > params > #ArrayPattern, #Function > params > #ObjectPattern';
      program.search(q).forEachRight(function (pattern) {
        var params = pattern.parentNode;
        var fn = params.parentNode;
        var valueId = getUniqueId(fn, 'argument');
        params.replaceChild(pattern, valueId);
        if (!pattern.search('properties > * > value#Identifier, elements > #Identifier').length) {
          return;
        }
        var declaration = new nodes.VariableDeclaration();
        fn.body.body.unshift(declaration);
        destruct[pattern.type](pattern, declaration.declarations, valueId);
      });
    };
  },
  '../../../node_modules/harmonizer/transform/default-params.js': function (require, module, exports, global) {
    'use strict';
    var callExpression = require('../../../node_modules/harmonizer/util/string.js');
    var express = callExpression.express;
    exports.default = function defaultify(program) {
      program.search('#Function').forEach(function (fn) {
        if (fn.defaults.length === 0) {
          return;
        }
        var params = fn.params;
        var defaults = fn.defaults;
        defaults.forEachRight(function (node, i) {
          if (node == null) {
            return defaults.removeChild(node);
          }
          var param = params[i];
          var statement = express('if (' + param.name + ' === void 0) ' + param.name + ' = $');
          statement.consequent.expression.right = node;
          fn.body.body.unshift(statement);
        });
      });
    };
  },
  '../../../node_modules/harmonizer/transform/classes.js': function (require, module, exports, global) {
    'use strict';
    var callExpressionG = require('../../../node_modules/nodes/index.js');
    var nodes = callExpressionG.nodes, syntax = callExpressionG.syntax;
    var callExpressionF = require('../../../node_modules/harmonizer/transform/spread.js');
    var applyContext = callExpressionF.applyContext;
    var callExpressionE = require('../../../node_modules/harmonizer/util/insertion.js');
    var insertAfter = callExpressionE.insertAfter;
    var callExpressionD = require('../../../node_modules/harmonizer/util/string.js');
    var express = callExpressionD.express, upper = callExpressionD.upper;
    var callExpressionC = require('../../../node_modules/harmonizer/util/id.js');
    var getUniqueId = callExpressionC.getUniqueId;
    var callExpressionB = require('../../../node_modules/harmonizer/util/extend.js');
    var getExtendId = callExpressionB.getExtendId;
    var callExpressionA = require('../../../node_modules/harmonizer/util/self.js');
    var getSelfId = callExpressionA.getSelfId;
    exports.default = function classify(program) {
      program.search('#Class').forEach(function (node) {
        var definitions = node.body.body;
        if (!node.id && node.parentNode.type === syntax.VariableDeclarator) {
          node.id = new nodes.Identifier({ name: upper(node.parentNode.id.name) });
        }
        if (!node.id) {
          node.id = getUniqueId(node, 'Class');
        }
        var name = node.id.name;
        var getPrototypeOfNamePrototype = 'Object.getPrototypeOf(' + name + '.prototype)';
        var getPrototypeOfName = 'Object.getPrototypeOf(' + name + ')';
        var extendId = getExtendId(program).clone();
        var superClass = node.superClass;
        var constructorMethod = !!definitions.search('> #MethodDefinition > key[name=constructor]').length;
        if (!constructorMethod) {
          definitions.unshift(new nodes.MethodDefinition({
            key: new nodes.Identifier({ name: 'constructor' }),
            value: express('(function () {\n        var proto = ' + getPrototypeOfNamePrototype + ';\n        if (proto !== null) proto.constructor.apply(this, arguments);\n      })').expression
          }));
        }
        var q = [
            '>> #CallExpression > callee#MemberExpression[computed=false] > object#Identifier[name=super]',
            '>> #CallExpression > callee#Identifier[name=super]'
          ];
        definitions.search(q).forEach(function (id) {
          var definition = id.parent('#MethodDefinition');
          var parentNode = id.parentNode;
          var callExpression, methodName;
          if (parentNode.type === syntax.MemberExpression) {
            callExpression = parentNode.parentNode;
            methodName = parentNode.property.name;
          } else {
            callExpression = parentNode;
            methodName = definition.key.name;
          }
          var superMethodXp = definition.static ? express(getPrototypeOfName + '.' + methodName).expression : express(getPrototypeOfNamePrototype + '.' + methodName).expression;
          var selfId;
          var definitionFunction = definition.value;
          selfId = id.scope() !== definitionFunction ? getSelfId(definitionFunction).clone() : new nodes.ThisExpression();
          callExpression.callee = superMethodXp;
          applyContext(callExpression, selfId);
        });
        var constructorFunction = definitions.search('> #MethodDefinition > key[name=constructor] < * > value')[0];
        constructorFunction.id = new nodes.Identifier({ name: name });
        definitions.removeChild(constructorFunction.parentNode);
        constructorFunction = new nodes.FunctionDeclaration(constructorFunction);
        if (!superClass) {
          superClass = new nodes.Identifier({ name: 'Object' });
        }
        var prototype = new nodes.ObjectExpression();
        var members = new nodes.ObjectExpression();
        definitions.forEach(function (definition) {
          (definition.static ? members : prototype).properties.push(new nodes.Property({
            key: definition.key,
            value: definition.value,
            kind: definition.kind || 'init'
          }));
        });
        var extendExpression = express(extendId.name + '()');
        var args = extendExpression.expression.arguments;
        if (node.type === syntax.ClassExpression) {
          var wrapper = express('(function(){})()').expression;
          wrapper.arguments.push(superClass);
          var body = wrapper.callee.body.body;
          var returnStatement = new nodes.ReturnStatement({ argument: extendExpression.expression });
          body.push(constructorFunction);
          body.push(returnStatement);
          node.parentNode.replaceChild(node, wrapper);
          superClass = getUniqueId(wrapper, 'Super' + upper(constructorFunction.id.name));
          wrapper.callee.params.push(superClass.clone());
        } else {
          node.parentNode.replaceChild(node, constructorFunction);
          insertAfter(constructorFunction, extendExpression);
        }
        args.push(superClass, constructorFunction.id.clone(), prototype);
        if (members.properties.length) {
          args.push(members);
        }
      });
    };
  },
  '../../../node_modules/harmonizer/transform/rest-param.js': function (require, module, exports, global) {
    'use strict';
    var callExpressionA = require('../../../node_modules/harmonizer/util/slice.js');
    var getSliceId = callExpressionA.getSliceId;
    var callExpression = require('../../../node_modules/harmonizer/util/string.js');
    var express = callExpression.express;
    exports.default = function restify(program) {
      program.search('#Function[rest!=null]').forEach(function (node) {
        var block = node.body.body;
        var length = node.params.length;
        var sliceId = getSliceId(program).clone();
        var declaration = express('var ' + node.rest.name + ' = ' + sliceId.name + '.call(arguments, ' + length + ')');
        node.rest = null;
        block.unshift(declaration);
      });
    };
  },
  '../../../node_modules/harmonizer/transform/spread.js': function (require, module, exports, global) {
    'use strict';
    var spreadA = function () {
      var array = [], last = arguments.length - 1;
      for (var i = 0; i < last; i++)
        array.push(arguments[i]);
      var iterator = arguments[last]['@@iterator'](), step;
      while (!(step = iterator.next()).done)
        array.push(step.value);
      return array;
    };
    var callExpressionD = require('../../../node_modules/nodes/index.js');
    var nodes = callExpressionD.nodes, syntax = callExpressionD.syntax;
    var callExpressionC = require('../../../node_modules/harmonizer/util/spread.js');
    var getSpreadId = callExpressionC.getSpreadId;
    var callExpressionB = require('../../../node_modules/harmonizer/util/string.js');
    var express = callExpressionB.express, lower = callExpressionB.lower;
    var callExpressionA = require('../../../node_modules/harmonizer/util/id.js');
    var getUniqueId = callExpressionA.getUniqueId;
    var callExpression = require('../../../node_modules/harmonizer/util/iterators.js');
    var values = callExpression.values;
    var applyContext = function (node, context) {
      var memberExpression;
      var args = node.arguments;
      var spread = args[args.length - 1];
      var isSpread = spread && spread.type === syntax.SpreadElement;
      if (!context && !isSpread) {
        return;
      }
      var propertyName;
      if (isSpread) {
        args.replaceChild(spread, spread.argument);
        var spreadId = getSpreadId(node.root).clone();
        var spreadCall = express(spreadId.name + '()').expression;
        (memberExpression = spreadCall.arguments).push.apply(memberExpression, spreadA(values(args)));
        args.push(spreadCall);
        propertyName = 'apply';
      } else {
        propertyName = 'call';
      }
      var callee = node.callee;
      var object = callee.object;
      if (!context) {
        if (callee.type !== syntax.MemberExpression) {
          args.unshift(new nodes.Literal({ value: null }));
        } else {
          if (object.type !== syntax.Identifier) {
            var scope = node.scope();
            var contextId = getUniqueId(scope, lower(object.type));
            var body = nodes.Function.test(scope) ? scope.body.body : scope.body;
            var declaration = express('var ' + contextId.name);
            body.unshift(declaration);
            callee.object = new nodes.AssignmentExpression({
              left: contextId.clone(),
              operator: '=',
              right: object
            });
            object = contextId;
          }
          args.unshift(object.clone());
        }
      } else {
        args.unshift(context);
      }
      node.callee = new nodes.MemberExpression({
        object: node.callee,
        property: new nodes.Identifier({ name: propertyName })
      });
    };
    exports.applyContext = applyContext;
    exports.default = function spreadify(program) {
      program.search('#SpreadElement < arguments < #CallExpression').forEach(function (node) {
        applyContext(node);
      });
      program.search('#SpreadElement < elements < #ArrayExpression').forEach(function (node) {
        var memberExpression;
        var elements = node.elements;
        var spread = elements[elements.length - 1];
        elements.replaceChild(spread, spread.argument);
        var spreadId = getSpreadId(program).clone();
        var spreadCall = express(spreadId.name + '()').expression;
        (memberExpression = spreadCall.arguments).push.apply(memberExpression, spreadA(values(elements)));
        node.parentNode.replaceChild(node, spreadCall);
      });
    };
  },
  '../../../node_modules/harmonizer/transform/template-literals.js': function (require, module, exports, global) {
    'use strict';
    var callExpression = require('../../../node_modules/nodes/index.js');
    var nodes = callExpression.nodes;
    exports.default = function templateify(program) {
      program.search('#TemplateLiteral').forEach(function (node) {
        var parts = [];
        var stringFound;
        node.quasis.forEach(function (quasi, i) {
          var cooked = quasi.value.cooked;
          if (cooked) {
            stringFound = true;
            parts.push(new nodes.Literal({ value: quasi.value.cooked }));
          }
          if (i in node.expressions) {
            parts.push(node.expressions[i]);
          }
        });
        if (!stringFound) {
          parts.push(new nodes.Literal({ value: '' }));
        }
        if (parts.length === 1) {
          node.parentNode.replaceChild(node, parts[0]);
          return;
        }
        var bin = new nodes.BinaryExpression({
            operator: '+',
            left: parts.shift(),
            right: parts.pop()
          });
        parts.reduceRight(function (bin, part) {
          return bin.left = new nodes.BinaryExpression({
            operator: '+',
            left: bin.left,
            right: part
          });
        }, bin);
        node.parentNode.replaceChild(node, bin);
      });
    };
  },
  '../../../node_modules/harmonizer/transform/let-declarations.js': function (require, module, exports, global) {
    'use strict';
    var callExpressionA = require('../../../node_modules/nodes/index.js');
    var syntax = callExpressionA.syntax;
    var callExpression = require('../../../node_modules/harmonizer/util/id.js');
    var getUniqueName = callExpression.getUniqueName;
    var isFor = function (node) {
      var type;
      return node && (type = node.type) && (type === syntax.ForStatement || type === syntax.ForInStatement || type === syntax.ForOfStatement);
    };
    var lookupReferenceLetDeclarators = function (node) {
      var name = node.name;
      var identifiers;
      var dec = '#VariableDeclaration[kind=let] #Identifier:declaration[name=' + name + ']';
      while (node = node.parentNode) {
        if (isFor(node) || node.type === syntax.BlockStatement || node.type === syntax.Program) {
          identifiers = node.search('~> ' + dec);
          if (identifiers.length) {
            var ancestor = node.parentNode;
            if (isFor(ancestor)) {
              node = ancestor;
            }
            return [
              node,
              identifiers
            ];
          }
        }
      }
    };
    exports.default = function letify(program) {
      var lets = program.search('#VariableDeclaration[kind=let]');
      if (!lets.length) {
        return;
      }
      var uniqueNameMap = {};
      program.search(':reference').forEach(function (ref) {
        var result = lookupReferenceLetDeclarators(ref);
        if (!result) {
          return;
        }
        var block = result[0], identifiers = result[1];
        var map = uniqueNameMap[block.uid] || (uniqueNameMap[block.uid] = {});
        var scope = block === program ? block : block.scope();
        var name = ref.name;
        identifiers.forEach(function (dec) {
          var uniqueName = map[name] || (map[name] = getUniqueName(scope, name));
          dec.var_name = uniqueName;
        });
        ref.name = map[name];
      });
      lets.forEach(function (node) {
        node.kind = 'var';
      });
      lets.search('#Identifier:declaration').forEach(function (node) {
        if (node.var_name) {
          node.name = node.var_name;
          delete node.var_name;
        } else {
          var uniqueName = getUniqueName(node.scope(), node.name);
          node.name = uniqueName;
        }
      });
    };
  },
  '../../../node_modules/harmonizer/transform/modules.js': function (require, module, exports, global) {
    'use strict';
    var callExpressionB = require('../../../node_modules/nodes/index.js');
    var nodes = callExpressionB.nodes, syntax = callExpressionB.syntax;
    var callExpressionA = require('../../../node_modules/harmonizer/util/string.js');
    var express = callExpressionA.express;
    var callExpression = require('../../../node_modules/harmonizer/util/insertion.js');
    var insertBefore = callExpression.insertBefore;
    exports.default = function modulize(program) {
      program.search('#ExportDeclaration').forEach(function (node) {
        var statement, sequence;
        if (node.default) {
          statement = express('exports.default = $');
          statement.expression.right = node.declaration;
        } else {
          if (node.declaration) {
            var declaration = node.declaration;
            insertBefore(node, declaration);
            var declarationType = declaration.type;
            if (declarationType === syntax.VariableDeclaration) {
              statement = new nodes.ExpressionStatement();
              sequence = new nodes.SequenceExpression();
              statement.expression = sequence;
              declaration.declarations.forEach(function (declarator) {
                var assignment = express('exports.' + declarator.id.name + ' = ' + declarator.id.name).expression;
                sequence.expressions.push(assignment);
              });
            } else {
              if (declarationType === syntax.FunctionDeclaration || declarationType === syntax.ClassDeclaration) {
                var name = declaration.id.name;
                statement = express('exports.' + name + ' = ' + name);
              }
            }
          } else {
            var specifiers = node.specifiers;
            statement = new nodes.ExpressionStatement();
            sequence = new nodes.SequenceExpression();
            statement.expression = sequence;
            specifiers.forEach(function (specifier) {
              var specifierId = specifier.id;
              var specifierName = specifier.name || specifierId;
              var assignment = express('exports.' + specifierName.name + ' = ' + specifierId.name).expression;
              sequence.expressions.push(assignment);
            });
          }
        }
        node.parentNode.replaceChild(node, statement);
      });
      program.search('#ImportDeclaration').forEach(function (node) {
        if (!node.specifiers.length) {
          var requireExpression = express('require()');
          requireExpression.expression.arguments.push(node.source);
          node.parentNode.replaceChild(node, requireExpression);
        } else {
          if (node.kind === 'default') {
            var specifierName = node.specifiers[0].id.name;
            var requireDeclaration = express('var ' + specifierName + ' = require().default');
            requireDeclaration.declarations[0].init.object.arguments.push(node.source);
            node.parentNode.replaceChild(node, requireDeclaration);
          } else {
            var patternDeclaration = express('var {} = require()');
            var declarator = patternDeclaration.declarations[0];
            var pattern = declarator.id;
            declarator.init.arguments.push(node.source);
            node.specifiers.forEach(function (specifier) {
              var specifierId = specifier.id;
              var specifierName = specifier.name;
              pattern.properties.push(new nodes.Property({
                key: specifierId,
                value: specifierName || specifierId.clone()
              }));
            });
            node.parentNode.replaceChild(node, patternDeclaration);
          }
        }
      });
      program.search('#ModuleDeclaration').forEach(function (node) {
        var requireDeclaration = express('var ' + node.id.name + ' = require()');
        requireDeclaration.declarations[0].init.arguments.push(node.source);
        node.parentNode.replaceChild(node, requireDeclaration);
      });
    };
  },
  '../../../node_modules/prime/defer.js': function (require, module, exports, global) {
    'use strict';
    var kindOf = require('../../../node_modules/mout/lang/kindOf.js'), now = require('../../../node_modules/mout/time/now.js'), forEach = require('../../../node_modules/mout/array/forEach.js'), indexOf = require('../../../node_modules/mout/array/indexOf.js');
    var callbacks = {
        timeout: {},
        frame: [],
        immediate: []
      };
    var push = function (collection, callback, context, defer) {
      var iterator = function () {
        iterate(collection);
      };
      if (!collection.length)
        defer(iterator);
      var entry = {
          callback: callback,
          context: context
        };
      collection.push(entry);
      return function () {
        var io = indexOf(collection, entry);
        if (io > -1)
          collection.splice(io, 1);
      };
    };
    var iterate = function (collection) {
      var time = now();
      forEach(collection.splice(0), function (entry) {
        entry.callback.call(entry.context, time);
      });
    };
    var defer = function (callback, argument, context) {
      return kindOf(argument) === 'Number' ? defer.timeout(callback, argument, context) : defer.immediate(callback, argument);
    };
    if (global.process && process.nextTick) {
      defer.immediate = function (callback, context) {
        return push(callbacks.immediate, callback, context, process.nextTick);
      };
    } else if (global.setImmediate) {
      defer.immediate = function (callback, context) {
        return push(callbacks.immediate, callback, context, setImmediate);
      };
    } else if (global.postMessage && global.addEventListener) {
      addEventListener('message', function (event) {
        if (event.source === global && event.data === '@deferred') {
          event.stopPropagation();
          iterate(callbacks.immediate);
        }
      }, true);
      defer.immediate = function (callback, context) {
        return push(callbacks.immediate, callback, context, function () {
          postMessage('@deferred', '*');
        });
      };
    } else {
      defer.immediate = function (callback, context) {
        return push(callbacks.immediate, callback, context, function (iterator) {
          setTimeout(iterator, 0);
        });
      };
    }
    var requestAnimationFrame = global.requestAnimationFrame || global.webkitRequestAnimationFrame || global.mozRequestAnimationFrame || global.oRequestAnimationFrame || global.msRequestAnimationFrame || function (callback) {
        setTimeout(callback, 1000 / 60);
      };
    defer.frame = function (callback, context) {
      return push(callbacks.frame, callback, context, requestAnimationFrame);
    };
    var clear;
    defer.timeout = function (callback, ms, context) {
      var ct = callbacks.timeout;
      if (!clear)
        clear = defer.immediate(function () {
          clear = null;
          callbacks.timeout = {};
        });
      return push(ct[ms] || (ct[ms] = []), callback, context, function (iterator) {
        setTimeout(iterator, ms);
      });
    };
    module.exports = defer;
  },
  '../../../node_modules/mout/lang/isInteger.js': function (require, module, exports, global) {
    var isNumber = require('../../../node_modules/mout/lang/isNumber.js');
    function isInteger(val) {
      return isNumber(val) && val % 1 === 0;
    }
    module.exports = isInteger;
  },
  '../../../node_modules/mout/array/slice.js': function (require, module, exports, global) {
    function slice(arr, start, end) {
      var len = arr.length;
      if (start == null) {
        start = 0;
      } else if (start < 0) {
        start = Math.max(len + start, 0);
      } else {
        start = Math.min(start, len);
      }
      if (end == null) {
        end = len;
      } else if (end < 0) {
        end = Math.max(len + end, 0);
      } else {
        end = Math.min(end, len);
      }
      var result = [];
      while (start < end) {
        result.push(arr[start++]);
      }
      return result;
    }
    module.exports = slice;
  },
  '../../../node_modules/harmonizer/util/arguments.js': function (require, module, exports, global) {
    'use strict';
    var callExpressionB = require('../../../node_modules/harmonizer/util/id.js');
    var getUniqueName = callExpressionB.getUniqueName;
    var callExpressionA = require('../../../node_modules/harmonizer/util/string.js');
    var express = callExpressionA.express;
    var callExpression = require('../../../node_modules/harmonizer/util/insertion.js');
    var insertAfterStrict = callExpression.insertAfterStrict;
    var getArgumentsId = function (node) {
      if (!node.argumentsId) {
        var argumentsName = getUniqueName(node, '_arguments');
        var declaration = express('var ' + argumentsName + ' = arguments');
        insertAfterStrict(node, declaration);
        node.argumentsId = declaration.declarations[0].id;
      }
      return node.argumentsId;
    };
    exports.getArgumentsId = getArgumentsId;
  },
  '../../../node_modules/harmonizer/util/self.js': function (require, module, exports, global) {
    'use strict';
    var callExpressionB = require('../../../node_modules/harmonizer/util/id.js');
    var getUniqueName = callExpressionB.getUniqueName;
    var callExpressionA = require('../../../node_modules/harmonizer/util/string.js');
    var express = callExpressionA.express;
    var callExpression = require('../../../node_modules/harmonizer/util/insertion.js');
    var insertAfterStrict = callExpression.insertAfterStrict;
    var getSelfId = function (node) {
      if (!node.selfId) {
        var selfName = getUniqueName(node, 'self');
        var declaration = express('var ' + selfName + ' = this');
        insertAfterStrict(node, declaration);
        node.selfId = declaration.declarations[0].id;
      }
      return node.selfId;
    };
    exports.getSelfId = getSelfId;
  },
  '../../../node_modules/harmonizer/util/string.js': function (require, module, exports, global) {
    'use strict';
    var callExpressionA = require('../../../node_modules/nodes/index.js');
    var build = callExpressionA.build;
    var callExpression = require('../../../node_modules/esprima/esprima.js');
    var parse = callExpression.parse;
    var express = function (string) {
      return build(parse(string).body[0]);
    };
    exports.express = express;
    var upper = function (string) {
      return string.replace(/^[a-z]/, function (a) {
        return a.toUpperCase();
      });
    };
    exports.upper = upper;
    var lower = function (string) {
      return string.replace(/^[A-Z]/, function (a) {
        return a.toLowerCase();
      });
    };
    exports.lower = lower;
  },
  '../../../node_modules/harmonizer/util/id.js': function (require, module, exports, global) {
    'use strict';
    var callExpression = require('../../../node_modules/nodes/index.js');
    var nodes = callExpression.nodes;
    var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var letter = function (i) {
      if (i <= 25) {
        return letters[i];
      }
      return letter(Math.floor(i / 26) - 1) + letters[i % 26];
    };
    var getUniqueName = function (node, name) {
      var names = node.search('#Identifier:declaration > name, #Identifier:reference > name');
      var preferred = name, i = 0;
      while (~names.indexOf(name)) {
        name = preferred + letter(i++) + '';
      }
      return name;
    };
    exports.getUniqueName = getUniqueName;
    var getUniqueId = function (node, name) {
      name = getUniqueName(node, name);
      return new nodes.Identifier({ name: name });
    };
    exports.getUniqueId = getUniqueId;
  },
  '../../../node_modules/harmonizer/util/insertion.js': function (require, module, exports, global) {
    'use strict';
    var callExpression = require('../../../node_modules/nodes/index.js');
    var nodes = callExpression.nodes, lists = callExpression.lists;
    var List = lists.List;
    var listIndex = function (node) {
      var lastNode = node, firstList;
      while (node = node.parentNode) {
        if (node instanceof List) {
          firstList = node;
          break;
        } else {
          lastNode = node;
        }
      }
      if (!firstList) {
        throw new Error('parent list not found');
      }
      return {
        list: firstList,
        index: firstList.indexOf(lastNode)
      };
    };
    var insertBefore = function (node, node2) {
      var li = listIndex(node);
      li.list.splice(li.index, 0, node2);
      return node2;
    };
    exports.insertBefore = insertBefore;
    var insertAfter = function (node, node2) {
      var li = listIndex(node);
      li.list.splice(li.index + 1, 0, node2);
      return node2;
    };
    exports.insertAfter = insertAfter;
    var insertAfterStrict = function (parentNode, node) {
      var body = nodes.Function.test(parentNode) ? parentNode.body.body : parentNode.body;
      var firstChild = body[0];
      if (firstChild && firstChild.matches('#ExpressionStatement > expression#Literal[value=use strict] < *')) {
        body.splice(1, 0, node);
      } else {
        body.unshift(node);
      }
      return node;
    };
    exports.insertAfterStrict = insertAfterStrict;
  },
  '../../../node_modules/harmonizer/util/extend.js': function (require, module, exports, global) {
    'use strict';
    var callExpressionB = require('../../../node_modules/harmonizer/util/id.js');
    var getUniqueName = callExpressionB.getUniqueName;
    var callExpressionA = require('../../../node_modules/harmonizer/util/string.js');
    var express = callExpressionA.express;
    var callExpression = require('../../../node_modules/harmonizer/util/insertion.js');
    var insertAfterStrict = callExpression.insertAfterStrict;
    var extend = 'function (SuperClass, Class, prototype, members) {\n  var descriptors = function(object) {\n    var base = {}, descriptor;\n    for (var key in object) {\n      descriptor = Object.getOwnPropertyDescriptor(object, key);\n      if (!(\'get\' in descriptor) && !(\'set\' in descriptor)) {\n        descriptor.enumerable = false;\n      }\n      base[key] = descriptor;\n    }\n    return base;\n  };\n\n  if (SuperClass) Class.__proto__ = SuperClass;\n  Object.defineProperty(Class, \'prototype\', {\n    value: Object.create(SuperClass === null ? null : SuperClass.prototype, descriptors(prototype))\n  });\n\n  Object.defineProperty(Class.prototype, \'constructor\', { value: Class });\n\n  if (members) Object.defineProperties(Class, descriptors(members));\n  return Class;\n}';
    var getExtendId = function (node) {
      if (!node.extendId) {
        var extendName = getUniqueName(node, 'extend');
        var declaration = express('var ' + extendName + ' = ' + extend);
        insertAfterStrict(node, declaration);
        node.extendId = declaration.declarations[0].id;
      }
      return node.extendId;
    };
    exports.getExtendId = getExtendId;
  },
  '../../../node_modules/harmonizer/util/slice.js': function (require, module, exports, global) {
    'use strict';
    var callExpressionB = require('../../../node_modules/harmonizer/util/id.js');
    var getUniqueName = callExpressionB.getUniqueName;
    var callExpressionA = require('../../../node_modules/harmonizer/util/string.js');
    var express = callExpressionA.express;
    var callExpression = require('../../../node_modules/harmonizer/util/insertion.js');
    var insertAfterStrict = callExpression.insertAfterStrict;
    var getSliceId = function (node) {
      if (!node.sliceId) {
        var sliceName = getUniqueName(node, 'slice');
        var declaration = express('var ' + sliceName + ' = Array.prototype.slice');
        insertAfterStrict(node, declaration);
        node.sliceId = declaration.declarations[0].id;
      }
      return node.sliceId;
    };
    exports.getSliceId = getSliceId;
  },
  '../../../node_modules/harmonizer/util/spread.js': function (require, module, exports, global) {
    'use strict';
    var callExpressionB = require('../../../node_modules/harmonizer/util/id.js');
    var getUniqueName = callExpressionB.getUniqueName;
    var callExpressionA = require('../../../node_modules/harmonizer/util/string.js');
    var express = callExpressionA.express;
    var callExpression = require('../../../node_modules/harmonizer/util/insertion.js');
    var insertAfterStrict = callExpression.insertAfterStrict;
    var spread = 'function() {\n  var array = [], last = arguments.length - 1;\n  for (var i = 0; i < last; i++) array.push(arguments[i]);\n  var iterator = arguments[last][\'@@iterator\'](), step;\n  while (!(step = iterator.next()).done) array.push(step.value);\n  return array;\n}';
    var getSpreadId = function (node) {
      if (!node.spreadId) {
        var spreadName = getUniqueName(node, 'spread');
        var declaration = express('var ' + spreadName + ' = ' + spread);
        insertAfterStrict(node, declaration);
        node.spreadId = declaration.declarations[0].id;
      }
      return node.spreadId;
    };
    exports.getSpreadId = getSpreadId;
  },
  '../../../node_modules/escodegen/node_modules/esutils/lib/utils.js': function (require, module, exports, global) {
    (function () {
      'use strict';
      exports.code = require('../../../node_modules/escodegen/node_modules/esutils/lib/code.js');
      exports.keyword = require('../../../node_modules/escodegen/node_modules/esutils/lib/keyword.js');
    }());
  },
  '../../../node_modules/nodes/index.js': function (require, module, exports, global) {
    'use strict';
    require('../../../node_modules/nodes/lib/finder.js');
    var types = require('../../../node_modules/nodes/types.js');
    var factory = require('../../../node_modules/nodes/lib/factory.js');
    var syntax = require('../../../node_modules/nodes/syntax.json');
    var build = factory.build;
    var lists = factory.lists;
    exports.default = exports.build = build;
    exports.syntax = syntax;
    exports.nodes = types;
    exports.lists = lists;
  },
  '../../../node_modules/estraverse/estraverse.js': function (require, module, exports, global) {
    (function (root, factory) {
      'use strict';
      if (typeof define === 'function' && define.amd) {
        define(['exports'], factory);
      } else if (typeof exports !== 'undefined') {
        factory(exports);
      } else {
        factory(root.estraverse = {});
      }
    }(this, function (exports) {
      'use strict';
      var Syntax, isArray, VisitorOption, VisitorKeys, BREAK, SKIP;
      Syntax = {
        AssignmentExpression: 'AssignmentExpression',
        ArrayExpression: 'ArrayExpression',
        ArrayPattern: 'ArrayPattern',
        ArrowFunctionExpression: 'ArrowFunctionExpression',
        BlockStatement: 'BlockStatement',
        BinaryExpression: 'BinaryExpression',
        BreakStatement: 'BreakStatement',
        CallExpression: 'CallExpression',
        CatchClause: 'CatchClause',
        ClassBody: 'ClassBody',
        ClassDeclaration: 'ClassDeclaration',
        ClassExpression: 'ClassExpression',
        ConditionalExpression: 'ConditionalExpression',
        ContinueStatement: 'ContinueStatement',
        DebuggerStatement: 'DebuggerStatement',
        DirectiveStatement: 'DirectiveStatement',
        DoWhileStatement: 'DoWhileStatement',
        EmptyStatement: 'EmptyStatement',
        ExpressionStatement: 'ExpressionStatement',
        ForStatement: 'ForStatement',
        ForInStatement: 'ForInStatement',
        FunctionDeclaration: 'FunctionDeclaration',
        FunctionExpression: 'FunctionExpression',
        Identifier: 'Identifier',
        IfStatement: 'IfStatement',
        Literal: 'Literal',
        LabeledStatement: 'LabeledStatement',
        LogicalExpression: 'LogicalExpression',
        MemberExpression: 'MemberExpression',
        MethodDefinition: 'MethodDefinition',
        NewExpression: 'NewExpression',
        ObjectExpression: 'ObjectExpression',
        ObjectPattern: 'ObjectPattern',
        Program: 'Program',
        Property: 'Property',
        ReturnStatement: 'ReturnStatement',
        SequenceExpression: 'SequenceExpression',
        SwitchStatement: 'SwitchStatement',
        SwitchCase: 'SwitchCase',
        ThisExpression: 'ThisExpression',
        ThrowStatement: 'ThrowStatement',
        TryStatement: 'TryStatement',
        UnaryExpression: 'UnaryExpression',
        UpdateExpression: 'UpdateExpression',
        VariableDeclaration: 'VariableDeclaration',
        VariableDeclarator: 'VariableDeclarator',
        WhileStatement: 'WhileStatement',
        WithStatement: 'WithStatement',
        YieldExpression: 'YieldExpression'
      };
      function ignoreJSHintError() {
      }
      isArray = Array.isArray;
      if (!isArray) {
        isArray = function isArray(array) {
          return Object.prototype.toString.call(array) === '[object Array]';
        };
      }
      function deepCopy(obj) {
        var ret = {}, key, val;
        for (key in obj) {
          if (obj.hasOwnProperty(key)) {
            val = obj[key];
            if (typeof val === 'object' && val !== null) {
              ret[key] = deepCopy(val);
            } else {
              ret[key] = val;
            }
          }
        }
        return ret;
      }
      function shallowCopy(obj) {
        var ret = {}, key;
        for (key in obj) {
          if (obj.hasOwnProperty(key)) {
            ret[key] = obj[key];
          }
        }
        return ret;
      }
      ignoreJSHintError(shallowCopy);
      function upperBound(array, func) {
        var diff, len, i, current;
        len = array.length;
        i = 0;
        while (len) {
          diff = len >>> 1;
          current = i + diff;
          if (func(array[current])) {
            len = diff;
          } else {
            i = current + 1;
            len -= diff + 1;
          }
        }
        return i;
      }
      function lowerBound(array, func) {
        var diff, len, i, current;
        len = array.length;
        i = 0;
        while (len) {
          diff = len >>> 1;
          current = i + diff;
          if (func(array[current])) {
            i = current + 1;
            len -= diff + 1;
          } else {
            len = diff;
          }
        }
        return i;
      }
      ignoreJSHintError(lowerBound);
      VisitorKeys = {
        AssignmentExpression: [
          'left',
          'right'
        ],
        ArrayExpression: ['elements'],
        ArrayPattern: ['elements'],
        ArrowFunctionExpression: [
          'params',
          'defaults',
          'rest',
          'body'
        ],
        BlockStatement: ['body'],
        BinaryExpression: [
          'left',
          'right'
        ],
        BreakStatement: ['label'],
        CallExpression: [
          'callee',
          'arguments'
        ],
        CatchClause: [
          'param',
          'body'
        ],
        ClassBody: ['body'],
        ClassDeclaration: [
          'id',
          'body',
          'superClass'
        ],
        ClassExpression: [
          'id',
          'body',
          'superClass'
        ],
        ConditionalExpression: [
          'test',
          'consequent',
          'alternate'
        ],
        ContinueStatement: ['label'],
        DebuggerStatement: [],
        DirectiveStatement: [],
        DoWhileStatement: [
          'body',
          'test'
        ],
        EmptyStatement: [],
        ExpressionStatement: ['expression'],
        ForStatement: [
          'init',
          'test',
          'update',
          'body'
        ],
        ForInStatement: [
          'left',
          'right',
          'body'
        ],
        FunctionDeclaration: [
          'id',
          'params',
          'defaults',
          'rest',
          'body'
        ],
        FunctionExpression: [
          'id',
          'params',
          'defaults',
          'rest',
          'body'
        ],
        Identifier: [],
        IfStatement: [
          'test',
          'consequent',
          'alternate'
        ],
        Literal: [],
        LabeledStatement: [
          'label',
          'body'
        ],
        LogicalExpression: [
          'left',
          'right'
        ],
        MemberExpression: [
          'object',
          'property'
        ],
        MethodDefinition: [
          'key',
          'value'
        ],
        NewExpression: [
          'callee',
          'arguments'
        ],
        ObjectExpression: ['properties'],
        ObjectPattern: ['properties'],
        Program: ['body'],
        Property: [
          'key',
          'value'
        ],
        ReturnStatement: ['argument'],
        SequenceExpression: ['expressions'],
        SwitchStatement: [
          'discriminant',
          'cases'
        ],
        SwitchCase: [
          'test',
          'consequent'
        ],
        ThisExpression: [],
        ThrowStatement: ['argument'],
        TryStatement: [
          'block',
          'handlers',
          'handler',
          'guardedHandlers',
          'finalizer'
        ],
        UnaryExpression: ['argument'],
        UpdateExpression: ['argument'],
        VariableDeclaration: ['declarations'],
        VariableDeclarator: [
          'id',
          'init'
        ],
        WhileStatement: [
          'test',
          'body'
        ],
        WithStatement: [
          'object',
          'body'
        ],
        YieldExpression: ['argument']
      };
      BREAK = {};
      SKIP = {};
      VisitorOption = {
        Break: BREAK,
        Skip: SKIP
      };
      function Reference(parent, key) {
        this.parent = parent;
        this.key = key;
      }
      Reference.prototype.replace = function replace(node) {
        this.parent[this.key] = node;
      };
      function Element(node, path, wrap, ref) {
        this.node = node;
        this.path = path;
        this.wrap = wrap;
        this.ref = ref;
      }
      function Controller() {
      }
      Controller.prototype.path = function path() {
        var i, iz, j, jz, result, element;
        function addToPath(result, path) {
          if (isArray(path)) {
            for (j = 0, jz = path.length; j < jz; ++j) {
              result.push(path[j]);
            }
          } else {
            result.push(path);
          }
        }
        if (!this.__current.path) {
          return null;
        }
        result = [];
        for (i = 2, iz = this.__leavelist.length; i < iz; ++i) {
          element = this.__leavelist[i];
          addToPath(result, element.path);
        }
        addToPath(result, this.__current.path);
        return result;
      };
      Controller.prototype.parents = function parents() {
        var i, iz, result;
        result = [];
        for (i = 1, iz = this.__leavelist.length; i < iz; ++i) {
          result.push(this.__leavelist[i].node);
        }
        return result;
      };
      Controller.prototype.current = function current() {
        return this.__current.node;
      };
      Controller.prototype.__execute = function __execute(callback, element) {
        var previous, result;
        result = undefined;
        previous = this.__current;
        this.__current = element;
        this.__state = null;
        if (callback) {
          result = callback.call(this, element.node, this.__leavelist[this.__leavelist.length - 1].node);
        }
        this.__current = previous;
        return result;
      };
      Controller.prototype.notify = function notify(flag) {
        this.__state = flag;
      };
      Controller.prototype.skip = function () {
        this.notify(SKIP);
      };
      Controller.prototype['break'] = function () {
        this.notify(BREAK);
      };
      Controller.prototype.__initialize = function (root, visitor) {
        this.visitor = visitor;
        this.root = root;
        this.__worklist = [];
        this.__leavelist = [];
        this.__current = null;
        this.__state = null;
      };
      Controller.prototype.traverse = function traverse(root, visitor) {
        var worklist, leavelist, element, node, nodeType, ret, key, current, current2, candidates, candidate, sentinel;
        this.__initialize(root, visitor);
        sentinel = {};
        worklist = this.__worklist;
        leavelist = this.__leavelist;
        worklist.push(new Element(root, null, null, null));
        leavelist.push(new Element(null, null, null, null));
        while (worklist.length) {
          element = worklist.pop();
          if (element === sentinel) {
            element = leavelist.pop();
            ret = this.__execute(visitor.leave, element);
            if (this.__state === BREAK || ret === BREAK) {
              return;
            }
            continue;
          }
          if (element.node) {
            ret = this.__execute(visitor.enter, element);
            if (this.__state === BREAK || ret === BREAK) {
              return;
            }
            worklist.push(sentinel);
            leavelist.push(element);
            if (this.__state === SKIP || ret === SKIP) {
              continue;
            }
            node = element.node;
            nodeType = element.wrap || node.type;
            candidates = VisitorKeys[nodeType];
            current = candidates.length;
            while ((current -= 1) >= 0) {
              key = candidates[current];
              candidate = node[key];
              if (!candidate) {
                continue;
              }
              if (!isArray(candidate)) {
                worklist.push(new Element(candidate, key, null, null));
                continue;
              }
              current2 = candidate.length;
              while ((current2 -= 1) >= 0) {
                if (!candidate[current2]) {
                  continue;
                }
                if ((nodeType === Syntax.ObjectExpression || nodeType === Syntax.ObjectPattern) && 'properties' === candidates[current]) {
                  element = new Element(candidate[current2], [
                    key,
                    current2
                  ], 'Property', null);
                } else {
                  element = new Element(candidate[current2], [
                    key,
                    current2
                  ], null, null);
                }
                worklist.push(element);
              }
            }
          }
        }
      };
      Controller.prototype.replace = function replace(root, visitor) {
        var worklist, leavelist, node, nodeType, target, element, current, current2, candidates, candidate, sentinel, outer, key;
        this.__initialize(root, visitor);
        sentinel = {};
        worklist = this.__worklist;
        leavelist = this.__leavelist;
        outer = { root: root };
        element = new Element(root, null, null, new Reference(outer, 'root'));
        worklist.push(element);
        leavelist.push(element);
        while (worklist.length) {
          element = worklist.pop();
          if (element === sentinel) {
            element = leavelist.pop();
            target = this.__execute(visitor.leave, element);
            if (target !== undefined && target !== BREAK && target !== SKIP) {
              element.ref.replace(target);
            }
            if (this.__state === BREAK || target === BREAK) {
              return outer.root;
            }
            continue;
          }
          target = this.__execute(visitor.enter, element);
          if (target !== undefined && target !== BREAK && target !== SKIP) {
            element.ref.replace(target);
            element.node = target;
          }
          if (this.__state === BREAK || target === BREAK) {
            return outer.root;
          }
          node = element.node;
          if (!node) {
            continue;
          }
          worklist.push(sentinel);
          leavelist.push(element);
          if (this.__state === SKIP || target === SKIP) {
            continue;
          }
          nodeType = element.wrap || node.type;
          candidates = VisitorKeys[nodeType];
          current = candidates.length;
          while ((current -= 1) >= 0) {
            key = candidates[current];
            candidate = node[key];
            if (!candidate) {
              continue;
            }
            if (!isArray(candidate)) {
              worklist.push(new Element(candidate, key, null, new Reference(node, key)));
              continue;
            }
            current2 = candidate.length;
            while ((current2 -= 1) >= 0) {
              if (!candidate[current2]) {
                continue;
              }
              if (nodeType === Syntax.ObjectExpression && 'properties' === candidates[current]) {
                element = new Element(candidate[current2], [
                  key,
                  current2
                ], 'Property', new Reference(candidate, current2));
              } else {
                element = new Element(candidate[current2], [
                  key,
                  current2
                ], null, new Reference(candidate, current2));
              }
              worklist.push(element);
            }
          }
        }
        return outer.root;
      };
      function traverse(root, visitor) {
        var controller = new Controller();
        return controller.traverse(root, visitor);
      }
      function replace(root, visitor) {
        var controller = new Controller();
        return controller.replace(root, visitor);
      }
      function extendCommentRange(comment, tokens) {
        var target;
        target = upperBound(tokens, function search(token) {
          return token.range[0] > comment.range[0];
        });
        comment.extendedRange = [
          comment.range[0],
          comment.range[1]
        ];
        if (target !== tokens.length) {
          comment.extendedRange[1] = tokens[target].range[0];
        }
        target -= 1;
        if (target >= 0) {
          comment.extendedRange[0] = tokens[target].range[1];
        }
        return comment;
      }
      function attachComments(tree, providedComments, tokens) {
        var comments = [], comment, len, i, cursor;
        if (!tree.range) {
          throw new Error('attachComments needs range information');
        }
        if (!tokens.length) {
          if (providedComments.length) {
            for (i = 0, len = providedComments.length; i < len; i += 1) {
              comment = deepCopy(providedComments[i]);
              comment.extendedRange = [
                0,
                tree.range[0]
              ];
              comments.push(comment);
            }
            tree.leadingComments = comments;
          }
          return tree;
        }
        for (i = 0, len = providedComments.length; i < len; i += 1) {
          comments.push(extendCommentRange(deepCopy(providedComments[i]), tokens));
        }
        cursor = 0;
        traverse(tree, {
          enter: function (node) {
            var comment;
            while (cursor < comments.length) {
              comment = comments[cursor];
              if (comment.extendedRange[1] > node.range[0]) {
                break;
              }
              if (comment.extendedRange[1] === node.range[0]) {
                if (!node.leadingComments) {
                  node.leadingComments = [];
                }
                node.leadingComments.push(comment);
                comments.splice(cursor, 1);
              } else {
                cursor += 1;
              }
            }
            if (cursor === comments.length) {
              return VisitorOption.Break;
            }
            if (comments[cursor].extendedRange[0] > node.range[1]) {
              return VisitorOption.Skip;
            }
          }
        });
        cursor = 0;
        traverse(tree, {
          leave: function (node) {
            var comment;
            while (cursor < comments.length) {
              comment = comments[cursor];
              if (node.range[1] < comment.extendedRange[0]) {
                break;
              }
              if (node.range[1] === comment.extendedRange[0]) {
                if (!node.trailingComments) {
                  node.trailingComments = [];
                }
                node.trailingComments.push(comment);
                comments.splice(cursor, 1);
              } else {
                cursor += 1;
              }
            }
            if (cursor === comments.length) {
              return VisitorOption.Break;
            }
            if (comments[cursor].extendedRange[0] > node.range[1]) {
              return VisitorOption.Skip;
            }
          }
        });
        return tree;
      }
      exports.version = '1.3.3-dev';
      exports.Syntax = Syntax;
      exports.traverse = traverse;
      exports.replace = replace;
      exports.attachComments = attachComments;
      exports.VisitorKeys = VisitorKeys;
      exports.VisitorOption = VisitorOption;
      exports.Controller = Controller;
    }));
  },
  '../../../node_modules/prime/emitter.js': function (require, module, exports, global) {
    'use strict';
    var indexOf = require('../../../node_modules/mout/array/indexOf.js'), forEach = require('../../../node_modules/mout/array/forEach.js');
    var prime = require('../../../node_modules/prime/index.js'), defer = require('../../../node_modules/prime/defer.js');
    var slice = Array.prototype.slice;
    var Emitter = prime({
        constructor: function (stoppable) {
          this._stoppable = stoppable;
        },
        on: function (event, fn) {
          var listeners = this._listeners || (this._listeners = {}), events = listeners[event] || (listeners[event] = []);
          if (indexOf(events, fn) === -1)
            events.push(fn);
          return this;
        },
        off: function (event, fn) {
          var listeners = this._listeners, events;
          if (listeners && (events = listeners[event])) {
            var io = indexOf(events, fn);
            if (io > -1)
              events.splice(io, 1);
            if (!events.length)
              delete listeners[event];
            for (var l in listeners)
              return this;
            delete this._listeners;
          }
          return this;
        },
        emit: function (event) {
          var self = this, args = slice.call(arguments, 1);
          var emit = function () {
            var listeners = self._listeners, events;
            if (listeners && (events = listeners[event])) {
              forEach(events.slice(0), function (event) {
                var result = event.apply(self, args);
                if (self._stoppable)
                  return result;
              });
            }
          };
          if (args[args.length - 1] === Emitter.EMIT_SYNC) {
            args.pop();
            emit();
          } else {
            defer(emit);
          }
          return this;
        }
      });
    Emitter.EMIT_SYNC = {};
    module.exports = Emitter;
  },
  '../../../node_modules/prime/map.js': function (require, module, exports, global) {
    'use strict';
    var indexOf = require('../../../node_modules/mout/array/indexOf.js');
    var prime = require('../../../node_modules/prime/index.js');
    var Map = prime({
        constructor: function Map() {
          this.length = 0;
          this._values = [];
          this._keys = [];
        },
        set: function (key, value) {
          var index = indexOf(this._keys, key);
          if (index === -1) {
            this._keys.push(key);
            this._values.push(value);
            this.length++;
          } else {
            this._values[index] = value;
          }
          return this;
        },
        get: function (key) {
          var index = indexOf(this._keys, key);
          return index === -1 ? null : this._values[index];
        },
        count: function () {
          return this.length;
        },
        forEach: function (method, context) {
          for (var i = 0, l = this.length; i < l; i++) {
            if (method.call(context, this._values[i], this._keys[i], this) === false)
              break;
          }
          return this;
        },
        map: function (method, context) {
          var results = new Map();
          this.forEach(function (value, key) {
            results.set(key, method.call(context, value, key, this));
          }, this);
          return results;
        },
        filter: function (method, context) {
          var results = new Map();
          this.forEach(function (value, key) {
            if (method.call(context, value, key, this))
              results.set(key, value);
          }, this);
          return results;
        },
        every: function (method, context) {
          var every = true;
          this.forEach(function (value, key) {
            if (!method.call(context, value, key, this))
              return every = false;
          }, this);
          return every;
        },
        some: function (method, context) {
          var some = false;
          this.forEach(function (value, key) {
            if (method.call(context, value, key, this))
              return !(some = true);
          }, this);
          return some;
        },
        indexOf: function (value) {
          var index = indexOf(this._values, value);
          return index > -1 ? this._keys[index] : null;
        },
        remove: function (value) {
          var index = indexOf(this._values, value);
          if (index !== -1) {
            this._values.splice(index, 1);
            this.length--;
            return this._keys.splice(index, 1)[0];
          }
          return null;
        },
        unset: function (key) {
          var index = indexOf(this._keys, key);
          if (index !== -1) {
            this._keys.splice(index, 1);
            this.length--;
            return this._values.splice(index, 1)[0];
          }
          return null;
        },
        keys: function () {
          return this._keys.slice();
        },
        values: function () {
          return this._values.slice();
        }
      });
    var map = function () {
      return new Map();
    };
    map.prototype = Map.prototype;
    module.exports = map;
  },
  '../../../node_modules/prime/index.js': function (require, module, exports, global) {
    'use strict';
    var hasOwn = require('../../../node_modules/mout/object/hasOwn.js'), mixIn = require('../../../node_modules/mout/object/mixIn.js'), create = require('../../../node_modules/mout/lang/createObject.js'), kindOf = require('../../../node_modules/mout/lang/kindOf.js');
    var hasDescriptors = true;
    try {
      Object.defineProperty({}, '~', {});
      Object.getOwnPropertyDescriptor({}, '~');
    } catch (e) {
      hasDescriptors = false;
    }
    var hasEnumBug = !{ valueOf: 0 }.propertyIsEnumerable('valueOf'), buggy = [
        'toString',
        'valueOf'
      ];
    var verbs = /^constructor|inherits|mixin$/;
    var implement = function (proto) {
      var prototype = this.prototype;
      for (var key in proto) {
        if (key.match(verbs))
          continue;
        if (hasDescriptors) {
          var descriptor = Object.getOwnPropertyDescriptor(proto, key);
          if (descriptor) {
            Object.defineProperty(prototype, key, descriptor);
            continue;
          }
        }
        prototype[key] = proto[key];
      }
      if (hasEnumBug)
        for (var i = 0; key = buggy[i]; i++) {
          var value = proto[key];
          if (value !== Object.prototype[key])
            prototype[key] = value;
        }
      return this;
    };
    var prime = function (proto) {
      if (kindOf(proto) === 'Function')
        proto = { constructor: proto };
      var superprime = proto.inherits;
      var constructor = hasOwn(proto, 'constructor') ? proto.constructor : superprime ? function () {
          return superprime.apply(this, arguments);
        } : function () {
        };
      if (superprime) {
        mixIn(constructor, superprime);
        var superproto = superprime.prototype;
        var cproto = constructor.prototype = create(superproto);
        constructor.parent = superproto;
        cproto.constructor = constructor;
      }
      if (!constructor.implement)
        constructor.implement = implement;
      var mixins = proto.mixin;
      if (mixins) {
        if (kindOf(mixins) !== 'Array')
          mixins = [mixins];
        for (var i = 0; i < mixins.length; i++)
          constructor.implement(create(mixins[i].prototype));
      }
      return constructor.implement(proto);
    };
    module.exports = prime;
  },
  '../../../node_modules/mout/array/forEach.js': function (require, module, exports, global) {
    function forEach(arr, callback, thisObj) {
      if (arr == null) {
        return;
      }
      var i = -1, len = arr.length;
      while (++i < len) {
        if (callback.call(thisObj, arr[i], i, arr) === false) {
          break;
        }
      }
    }
    module.exports = forEach;
  },
  '../../../node_modules/mout/array/map.js': function (require, module, exports, global) {
    var makeIterator = require('../../../node_modules/mout/function/makeIterator_.js');
    function map(arr, callback, thisObj) {
      callback = makeIterator(callback, thisObj);
      var results = [];
      if (arr == null) {
        return results;
      }
      var i = -1, len = arr.length;
      while (++i < len) {
        results[i] = callback(arr[i], i, arr);
      }
      return results;
    }
    module.exports = map;
  },
  '../../../node_modules/mout/array/filter.js': function (require, module, exports, global) {
    var makeIterator = require('../../../node_modules/mout/function/makeIterator_.js');
    function filter(arr, callback, thisObj) {
      callback = makeIterator(callback, thisObj);
      var results = [];
      if (arr == null) {
        return results;
      }
      var i = -1, len = arr.length, value;
      while (++i < len) {
        value = arr[i];
        if (callback(value, i, arr)) {
          results.push(value);
        }
      }
      return results;
    }
    module.exports = filter;
  },
  '../../../node_modules/mout/array/every.js': function (require, module, exports, global) {
    var makeIterator = require('../../../node_modules/mout/function/makeIterator_.js');
    function every(arr, callback, thisObj) {
      callback = makeIterator(callback, thisObj);
      var result = true;
      if (arr == null) {
        return result;
      }
      var i = -1, len = arr.length;
      while (++i < len) {
        if (!callback(arr[i], i, arr)) {
          result = false;
          break;
        }
      }
      return result;
    }
    module.exports = every;
  },
  '../../../node_modules/mout/array/some.js': function (require, module, exports, global) {
    var makeIterator = require('../../../node_modules/mout/function/makeIterator_.js');
    function some(arr, callback, thisObj) {
      callback = makeIterator(callback, thisObj);
      var result = false;
      if (arr == null) {
        return result;
      }
      var i = -1, len = arr.length;
      while (++i < len) {
        if (callback(arr[i], i, arr)) {
          result = true;
          break;
        }
      }
      return result;
    }
    module.exports = some;
  },
  '../../../node_modules/mout/array/indexOf.js': function (require, module, exports, global) {
    function indexOf(arr, item, fromIndex) {
      fromIndex = fromIndex || 0;
      if (arr == null) {
        return -1;
      }
      var len = arr.length, i = fromIndex < 0 ? len + fromIndex : fromIndex;
      while (i < len) {
        if (arr[i] === item) {
          return i;
        }
        i++;
      }
      return -1;
    }
    module.exports = indexOf;
  },
  '../../../node_modules/mout/lang/kindOf.js': function (require, module, exports, global) {
    var _rKind = /^\[object (.*)\]$/, _toString = Object.prototype.toString, UNDEF;
    function kindOf(val) {
      if (val === null) {
        return 'Null';
      } else if (val === UNDEF) {
        return 'Undefined';
      } else {
        return _rKind.exec(_toString.call(val))[1];
      }
    }
    module.exports = kindOf;
  },
  '../../../node_modules/mout/lang/isNumber.js': function (require, module, exports, global) {
    var isKind = require('../../../node_modules/mout/lang/isKind.js');
    function isNumber(val) {
      return isKind(val, 'Number');
    }
    module.exports = isNumber;
  },
  '../../../node_modules/source-map/lib/source-map.js': function (require, module, exports, global) {
    exports.SourceMapGenerator = require('../../../node_modules/source-map/lib/source-map/source-map-generator.js').SourceMapGenerator;
    exports.SourceMapConsumer = require('../../../node_modules/source-map/lib/source-map/source-map-consumer.js').SourceMapConsumer;
    exports.SourceNode = require('../../../node_modules/source-map/lib/source-map/source-node.js').SourceNode;
  },
  '../../../node_modules/mout/string/trim.js': function (require, module, exports, global) {
    var toString = require('../../../node_modules/mout/lang/toString.js');
    var WHITE_SPACES = require('../../../node_modules/mout/string/WHITE_SPACES.js');
    var ltrim = require('../../../node_modules/mout/string/ltrim.js');
    var rtrim = require('../../../node_modules/mout/string/rtrim.js');
    function trim(str, chars) {
      str = toString(str);
      chars = chars || WHITE_SPACES;
      return ltrim(rtrim(str, chars), chars);
    }
    module.exports = trim;
  },
  '../../../node_modules/mout/time/now.js': function (require, module, exports, global) {
    function now() {
      return now.get();
    }
    now.get = typeof Date.now === 'function' ? Date.now : function () {
      return +new Date();
    };
    module.exports = now;
  },
  '../../../node_modules/nodes/types.js': function (require, module, exports, global) {
    'use strict';
    var syntax = require('../../../node_modules/nodes/syntax.json');
    var typeOf = require('../../../node_modules/nodes/util/type-of.js');
    var factory = require('../../../node_modules/nodes/lib/factory.js');
    var Node = factory.Node;
    var string = { test: typeOf.String };
    var boolean = { test: typeOf.Boolean };
    var number = { test: typeOf.Number };
    var regexp = { test: typeOf.RegExp };
    var object = { test: typeOf.Object };
    var expect = factory.expect;
    var types = factory.types;
    var describe = factory.describe;
    var Statement = describe(Node, { type: 'Statement' });
    var Program = describe(Node, {
        type: syntax.Program,
        body: [Statement]
      });
    var EmptyStatement = describe(Statement, { type: syntax.EmptyStatement });
    var BlockStatement = describe(Statement, {
        type: syntax.BlockStatement,
        body: [Statement]
      });
    var Expression = describe(Node, { type: 'Expression' });
    var ExpressionStatement = describe(Statement, {
        type: syntax.ExpressionStatement,
        expression: Expression
      });
    var Identifier = describe(Expression, {
        type: syntax.Identifier,
        name: string
      });
    var Pattern = types.Pattern = {
        test: function (item) {
          return item instanceof Identifier || item instanceof ArrayPattern || item instanceof ObjectPattern;
        }
      };
    var ArrayPattern = describe(Node, {
        type: syntax.ArrayPattern,
        elements: [
          Pattern,
          null
        ]
      });
    var Literal = describe(Expression, {
        type: syntax.Literal,
        value: expect(string, boolean, null, number, regexp),
        raw: expect(string, null).default(null)
      });
    var Property = describe(Node, {
        type: syntax.Property,
        key: expect(Literal, Identifier),
        value: expect(Pattern, Expression),
        kind: /^(init|get|set)$/,
        shorthand: expect(boolean).default(false),
        method: expect(boolean).default(false)
      });
    var ObjectPattern = describe(Node, {
        type: syntax.ObjectPattern,
        properties: [
          Property,
          {
            test: function (item) {
              return Pattern.test(item.value);
            }
          }
        ]
      });
    var Declaration = describe(Statement, { type: 'Declaration' });
    var VariableDeclarator = describe(Node, {
        type: syntax.VariableDeclarator,
        id: Pattern,
        init: expect(Expression, null).default(null)
      });
    var VariableDeclaration = describe(Declaration, {
        type: syntax.VariableDeclaration,
        declarations: [VariableDeclarator],
        kind: expect(/^(var|let|const)$/).default('var')
      });
    var FunctionDeclaration = describe(Declaration, {
        type: syntax.FunctionDeclaration,
        id: expect(Identifier, null).default(null),
        params: [Pattern],
        defaults: [
          Expression,
          null
        ],
        rest: expect(Identifier, null).default(null),
        body: expect(BlockStatement, Expression),
        generator: expect(boolean).default(false),
        expression: expect(boolean).default(false)
      });
    var FunctionExpression = describe(Expression, {
        type: syntax.FunctionExpression,
        id: expect(Identifier, null).default(null),
        params: [Pattern],
        defaults: [
          Expression,
          null
        ],
        rest: expect(Identifier, null).default(null),
        body: expect(BlockStatement, Expression),
        generator: expect(boolean).default(false),
        expression: expect(boolean).default(false)
      });
    var CallExpression = describe(Expression, {
        type: syntax.CallExpression,
        callee: Expression,
        arguments: [Expression]
      });
    var MemberExpression = describe(Expression, {
        type: syntax.MemberExpression,
        object: Expression,
        property: Expression,
        computed: expect(boolean).default(false)
      });
    var UnaryOperator = /^(\-|\+|\!|\~|typeof|void|delete)$/;
    var UnaryExpression = describe(Expression, {
        type: syntax.UnaryExpression,
        operator: UnaryOperator,
        prefix: boolean,
        argument: Expression
      });
    var IfStatement = describe(Statement, {
        type: syntax.IfStatement,
        test: Expression,
        consequent: Statement,
        alternate: expect(Statement, null).default(null)
      });
    var BinaryOperator = /^(==|!=|===|!==|<|<=|>|>=|<<|>>|>>>|\+|-|\*|\/|\%|\||\^|\&|in|instanceof|\.\.)$/;
    var BinaryExpression = describe(Expression, {
        type: syntax.BinaryExpression,
        operator: BinaryOperator,
        left: Expression,
        right: Expression
      });
    var ReturnStatement = describe(Statement, {
        type: syntax.ReturnStatement,
        argument: expect(Expression, null).default(null)
      });
    var AssignmentOperator = /^(=|\+=|-=|\*|\/=|%=|<<=|>>=|>>>=|\|=|\^=|&=)$/;
    var AssignmentExpression = describe(Expression, {
        type: syntax.AssignmentExpression,
        operator: AssignmentOperator,
        left: expect(Pattern, Expression),
        right: Expression
      });
    var ForStatement = describe(Statement, {
        type: syntax.ForStatement,
        init: expect(VariableDeclaration, Expression, null).default(null),
        test: expect(Expression, null).default(null),
        update: expect(Expression, null).default(null),
        body: Statement
      });
    var UpdateOperator = /^(\+\+|--)$/;
    var UpdateExpression = describe(Expression, {
        type: syntax.UpdateExpression,
        operator: UpdateOperator,
        argument: Expression,
        prefix: boolean
      });
    var ThisExpression = describe(Expression, { type: syntax.ThisExpression });
    var ArrayExpression = describe(Expression, {
        type: syntax.ArrayExpression,
        elements: [
          Expression,
          null
        ]
      });
    var ObjectExpression = describe(Expression, {
        type: syntax.ObjectExpression,
        properties: [Property]
      });
    var SequenceExpression = describe(Expression, {
        type: syntax.SequenceExpression,
        expressions: [Expression]
      });
    var ThrowStatement = describe(Statement, {
        type: syntax.ThrowStatement,
        argument: Expression
      });
    var CatchClause = describe(Node, {
        type: syntax.CatchClause,
        param: Pattern,
        guard: expect(Expression, null),
        body: BlockStatement
      });
    var WhileStatement = describe(Statement, {
        type: syntax.WhileStatement,
        test: Expression,
        body: Statement
      });
    var NewExpression = describe(Expression, {
        type: syntax.NewExpression,
        callee: Expression,
        arguments: [Expression]
      });
    var LogicalOperator = /^(\|\||&&)$/;
    var LogicalExpression = describe(Expression, {
        type: syntax.LogicalExpression,
        operator: LogicalOperator,
        left: Expression,
        right: Expression
      });
    var ConditionalExpression = describe(Expression, {
        type: syntax.ConditionalExpression,
        test: Expression,
        alternate: Expression,
        consequent: Expression
      });
    var ForInStatement = describe(Statement, {
        type: syntax.ForInStatement,
        left: expect(VariableDeclaration, Pattern, MemberExpression),
        right: Expression,
        body: Statement,
        each: expect(boolean).default(false)
      });
    var ContinueStatement = describe(Statement, {
        type: syntax.ContinueStatement,
        label: expect(Identifier, null).default(null)
      });
    var DoWhileStatement = describe(Statement, {
        type: syntax.DoWhileStatement,
        body: Statement,
        test: Expression
      });
    var BreakStatement = describe(Statement, {
        type: syntax.BreakStatement,
        label: expect(Identifier, null).default(null)
      });
    var SwitchCase = describe(Node, {
        type: syntax.SwitchCase,
        test: expect(Expression, null).default(null),
        consequent: [Statement]
      });
    var SwitchStatement = describe(Statement, {
        type: syntax.SwitchStatement,
        discriminant: Expression,
        cases: [SwitchCase],
        lexical: expect(boolean).default(false)
      });
    var ForOfStatement = describe(Statement, {
        type: syntax.ForOfStatement,
        left: expect(VariableDeclaration, Pattern, MemberExpression),
        right: Expression,
        body: Statement
      });
    var ComprehensionBlock = describe(Node, {
        type: syntax.ComprehensionBlock,
        left: Pattern,
        right: Expression,
        each: expect(boolean).default(false),
        of: expect(boolean).default(true)
      });
    var YieldExpression = describe(Expression, {
        type: syntax.YieldExpression,
        argument: expect(Expression, null).default(null)
      });
    var ComprehensionExpression = describe(Expression, {
        type: syntax.ComprehensionExpression,
        body: Expression,
        blocks: [ComprehensionBlock],
        filter: expect(Expression, null).default(null)
      });
    var TryStatement = describe(Statement, {
        type: syntax.TryStatement,
        block: BlockStatement,
        handlers: [CatchClause],
        guardedHandlers: [CatchClause],
        finalizer: expect(BlockStatement, null).default(null)
      });
    var LabeledStatement = describe(Statement, {
        type: syntax.LabeledStatement,
        label: Identifier,
        body: Statement
      });
    var WithStatement = describe(Statement, {
        type: syntax.WithStatement,
        object: Expression,
        body: Statement
      });
    var DebuggerStatement = describe(Statement, { type: syntax.DebuggerStatement });
    var ArrowFunctionExpression = describe(Expression, {
        type: syntax.ArrowFunctionExpression,
        params: [Pattern],
        defaults: [
          Expression,
          null
        ],
        rest: expect(Identifier, null).default(null),
        body: expect(BlockStatement, Expression),
        expression: expect(boolean).default(false)
      });
    var Function = types.Function = {
        test: function (item) {
          return item instanceof FunctionExpression || item instanceof FunctionDeclaration || item instanceof ArrowFunctionExpression;
        }
      };
    var MethodDefinition = describe(Node, {
        type: syntax.MethodDefinition,
        key: Identifier,
        value: FunctionExpression,
        kind: expect(string).default(''),
        static: expect(boolean).default(false)
      });
    var ClassBody = describe(Expression, {
        type: syntax.ClassBody,
        body: [MethodDefinition]
      });
    var ClassDeclaration = describe(Declaration, {
        type: syntax.ClassDeclaration,
        id: expect(Identifier, null).default(null),
        superClass: expect(Expression, null).default(null),
        body: ClassBody
      });
    var ClassExpression = describe(Expression, {
        type: syntax.ClassExpression,
        id: expect(Identifier, null).default(null),
        superClass: expect(Expression, null).default(null),
        body: ClassBody
      });
    var Class = types.Class = expect(ClassExpression, ClassDeclaration);
    var SpreadElement = describe(Expression, {
        type: syntax.SpreadElement,
        argument: Expression
      });
    var TemplateElement = describe(Node, {
        type: syntax.TemplateElement,
        value: object,
        tail: boolean
      });
    var TemplateLiteral = describe(Expression, {
        type: syntax.TemplateLiteral,
        quasis: [TemplateElement],
        expressions: [Expression]
      });
    var ModuleDeclaration = describe(Declaration, {
        type: syntax.ModuleDeclaration,
        id: Identifier,
        source: Literal
      });
    var ImportSpecifier = describe(Expression, {
        type: syntax.ImportSpecifier,
        id: Identifier,
        name: expect(Identifier, null).default(null)
      });
    var ExportSpecifier = describe(Expression, {
        type: syntax.ExportSpecifier,
        id: Identifier,
        name: expect(Identifier, null).default(null)
      });
    var ImportDeclaration = describe(Declaration, {
        type: syntax.ImportDeclaration,
        specifiers: [ImportSpecifier],
        kind: /^(named|default)$/,
        source: Literal
      });
    var ExportDeclaration = describe(Declaration, {
        type: syntax.ExportDeclaration,
        declaration: expect(Declaration, Expression, null).default(null),
        specifiers: [ExportSpecifier],
        default: expect(boolean).default(false)
      });
    module.exports = types;
  },
  '../../../node_modules/nodes/syntax.json': function (require, module, exports, global) {
    module.exports = {
      'ArrayExpression': 'ArrayExpression',
      'ArrayPattern': 'ArrayPattern',
      'ArrowFunctionExpression': 'ArrowFunctionExpression',
      'AssignmentExpression': 'AssignmentExpression',
      'BinaryExpression': 'BinaryExpression',
      'BlockStatement': 'BlockStatement',
      'BreakStatement': 'BreakStatement',
      'CallExpression': 'CallExpression',
      'CatchClause': 'CatchClause',
      'ClassBody': 'ClassBody',
      'ClassDeclaration': 'ClassDeclaration',
      'ClassExpression': 'ClassExpression',
      'ComprehensionBlock': 'ComprehensionBlock',
      'ComprehensionExpression': 'ComprehensionExpression',
      'ConditionalExpression': 'ConditionalExpression',
      'ContinueStatement': 'ContinueStatement',
      'DebuggerStatement': 'DebuggerStatement',
      'DoWhileStatement': 'DoWhileStatement',
      'EmptyStatement': 'EmptyStatement',
      'ExportDeclaration': 'ExportDeclaration',
      'ExportBatchSpecifier': 'ExportBatchSpecifier',
      'ExportSpecifier': 'ExportSpecifier',
      'ExpressionStatement': 'ExpressionStatement',
      'ForInStatement': 'ForInStatement',
      'ForOfStatement': 'ForOfStatement',
      'ForStatement': 'ForStatement',
      'FunctionDeclaration': 'FunctionDeclaration',
      'FunctionExpression': 'FunctionExpression',
      'Identifier': 'Identifier',
      'IfStatement': 'IfStatement',
      'ImportDeclaration': 'ImportDeclaration',
      'ImportSpecifier': 'ImportSpecifier',
      'LabeledStatement': 'LabeledStatement',
      'Literal': 'Literal',
      'LogicalExpression': 'LogicalExpression',
      'MemberExpression': 'MemberExpression',
      'MethodDefinition': 'MethodDefinition',
      'ModuleDeclaration': 'ModuleDeclaration',
      'NewExpression': 'NewExpression',
      'ObjectExpression': 'ObjectExpression',
      'ObjectPattern': 'ObjectPattern',
      'Program': 'Program',
      'Property': 'Property',
      'ReturnStatement': 'ReturnStatement',
      'SequenceExpression': 'SequenceExpression',
      'SpreadElement': 'SpreadElement',
      'SwitchCase': 'SwitchCase',
      'SwitchStatement': 'SwitchStatement',
      'TaggedTemplateExpression': 'TaggedTemplateExpression',
      'TemplateElement': 'TemplateElement',
      'TemplateLiteral': 'TemplateLiteral',
      'ThisExpression': 'ThisExpression',
      'ThrowStatement': 'ThrowStatement',
      'TryStatement': 'TryStatement',
      'UnaryExpression': 'UnaryExpression',
      'UpdateExpression': 'UpdateExpression',
      'VariableDeclaration': 'VariableDeclaration',
      'VariableDeclarator': 'VariableDeclarator',
      'WhileStatement': 'WhileStatement',
      'WithStatement': 'WithStatement',
      'YieldExpression': 'YieldExpression'
    };
  },
  '../../../node_modules/escodegen/node_modules/esutils/lib/code.js': function (require, module, exports, global) {
    (function () {
      'use strict';
      var Regex;
      Regex = {
        NonAsciiIdentifierStart: new RegExp('[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0\u08A2-\u08AC\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097F\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C33\u0C35-\u0C39\u0C3D\u0C58\u0C59\u0C60\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D60\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F0\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191C\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19C1-\u19C7\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA697\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA793\uA7A0-\uA7AA\uA7F8-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA80-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uABC0-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]'),
        NonAsciiIdentifierPart: new RegExp('[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0300-\u0374\u0376\u0377\u037A-\u037D\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u0483-\u0487\u048A-\u0527\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u05D0-\u05EA\u05F0-\u05F2\u0610-\u061A\u0620-\u0669\u066E-\u06D3\u06D5-\u06DC\u06DF-\u06E8\u06EA-\u06FC\u06FF\u0710-\u074A\u074D-\u07B1\u07C0-\u07F5\u07FA\u0800-\u082D\u0840-\u085B\u08A0\u08A2-\u08AC\u08E4-\u08FE\u0900-\u0963\u0966-\u096F\u0971-\u0977\u0979-\u097F\u0981-\u0983\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BC-\u09C4\u09C7\u09C8\u09CB-\u09CE\u09D7\u09DC\u09DD\u09DF-\u09E3\u09E6-\u09F1\u0A01-\u0A03\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A59-\u0A5C\u0A5E\u0A66-\u0A75\u0A81-\u0A83\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABC-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AD0\u0AE0-\u0AE3\u0AE6-\u0AEF\u0B01-\u0B03\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3C-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B5C\u0B5D\u0B5F-\u0B63\u0B66-\u0B6F\u0B71\u0B82\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD0\u0BD7\u0BE6-\u0BEF\u0C01-\u0C03\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C33\u0C35-\u0C39\u0C3D-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C58\u0C59\u0C60-\u0C63\u0C66-\u0C6F\u0C82\u0C83\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBC-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CDE\u0CE0-\u0CE3\u0CE6-\u0CEF\u0CF1\u0CF2\u0D02\u0D03\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D-\u0D44\u0D46-\u0D48\u0D4A-\u0D4E\u0D57\u0D60-\u0D63\u0D66-\u0D6F\u0D7A-\u0D7F\u0D82\u0D83\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DF2\u0DF3\u0E01-\u0E3A\u0E40-\u0E4E\u0E50-\u0E59\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB9\u0EBB-\u0EBD\u0EC0-\u0EC4\u0EC6\u0EC8-\u0ECD\u0ED0-\u0ED9\u0EDC-\u0EDF\u0F00\u0F18\u0F19\u0F20-\u0F29\u0F35\u0F37\u0F39\u0F3E-\u0F47\u0F49-\u0F6C\u0F71-\u0F84\u0F86-\u0F97\u0F99-\u0FBC\u0FC6\u1000-\u1049\u1050-\u109D\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u135D-\u135F\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F0\u1700-\u170C\u170E-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176C\u176E-\u1770\u1772\u1773\u1780-\u17D3\u17D7\u17DC\u17DD\u17E0-\u17E9\u180B-\u180D\u1810-\u1819\u1820-\u1877\u1880-\u18AA\u18B0-\u18F5\u1900-\u191C\u1920-\u192B\u1930-\u193B\u1946-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19D9\u1A00-\u1A1B\u1A20-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AA7\u1B00-\u1B4B\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1BF3\u1C00-\u1C37\u1C40-\u1C49\u1C4D-\u1C7D\u1CD0-\u1CD2\u1CD4-\u1CF6\u1D00-\u1DE6\u1DFC-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u200C\u200D\u203F\u2040\u2054\u2071\u207F\u2090-\u209C\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D7F-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2DE0-\u2DFF\u2E2F\u3005-\u3007\u3021-\u302F\u3031-\u3035\u3038-\u303C\u3041-\u3096\u3099\u309A\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA62B\uA640-\uA66F\uA674-\uA67D\uA67F-\uA697\uA69F-\uA6F1\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA793\uA7A0-\uA7AA\uA7F8-\uA827\uA840-\uA873\uA880-\uA8C4\uA8D0-\uA8D9\uA8E0-\uA8F7\uA8FB\uA900-\uA92D\uA930-\uA953\uA960-\uA97C\uA980-\uA9C0\uA9CF-\uA9D9\uAA00-\uAA36\uAA40-\uAA4D\uAA50-\uAA59\uAA60-\uAA76\uAA7A\uAA7B\uAA80-\uAAC2\uAADB-\uAADD\uAAE0-\uAAEF\uAAF2-\uAAF6\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uABC0-\uABEA\uABEC\uABED\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE00-\uFE0F\uFE20-\uFE26\uFE33\uFE34\uFE4D-\uFE4F\uFE70-\uFE74\uFE76-\uFEFC\uFF10-\uFF19\uFF21-\uFF3A\uFF3F\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]')
      };
      function isDecimalDigit(ch) {
        return ch >= 48 && ch <= 57;
      }
      function isHexDigit(ch) {
        return isDecimalDigit(ch) || 97 <= ch && ch <= 102 || 65 <= ch && ch <= 70;
      }
      function isOctalDigit(ch) {
        return ch >= 48 && ch <= 55;
      }
      function isWhiteSpace(ch) {
        return ch === 32 || ch === 9 || ch === 11 || ch === 12 || ch === 160 || ch >= 5760 && [
          5760,
          6158,
          8192,
          8193,
          8194,
          8195,
          8196,
          8197,
          8198,
          8199,
          8200,
          8201,
          8202,
          8239,
          8287,
          12288,
          65279
        ].indexOf(ch) >= 0;
      }
      function isLineTerminator(ch) {
        return ch === 10 || ch === 13 || ch === 8232 || ch === 8233;
      }
      function isIdentifierStart(ch) {
        return ch === 36 || ch === 95 || ch >= 65 && ch <= 90 || ch >= 97 && ch <= 122 || ch === 92 || ch >= 128 && Regex.NonAsciiIdentifierStart.test(String.fromCharCode(ch));
      }
      function isIdentifierPart(ch) {
        return ch === 36 || ch === 95 || ch >= 65 && ch <= 90 || ch >= 97 && ch <= 122 || ch >= 48 && ch <= 57 || ch === 92 || ch >= 128 && Regex.NonAsciiIdentifierPart.test(String.fromCharCode(ch));
      }
      module.exports = {
        isDecimalDigit: isDecimalDigit,
        isHexDigit: isHexDigit,
        isOctalDigit: isOctalDigit,
        isWhiteSpace: isWhiteSpace,
        isLineTerminator: isLineTerminator,
        isIdentifierStart: isIdentifierStart,
        isIdentifierPart: isIdentifierPart
      };
    }());
  },
  '../../../node_modules/escodegen/node_modules/esutils/lib/keyword.js': function (require, module, exports, global) {
    (function () {
      'use strict';
      var code = require('../../../node_modules/escodegen/node_modules/esutils/lib/code.js');
      function isStrictModeReservedWordES6(id) {
        switch (id) {
        case 'implements':
        case 'interface':
        case 'package':
        case 'private':
        case 'protected':
        case 'public':
        case 'static':
        case 'let':
          return true;
        default:
          return false;
        }
      }
      function isKeywordES5(id, strict) {
        if (!strict && id === 'yield') {
          return false;
        }
        return isKeywordES6(id, strict);
      }
      function isKeywordES6(id, strict) {
        if (strict && isStrictModeReservedWordES6(id)) {
          return true;
        }
        switch (id.length) {
        case 2:
          return id === 'if' || id === 'in' || id === 'do';
        case 3:
          return id === 'var' || id === 'for' || id === 'new' || id === 'try';
        case 4:
          return id === 'this' || id === 'else' || id === 'case' || id === 'void' || id === 'with' || id === 'enum';
        case 5:
          return id === 'while' || id === 'break' || id === 'catch' || id === 'throw' || id === 'const' || id === 'yield' || id === 'class' || id === 'super';
        case 6:
          return id === 'return' || id === 'typeof' || id === 'delete' || id === 'switch' || id === 'export' || id === 'import';
        case 7:
          return id === 'default' || id === 'finally' || id === 'extends';
        case 8:
          return id === 'function' || id === 'continue' || id === 'debugger';
        case 10:
          return id === 'instanceof';
        default:
          return false;
        }
      }
      function isRestrictedWord(id) {
        return id === 'eval' || id === 'arguments';
      }
      function isIdentifierName(id) {
        var i, iz, ch;
        if (id.length === 0) {
          return false;
        }
        ch = id.charCodeAt(0);
        if (!code.isIdentifierStart(ch) || ch === 92) {
          return false;
        }
        for (i = 1, iz = id.length; i < iz; ++i) {
          ch = id.charCodeAt(i);
          if (!code.isIdentifierPart(ch) || ch === 92) {
            return false;
          }
        }
        return true;
      }
      module.exports = {
        isKeywordES5: isKeywordES5,
        isKeywordES6: isKeywordES6,
        isRestrictedWord: isRestrictedWord,
        isIdentifierName: isIdentifierName
      };
    }());
  },
  '../../../node_modules/mout/lang/createObject.js': function (require, module, exports, global) {
    var mixIn = require('../../../node_modules/mout/object/mixIn.js');
    function createObject(parent, props) {
      function F() {
      }
      F.prototype = parent;
      return mixIn(new F(), props);
    }
    module.exports = createObject;
  },
  '../../../node_modules/slick/index.js': function (require, module, exports, global) {
    'use strict';
    module.exports = 'document' in global ? require('../../../node_modules/slick/finder.js') : { parse: require('../../../node_modules/slick/parser.js') };
  },
  '../../../node_modules/nodes/lib/finder.js': function (require, module, exports, global) {
    'use strict';
    var parse = require('../../../node_modules/slick/parser.js');
    var factory = require('../../../node_modules/nodes/lib/factory.js');
    var typeOf = require('../../../node_modules/nodes/util/type-of.js');
    var types = require('../../../node_modules/nodes/types.js');
    var syntax = require('../../../node_modules/nodes/syntax.json');
    var lists = factory.lists;
    var List = factory.List;
    var BaseList = factory.BaseList;
    var Node = factory.Node;
    var d = factory.d;
    var define = Object.defineProperty;
    function normalize(value) {
      if (value !== '' && !isNaN(value))
        return +value;
      else if (value === 'true')
        return true;
      else if (value === 'false')
        return false;
      else if (value === 'null')
        return null;
      else if (value === 'undefined')
        return undefined;
      return value;
    }
    function isPrimitive(value) {
      return /^(Undefined|Null|String|RegExp|Boolean|Number)$/.test(typeOf(value));
    }
    function spliceUnique(list, atIndex, howMany, values) {
      var accepted = [];
      for (var i = 0; i < values.length; i++) {
        var value = values[i];
        if (!~list.indexOf(value))
          accepted.push(value);
      }
      if (accepted.length)
        list.splice.apply(list, [
          atIndex,
          howMany
        ].concat(accepted));
      else if (howMany)
        list.splice(atIndex, howMany);
      return list;
    }
    function partString(part) {
      var partArray = [];
      if (part.combinator !== ' ')
        partArray.push(part.combinator);
      partArray.push(part.toString());
      return partArray.join(' ');
    }
    function matchContextParts(cache, context, parts, index) {
      var part = parts[index++];
      var string = partString(part);
      var uid = context.uid;
      var cacheContext = cache[uid] || (cache[uid] = {});
      var matched;
      var last = parts.length === index;
      if (cacheContext[string]) {
        matched = cacheContext[string];
      } else {
        matched = new BaseList();
        iterators[part.combinator](context, function (node, key) {
          if (match(node, part, key))
            spliceUnique(matched, matched.length, 0, [node]);
        });
        cacheContext[string] = matched;
      }
      if (last)
        return matched;
      var resultSet = new BaseList();
      matched.forEach(function (node) {
        if (isPrimitive(node))
          return false;
        var results = matchContextParts(cache, node, parts, index);
        spliceUnique(resultSet, resultSet.length, 0, results);
      });
      return resultSet;
    }
    function search(context, expression) {
      var found;
      var expressions = parse(expression);
      var matched;
      var lastExpression, firstExpression;
      var cache = {};
      for (var i = 0; i < expressions.length; i++) {
        lastExpression = i === expressions.length - 1;
        firstExpression = i === 0;
        expression = expressions[i];
        matched = matchContextParts(cache, context, expression, 0);
        if (firstExpression)
          found = !lastExpression ? matched.slice() : matched;
        else
          spliceUnique(found, found.length, 0, matched);
      }
      found.forEachRight(function (result, i) {
        if (List.test(result))
          spliceUnique(found, i, 1, result);
      });
      return found;
    }
    function match(node, part, key) {
      var tag = normalize(part.tag);
      if (isPrimitive(node)) {
        if (part.id || part.classList || part.pseudos || part.attributes)
          return false;
        if (tag !== '*' && (key === void 0 || key !== tag))
          return false;
        return true;
      }
      if (tag !== '*') {
        if (key === void 0) {
          var parentNode = node.parentNode;
          if (!parentNode)
            return false;
          key = parentNode.indexOf(node);
        }
        if (key === -1 || key === void 0 || key !== tag)
          return false;
      }
      if (part.id) {
        var NodeClass = types[part.id];
        if (!NodeClass || !NodeClass.test(node))
          return false;
      }
      var i;
      var classList = part.classList;
      if (classList)
        for (i = 0; i < classList.length; i++) {
          var className = classList[i];
          if (!(className in node))
            return false;
        }
      var name, value;
      var attributes = part.attributes;
      if (attributes)
        for (i = 0; i < attributes.length; i++) {
          var attribute = attributes[i];
          var operator = attribute.operator, escaped = attribute.escapedValue;
          name = attribute.name;
          value = normalize(attribute.value);
          if (!operator) {
            if (!(name in node))
              return false;
          } else {
            var actual = node[name];
            if (operator !== '!=' && !isPrimitive(actual))
              return false;
            switch (operator) {
            case '^=':
              if (!new RegExp('^' + escaped).test(actual))
                return false;
              break;
            case '$=':
              if (!new RegExp(escaped + '$').test(actual))
                return false;
              break;
            case '~=':
              if (!new RegExp('(^|\\s)' + escaped + '(\\s|$)').test(actual))
                return false;
              break;
            case '|=':
              if (!new RegExp('^' + escaped + '(-|$)').test(actual))
                return false;
              break;
            case '*=':
              if (actual.indexOf(value) === -1)
                return false;
              break;
            case '!=':
              if (actual === value)
                return false;
              break;
            case '=':
              if (actual !== value)
                return false;
              break;
            default:
              return false;
            }
          }
        }
      var pseudoSelectors = part.pseudos;
      if (pseudoSelectors)
        for (i = 0; i < pseudoSelectors.length; i++) {
          var pseudoSelector = pseudoSelectors[i];
          name = pseudoSelector.name;
          value = pseudoSelector.value;
          var pseudo = pseudos[name];
          if (pseudo && !pseudo(node, value))
            return false;
        }
      return true;
    }
    var iterators = {
        ' ': function (node, visitor) {
          return node.traverse(function (value, key) {
            return visitor.call(node, value, key);
          }, true);
        },
        '~>': function (node, visitor) {
          return node.traverse(function (value, key, skip) {
            if (types.BlockStatement.test(value) || types.ForInStatement.test(value) || types.ForOfStatement.test(value) || types.ForStatement.test(value))
              return skip;
            return visitor.call(node, value, key);
          }, true);
        },
        '=>': function (node, visitor) {
          return node.traverse(function (value, key, skip) {
            if (types.Function.test(value))
              return skip;
            return visitor.call(node, value, key);
          }, true);
        },
        '>>': function (node, visitor) {
          return node.traverse(function (value, key, skip) {
            if (types.Class.test(value))
              return skip;
            return visitor.call(node, value, key);
          }, true);
        },
        '>': function (node, visitor) {
          return node.traverse(function (value, key) {
            return visitor.call(node, value, key);
          });
        },
        '<': function (node, visitor) {
          var parentNode = node.parentNode;
          if (!parentNode)
            return;
          var ancestor = parentNode.parentNode;
          return visitor.call(node, parentNode, ancestor && ancestor.indexOf(parentNode));
        },
        '!': function (node, visitor) {
          var parentNode = node;
          while (parentNode = parentNode.parentNode) {
            var ancestor = parentNode.parentNode;
            var result = visitor.call(node, parentNode, ancestor && ancestor.indexOf(parentNode));
            if (result !== void 0)
              return result;
          }
        }
      };
    var pseudos = {
        reference: function (node, value) {
          if (node.type !== syntax.Identifier)
            return false;
          if (value && node.name !== value)
            return false;
          var parentNode, parent = node;
          while (parent = parent.parentNode) {
            if (Node.test(parent)) {
              parentNode = parent;
              break;
            }
          }
          if (!parentNode)
            return false;
          if (syntax.AssignmentExpression === parentNode.type)
            return parentNode.left === node || parentNode.right === node;
          if (syntax.ArrayExpression === parentNode.type)
            return !!~parentNode.elements.indexOf(node);
          if (syntax.BinaryExpression === parentNode.type)
            return parentNode.left === node || parentNode.right === node;
          if (syntax.CallExpression === parentNode.type)
            return parentNode.callee === node || !!~parentNode.arguments.indexOf(node);
          if (syntax.NewExpression === parentNode.type)
            return parentNode.callee === node || !!~parentNode.arguments.indexOf(node);
          if (syntax.ConditionalExpression === parentNode.type)
            return parentNode.test === node || parentNode.consequent === node || parentNode.alternate === node;
          if (syntax.DoWhileStatement === parentNode.type)
            return parentNode.test === node;
          if (syntax.ExpressionStatement === parentNode.type)
            return parentNode.expression === node;
          if (syntax.ForStatement === parentNode.type)
            return parentNode.init === node || parentNode.test === node || parentNode.update === node;
          if (syntax.ForInStatement === parentNode.type)
            return parentNode.left === node || parentNode.right === node;
          if (syntax.ForOfStatement === parentNode.type)
            return parentNode.left === node || parentNode.right === node;
          if (syntax.IfStatement === parentNode.type)
            return parentNode.right === node;
          if (syntax.LogicalExpression === parentNode.type)
            return parentNode.left === node || parentNode.right === node;
          if (syntax.MemberExpression === parentNode.type)
            return parentNode.object === node || parentNode.computed && parentNode.property === node;
          if (syntax.Property === parentNode.type)
            return parentNode.value === node;
          if (syntax.ReturnStatement === parentNode.type)
            return parentNode.argument === node;
          if (syntax.SequenceExpression === parentNode.type)
            return !!~parentNode.expressions.indexOf(node);
          if (syntax.SwitchStatement === parentNode.type)
            return parentNode.discriminant === node;
          if (syntax.SwitchCase === parentNode.type)
            return parentNode.test === node;
          if (syntax.ThrowStatement === parentNode.type)
            return parentNode.argument === node;
          if (syntax.UnaryExpression === parentNode.type)
            return parentNode.argument === node;
          if (syntax.UpdateExpression === parentNode.type)
            return parentNode.argument === node;
          if (syntax.VariableDeclarator === parentNode.type)
            return parentNode.init === node;
          if (syntax.WhileStatement === parentNode.type)
            return parentNode.test === node;
          if (syntax.WithStatement === parentNode.type)
            return parentNode.object === node;
          return false;
        },
        declaration: function (node, value) {
          if (node.type !== syntax.Identifier)
            return false;
          if (value && node.name !== value)
            return false;
          var parentNode, parent = node;
          while (parent = parent.parentNode) {
            if (Node.test(parent)) {
              parentNode = parent;
              break;
            }
          }
          if (!parentNode)
            return false;
          if (syntax.FunctionDeclaration === parentNode.type) {
            if (parentNode.id === node)
              return true;
          }
          if (types.Function.test(parentNode)) {
            if (parentNode.rest === node)
              return true;
            if (~parentNode.params.indexOf(node))
              return true;
            if (~parentNode.defaults.indexOf(node))
              return true;
          }
          if (syntax.VariableDeclarator === parentNode.type) {
            return parentNode.id === node;
          }
          if (syntax.ArrayPattern === parentNode.type) {
            return !!~parentNode.elements.indexOf(node);
          }
          if (syntax.Property === parentNode.type && lists.ObjectPatternProperties.test(parentNode.parentNode)) {
            return parentNode.value === node;
          }
          return false;
        },
        scope: function (node) {
          return node.type === syntax.Program || types.Function.test(node);
        }
      };
    var searchMe = d(function (expression) {
        return search(this, expression);
      });
    var parentMe = d(function (expression) {
        var parent = this;
        while (parent = parent.parentNode) {
          if (!expression || parent.matches(expression))
            return parent;
        }
      });
    var scopeMe = d(function (expression) {
        var parentNode = this.parentNode;
        if (!parentNode)
          return;
        if (syntax.Identifier === this.type && syntax.FunctionDeclaration === parentNode.type && parentNode.id === this) {
          return parentNode.scope(expression);
        }
        var parent = this;
        while (parent = parent.parentNode) {
          if (pseudos.scope(parent) && (!expression || parent.matches(expression)))
            return parent;
        }
      });
    var matchesMe = d(function (expression) {
        var expressions = parse(expression);
        if (expressions.length === 1 && expressions[0].length === 1) {
          return match(this, expressions[0][0]);
        }
        var results = search(this.root, expression);
        for (var i = 0; i < results.length; i++)
          if (this === results[i])
            return true;
        return false;
      });
    define(Node.prototype, 'search', searchMe);
    define(Node.prototype, 'parent', parentMe);
    define(Node.prototype, 'matches', matchesMe);
    define(Node.prototype, 'scope', scopeMe);
    define(BaseList.prototype, 'search', searchMe);
    define(BaseList.prototype, 'parent', parentMe);
    define(BaseList.prototype, 'matches', matchesMe);
    define(BaseList.prototype, 'scope', scopeMe);
    exports.iterators = iterators;
    exports.pseudos = pseudos;
  },
  '../../../node_modules/nodes/lib/factory.js': function (require, module, exports, global) {
    'use strict';
    var typeOf = require('../../../node_modules/nodes/util/type-of.js');
    var create = Object.create;
    var define = Object.defineProperty;
    function expect() {
      var self = {};
      var tests = arguments;
      self.test = function (item) {
        for (var i = 0; i < tests.length; i++) {
          var test = tests[i];
          if (test === null) {
            if (item === null)
              return true;
          } else if (test.test(item)) {
            return true;
          }
        }
        return false;
      };
      self.default = function (value) {
        self.defaultValue = value;
        return self;
      };
      return self;
    }
    var f = function (value) {
      return {
        value: value,
        enumerable: true,
        configurable: false,
        writable: false
      };
    };
    var d = function (value) {
      return {
        value: value,
        enumerable: false,
        configurable: true,
        writable: true
      };
    };
    var p = function (value) {
      return {
        value: value,
        enumerable: false,
        configurable: false,
        writable: false
      };
    };
    var g = function (value) {
      return {
        get: value,
        enumerable: false,
        configurable: true
      };
    };
    var listGetter = function (type, key, test) {
      var listName = type + key.replace(/^\w/, function (f) {
          return f.toUpperCase();
        });
      var SubList = new Function('List', 'return function ' + listName + '() {' + 'List.apply(this, arguments);' + '};')(List);
      lists[listName] = SubList;
      SubList.prototype = create(List.prototype, { constructor: p(SubList) });
      SubList.test = function (item) {
        return item instanceof SubList;
      };
      SubList.accepts = test && test.test;
      var name = '@' + key;
      return {
        get: function () {
          if (!(name in this))
            define(this, name, p(new SubList(this)));
          return this[name];
        },
        set: function () {
          throw new Error('cannot reset ' + key + ' on ' + this.constructor.name);
        },
        enumerable: true,
        configurable: false
      };
    };
    var propertyAccessor = function (key, field) {
      var name = '@' + key;
      return {
        get: function () {
          if (!(name in this)) {
            var defaultValue = field.defaultValue;
            if (defaultValue !== void 0) {
              define(this, name, d(defaultValue));
              return defaultValue;
            }
          }
          return this[name];
        },
        set: function (value) {
          if (!field.test(value)) {
            var message = 'invalid value: ' + (value && value.type) + ' for "' + key + '" on ' + this.type;
            throw new TypeError(message);
          }
          var previous = this[name];
          if (previous)
            delete previous.parentNode;
          if (value) {
            if (value.parentNode)
              value.parentNode.removeChild(value);
            if (value instanceof Node || value instanceof List)
              define(value, 'parentNode', d(this));
          }
          define(this, name, d(value));
          return value;
        },
        enumerable: true,
        configurable: false
      };
    };
    var types = create(null);
    var lists = create(null);
    function describe(SuperNode, description) {
      var type = description.type;
      var SubNode = new Function('SuperNode', 'return function ' + type + '() {' + 'SuperNode.apply(this, arguments);' + '};')(SuperNode);
      SubNode.test = function (item) {
        return item instanceof SubNode;
      };
      var descriptors = {
          constructor: p(SubNode),
          type: f(type)
        };
      var keys = Object.keys(description);
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key === 'type')
          continue;
        var field = description[key];
        if (typeOf(field) === 'Array') {
          descriptors[key] = listGetter(type, key, expect.apply(null, field));
        } else if (typeOf(field.test) === 'Function') {
          descriptors[key] = propertyAccessor(key, field);
        }
      }
      SubNode.keys = keys.concat('loc', 'range');
      SubNode.prototype = create(SuperNode.prototype, descriptors);
      return types[type] = SubNode;
    }
    var rootMe = g(function () {
        var parent = this.parentNode;
        while (parent) {
          var ancestor = parent.parentNode;
          if (!ancestor)
            return parent;
          parent = ancestor;
        }
      });
    function BaseList() {
      define(this, 'length', d(0));
    }
    BaseList.prototype = create(Array.prototype, {
      constructor: p(BaseList),
      removeChild: d(function (child) {
        var io = this.indexOf(child);
        if (io > -1)
          this.splice(io, 1);
        if (child)
          delete child.parentNode;
        return this;
      }),
      replaceChild: d(function (child, value) {
        var io = this.indexOf(child);
        if (io > -1)
          this.splice(io, 1, value);
        return this;
      }),
      toJSON: d(function () {
        var array = [];
        for (var i = 0; i < this.length; i++) {
          var value = this[i];
          if (value && value.toJSON)
            value = value.toJSON();
          array.push(value);
        }
        return array;
      }),
      empty: d(function () {
        return this.splice(0, this.length);
      }),
      toString: d(function () {
        return JSON.stringify(this, null, 2);
      }),
      traverse: d(function (visitor, deep) {
        var found, skip = {};
        for (var i = 0; i < this.length; i++) {
          var node = this[i];
          found = visitor.call(this, node, i, skip);
          if (found === skip)
            continue;
          if (found !== void 0)
            break;
          if (deep && node) {
            found = node.traverse(visitor, deep);
            if (found !== void 0)
              break;
          }
        }
        return found;
      }),
      forEachRight: d(function (visitor, ctx) {
        for (var i = this.length; i--;) {
          visitor.call(ctx, this[i], i, this);
        }
      }),
      slice: d(function () {
        var list = new BaseList();
        for (var i = 0; i < this.length; i++)
          list.push(this[i]);
        return list;
      }),
      filter: d(function (method, ctx) {
        var list = new BaseList();
        for (var i = 0; i < this.length; i++) {
          var value = this[i];
          if (method.call(ctx, value, i, this))
            list.push(value);
        }
        return list;
      }),
      root: rootMe
    });
    BaseList.test = function (item) {
      return item instanceof BaseList;
    };
    function setNodeList(list, index, node) {
      var constructor = list.constructor;
      var accepts = constructor.accepts;
      if (accepts && !accepts(node)) {
        throw new TypeError('invalid item: ' + (node && node.type) + ' on ' + constructor.name);
      }
      if (node) {
        if (node.parentNode)
          node.parentNode.removeChild(node);
        define(node, 'parentNode', d(list));
      }
      return node;
    }
    function unsetNodeList(node) {
      if (node)
        delete node.parentNode;
      return node;
    }
    var UID = 0;
    function List(parent) {
      define(this, 'parentNode', p(parent));
      define(this, 'uid', p((UID++).toString(36)));
      BaseList.call(this);
    }
    List.prototype = create(BaseList.prototype, {
      constructor: p(List),
      splice: d(function (index, howMany) {
        if (index > this.length)
          return [];
        var nodes = [], node;
        for (var i = 2; i < arguments.length; i++) {
          node = setNodeList(this, i, arguments[i]);
          nodes.push(node);
        }
        for (var j = index; j < howMany; j++)
          unsetNodeList(this[j]);
        return Array.prototype.splice.apply(this, [
          index,
          howMany
        ].concat(nodes));
      }),
      push: d(function () {
        var nodes = [];
        for (var i = 0; i < arguments.length; i++)
          nodes.push(setNodeList(this, i, arguments[i]));
        return Array.prototype.push.apply(this, nodes);
      }),
      pop: d(function () {
        return unsetNodeList(Array.prototype.pop.call(this));
      }),
      shift: d(function () {
        return unsetNodeList(Array.prototype.shift.call(this));
      }),
      unshift: d(function () {
        var nodes = [];
        for (var i = 0; i < arguments.length; i++)
          nodes.push(setNodeList(this, i, arguments[i]));
        return Array.prototype.unshift.apply(this, nodes);
      })
    });
    List.test = function (item) {
      return item instanceof List;
    };
    lists.List = List;
    function Node(description) {
      define(this, 'uid', p((UID++).toString(36)));
      if (!description)
        return;
      var keys = this.constructor.keys;
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key === 'type')
          continue;
        var value = description[key];
        if (value === void 0)
          continue;
        if (value instanceof Array) {
          var list = this[key];
          list.push.apply(list, value);
        } else {
          this[key] = value;
        }
      }
    }
    Node.prototype = create({}, {
      constructor: p(Node),
      removeChild: d(function (child) {
        var key = this.indexOf(child);
        if (key !== void 0)
          delete this['@' + key];
        if (child)
          delete child.parentNode;
        return this;
      }),
      toJSON: d(function () {
        var properties = {};
        var keys = this.constructor.keys;
        for (var i = 0; i < keys.length; i++) {
          var key = keys[i], value = this[key];
          if (value && value.toJSON)
            value = value.toJSON();
          if (value !== void 0)
            properties[key] = value;
        }
        return properties;
      }),
      toString: d(function () {
        return JSON.stringify(this, null, 2);
      }),
      traverse: d(function (visitor, deep) {
        var found, skip = {};
        var keys = this.constructor.keys;
        for (var i = 0; i < keys.length; i++) {
          var key = keys[i];
          if (/^(loc|range)$/.test(key))
            continue;
          var value = this[key];
          found = visitor.call(this, value, key, skip);
          if (found === skip)
            continue;
          if (found !== void 0)
            break;
          if (deep && (value instanceof Node || value instanceof List)) {
            found = value.traverse(visitor, deep);
            if (found !== void 0)
              break;
          }
        }
        return found;
      }),
      replaceChild: d(function (child, value) {
        var key = this.indexOf(child);
        if (key !== void 0)
          this[key] = value;
        return this;
      }),
      indexOf: d(function (value) {
        var keys = this.constructor.keys;
        for (var i = 0; i < keys.length; i++) {
          var key = keys[i];
          if (this[key] === value)
            return key;
        }
      }),
      clone: d(function () {
        return build(this.toJSON());
      }),
      root: rootMe
    });
    Node.test = function (item) {
      return item instanceof Node;
    };
    function build(ast) {
      if (ast === null)
        return null;
      if (ast === void 0)
        return void 0;
      if (ast instanceof Node)
        return ast;
      var type = ast.type;
      if (!type)
        return ast;
      var NodeClass = types[type];
      if (!NodeClass)
        throw new Error('missing type: ' + type);
      if (NodeClass.pre)
        ast = NodeClass.pre(ast);
      var keys = NodeClass.keys;
      var self = new NodeClass();
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key === 'type')
          continue;
        var value = ast[key];
        if (/^(loc|range)$/.test(key)) {
          self[key] = value;
          continue;
        }
        if (value === void 0)
          continue;
        switch (typeOf(value)) {
        case 'Array':
          var list = self[key];
          list.push.apply(list, value.map(build));
          break;
        case 'Object':
          self[key] = build(value);
          break;
        default:
          self[key] = value;
        }
      }
      return self;
    }
    exports.Node = Node;
    exports.List = List;
    exports.BaseList = BaseList;
    types.Node = Node;
    exports.types = types;
    exports.lists = lists;
    exports.p = p;
    exports.f = f;
    exports.d = d;
    exports.g = g;
    exports.describe = describe;
    exports.expect = expect;
    exports.build = build;
  },
  '../../../node_modules/mout/lang/isKind.js': function (require, module, exports, global) {
    var kindOf = require('../../../node_modules/mout/lang/kindOf.js');
    function isKind(val, kind) {
      return kindOf(val) === kind;
    }
    module.exports = isKind;
  },
  '../../../node_modules/mout/object/hasOwn.js': function (require, module, exports, global) {
    function hasOwn(obj, prop) {
      return Object.prototype.hasOwnProperty.call(obj, prop);
    }
    module.exports = hasOwn;
  },
  '../../../node_modules/mout/object/mixIn.js': function (require, module, exports, global) {
    var forOwn = require('../../../node_modules/mout/object/forOwn.js');
    function mixIn(target, objects) {
      var i = 0, n = arguments.length, obj;
      while (++i < n) {
        obj = arguments[i];
        if (obj != null) {
          forOwn(obj, copyProp, target);
        }
      }
      return target;
    }
    function copyProp(val, key) {
      this[key] = val;
    }
    module.exports = mixIn;
  },
  '../../../node_modules/mout/function/makeIterator_.js': function (require, module, exports, global) {
    var identity = require('../../../node_modules/mout/function/identity.js');
    var prop = require('../../../node_modules/mout/function/prop.js');
    var deepMatches = require('../../../node_modules/mout/object/deepMatches.js');
    function makeIterator(src, thisObj) {
      if (src == null) {
        return identity;
      }
      switch (typeof src) {
      case 'function':
        return typeof thisObj !== 'undefined' ? function (val, i, arr) {
          return src.call(thisObj, val, i, arr);
        } : src;
      case 'object':
        return function (val) {
          return deepMatches(val, src);
        };
      case 'string':
      case 'number':
        return prop(src);
      }
    }
    module.exports = makeIterator;
  },
  '../../../node_modules/mout/lang/toString.js': function (require, module, exports, global) {
    function toString(val) {
      return val == null ? '' : val.toString();
    }
    module.exports = toString;
  },
  '../../../node_modules/mout/string/WHITE_SPACES.js': function (require, module, exports, global) {
    module.exports = [
      ' ',
      '\n',
      '\r',
      '\t',
      '\f',
      '\x0B',
      '\xA0',
      '\u1680',
      '\u180E',
      '\u2000',
      '\u2001',
      '\u2002',
      '\u2003',
      '\u2004',
      '\u2005',
      '\u2006',
      '\u2007',
      '\u2008',
      '\u2009',
      '\u200A',
      '\u2028',
      '\u2029',
      '\u202F',
      '\u205F',
      '\u3000'
    ];
  },
  '../../../node_modules/mout/string/ltrim.js': function (require, module, exports, global) {
    var toString = require('../../../node_modules/mout/lang/toString.js');
    var WHITE_SPACES = require('../../../node_modules/mout/string/WHITE_SPACES.js');
    function ltrim(str, chars) {
      str = toString(str);
      chars = chars || WHITE_SPACES;
      var start = 0, len = str.length, charLen = chars.length, found = true, i, c;
      while (found && start < len) {
        found = false;
        i = -1;
        c = str.charAt(start);
        while (++i < charLen) {
          if (c === chars[i]) {
            found = true;
            start++;
            break;
          }
        }
      }
      return start >= len ? '' : str.substr(start, len);
    }
    module.exports = ltrim;
  },
  '../../../node_modules/mout/string/rtrim.js': function (require, module, exports, global) {
    var toString = require('../../../node_modules/mout/lang/toString.js');
    var WHITE_SPACES = require('../../../node_modules/mout/string/WHITE_SPACES.js');
    function rtrim(str, chars) {
      str = toString(str);
      chars = chars || WHITE_SPACES;
      var end = str.length - 1, charLen = chars.length, found = true, i, c;
      while (found && end >= 0) {
        found = false;
        i = -1;
        c = str.charAt(end);
        while (++i < charLen) {
          if (c === chars[i]) {
            found = true;
            end--;
            break;
          }
        }
      }
      return end >= 0 ? str.substring(0, end + 1) : '';
    }
    module.exports = rtrim;
  },
  '../../../node_modules/source-map/lib/source-map/source-map-generator.js': function (require, module, exports, global) {
    if (typeof define !== 'function') {
      var define = require('../../../node_modules/source-map/node_modules/amdefine/amdefine.js')(module, require);
    }
    define(function (require, exports, module) {
      var base64VLQ = require('../../../node_modules/source-map/lib/source-map/base64-vlq.js');
      var util = require('../../../node_modules/source-map/lib/source-map/util.js');
      var ArraySet = require('../../../node_modules/source-map/lib/source-map/array-set.js').ArraySet;
      function SourceMapGenerator(aArgs) {
        if (!aArgs) {
          aArgs = {};
        }
        this._file = util.getArg(aArgs, 'file', null);
        this._sourceRoot = util.getArg(aArgs, 'sourceRoot', null);
        this._sources = new ArraySet();
        this._names = new ArraySet();
        this._mappings = [];
        this._sourcesContents = null;
      }
      SourceMapGenerator.prototype._version = 3;
      SourceMapGenerator.fromSourceMap = function SourceMapGenerator_fromSourceMap(aSourceMapConsumer) {
        var sourceRoot = aSourceMapConsumer.sourceRoot;
        var generator = new SourceMapGenerator({
            file: aSourceMapConsumer.file,
            sourceRoot: sourceRoot
          });
        aSourceMapConsumer.eachMapping(function (mapping) {
          var newMapping = {
              generated: {
                line: mapping.generatedLine,
                column: mapping.generatedColumn
              }
            };
          if (mapping.source) {
            newMapping.source = mapping.source;
            if (sourceRoot) {
              newMapping.source = util.relative(sourceRoot, newMapping.source);
            }
            newMapping.original = {
              line: mapping.originalLine,
              column: mapping.originalColumn
            };
            if (mapping.name) {
              newMapping.name = mapping.name;
            }
          }
          generator.addMapping(newMapping);
        });
        aSourceMapConsumer.sources.forEach(function (sourceFile) {
          var content = aSourceMapConsumer.sourceContentFor(sourceFile);
          if (content) {
            generator.setSourceContent(sourceFile, content);
          }
        });
        return generator;
      };
      SourceMapGenerator.prototype.addMapping = function SourceMapGenerator_addMapping(aArgs) {
        var generated = util.getArg(aArgs, 'generated');
        var original = util.getArg(aArgs, 'original', null);
        var source = util.getArg(aArgs, 'source', null);
        var name = util.getArg(aArgs, 'name', null);
        this._validateMapping(generated, original, source, name);
        if (source && !this._sources.has(source)) {
          this._sources.add(source);
        }
        if (name && !this._names.has(name)) {
          this._names.add(name);
        }
        this._mappings.push({
          generatedLine: generated.line,
          generatedColumn: generated.column,
          originalLine: original != null && original.line,
          originalColumn: original != null && original.column,
          source: source,
          name: name
        });
      };
      SourceMapGenerator.prototype.setSourceContent = function SourceMapGenerator_setSourceContent(aSourceFile, aSourceContent) {
        var source = aSourceFile;
        if (this._sourceRoot) {
          source = util.relative(this._sourceRoot, source);
        }
        if (aSourceContent !== null) {
          if (!this._sourcesContents) {
            this._sourcesContents = {};
          }
          this._sourcesContents[util.toSetString(source)] = aSourceContent;
        } else {
          delete this._sourcesContents[util.toSetString(source)];
          if (Object.keys(this._sourcesContents).length === 0) {
            this._sourcesContents = null;
          }
        }
      };
      SourceMapGenerator.prototype.applySourceMap = function SourceMapGenerator_applySourceMap(aSourceMapConsumer, aSourceFile, aSourceMapPath) {
        if (!aSourceFile) {
          if (!aSourceMapConsumer.file) {
            throw new Error('SourceMapGenerator.prototype.applySourceMap requires either an explicit source file, ' + 'or the source map\'s "file" property. Both were omitted.');
          }
          aSourceFile = aSourceMapConsumer.file;
        }
        var sourceRoot = this._sourceRoot;
        if (sourceRoot) {
          aSourceFile = util.relative(sourceRoot, aSourceFile);
        }
        var newSources = new ArraySet();
        var newNames = new ArraySet();
        this._mappings.forEach(function (mapping) {
          if (mapping.source === aSourceFile && mapping.originalLine) {
            var original = aSourceMapConsumer.originalPositionFor({
                line: mapping.originalLine,
                column: mapping.originalColumn
              });
            if (original.source !== null) {
              mapping.source = original.source;
              if (aSourceMapPath) {
                mapping.source = util.join(aSourceMapPath, mapping.source);
              }
              if (sourceRoot) {
                mapping.source = util.relative(sourceRoot, mapping.source);
              }
              mapping.originalLine = original.line;
              mapping.originalColumn = original.column;
              if (original.name !== null && mapping.name !== null) {
                mapping.name = original.name;
              }
            }
          }
          var source = mapping.source;
          if (source && !newSources.has(source)) {
            newSources.add(source);
          }
          var name = mapping.name;
          if (name && !newNames.has(name)) {
            newNames.add(name);
          }
        }, this);
        this._sources = newSources;
        this._names = newNames;
        aSourceMapConsumer.sources.forEach(function (sourceFile) {
          var content = aSourceMapConsumer.sourceContentFor(sourceFile);
          if (content) {
            if (sourceRoot) {
              sourceFile = util.relative(sourceRoot, sourceFile);
            }
            this.setSourceContent(sourceFile, content);
          }
        }, this);
      };
      SourceMapGenerator.prototype._validateMapping = function SourceMapGenerator_validateMapping(aGenerated, aOriginal, aSource, aName) {
        if (aGenerated && 'line' in aGenerated && 'column' in aGenerated && aGenerated.line > 0 && aGenerated.column >= 0 && !aOriginal && !aSource && !aName) {
          return;
        } else if (aGenerated && 'line' in aGenerated && 'column' in aGenerated && aOriginal && 'line' in aOriginal && 'column' in aOriginal && aGenerated.line > 0 && aGenerated.column >= 0 && aOriginal.line > 0 && aOriginal.column >= 0 && aSource) {
          return;
        } else {
          throw new Error('Invalid mapping: ' + JSON.stringify({
            generated: aGenerated,
            source: aSource,
            original: aOriginal,
            name: aName
          }));
        }
      };
      SourceMapGenerator.prototype._serializeMappings = function SourceMapGenerator_serializeMappings() {
        var previousGeneratedColumn = 0;
        var previousGeneratedLine = 1;
        var previousOriginalColumn = 0;
        var previousOriginalLine = 0;
        var previousName = 0;
        var previousSource = 0;
        var result = '';
        var mapping;
        this._mappings.sort(util.compareByGeneratedPositions);
        for (var i = 0, len = this._mappings.length; i < len; i++) {
          mapping = this._mappings[i];
          if (mapping.generatedLine !== previousGeneratedLine) {
            previousGeneratedColumn = 0;
            while (mapping.generatedLine !== previousGeneratedLine) {
              result += ';';
              previousGeneratedLine++;
            }
          } else {
            if (i > 0) {
              if (!util.compareByGeneratedPositions(mapping, this._mappings[i - 1])) {
                continue;
              }
              result += ',';
            }
          }
          result += base64VLQ.encode(mapping.generatedColumn - previousGeneratedColumn);
          previousGeneratedColumn = mapping.generatedColumn;
          if (mapping.source) {
            result += base64VLQ.encode(this._sources.indexOf(mapping.source) - previousSource);
            previousSource = this._sources.indexOf(mapping.source);
            result += base64VLQ.encode(mapping.originalLine - 1 - previousOriginalLine);
            previousOriginalLine = mapping.originalLine - 1;
            result += base64VLQ.encode(mapping.originalColumn - previousOriginalColumn);
            previousOriginalColumn = mapping.originalColumn;
            if (mapping.name) {
              result += base64VLQ.encode(this._names.indexOf(mapping.name) - previousName);
              previousName = this._names.indexOf(mapping.name);
            }
          }
        }
        return result;
      };
      SourceMapGenerator.prototype._generateSourcesContent = function SourceMapGenerator_generateSourcesContent(aSources, aSourceRoot) {
        return aSources.map(function (source) {
          if (!this._sourcesContents) {
            return null;
          }
          if (aSourceRoot) {
            source = util.relative(aSourceRoot, source);
          }
          var key = util.toSetString(source);
          return Object.prototype.hasOwnProperty.call(this._sourcesContents, key) ? this._sourcesContents[key] : null;
        }, this);
      };
      SourceMapGenerator.prototype.toJSON = function SourceMapGenerator_toJSON() {
        var map = {
            version: this._version,
            file: this._file,
            sources: this._sources.toArray(),
            names: this._names.toArray(),
            mappings: this._serializeMappings()
          };
        if (this._sourceRoot) {
          map.sourceRoot = this._sourceRoot;
        }
        if (this._sourcesContents) {
          map.sourcesContent = this._generateSourcesContent(map.sources, map.sourceRoot);
        }
        return map;
      };
      SourceMapGenerator.prototype.toString = function SourceMapGenerator_toString() {
        return JSON.stringify(this);
      };
      exports.SourceMapGenerator = SourceMapGenerator;
    });
  },
  '../../../node_modules/source-map/lib/source-map/source-map-consumer.js': function (require, module, exports, global) {
    if (typeof define !== 'function') {
      var define = require('../../../node_modules/source-map/node_modules/amdefine/amdefine.js')(module, require);
    }
    define(function (require, exports, module) {
      var util = require('../../../node_modules/source-map/lib/source-map/util.js');
      var binarySearch = require('../../../node_modules/source-map/lib/source-map/binary-search.js');
      var ArraySet = require('../../../node_modules/source-map/lib/source-map/array-set.js').ArraySet;
      var base64VLQ = require('../../../node_modules/source-map/lib/source-map/base64-vlq.js');
      function SourceMapConsumer(aSourceMap) {
        var sourceMap = aSourceMap;
        if (typeof aSourceMap === 'string') {
          sourceMap = JSON.parse(aSourceMap.replace(/^\)\]\}'/, ''));
        }
        var version = util.getArg(sourceMap, 'version');
        var sources = util.getArg(sourceMap, 'sources');
        var names = util.getArg(sourceMap, 'names', []);
        var sourceRoot = util.getArg(sourceMap, 'sourceRoot', null);
        var sourcesContent = util.getArg(sourceMap, 'sourcesContent', null);
        var mappings = util.getArg(sourceMap, 'mappings');
        var file = util.getArg(sourceMap, 'file', null);
        if (version != this._version) {
          throw new Error('Unsupported version: ' + version);
        }
        this._names = ArraySet.fromArray(names, true);
        this._sources = ArraySet.fromArray(sources, true);
        this.sourceRoot = sourceRoot;
        this.sourcesContent = sourcesContent;
        this._mappings = mappings;
        this.file = file;
      }
      SourceMapConsumer.fromSourceMap = function SourceMapConsumer_fromSourceMap(aSourceMap) {
        var smc = Object.create(SourceMapConsumer.prototype);
        smc._names = ArraySet.fromArray(aSourceMap._names.toArray(), true);
        smc._sources = ArraySet.fromArray(aSourceMap._sources.toArray(), true);
        smc.sourceRoot = aSourceMap._sourceRoot;
        smc.sourcesContent = aSourceMap._generateSourcesContent(smc._sources.toArray(), smc.sourceRoot);
        smc.file = aSourceMap._file;
        smc.__generatedMappings = aSourceMap._mappings.slice().sort(util.compareByGeneratedPositions);
        smc.__originalMappings = aSourceMap._mappings.slice().sort(util.compareByOriginalPositions);
        return smc;
      };
      SourceMapConsumer.prototype._version = 3;
      Object.defineProperty(SourceMapConsumer.prototype, 'sources', {
        get: function () {
          return this._sources.toArray().map(function (s) {
            return this.sourceRoot ? util.join(this.sourceRoot, s) : s;
          }, this);
        }
      });
      SourceMapConsumer.prototype.__generatedMappings = null;
      Object.defineProperty(SourceMapConsumer.prototype, '_generatedMappings', {
        get: function () {
          if (!this.__generatedMappings) {
            this.__generatedMappings = [];
            this.__originalMappings = [];
            this._parseMappings(this._mappings, this.sourceRoot);
          }
          return this.__generatedMappings;
        }
      });
      SourceMapConsumer.prototype.__originalMappings = null;
      Object.defineProperty(SourceMapConsumer.prototype, '_originalMappings', {
        get: function () {
          if (!this.__originalMappings) {
            this.__generatedMappings = [];
            this.__originalMappings = [];
            this._parseMappings(this._mappings, this.sourceRoot);
          }
          return this.__originalMappings;
        }
      });
      SourceMapConsumer.prototype._parseMappings = function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
        var generatedLine = 1;
        var previousGeneratedColumn = 0;
        var previousOriginalLine = 0;
        var previousOriginalColumn = 0;
        var previousSource = 0;
        var previousName = 0;
        var mappingSeparator = /^[,;]/;
        var str = aStr;
        var mapping;
        var temp;
        while (str.length > 0) {
          if (str.charAt(0) === ';') {
            generatedLine++;
            str = str.slice(1);
            previousGeneratedColumn = 0;
          } else if (str.charAt(0) === ',') {
            str = str.slice(1);
          } else {
            mapping = {};
            mapping.generatedLine = generatedLine;
            temp = base64VLQ.decode(str);
            mapping.generatedColumn = previousGeneratedColumn + temp.value;
            previousGeneratedColumn = mapping.generatedColumn;
            str = temp.rest;
            if (str.length > 0 && !mappingSeparator.test(str.charAt(0))) {
              temp = base64VLQ.decode(str);
              mapping.source = this._sources.at(previousSource + temp.value);
              previousSource += temp.value;
              str = temp.rest;
              if (str.length === 0 || mappingSeparator.test(str.charAt(0))) {
                throw new Error('Found a source, but no line and column');
              }
              temp = base64VLQ.decode(str);
              mapping.originalLine = previousOriginalLine + temp.value;
              previousOriginalLine = mapping.originalLine;
              mapping.originalLine += 1;
              str = temp.rest;
              if (str.length === 0 || mappingSeparator.test(str.charAt(0))) {
                throw new Error('Found a source and line, but no column');
              }
              temp = base64VLQ.decode(str);
              mapping.originalColumn = previousOriginalColumn + temp.value;
              previousOriginalColumn = mapping.originalColumn;
              str = temp.rest;
              if (str.length > 0 && !mappingSeparator.test(str.charAt(0))) {
                temp = base64VLQ.decode(str);
                mapping.name = this._names.at(previousName + temp.value);
                previousName += temp.value;
                str = temp.rest;
              }
            }
            this.__generatedMappings.push(mapping);
            if (typeof mapping.originalLine === 'number') {
              this.__originalMappings.push(mapping);
            }
          }
        }
        this.__generatedMappings.sort(util.compareByGeneratedPositions);
        this.__originalMappings.sort(util.compareByOriginalPositions);
      };
      SourceMapConsumer.prototype._findMapping = function SourceMapConsumer_findMapping(aNeedle, aMappings, aLineName, aColumnName, aComparator) {
        if (aNeedle[aLineName] <= 0) {
          throw new TypeError('Line must be greater than or equal to 1, got ' + aNeedle[aLineName]);
        }
        if (aNeedle[aColumnName] < 0) {
          throw new TypeError('Column must be greater than or equal to 0, got ' + aNeedle[aColumnName]);
        }
        return binarySearch.search(aNeedle, aMappings, aComparator);
      };
      SourceMapConsumer.prototype.originalPositionFor = function SourceMapConsumer_originalPositionFor(aArgs) {
        var needle = {
            generatedLine: util.getArg(aArgs, 'line'),
            generatedColumn: util.getArg(aArgs, 'column')
          };
        var mapping = this._findMapping(needle, this._generatedMappings, 'generatedLine', 'generatedColumn', util.compareByGeneratedPositions);
        if (mapping && mapping.generatedLine === needle.generatedLine) {
          var source = util.getArg(mapping, 'source', null);
          if (source && this.sourceRoot) {
            source = util.join(this.sourceRoot, source);
          }
          return {
            source: source,
            line: util.getArg(mapping, 'originalLine', null),
            column: util.getArg(mapping, 'originalColumn', null),
            name: util.getArg(mapping, 'name', null)
          };
        }
        return {
          source: null,
          line: null,
          column: null,
          name: null
        };
      };
      SourceMapConsumer.prototype.sourceContentFor = function SourceMapConsumer_sourceContentFor(aSource) {
        if (!this.sourcesContent) {
          return null;
        }
        if (this.sourceRoot) {
          aSource = util.relative(this.sourceRoot, aSource);
        }
        if (this._sources.has(aSource)) {
          return this.sourcesContent[this._sources.indexOf(aSource)];
        }
        var url;
        if (this.sourceRoot && (url = util.urlParse(this.sourceRoot))) {
          var fileUriAbsPath = aSource.replace(/^file:\/\//, '');
          if (url.scheme == 'file' && this._sources.has(fileUriAbsPath)) {
            return this.sourcesContent[this._sources.indexOf(fileUriAbsPath)];
          }
          if ((!url.path || url.path == '/') && this._sources.has('/' + aSource)) {
            return this.sourcesContent[this._sources.indexOf('/' + aSource)];
          }
        }
        throw new Error('"' + aSource + '" is not in the SourceMap.');
      };
      SourceMapConsumer.prototype.generatedPositionFor = function SourceMapConsumer_generatedPositionFor(aArgs) {
        var needle = {
            source: util.getArg(aArgs, 'source'),
            originalLine: util.getArg(aArgs, 'line'),
            originalColumn: util.getArg(aArgs, 'column')
          };
        if (this.sourceRoot) {
          needle.source = util.relative(this.sourceRoot, needle.source);
        }
        var mapping = this._findMapping(needle, this._originalMappings, 'originalLine', 'originalColumn', util.compareByOriginalPositions);
        if (mapping) {
          return {
            line: util.getArg(mapping, 'generatedLine', null),
            column: util.getArg(mapping, 'generatedColumn', null)
          };
        }
        return {
          line: null,
          column: null
        };
      };
      SourceMapConsumer.GENERATED_ORDER = 1;
      SourceMapConsumer.ORIGINAL_ORDER = 2;
      SourceMapConsumer.prototype.eachMapping = function SourceMapConsumer_eachMapping(aCallback, aContext, aOrder) {
        var context = aContext || null;
        var order = aOrder || SourceMapConsumer.GENERATED_ORDER;
        var mappings;
        switch (order) {
        case SourceMapConsumer.GENERATED_ORDER:
          mappings = this._generatedMappings;
          break;
        case SourceMapConsumer.ORIGINAL_ORDER:
          mappings = this._originalMappings;
          break;
        default:
          throw new Error('Unknown order of iteration.');
        }
        var sourceRoot = this.sourceRoot;
        mappings.map(function (mapping) {
          var source = mapping.source;
          if (source && sourceRoot) {
            source = util.join(sourceRoot, source);
          }
          return {
            source: source,
            generatedLine: mapping.generatedLine,
            generatedColumn: mapping.generatedColumn,
            originalLine: mapping.originalLine,
            originalColumn: mapping.originalColumn,
            name: mapping.name
          };
        }).forEach(aCallback, context);
      };
      exports.SourceMapConsumer = SourceMapConsumer;
    });
  },
  '../../../node_modules/source-map/lib/source-map/source-node.js': function (require, module, exports, global) {
    if (typeof define !== 'function') {
      var define = require('../../../node_modules/source-map/node_modules/amdefine/amdefine.js')(module, require);
    }
    define(function (require, exports, module) {
      var SourceMapGenerator = require('../../../node_modules/source-map/lib/source-map/source-map-generator.js').SourceMapGenerator;
      var util = require('../../../node_modules/source-map/lib/source-map/util.js');
      function SourceNode(aLine, aColumn, aSource, aChunks, aName) {
        this.children = [];
        this.sourceContents = {};
        this.line = aLine === undefined ? null : aLine;
        this.column = aColumn === undefined ? null : aColumn;
        this.source = aSource === undefined ? null : aSource;
        this.name = aName === undefined ? null : aName;
        if (aChunks != null)
          this.add(aChunks);
      }
      SourceNode.fromStringWithSourceMap = function SourceNode_fromStringWithSourceMap(aGeneratedCode, aSourceMapConsumer) {
        var node = new SourceNode();
        var remainingLines = aGeneratedCode.split('\n');
        var lastGeneratedLine = 1, lastGeneratedColumn = 0;
        var lastMapping = null;
        aSourceMapConsumer.eachMapping(function (mapping) {
          if (lastMapping !== null) {
            if (lastGeneratedLine < mapping.generatedLine) {
              var code = '';
              addMappingWithCode(lastMapping, remainingLines.shift() + '\n');
              lastGeneratedLine++;
              lastGeneratedColumn = 0;
            } else {
              var nextLine = remainingLines[0];
              var code = nextLine.substr(0, mapping.generatedColumn - lastGeneratedColumn);
              remainingLines[0] = nextLine.substr(mapping.generatedColumn - lastGeneratedColumn);
              lastGeneratedColumn = mapping.generatedColumn;
              addMappingWithCode(lastMapping, code);
              lastMapping = mapping;
              return;
            }
          }
          while (lastGeneratedLine < mapping.generatedLine) {
            node.add(remainingLines.shift() + '\n');
            lastGeneratedLine++;
          }
          if (lastGeneratedColumn < mapping.generatedColumn) {
            var nextLine = remainingLines[0];
            node.add(nextLine.substr(0, mapping.generatedColumn));
            remainingLines[0] = nextLine.substr(mapping.generatedColumn);
            lastGeneratedColumn = mapping.generatedColumn;
          }
          lastMapping = mapping;
        }, this);
        if (remainingLines.length > 0) {
          if (lastMapping) {
            var lastLine = remainingLines.shift();
            if (remainingLines.length > 0)
              lastLine += '\n';
            addMappingWithCode(lastMapping, lastLine);
          }
          node.add(remainingLines.join('\n'));
        }
        aSourceMapConsumer.sources.forEach(function (sourceFile) {
          var content = aSourceMapConsumer.sourceContentFor(sourceFile);
          if (content) {
            node.setSourceContent(sourceFile, content);
          }
        });
        return node;
        function addMappingWithCode(mapping, code) {
          if (mapping === null || mapping.source === undefined) {
            node.add(code);
          } else {
            node.add(new SourceNode(mapping.originalLine, mapping.originalColumn, mapping.source, code, mapping.name));
          }
        }
      };
      SourceNode.prototype.add = function SourceNode_add(aChunk) {
        if (Array.isArray(aChunk)) {
          aChunk.forEach(function (chunk) {
            this.add(chunk);
          }, this);
        } else if (aChunk instanceof SourceNode || typeof aChunk === 'string') {
          if (aChunk) {
            this.children.push(aChunk);
          }
        } else {
          throw new TypeError('Expected a SourceNode, string, or an array of SourceNodes and strings. Got ' + aChunk);
        }
        return this;
      };
      SourceNode.prototype.prepend = function SourceNode_prepend(aChunk) {
        if (Array.isArray(aChunk)) {
          for (var i = aChunk.length - 1; i >= 0; i--) {
            this.prepend(aChunk[i]);
          }
        } else if (aChunk instanceof SourceNode || typeof aChunk === 'string') {
          this.children.unshift(aChunk);
        } else {
          throw new TypeError('Expected a SourceNode, string, or an array of SourceNodes and strings. Got ' + aChunk);
        }
        return this;
      };
      SourceNode.prototype.walk = function SourceNode_walk(aFn) {
        var chunk;
        for (var i = 0, len = this.children.length; i < len; i++) {
          chunk = this.children[i];
          if (chunk instanceof SourceNode) {
            chunk.walk(aFn);
          } else {
            if (chunk !== '') {
              aFn(chunk, {
                source: this.source,
                line: this.line,
                column: this.column,
                name: this.name
              });
            }
          }
        }
      };
      SourceNode.prototype.join = function SourceNode_join(aSep) {
        var newChildren;
        var i;
        var len = this.children.length;
        if (len > 0) {
          newChildren = [];
          for (i = 0; i < len - 1; i++) {
            newChildren.push(this.children[i]);
            newChildren.push(aSep);
          }
          newChildren.push(this.children[i]);
          this.children = newChildren;
        }
        return this;
      };
      SourceNode.prototype.replaceRight = function SourceNode_replaceRight(aPattern, aReplacement) {
        var lastChild = this.children[this.children.length - 1];
        if (lastChild instanceof SourceNode) {
          lastChild.replaceRight(aPattern, aReplacement);
        } else if (typeof lastChild === 'string') {
          this.children[this.children.length - 1] = lastChild.replace(aPattern, aReplacement);
        } else {
          this.children.push(''.replace(aPattern, aReplacement));
        }
        return this;
      };
      SourceNode.prototype.setSourceContent = function SourceNode_setSourceContent(aSourceFile, aSourceContent) {
        this.sourceContents[util.toSetString(aSourceFile)] = aSourceContent;
      };
      SourceNode.prototype.walkSourceContents = function SourceNode_walkSourceContents(aFn) {
        for (var i = 0, len = this.children.length; i < len; i++) {
          if (this.children[i] instanceof SourceNode) {
            this.children[i].walkSourceContents(aFn);
          }
        }
        var sources = Object.keys(this.sourceContents);
        for (var i = 0, len = sources.length; i < len; i++) {
          aFn(util.fromSetString(sources[i]), this.sourceContents[sources[i]]);
        }
      };
      SourceNode.prototype.toString = function SourceNode_toString() {
        var str = '';
        this.walk(function (chunk) {
          str += chunk;
        });
        return str;
      };
      SourceNode.prototype.toStringWithSourceMap = function SourceNode_toStringWithSourceMap(aArgs) {
        var generated = {
            code: '',
            line: 1,
            column: 0
          };
        var map = new SourceMapGenerator(aArgs);
        var sourceMappingActive = false;
        var lastOriginalSource = null;
        var lastOriginalLine = null;
        var lastOriginalColumn = null;
        var lastOriginalName = null;
        this.walk(function (chunk, original) {
          generated.code += chunk;
          if (original.source !== null && original.line !== null && original.column !== null) {
            if (lastOriginalSource !== original.source || lastOriginalLine !== original.line || lastOriginalColumn !== original.column || lastOriginalName !== original.name) {
              map.addMapping({
                source: original.source,
                original: {
                  line: original.line,
                  column: original.column
                },
                generated: {
                  line: generated.line,
                  column: generated.column
                },
                name: original.name
              });
            }
            lastOriginalSource = original.source;
            lastOriginalLine = original.line;
            lastOriginalColumn = original.column;
            lastOriginalName = original.name;
            sourceMappingActive = true;
          } else if (sourceMappingActive) {
            map.addMapping({
              generated: {
                line: generated.line,
                column: generated.column
              }
            });
            lastOriginalSource = null;
            sourceMappingActive = false;
          }
          chunk.split('').forEach(function (ch, idx, array) {
            if (ch === '\n') {
              generated.line++;
              generated.column = 0;
              if (idx + 1 === array.length) {
                lastOriginalSource = null;
                sourceMappingActive = false;
              } else if (sourceMappingActive) {
                map.addMapping({
                  source: original.source,
                  original: {
                    line: original.line,
                    column: original.column
                  },
                  generated: {
                    line: generated.line,
                    column: generated.column
                  },
                  name: original.name
                });
              }
            } else {
              generated.column++;
            }
          });
        });
        this.walkSourceContents(function (sourceFile, sourceContent) {
          map.setSourceContent(sourceFile, sourceContent);
        });
        return {
          code: generated.code,
          map: map
        };
      };
      exports.SourceNode = SourceNode;
    });
  },
  '../../../node_modules/slick/parser.js': function (require, module, exports, global) {
    'use strict';
    var escapeRe = /([-.*+?^${}()|[\]\/\\])/g, unescapeRe = /\\/g;
    var escape = function (string) {
      return (string + '').replace(escapeRe, '\\$1');
    };
    var unescape = function (string) {
      return (string + '').replace(unescapeRe, '');
    };
    var slickRe = RegExp('^(?:\\s*(,)\\s*|\\s*(<combinator>+)\\s*|(\\s+)|(<unicode>+|\\*)|\\#(<unicode>+)|\\.(<unicode>+)|\\[\\s*(<unicode1>+)(?:\\s*([*^$!~|]?=)(?:\\s*(?:(["\']?)(.*?)\\9)))?\\s*\\](?!\\])|(:+)(<unicode>+)(?:\\((?:(?:(["\'])([^\\13]*)\\13)|((?:\\([^)]+\\)|[^()]*)+))\\))?)'.replace(/<combinator>/, '[' + escape('>+~`!@$%^&={}\\;</') + ']').replace(/<unicode>/g, '(?:[\\w\\u00a1-\\uFFFF-]|\\\\[^\\s0-9a-f])').replace(/<unicode1>/g, '(?:[:\\w\\u00a1-\\uFFFF-]|\\\\[^\\s0-9a-f])'));
    var Part = function Part(combinator) {
      this.combinator = combinator || ' ';
      this.tag = '*';
    };
    Part.prototype.toString = function () {
      if (!this.raw) {
        var xpr = '', k, part;
        xpr += this.tag || '*';
        if (this.id)
          xpr += '#' + this.id;
        if (this.classes)
          xpr += '.' + this.classList.join('.');
        if (this.attributes)
          for (k = 0; part = this.attributes[k++];) {
            xpr += '[' + part.name + (part.operator ? part.operator + '"' + part.value + '"' : '') + ']';
          }
        if (this.pseudos)
          for (k = 0; part = this.pseudos[k++];) {
            xpr += ':' + part.name;
            if (part.value)
              xpr += '(' + part.value + ')';
          }
        this.raw = xpr;
      }
      return this.raw;
    };
    var Expression = function Expression() {
      this.length = 0;
    };
    Expression.prototype.toString = function () {
      if (!this.raw) {
        var xpr = '';
        for (var j = 0, bit; bit = this[j++];) {
          if (j !== 1)
            xpr += ' ';
          if (bit.combinator !== ' ')
            xpr += bit.combinator + ' ';
          xpr += bit;
        }
        this.raw = xpr;
      }
      return this.raw;
    };
    var replacer = function (rawMatch, separator, combinator, combinatorChildren, tagName, id, className, attributeKey, attributeOperator, attributeQuote, attributeValue, pseudoMarker, pseudoClass, pseudoQuote, pseudoClassQuotedValue, pseudoClassValue) {
      var expression, current;
      if (separator || !this.length) {
        expression = this[this.length++] = new Expression();
        if (separator)
          return '';
      }
      if (!expression)
        expression = this[this.length - 1];
      if (combinator || combinatorChildren || !expression.length) {
        current = expression[expression.length++] = new Part(combinator);
      }
      if (!current)
        current = expression[expression.length - 1];
      if (tagName) {
        current.tag = unescape(tagName);
      } else if (id) {
        current.id = unescape(id);
      } else if (className) {
        var unescaped = unescape(className);
        var classes = current.classes || (current.classes = {});
        if (!classes[unescaped]) {
          classes[unescaped] = escape(className);
          var classList = current.classList || (current.classList = []);
          classList.push(unescaped);
          classList.sort();
        }
      } else if (pseudoClass) {
        pseudoClassValue = pseudoClassValue || pseudoClassQuotedValue;
        ;
        (current.pseudos || (current.pseudos = [])).push({
          type: pseudoMarker.length == 1 ? 'class' : 'element',
          name: unescape(pseudoClass),
          escapedName: escape(pseudoClass),
          value: pseudoClassValue ? unescape(pseudoClassValue) : null,
          escapedValue: pseudoClassValue ? escape(pseudoClassValue) : null
        });
      } else if (attributeKey) {
        attributeValue = attributeValue ? escape(attributeValue) : null;
        ;
        (current.attributes || (current.attributes = [])).push({
          operator: attributeOperator,
          name: unescape(attributeKey),
          escapedName: escape(attributeKey),
          value: attributeValue ? unescape(attributeValue) : null,
          escapedValue: attributeValue ? escape(attributeValue) : null
        });
      }
      return '';
    };
    var Expressions = function Expressions(expression) {
      this.length = 0;
      var self = this;
      var original = expression, replaced;
      while (expression) {
        replaced = expression.replace(slickRe, function () {
          return replacer.apply(self, arguments);
        });
        if (replaced === expression)
          throw new Error(original + ' is an invalid expression');
        expression = replaced;
      }
    };
    Expressions.prototype.toString = function () {
      if (!this.raw) {
        var expressions = [];
        for (var i = 0, expression; expression = this[i++];)
          expressions.push(expression);
        this.raw = expressions.join(', ');
      }
      return this.raw;
    };
    var cache = {};
    var parse = function (expression) {
      if (expression == null)
        return null;
      expression = ('' + expression).replace(/^\s+|\s+$/g, '');
      return cache[expression] || (cache[expression] = new Expressions(expression));
    };
    module.exports = parse;
  },
  '../../../node_modules/slick/finder.js': function (require, module, exports, global) {
    'use strict';
    var parse = require('../../../node_modules/slick/parser.js');
    var index = 0, counter = document.__counter = (parseInt(document.__counter || -1, 36) + 1).toString(36), key = 'uid:' + counter;
    var uniqueID = function (n, xml) {
      if (n === window)
        return 'window';
      if (n === document)
        return 'document';
      if (n === document.documentElement)
        return 'html';
      if (xml) {
        var uid = n.getAttribute(key);
        if (!uid) {
          uid = (index++).toString(36);
          n.setAttribute(key, uid);
        }
        return uid;
      } else {
        return n[key] || (n[key] = (index++).toString(36));
      }
    };
    var uniqueIDXML = function (n) {
      return uniqueID(n, true);
    };
    var isArray = Array.isArray || function (object) {
        return Object.prototype.toString.call(object) === '[object Array]';
      };
    var uniqueIndex = 0;
    var HAS = {
        GET_ELEMENT_BY_ID: function (test, id) {
          id = 'slick_' + uniqueIndex++;
          test.innerHTML = '<a id="' + id + '"></a>';
          return !!this.getElementById(id);
        },
        QUERY_SELECTOR: function (test) {
          test.innerHTML = '_<style>:nth-child(2){}</style>';
          test.innerHTML = '<a class="MiX"></a>';
          return test.querySelectorAll('.MiX').length === 1;
        },
        EXPANDOS: function (test, id) {
          id = 'slick_' + uniqueIndex++;
          test._custom_property_ = id;
          return test._custom_property_ === id;
        },
        MATCHES_SELECTOR: function (test) {
          test.className = 'MiX';
          var matches = test.matchesSelector || test.mozMatchesSelector || test.webkitMatchesSelector;
          if (matches)
            try {
              matches.call(test, ':slick');
            } catch (e) {
              return matches.call(test, '.MiX') ? matches : false;
            }
          return false;
        },
        GET_ELEMENTS_BY_CLASS_NAME: function (test) {
          test.innerHTML = '<a class="f"></a><a class="b"></a>';
          if (test.getElementsByClassName('b').length !== 1)
            return false;
          test.firstChild.className = 'b';
          if (test.getElementsByClassName('b').length !== 2)
            return false;
          test.innerHTML = '<a class="a"></a><a class="f b a"></a>';
          if (test.getElementsByClassName('a').length !== 2)
            return false;
          return true;
        },
        GET_ATTRIBUTE: function (test) {
          var shout = 'fus ro dah';
          test.innerHTML = '<a class="' + shout + '"></a>';
          return test.firstChild.getAttribute('class') === shout;
        }
      };
    var Finder = function Finder(document) {
      this.document = document;
      var root = this.root = document.documentElement;
      this.tested = {};
      this.uniqueID = this.has('EXPANDOS') ? uniqueID : uniqueIDXML;
      this.getAttribute = this.has('GET_ATTRIBUTE') ? function (node, name) {
        return node.getAttribute(name);
      } : function (node, name) {
        node = node.getAttributeNode(name);
        return node && node.specified ? node.value : null;
      };
      this.hasAttribute = root.hasAttribute ? function (node, attribute) {
        return node.hasAttribute(attribute);
      } : function (node, attribute) {
        node = node.getAttributeNode(attribute);
        return !!(node && node.specified);
      };
      this.contains = document.contains && root.contains ? function (context, node) {
        return context.contains(node);
      } : root.compareDocumentPosition ? function (context, node) {
        return context === node || !!(context.compareDocumentPosition(node) & 16);
      } : function (context, node) {
        do {
          if (node === context)
            return true;
        } while (node = node.parentNode);
        return false;
      };
      this.sorter = root.compareDocumentPosition ? function (a, b) {
        if (!a.compareDocumentPosition || !b.compareDocumentPosition)
          return 0;
        return a.compareDocumentPosition(b) & 4 ? -1 : a === b ? 0 : 1;
      } : 'sourceIndex' in root ? function (a, b) {
        if (!a.sourceIndex || !b.sourceIndex)
          return 0;
        return a.sourceIndex - b.sourceIndex;
      } : document.createRange ? function (a, b) {
        if (!a.ownerDocument || !b.ownerDocument)
          return 0;
        var aRange = a.ownerDocument.createRange(), bRange = b.ownerDocument.createRange();
        aRange.setStart(a, 0);
        aRange.setEnd(a, 0);
        bRange.setStart(b, 0);
        bRange.setEnd(b, 0);
        return aRange.compareBoundaryPoints(Range.START_TO_END, bRange);
      } : null;
      this.failed = {};
      var nativeMatches = this.has('MATCHES_SELECTOR');
      if (nativeMatches)
        this.matchesSelector = function (node, expression) {
          if (this.failed[expression])
            return null;
          try {
            return nativeMatches.call(node, expression);
          } catch (e) {
            if (slick.debug)
              console.warn('matchesSelector failed on ' + expression);
            this.failed[expression] = true;
            return null;
          }
        };
      if (this.has('QUERY_SELECTOR')) {
        this.querySelectorAll = function (node, expression) {
          if (this.failed[expression])
            return true;
          var result, _id, _expression, _combinator, _node;
          if (node !== this.document) {
            _combinator = expression[0].combinator;
            _id = node.getAttribute('id');
            _expression = expression;
            if (!_id) {
              _node = node;
              _id = '__slick__';
              _node.setAttribute('id', _id);
            }
            expression = '#' + _id + ' ' + _expression;
            if (_combinator.indexOf('~') > -1 || _combinator.indexOf('+') > -1) {
              node = node.parentNode;
              if (!node)
                result = true;
            }
          }
          if (!result)
            try {
              result = node.querySelectorAll(expression.toString());
            } catch (e) {
              if (slick.debug)
                console.warn('querySelectorAll failed on ' + (_expression || expression));
              result = this.failed[_expression || expression] = true;
            }
          if (_node)
            _node.removeAttribute('id');
          return result;
        };
      }
    };
    Finder.prototype.has = function (FEATURE) {
      var tested = this.tested, testedFEATURE = tested[FEATURE];
      if (testedFEATURE != null)
        return testedFEATURE;
      var root = this.root, document = this.document, testNode = document.createElement('div');
      testNode.setAttribute('style', 'display: none;');
      root.appendChild(testNode);
      var TEST = HAS[FEATURE], result = false;
      if (TEST)
        try {
          result = TEST.call(document, testNode);
        } catch (e) {
        }
      if (slick.debug && !result)
        console.warn('document has no ' + FEATURE);
      root.removeChild(testNode);
      return tested[FEATURE] = result;
    };
    var combinators = {
        ' ': function (node, part, push) {
          var item, items;
          var noId = !part.id, noTag = !part.tag, noClass = !part.classes;
          if (part.id && node.getElementById && this.has('GET_ELEMENT_BY_ID')) {
            item = node.getElementById(part.id);
            if (item && item.getAttribute('id') === part.id) {
              items = [item];
              noId = true;
              if (part.tag === '*')
                noTag = true;
            }
          }
          if (!items) {
            if (part.classes && node.getElementsByClassName && this.has('GET_ELEMENTS_BY_CLASS_NAME')) {
              items = node.getElementsByClassName(part.classList);
              noClass = true;
              if (part.tag === '*')
                noTag = true;
            } else {
              items = node.getElementsByTagName(part.tag);
              if (part.tag !== '*')
                noTag = true;
            }
            if (!items || !items.length)
              return false;
          }
          for (var i = 0; item = items[i++];)
            if (noTag && noId && noClass && !part.attributes && !part.pseudos || this.match(item, part, noTag, noId, noClass))
              push(item);
          return true;
        },
        '>': function (node, part, push) {
          if (node = node.firstChild)
            do {
              if (node.nodeType == 1 && this.match(node, part))
                push(node);
            } while (node = node.nextSibling);
        },
        '+': function (node, part, push) {
          while (node = node.nextSibling)
            if (node.nodeType == 1) {
              if (this.match(node, part))
                push(node);
              break;
            }
        },
        '^': function (node, part, push) {
          node = node.firstChild;
          if (node) {
            if (node.nodeType === 1) {
              if (this.match(node, part))
                push(node);
            } else {
              combinators['+'].call(this, node, part, push);
            }
          }
        },
        '~': function (node, part, push) {
          while (node = node.nextSibling) {
            if (node.nodeType === 1 && this.match(node, part))
              push(node);
          }
        },
        '++': function (node, part, push) {
          combinators['+'].call(this, node, part, push);
          combinators['!+'].call(this, node, part, push);
        },
        '~~': function (node, part, push) {
          combinators['~'].call(this, node, part, push);
          combinators['!~'].call(this, node, part, push);
        },
        '!': function (node, part, push) {
          while (node = node.parentNode)
            if (node !== this.document && this.match(node, part))
              push(node);
        },
        '!>': function (node, part, push) {
          node = node.parentNode;
          if (node !== this.document && this.match(node, part))
            push(node);
        },
        '!+': function (node, part, push) {
          while (node = node.previousSibling)
            if (node.nodeType == 1) {
              if (this.match(node, part))
                push(node);
              break;
            }
        },
        '!^': function (node, part, push) {
          node = node.lastChild;
          if (node) {
            if (node.nodeType == 1) {
              if (this.match(node, part))
                push(node);
            } else {
              combinators['!+'].call(this, node, part, push);
            }
          }
        },
        '!~': function (node, part, push) {
          while (node = node.previousSibling) {
            if (node.nodeType === 1 && this.match(node, part))
              push(node);
          }
        }
      };
    Finder.prototype.search = function (context, expression, found) {
      if (!context)
        context = this.document;
      else if (!context.nodeType && context.document)
        context = context.document;
      var expressions = parse(expression);
      if (!expressions || !expressions.length)
        throw new Error('invalid expression');
      if (!found)
        found = [];
      var uniques, push = isArray(found) ? function (node) {
          found[found.length] = node;
        } : function (node) {
          found[found.length++] = node;
        };
      if (expressions.length > 1) {
        uniques = {};
        var plush = push;
        push = function (node) {
          var uid = uniqueID(node);
          if (!uniques[uid]) {
            uniques[uid] = true;
            plush(node);
          }
        };
      }
      var node, nodes, part;
      main:
        for (var i = 0; expression = expressions[i++];) {
          if (!slick.noQSA && this.querySelectorAll) {
            nodes = this.querySelectorAll(context, expression);
            if (nodes !== true) {
              if (nodes && nodes.length)
                for (var j = 0; node = nodes[j++];)
                  if (node.nodeName > '@') {
                    push(node);
                  }
              continue main;
            }
          }
          if (expression.length === 1) {
            part = expression[0];
            combinators[part.combinator].call(this, context, part, push);
          } else {
            var cs = [context], c, f, u, p = function (node) {
                var uid = uniqueID(node);
                if (!u[uid]) {
                  u[uid] = true;
                  f[f.length] = node;
                }
              };
            for (var j = 0; part = expression[j++];) {
              f = [];
              u = {};
              for (var k = 0; c = cs[k++];)
                combinators[part.combinator].call(this, c, part, p);
              if (!f.length)
                continue main;
              cs = f;
            }
            if (i === 0)
              found = f;
            else
              for (var l = 0; l < f.length; l++)
                push(f[l]);
          }
        }
      if (uniques && found && found.length > 1)
        this.sort(found);
      return found;
    };
    Finder.prototype.sort = function (nodes) {
      return this.sorter ? Array.prototype.sort.call(nodes, this.sorter) : nodes;
    };
    var pseudos = {
        'empty': function () {
          return !(this && this.nodeType === 1) && !(this.innerText || this.textContent || '').length;
        },
        'not': function (expression) {
          return !slick.match(this, expression);
        },
        'contains': function (text) {
          return (this.innerText || this.textContent || '').indexOf(text) > -1;
        },
        'first-child': function () {
          var node = this;
          while (node = node.previousSibling)
            if (node.nodeType == 1)
              return false;
          return true;
        },
        'last-child': function () {
          var node = this;
          while (node = node.nextSibling)
            if (node.nodeType == 1)
              return false;
          return true;
        },
        'only-child': function () {
          var prev = this;
          while (prev = prev.previousSibling)
            if (prev.nodeType == 1)
              return false;
          var next = this;
          while (next = next.nextSibling)
            if (next.nodeType == 1)
              return false;
          return true;
        },
        'first-of-type': function () {
          var node = this, nodeName = node.nodeName;
          while (node = node.previousSibling)
            if (node.nodeName == nodeName)
              return false;
          return true;
        },
        'last-of-type': function () {
          var node = this, nodeName = node.nodeName;
          while (node = node.nextSibling)
            if (node.nodeName == nodeName)
              return false;
          return true;
        },
        'only-of-type': function () {
          var prev = this, nodeName = this.nodeName;
          while (prev = prev.previousSibling)
            if (prev.nodeName == nodeName)
              return false;
          var next = this;
          while (next = next.nextSibling)
            if (next.nodeName == nodeName)
              return false;
          return true;
        },
        'enabled': function () {
          return !this.disabled;
        },
        'disabled': function () {
          return this.disabled;
        },
        'checked': function () {
          return this.checked || this.selected;
        },
        'selected': function () {
          return this.selected;
        },
        'focus': function () {
          var doc = this.ownerDocument;
          return doc.activeElement === this && (this.href || this.type || slick.hasAttribute(this, 'tabindex'));
        },
        'root': function () {
          return this === this.ownerDocument.documentElement;
        }
      };
    Finder.prototype.match = function (node, bit, noTag, noId, noClass) {
      if (!slick.noQSA && this.matchesSelector) {
        var matches = this.matchesSelector(node, bit);
        if (matches !== null)
          return matches;
      }
      if (!noTag && bit.tag) {
        var nodeName = node.nodeName.toLowerCase();
        if (bit.tag === '*') {
          if (nodeName < '@')
            return false;
        } else if (nodeName != bit.tag) {
          return false;
        }
      }
      if (!noId && bit.id && node.getAttribute('id') !== bit.id)
        return false;
      var i, part;
      if (!noClass && bit.classes) {
        var className = this.getAttribute(node, 'class');
        if (!className)
          return false;
        for (part in bit.classes)
          if (!RegExp('(^|\\s)' + bit.classes[part] + '(\\s|$)').test(className))
            return false;
      }
      var name, value;
      if (bit.attributes)
        for (i = 0; part = bit.attributes[i++];) {
          var operator = part.operator, escaped = part.escapedValue;
          name = part.name;
          value = part.value;
          if (!operator) {
            if (!this.hasAttribute(node, name))
              return false;
          } else {
            var actual = this.getAttribute(node, name);
            if (actual == null)
              return false;
            switch (operator) {
            case '^=':
              if (!RegExp('^' + escaped).test(actual))
                return false;
              break;
            case '$=':
              if (!RegExp(escaped + '$').test(actual))
                return false;
              break;
            case '~=':
              if (!RegExp('(^|\\s)' + escaped + '(\\s|$)').test(actual))
                return false;
              break;
            case '|=':
              if (!RegExp('^' + escaped + '(-|$)').test(actual))
                return false;
              break;
            case '=':
              if (actual !== value)
                return false;
              break;
            case '*=':
              if (actual.indexOf(value) === -1)
                return false;
              break;
            default:
              return false;
            }
          }
        }
      if (bit.pseudos)
        for (i = 0; part = bit.pseudos[i++];) {
          name = part.name;
          value = part.value;
          if (pseudos[name] && !pseudos[name].call(node, value)) {
            return false;
          } else if (value != null) {
            if (this.getAttribute(node, name) !== value)
              return false;
          } else {
            if (!this.hasAttribute(node, name))
              return false;
          }
        }
      return true;
    };
    Finder.prototype.matches = function (node, expression) {
      var expressions = parse(expression);
      if (expressions.length === 1 && expressions[0].length === 1) {
        return this.match(node, expressions[0][0]);
      }
      if (!slick.noQSA && this.matchesSelector) {
        var matches = this.matchesSelector(node, expressions);
        if (matches !== null)
          return matches;
      }
      var nodes = this.search(this.document, expression, { length: 0 });
      for (var i = 0, res; res = nodes[i++];)
        if (node === res)
          return true;
      return false;
    };
    var finders = {};
    var finder = function (context) {
      var doc = context || document;
      if (doc.ownerDocument)
        doc = doc.ownerDocument;
      else if (doc.document)
        doc = doc.document;
      if (doc.nodeType !== 9)
        throw new TypeError('invalid document');
      var uid = uniqueID(doc);
      return finders[uid] || (finders[uid] = new Finder(doc));
    };
    var slick = function (expression, context) {
      return slick.search(expression, context);
    };
    slick.search = function (expression, context, found) {
      return finder(context).search(context, expression, found);
    };
    slick.find = function (expression, context) {
      return finder(context).search(context, expression)[0] || null;
    };
    slick.getAttribute = function (node, name) {
      return finder(node).getAttribute(node, name);
    };
    slick.hasAttribute = function (node, name) {
      return finder(node).hasAttribute(node, name);
    };
    slick.contains = function (context, node) {
      return finder(context).contains(context, node);
    };
    slick.matches = function (node, expression) {
      return finder(node).matches(node, expression);
    };
    slick.sort = function (nodes) {
      if (nodes && nodes.length > 1)
        finder(nodes[0]).sort(nodes);
      return nodes;
    };
    slick.parse = parse;
    module.exports = slick;
  },
  '../../../node_modules/nodes/util/type-of.js': function (require, module, exports, global) {
    'use strict';
    function typeOf(object) {
      if (object === void 0)
        return 'Undefined';
      if (object === null)
        return 'Null';
      return object.constructor.name;
    }
    typeOf.String = function (item) {
      return typeOf(item) === 'String';
    };
    typeOf.Object = function (item) {
      return typeOf(item) === 'Object';
    };
    typeOf.Number = function (item) {
      return typeOf(item) === 'Number';
    };
    typeOf.RegExp = function (item) {
      return typeOf(item) === 'RegExp';
    };
    typeOf.Boolean = function (item) {
      return typeOf(item) === 'Boolean';
    };
    typeOf.Function = function (item) {
      return typeOf(item) === 'Function';
    };
    typeOf.Array = function (item) {
      return typeOf(item) === 'Array';
    };
    module.exports = typeOf;
  },
  '../../../node_modules/mout/object/forOwn.js': function (require, module, exports, global) {
    var hasOwn = require('../../../node_modules/mout/object/hasOwn.js');
    var forIn = require('../../../node_modules/mout/object/forIn.js');
    function forOwn(obj, fn, thisObj) {
      forIn(obj, function (val, key) {
        if (hasOwn(obj, key)) {
          return fn.call(thisObj, obj[key], key, obj);
        }
      });
    }
    module.exports = forOwn;
  },
  '../../../node_modules/mout/function/identity.js': function (require, module, exports, global) {
    function identity(val) {
      return val;
    }
    module.exports = identity;
  },
  '../../../node_modules/mout/function/prop.js': function (require, module, exports, global) {
    function prop(name) {
      return function (obj) {
        return obj[name];
      };
    }
    module.exports = prop;
  },
  '../../../node_modules/mout/object/deepMatches.js': function (require, module, exports, global) {
    var forOwn = require('../../../node_modules/mout/object/forOwn.js');
    var isArray = require('../../../node_modules/mout/lang/isArray.js');
    function containsMatch(array, pattern) {
      var i = -1, length = array.length;
      while (++i < length) {
        if (deepMatches(array[i], pattern)) {
          return true;
        }
      }
      return false;
    }
    function matchArray(target, pattern) {
      var i = -1, patternLength = pattern.length;
      while (++i < patternLength) {
        if (!containsMatch(target, pattern[i])) {
          return false;
        }
      }
      return true;
    }
    function matchObject(target, pattern) {
      var result = true;
      forOwn(pattern, function (val, key) {
        if (!deepMatches(target[key], val)) {
          return result = false;
        }
      });
      return result;
    }
    function deepMatches(target, pattern) {
      if (target && typeof target === 'object') {
        if (isArray(target) && isArray(pattern)) {
          return matchArray(target, pattern);
        } else {
          return matchObject(target, pattern);
        }
      } else {
        return target === pattern;
      }
    }
    module.exports = deepMatches;
  },
  '../../../node_modules/source-map/lib/source-map/base64-vlq.js': function (require, module, exports, global) {
    if (typeof define !== 'function') {
      var define = require('../../../node_modules/source-map/node_modules/amdefine/amdefine.js')(module, require);
    }
    define(function (require, exports, module) {
      var base64 = require('../../../node_modules/source-map/lib/source-map/base64.js');
      var VLQ_BASE_SHIFT = 5;
      var VLQ_BASE = 1 << VLQ_BASE_SHIFT;
      var VLQ_BASE_MASK = VLQ_BASE - 1;
      var VLQ_CONTINUATION_BIT = VLQ_BASE;
      function toVLQSigned(aValue) {
        return aValue < 0 ? (-aValue << 1) + 1 : (aValue << 1) + 0;
      }
      function fromVLQSigned(aValue) {
        var isNegative = (aValue & 1) === 1;
        var shifted = aValue >> 1;
        return isNegative ? -shifted : shifted;
      }
      exports.encode = function base64VLQ_encode(aValue) {
        var encoded = '';
        var digit;
        var vlq = toVLQSigned(aValue);
        do {
          digit = vlq & VLQ_BASE_MASK;
          vlq >>>= VLQ_BASE_SHIFT;
          if (vlq > 0) {
            digit |= VLQ_CONTINUATION_BIT;
          }
          encoded += base64.encode(digit);
        } while (vlq > 0);
        return encoded;
      };
      exports.decode = function base64VLQ_decode(aStr) {
        var i = 0;
        var strLen = aStr.length;
        var result = 0;
        var shift = 0;
        var continuation, digit;
        do {
          if (i >= strLen) {
            throw new Error('Expected more digits in base 64 VLQ value.');
          }
          digit = base64.decode(aStr.charAt(i++));
          continuation = !!(digit & VLQ_CONTINUATION_BIT);
          digit &= VLQ_BASE_MASK;
          result = result + (digit << shift);
          shift += VLQ_BASE_SHIFT;
        } while (continuation);
        return {
          value: fromVLQSigned(result),
          rest: aStr.slice(i)
        };
      };
    });
  },
  '../../../node_modules/source-map/lib/source-map/binary-search.js': function (require, module, exports, global) {
    if (typeof define !== 'function') {
      var define = require('../../../node_modules/source-map/node_modules/amdefine/amdefine.js')(module, require);
    }
    define(function (require, exports, module) {
      function recursiveSearch(aLow, aHigh, aNeedle, aHaystack, aCompare) {
        var mid = Math.floor((aHigh - aLow) / 2) + aLow;
        var cmp = aCompare(aNeedle, aHaystack[mid], true);
        if (cmp === 0) {
          return aHaystack[mid];
        } else if (cmp > 0) {
          if (aHigh - mid > 1) {
            return recursiveSearch(mid, aHigh, aNeedle, aHaystack, aCompare);
          }
          return aHaystack[mid];
        } else {
          if (mid - aLow > 1) {
            return recursiveSearch(aLow, mid, aNeedle, aHaystack, aCompare);
          }
          return aLow < 0 ? null : aHaystack[aLow];
        }
      }
      exports.search = function search(aNeedle, aHaystack, aCompare) {
        return aHaystack.length > 0 ? recursiveSearch(-1, aHaystack.length, aNeedle, aHaystack, aCompare) : null;
      };
    });
  },
  '../../../node_modules/source-map/lib/source-map/util.js': function (require, module, exports, global) {
    if (typeof define !== 'function') {
      var define = require('../../../node_modules/source-map/node_modules/amdefine/amdefine.js')(module, require);
    }
    define(function (require, exports, module) {
      function getArg(aArgs, aName, aDefaultValue) {
        if (aName in aArgs) {
          return aArgs[aName];
        } else if (arguments.length === 3) {
          return aDefaultValue;
        } else {
          throw new Error('"' + aName + '" is a required argument.');
        }
      }
      exports.getArg = getArg;
      var urlRegexp = /^(?:([\w+\-.]+):)?\/\/(?:(\w+:\w+)@)?([\w.]*)(?::(\d+))?(\S*)$/;
      var dataUrlRegexp = /^data:.+\,.+$/;
      function urlParse(aUrl) {
        var match = aUrl.match(urlRegexp);
        if (!match) {
          return null;
        }
        return {
          scheme: match[1],
          auth: match[2],
          host: match[3],
          port: match[4],
          path: match[5]
        };
      }
      exports.urlParse = urlParse;
      function urlGenerate(aParsedUrl) {
        var url = '';
        if (aParsedUrl.scheme) {
          url += aParsedUrl.scheme + ':';
        }
        url += '//';
        if (aParsedUrl.auth) {
          url += aParsedUrl.auth + '@';
        }
        if (aParsedUrl.host) {
          url += aParsedUrl.host;
        }
        if (aParsedUrl.port) {
          url += ':' + aParsedUrl.port;
        }
        if (aParsedUrl.path) {
          url += aParsedUrl.path;
        }
        return url;
      }
      exports.urlGenerate = urlGenerate;
      function normalize(aPath) {
        var path = aPath;
        var url = urlParse(aPath);
        if (url) {
          if (!url.path) {
            return aPath;
          }
          path = url.path;
        }
        var isAbsolute = path.charAt(0) === '/';
        var parts = path.split(/\/+/);
        for (var part, up = 0, i = parts.length - 1; i >= 0; i--) {
          part = parts[i];
          if (part === '.') {
            parts.splice(i, 1);
          } else if (part === '..') {
            up++;
          } else if (up > 0) {
            if (part === '') {
              parts.splice(i + 1, up);
              up = 0;
            } else {
              parts.splice(i, 2);
              up--;
            }
          }
        }
        path = parts.join('/');
        if (path === '') {
          path = isAbsolute ? '/' : '.';
        }
        if (url) {
          url.path = path;
          return urlGenerate(url);
        }
        return path;
      }
      exports.normalize = normalize;
      function join(aRoot, aPath) {
        var aPathUrl = urlParse(aPath);
        var aRootUrl = urlParse(aRoot);
        if (aRootUrl) {
          aRoot = aRootUrl.path || '/';
        }
        if (aPathUrl && !aPathUrl.scheme) {
          if (aRootUrl) {
            aPathUrl.scheme = aRootUrl.scheme;
          }
          return urlGenerate(aPathUrl);
        }
        if (aPathUrl || aPath.match(dataUrlRegexp)) {
          return aPath;
        }
        if (aRootUrl && !aRootUrl.host && !aRootUrl.path) {
          aRootUrl.host = aPath;
          return urlGenerate(aRootUrl);
        }
        var joined = aPath.charAt(0) === '/' ? aPath : normalize(aRoot.replace(/\/+$/, '') + '/' + aPath);
        if (aRootUrl) {
          aRootUrl.path = joined;
          return urlGenerate(aRootUrl);
        }
        return joined;
      }
      exports.join = join;
      function toSetString(aStr) {
        return '$' + aStr;
      }
      exports.toSetString = toSetString;
      function fromSetString(aStr) {
        return aStr.substr(1);
      }
      exports.fromSetString = fromSetString;
      function relative(aRoot, aPath) {
        aRoot = aRoot.replace(/\/$/, '');
        var url = urlParse(aRoot);
        if (aPath.charAt(0) == '/' && url && url.path == '/') {
          return aPath.slice(1);
        }
        return aPath.indexOf(aRoot + '/') === 0 ? aPath.substr(aRoot.length + 1) : aPath;
      }
      exports.relative = relative;
      function strcmp(aStr1, aStr2) {
        var s1 = aStr1 || '';
        var s2 = aStr2 || '';
        return (s1 > s2) - (s1 < s2);
      }
      function compareByOriginalPositions(mappingA, mappingB, onlyCompareOriginal) {
        var cmp;
        cmp = strcmp(mappingA.source, mappingB.source);
        if (cmp) {
          return cmp;
        }
        cmp = mappingA.originalLine - mappingB.originalLine;
        if (cmp) {
          return cmp;
        }
        cmp = mappingA.originalColumn - mappingB.originalColumn;
        if (cmp || onlyCompareOriginal) {
          return cmp;
        }
        cmp = strcmp(mappingA.name, mappingB.name);
        if (cmp) {
          return cmp;
        }
        cmp = mappingA.generatedLine - mappingB.generatedLine;
        if (cmp) {
          return cmp;
        }
        return mappingA.generatedColumn - mappingB.generatedColumn;
      }
      ;
      exports.compareByOriginalPositions = compareByOriginalPositions;
      function compareByGeneratedPositions(mappingA, mappingB, onlyCompareGenerated) {
        var cmp;
        cmp = mappingA.generatedLine - mappingB.generatedLine;
        if (cmp) {
          return cmp;
        }
        cmp = mappingA.generatedColumn - mappingB.generatedColumn;
        if (cmp || onlyCompareGenerated) {
          return cmp;
        }
        cmp = strcmp(mappingA.source, mappingB.source);
        if (cmp) {
          return cmp;
        }
        cmp = mappingA.originalLine - mappingB.originalLine;
        if (cmp) {
          return cmp;
        }
        cmp = mappingA.originalColumn - mappingB.originalColumn;
        if (cmp) {
          return cmp;
        }
        return strcmp(mappingA.name, mappingB.name);
      }
      ;
      exports.compareByGeneratedPositions = compareByGeneratedPositions;
    });
  },
  '../../../node_modules/source-map/lib/source-map/array-set.js': function (require, module, exports, global) {
    if (typeof define !== 'function') {
      var define = require('../../../node_modules/source-map/node_modules/amdefine/amdefine.js')(module, require);
    }
    define(function (require, exports, module) {
      var util = require('../../../node_modules/source-map/lib/source-map/util.js');
      function ArraySet() {
        this._array = [];
        this._set = {};
      }
      ArraySet.fromArray = function ArraySet_fromArray(aArray, aAllowDuplicates) {
        var set = new ArraySet();
        for (var i = 0, len = aArray.length; i < len; i++) {
          set.add(aArray[i], aAllowDuplicates);
        }
        return set;
      };
      ArraySet.prototype.add = function ArraySet_add(aStr, aAllowDuplicates) {
        var isDuplicate = this.has(aStr);
        var idx = this._array.length;
        if (!isDuplicate || aAllowDuplicates) {
          this._array.push(aStr);
        }
        if (!isDuplicate) {
          this._set[util.toSetString(aStr)] = idx;
        }
      };
      ArraySet.prototype.has = function ArraySet_has(aStr) {
        return Object.prototype.hasOwnProperty.call(this._set, util.toSetString(aStr));
      };
      ArraySet.prototype.indexOf = function ArraySet_indexOf(aStr) {
        if (this.has(aStr)) {
          return this._set[util.toSetString(aStr)];
        }
        throw new Error('"' + aStr + '" is not in the set.');
      };
      ArraySet.prototype.at = function ArraySet_at(aIdx) {
        if (aIdx >= 0 && aIdx < this._array.length) {
          return this._array[aIdx];
        }
        throw new Error('No element indexed by ' + aIdx);
      };
      ArraySet.prototype.toArray = function ArraySet_toArray() {
        return this._array.slice();
      };
      exports.ArraySet = ArraySet;
    });
  },
  '../../../node_modules/mout/object/forIn.js': function (require, module, exports, global) {
    var hasOwn = require('../../../node_modules/mout/object/hasOwn.js');
    var _hasDontEnumBug, _dontEnums;
    function checkDontEnum() {
      _dontEnums = [
        'toString',
        'toLocaleString',
        'valueOf',
        'hasOwnProperty',
        'isPrototypeOf',
        'propertyIsEnumerable',
        'constructor'
      ];
      _hasDontEnumBug = true;
      for (var key in { 'toString': null }) {
        _hasDontEnumBug = false;
      }
    }
    function forIn(obj, fn, thisObj) {
      var key, i = 0;
      if (_hasDontEnumBug == null)
        checkDontEnum();
      for (key in obj) {
        if (exec(fn, obj, key, thisObj) === false) {
          break;
        }
      }
      if (_hasDontEnumBug) {
        var ctor = obj.constructor, isProto = !!ctor && obj === ctor.prototype;
        while (key = _dontEnums[i++]) {
          if ((key !== 'constructor' || !isProto && hasOwn(obj, key)) && obj[key] !== Object.prototype[key]) {
            if (exec(fn, obj, key, thisObj) === false) {
              break;
            }
          }
        }
      }
    }
    function exec(fn, obj, key, thisObj) {
      return fn.call(thisObj, obj[key], key, obj);
    }
    module.exports = forIn;
  },
  '../../../node_modules/mout/lang/isArray.js': function (require, module, exports, global) {
    var isKind = require('../../../node_modules/mout/lang/isKind.js');
    var isArray = Array.isArray || function (val) {
        return isKind(val, 'Array');
      };
    module.exports = isArray;
  },
  '../../../node_modules/source-map/lib/source-map/base64.js': function (require, module, exports, global) {
    if (typeof define !== 'function') {
      var define = require('../../../node_modules/source-map/node_modules/amdefine/amdefine.js')(module, require);
    }
    define(function (require, exports, module) {
      var charToIntMap = {};
      var intToCharMap = {};
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.split('').forEach(function (ch, index) {
        charToIntMap[ch] = index;
        intToCharMap[index] = ch;
      });
      exports.encode = function base64_encode(aNumber) {
        if (aNumber in intToCharMap) {
          return intToCharMap[aNumber];
        }
        throw new TypeError('Must be between 0 and 63: ' + aNumber);
      };
      exports.decode = function base64_decode(aChar) {
        if (aChar in charToIntMap) {
          return charToIntMap[aChar];
        }
        throw new TypeError('Not a valid base 64 digit: ' + aChar);
      };
    });
  },
  '../../../node_modules/source-map/node_modules/amdefine/amdefine.js': function (require, module, exports, global) {
    'use strict';
    function amdefine(module, requireFn) {
      'use strict';
      var defineCache = {}, loaderCache = {}, alreadyCalled = false, path = require('../../../node_modules/quickstart/node_modules/path-browserify/index.js'), makeRequire, stringRequire;
      function trimDots(ary) {
        var i, part;
        for (i = 0; ary[i]; i += 1) {
          part = ary[i];
          if (part === '.') {
            ary.splice(i, 1);
            i -= 1;
          } else if (part === '..') {
            if (i === 1 && (ary[2] === '..' || ary[0] === '..')) {
              break;
            } else if (i > 0) {
              ary.splice(i - 1, 2);
              i -= 2;
            }
          }
        }
      }
      function normalize(name, baseName) {
        var baseParts;
        if (name && name.charAt(0) === '.') {
          if (baseName) {
            baseParts = baseName.split('/');
            baseParts = baseParts.slice(0, baseParts.length - 1);
            baseParts = baseParts.concat(name.split('/'));
            trimDots(baseParts);
            name = baseParts.join('/');
          }
        }
        return name;
      }
      function makeNormalize(relName) {
        return function (name) {
          return normalize(name, relName);
        };
      }
      function makeLoad(id) {
        function load(value) {
          loaderCache[id] = value;
        }
        load.fromText = function (id, text) {
          throw new Error('amdefine does not implement load.fromText');
        };
        return load;
      }
      makeRequire = function (systemRequire, exports, module, relId) {
        function amdRequire(deps, callback) {
          if (typeof deps === 'string') {
            return stringRequire(systemRequire, exports, module, deps, relId);
          } else {
            deps = deps.map(function (depName) {
              return stringRequire(systemRequire, exports, module, depName, relId);
            });
            process.nextTick(function () {
              callback.apply(null, deps);
            });
          }
        }
        amdRequire.toUrl = function (filePath) {
          if (filePath.indexOf('.') === 0) {
            return normalize(filePath, path.dirname(module.filename));
          } else {
            return filePath;
          }
        };
        return amdRequire;
      };
      requireFn = requireFn || function req() {
        return module.require.apply(module, arguments);
      };
      function runFactory(id, deps, factory) {
        var r, e, m, result;
        if (id) {
          e = loaderCache[id] = {};
          m = {
            id: id,
            uri: __filename,
            exports: e
          };
          r = makeRequire(requireFn, e, m, id);
        } else {
          if (alreadyCalled) {
            throw new Error('amdefine with no module ID cannot be called more than once per file.');
          }
          alreadyCalled = true;
          e = module.exports;
          m = module;
          r = makeRequire(requireFn, e, m, module.id);
        }
        if (deps) {
          deps = deps.map(function (depName) {
            return r(depName);
          });
        }
        if (typeof factory === 'function') {
          result = factory.apply(m.exports, deps);
        } else {
          result = factory;
        }
        if (result !== undefined) {
          m.exports = result;
          if (id) {
            loaderCache[id] = m.exports;
          }
        }
      }
      stringRequire = function (systemRequire, exports, module, id, relId) {
        var index = id.indexOf('!'), originalId = id, prefix, plugin;
        if (index === -1) {
          id = normalize(id, relId);
          if (id === 'require') {
            return makeRequire(systemRequire, exports, module, relId);
          } else if (id === 'exports') {
            return exports;
          } else if (id === 'module') {
            return module;
          } else if (loaderCache.hasOwnProperty(id)) {
            return loaderCache[id];
          } else if (defineCache[id]) {
            runFactory.apply(null, defineCache[id]);
            return loaderCache[id];
          } else {
            if (systemRequire) {
              return systemRequire(originalId);
            } else {
              throw new Error('No module with ID: ' + id);
            }
          }
        } else {
          prefix = id.substring(0, index);
          id = id.substring(index + 1, id.length);
          plugin = stringRequire(systemRequire, exports, module, prefix, relId);
          if (plugin.normalize) {
            id = plugin.normalize(id, makeNormalize(relId));
          } else {
            id = normalize(id, relId);
          }
          if (loaderCache[id]) {
            return loaderCache[id];
          } else {
            plugin.load(id, makeRequire(systemRequire, exports, module, relId), makeLoad(id), {});
            return loaderCache[id];
          }
        }
      };
      function define(id, deps, factory) {
        if (Array.isArray(id)) {
          factory = deps;
          deps = id;
          id = undefined;
        } else if (typeof id !== 'string') {
          factory = id;
          id = deps = undefined;
        }
        if (deps && !Array.isArray(deps)) {
          factory = deps;
          deps = undefined;
        }
        if (!deps) {
          deps = [
            'require',
            'exports',
            'module'
          ];
        }
        if (id) {
          defineCache[id] = [
            id,
            deps,
            factory
          ];
        } else {
          runFactory(id, deps, factory);
        }
      }
      define.require = function (id) {
        if (loaderCache[id]) {
          return loaderCache[id];
        }
        if (defineCache[id]) {
          runFactory.apply(null, defineCache[id]);
          return loaderCache[id];
        }
      };
      define.amd = {};
      return define;
    }
    module.exports = amdefine;
  },
  '../../../node_modules/quickstart/node_modules/path-browserify/index.js': function (require, module, exports, global) {
    function normalizeArray(parts, allowAboveRoot) {
      var up = 0;
      for (var i = parts.length - 1; i >= 0; i--) {
        var last = parts[i];
        if (last === '.') {
          parts.splice(i, 1);
        } else if (last === '..') {
          parts.splice(i, 1);
          up++;
        } else if (up) {
          parts.splice(i, 1);
          up--;
        }
      }
      if (allowAboveRoot) {
        for (; up--; up) {
          parts.unshift('..');
        }
      }
      return parts;
    }
    var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
    var splitPath = function (filename) {
      return splitPathRe.exec(filename).slice(1);
    };
    exports.resolve = function () {
      var resolvedPath = '', resolvedAbsolute = false;
      for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
        var path = i >= 0 ? arguments[i] : process.cwd();
        if (typeof path !== 'string') {
          throw new TypeError('Arguments to path.resolve must be strings');
        } else if (!path) {
          continue;
        }
        resolvedPath = path + '/' + resolvedPath;
        resolvedAbsolute = path.charAt(0) === '/';
      }
      resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function (p) {
        return !!p;
      }), !resolvedAbsolute).join('/');
      return (resolvedAbsolute ? '/' : '') + resolvedPath || '.';
    };
    exports.normalize = function (path) {
      var isAbsolute = exports.isAbsolute(path), trailingSlash = substr(path, -1) === '/';
      path = normalizeArray(filter(path.split('/'), function (p) {
        return !!p;
      }), !isAbsolute).join('/');
      if (!path && !isAbsolute) {
        path = '.';
      }
      if (path && trailingSlash) {
        path += '/';
      }
      return (isAbsolute ? '/' : '') + path;
    };
    exports.isAbsolute = function (path) {
      return path.charAt(0) === '/';
    };
    exports.join = function () {
      var paths = Array.prototype.slice.call(arguments, 0);
      return exports.normalize(filter(paths, function (p, index) {
        if (typeof p !== 'string') {
          throw new TypeError('Arguments to path.join must be strings');
        }
        return p;
      }).join('/'));
    };
    exports.relative = function (from, to) {
      from = exports.resolve(from).substr(1);
      to = exports.resolve(to).substr(1);
      function trim(arr) {
        var start = 0;
        for (; start < arr.length; start++) {
          if (arr[start] !== '')
            break;
        }
        var end = arr.length - 1;
        for (; end >= 0; end--) {
          if (arr[end] !== '')
            break;
        }
        if (start > end)
          return [];
        return arr.slice(start, end - start + 1);
      }
      var fromParts = trim(from.split('/'));
      var toParts = trim(to.split('/'));
      var length = Math.min(fromParts.length, toParts.length);
      var samePartsLength = length;
      for (var i = 0; i < length; i++) {
        if (fromParts[i] !== toParts[i]) {
          samePartsLength = i;
          break;
        }
      }
      var outputParts = [];
      for (var i = samePartsLength; i < fromParts.length; i++) {
        outputParts.push('..');
      }
      outputParts = outputParts.concat(toParts.slice(samePartsLength));
      return outputParts.join('/');
    };
    exports.sep = '/';
    exports.delimiter = ':';
    exports.dirname = function (path) {
      var result = splitPath(path), root = result[0], dir = result[1];
      if (!root && !dir) {
        return '.';
      }
      if (dir) {
        dir = dir.substr(0, dir.length - 1);
      }
      return root + dir;
    };
    exports.basename = function (path, ext) {
      var f = splitPath(path)[2];
      if (ext && f.substr(-1 * ext.length) === ext) {
        f = f.substr(0, f.length - ext.length);
      }
      return f;
    };
    exports.extname = function (path) {
      return splitPath(path)[3];
    };
    function filter(xs, f) {
      if (xs.filter)
        return xs.filter(f);
      var res = [];
      for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs))
          res.push(xs[i]);
      }
      return res;
    }
    var substr = 'ab'.substr(-1) === 'b' ? function (str, start, len) {
        return str.substr(start, len);
      } : function (str, start, len) {
        if (start < 0)
          start = str.length + start;
        return str.substr(start, len);
      };
    ;
  }
}));
//# sourceMappingURL=./harmonizer-demo-compiled.map