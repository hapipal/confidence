// Load modules

var Hapi = require('hapi');


// Declare internals

var internals = {};


exports = module.exports = internals.Store = function () {

    this._tree = {};
};


internals.Store.prototype.load = function (tree) {

    var err = internals.Store.validate(tree);
    if (err) {
        return err;
    }

    this._tree = Hapi.utils.clone(tree);
    return null;
};


// Get a filtered value

internals.Store.prototype.get = function (key, criteria, depth, next) {

    var self = this;

    internals.parseKey(key, /\/(\w+)/g, function (err, path) {

        if (err) {
            return next(err);
        }

        var node = internals.filter(self._tree, criteria);
        for (var i = 0, il = path.length; i < il && node; ++i) {
            if (typeof node !== 'object') {
                node = null;
                break;
            }

            node = internals.filter(node[path[i]], criteria);
        }

        return next(null, internals.walk(node, criteria, depth));
    });
};


// Read raw value

internals.Store.prototype.read = function (key, next) {

    var self = this;

    internals.parseKey(key, /\/((?:\$default)|(?:\$filter)|(?:\w+))/g, function (err, path) {

        if (err) {
            return next(err);
        }

        var node = self._tree;
        for (var i = 0, il = path.length; i < il && node; ++i) {
            node = node[path[i]];
        }

        return next(null, node || null);                // Override undefined
    });
};


// Write node

internals.Store.prototype.write = function (key, value, next) {

    var self = this;

    var err = internals.Store.validate(value);
    if (err) {
        return next(err);
    }

    internals.parseKey(key, /\/((?:\$default)|(?:\w+))/g, function (err, path) {

        if (err) {
            return next(err);
        }

        if (path.length === 0) {
            self._tree = Hapi.utils.clone(value);
            return next();
        }

        var node = self._tree;
        for (var i = 0, il = path.length; i < il - 1 && node; ++i) {
            node = node[path[i]];
        }

        if (!node) {
            return next(Hapi.error.notFound('Key path does not exist'));
        }

        var tail = path[il - 1];
        if (tail === '$default' &&
            !node.$filter) {

            return next(Hapi.error.badRequest('Cannot add default value to a node without a filter'));
        }

        node[tail] = value;
        return next();
    });
};


// Validate tree structure

internals.Store.validate = function (node, path) {

    path = path || '';

    var error = function (reason) {

        var e = Hapi.error.badRequest(reason);
        e.path = path || '/';
        return e;
    };

    // NULL or undefined

    if (node === null ||
        node === undefined) {

        return error('Node cannot be null or undefined');
    }

    // Valid value

    if (typeof node !== 'object') {
        return null;
    }

    // Invalid object

    if (node instanceof Array ||
        node instanceof Error ||
        node instanceof Date ||
        node instanceof RegExp) {

        return error('Invalid node object type');
    }

    // Empty object

    var keys = Object.keys(node);
    if (keys.length === 0) {
        return error('Node cannot be empty');
    }

    // Invalid keys

    var found = {};
    for (var i = 0, il = keys.length; i < il; ++i) {
        var key = keys[i];
        if (key[0] === '$') {
            if (key === '$filter') {
                found.filter = true;
                var filter = node[key];
                if (!filter) {
                    return error('Invalid empty filter value');
                }

                if (typeof filter !== 'string') {
                    return error('Filter value must be a string');
                }

                if (!filter.match(/^\w+$/)) {
                    return error('Invalid filter value ' + node[key]);
                }
            }
            else if (key === '$default') {
                found.default = true;
                var err = internals.Store.validate(node.$default, path + '/$default');
                if (err) {
                    return err;
                }
            }
            else {
                return error('Unknown $ directive ' + key);
            }
        }
        else {
            found.key = true;
            if (!key.match(/^\w+$/)) {
                return error('Invalid key string ' + key);
            }

            var value = node[key];
            var err = internals.Store.validate(value, path + '/' + key);
            if (err) {
                return err;
            }
        }
    }

    // Invalid directive combination

    if (found.default && !found.filter) {
        return error('Default value without a filter');
    }

    if (found.filter && !found.default && !found.key) {
        return error('Filter without any values');
    }

    if (found.filter && found.default && !found.key) {
        return error('Filter with only a default');
    }

    // Valid node

    return null;
};


// Parse key into valid segments

internals.parseKey = function (key, exp, next) {

    var path = [];
    if (key !== '/') {
        var invalid = key.replace(exp, function ($0, $1) {

            path.push($1);
            return '';
        });

        if (invalid) {
            return next(Hapi.error.badRequest('Bad key segment: ' + invalid));
        }
    }

    return next(null, path);                // Override undefined
};


// Return node or value if no filter, otherwise apply filters until node or value

internals.filter = function (node, criteria) {

    if (!node ||
        typeof node !== 'object' ||         // Value
        !node.$filter) {                    // Fork

        return node || null;                // Override undefined
    }

    // Filter

    var filter = node.$filter;
    var criterion = criteria[filter];

    if (criterion) {
        var sub = node[criterion];
        if (!sub) {
            return null;
        }

        return internals.filter(sub, criteria);
    }
    else if (node.$default) {
        return internals.filter(node.$default, criteria);
    }
    else {
        return null;
    }
};


// Applies criteria on an entire tree

internals.walk = function (node, criteria, depth) {

    if (!node ||
        typeof node !== 'object') {

        return node || null;                // Override undefined
    }

    if (depth === 0) {
        return {};
    }

    var parent = {};

    var keys = Object.keys(node);
    for (var i = 0, il = keys.length; i < il; ++i) {
        var key = keys[i];
        var child = internals.filter(node[key], criteria);
        var value = internals.walk(child, criteria, depth !== undefined ? depth - 1 : undefined);
        if (value) {
            parent[key] = value;
        }
    }

    return parent;
};
