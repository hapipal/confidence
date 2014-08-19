![confidence Logo](https://raw.github.com/spumko/con/master/images/confidence.png)

**Confidence** is a configuration document format, an API, and a foundation for A/B testing. The configuration format is designed to
work with any existing JSON-based configuration, serving values based on object path (`'/a/b/c'` translates to ``a.b.c``). In addition,
**confidence** defines special $-prefixed keys used to filter values for a given criteria.

[![Build Status](https://secure.travis-ci.org/hapijs/confidence.png)](http://travis-ci.org/hapijs/confidence)

Lead Maintainer: [Patrick Kettner](https://github.com/patrickkettner)

- [Example](#example)
- [Document Format](#document-format)
    - [Basic Structure](#basic-structure)
    - [Filters](#filters)
    - [Ranges](#ranges)
    - [Metadata](#metadata)
- [API](#api)

# Example

```json
{
    "key1": "abc",
    "key2": {
        "$filter": "env",
        "production": {
            "deeper": {
                "$value": "value"
            }
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
        "$filter": "random.a",
        "$range": [
            { "limit": 10, "value": 4 },
            { "limit": 20, "value": 5 }
        ],
        "$default": 6
    },
    "$meta": {
        "description": "example file"
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
        "a": 15
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

# Document Format

**Confidence** builds on top of a Javascript object as its document.

### Basic structure

The configuration document starts with a simple object. key names can only contain alphanumeric characters and '_' with the '$' prefix reserved
for special directives. Values can contain any non-object value (e.g. strings, numbers, booleans) as well as arrays.

```json
{
    "key1": "abc",
    "key2": 2
}
```

Keys can have children:

```json
{
    "key1": "abc",
    "key2": 2,
    "key3": {
        "sub1": 123
    }
}
```

### Filters

A key can have multiple values based on a filter. The filter is a key provided in a criteria object as the time of retrieval. Filter names can only
contain alphanumeric characters and '_'.

```json
{
    "key1": "abc",
    "key2": {
        "$filter": "env",
        "production": 1
    }
}
```

When asking for `'/key2'`, if no criteria set is provided or the criteria set does not include a value for the `'env'` filter, no value is available. Only when a criteria
set with a key `'env'` and value `'production'` is provided, the value returned is `1`.

Filters can point to a nested value using '.' seperated tokens for accessing child values within the criteria object.

```json
{
    "key1": "abc",
    "key2": {
        "$filter": "system.env",
        "production": 1
    }
}
```

Filters can have a default value which will be used if the provided criteria set does not include a value for the filter or if the value does not match.

```json
{
    "key1": "abc",
    "key2": {
        "$filter": "system.env",
        "production": 1,
        "$default": 2
    }
}
```

### Ranges

Ranges provide a way to filter a value based on numerical buckets. The criteria value must be an integer and be matched against the lowest bucket limit it can fit.

```json
{
    "key1": "abc",
    "key2": {
        "$filter": "system.env",
        "production": 1,
        "$default": 2
    },
    "key3": {
        "$filter": "random.a",
        "$range": [
            { "limit": 10, "value": 4 },
            { "limit": 20, "value": 5 }
        ],
        "$default": 6
    }
}
```

If the criteria includes a value for `random.a`, that value is matched against the sorted range entries. The criterion value will match the entry with lowest limit it
is still less than or equal the limit of. For example, a criterion value of `5` will return a key value for `'/key3'` of `4`. A criterion value of `15` will return a
key value for `'/key3'` of `5`, and a criterion value of `50` will return a key value for `'/key3'` of `6`.

### Metadata

The configuration file can be annotated with metadata that is ignored (and removed) by the parser. Metadata is useful for human readable information as well as to
enable other tools such as configuration editors and validators, going beyong the basic parsing specified here.

```json
{
    "key1": "abc",
    "key2": {
        "$filter": "system.env",
        "production": 1,
        "$default": 2
    },
    "key3": {
        "$filter": "random.a",
        "$range": [
            { "limit": 10, "value": 4 },
            { "limit": 20, "value": 5 }
        ],
        "$default": 6
    },
    "$meta": {
        "anything": "really"
    }
}
```

To annotate non object values, any value can be wrapped in an object and provided using the `$value` directive.

```json
{
    "key1": {
        "$value": "abc",
        "$meta": "whatever"
    },
    "key2": {
        "$filter": "system.env",
        "production": 1,
        "$default": 2
    },
    "key3": {
        "$filter": "random.a",
        "$range": [
            { "limit": 10, "value": 4 },
            { "limit": 20, "value": 5 }
        ],
        "$default": 6
    },
    "$meta": {
        "anything": "really"
    }
}
```

# API

## Confidence.Store

The configuration parser used to load the configuration document and apply criteria to get values based on keys.

### new Store([document])

Creates an empty configuration storage container where:

- `document` - an optional object containing a **confidence** configuration object generated from a parsed JSON document.
  If the document is invalid, will throw an error. Defaults to `{}`.

```javascript
var Confidence = require('confidence');

var store = new Confidence.Store();
```

### store.load(document)

Validates the provided configuration, clears any existing configuration, then loads the configuration where:

- `document` - an object containing a **confidence** configuration object generated from a parsed JSON document.
  If the document is invlaid, will throw an error.

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

### store.get(key, [criteria])

Retrieves a value from the configuration document after applying the provided criteria where:

- `key` - the requested key path. All keys must begin with '/'. '/' returns the the entire document.
- `criteria` - optional object used as criteria for applying filters in the configuration document. Defaults to `{}`.

Returns the value found after applying the criteria. If the key is invalid or not found, returns undefined.

```javascript
var value = store.get('/c', { size: 'big' });
```

### store.meta(key, [criteria])

Retrieves the metadata (if any) from the configuration document after applying the provided criteria where:

- `key` - the requested key path. All keys must begin with '/'. '/' returns the the entire document.
- `criteria` - optional object used as criteria for applying filters in the configuration document. Defaults to `{}`.

Returns the metadata found after applying the criteria. If the key is invalid or not found, or if no metadata is available, returns undefined.

```javascript
var value = store.meta('/c', { size: 'big' });
```
