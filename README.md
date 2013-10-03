<a href="https://github.com/spumko"><img src="https://raw.github.com/spumko/spumko/master/images/from.png" align="right" /></a>
![confidence Logo](https://raw.github.com/spumko/con/master/images/confidence.png)

**Confidence** is a configuration document format, an API, and a foundation for A/B testing. The configuration format is designed to
work with any existing JSON-based configuration, serving values based on object path ('/a/b/c' translates to `a.b.c`). In addition,
**confidence** defines special $-prefixed keys used to filter values for a given criteria.

[![Build Status](https://secure.travis-ci.org/spumko/confidence.png)](http://travis-ci.org/spumko/confidence)

# Example

```json
{
    "key1": "abc",
    "key2": {
        "$filter": "env",
        "production": {
            "deeper": "value"
        },
        "$default": {
            "$filter": "platform",
            "android": 0,
            "ios": 1,
            "$default": 2
        }
    },
    "key3": {
        "sub1": 123,
        "sub2": {
            "$filter": "xfactor",
            "yes": 6
        }
    },
    "ab": {
        "$filter": "random.1",
        "$range": [
            { "limit": 10, "value": 4 },
            { "limit": 20, "value": 5 }
        ],
        "$default": 6
    }
}
```

Without any criteria applied, the above configuration document will result in the following:

```json
{
    "key1": "abc",
    "key2": 2,
    "key3": {
        "sub1": 123
    },
    "ab": 6
}
```

With the following criteria applied:

```json
{
    "env": "production",
    "platform": "ios",
    "xfactor": "yes",
    "random": {
        "1": 15
    }
}
```

The result is:

```json
{
    "key1": "abc",
    "key2": {
        "deeper": "value"
    },
    "key3": {
        "sub1": 123,
        "sub2": 6
    },
    "ab": 5
}
```

# API

## Confidence.Store

The configuration parser used to load the configuration document and apply criteria to get values based on keys.

### new Store()

Creates an empty configuration storage container.

```javascript
var Confidence = require('confidence');

var store = new Store();
```

### store.load(document)

Validates the provided configuration, clears any existing configuration, then loads the configuration where:

- `document` - an object containing a **confidence** configuration object generated from a parsed JSON document.

```javascript
var document = {
    a: 1,
    b: 2,
    c: {
        $filter: 'size',
        big: 100,
        small: 1,
        $default: 50
    }
};

store.load(document);
```

### store.get(key, [criteria,] [depth,] next)

Retrieves a value from the configuration document after applying the provided criteria where:

- `key` - the requested key path. All keys must begin with '/'. '/' returns the the entire document.
- `criteria` - optional object used as criteria for applying filters in the configuration document. Defaults to `{}`.
- `depth` - optional number used to determine how deep the resulting tree is. Defaults to full depth.
- `next` - required callback with the signature `function(err, value)` where:
    - `err` - error value if the request failed.
    - `value` - the configuration value found at the requested key. If key not found, returns `null` without an `err`.

Note that the `next()` callback is called on the same tick.

```javascript
store.get('/c', { size: 'big' }, function(err, value) {
    // Check err, use value
});
```

