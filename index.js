var fs = require('fs');
var path = require('path');

var mkdirp = require('mkdirp');
var rimraf = require('rimraf');
var cssnext = require('cssnext');
var zlib = require('zlib');
var crypto = require('crypto');
var stream = require('stream');

var debug = false;

var utils = require('./blogutils');

process.argv.forEach(function(val, index, array) {
    console.log(val, index);
    if (index == 2 && val == "debug") {
        console.log("running in debug mode");
        debug = true;
    }
});

var paginator_generator = require('./paginator_generator');

/* clean */
rimraf.sync('./output');
mkdirp.sync('./output/css');

/* define variables */

var templates = require('./generate_templates');
var process_result = require('./process_content');
var all_posts = process_result.all_posts;
var tags = process_result.tags;

/* define global page variables */
var cryptohash = crypto.randomBytes(16).toString('hex');
var scope = {
    logo: "face-sm." + cryptohash + ".cached.jpg",
    title: "Desmond Lee",
    meta_author: "Desmond Lee",
    meta_url: "http://deslee.me",
    nav: [
        {
            name: "Home",
            href: ''
        },
        {
            name: "About",
            href: 'about'
        },
        {
            name: "Archive",
            href: 'archive'
        },
        /*{
            name: "Projects",
            href: 'projects'
        }*/
    ],
    cache_hash: cryptohash
};

/* compile the css */
fs.readFile('./src/styles/base.css', 'utf8', function(err, data) {
    var output = cssnext(data, {
        from: "./src/styles/base.css",
        compress: true
    });

    // compress gzip
    var s = new stream.Readable();
    s._read = function noop(){}
    s.push(output);
    s.push(null);

    if (!debug) {
        s = s.pipe(zlib.createGzip());
    }
    s.pipe(fs.createWriteStream('./output/css/style.' + scope.cache_hash + '.cached.css'));
});

/* WRITING PHASE */
// now we must generate the stuff!
var index = templates['index'];
var post = templates['post'];
var tagsTemplate = templates['tags'];

// generate each post page
Object.keys(all_posts).forEach(function(slug) {
    var content = all_posts[slug];
    mkdirp(path.join(post.outputPath, slug), function(err) {
        if (err) {
            console.error(err);
            return;
        }

        var postContent = post.compile(
            Object.assign({},
                scope,
                {
                    base: '../',
                    post:content,
                    pagetitle: content.title,
                    meta_description: content.preview
                }
            )
        );

        utils.writeCompressedOutputToFile(postContent, debug, path.join(post.outputPath, slug, "index.html"))

    });
});

// generate front page
(function() {

    var posts = Object.keys(all_posts).filter(utils.filterOutPagesAndDrafts.bind(null, all_posts)).map(function(slug) {
        return all_posts[slug];
    }).sort(utils.sort_posts).reverse();

    var paginator = paginator_generator(posts, 4);
    for (var i = 1; i <= paginator.count; ++i) {
        mkdirp(path.join(index.outputPath, i+""), function(i, err) {
            if (err) {
                console.error(err);
                return;
            }
            var fileName = i == 1 ?
                path.join(index.outputPath, "index.html") :
                path.join(index.outputPath, i+"", "index.html");

            var indexContent = index.compile(
                Object.assign({}, scope,
                    {
                        base: i == 1 ? './' : '../',
                        index: i,
                        paginator: paginator,
                        pagetitle: scope.title
                    }
                )
            );

            utils.writeCompressedOutputToFile(indexContent, debug, fileName)
        }.bind(null, i));
    }



})();

// generate tag pages
(function() {

    Object.keys(tags).forEach(function(tag) {
        mkdirp(path.join(tagsTemplate.outputPath, tag), function(err) {
            if (err) {
                console.error(err);
                return;
            }


            var paginator = paginator_generator(tags[tag].sort(utils.sort_posts).reverse(), 5);
            for (var i = 1; i <= paginator.count; ++i) {

                var fileName = i == 1 ?
                    path.join(tagsTemplate.outputPath, tag, "index.html") :
                    path.join(tagsTemplate.outputPath, tag, i+"", "index.html");
                mkdirp(path.join(tagsTemplate.outputPath, tag, i+""), function(i, err) {

                    if (err) {
                        console.error(err);
                        return;
                    }

                    var tagsPageContent = tagsTemplate.compile(
                        Object.assign({},
                            scope,
                            {
                                base: i == 1 ? '../../' : '../../../',
                                index: i,
                                paginator: paginator,
                                tag: tag,
                                pagetitle: 'Posts tagged with ' + tag
                            }
                        )
                    )


                    utils.writeCompressedOutputToFile(tagsPageContent, debug, fileName)
                }.bind(null, i));
            }
        });
    });

})();


// generate archives page

(function() {

    var posts = Object.keys(all_posts).filter(utils.filterOutPagesAndDrafts.bind(null, all_posts)).map(function(slug) {
        return all_posts[slug];
    }).sort(utils.sort_posts).reverse();

    var archiveTemplate = templates['archive'];

    mkdirp(path.join(archiveTemplate.outputPath), function(err) {

        if (err) {
            console.error(err);
            return;
        }

        var archivesPageContent = archiveTemplate.compile(Object.assign({},
            scope,
            {
                posts: posts,
                base: '../',
                pagetitle: 'Archive'
            }
        ));
        utils.writeCompressedOutputToFile(archivesPageContent, debug, path.join(archiveTemplate.outputPath, "index.html"))


    });

})();

var notFoundTemplate = templates['404'];
/* generate 404 */
(function() {

    mkdirp(path.join(notFoundTemplate.outputPath), function(err) {

        if (err) {
            console.error(err);
            return;
        }

        utils.writeCompressedOutputToFile(notFoundTemplate.compile(
            Object.assign({},
                scope,
                {
                    pagetitle: 'Archive'
                }
            )
        ), debug, path.join(notFoundTemplate.outputPath, "404.html"))


    });

})();


/* COPY OTHER FILES */
(function(){
    fs.createReadStream("./src/favicon.ico").pipe(fs.createWriteStream("./output/favicon.ico"));
    fs.createReadStream("./src/face-sm.jpg").pipe(fs.createWriteStream("./output/face-sm." + scope.cache_hash + ".cached.jpg"));
})();