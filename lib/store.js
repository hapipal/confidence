'use strict';

// Load modules

const Hoek = require('@hapi/hoek');
const Bourne = require('@hapi/bourne');
const Schema = require('./schema');

// Declare internals

const internals = {};

module.exports = internals.Store = class Store {

    constructor(document) {

        this.load(document || {});
    }

    load(document) {

        const err = this.constructor.validate(document);
        Hoek.assert(!err, err);

        this._tree = Hoek.clone(document);
    }

    get(key, criteria, applied) {

        const node = internals.getNode(this._tree, key, criteria, applied);
        return internals.walk(node, criteria, applied);
    }

    meta(key, criteria) {

        const node = internals.getNode(this._tree, key, criteria);
        return (typeof node === 'object' ? node.$meta : undefined);
    }

    // Validate tree structure
    static validate(node) {

        const { error } = Schema.store.validate(node, { abortEarly: false });
        return error || null;
    }

    static _logApplied(applied, filter, node, criterion) {

        if (!applied) {
            return;
        }

        const record = { filter };

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
    }
};

internals.getNode = function (tree, key, criteria, applied) {

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

    let node = internals.filter(tree, criteria, applied);
    for (let i = 0; i < path.length && node; ++i) {
        if (typeof node !== 'object') {
            node = undefined;
            break;
        }

        node = internals.filter(node[path[i]], criteria, applied);
    }

    return node;
};


internals.defaults = function (node, base) {

    base = base || {};

    const filteredBase = internals.filter(base);
    if (typeof node === 'object' && (Array.isArray(filteredBase) === Array.isArray(node)) && !base.$replace) {
        return Hoek.merge(Hoek.clone(filteredBase), Hoek.clone(node));
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
    const criterion = typeof filter === 'object' ? Hoek.reach(process.env, filter.$env) : Hoek.reach(criteria, filter);

    if (criterion !== undefined) {
        if (node.$range) {
            for (let i = 0; i < node.$range.length; ++i) {
                if (criterion <= node.$range[i].limit) {
                    internals.Store._logApplied(applied, filter, node, node.$range[i]);
                    return internals.filter(node.$range[i].value, criteria, applied);
                }
            }
        }
        else if (node[criterion] !== undefined) {
            internals.Store._logApplied(applied, filter, node, criterion);
            return internals.defaults(internals.filter(node[criterion], criteria, applied), node.$base);
        }

        // Falls-through for $default
    }

    if (Object.prototype.hasOwnProperty.call(node, '$default')) {
        internals.Store._logApplied(applied, filter, node, '$default');
        return internals.defaults(internals.filter(node.$default, criteria, applied), node.$base);
    }

    internals.Store._logApplied(applied, filter, node);
    return undefined;
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

    if (Object.prototype.hasOwnProperty.call(node, '$env') || Object.prototype.hasOwnProperty.call(node, '$param')) {

        const raw = Object.prototype.hasOwnProperty.call(node, '$param') ?
            Hoek.reach(criteria, node.$param, applied) :
            Hoek.reach(process.env, node.$env, applied);

        const value = internals.coerce(raw, node.$coerce || 'string', { splitToken: node.$splitToken || ',' });

        // Falls-through for $default
        if ((typeof value === 'undefined' || value === null) &&
            typeof node.$default !== 'undefined') {

            return internals.walk(node.$default, criteria, applied);
        }

        return value;
    }

    const parent = (Array.isArray(node) ? [] : {});

    const keys = Object.keys(node);
    for (let i = 0; i < keys.length; ++i) {
        const key = keys[i];
        if (key === '$meta') {
            continue;
        }

        const child = internals.filter(node[key], criteria, applied);
        const value = internals.walk(child, criteria, applied);
        if (value !== undefined) {
            if (Array.isArray(parent)) {
                parent.push(value);
            }
            else {
                parent[key] = value;
            }
        }
    }

    return parent;
};

internals.coerce = function (value, type, options) {

    let result = value;
    switch (type) {
        case 'number':
            const num = Number(value);
            result = isNaN(num) ? undefined : num;
            break;
        case 'array':
            if (typeof value === 'string') {
                result = value ? value.split(options.splitToken) : [];
            }
            else {
                result = undefined;
            }

            break;
        case 'boolean':
            result = undefined;

            if (typeof value === 'string') {

                const string = value.toLowerCase();

                if (string === 'true') {

                    result = true;
                }
                else if (string === 'false') {

                    result = false;
                }
            }

            break;
        case 'object':
            try {
                result = Bourne.parse(value);
            }
            catch (e) {
                result = undefined;
            }

            break;
    }

    return result;
};
