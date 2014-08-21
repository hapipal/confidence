// Load modules

var ChildProcess = require('child_process');
var Fs = require('fs');
var Lab = require('lab');
var Path = require('path');


// Declare internals

var internals = {};


// Test shortcuts

var lab = exports.lab = Lab.script();
var expect = Lab.expect;
var before = lab.before;
var after = lab.after;
var describe = lab.experiment;
var it = lab.test;

describe('Confidence Binary', function () {

    var confidencePath = Path.join(__dirname, '../', '/bin', '/confidence');
    var configPath = Path.join(__dirname, '/config.json');
    var tree = {
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

    before(function (done) {

        var stream = Fs.createWriteStream(configPath);
        stream.write(JSON.stringify(tree));
        stream.end();
        done();
    });


    after(function (done) {

        Fs.unlink(configPath, done);
    });

    it('generates the correct config', function (done) {

        var confidence = ChildProcess.spawn('node', [confidencePath, '-c', configPath]);

        confidence.stdout.on('data', function (data) {

            var result = data.toString();
            var obj = JSON.parse('{"key1":"abc","key2":2,"key3":{"sub1":0},"key4":[12,13,14],"key5":{},"ab":6}');
            expect(result).to.equal(JSON.stringify(obj, null, 4));
            confidence.kill();
            done();
        });

        confidence.stderr.on('data', function (data) {

            expect(data.toString()).to.not.exist;
        });
    });

    it('generates the correct config', function (done) {

        var confidence = ChildProcess.spawn('node', [confidencePath, '-c', configPath, '--filter.env', 'production']);

        confidence.stdout.on('data', function (data) {

            var result = data.toString();
            var obj = JSON.parse('{"key1":"abc","key2":{"deeper":"value"},"key3":{"sub1":0},"key4":[12,13,14],"key5":{},"ab":6}');
            expect(result).to.equal(JSON.stringify(obj, null, 4));
            confidence.kill();
            done();
        });

        confidence.stderr.on('data', function (data) {

            expect(data.toString()).to.not.exist;
        });
    });
});
