var 
// node
events = require("events"),
util = require('util');


/**
 * a monitor is an interface to control a product to monitor (pc to ping, web server to connect, Netasq fw to check, etc)
 * @class
 * @extends EventEmitter
 * @event state Emit when the state of this Monitor change (can be START, STOP or PAUSE)
 */
function Monitor () {
	events.EventEmitter.call(this);
	this.verbose =  false;
}
// Monitor inherits of EventEmitter
util.inherits(Monitor, events.EventEmitter);


/**
* @private
*/
Monitor.prototype._eexception = function(exception) {
	var error = new Error(exception.message);
	
	error.code = exception.code;
	this.emit('error', error);
	if (this.verbose && typeof error.stack === 'string') {
		console.log(error.stack);
	}
};


/** 
* Log only if verbose is positive
* @private
* @method
*/
Monitor.prototype._log = function() {
	if (!this.verbose) {
		return;
	}
	var 
	args = arguments,
	v = parseInt((new Date()).getTime(), 10) + ' ' + this + '#';
	args[0] = args[0].replace('\n', '\n' + v);
	args[0] = v.concat(args[0]);
	console.error.apply(console, args);
};


exports.Monitor = Monitor;
