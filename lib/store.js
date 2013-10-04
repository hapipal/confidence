// Load modules

var Hoek = require('hoek');
var Boom = require('boom');


// Declare internals

var internals = {};


exports = module.exports = internals.Store = function (document) {

    this.load(document || {});
};


internals.Store.prototype.load = function (document) {

    var err = internals.Store.validate(document);
    Hoek.assert(!err, err);

    this._tree = Hoek.clone(document);
};


// Get a filtered value

internals.Store.prototype.get = function (key, criteria) {

    var node = this._get(key, criteria);
    return internals.walk(node, criteria);
};


internals.Store.prototype._get = function (key, criteria) {

    var self = this;

    criteria = criteria || {};

    var path = [];
    if (key !== '/') {
        var invalid = key.replace(/\/(\w+)/g, function ($0, $1) {

            path.push($1);
            return '';
        });

        if (invalid) {
            return undefined;
        }
    }

    var node = internals.filter(self._tree, criteria);
    for (var i = 0, il = path.length; i < il && node; ++i) {
        if (typeof node !== 'object') {
            node = undefined;
            break;
        }

        node = internals.filter(node[path[i]], criteria);
    }

    return node;
};


// Get a meta for node

internals.Store.prototype.meta = function (key, criteria) {

    var node = this._get(key, criteria);
    return (typeof node === 'object' ? node.$meta : undefined);
};


// Return node or value if no filter, otherwise apply filters until node or value

internals.filter = function (node, criteria) {

    if (!node ||
        typeof node !== 'object' ||
        (!node.$filter && !node.$value)) {

        return node;
    }

    if (node.$value) {
        return internals.filter(node.$value, criteria);
    }

    // Filter

    var filter = node.$filter;
    var criterion = Hoek.reach(criteria, filter);

    if (criterion !== undefined) {
        var sub = (node.$range ? internals.range(node.$range, criterion, node.$default) : node[criterion]);
        return internals.filter(sub, criteria);
    }
    else if (node.hasOwnProperty('$default')) {
        return internals.filter(node.$default, criteria);
    }
    else {
        return undefined;
    }
};


// Find nearest range entry

internals.range = function ($range, criterion, $default) {

    for (var i = 0, il = $range.length; i < il; ++i) {
        if (criterion <= $range[i].limit) {
            return $range[i].value;
        }
    }

    return $default;
};


// Applies criteria on an entire tree

internals.walk = function (node, criteria) {

    if (!node ||
        typeof node !== 'object') {

        return node;
    }

    if (node.hasOwnProperty('$value')) {
        return internals.walk(node.$value, criteria);
    }

    var parent = (node instanceof Array ? [] : {});

    var keys = Object.keys(node);
    for (var i = 0, il = keys.length; i < il; ++i) {
        var key = keys[i];
        if (key === '$meta') {
            continue;
        }
        var child = internals.filter(node[key], criteria);
        var value = internals.walk(child, criteria);
        if (value !== undefined) {
            parent[key] = value;
        }
    }

    return parent;
};


// Validate tree structure

internals.Store.validate = function (node, path) {

    path = path || '';

    var error = function (reason) {

        var e = Boom.badRequest(reason);
        e.path = path || '/';
        return e;
    };

    // Valid value

    if (node === null ||
        node === undefined ||
        typeof node !== 'object') {
        return null;
    }

    // Invalid object

    if (node instanceof Error ||
        node instanceof Date ||
        node instanceof RegExp) {

        return error('Invalid node object type');
    }

    // Invalid keys

    var found = {};
    var keys = Object.keys(node);
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

                if (!filter.match(/^\w+(?:\.\w+)*$/)) {
                    return error('Invalid filter value ' + node[key]);
                }
            }
            else if (key === '$range') {
                found.range = true;
                if (node.$range instanceof Array === false) {
                    return error('Range value must be an array');
                }

                if (!node.$range.length) {
                    return error('Range must include at least one value');
                }

                var lastLimit = 0;
                for (var r = 0, rl = node.$range.length; r < rl; ++r) {
                    var range = node.$range[r];
                    if (typeof range !== 'object') {
                        return error('Invalid range entry type');
                    }

                    if (!range.limit) {
                        return error('Range entry missing limit');
                    }

                    if (typeof range.limit !== 'number') {
                        return error('Range limit must be a number');
                    }

                    if (range.limit <= lastLimit) {
                        return error('Range entries not sorted in ascending order - ' + range.limit + ' cannot come after ' + lastLimit);
                    }

                    lastLimit = range.limit;

                    if (!range.hasOwnProperty('value')) {
                        return error('Range entry missing value');
                    }

                    var err = internals.Store.validate(range.value, path + '/$range[' + range.limit + ']');
                    if (err) {
                        return err;
                    }
                }
            }
            else if (key === '$default') {
                found.default = true;
                var err = internals.Store.validate(node.$default, path + '/$default');
                if (err) {
                    return err;
                }
            }
            else if (key === '$meta') {
                found.meta = true;
            }
            else if (key === '$value') {
                found.value = true;
                var err = internals.Store.validate(node.$value, path + '/$value');
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

    if (found.filter && !found.default && !found.key && !found.range) {
        return error('Filter without any values');
    }

    if (found.filter && found.default && !found.key && !found.range) {
        return error('Filter with only a default');
    }

    if (found.range && !found.filter) {
        return error('Range without a filter');
    }

    if (found.range && found.key) {
        return error('Range with non-ranged values');
    }

    if (found.value && (found.key || found.range || found.default || found.filter)) {
        return error('Value directive can only be used with meta or nothing');
    }

    // Valid node

    return null;
};
