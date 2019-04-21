'use strict';

// Load modules

const Joi = require('@hapi/joi');

// Declare internals

const internals = {};

internals.Joi = Joi.extend([
    {
        name: 'object',
        base: Joi.object(),
        language: {
            withPattern: 'fails to match the {{name}} pattern',
            notInstanceOf: 'cannot be an instance of {{name}}'
        },
        rules: [
            {
                name: 'withPattern',
                params: {
                    key: Joi.string().required(),
                    pattern: Joi.object().type(RegExp).required(),
                    options: Joi.object().keys({
                        name: Joi.string().required(),
                        inverse: Joi.boolean().default(false)
                    }).required()
                },
                validate(params, value, state, options) {

                    if (Object.prototype.hasOwnProperty.call(value, params.key)) {
                        let found = false;
                        for (const key in value) {
                            if (params.pattern.test(key)) {
                                found = true;
                                break;
                            }
                        }

                        if (found !== params.options.inverse) {
                            return this.createError('object.withPattern', { v: value, name: params.options.name }, state, options);
                        }
                    }

                    return value;
                }
            },
            {
                name: 'notInstanceOf',
                params: {
                    fn: Joi.func().required()
                },
                validate(params, value, state, options) {

                    if (value instanceof params.fn) {
                        return this.createError('object.notInstanceOf', { v: value, name: params.fn.name }, state, options);
                    }

                    return value;
                }
            }
        ]
    },
    {
        name: 'array',
        base: Joi.array(),
        language: {
            sorted: 'entries are not sorted by {{name}}'
        },
        rules: [
            {
                name: 'sorted',
                params: {
                    fn: Joi.func().arity(2).required(),
                    name: Joi.string().required()
                },
                validate(params, value, state, options) {

                    let sorted = true;
                    for (let i = 0; i < value.length - 1; ++i) {
                        sorted = params.fn.call(null, value[i], value[i + 1]);
                        if (!sorted) {
                            return this.createError('array.sorted', { v: value, name: params.name }, state, options);
                        }
                    }

                    return value;
                }
            }
        ]
    }
]);

internals.alternatives = internals.Joi.lazy(() => {

    return internals.Joi.alternatives([
        internals.store,
        internals.Joi.string().allow(''),
        internals.Joi.number(),
        internals.Joi.boolean(),
        internals.Joi.array(),
        internals.Joi.func()
    ]);
});

exports.store = internals.store = internals.Joi.object().keys({
    $param: internals.Joi.string().regex(/^\w+(?:\.\w+)*$/, { name: 'Alphanumeric Characters and "_"' }),
    $value: internals.alternatives,
    $env: internals.Joi.string().regex(/^\w+$/, { name: 'Alphanumeric Characters and "_"' }),
    $coerce: internals.Joi.string().valid('number'),
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
    .withPattern('$default', /^((\$param)|(\$filter)|(\$env))$/, { inverse: true, name: '$default direct requires $filter or $param or $env' })
    .with('$range', '$filter')
    .with('$base', '$filter')
    .with('$coerce', '$env')
    .withPattern('$filter', /^((\$range)|([^\$].*))$/, { inverse: true, name: '$filter with a valid value OR $range' })
    .withPattern('$range', /^([^\$].*)$/, { name: '$range with non-ranged values' })
    .allow(null);

