const os = require('os');
const net = require('net');
const secNet = require('tls');
const http = require('http');
const https = require('https');
const Transport = require('winston-transport');

class Log2gelf extends Transport {
    constructor(options) {
        super(options);

        this.name = options.name || 'log2gelf';
        this.hostname = options.hostname || os.hostname();
        this.host = options.host || '127.0.0.1';
        this.port = options.port || 12201;
        this.protocol = options.protocol || 'tcp';
        this.reconnect = options.reconnect || '0';
        this.wait = options.wait || 1000;
        this.exitOnError = options.exitOnError || false;
        this.exitDelay = options.exitDelay || 2000;
        this.service = options.service || 'nodejs';
        this.level = options.level || 'info';
        this.silent = options.silent || false;
        this.environment = options.environment || 'development';
        this.release = options.release;
        this.protocolOptions = options.protocolOptions || {};
        this.customPayload = {};

        Object.keys(options).forEach((key) => {
            if (key[0] === '_') this.customPayload[key] = options[key];
        });

        // set protocol to use
        if (this.protocol === 'tcp' || this.protocol === 'tls') {
            const tcpGelf = this.sendTCPGelf();
            this.send = tcpGelf.send;
            this.end = tcpGelf.end;
        }

        else if (this.protocol === 'http' || this.protocol === 'https') this.send = this.sendHTTPGelf(this.host, this.port, false);
        else throw new TypeError('protocol shoud be one of the following: tcp, tls, http or https');
    }

    /**
     * Parse winston level as a string and return its equivalent numeric value
     * @param { String }
     * @return {int} level
     */
    levelToInt(level) { // eslint-disable-line
        if (level === 'error') return 0;
        if (level === 'warn') return 1;
        if (level === 'info') return 2;
        if (level === 'verbose') return 3;
        if (level === 'debug') return 4;
        if (level === 'silly') return 5;

        return 0;
    }

    /**
     * Open a TCP socket and return a logger funtion
     * @return { Function } logger – logger(JSONlogs)
     */
    sendTCPGelf() {
        const options = Object.assign({}, this.protocolOptions, {
            host: this.host,
            port: this.port,
            rejectUnauthorized: false
        });

        // whether or not tls is required
        let clientType;
        if (this.protocol === 'tls') clientType = secNet;
        else clientType = net;

        const client = clientType.connect(options);

        client.on('connect', () => {
            console.log('Connected to Graylog server');
            client.reconnect = 0;
        });

        client.on('end', () => {
            console.log('Disconnected from Graylog server');
        });

        client.on('error', (err) => {
            console.error('Error connecting to Graylog:', err.message);
            client.reconnect = client.reconnect + 1 || 0;
        });

        client.on('close', () => {
            if (!client.ended && (this.reconnect === -1 || client.reconnect < this.reconnect)) {
                client.timeout_id = setTimeout(() => {
                    client.timeout_id = null;
                    client.connect(options);
                }, this.wait);
            }
        });

        return {
            send(msg) {
                client.write(`${msg}\0`);
            },
            end() {
                if (client.timeout_id) {
                    clearTimeout(client.timeout_id);
                }
                client.ended = true;
                client.end();
            }
        };
    }

    /**
     * Set HTTP(S) connection and return logger function
     * @return { Function } logger – logger(JSONlogs)
     */
    sendHTTPGelf() {
        const options = {
            port: this.port,
            hostname: this.host,
            path: '/gelf',
            method: 'POST',
            rejectUnauthorized: false
        };

        let clientType;
        if (this.protocol === 'https') clientType = https;
        else clientType = http;

        return (msg) => {
            options.headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(msg)
            };

            const req = clientType.request(options, (res) => { // eslint-disable-line
                // usefull for debug
                // console.log('statusCode: ', res.statusCode);
            });

            req.on('error', (e) => {
                console.error('Error connecting to Graylog:', e.message);
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

        const msg = (typeof info.message === 'string' || info.message instanceof String) ? info.message.split('\n')[0] : info.message;

        const meta = {};
        Object.keys(info).forEach((key) => {
            if (key !== 'error' && key !== 'level') meta[key] = info[key];
        });

        const payload = {
            timestamp: Date.now() / 1000,
            level: this.levelToInt(info.level),
            host: this.hostname,
            short_message: msg,
            full_message: JSON.stringify(meta, null, 2),
            _service: this.service,
            _environment: this.environment,
            _release: this.release
        };

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
