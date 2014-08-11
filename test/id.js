// Load modules

var Lab = require('lab');
var Confidence = require('../');


// Declare internals

var internals = {};


// Test shortcuts

var lab = exports.lab = Lab.script();
var expect = Lab.expect;
var before = lab.before;
var after = lab.after;
var describe = lab.experiment;
var it = lab.test;


describe('Confidence', function () {

    describe('Id', function () {

        it('generates an id', function (done) {

            var id = Confidence.id.generate();
            expect(id.length).to.equal(36);
            done();
        });

        it('generates 1000 unique ids', function (done) {

            var ids = {};
            for (var i = 0; i < 1000; ++i) {
                var id = Confidence.id.generate();
                expect(ids[id]).to.not.exist;
                expect(id.length).to.equal(36);
                ids[id] = true;
            }
            done();
        });

        it('converts id to criteria', function (done) {

            var id = 'a44f476c-1326-499e-9cf9-2111c31670d8';
            var criteria = Confidence.id.criteria(id);
            expect(criteria.random.a).to.equal(22);
            expect(criteria.random.b).to.equal(17);
            expect(criteria.random.c).to.equal(68);
            expect(criteria.random.d).to.equal(73);
            expect(criteria.random.e).to.equal(24);
            expect(criteria.random.f).to.equal(36);
            expect(criteria.random.g).to.equal(52);
            expect(criteria.random.h).to.equal(15);
            expect(criteria.random.i).to.equal(48);
            expect(criteria.random.j).to.equal(71);
            expect(criteria.random.k).to.equal(7);
            expect(criteria.random.l).to.equal(69);
            expect(criteria.random.m).to.equal(81);
            expect(criteria.random.n).to.equal(3);
            done();
        });

        it('returns null criteria on invalid id length', function (done) {

            var id = 'a44f476c-1326-499e-9cf9-2111c31670d';
            var criteria = Confidence.id.criteria(id);
            expect(criteria).to.equal(null);
            done();
        });

        it('returns null criteria on out of range left random segment', function (done) {

            var id = 'a44f476c-1326-499e-9cf9-ffffff000000';
            var criteria = Confidence.id.criteria(id);
            expect(criteria).to.equal(null);
            done();
        });

        it('returns null criteria on out of range right random segment', function (done) {

            var id = 'a44f476c-1326-499e-9cf9-000000ffffff';
            var criteria = Confidence.id.criteria(id);
            expect(criteria).to.equal(null);
            done();
        });
    });
});
