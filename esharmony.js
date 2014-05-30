'use strict';

var $ = require('elements');
var ready = require('elements/domready');

var transform = require('quickstart-next');

var esprima = require('esprima');
var escodegen = require('escodegen');

var Highlight = require('highlight.js/lib/highlight');
var hl = new Highlight;

hl.registerLanguage('json', require('highlight.js/lib/languages/json.js'));
hl.registerLanguage('javascript', require('highlight.js/lib/languages/javascript.js'));

// var replacer = function(match, pIndent, pKey, pVal, pEnd) {
//   var key = '<span class=json-key>';
//   var val = '<span class=json-value>';
//   var str = '<span class=json-string>';
//   var r = pIndent || '';
//   if (pKey)
//      r = r + key + pKey.replace(/[": ]/g, '') + '</span>: ';
//   if (pVal)
//     r = r + (pVal[0] == '"' ? str : val) + pVal + '</span>';
//   return r + (pEnd || '');
// };

// var prettyPrint = function(obj) {
//   var jsonLine = /^( *)("[\w]+": )?("[^"]*"|[\w.+-]*)?([,[{])?$/mg;
//   return JSON.stringify(obj, null, 2)
//      .replace(/&/g, '&amp;').replace(/\\"/g, '&quot;')
//      .replace(/</g, '&lt;').replace(/>/g, '&gt;')
//      .replace(jsonLine, replacer);
// };

ready(function() {
  var textarea = $('#es6-code');
  var es6AstNode = $('#es6-ast');
  var es5AstNode = $('#es5-ast');
  var transformNode = $('#es5-code');

  var height = window.innerHeight;

  textarea[0].style.height = (height / 2 ) + 'px';
  transformNode.parent()[0].style.height = (height / 2 ) + 'px';
  es5AstNode.parent()[0].style.height = (height / 2 ) + 'px';
  es6AstNode.parent()[0].style.height = (height / 2 ) + 'px';

  var render = function() {
    var pretty;

    try {
      var parsed = esprima.parse(textarea.value());
      pretty = hl.highlight('javascript', JSON.stringify(parsed, null, 2));
      es6AstNode.html(pretty.value);

      try {
        parsed = transform(parsed);
        pretty = hl.highlight('javascript', JSON.stringify(parsed, null, 2));
        es5AstNode.html(pretty.value);

        try {
          var code = escodegen.generate(parsed, {
            format: {
              indent: { style: '  ' },
              quotes: 'single'
            }
          });

          transformNode.html(hl.highlight('javascript', code).value);
        } catch(e) { // generation failed
          transformNode.text(e.message);
        }
      } catch (e) { // ast transform failed
        es5AstNode.text(e.message);
        transformNode.text('');
      }


    } catch(e) { // parse failed
      es6AstNode.text(e.message);
      es5AstNode.text('');
      transformNode.text('');
    }
  };

  textarea.on('keyup', render);
  render();

});
