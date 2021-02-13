# API

Dynamic, declarative configurations

> **Note**
>
> Confidence is intended for use with nodejs v12+ (_see v4 for lower support_).

- [`Confidence`](#confidence)
    - [`Confidence.Store`](#confidencestore)
        - [`new Store(document)`](#new-storedocument)
        - [`store.load(document)`](#storeloaddocument)
        - [`store.get(key, [criteria])`](#storegetkey-criteria)
        - [`store.meta(key, [criteria])`](#storemetakey-criteria)
        - [`store.bind(criteria)`](#storebindcriteria)
- [Document Format](#document-format)
    - [Basic Structure](#basic-structure)
    - [Environment Variables](#environment-variables)
        - [Coercing value](#coercing-value)
    - [Criteria Parameters](#criteria-parameters)
    - [Filters](#filters)
    - [Ranges](#ranges)
    - [Metadata](#metadata)
- [Example](#example)

## `Confidence`

### `Confidence.Store`

The configuration parser used to load the configuration document and apply criteria to get values based on keys.

#### `new Store([document])`

Creates an empty configuration storage container where:

- `document` - an optional object containing a **confidence** configuration object generated from a parsed JSON document.
  If the document is invalid, will throw an error. Defaults to `{}`.

```javascript
const Confidence = require('@hapipal/confidence');

const store = new Confidence.Store();
```

#### `store.load(document)`

Validates the provided configuration, clears any existing configuration, then loads the configuration where:

- `document` - an object containing a **confidence** configuration object generated from a parsed JSON document.
  If the document is invalid, will throw an error.

```javascript
const document = {
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

#### `store.get(key, [criteria])`

Retrieves a value from the configuration document after applying the provided criteria where:

- `key` - the requested key path. All keys must begin with '/'. '/' returns the the entire document.
- `criteria` - optional object used as criteria for applying filters in the configuration document. Defaults to `{}`.

Returns the value found after applying the criteria. If the key is invalid or not found, returns undefined.

```javascript
const value = store.get('/c', { size: 'big' });
```

#### `store.meta(key, [criteria])`

Retrieves the metadata (if any) from the configuration document after applying the provided criteria where:

- `key` - the requested key path. All keys must begin with '/'. '/' returns the the entire document.
- `criteria` - optional object used as criteria for applying filters in the configuration document. Defaults to `{}`.

Returns the metadata found after applying the criteria. If the key is invalid or not found, or if no metadata is available, returns undefined.

```javascript
const value = store.meta('/c', { size: 'big' });
```

#### `store.bind([criteria])`

Binds criteria directly to the store, effectively setting it as default criteria.  When `criteria` is passed to [`store.get()`](#storegetkey-criteria) or [`store.meta()`](#storemetakey-criteria), it is merged into the bound criteria.  When `store.bind()` is called multiple times, the criteria from each call are merged together.  Calling `store.bind()` without an argument will reset the bound criteria.

```javascript
store.bind({ size: 'big' });
const value = store.get('/c');
```

## Document Format

Confidence builds on top of a plain object as its document.

### Basic structure

The configuration document starts with a simple object. Key names can only contain alphanumeric characters and '_' with the '$' prefix reserved
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

### Environment Variables

In many scenarios, configuration documents may need to pull values from environment variables. Confidence allows you to refer to environment variables using `$env` directive.

```json
{
    "mysql": {
        "host": { "$env" : "MYSQL_HOST" },
        "port": { "$env" : "MYSQL_PORT" },
        "user": { "$env" : "MYSQL_USER" },
        "password": { "$env" : "MYSQL_PASSWORD" },
        "database": { "$env" : "MYSQL_DATABASE" },
    }
}
```

With following Enviornment Variables:

```sh
MYSQL_HOST=xxx.xxx.xxx.xxx
MYSQL_PORT=3306
MYSQL_USER=user1
MYSQL_PASSWORD=some_password
MYSQL_DATABASE=live_db
```

The result is:

```json
{
    "mysql": {
        "host": "xxx.xxx.xxx.xxx",
        "port": "3306",
        "user": "user1",
        "password": "some_password",
        "database": "live_db"
    }
}
```

`$default` directive allows to fallback to default values in case an environment variable is not set.

```json
{
    "mysql": {
        "host": { "$env" : "MYSQL_HOST" },
        "port": { "$env" : "MYSQL_PORT", "$default": 3306 },
        "user": { "$env" : "MYSQL_USER" },
        "password": { "$env" : "MYSQL_PASSWORD" },
        "database": { "$env" : "MYSQL_DATABASE" },
    }
}
```

With following Enviornment Variables:

```sh
MYSQL_HOST=xxx.xxx.xxx.xxx
MYSQL_USER=user1
MYSQL_PASSWORD=some_password
MYSQL_DATABASE=live_db
```

The result is:

```json
{
    "mysql": {
        "host": "xxx.xxx.xxx.xxx",
        "port": 3306,
        "user": "user1",
        "password": "some_password",
        "database": "live_db"
    }
}
```

#### Coercing value

`$coerce` directive allows you to coerce values to different types. In case the coercing fails, it falls back to `$default` directive, if present. Otherwise it return `undefined`.

```json
{
    "mysql": {
        "host": { "$env" : "MYSQL_HOST" },
        "port": {
            "$env" : "MYSQL_PORT",
            "$coerce": "number",
            "$default": 3306
        },
        "user": { "$env" : "MYSQL_USER" },
        "password": { "$env" : "MYSQL_PASSWORD" },
        "database": { "$env" : "MYSQL_DATABASE" },
    }
}
```

With following Environment Variables:

```sh
MYSQL_HOST=xxx.xxx.xxx.xxx
MYSQL_PORT=3316
MYSQL_USER=user1
MYSQL_PASSWORD=some_password
MYSQL_DATABASE=live_db
```

The result is:

```json
{
    "mysql": {
        "host": "xxx.xxx.xxx.xxx",
        "port": 3316,
        "user": "user1",
        "password": "some_password",
        "database": "live_db"
    }
}
```
With following Environment Variables:

```sh
MYSQL_HOST=xxx.xxx.xxx.xxx
MYSQL_PORT=unknown
MYSQL_USER=user1
MYSQL_PASSWORD=some_password
MYSQL_DATABASE=live_db
```

The result is:

```json
{
    "mysql": {
        "host": "xxx.xxx.xxx.xxx",
        "port": 3306,
        "user": "user1",
        "password": "some_password",
        "database": "live_db"
    }
}
```

Value can be coerced to :
 - `number` : applying `Number(value)`
 - `boolean` : checking whether the value equal `true` or `false` case insensitive
 - `array` : applying a `value.split(token)` with `token` (by default `','`) modifiable by setting the key `$splitToken` to either a string or a regex
 - `object` : applying a `JSON.parse(value)`

### Criteria Parameters

In many scenarios, configuration documents may need to pull values fron `criteria`. Confidence allows you to refer to `criteria` using `$param` directive.

```json
{
    "mysql": {
        "host": { "$param" : "credentials.mysql.host" },
        "port": { "$param" : "credentials.mysql.port" },
        "user": { "$param" : "credentials.mysql.user" },
        "password": { "$param" : "credentials.mysql.password" },
        "database": { "$param" : "credentials.mysql.database" },
    }
}
```

With following `criteria`:

```json
{
    "crendentials": {
        "mysql": {
            "host": "xxx.xxx.xxx.xxx",
            "port": 3306,
            "user": "user1",
            "password": "some_password",
            "database": "live_db"
        }
    }
}
```

The result is:

```json
{
    "mysql": {
        "host": "xxx.xxx.xxx.xxx",
        "port": "3306",
        "user": "user1",
        "password": "some_password",
        "database": "live_db"
    }
}
```

`$default` directive allows to fallback to default values in case a criteria is `undefined` or `null`.

```json
{
    "mysql": {
        "host": { "$param" : "credentials.mysql.host" },
        "port": { "$param" : "credentials.mysql.port", "$default": 3306 },
        "user": { "$param" : "credentials.mysql.user" },
        "password": { "$param" : "credentials.mysql.password" },
        "database": { "$param" : "credentials.mysql.database" },
    }
}

```

With following `criteria`:

```json
{
    "credentials": {
        "mysql": {
            "host": "xxx.xxx.xxx.xxx",
            "port": null,
            "user": "user1",
            "password": "some_password",
            "database": "live_db"
        }
    }
}
```

The result is:

```json
{
    "mysql": {
        "host": "xxx.xxx.xxx.xxx",
        "port": 3306,
        "user": "user1",
        "password": "some_password",
        "database": "live_db"
    }
}
```


### Filters

A key can have multiple values based on a filter. The filter is a key provided in a criteria object at the time of retrieval. Filter names can only
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
Filters can also refer to environment variables using `$env` directive.

```json
{
    "key1": "abc",
    "key2": {
        "$filter": { "$env": "NODE_ENV" },
        "production": {
            "host": { "$env" : "MYSQL_HOST" },
            "port": {
                "$env" : "MYSQL_PORT",
                "$coerce": "number",
                "$default": 3306
            },
            "user": { "$env" : "MYSQL_USER" },
            "password": { "$env" : "MYSQL_PASSWORD" },
            "database": { "$env" : "MYSQL_DATABASE" },
        },
        "$default": {
            "host": "127.0.0.1",
            "port": 3306,
            "user": "dev",
            "password": "password",
            "database": "dev_db"
        }
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
enable other tools such as configuration editors and validators, going beyond the basic parsing specified here.

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

### Shared values

If you have values that you would like to share between various configuration objects without duplicating them for each option, you can create a `$base` object.

```json
{
  "$filter": "env",
  "$base": {
      "logLocation": "/logs",
      "flags": ["a", "b"],
      "tags": {
          "$value": ["DEBUG"],
          "$replace": true
      }
  },
  "production":  {
      "logLevel": "error",
      "flags": ["c", "d"],
      "tags": ["INFO", "ERROR"]
  },
  "qa":  {
      "logLevel": "info",
      "logLocation": "/qa/logs",
      "flags": ["e", "f"],
      "tags": ["DEBUG"]
  },
  "staging":  {
      "logLevel": "debug"
  }
}
```

When requesting the **key** `/` with:

* **criteria** of `{ "env" : "production" }`
* Result will be:

```json
{
	"logLevel": "error",
	"logLocation": "/logs",
    "flags": ["a", "b", "c", "d"],
    "tags": ["INFO", "ERROR"]
}
```

However when requesting the **key** `/` with:

* **criteria** of `{ "env" : "staging" }`
* Result will be:

```json
{
	"logLevel": "debug",
	"logLocation": "/logs",
    "flags": ["a", "b"],
    "tags": ["DEBUG"],
}
```

If the same key occurs in `$base` and the `filtered value`:
- for objects, the value in `$base` will be overridden.
- for arrays, the arrays are merged unless the `$base` array is specified with the `$value` key and the `$replace` flag as shown above.

In the above sample, when requesting the **key** `/` with:

* **criteria** of `{ "env": "qa" }`

* Result will be:


```json
{
	"logLevel": "info",
	"logLocation": "/qa/logs"
}
```


## Example

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