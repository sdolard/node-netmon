var 
// needed for EventEmitter class
events = require('events'),
// util are needed to extend class
util = require('util');


var
/**
 * Constant to used for state of Monitor. 
 * Monitor state is set to this value when the monitor is runing
 */
START = 'START',
/**
 * Constant to used for state of Monitor. 
 * Monitor state is set to this value when the monitor is paused 
 */
PAUSE = 'PAUSE',
/**
 * Constant to used for state of Monitor. 
 * Monitor state is set to this value when the monitor is stoped
 */
STOP = 'STOP';


/**
 * a monitor is an interface to controle a product to monitor (pc to ping, web server to connect, Netasq fw to check, etc)
 * @extends EventEmitter
 * @event state Emit when the state of this Monitor change (can be START, STOP or PAUSE)
 */
function Monitor () {
	events.EventEmitter.call(this);
	this.state = STOP;
}

// Monitor inherits of EventEmitter
util.inherits(Monitor, events.EventEmitter);


// export state constants
exports.START = START;
exports.PAUSE = PAUSE;
exports.STOP = STOP;

/**
 * start this monitor. If already runing this function do nothing
 */
Monitor.prototype.start = function () {
	if (this.state === START) {
		return;
	}
	this.state = START;
	this.emit("state", this.state);
};

/**
 * pause this monitor. if stoped or paused this function do nothing
 */
Monitor.prototype.pause = function () {
	if (this.state === PAUSE || this.state === STOP) {
		return;
	}
	this.state = PAUSE;
	this.emit("state", this.state);
};

/**
 * resume this monitor. if already runing this function do nothing
 */
Monitor.prototype.resume = function () {
	if (this.state === START) {
		return;
	}
	this.state = START;
	this.emit("state", this.state);
};

/**
 * stop this monitor. If alraedy stop this function do nohting
 */
Monitor.prototype.stop = function () {
	if (this.state === STOP) {
		return;
	}
	this.state = STOP;
	this.emit("state", this.state);
};

/**
 * return current state of this monitor
 */
Monitor.prototype.state = function () {
	return this.state;
};

exports.Monitor = Monitor;
