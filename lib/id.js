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

    id += internals.distributedRandom3B();
    id += internals.distributedRandom3B();

    return id;
};


exports.criteria = function (id) {

    if (!id.match(/^[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}$/)) {
        return null;
    }

    var hex1 = id.slice(24, 30);
    var value1 = parseInt(hex1, 16);

    if (value1 >= 10000000) {
        return null;
    }

    var hex2 = id.slice(30);
    var value2 = parseInt(hex2, 16);

    if (value2 >= 10000000) {
        return null;
    }

    var criteria = {};
    criteria.$random = '' + value1 + value2;
    return criteria;
};


internals.distributedRandom3B = function () {

    var bytes = '';

    while (!bytes) {
        var rand = Crypto.randomBytes(3);
        var value = (rand[0] << 16) | (rand[1] << 8) | rand[2];
        if (value >= 10000000) {
            continue;
        }

        bytes = internals.byteToHex[rand[0]] + internals.byteToHex[rand[1]] + internals.byteToHex[rand[2]];
    }

    return bytes;
};


