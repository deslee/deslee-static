var fs = require('fs');
var jade = require('jade');


/* TEMPLATE COMPILATION PHASE */
var templates = {};

/* read layout as strings */
[
    {
        name: 'index',
        templatePath: './src/pages/blogindex.jade',
        outputPath: './output/'
    },
    {
        name: 'post',
        templatePath: './src/pages/post.jade',
        outputPath: './output/'
    },
    {
        name: 'tags',
        templatePath: './src/pages/tagsPage.jade',
        outputPath: './output/tag'
    },
    {
        name: 'archive',
        templatePath: './src/pages/archive.jade',
        outputPath: './output/archive'
    },
    {
        name: '404',
        templatePath: './src/pages/404.jade',
        outputPath: './output/'
    }
].forEach(function(template) {
    var source = fs.readFileSync(template.templatePath);
    generateTemplate(template, source);
});

/* use jade to make template compilers */
function generateTemplate(template, source) {
    var templatePath = template.templatePath,
        outputPath = template.outputPath;
    template.compile = jade.compile(source, {filename: templatePath});
    templates[template.name] = template;
}

module.exports = templates;