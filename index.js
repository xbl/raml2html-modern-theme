'use strict';

const nunjucks = require('nunjucks');
const markdown = require('nunjucks-markdown');
const marked = require('marked');
const Minimize = require('minimize');
const pretty = require('pretty');
const path = require('path');
const fs = require('fs');

/**
 * @param {String} [mainTemplate] - The filename of the main template, leave empty to use default templates
 * @returns {{processRamlObj: Function, postProcessHtml: Function}}
 */
function getConfigForTemplate() {
  const mainTemplate = `${__dirname}/dist/index.nunjucks`;
  const templatesPath = path.dirname(fs.realpathSync(mainTemplate));
  const templateFile = path.basename(fs.realpathSync(mainTemplate));

  return {
    processRamlObj(ramlObj, config, options) {
      // Extend ramlObj with config and options so the templates can use those values
      ramlObj.config = config;
      ramlObj.options = options;

      const renderer = new marked.Renderer();
      renderer.table = function(thead, tbody) {
        // Render Bootstrap style tables
        return `<table class="table"><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
      };

      // Setup the Nunjucks environment with the markdown parser
      const env = nunjucks.configure(templatesPath, { autoescape: false });

      markdown.register(env, md => marked(md, { renderer }));

      ramlObj.isStandardType = function(type) {
        if (typeof type === 'object') {
          return false;
        }
        return type && type.indexOf('{') === -1 && type.indexOf('<') === -1;
      };

      // Render the main template using the raml object and fix the double quotes
      let html = env.render(templateFile, ramlObj);
      // html = html.replace(/&quot;/g, '"');

      // Return the promise with the html
      return new Promise(resolve => {
        resolve(html);
      });
    },

    postProcessHtml(html, config, options) {
      if (options.pretty) {
        return pretty(html, { ocd: true });
      } else {
        // Minimize the generated html and return the promise with the result
        const minimize = new Minimize({ quotes: true });

        return new Promise((resolve, reject) => {
          minimize.parse(html, (error, result) => {
            if (error) {
              reject(new Error(error));
            } else {
              resolve(result);
            }
          });
        });
      }
    },
  };
}

module.exports = function() {
  return getConfigForTemplate();
};

if (require.main === module) {
  console.error(
    "This script is meant to be used as a library. You probably want to run bin/raml2html if you're looking for a CLI."
  );
  process.exit(1);
}
