// Load modules

var Hapi = require('hapi');
var Store = require('./store');


// Declare internals

var internals = {};


exports.register = function (plugin, options, next) {

    options = options || {};

    var prefix = options.prefix || '';
    Hapi.utils.assert(!prefix || prefix[0] === '/', 'Path prefix must begin with /');

    var key = {
        method: 'GET',
        path: prefix + '/key/{id}/{key*}',
        config: {
            handler: internals.keyHandler(),
            validate: {
                path: {
                    id: Hapi.types.String()
                        .min(5).max(30).alphanum()
                        .description('Configuration client identifier issued by the confidence API'),
                    key: Hapi.types.String()
                         .description('Full path to the requested key')
                },
                query: {
                    depth: Hapi.types.Number().min(1)
                        .description('Number of nested keys to retrieve')
                }
            },
            description: 'Retrieve a key value or a key tree for given client identifier'
        }
    };

    var id = {
        method: 'POST',
        path: prefix + '/id',
        config: {
            handler: internals.idHandler(),
            validate: {
                payload: {
                    platform: Hapi.types.String().valid('mweb', 'ios', 'android').required()
                        .description('Platform identifier'),
                    version: Hapi.types.String()
                        .description('Application version string')
                }
            },
            description: 'Issue a unique client identifier for given client profile'
        }
    };

    var read = {
        method: 'GET',
        path: prefix + '/node/{key*}',
        config: {
            handler: internals.readHandler(),
            validate: {
                path: {
                    key: Hapi.types.String()
                         .description('Full path to the requested key')
                },
                query: {
                }
            },
            description: 'Retrieve a raw key value'
        }
    };

    var write = {
        method: 'POST',
        path: prefix + '/node/{key*}',
        config: {
            handler: internals.writeHandler(),
            validate: {
                path: {
                    key: Hapi.types.String()
                         .description('Full path to the key being modified')
                },
                payload: {
                }
            },
            description: 'Set a raw key value'
        }
    };

    plugin.select('api').route([id, key]);
    plugin.select('admin').route([read, write]);

    return next();
};


internals.keyHandler = function () {

    return function () {

        this.reply('ok');
    };
};


internals.idHandler = function () {

    return function () {

        this.reply('ok');
    };
};


internals.readHandler = function () {

    return function () {

        this.reply('ok');
    };
};


internals.writeHandler = function () {

    return function () {

        this.reply('ok');
    };
};


