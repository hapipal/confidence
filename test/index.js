// Load modules

var Lab = require('lab');
var Hapi = require('hapi');


// Declare internals

var internals = {};


// Test shortcuts

var expect = Lab.expect;
var before = Lab.before;
var after = Lab.after;
var describe = Lab.experiment;
var it = Lab.test;


describe('Confidence', function () {

    describe('Plugin', function () {

        var server = new Hapi.Server(0, { labels: ['api', 'admin'] });

        before(function (done) {

            var tree = {
                key1: 'abc',
                key2: {
                    $filter: 'env',
                    production: {
                        deeper: 'value'
                    },
                    $default: {
                        $filter: 'platform',
                        ios: 'iphone',
                        $default: 2
                    }
                },
                key3: {
                    sub1: 123,
                    sub2: {
                        $filter: 'xfactor',
                        yes: 6
                    }
                }
            };

            server.pack.require('../', { tree: tree }, function (err) {

                expect(err).to.not.exist;
                server.start(function () {

                    done();
                });
            });
        });

        it('executes client flow', function (done) {

            server.inject({ method: 'POST', url: '/id', payload: { criteria: { platform: 'ios' } } }, function (res) {

                expect(res.statusCode).to.equal(200);

                server.inject('/key/' + res.payload + '/key2', function (res) {

                    expect(res.statusCode).to.equal(200);
                    expect(res.payload).to.equal('iphone');
                    done();
                });
            });
        });

        describe('/id', function () {

            it('errors on invalid criteria key', function (done) {

                server.inject({ method: 'POST', url: '/id', payload: { criteria: { $key: 'value' } } }, function (res) {

                    expect(res.statusCode).to.equal(400);
                    expect(res.result.message).to.equal('Invalid criteria key &#x24;key');
                    done();
                });
            });

            it('errors on invalid criteria value', function (done) {

                server.inject({ method: 'POST', url: '/id', payload: { criteria: { key1: '$value' } } }, function (res) {

                    expect(res.statusCode).to.equal(400);
                    expect(res.result.message).to.equal('Invalid criteria value for key1');
                    done();
                });
            });

            it('errors on nested criteria value', function (done) {

                server.inject({ method: 'POST', url: '/id', payload: { criteria: { key1: { a: 1 } } } }, function (res) {

                    expect(res.statusCode).to.equal(400);
                    expect(res.result.message).to.equal('Non-String criteria value for key1');
                    done();
                });
            });
        });

        describe('/key', function () {

            it('errors on unknown client id', function (done) {

                server.inject('/key/unknown/key2', function (res) {

                    expect(res.statusCode).to.equal(404);
                    done();
                });
            });

            it('errors on unknown key', function (done) {

                server.inject({ method: 'POST', url: '/id', payload: { criteria: { platform: 'ios' } } }, function (res) {

                    expect(res.statusCode).to.equal(200);

                    server.inject('/key/' + res.payload + '/key4', function (res) {

                        expect(res.statusCode).to.equal(404);
                        done();
                    });
                });
            });

            it('errors on bad key', function (done) {

                server.inject({ method: 'POST', url: '/id', payload: { criteria: { platform: 'ios' } } }, function (res) {

                    expect(res.statusCode).to.equal(200);

                    server.inject('/key/' + res.payload + '/$key', function (res) {

                        expect(res.statusCode).to.equal(400);
                        done();
                    });
                });
            });
        });

        describe('/combo', function () {

            it('requests id and key', function (done) {

                server.inject({ method: 'POST', url: '/combo/key2', payload: { criteria: { platform: 'ios' } } }, function (res) {

                    expect(res.statusCode).to.equal(200);
                    expect(res.result.value).to.deep.equal('iphone');
                    done();
                });
            });
        });

        it('reads raw key', function (done) {

            server.inject('/node/key1', function (res) {

                expect(res.statusCode).to.equal(200);
                done();
            });
        });

        it('writes node', function (done) {

            server.inject({ method: 'POST', url: '/node/key1', payload: {} }, function (res) {

                expect(res.statusCode).to.equal(200);
                done();
            });
        });

        it('fails loading bad tree', function (done) {

            var server = new Hapi.Server(0, { labels: ['api', 'admin'] });

            server.pack.require('../', { tree: { $default: 1 } }, function (err) {

                expect(err.message).to.equal('Default value without a filter');
                done();
            });
        });
    });
});
