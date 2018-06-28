# winston-log2gelf
A [Graylog2](https://www.graylog.org/) or [GELF](http://docs.graylog.org/en/latest/pages/gelf.html) transport for [Winston](https://github.com/flatiron/winston). Supports HTTP(S) & TCP/TCP over TLS protocols.

## Installation
As it's written in ES6, this module requires at least node v4. Version `1.9.1` being the latest supporting Winston < 3.x, let's install this one.

``` sh
  $ npm install --save winston-log2gelf@1.9.1
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
logger.transports.log2gelf.end();
```

## Options
* `name`:  Transport name
* `hostname`: The name of this host (default: os.hostname())
* `host`: The GELF server address (default: 127.0.0.1)
* `port`: The GELF server port (default: 12201)
* `protocol`: Protocol used to send data (`tcp`, `tls` [TCP over TLS], `http` or `https`). (default: tcp)
* `reconnect`: Number of tcp reconnect attempts (default 0, 0 for none, -1 for infinite)
* `wait`: Milliseconds to wait between reconnect attempts (default 1000)
* `level`: Level of messages this transport should log. See [winston levels](https://github.com/winstonjs/winston#logging-levels) (default: info)
* `silent`: Boolean flag indicating whether to suppress output. (default: false)
* `handleExceptions`: Boolean flag, whenever to handle uncaught exceptions. (default: false)
* `service`: as facility is depreacated, service describes what kind of "service" this is (like MySQLd or Apache2). (default: nodejs)
* `environment`: the environment on which your service is running. (default: development)
* `release`: the version of your service (e.g. 1.0.0).
* `_foo`: any underscore-prefixed custom option will be passed as is to the server.
