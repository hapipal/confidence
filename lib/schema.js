'use strict';

// Load modules

const Joi = require('joi');

// Declare internals

const internals = {};

internals.Joi = Joi.extend({
    type: 'object',
    base: Joi.object(),
    messages: {
        'object.withPattern': 'fails to match the {{#name}} pattern',
        'object.notInstanceOf': 'cannot be an instance of {{#name}}',
        'object.replaceBaseArrayFlag': '{{#desc}}'
    },
    rules: {
        withPattern: {
            multi: true,
            method(key, pattern, options) {

                return this.$_addRule({ name: 'withPattern', args: { key, pattern, options } });
            },
            args: [
                {
                    name: 'key',
                    assert: Joi.string().required()
                },
                {
                    name: 'pattern',
                    assert: Joi.object().instance(RegExp).required()
                },
                {
                    name: 'options',
                    assert: Joi.object().keys({
                        name: Joi.string().required(),
                        inverse: Joi.boolean()
                    }).required()
                }
            ],
            validate(value, helpers, args) {

                if (Object.prototype.hasOwnProperty.call(value, args.key)) {
                    let found = false;
                    for (const key in value) {
                        if (args.pattern.test(key)) {
                            found = true;
                            break;
                        }
                    }

                    if (found !== Boolean(args.options.inverse)) {
                        return helpers.error('object.withPattern', { v: value, name: args.options.name });
                    }
                }

                return value;
            }
        },
        notInstanceOf: {
            multi: true,
            method(fn) {

                return this.$_addRule({ name: 'notInstanceOf', args: { fn } });
            },
            args: [{
                name: 'fn',
                assert: Joi.func().required()
            }],
            validate(value, helpers, args) {

                if (value instanceof args.fn) {
                    return helpers.error('object.notInstanceOf', { v: value, name: args.fn.name });
                }

                return value;
            }
        },
        replaceBaseArrayFlag: {
            validate(value, helpers) {

                if (Object.keys(value).includes('$replace')) {
                    if (!helpers.state.path.includes('$base')) {
                        return helpers.error('object.replaceBaseArrayFlag', { desc: '$replace only allowed under path $base' });
                    }

                    if (!Object.keys(value).includes('$value')) {
                        return helpers.error('object.replaceBaseArrayFlag', { desc: '$replace missing required peer $value' });
                    }

                    if (!Array.isArray(value.$value)) {
                        return helpers.error('object.replaceBaseArrayFlag', { desc: '$replace requires $value to be an array' });
                    }
                }

                return value;
            }
        }
    }
});

internals.Joi = internals.Joi.extend({
    type: 'array',
    base: Joi.array(),
    messages: {
        'array.sorted': 'entries are not sorted by {{name}}'
    },
    rules: {
        sorted: {
            method(fn, name) {

                return this.$_addRule({ name: 'sorted', args: { fn, name } });
            },
            args: [
                {
                    name: 'fn',
                    assert: Joi.func().arity(2).required()
                },
                {
                    name: 'name',
                    assert: Joi.string().required()
                }
            ],
            validate(value, helpers, args) {

                let sorted = true;
                for (let i = 0; i < value.length - 1; ++i) {
                    sorted = args.fn.call(null, value[i], value[i + 1]);
                    if (!sorted) {
                        return helpers.error('array.sorted', { v: value, name: args.name });
                    }
                }

                return value;
            }
        }
    }
});

internals.alternatives = internals.Joi.alternatives([
    internals.Joi.link('#store'),
    internals.Joi.string().allow(''),
    internals.Joi.number(),
    internals.Joi.boolean(),
    internals.Joi.array(),
    internals.Joi.func()
]);

exports.store = internals.store = internals.Joi.object().keys({
    $param: internals.Joi.string().regex(/^\w+(?:\.\w+)*$/, { name: 'Alphanumeric Characters and "_"' }),
    $value: internals.alternatives,
    $replace: internals.Joi.boolean().invalid(false),
    $env: internals.Joi.string().regex(/^\w+$/, { name: 'Alphanumeric Characters and "_"' }),
    $coerce: internals.Joi.string().valid('number', 'array', 'boolean', 'object'),
    $splitToken: internals.Joi.alternatives([
        internals.Joi.string(),
        internals.Joi.object().instance(RegExp)
    ]),
    $filter: internals.Joi.alternatives([
        internals.Joi.string().regex(/^\w+(?:\.\w+)*$/, { name: 'Alphanumeric Characters and "_"' }),
        internals.Joi.object().keys({
            $env: internals.Joi.string().regex(/^\w+$/, { name: 'Alphanumeric Characters and "_"' }).required()
        })
    ]),
    $base: internals.alternatives,
    $default: internals.alternatives,
    $id: internals.Joi.string(),
    $range: internals.Joi.array().items(
        internals.Joi.object().keys({
            limit: internals.Joi.number().required(),
            value: internals.alternatives.required(),
            id: internals.Joi.string().optional()
        })
    ).sorted((a, b) => a.limit < b.limit, '"entry.limit" in Ascending order' ).min(1),
    $meta: internals.Joi.alternatives([Joi.object(), Joi.string()])
})
    .pattern(/^[^\$].*$/, internals.alternatives)
    .notInstanceOf(Error)
    .notInstanceOf(RegExp)
    .notInstanceOf(Date)
    .without('$value', ['$filter', '$range', '$base', '$default', '$id', '$param', '$env'])
    .without('$param', ['$filter', '$range', '$base', '$id', '$value', '$env'])
    .without('$env', ['$filter', '$range', '$base', '$id', '$value', '$param'])
    .withPattern('$value', /^([^\$].*)$/, { name: '$value directive can only be used with $meta or $default or nothing' })
    .withPattern('$param', /^([^\$].*)$/, { name: '$param directive can only be used with $meta or $default or nothing' })
    .withPattern('$env', /^([^\$].*)$/, { name: '$env directive can only be used with $meta or $default or nothing' })
    .withPattern('$default', /^((\$param)|(\$filter)|(\$env))$/, { inverse: true, name: '$default directive requires $filter or $param or $env' })
    .withPattern('$coerce', /^((\$param)|(\$env))$/, { inverse: true, name: '$coerce directive requires $param or $env' })
    .with('$range', '$filter')
    .with('$base', '$filter')
    .with('$splitToken', '$coerce')
    .withPattern('$filter', /^((\$range)|([^\$].*))$/, { inverse: true, name: '$filter with a valid value OR $range' })
    .withPattern('$range', /^([^\$].*)$/, { name: '$range with non-ranged values' })
    .replaceBaseArrayFlag()
    .allow(null)
    .id('store');
