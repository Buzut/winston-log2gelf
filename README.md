# winston-log2gelf

A [Graylog2][0] or [GELF](http://docs.graylog.org/en/latest/pages/gelf.html) transport for [Winston][1]. Supports HTTP(S) & TCP/TCP over TLS protocols. 

## Installation

As it's written in ES6, this module requires at least node v4.

``` sh
  $ npm install install --save winston
  $ npm install install --save winston-log2gelf
```

## Usage
```javascript
  const winston = require('winston');
  require('winston-log2gelf');

  const logger = new (winston.Logger)({
    level: 'info',
    transports: [
        new (winston.transports.Console)({
            level: 'info',
            handleExceptions: true,
            humanReadableUnhandledException: true
        }),
        new (winston.transports.Log2gelf)({
            host: '192.168.0.15',
            port: 12201,
            protocol: 'tls',
            handleExceptions: true
        })
    ]
});

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


[0]: https://www.graylog.org/
[1]: https://github.com/flatiron/winston
[2]: https://github.com/Wizcorp/node-graylog2
