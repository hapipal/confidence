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

internals.Store.prototype.get = function (key, criteria, applied) {

    var node = this._get(key, criteria, applied);
    return internals.walk(node, criteria, applied);
};


internals.Store.prototype._get = function (key, criteria, applied) {

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

    var node = internals.filter(self._tree, criteria, applied);
    for (var i = 0, il = path.length; i < il && node; ++i) {
        if (typeof node !== 'object') {
            node = undefined;
            break;
        }

        node = internals.filter(node[path[i]], criteria, applied);
    }

    return node;
};


// Get a meta for node

internals.Store.prototype.meta = function (key, criteria) {

    var node = this._get(key, criteria);
    return (typeof node === 'object' ? node.$meta : undefined);
};


// Return node or value if no filter, otherwise apply filters until node or value

internals.filter = function (node, criteria, applied) {

    if (!node ||
        typeof node !== 'object' ||
        (!node.$filter && !node.$value)) {

        return node;
    }

    if (node.$value) {
        return internals.filter(node.$value, criteria, applied);
    }

    // Filter

    var filter = node.$filter;
    var criterion = Hoek.reach(criteria, filter);

    if (criterion !== undefined) {
        if (node.$range) {
            for (var i = 0, il = node.$range.length; i < il; ++i) {
                if (criterion <= node.$range[i].limit) {
                    exports._logApplied(applied, filter, node, node.$range[i]);
                    return internals.filter(node.$range[i].value, criteria, applied);
                }
            }
        }
        else if (node[criterion] !== undefined) {
            exports._logApplied(applied, filter, node, criterion);
            return internals.filter(node[criterion], criteria, applied);
        }

        // Falls-through for $default
    }

    if (node.hasOwnProperty('$default')) {
        exports._logApplied(applied, filter, node, '$default');
        return internals.filter(node.$default, criteria, applied);
    }

    exports._logApplied(applied, filter, node);
    return undefined;
};


// Exported to make testing easier
exports._logApplied = function (applied, filter, node, criterion) {

    if (!applied) {
        return;
    }

    var record = {
        filter: filter
    };

    if (criterion) {
        if (typeof criterion === 'object') {
            if (criterion.id) {
                record.valueId = criterion.id;
            }
            else {
                record.valueId = (typeof criterion.value === 'object' ? '[object]' : criterion.value.toString());
            }
        }
        else {
            record.valueId = criterion.toString();
        }
    }

    if (node && node.$id) {
        record.filterId = node.$id;
    }

    applied.push(record);
};


// Applies criteria on an entire tree

internals.walk = function (node, criteria, applied) {

    if (!node ||
        typeof node !== 'object') {

        return node;
    }

    if (node.hasOwnProperty('$value')) {
        return internals.walk(node.$value, criteria, applied);
    }

    var parent = (node instanceof Array ? [] : {});

    var keys = Object.keys(node);
    for (var i = 0, il = keys.length; i < il; ++i) {
        var key = keys[i];
        if (key === '$meta' || key === '$id') {
            continue;
        }
        var child = internals.filter(node[key], criteria, applied);
        var value = internals.walk(child, criteria, applied);
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

                var lastLimit = undefined;
                for (var r = 0, rl = node.$range.length; r < rl; ++r) {
                    var range = node.$range[r];
                    if (typeof range !== 'object') {
                        return error('Invalid range entry type');
                    }

                    if (!range.hasOwnProperty('limit')) {
                        return error('Range entry missing limit');
                    }

                    if (typeof range.limit !== 'number') {
                        return error('Range limit must be a number');
                    }

                    if (lastLimit !== undefined && range.limit <= lastLimit) {
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
            else if (key === '$id') {
                if (!node.$id ||
                    typeof node.$id !== 'string') {

                    return error('Id value must be a non-empty string');
                }

                found.id = true;
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
    if (found.value && (found.key || found.range || found.default || found.filter)) {
        return error('Value directive can only be used with meta or nothing');
    }

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

    // Valid node

    return null;
};
