'use strict';

var throttle = require('./util/throttle');

var $ = require('elements');
var ready = require('elements/domready');

var harmonize = require('harmonizer');
var library = require('harmonizer/library');
global.Symbol = library.Symbol;

var esprima = require('esprima');
var escodegen = require('escodegen');

var tosource = require('tosource');

var generate = function(object) {

  return escodegen.generate(object, {
    format: {
      indent: { style: '  ' },
      quotes: 'single'
    }
  });
};

var destruct = function(string) {
  return new Function('return ' + string)();
};

var inspect = function(object) {
  var inspected = tosource(object);
  var parsed = esprima.parse('(' + inspected + ')');
  return generate(parsed);
};

var createEditor = function(node, mode, hideLine, readOnly) {
  var editor = ace.edit(node.id());
  editor.setTheme("ace/theme/tomorrow");
  editor.setShowPrintMargin(false);

  editor.setOption("showLineNumbers", false);

  if (hideLine) editor.setHighlightActiveLine(false);
  if (readOnly) editor.setReadOnly(true);

  var editorSession = editor.getSession();

  editorSession.setMode("ace/mode/" + mode);
  editorSession.setTabSize(2);
  editorSession.setUseSoftTabs(true);
  editorSession.setUseWrapMode(false);
  editorSession.setUseWorker(false);

  var throttled = throttle.timeout(function() {
    editorSession._emit('throttled-change');
  });

  editorSession.on('change', throttled);

  return editor;
};

ready(function() {

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

  es6CodeSession.on('throttled-change', function() {
    es6CodeChange = true;

    var es6CodeString = es6CodeEditor.getValue();
    localStorage.setItem('code', es6CodeString);

    try {
      es6AstObject = esprima.parse(es6CodeString);
      es6AstEditor.setValue(inspect(es6AstObject), -1);
    } catch(e) { // parse failed
      es6AstObject = false;
      es6AstEditor.setValue(e.message, -1);
    }

  });

  var harmonizationError;

  es6AstSession.on('throttled-change', function() {
    es6AstChange = true;

    if (es6AstObject === false) {
      es5AstObject = false;
      es5AstEditor.setValue(null, -1);

    } else {
      if (!es6CodeChange) try { // changed directly
        // console.log('es6 ast was edited manually. evaluating.');
        es6AstObject = destruct(es6AstEditor.getValue());
      } catch(e) {
        es5AstObject = false;
        es5AstEditor.setValue(e.message, -1);
        return;
      }

      try {
        es5AstObject = harmonize(es6AstObject);
        es5AstEditor.setValue(inspect(es5AstObject.toJSON()), -1);
      } catch (e) { // ast harmonization failed
        harmonizationError = e;
        es5AstObject = false;
        es5AstEditor.setValue(e.message, -1);
      }
    }

    es6CodeChange = false;
  });

  es5AstSession.on('throttled-change', function() {
    if (es5AstObject === false) {
      es5CodeString = false;
      es5CodeEditor.setValue(null, -1);

    } else {

      if (!es6AstChange) try { // changed directly
        // console.log('es5 ast was edited manually. evaluating.');
        es5AstObject = destruct(es5AstEditor.getValue());
      } catch(e) {
        es5CodeString = false;
        es5CodeEditor.setValue(e.message, -1);
        return;
      }

      try {
        es5CodeString = generate(es5AstObject);
        es5CodeEditor.setValue(es5CodeString, -1);
      } catch(e) { // generation failed
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

  $('#run').on('click', function() {
    eval(es5CodeEditor.getValue());
  });

  var localCode = localStorage.getItem('code');
  if (localCode) es6CodeEditor.setValue(localCode, -1);

});
