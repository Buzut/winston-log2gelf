# winston-log2gelf
A [Graylog2](https://www.graylog.org/) or [GELF](http://docs.graylog.org/en/latest/pages/gelf.html) transport for [Winston@3.x](https://github.com/flatiron/winston). Supports HTTP(S) & TCP/TCP over TLS protocols.

If you're looking for the 1.x version supporting Winston < 3.x, check [winston-log2gelf@1.9.1](https://github.com/Buzut/winston-log2gelf/tree/v1.9.1).

## Installation
``` sh
  $ npm install --save winston-log2gelf
```

## Usage
```javascript
  const winston = require('winston');
  const Log2gelf = require('winston-log2gelf');

  const logger = winston.createLogger({
    transports: [
        new winston.transports.Console({
            level: 'info',
            handleExceptions: true
        }),
        new Log2gelf({
            level: 'error',
            host: '192.168.0.15',
            port: 12201,
            protocol: 'tls'
        })
    ]
});
```

Note that if you wish to handle Exceptions, as [Winston automatically exits after an exception](https://github.com/winstonjs/winston#to-exit-or-not-to-exit), you have to disable the exit behaviour to let `Log2gelf` enough time to send the log across the network.

```javascript
  const logger = winston.createLogger({
    exitOnError: false, // disable default winston exit
    transports: [
        new winston.transports.Console({
            level: 'info',
            handleExceptions: true
        }),
        new Log2gelf({
            level: 'error',
            host: '192.168.0.15',
            port: 12201,
            protocol: 'tls',
            handleExceptions: true, // handle exception within Log2gelf
            exitOnError: true, // exit after exception has been sent
            exitDelay: 1000 // leave Log2gelf 1sec to send the message
        })
    ]
});
```

If used in a script where the process has to naturally exit after its execution, the connection has to be closed (as a db connection would have to) if TCP socket is used. It should be done like so:

```javascript
const log2gelf = logger.transports.find(transport => transport.name === 'log2gelf');
logger.end = log2gelf.end;
```

## Options
* `name`:  Transport name
* `hostname`: The name of this host (default: os.hostname())
* `host`: The GELF server address (default: 127.0.0.1)
* `port`: The GELF server port (default: 12201)
* `protocol`: Protocol used to send data (`tcp`, `tls` [TCP over TLS], `http` or `https`). (default: tcp)
* `protocolOptions`: See [_Overriding connection and request options_](#overriding-connection-and-request-options).
* `level`: Level of messages this transport should log. See [winston levels](https://github.com/winstonjs/winston#logging-levels) (default: info)
* `silent`: Boolean flag indicating whether to suppress output. (default: false)
* `handleExceptions`: Boolean flag, whether to handle uncaught exceptions. (default: false)
* `exitOnerror`: Will exit after x ms (2 sec by default) if Winston `exitOnError` is set to `false` if an exception is caught
* `exitDelay`: Specify the exit delay in ms for `exitOnerror` option. (default 2000ms)
* `service`: as facility is deprecated, service describes what kind of "service" this is (like MySQLd or Apache2). (default: nodejs)
* `environment`: the environment on which your service is running. (default: development)
* `release`: the version of your service (e.g. 1.0.0).
* `_foo`: any underscore-prefixed custom option will be passed as is to the server.

### Protocol-specific options

#### `tcp` and `tls`

* `reconnect`: Number of tcp reconnect attempts (default 0, 0 for none, -1 for infinite)
* `wait`: Milliseconds to wait between reconnect attempts (default 1000)

### Overriding connection and request options

_**API change**: prior to version `2.3.0`, the `host`, `port` and `rejectUnauthorized` options were not overrideable by `protocolOptions`. They were also previously not applied when using the `http` or `https` protocol!_

TCP connection and HTTP request specific options can be passed via `protocolOptions`.
These options override the default options (for example, `host` and `port`), and are passed to the function making the request:

| Protocol | API                                                                                                  |
|----------|------------------------------------------------------------------------------------------------------|
| `tcp`    | [`net.socket.connect()`](https://nodejs.org/api/net.html#net_socket_connect_options_connectlistener) |
| `tls`    | [`tls.connect()`](https://nodejs.org/api/tls.html#tls_tls_connect_options_callback)                  |
| `http`   | [`http.request()`](https://nodejs.org/api/http.html#http_http_request_options_callback)              |
| `https`  | [`https.request()`](https://nodejs.org/api/https.html#https_https_request_options_callback)          |

This can be used to, for example with the `http` and `https` protocol, include custom headers or change the path if the GELF HTTP input is behind a reverse proxy:

```js
new Log2gelf({
    level: 'error',
    host: '192.168.0.15',
    port: 12202,
    protocol: 'http',
    protocolOptions: {
        path: '/gelf-input/gelf',
        headers: {
            'X-API-Key': 'secret-key'
        }
    }
})
```

**Note**: When using the `http` or `https` protocol, the `Content-Length` header is overwritten by `winston-log2gelf` to match the byte length of the message being sent and thus cannot be overridden with `protocolOptions`.

## Contributing
There's sure room for improvement, so feel free to hack around and submit PRs!
Please just follow the style of the existing code, which is [Airbnb's style](http://airbnb.io/javascript/) with [minor modifications](.eslintrc).

To maintain things clear and visual, please follow the [git commit template](https://github.com/Buzut/git-emojis-hook).
