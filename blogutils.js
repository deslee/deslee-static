var fs = require('fs');
var zlib = require('zlib');

module.exports = {
    sort_posts: function sort_posts(post_a, post_b) {
        if (post_a.date.isBefore(post_b.date)) {
            return -1;
        } else if (post_a.date.isSame(post_b.date, "day")) {
            return 0;
        } else {
            return 1;
        }
    },

    filterOutPagesAndDrafts: function filterOutPagesAndDrafts(all_posts, slug) {
        return !(all_posts[slug].page || all_posts[slug].draft);
    },

    writeCompressedOutputToFile: function writeCompressedOutputToFile(input, debug, filePath) {
        var writeFunc = function(err, output) {
            if (err) {
                console.error("error writing to path ", filePath)
                console.error(err);
                return;
            }

            fs.writeFile(filePath,
                output
            );
        };
        if (!debug) {
            zlib.gzip(input, writeFunc);
        } else {
            writeFunc(null, input);
        }
    }
};