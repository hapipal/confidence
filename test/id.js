'use strict';
// Load modules

const Code = require('code');
const Lab = require('lab');
const Confidence = require('../');


// Declare internals

const internals = {};


// Test shortcuts

const lab = exports.lab = Lab.script();
const expect = Code.expect;
const describe = lab.experiment;
const it = lab.test;


describe('generate()', () => {

    it('generates an id', (done) => {

        const id = Confidence.id.generate();
        expect(id.length).to.equal(36);
        done();
    });

    it('generates 1000 unique ids', (done) => {

        const ids = {};
        for (let i = 0; i < 1000; ++i) {
            const id = Confidence.id.generate();
            expect(ids[id]).to.not.exist();
            expect(id.length).to.equal(36);
            ids[id] = true;
        }
        done();
    });
});

describe('criteria()', () => {

    it('converts id to criteria', (done) => {

        const id = 'a44f476c-1326-499e-9cf9-2111c31670d8';
        const criteria = Confidence.id.criteria(id);
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

    it('returns null criteria on invalid id length', (done) => {

        const id = 'a44f476c-1326-499e-9cf9-2111c31670d';
        const criteria = Confidence.id.criteria(id);
        expect(criteria).to.equal(null);
        done();
    });

    it('returns null criteria on out of range left random segment', (done) => {

        const id = 'a44f476c-1326-499e-9cf9-ffffff000000';
        const criteria = Confidence.id.criteria(id);
        expect(criteria).to.equal(null);
        done();
    });

    it('returns null criteria on out of range right random segment', (done) => {

        const id = 'a44f476c-1326-499e-9cf9-000000ffffff';
        const criteria = Confidence.id.criteria(id);
        expect(criteria).to.equal(null);
        done();
    });
});
