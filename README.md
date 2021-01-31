# confidence

Dynamic, declarative configurations

[![Build Status](https://travis-ci.org/hapipal/confidence.svg?branch=master)](https://travis-ci.org/hapipal/confidence) [![Coverage Status](https://coveralls.io/repos/hapipal/confidence/badge.svg?branch=master&service=github)](https://coveralls.io/github/hapipal/confidence?branch=master)

Lead Maintainer: [Sunny Bhanot](https://github.com/augnin)

## Installation
```sh
npm install @hapipal/confidence
```

## Usage
> See also the [API Reference](API.md)
>
> Confidence is intended for use with nodejs v12+ (_see v4 for lower support_).

Confidence is a configuration document format, an API, and a foundation for A/B testing. The configuration format is designed to work with any existing JSON-based configuration, serving values based on object path (`'/a/b/c'` translates to ``a.b.c``). In addition, Confidence defines special $-prefixed keys used to filter values for a given criteria.


### Example
Below is an example configuring a hapi server using a dynamic Confidence configuration.

```js
const Hapi = require('@hapi/hapi');
const Confidence = require('@hapipal/confidence');

const store = new Confidence.Store({
    server: {
        host: 'localhost',
        port: {
            $param: 'PORT',
            $coerce: 'number',
            $default: 3000
        },
        debug: {
            $filter: 'NODE_ENV',
            $default: {
                log: ['error'],
                request: ['error']
            },
            production: {
                request: ['implementation']
            }
        }
    }
});

const config = store.get('/', process.env);

const server = Hapi.server(config);
```

## Extras
Confidence originated in the [hapijs organization](https://github.com/hapijs), and was adopted by hapi pal in April 2019.

### Logo
![confidence Logo](https://raw.githubusercontent.com/hapipal/confidence/v5.0.0/images/confidence.png)
