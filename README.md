# winston-log2gelf

A [Graylog2][0] or [GELF](http://docs.graylog.org/en/latest/pages/gelf.html) transport for [Winston][1]. Supports HTTP(S) & TCP/TCP over TLS protocols.

## Installation

As it's written in ES6, this module requires at least node v4.

``` sh
  $ npm install --save winston-log2gelf
```

## Usage
```javascript
  const winston = require('winston');
  require('winston-log2gelf');

  const logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({
            level: 'info',
            handleExceptions: true,
            humanReadableUnhandledException: true
        }),
        new (winston.transports.Log2gelf)({
            level: 'info',
            host: '192.168.0.15',
            port: 12201,
            protocol: 'tls',
            handleExceptions: true
        })
    ]
});

```

If used in a script where the process has to naturally exit after its execution, the connection has to be closed (as a db connection would have to) if TCP socket is used. It should be done like so:

```javascript
logger.log2gelf.end();
```


## Options

* `name`:  Transport name
* `hostname`: The name of this host (default: os.hostname())
* `host`: The GELF server address (default: 127.0.0.1)
* `port`: The GELF server port (default: 12201)
* `protocol`: Protocol used to send data (TCP, TLS [TCP over TLS], HTTP or HTTPS). (default: tcp)
* `level`: Level of messages this transport should log. See [winston levels](https://github.com/winstonjs/winston#logging-levels) (default: info)
* `silent`: Boolean flag indicating whether to suppress output. (default: false)
* `handleExceptions`: Boolean flag, whenever to handle uncaught exceptions. (default: false)
* `service`: as facility is depreacated, service describes what kind of "service" this is (like MySQLd or Apache2). (default: nodejs)
* `environment`: the environment on which your service is running. (default: development)
* `release`: the version of your service (e.g. 1.0.0).


[0]: https://www.graylog.org/
[1]: https://github.com/flatiron/winston
[2]: https://github.com/Wizcorp/node-graylog2
