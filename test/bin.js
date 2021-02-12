'use strict';

// Load modules

const Path = require('path');
const { promises: Fs } = require('fs');
const ChildProcess = require('child_process');

const Code = require('@hapi/code');
const Lab = require('@hapi/lab');

// Test shortcuts

const lab = exports.lab = Lab.script();
const expect = Code.expect;
const describe = lab.experiment;
const before = lab.before;
const after = lab.after;
const it = lab.test;

describe('bin', () => {

    const configPath = Path.join(__dirname, '/config.json');
    const confidencePath = Path.join(__dirname, '../', '/bin', '/confidence');

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

    before(async () => {

        await Fs.writeFile(configPath, JSON.stringify(tree));
    });


    after(async () => {

        await Fs.unlink(configPath);
    });

    const execute = (args) => {

        return new Promise((resolve) => {

            ChildProcess.execFile(confidencePath, args, (err, stdout, stderr) => {

                resolve([err ? 1 : 0, stdout, stderr]);
            });
        });
    };

    it('generates the correct config', async () => {

        const [code, stdout, stderr] = await execute(['-c', configPath]);

        const obj = JSON.parse('{"key1":"abc","key2":2,"key3":{"sub1":0},"key4":[12,13,14],"key5":{},"ab":6}');
        expect(code).to.equal(0);
        expect(stdout).to.equal(JSON.stringify(obj, null, 4));
        expect(stderr).to.equal('');
    });

    it('generates the correct config', async () => {

        const [code, stdout, stderr] = await execute(['-c', configPath, '--filter.env', 'production']);

        const obj = JSON.parse('{"key1":"abc","key2":{"deeper":"value"},"key3":{"sub1":0},"key4":[12,13,14],"key5":{},"ab":6}');
        expect(code).to.equal(0);
        expect(stdout).to.equal(JSON.stringify(obj, null, 4));
        expect(stderr).to.equal('');
    });

    it('generates the correct config with custom indentation', async () => {

        const [code, stdout, stderr] = await execute(['-c', configPath, '--filter.env', 'production', '-i', 2]);

        const obj = JSON.parse('{"key1":"abc","key2":{"deeper":"value"},"key3":{"sub1":0},"key4":[12,13,14],"key5":{},"ab":6}');
        expect(code).to.equal(0);
        expect(stdout).to.equal(JSON.stringify(obj, null, 2));
        expect(stderr).to.equal('');
    });

    it('fails when custom indentation is not a number', async () => {

        const [code, stdout, stderr] = await execute(['-c', configPath, '--filter.env', 'production', '-i', 'someString']);

        expect(code).to.equal(1);
        expect(stdout).to.equal('');
        expect(stderr).to.match(/Argument check failed[\s\S]*indentation/);
    });

    it('fails when configuration file cannot be found', async () => {

        const [code, stdout, stderr] = await execute(['-c', 'doesNotExist', '--filter.env', 'production', '-i', 2]);

        expect(code).to.equal(1);
        expect(stdout).to.equal('');
        expect(stderr).to.match(/Failed loading configuration file: doesNotExist/);
    });
});
