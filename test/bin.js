'use strict';

// Load modules

const ChildProcess = require('child_process');
const Code = require('code');
const Fs = require('fs');
const Lab = require('lab');
const Path = require('path');


// Declare internals

const internals = {};


// Test shortcuts

const lab = exports.lab = Lab.script();
const expect = Code.expect;
const describe = lab.experiment;
const before = lab.before;
const after = lab.after;
const it = lab.test;


const confidencePath = Path.join(__dirname, '../', '/bin', '/confidence');
const configPath = Path.join(__dirname, '/config.json');

const tree = {
    // Fork
    key1: 'abc',                        // Value
    key2: {
        // Filter
        $filter: 'env',
        production: {
            // Fork
            deeper: {
                // Value
                $value: 'value'         // Value
            }
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
        sub1: {
            $value: 0,
            $meta: 'something'
        },
        sub2: {
            // Filter
            $filter: 'xfactor',
            $id: 'x_factor',
            yes: ''                      // Value
        }
    },
    key4: [12, 13, { $filter: 'none', x: 10, $default: 14 }],
    key5: {},
    ab: {
        // Range
        $filter: 'random.1',
        $id: 'random_ab_test',
        $range: [
            { limit: 1, value: [1, 2] },
            { limit: 2, value: { $value: 2 } },
            { limit: 3, value: { a: 5 }, id: '3' },
            { limit: 10, value: 4 },
            { limit: 20, value: 5 }
        ],
        $default: 6
    },
    $meta: {
        something: 'else'
    }
};

describe('bin', () => {

    before((done) => {

        const stream = Fs.createWriteStream(configPath);
        stream.write(JSON.stringify(tree), 'utf8', () => {

            stream.end();
            done();
        });
    });


    after((done) => {

        Fs.unlink(configPath, done);
    });

    it('generates the correct config', (done) => {

        const confidence = ChildProcess.spawn('node', [confidencePath, '-c', configPath]);

        confidence.stdout.on('data', (data) => {

            const result = data.toString();
            const obj = JSON.parse('{"key1":"abc","key2":2,"key3":{"sub1":0},"key4":[12,13,14],"key5":{},"ab":6}');
            expect(result).to.equal(JSON.stringify(obj, null, 4));
            confidence.kill();
            done();
        });

        confidence.stderr.on('data', (data) => {

            expect(data.toString()).to.not.exist();
        });
    });

    it('generates the correct config', (done) => {

        const confidence = ChildProcess.spawn('node', [confidencePath, '-c', configPath, '--filter.env', 'production']);

        confidence.stdout.on('data', (data) => {

            const result = data.toString();
            const obj = JSON.parse('{"key1":"abc","key2":{"deeper":"value"},"key3":{"sub1":0},"key4":[12,13,14],"key5":{},"ab":6}');
            expect(result).to.equal(JSON.stringify(obj, null, 4));
            confidence.kill();
            done();
        });

        confidence.stderr.on('data', (data) => {

            expect(data.toString()).to.not.exist();
        });
    });

    it('generates the correct config with custom indentation', (done) => {

        const confidence = ChildProcess.spawn('node', [confidencePath, '-c', configPath, '--filter.env', 'production', '-i', 2]);

        confidence.stdout.on('data', (data) => {

            const result = data.toString();
            const obj = JSON.parse('{"key1":"abc","key2":{"deeper":"value"},"key3":{"sub1":0},"key4":[12,13,14],"key5":{},"ab":6}');
            expect(result).to.equal(JSON.stringify(obj, null, 2));
            confidence.kill();
            done();
        });

        confidence.stderr.on('data', (data) => {

            expect(data.toString()).to.not.exist();
        });
    });

    it('fails when custom indentation is not a number', (done) => {

        const confidence = ChildProcess.spawn('node', [confidencePath, '-c', configPath, '--filter.env', 'production', '-i', 'someString']);

        confidence.stdout.on('data', (data) => {

            expect(data.toString()).to.not.exist();
        });

        confidence.stderr.on('data', (data) => {

            expect(data.toString()).to.exist();
        });

        confidence.on('close', () => {

            done();
        });
    });
});
