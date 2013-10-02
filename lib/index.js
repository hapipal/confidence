// Load modules

var Hapi = require('hapi');
var Store = require('./store');


// Declare internals

var internals = {};


exports.register = function (plugin, options, next) {

    // Process options

    var idGenerator = internals.idGenerator();
    var defaults = {
        prefix: '',
        setId: idGenerator.set,
        getId: idGenerator.get
    };

    var settings = Hapi.utils.applyToDefaults(defaults, options || {});
    Hapi.utils.assert(!settings.prefix || settings.prefix[0] === '/', 'Path prefix must begin with /');

    // Create configuration store

    settings.store = new Store();
    if (settings.tree) {
        var err = settings.store.load(settings.tree);
        if (err) {
            return next(err);
        }
    }

    // Client identifier

    var id = {
        method: 'POST',
        path: settings.prefix + '/id',
        config: {
            handler: internals.idHandler(settings),
            validate: {
                payload: {
                    criteria: Hapi.types.Object().required()
                        .description('Key-value pairs used for applying configuration filters'),
                }
            },
            description: 'Issue a unique client identifier for given client profile'
        }
    };

    // Filtered key value

    var key = {
        method: 'GET',
        path: settings.prefix + '/key/{id}/{key*}',
        config: {
            handler: internals.keyHandler(settings),
            validate: {
                path: {
                    id: Hapi.types.String()
                        .min(1).max(30).alphanum()
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

    // Combo client identifier + filtered key value

    var combo = {
        method: 'POST',
        path: settings.prefix + '/combo/{key*}',
        config: {
            pre: [
                { assign: 'id', method: internals.idHandler(settings), type: 'handler' }
            ],
            handler: internals.comboHandler(settings),
            validate: {
                path: {
                    key: Hapi.types.String()
                         .description('Full path to the requested key')
                },
                query: {
                    depth: Hapi.types.Number().min(1)
                        .description('Number of nested keys to retrieve')
                },
                payload: {
                    criteria: Hapi.types.Object().required()
                        .description('Key-value pairs used for applying configuration filters'),
                }
            },
            description: 'Obtain a client id and retrieve a key value in one request'
        }
    };

    // Read raw key value

    var read = {
        method: 'GET',
        path: settings.prefix + '/node/{key*}',
        config: {
            handler: internals.readHandler(settings),
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

    // Write raw node

    var write = {
        method: 'POST',
        path: settings.prefix + '/node/{key*}',
        config: {
            handler: internals.writeHandler(settings),
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

    plugin.select('api').route([id, key, combo]);
    plugin.select('admin').route([read, write]);

    return next();
};


internals.idHandler = function (settings) {

    return function () {

        var self = this;

        // Validate criteria

        var criteria = this.payload.criteria;
        var keys = Object.keys(criteria);
        for (var i = 0, il = keys.length; i < il; ++i) {
            var key = keys[i];
            var value = criteria[key];
            if (typeof value !== 'string') {
                return this.reply(Hapi.error.badRequest('Non-String criteria value for ' + key));
            }

            if (!key.match(/^\w+$/)) {
                return this.reply(Hapi.error.badRequest('Invalid criteria key ' + key));
            }

            if (!value.match(/^\w+$/)) {
                return this.reply(Hapi.error.badRequest('Invalid criteria value for ' + key));
            }
        }

        // Generate id

        settings.setId(criteria, function (err, id) {

            self.reply(err || id);
        });
    };
};


internals.keyHandler = function (settings) {

    return function () {

        var self = this;

        settings.getId(this.params.id, function (err, criteria) {

            if (err) {
                return self.reply(err);
            }

            settings.store.get('/' + self.params.key, criteria, self.query.depth, function (err, value) {

                if (err) {
                    return self.reply(err);
                }

                self.reply(value !== null ? value : Hapi.error.notFound());
            });
        });
    };
};


internals.comboHandler = function (settings) {

    return function () {

        var self = this;

        settings.store.get('/' + this.params.key, this.payload.criteria, this.query.depth, function (err, value) {

            self.reply({ id: self.pre.id, value: value || null });      // Ignores errors as response is based on id generation
        });
    };
};


internals.readHandler = function (settings) {

    return function () {

        this.reply('ok');
    };
};


internals.writeHandler = function (settings) {

    return function () {

        this.reply('ok');
    };
};


internals.idGenerator = function () {

    var counter = 0;
    var cache = {};

    return {
        set: function (criteria, callback) {

            cache[++counter] = criteria;
            return callback(null, counter);
        },
        get: function (id, callback) {

            var criteria = cache[id];
            if (!criteria) {
                return callback(Hapi.error.notFound('Unknown client id'));
            }

            return callback(null, criteria);
        }
    };
};

