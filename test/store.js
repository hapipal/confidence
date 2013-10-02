// Load modules

var Lab = require('lab');
var Hapi = require('hapi');
var Confidence = require('../');


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
            },
            ab: {
                // Range
                $filter: 'group1',
                $range: [
                    { limit: 10, value: 4 },
                    { limit: 20, value: 5 }
                ],
                $default: 6
            }
        };

        describe('#get', function () {

            var store = new Confidence.Store();
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
            get('/', { key1: 'abc', key2: 2, key3: { sub1: 123 }, ab: 6 });
            get('/', { key1: 'abc', key2: 2, key3: { sub1: 123, sub2: 6 }, ab: 6 }, { xfactor: 'yes' });
            get('/', { key1: 'abc', key2: 2, key3: {}, ab: 6 }, null, 1);
            get('/', { key1: 'abc', key2: 2, key3: { sub1: 123 }, ab: 6 }, null, 2);
            get('/ab', 4, { group1: 9 });
            get('/ab', 4, { group1: 10 });
            get('/ab', 5, { group1: 11 });
            get('/ab', 5, { group1: 19 });
            get('/ab', 6, { group1: 29 });
        });

        describe('#load', function () {

            it('fails on invalid tree', function (done) {

                var store = new Confidence.Store();
                var err = store.load(null);
                expect(err.message).to.equal('Node cannot be null or undefined');
                expect(err.path).to.equal('/');
                done();
            });
        });

        describe('#validate', function () {

            it('fails on null node', function (done) {

                var err = Confidence.Store.validate(null);
                expect(err.message).to.equal('Node cannot be null or undefined');
                expect(err.path).to.equal('/');
                done();
            });

            it('fails on array node', function (done) {

                var err = Confidence.Store.validate({ key: [] });
                expect(err.message).to.equal('Invalid node object type');
                expect(err.path).to.equal('/key');
                done();
            });

            it('fails on empty object node', function (done) {

                var err = Confidence.Store.validate({ key: {} });
                expect(err.message).to.equal('Node cannot be empty');
                expect(err.path).to.equal('/key');
                done();
            });

            it('fails on empty filter', function (done) {

                var err = Confidence.Store.validate({ key: { $filter: '' } });
                expect(err.message).to.equal('Invalid empty filter value');
                expect(err.path).to.equal('/key');
                done();
            });

            it('fails on non-string filter', function (done) {

                var err = Confidence.Store.validate({ key: { $filter: 3 } });
                expect(err.message).to.equal('Filter value must be a string');
                expect(err.path).to.equal('/key');
                done();
            });

            it('fails on invalid filter', function (done) {

                var err = Confidence.Store.validate({ key: { $filter: '4$' } });
                expect(err.message).to.equal('Invalid filter value 4$');
                expect(err.path).to.equal('/key');
                done();
            });

            it('fails on invalid default', function (done) {

                var err = Confidence.Store.validate({ key: { $default: null } });
                expect(err.message).to.equal('Node cannot be null or undefined');
                expect(err.path).to.equal('/key/$default');
                done();
            });

            it('fails on unknown directive', function (done) {

                var err = Confidence.Store.validate({ key: { $unknown: 'asd' } });
                expect(err.message).to.equal('Unknown $ directive $unknown');
                expect(err.path).to.equal('/key');
                done();
            });

            it('fails on invalid child key', function (done) {

                var err = Confidence.Store.validate({ key: { 'sub key': 'abc' } });
                expect(err.message).to.equal('Invalid key string sub key');
                expect(err.path).to.equal('/key');
                done();
            });

            it('fails on invalid child node', function (done) {

                var err = Confidence.Store.validate({ key: { sub: null } });
                expect(err.message).to.equal('Node cannot be null or undefined');
                expect(err.path).to.equal('/key/sub');
                done();
            });

            it('fails on default value without a filter', function (done) {

                var err = Confidence.Store.validate({ key: { $default: 1 } });
                expect(err.message).to.equal('Default value without a filter');
                expect(err.path).to.equal('/key');
                done();
            });

            it('fails on filter without any value', function (done) {

                var err = Confidence.Store.validate({ key: { $filter: '1' } });
                expect(err.message).to.equal('Filter without any values');
                expect(err.path).to.equal('/key');
                done();
            });

            it('fails on filter with only default', function (done) {

                var err = Confidence.Store.validate({ key: { $filter: 'a', $default: 1 } });
                expect(err.message).to.equal('Filter with only a default');
                expect(err.path).to.equal('/key');
                done();
            });

            it('fails on non-array range', function (done) {

                var err = Confidence.Store.validate({ key: { $filter: 'a', $range: {}, $default: 1 } });
                expect(err.message).to.equal('Range value must be an array');
                expect(err.path).to.equal('/key');
                done();
            });

            it('fails on empty array range', function (done) {

                var err = Confidence.Store.validate({ key: { $filter: 'a', $range: [], $default: 1 } });
                expect(err.message).to.equal('Range must include at least one value');
                expect(err.path).to.equal('/key');
                done();
            });

            it('fails on non-object range array element', function (done) {

                var err = Confidence.Store.validate({ key: { $filter: 'a', $range: [5], $default: 1 } });
                expect(err.message).to.equal('Invalid range entry type');
                expect(err.path).to.equal('/key');
                done();
            });

            it('fails on range array element missing limit', function (done) {

                var err = Confidence.Store.validate({ key: { $filter: 'a', $range: [{}], $default: 1 } });
                expect(err.message).to.equal('Range entry missing limit');
                expect(err.path).to.equal('/key');
                done();
            });

            it('fails on out of order range array elements', function (done) {

                var err = Confidence.Store.validate({ key: { $filter: 'a', $range: [{ limit: 11, value: 2 }, { limit: 10, value: 6 }], $default: 1 } });
                expect(err.message).to.equal('Range entries not sorted in ascending order - 10 cannot come after 11');
                expect(err.path).to.equal('/key');
                done();
            });

            it('fails on range array element missing value', function (done) {

                var err = Confidence.Store.validate({ key: { $filter: 'a', $range: [{ limit: 1 }], $default: 1 } });
                expect(err.message).to.equal('Range entry missing value');
                expect(err.path).to.equal('/key');
                done();
            });

            it('fails on range array element with invalid value', function (done) {

                var err = Confidence.Store.validate({ key: { $filter: 'a', $range: [{ limit: 1, value: null }], $default: 1 } });
                expect(err.message).to.equal('Node cannot be null or undefined');
                expect(err.path).to.equal('/key/$range[1]');
                done();
            });

            it('fails on range without a filter', function (done) {

                var err = Confidence.Store.validate({ key: { $range: [{ limit: 1, value: 1 }] } });
                expect(err.message).to.equal('Range without a filter');
                expect(err.path).to.equal('/key');
                done();
            });

            it('fails on range with non-ranged values', function (done) {

                var err = Confidence.Store.validate({ key: { $filter: 'a', $range: [{ limit: 1, value: 1 }], a: 1 } });
                expect(err.message).to.equal('Range with non-ranged values');
                expect(err.path).to.equal('/key');
                done();
            });
        });
    });
});
