module.exports = function(posts, num) {
    return {
        count: Math.ceil(posts.length / num),
        resolve: function(index) {
            var i = index-1;
            return posts.slice(i*num, Math.min(i*num+num, posts.length));
        }
    }
};