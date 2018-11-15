'use strict';

// Load modules

const Hoek = require('hoek');
const Joi = require('./joi');


// Declare internals

const internals = {};

module.exports = internals.Store = class {

    constructor(document) {

        this.load(document || {});
    }

    load(document) {

        const err = internals.validate(document);
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

    static validate(node) {

        return internals.validate(node);
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

    if (Object.prototype.hasOwnProperty.call(node, '$param')) {
        return Hoek.reach(criteria, node.$param, applied);
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
            parent[key] = value;
        }
    }

    return parent;
};

internals.handleError = (errors) => {

    const reasons = [].concat(errors);
    const reason = reasons[0];
    if (reason instanceof Error) {
        return reason;
    }

    const { type, context, path } = reason;
    if (context.reason) {
        return internals.handleError(context.reason);
    }

    let message = '';
    switch (type) {
        case 'array.sorted':
        case 'object.withPattern':
        case 'object.notInstanceOf':
            message = context.message;
            break;
        case 'any.required':
            message = `Missing ${context.label} value`;
            break;
        case 'any.empty':
            message = `${context.label} value cannot be empty`;
            break;
        case 'array.base':
            message = `${context.label} value must be an array`;
            break;
        case 'array.min':
            message = `${context.label} cannot be empty`;
            break;
        case 'number.base':
            message = `${context.label} must be a number`;
            break;
        case 'object.allowUnknown':
            message = `Unknown $ directive ${context.label}`;
            break;
        case 'object.base':
            if (path.slice(-2, -1)[0] === '$range') {
                message = `Invalid Range value`;
            }

            break;
        case 'object.with':
            message = `${context.mainWithLabel} value without a ${context.peerWithLabel}`;
            break;
        case 'string.base':
            message = `${context.label} value must be a string`;
            break;
        case 'string.regex.base':
            message = `Invalid ${context.label} value ${context.value}`;
            break;
    }

    const err = new Error(message);
    let loc = path.length;
    for (let i = path.length - 1; i >= 0; --i) {
        if (path[i].toString().startsWith('$')) {
            loc = i;
            break;
        }
    }

    err.path = `/${path.slice(0, loc).join('/')}`;
    return err;
};

internals.alternatives = Joi.lazy(() => {

    return Joi.alternatives([
        internals.schema,
        Joi.string().allow(''),
        Joi.number(),
        Joi.boolean(),
        Joi.array()
    ]);
});

internals.schema = Joi.object().keys({
    $param: Joi.string().regex(/^\w+(?:\.\w+)*$/).label('Parameter'),
    $value: internals.alternatives.label('Value'),
    $filter: Joi.string().regex(/^\w+(?:\.\w+)*$/).label('Filter'),
    $base: internals.alternatives.label('Base'),
    $default: internals.alternatives.label('Default'),
    $id: Joi.string().label('Id'),
    $range: Joi.array().items(
        Joi.object().keys({
            limit: Joi.number().required().label('Range Limit'),
            value: internals.alternatives.required().label('Range Value'),
            id: Joi.string().optional().label('Range ID')
        })
    ).sorted((a, b) => a.limit < b.limit, 'Range entries not sorted in ascending order' ).min(1).label('Range'),
    $meta: Joi.alternatives([Joi.object(), Joi.string()]).label('Meta')
})
    .pattern(/^[^\$].*$/, internals.alternatives)
    .notInstanceOf(Error, 'Invalid node object type')
    .notInstanceOf(RegExp, 'Invalid node object type')
    .notInstanceOf(Date, 'Invalid node object type')
    .withPattern('$value', /^((\$filter)|(\$base)|(\$default)|(\$range))$/, false, 'Value directive can only be used with meta or nothing')
    .withPattern('$param', /^((\$filter)|(\$base)|(\$default)|(\$range))$/, false, 'Param directive can only be used with meta or nothing')
    .with('$default', '$filter')
    .with('$range', '$filter')
    .with('$base', '$filter')
    .withPattern('$filter', /^((\$range)|([^\$].*))$/, true, 'Filter without any values')
    .withPattern('$default', /^((\$range)|([^\$].*))$/, true, 'Filter with only default')
    .withPattern('$range', /^([^\$].*)$/, false, 'Range with non-ranged values')
    .allow(null)
    .error(internals.handleError);

// Validate tree structure

internals.validate = function (node) {

    const { error } = internals.schema.validate(node, { abortEarly: true });
    return error || null;
};
