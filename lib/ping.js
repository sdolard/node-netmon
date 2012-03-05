var 
// Monitor are extended by Ping
monitor = require ('./monitor'),
// util are needed to extend class
util = require('util'),
// child_process is needed to create an instance of ping
spawn = require('child_process').spawn;


/**
 * Ping class used to monitor a computer and check if it's joinable
 * @extends Monitor
 * @event data Send when ping get data (response of ping or timeout
 * @event exit Send when ping process have exited
 */
function Ping (host) {
	var me = this;

	this.host = host;

	this._super = monitor.Monitor.prototype;


	this.sendData = function (message) {
		/*
		var data = {
			date: new Date(),
			message: message.toString() 
		};
		*/
		me.emit('data', message);
	};
}

// inherits from Monitor
util.inherits(Ping, monitor.Monitor);

/**
 * spawn a ping child and connect exit event
 */
Ping.prototype.start = function () {
	var me = this;
	this.ping = spawn.apply(this, ['ping', [this.host]]);
	this.ping.stdout.on('data', this.sendData);
	this.ping.on('exit', function (code, signal) {
		me.state = monitor.STOP;
		me.emit('exit', "ping exit!");

		// TODO manage exit and signall
		console.log('code: ', code);
		console.log('signal: ', signal);
	});
	this._super.start.call(this);
};

/**
 * send sigstop to current ping process
 */
Ping.prototype.pause = function () {
	// send kill  STOP
	if (this.ping) {
		this.ping.kill('SIGSTOP');
		this._super.pause.call(this);
	}
};

/**
 * send sigcont to continue ping process
 */
Ping.prototype.resume = function () {
	// send kill  CONT 
	this.ping.kill('SIGCONT');
	this._super.resume.call(this);
};

/**
 * kill to process. This action will send exit emiter.
 */
Ping.prototype.stop = function () {
	if (this.ping) {
		// send kill KILL 
		this.ping.kill('SIGTERM');
		this.ping.removeListener('data', this.sendData);
		this.ping = null;
		this._super.stop.call(this);
	}
};

/**
 * return string that describe Ping.
 */
Ping.prototype.toString = function () {
	return '[Ping on ' + this.host + ': ' + this.state + ']';
};

exports.Ping = Ping;
