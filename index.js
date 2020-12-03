const os = require('os');
const net = require('net');
const secNet = require('tls');
const http = require('http');
const https = require('https');
const Transport = require('winston-transport');
const debug = require('debug')('winston-log2gelf');

const WINSTON_LEVELS = {
    error: 0,
    warn: 1,
    info: 2,
    verbose: 3,
    debug: 4,
    silly: 5
};

class Log2gelf extends Transport {
    constructor(options) {
        super(options);

        this.name = options.name || 'log2gelf';
        this.hostname = options.hostname || os.hostname();
        this.host = options.host || '127.0.0.1';
        this.port = options.port || 12201;
        this.protocol = options.protocol || 'tcp';
        this.reconnect = options.reconnect || 0;
        this.wait = options.wait || 1000;
        this.keepAlive = options.keepAlive || 5000;
        this.timeout = options.timeout;
        this.exitOnError = options.exitOnError || false;
        this.exitDelay = options.exitDelay || 2000;
        this.service = options.service || 'nodejs';
        this.level = options.level || 'info';
        this.silent = options.silent || false;
        this.environment = options.environment || 'development';
        this.release = options.release;
        this.protocolOptions = options.protocolOptions || {};
        this.disableMessageSanification = options.disableMessageSanification || false;
        this.legacyFormat = options.legacyFormat || false;
        this.customPayload = {};

        Object.keys(options).forEach((key) => {
            if (key[0] === '_') this.customPayload[key] = options[key];
        });

        // set protocol to use
        if (this.protocol === 'tcp' || this.protocol === 'tls') this.setupTCP();
        else if (this.protocol === 'http' || this.protocol === 'https') this.setupHTTP();
        else throw new TypeError('protocol shoud be one of the following: tcp, tls, http or https');
    }

    /**
     * Parse winston level as a string and return its equivalent numeric value
     * @param { String }
     * @return {int} level
     */
    // eslint-disable-next-line
    levelToInt(level) {
        return WINSTON_LEVELS[level] || 0;
    }

    /**
     * Open a TCP socket and setups logger funtions
     */
    setupTCP() {
        const options = Object.assign({
            host: this.host,
            port: this.port,
            rejectUnauthorized: false
        }, this.protocolOptions);

        // whether or not tls is required
        let clientType;
        if (this.protocol === 'tls') clientType = secNet;
        else clientType = net;

        const client = clientType.connect(options);
        if (this.keepAlive >= 0) {
            client.setKeepAlive(true, this.keepAlive);
        }

        client.on('connect', () => {
            debug('Connected to Graylog server');
            client.reconnect = 0;
        });

        if (this.timeout >= 0) {
            client.setTimeout(this.timeout);

            client.on('timeout', () => {
                debug('Timeout to Graylog server');
                client.end();
            });
        }

        client.on('end', () => {
            debug('Disconnected from Graylog server');
        });

        client.on('error', (err) => {
            debug('Error connecting to Graylog:', err.message);
            client.reconnect = client.reconnect + 1 || 0;
        });

        client.on('close', () => {
            if (!client.ended && (this.reconnect < 0 || client.reconnect < this.reconnect)) {
                client.timeout_id = setTimeout(() => {
                    client.timeout_id = null;
                    client.connect(options);
                }, this.wait);
            }
        });

        this.send = (msg) => {
            client.write(`${msg}\0`);
        };

        this.end = () => {
            if (client.timeout_id) {
                clearTimeout(client.timeout_id);
            }
            client.ended = true;
            client.end();
        };
    }

    /**
     * Set HTTP(S) connection and setup logger function
     */
    setupHTTP() {
        const headers = Object.assign({
            'Content-Type': 'application/json'
        }, this.protocolOptions && this.protocolOptions.headers);

        const clientType = this.protocol === 'https' ? https : http;

        const options = Object.assign(
            {
                port: this.port,
                hostname: this.host,
                path: '/gelf',
                method: 'POST',
                rejectUnauthorized: false,
                agent: new clientType.Agent({
                    keepAlive: this.keepAlive >= 0,
                    keepAliveMsecs: this.keepAlive
                })
            },
            this.protocolOptions,
            {
                headers
            }
        );

        this.send = (msg) => {
            options.headers['Content-Length'] = Buffer.byteLength(msg);

            const req = clientType.request(options/* , (res) => {
                // usefull for debug
                // console.log('statusCode: ', res.statusCode);
            } */ /* eslint-disable-line */);

            req.on('error', (e) => {
                debug('Error connecting to Graylog:', e.message);
            });

            req.write(msg);
            req.end();
        };
    }

    /**
     * Handle log message
     * @param { Object } info – log object
     * @param { Function } callback
     */
    log(info, callback) {
        if (this.silent) {
            callback();
            return;
        }

        const shortMessage = (typeof info.message === 'string' || info.message instanceof String) ? info.message.split('\n')[0] : info.message;
        let fullMessage;
        if (this.legacyFormat) {
            const meta = {};
            Object.keys(info).forEach((key) => {
                if (key !== 'error' && key !== 'level') meta[key] = info[key];
            });

            fullMessage = JSON.stringify(meta, null, 2);
        }
        else {
            fullMessage = info.message;
        }

        const payload = {
            version: '1.1',
            timestamp: Date.now() / 1000,
            level: this.levelToInt(info.level),
            host: this.hostname,
            short_message: shortMessage,
            full_message: fullMessage,
            _service: this.service,
            _environment: this.environment,
            _release: this.release
        };

        if (!this.legacyFormat) {
            Object.keys(info).forEach((key) => {
                if (key !== 'error' && key !== 'level' && key !== 'message' && key !== 'id') {
                    let value = info[key];
                    if (!this.disableMessageSanification) {
                        const valueType = typeof value;
                        if (valueType !== 'string' && valueType !== 'number') value = JSON.stringify(value);
                    }

                    payload[`_${key}`] = value;
                }
            });
        }

        const gelfMsg = Object.assign({}, payload, this.customPayload);
        this.send(JSON.stringify(gelfMsg));

        // as we can't know when tcp is sent, delay cb for 2secs
        if (info.exception && this.exitOnError) {
            setTimeout(() => {
                this.end();
                process.exit(1);
            }, this.exitDelay);
        }

        callback();
    }
}

module.exports = Log2gelf;
