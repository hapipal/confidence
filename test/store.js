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

        describe('#get', function () {

            var store = new Store();
            store.load(tree);

            var get = function (key, result, criteria, depth) {

                it('gets value for ' + key + (criteria ? ' with criteria ' + JSON.stringify(criteria) : ''), function (done) {

                    store.get(key, criteria || {}, depth, function (err, value) {

                        expect(value).to.deep.equal(result);
                        done();
                    });
                });
            };

            get('key', undefined);
            get('/key1', 'abc');
            get('/key2', 2);
            get('/key2', 1, { platform: 'ios' });
            get('/key2/deeper', 'value', { env: 'production' });
            get('/key2/deeper', null, { env: 'qa' });
            get('/key2/deeper', null);
            get('/', { key1: 'abc', key2: 2, key3: { sub1: 123 } });
            get('/', { key1: 'abc', key2: 2, key3: { sub1: 123, sub2: 6 } }, { xfactor: 'yes' });
            get('/', { key1: 'abc', key2: 2, key3: {} }, null, 1);
            get('/', { key1: 'abc', key2: 2, key3: { sub1: 123 } }, null, 2);
        });

        describe('#read', function () {

            var store = new Store();
            store.load(tree);

            var read = function (key, result) {

                it('reads value for ' + key, function (done) {

                    store.read(key, function (err, value) {

                        expect(value).to.deep.equal(result);
                        done();
                    });
                });
            };

            read('key1', undefined);
            read('/', tree);
            read('/key1', 'abc');
            read('/key2/production/deeper', 'value');
            read('/key2/$default/$filter', 'platform');
            read('/key3/sub2', { $filter: 'xfactor', yes: 6 });
            read('/key4', null);
        });

        describe('#write', function () {

            it('writes root node', function (done) {

                var store = new Store();
                store.write('/', { key1: 1, key2: 2 }, function (err) {

                    expect(err).to.not.exist;
                    done();
                });
            });

            it('errors on invalid node', function (done) {

                var store = new Store();
                store.write('/', null, function (err) {

                    expect(err.message).to.equal('Node cannot be null or undefined');
                    done();
                });
            });

            it('errors on invalid key', function (done) {

                var store = new Store();
                store.write('/$a', 'value', function (err) {

                    expect(err.message).to.equal('Bad key segment: /$a');
                    done();
                });
            });

            it('errors on missing key path', function (done) {

                var store = new Store();
                store.write('/a/b', 'value', function (err) {

                    expect(err.message).to.equal('Key path does not exist');
                    done();
                });
            });

            it('adds node', function (done) {

                var store = new Store();
                store.write('/', { key1: 1, key2: 2 }, function (err) {

                    expect(err).to.not.exist;

                    store.read('/key2', function (err, value) {

                        expect(err).to.not.exist;
                        expect(value).to.equal(2);

                        store.write('/key3', { $filter: 'x', a: 1, $default: 2 }, function (err) {

                            expect(err).to.not.exist;
                            store.get('/key3', { x: 'a' }, 1, function (err, value) {

                                expect(value).to.deep.equal(1);
                                done();
                            });
                        });
                    });
                });
            });
        });

        describe('#load', function () {

            it('fails on invalid tree', function (done) {

                var store = new Store();
                var err = store.load(null);
                expect(err.message).to.equal('Node cannot be null or undefined');
                expect(err.path).to.equal('/');
                done();
            });
        });

        describe('#validate', function () {

            it('fails on null node', function (done) {

                var err = Store.validate(null);
                expect(err.message).to.equal('Node cannot be null or undefined');
                expect(err.path).to.equal('/');
                done();
            });

            it('fails on array node', function (done) {

                var err = Store.validate({ key: [] });
                expect(err.message).to.equal('Invalid node object type');
                expect(err.path).to.equal('/key');
                done();
            });

            it('fails on empty object node', function (done) {

                var err = Store.validate({ key: {} });
                expect(err.message).to.equal('Node cannot be empty');
                expect(err.path).to.equal('/key');
                done();
            });

            it('fails on empty filter', function (done) {

                var err = Store.validate({ key: { $filter: '' } });
                expect(err.message).to.equal('Invalid empty filter value');
                expect(err.path).to.equal('/key');
                done();
            });

            it('fails on non-string filter', function (done) {

                var err = Store.validate({ key: { $filter: 3 } });
                expect(err.message).to.equal('Filter value must be a string');
                expect(err.path).to.equal('/key');
                done();
            });

            it('fails on invalid filter', function (done) {

                var err = Store.validate({ key: { $filter: '4$' } });
                expect(err.message).to.equal('Invalid filter value 4$');
                expect(err.path).to.equal('/key');
                done();
            });

            it('fails on invalid default', function (done) {

                var err = Store.validate({ key: { $default: null } });
                expect(err.message).to.equal('Node cannot be null or undefined');
                expect(err.path).to.equal('/key/$default');
                done();
            });

            it('fails on unknown directive', function (done) {

                var err = Store.validate({ key: { $unknown: 'asd' } });
                expect(err.message).to.equal('Unknown $ directive $unknown');
                expect(err.path).to.equal('/key');
                done();
            });

            it('fails on invalid child key', function (done) {

                var err = Store.validate({ key: { 'sub key': 'abc' } });
                expect(err.message).to.equal('Invalid key string sub key');
                expect(err.path).to.equal('/key');
                done();
            });

            it('fails on invalid child node', function (done) {

                var err = Store.validate({ key: { sub: null } });
                expect(err.message).to.equal('Node cannot be null or undefined');
                expect(err.path).to.equal('/key/sub');
                done();
            });

            it('fails on default value without a filter', function (done) {

                var err = Store.validate({ key: { $default: 1 } });
                expect(err.message).to.equal('Default value without a filter');
                expect(err.path).to.equal('/key');
                done();
            });

            it('fails on filter without any value', function (done) {

                var err = Store.validate({ key: { $filter: '1' } });
                expect(err.message).to.equal('Filter without any values');
                expect(err.path).to.equal('/key');
                done();
            });

            it('fails on filter with only default', function (done) {

                var err = Store.validate({ key: { $filter: 'a', $default: 1 } });
                expect(err.message).to.equal('Filter with only a default');
                expect(err.path).to.equal('/key');
                done();
            });
        });
    });
});
