'use strict';

const Joi = require('joi');

module.exports = Joi.extend([
    {
        name: 'object',
        base: Joi.object(),
        rules: [
            {
                name: 'withPattern',
                params: {
                    key: Joi.string().required(),
                    pattern: Joi.object().required(),
                    patternToExist: Joi.boolean().required(),
                    message: Joi.string().required()
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

                        if (found !== params.patternToExist) {
                            return this.createError('object.withPattern', { message: params.message }, state, options);
                        }
                    }

                    return value;
                }
            },
            {
                name: 'notInstanceOf',
                params: {
                    fn: Joi.func().required(),
                    message: Joi.string().required()
                },
                validate(params, value, state, options) {

                    if (value instanceof params.fn) {
                        return this.createError('object.notInstanceOf', { message: params.message }, state, options);
                    }

                    return value;
                }
            }
        ]
    },
    {
        name: 'array',
        base: Joi.array(),
        rules: [
            {
                name: 'sorted',
                params: {
                    fn: Joi.func().arity(2).required(),
                    message: Joi.string().required()
                },
                validate(params, value, state, options) {

                    let sorted = true;
                    for (let i = 0; i < value.length - 1; ++i) {
                        sorted = params.fn.call(null, value[i], value[i + 1]);
                        if (!sorted) {
                            return this.createError('array.sorted', { message: params.message }, state, options);
                        }
                    }

                    return value;
                }
            }
        ]
    }
]);
