// Load modules

var Hapi = require('hapi');


// Declare internals

var internals = {};


exports = module.exports = internals.Store = function () {

    this._tree = {};
};


internals.Store.prototype.load = function (tree) {

    var err = internals.validate(tree);
    if (err) {
        return err;
    }

    this._tree = tree;
};


// Get a filtered value

internals.Store.prototype.get = function (key, criteria, depth) {

    // Parse key

    var path = [];
    if (key !== '/') {
        var invalid = key.replace(/\/(\w+)/g, function ($0, $1) {

            path.push($1);
            return '';
        });

        if (invalid) {
            return null;
        }
    }

    // Find tree node

    var node = internals.filter(this._tree, criteria);
    for (var i = 0, il = path.length; i < il && node; ++i) {
        if (typeof node !== 'object') {
            node = null;
            break;
        }

        node = internals.filter(node[path[i]], criteria);
    }

    return internals.walk(node, criteria, depth);
};


// Read raw value

internals.Store.prototype.read = function (key) {

    // Parse key

    var path = [];
    if (key !== '/') {
        var invalid = key.replace(/\/((?:\$default)|(?:\$filter)|(?:\w+))/g, function ($0, $1) {

            path.push($1);
            return '';
        });

        if (invalid) {
            return null;
        }
    }

    // Find tree node

    var node = this._tree;
    for (var i = 0, il = path.length; i < il && node; ++i) {
        node = node[path[i]];
    }

    return node || null;            // Override undefined
};


internals.Store.prototype.addNode = function (path, key, values) {


};


// Validate tree structure

internals.validate = function (node, path) {

    path = path || '';

    var error = function (reason) {

        var e = new Error(reason);
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
                if (!filter ||
                    typeof filter !== 'string' ||
                    !filter.match(/\w+/)) {

                    return error('Invalid filter value ' + node[key] + ' for key ' + key);
                }
            }
            else if (key === '$default') {
                found.default = true;
                var err = internals.validate(node.$default, path + '/$default');
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
            if (!key.match(/\w+/)) {
                return error('Invalid key string ' + key);
            }

            var value = node[key];
            var err = internals.validate(value, path + '/' + key);
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
        return error('Filter without an values');
    }

    if (found.filter && found.default && !found.key) {
        return error('Filter with only a default');
    }

    // Valid node

    return null;
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
