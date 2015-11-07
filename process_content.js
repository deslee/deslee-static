/* CONTENT PROCESSING PHASE */
/* reads all the things in the content directory */
var fs = require('fs');
var path = require('path');
var marked = require('meta-marked');
var moment = require('moment');

var tags = {};
var all_posts = {};

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
    if (post.tags && post.tags.constructor === Array) {
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

module.exports = {
    all_posts: all_posts,
    tags: tags
};