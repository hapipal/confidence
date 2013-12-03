var Confidence = require('../');

// Master configuration

var master = {
    key1: 'abc',
    key2: {
        $filter: 'env',
        production: 1,
        $default: 2
    },
    key3: {
        $filter: 'random.a',
        $id: 'random_ab_test',
        $range: [
            { limit: 10, value: 3 },
            { limit: 50, value: 4 }
        ],
        $default: 5
    }
};

var store = new Confidence.Store(master);

// On first visit, generate a GUID for the client

var guid = Confidence.id.generate();

// When the client comes back requesting it's configuration, convert the id to a criteria object

var criteria = Confidence.id.criteria(guid);

// Check if the id is valid (generated according to the even distribution randomness rules)

if (criteria === null) {
    console.err('Bad id');
    process.exit(1);
}

// Set any other criterion such as environment

criteria.env = 'production';

// Compile the client-specific configuration using the master and criteria

var config = store.get('/', criteria);

// Return the config to the client

console.log(config);
process.exit(0);


