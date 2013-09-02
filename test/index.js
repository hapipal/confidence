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

        var server = new Hapi.Server(0);

        before(function (done) {

            server.pack.require('../', {}, function (err) {

                expect(err).to.not.exist;
                server.start(function () {

                    done();
                });
            });
        });

        //it('returns root', function (done) {

        //    server.inject('/experimental/dat/department', function (res) {

        //        expect(res.statusCode).to.equal(200);
        //        expect(res.result.children.length).to.equal(31);
        //        done();
        //    });
        //});
    });
});
