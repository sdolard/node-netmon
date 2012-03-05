// Monitor extend EventEmiter so events lib are needed
var EventEmitter = require('events').EventEmitter;

// util are needed to extend EventEmitter class
var util = require('util');

/**
 * a monitor is an interface to controle a product to monitor (pc to ping, web server to connect, Netasq fw to check, etc)
 */
function Monitor () {
	EventEmitter.call(this);
	this.state = Monitor.STOP;
}

util.inherits(Monitor, EventEmitter);

Monitor.START = 'START';
Monitor.PAUSE = 'PAUSE';
Monitor.STOP = 'STOP';

Monitor.prototype.start = function () {
	this.state = Monitor.START;
	this.emit("state", this.state);
};

Monitor.prototype.pause = function () {
	this.state = Monitor.PAUSE;
	this.emit("state", this.state);
};

Monitor.prototype.resume = function () {
	this.state = Monitor.START;
	this.emit("state", this.state);
};

Monitor.prototype.stop = function () {
	this.state = Monitor.STOP;
	this.emit("state", this.state);
};

Monitor.prototype.state = function () {
	return this.state;
};

if (exports) {
	exports.Monitor = Monitor;
}
