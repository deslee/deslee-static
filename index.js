var fs = require('fs');
var path = require('path');

var mkdirp = require('mkdirp');
var rimraf = require('rimraf');
var cssnext = require('cssnext');
var zlib = require('zlib');
var crypto = require('crypto');
var stream = require('stream');

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

    s.pipe(zlib.createGzip()).pipe(fs.createWriteStream('./output/css/style.' + scope.cache_hash + '.cached.css'));
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

        writeCompressedOutputToFile(postContent, path.join(post.outputPath, slug, "index.html"))

    });
});

// generate front page
(function() {

    var posts = Object.keys(all_posts).filter(function(slug) {
        return !all_posts[slug].page;
    }).map(function(slug) {
        return all_posts[slug];
    }).sort(sort_posts).reverse();

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

            writeCompressedOutputToFile(indexContent, fileName)
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


            var paginator = paginator_generator(tags[tag].sort(sort_posts).reverse(), 5);
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


                    writeCompressedOutputToFile(tagsPageContent, fileName)
                }.bind(null, i));
            }
        });
    });

})();


// generate archives page

(function() {

    var posts = Object.keys(all_posts).filter(function(slug) {
        return !all_posts[slug].page;
    }).map(function(slug) {
        return all_posts[slug];
    }).sort(sort_posts).reverse();

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
        writeCompressedOutputToFile(archivesPageContent, path.join(archiveTemplate.outputPath, "index.html"))


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

        writeCompressedOutputToFile(notFoundTemplate.compile(
            Object.assign({},
                scope,
                {
                    pagetitle: 'Archive'
                }
            )
        ), path.join(notFoundTemplate.outputPath, "404.html"))


    });

})();


/* COPY OTHER FILES */
(function(){
    fs.createReadStream("./src/favicon.ico").pipe(fs.createWriteStream("./output/favicon.ico"));
    fs.createReadStream("./src/face-sm.jpg").pipe(fs.createWriteStream("./output/face-sm." + scope.cache_hash + ".cached.jpg"));
})();

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


function writeCompressedOutputToFile(output, filePath) {
    zlib.gzip(output, function(err, zipped) {
        if (err) {
            console.error("error writing to path ", filePath)
            console.error(err);
            return;
        }

        fs.writeFile(filePath,
            zipped
        );
    });
}