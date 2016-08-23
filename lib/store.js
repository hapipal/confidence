'use strict';

// Load modules

const Hoek = require('hoek');
const Boom = require('boom');



// Declare internals

const internals = {};

exports = module.exports = internals.Store = function (document) {

    this.load(document || {});
};


internals.Store.prototype.load = function (document) {

    const err = internals.Store.validate(document);
    Hoek.assert(!err, err);

    this._tree = Hoek.clone(document);
};


// Get a filtered value

internals.Store.prototype.get = function (key, criteria, applied) {

    const node = this._get(key, criteria, applied);
    return internals.walk(node, criteria, applied);
};


internals.Store.prototype._get = function (key, criteria, applied) {

    const self = this;

    criteria = criteria || {};

    const path = [];
    if (key !== '/') {
        const invalid = key.replace(/\/(\w+)/g, ($0, $1) => {

            path.push($1);
            return '';
        });

        if (invalid) {
            return undefined;
        }
    }

    let node = internals.filter(self._tree, criteria, applied);
    for (let i = 0; i < path.length && node; ++i) {
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

    const node = this._get(key, criteria);
    return (typeof node === 'object' ? node.$meta : undefined);
};

internals.defaults = function (node, base) {

    base = base || {};

    if (typeof node === 'object' && (Array.isArray(base) === Array.isArray(node))) {
        return Hoek.merge(Hoek.clone(base), Hoek.clone(node));
    }

    return node;
};


// Return node or value if no filter, otherwise apply filters until node or value

internals.filter = function (node, criteria, applied) {

    if (!node ||
        typeof node !== 'object' ||
        (!node.$filter && !node.$value)) {

        return node;
    }

    if (node.$value) {
        return internals.defaults(internals.filter(node.$value, criteria, applied), node.$base);
    }

    // Filter

    const filter = node.$filter;
    const criterion = Hoek.reach(criteria, filter);

    if (criterion !== undefined) {
        if (node.$range) {
            for (let i = 0; i < node.$range.length; ++i) {
                if (criterion <= node.$range[i].limit) {
                    exports._logApplied(applied, filter, node, node.$range[i]);
                    return internals.filter(node.$range[i].value, criteria, applied);
                }
            }
        }
        else if (node[criterion] !== undefined) {
            exports._logApplied(applied, filter, node, criterion);
            return internals.defaults(internals.filter(node[criterion], criteria, applied), node.$base);
        }

        // Falls-through for $default
    }

    if (Object.prototype.hasOwnProperty.call(node, '$default')) {
        exports._logApplied(applied, filter, node, '$default');
        return internals.defaults(internals.filter(node.$default, criteria, applied), node.$base);
    }

    exports._logApplied(applied, filter, node);
    return undefined;
};


// Exported to make testing easier
exports._logApplied = function (applied, filter, node, criterion) {

    if (!applied) {
        return;
    }

    const record = {
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

    if (Object.prototype.hasOwnProperty.call(node, '$value')) {
        return internals.walk(node.$value, criteria, applied);
    }

    const parent = (node instanceof Array ? [] : {});

    const keys = Object.keys(node);
    for (let i = 0; i < keys.length; ++i) {
        const key = keys[i];
        if (key === '$meta' || key === '$id') {
            continue;
        }
        const child = internals.filter(node[key], criteria, applied);
        const value = internals.walk(child, criteria, applied);
        if (value !== undefined) {
            parent[key] = value;
        }
    }

    return parent;
};


// Validate tree structure

internals.Store.validate = function (node, path) {

    path = path || '';

    const error = function (reason) {

        const e = Boom.badRequest(reason);
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

    const found = {};
    const keys = Object.keys(node);
    for (let i = 0; i < keys.length; ++i) {
        const key = keys[i];
        if (key[0] === '$') {
            if (key === '$filter') {
                found.filter = true;
                const filter = node[key];
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

                let lastLimit = undefined;
                for (let j = 0; j < node.$range.length; ++j) {
                    const range = node.$range[j];
                    if (typeof range !== 'object') {
                        return error('Invalid range entry type');
                    }

                    if (!Object.prototype.hasOwnProperty.call(range, 'limit')) {
                        return error('Range entry missing limit');
                    }

                    if (typeof range.limit !== 'number') {
                        return error('Range limit must be a number');
                    }

                    if (lastLimit !== undefined && range.limit <= lastLimit) {
                        return error('Range entries not sorted in ascending order - ' + range.limit + ' cannot come after ' + lastLimit);
                    }

                    lastLimit = range.limit;

                    if (!Object.prototype.hasOwnProperty.call(range, 'value')) {
                        return error('Range entry missing value');
                    }

                    const err = internals.Store.validate(range.value, path + '/$range[' + range.limit + ']');
                    if (err) {
                        return err;
                    }
                }
            }
            else if (key === '$default') {
                found.default = true;
                const err2 = internals.Store.validate(node.$default, path + '/$default');
                if (err2) {
                    return err2;
                }
            }
            else if (key === '$base') {
                found.base = true;
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
                const err3 = internals.Store.validate(node.$value, path + '/$value');
                if (err3) {
                    return err3;
                }
            }
            else {
                return error('Unknown $ directive ' + key);
            }
        }
        else {
            found.key = true;
            const value = node[key];
            const err4 = internals.Store.validate(value, path + '/' + key);
            if (err4) {
                return err4;
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
