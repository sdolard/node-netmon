var 
ping = require('./ping'), // Ping monitor
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

	this.sendPingData = function (data) {
		data.type = 'ping';
		// TODO cehck data.data information to see if ping succeded
		data.success = data.exitCode === 0;

		me.emit('data', data);
		if (me.state === START) {
			me.next();
		} else {
			// state have switch from START to STOP
			me.emitState();
		}
	};

	this.monitors = [{
		fn: ping.check,
		type: 'ping',
		args: ['www.google.com', this.timeout, this.sendPingData]
	}, {
		fn: ping.check,
		type: 'ping',
		args: ['www.bing.com', this.timeout, this.sendPingData]
	}];

}

util.inherits(NetworkMonitor, events.EventEmitter);

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
 * used internaly to send event emit when state change
 * @private
 * @event state send the news state
 */
NetworkMonitor.prototype.emitState = function () {
	this.emit('state', this.state);
};



NetworkMonitor.prototype.next = function () {
	var me = this;

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

