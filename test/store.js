// Load modules

var Lab = require('lab');
var Hapi = require('hapi');
var Store = require('../lib/store');


// Declare internals

var internals = {};


// Test shortcuts

var expect = Lab.expect;
var before = Lab.before;
var after = Lab.after;
var describe = Lab.experiment;
var it = Lab.test;


describe('Confidence', function () {

    describe('Storage', function () {

        var tree = {
            // Fork
            key1: 'abc',                        // Value
            key2: {
                // Filter
                $filter: 'env',
                production: {
                    // Fork
                    deeper: 'value'             // Value
                },
                $default: {
                    // Filter
                    $filter: 'platform',
                    ios: 1,                     // Value
                    $default: 2                 // Value
                }
            },
            key3: {
                // Fork
                sub1: 123,
                sub2: {
                    // Filter
                    $filter: 'xfactor',
                    yes: 6                      // Value
                }
            }
        };

        var store = new Store();
        store.load(tree);

        var get = function (key, value, criteria, depth) {

            it('gets value for ' + key + (criteria ? ' with criteria ' + JSON.stringify(criteria) : ''), function (done) {

                var result = store.get(key, criteria || {}, depth);
                expect(result).to.deep.equal(value);
                done();
            });
        };

        get('key', null);
        get('/key1', 'abc');
        get('/key2', 2);
        get('/key2', 1, { platform: 'ios' });
        get('/key2/deeper', 'value', { env: 'production' });
        get('/key2/deeper', null, { env: 'qa' });
        get('/key2/deeper', null);
        get('/', { key1: 'abc', key2: 2, key3: { sub1: 123 } });
        get('/', { key1: 'abc', key2: 2, key3: { sub1: 123, sub2: 6 } }, { xfactor: 'yes' });
        get('/', { key1: 'abc', key2: 2, key3: { } }, null, 1);
        get('/', { key1: 'abc', key2: 2, key3: { sub1: 123 } }, null, 2);

        var read = function (key, value) {

            it('reads value for ' + key, function (done) {

                var result = store.read(key);
                expect(result).to.deep.equal(value);
                done();
            });
        };

        read('key1', null);
        read('/', tree);
        read('/key1', 'abc');
        read('/key2/production/deeper', 'value');
        read('/key2/$default/$filter', 'platform');
        read('/key3/sub2', { $filter: 'xfactor', yes: 6 });
        read('/key4', null);
    });
});
