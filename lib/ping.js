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
function Ping (host, timeout) {
	var me = this;

	this.host = host;
	this.timeout = timeout;

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
	var options = [this.host];
	if (this.timeout && typeof(this.timeout) === 'number') {
		options.push('-W ' + this.timeout);
		console.log(this.toString()  + 'timeout set to : ' + this.timeout);

	}
	this.ping = spawn.apply(this, ['ping', options]);
	this.ping.stdout.on('data', this.sendData);
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
Ping.prototype.stop = function (callback) {
	var me = this;
	if (this.ping) {
		// connect callback on exit
		this.ping.on('exit', function () {
			me._super.stop.call(this, callback);
		});

		// remove listener
		this.ping.removeListener('data', this.sendData);

		// send kill KILL 
		this.ping.kill('SIGTERM');
		this.ping = null;
	}
};

/**
 * return string that describe Ping.
 */
Ping.prototype.toString = function () {
	return '[Ping on ' + this.host + ' | state: ' + this.state + ']';
};

exports.Ping = Ping;
