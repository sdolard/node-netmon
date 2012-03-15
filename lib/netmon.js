var 
ping = require('./ping'), // Ping monitor
http = require('./http'), // Ping monitor
util = require('util'), // util used to inherits from MonitoEventEmmiter
events = require('events'), // used to inherits form EventEmitter
START = 'START',
STOP = 'STOP';

function NetworkMonitor (config) {
	var me = this;

	config = config || {};

	if (config.interval) {
		this.interval = config.interval;
	}

	if (config.timeout) {
		this.timeout = config.timeout;
	}

	this.index = 0;

	this.sendPingData = function (err, data) {
		data.type = 'ping';
		// TODO check data.data information to see if ping succeded
		data.success = data.exitCode === 0;

		me.emit('data', data);
		if (me.state === START) {
			me.next();
		} else {
			// state have switch from START to STOP
			me.emitState();
		}
	};

	this.sendHttpData = function (err, data) {
		data.type = 'http';
		// TODO cehck data.data information to see if ping succeded
		data.success = !err;
		if (err) {
			data.exitCode = err.stack || err.code || err;
		}

		me.emit('data', data);
		if (me.state === START) {
			me.next();
		} else {
			// state have switch from START to STOP
			me.emitState();
		}
	};

	this.monitors = [];
	if (config.monitors) {
		this.setMonitors(config.monitors);
	}
}

util.inherits(NetworkMonitor, events.EventEmitter);


/**
 * take an array of configuration information and set internal monitors array
 * @param {Object[]} monitors an Array of monitors object containing type and target
 */
NetworkMonitor.prototype.setMonitors = function (monitors) {
	var monitor;
	for(monitor in  monitors) {
		if (monitors.hasOwnProperty(monitor)) {

			monitors[monitor].target = monitor;

			// ping monitor
			if (monitors[monitor].type.indexOf('ping') !== -1) {
				console.log('monitor: add ping on ' + monitor);
				this.monitors.push(this.pingMonitor(monitors[monitor]));
			}

			// http monitor
			if (monitors[monitor].type.indexOf('http') !== -1) {
				console.log('monitor: add http on ' + monitor);
				this.monitors.push(this.httpMonitor(monitors[monitor]));
			}
		}
	}
};

/**
 * the state of current monitor ('START' or 'STOP')
 * @field
 * @default null
 */
NetworkMonitor.prototype.state = STOP;


/**
 * the current monitor in process or null if none;
 * @field
 * @default null
 */
NetworkMonitor.prototype.current = null;

/**
 * the interval to wait between to monitor (in milliscond)
 * @field
 * @default 1000
 */
NetworkMonitor.prototype.interval = 1000;

/**
 * the timeout to cancel a Ping (in second)
 * @field
 * @default 1
 */
NetworkMonitor.prototype.timeout = 1;

/**
 * internal function to convert config monitor into ping monitor
 * @private
 */
NetworkMonitor.prototype.pingMonitor = function (config) {
	return {
		fn: ping.check,
		type: 'ping',
		args: [{
				host: config.target, 
				timeout: this.timeout
		}, this.sendPingData]
	};
};

/**
 * internal function to convert config monitor into ping monitor
 * @private
 */
NetworkMonitor.prototype.httpMonitor = function (config) {
	return {
		fn: http.check,
		type: 'http',
		args: [{
			host: config.target
		}, this.sendHttpData]
	};
};

/**
 * used internaly to send event emit when state change
 * @private
 * @event state send the news state
 */
NetworkMonitor.prototype.emitState = function () {
	this.emit('state', this.state);
};

NetworkMonitor.prototype.next = function () {
	var me = this;
	if (this.monitors.length <= 0) {
		console.log('next called but no monitor in configuration');
		return;
	}

	this.index = (this.index + 1) % this.monitors.length; 
	this.current = this.monitors[this.index];

	//console.log('current monitor [' + this.index + '] : ' + util.inspect(this.current));

	setTimeout(function () {
		//console.log('interval finish. \nstart ' + me.current);
		me.current.fn.apply(me.current, me.current.args);
	}, this.interval);
};

NetworkMonitor.prototype.start = function () {
	if (this.state === START) {
		return;
	}
	if (this.monitors.length <= 0) {
		console.log('start called but no monitor in configuration');
		return;
	}
	this.state = START;
	this.index = 0;
	this.current = this.monitors[this.index];
	// dont do next on data but on end ....
	//console.log('start monitor [' + this.index + '] : ' + util.inspect(this.current));
	this.emitState();
	this.current.fn.apply(this.current, this.current.args);
};

NetworkMonitor.prototype.stop = function () {
	this.state = STOP;
};

exports.NetworkMonitor = NetworkMonitor;
exports.START = START;
exports.STOP = STOP;

