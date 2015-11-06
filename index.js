var fs = require('fs');
var path = require('path');

var mkdirp = require('mkdirp');
var rimraf = require('rimraf');
var cssnext = require('cssnext');
var jade = require('jade');
var marked = require('meta-marked');

/* clean */
rimraf.sync('./output');
mkdirp.sync('./output/css');


var templates = {};

var tags = {};
var contents = {};

/* css */
fs.readFile('./src/styles/base.css', 'utf8', function(err, data) {
    var output = cssnext(data, {
        from: "./src/styles/base.css",
        compress: true
    });
    fs.writeFile('./output/css/style.css', output);
});


/* TEMPLATE COMPILATION PHASE */
/* read layout files */
[
    {
        name: 'index',
        templatePath: './src/pages/blogindex.jade',
        outputPath: './output/index.html'
    },
    {
        name: 'post',
        templatePath: './src/pages/blogpost.jade',
        outputPath: './output/blog.html'
    }
].forEach(function(template) {
    var source = fs.readFileSync(template.templatePath);
    generateTemplate(template, source);
});

/* compiles the template with jade */
function generateTemplate(template, source) {
    var templatePath = template.templatePath,
        outputPath = template.outputPath;
    template.compile = jade.compile(source, {filename: templatePath});
    templates[template.name] = template;
}

/* CONTENT PROCESSING PHASE */
/* reads all the content */
fs.readdirSync('./content').forEach(function(file) {
    var content = fs.readFileSync(path.join('./content', file), 'utf-8');
    var extension = path.extname(file).toLowerCase();
    var basename = path.basename(file, extension);
    processContent(content, basename, extension);
});

function processContent(content, slug, extension) {
    switch(extension) {
        case '.md':
            processMarkdownContent(slug, content);
            break;
    }
}

function processMarkdownContent(slug, content) {
    var res = marked(content);
    res.meta.html = res.html;

    var post = contents[slug] = res.meta;
    if (post.tags.constructor === Array) {
        post.tags.forEach(function(tag) {
           addTag(tag, post);
        });
    }
}

function addTag(tag, post) {
    if (!tags[tag]) {
        tags[tag] = [];
    }
    tags[tag].push(post);
}


/* GENERATION PHASE */
// now we must generate the stuff!
var index = templates['index'];
fs.writeFileSync(index.outputPath, index.compile(getScope(contents)));

function getScope(contents) {
    return {
        logo: "https://deslee.me/assets/face.jpg",

        title: "Desmond Lee",

        nav: [
            {
                name: "Home"
            },
            {
                name: "About"
            },
            {
                name: "Archive"
            },
            {
                name: "Projects"
            },

        ],

        blog: Object.keys(contents).filter(function(slug) {
            return true;
        }).map(function(slug) {
            var content = contents[slug];
            console.log(content);
            return {
                title: content.title,
                date: content.date,
                tags: content.tags,
                preview: 'I have begun experimenting with Google Apps Application APIs, with the intention of building a Javascript client-side application to interface with Google Calendar. »'
            }
        })
    };
}