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
                        ios: 1,
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

        it('issues id', function (done) {

            server.inject({ method: 'POST', url: '/id', payload: {} }, function (res) {

                expect(res.statusCode).to.equal(200);
                done();
            });
        });

        it('gets key', function (done) {

            server.inject('/key/12345/key1', function (res) {

                expect(res.statusCode).to.equal(200);
                done();
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
