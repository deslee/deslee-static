/* CONTENT PROCESSING PHASE */
/* reads all the things in the content directory */
var fs = require('fs');
var path = require('path');
var marked = require('meta-marked');
var moment = require('moment');
var utils = require('./blogutils')

var tags = {};
var all_posts = {};

var CONTENT_SUMMARY_COUNT = 20;

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

    var chunks = res.html.replace(/(<([^>]+)>)/ig, '').split(" ");

    res.meta.preview = chunks.slice(0, Math.min(chunks.length-1, CONTENT_SUMMARY_COUNT)).join(' ');

    var post = all_posts[slug] = res.meta;
    if (post.tags && post.tags.constructor === Array) {
        post.tags.forEach(function(tag) {
            if (!post.page && !post.draft) {
                addTag(tag, post);
            }
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