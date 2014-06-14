'use strict';

var throttle = require('./util/throttle');

var $ = require('elements');
var ready = require('elements/domready');

var harmonize = require('harmonizer');
var library = require('harmonizer/library');
var Symbol = global.Symbol = library.Symbol;

var esprima = require('esprima');
var escodegen = require('escodegen');

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
    editorSession._emit('actual-change');
  });

  editorSession.on('change', throttled);

  return editor;
};

ready(function() {

  var es6CodeNode = $('#es6-code');
  var es5CodeNode = $('#es5-code');
  var es6AstNode = $('#es6-ast');
  var es5AstNode = $('#es5-ast');

  var nodes = $([es6CodeNode, es5CodeNode, es6AstNode, es5AstNode]);

  var es6CodeEditor = createEditor(es6CodeNode, 'javascript');
  var es6CodeSession = es6CodeEditor.getSession();

  var es5CodeEditor = createEditor(es5CodeNode, 'javascript', true);
  var es5CodeSession = es5CodeEditor.getSession();

  var es6AstEditor = createEditor(es6AstNode, 'json', true);
  var es6AstSession = es6AstEditor.getSession();

  var es5AstEditor = createEditor(es5AstNode, 'json', true);
  var es5AstSession = es5AstEditor.getSession();

  var es6AstValue, es5AstValue, es5CodeValue;

  var changing = false;

  es6CodeSession.on('actual-change', function(e) {
    var code = es6CodeEditor.getValue();
    localStorage.setItem('code', code);

    try {
      es6AstValue = esprima.parse(code);
      es6AstEditor.setValue(JSON.stringify(es6AstValue, null, 2), -1);
      es6AstValue = null;
    } catch(e) { // parse failed
      es6AstValue = false;
      es6AstEditor.setValue(e.message, -1);
    }

  });

  es6AstSession.on('actual-change', function(e) {

    if (es6AstValue === false) {
      es5AstValue = false;
      es5AstEditor.setValue(null, -1);

    } else {
      var parsed = es6AstValue;

      if (!parsed) try {
        parsed = JSON.parse(es6AstEditor.getValue())
      } catch(e) {
        es5AstValue = false;
        es5AstEditor.setValue(null, -1);
        return;
      }

      try {
        es5AstValue = harmonize(parsed);
        es5AstEditor.setValue(JSON.stringify(es5AstValue, null, 2), -1);
        es5AstValue = null;
      } catch (e) { // ast harmonization failed
        es5AstValue = false;
        es5AstEditor.setValue(e.message, -1);
      }
    }
  });

  es5AstSession.on('actual-change', function(e) {
    if (es5AstValue === false) {
      es5CodeValue = false;
      es5CodeEditor.setValue(null, -1);

    } else {
      var parsed = es5AstValue;

      if (!parsed) try {
        parsed = JSON.parse(es5AstEditor.getValue());
      } catch(e) {
        es5CodeValue = false;
        es5CodeEditor.setValue(null, -1);
        return;
      }

      try {
        es5CodeValue = escodegen.generate(parsed, {
          format: {
            indent: { style: '  ' },
            quotes: 'single'
          }
        });

        es5CodeEditor.setValue(es5CodeValue, -1);
        es5CodeValue = null;
      } catch(e) { // generation failed
        es5CodeValue = false;
        es5CodeEditor.setValue(e.message, -1);
      }
    }

  });

  $('#run').on('click', function() {
    eval(es5CodeEditor.getValue());
  });

  var code = localStorage.getItem('code');
  if (code) es6CodeEditor.setValue(code, -1);

});
