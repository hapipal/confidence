// Load modules

var Crypto = require('crypto');


// Declare internals

var internals = {};


// Portions based on node-uuid - https://github.com/broofa/node-uuid - Copyright (c) 2010-2012 Robert Kieffer - MIT License

internals.byteToHex = [];


internals.buildCache = function () {

    for (var i = 0; i < 256; ++i) {
        var hex = (i < 16 ? '0' : '') + i.toString(16);
        internals.byteToHex[i] = hex;
    }
};

internals.buildCache();


exports.generate = function () {

    var rand = Crypto.randomBytes(10);

    rand[6] = (rand[6] & 0x0f) | 0x40;        // Per RFC 4122 (4.4) - set bits for version and `clock_seq_hi_and_reserved`
    rand[8] = (rand[8] & 0x3f) | 0x80;

    var b = internals.byteToHex;
    var id = b[rand[0]] + b[rand[1]] + b[rand[2]] + b[rand[3]] + '-' +
            b[rand[4]] + b[rand[5]] + '-' +
            b[rand[6]] + b[rand[7]] + '-' +
            b[rand[8]] + b[rand[9]] + '-';

    var distributedRandom3B = function () {

        var bytes = '';

        while (!bytes) {                            // This can theoretically loop forever if the machine random device generates garbage
            var rand = Crypto.randomBytes(3);
            var value = (rand[0] << 16) | (rand[1] << 8) | rand[2];
            if (value >= 10000000) {
                continue;
            }

            bytes = internals.byteToHex[rand[0]] + internals.byteToHex[rand[1]] + internals.byteToHex[rand[2]];
        }

        return bytes;
    };

    id += distributedRandom3B();
    id += distributedRandom3B();

    return id;
};


exports.criteria = function (id) {

    if (!id.match(/^[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}$/)) {
        return null;
    }

    var parse = function (from, to) {

        var hex = id.slice(from, to);
        var value = parseInt(hex, 16);

        if (value >= 10000000) {
            return null;
        }

        var set = value.toString().split('');
        for (var i = 0, il = set.length; i < il; ++i) {
            set[i] = parseInt(set[i], 10);
        }

        for (i = 0, il = 7 - set.length; i < il; ++i) {
            set.unshift(0);
        }

        return set;
    };

    var set1 = parse(24, 30);
    var set2 = parse(30);

    if (set1 === null ||
        set2 === null) {

        return null;
    }

    var criteria = {
        $id: id,
        random: {
            a: (set1[0] * 10) + set1[1] + 1,
            b: (set1[1] * 10) + set1[2] + 1,
            c: (set1[2] * 10) + set1[3] + 1,
            d: (set1[3] * 10) + set1[4] + 1,
            e: (set1[4] * 10) + set1[5] + 1,
            f: (set1[5] * 10) + set1[6] + 1,
            g: (set1[6] * 10) + set2[0] + 1,
            h: (set2[0] * 10) + set2[1] + 1,
            i: (set2[1] * 10) + set2[2] + 1,
            j: (set2[2] * 10) + set2[3] + 1,
            k: (set2[3] * 10) + set2[4] + 1,
            l: (set2[4] * 10) + set2[5] + 1,
            m: (set2[5] * 10) + set2[6] + 1,
            n: (set2[6] * 10) + set1[0] + 1
        }
    };

    return criteria;
};


