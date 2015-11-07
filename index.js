var fs = require('fs');
var path = require('path');

var mkdirp = require('mkdirp');
var rimraf = require('rimraf');
var cssnext = require('cssnext');
var jade = require('jade');
var marked = require('meta-marked');
var moment = require('moment');

/* clean */
rimraf.sync('./output');
mkdirp.sync('./output/css');

/* define variables */

var templates = {};
var tags = {};
var all_posts = {};

var scope = {
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
        }

    ]
};

/* compile the css */
fs.readFile('./src/styles/base.css', 'utf8', function(err, data) {
    var output = cssnext(data, {
        from: "./src/styles/base.css",
        compress: true
    });
    fs.writeFile('./output/css/style.css', output);
});


/* TEMPLATE COMPILATION PHASE */

/* read layout as strings */
[
    {
        name: 'index',
        templatePath: './src/pages/blogindex.jade',
        outputPath: './output/index.html'
    },
    {
        name: 'post',
        templatePath: './src/pages/blogpost.jade',
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

/* CONTENT PROCESSING PHASE */
/* reads all the things in the content directory */
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
    res.meta.slug = slug;
    res.meta.date = moment(res.meta.date);
    res.meta.preview = res.html.replace(/(<([^>]+)>)/ig, '').split(" ").slice(0, content.summary_count ? content.summary_count : 20).join(' ');

    var post = all_posts[slug] = res.meta;
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
var post = templates['post'];



// generate front page
fs.writeFile(index.outputPath, index.compile(
    Object.assign(
        {
            blog: Object.keys(all_posts).filter(function(slug) {
                return true;
            }).map(function(slug) {
                return all_posts[slug];
            }).sort(sort_posts).reverse()
        }, scope
    )
));

// generate each post page
Object.keys(all_posts).forEach(function(slug) {
    var content = all_posts[slug];
    mkdirp(path.join(post.outputPath, slug), function(err) {
        if (err) {
            console.error(err);
            return;
        }
        fs.writeFile(path.join(post.outputPath, slug, "index.html"),
            post.compile(
                Object.assign(
                    {base: '../', post:content},
                    scope
                )
            )
        );
    });
});


/* utility functions */

// sort function
function sort_posts(post_a, post_b) {
    if (post_a.date.isBefore(post_b.date)) {
        return -1;
    } else if (post_a.date.isSame(post_b.date, "day")) {
        return 0;
    } else {
        return 1;
    }
}