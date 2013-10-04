<a href="https://github.com/spumko"><img src="https://raw.github.com/spumko/spumko/master/images/from.png" align="right" /></a>
![confidence Logo](https://raw.github.com/spumko/con/master/images/confidence.png)

**Confidence** is a configuration document format, an API, and a foundation for A/B testing. The configuration format is designed to
work with any existing JSON-based configuration, serving values based on object path ('/a/b/c' translates to `a.b.c`). In addition,
**confidence** defines special $-prefixed keys used to filter values for a given criteria.

## Example

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



[![Build Status](https://secure.travis-ci.org/spumko/confidence.png)](http://travis-ci.org/spumko/confidence)

