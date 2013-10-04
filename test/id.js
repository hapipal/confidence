// Load modules

var Lab = require('lab');
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
            expect(criteria.$random).to.equal('21672351470680');
            expect(criteria.random1).to.equal(21);
            expect(criteria.random2).to.equal(16);
            expect(criteria.random3).to.equal(67);
            expect(criteria.random4).to.equal(72);
            expect(criteria.random5).to.equal(23);
            expect(criteria.random6).to.equal(35);
            expect(criteria.random7).to.equal(51);
            expect(criteria.random8).to.equal(14);
            expect(criteria.random9).to.equal(47);
            expect(criteria.random10).to.equal(70);
            expect(criteria.random11).to.equal(6);
            expect(criteria.random12).to.equal(68);
            expect(criteria.random13).to.equal(80);
            expect(criteria.random14).to.equal(2);
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
