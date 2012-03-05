var Monitor = require ('./monitor').Monitor;


// Monitor extend EventEmiter so events lib are needed
var EventEmitter = require('events').EventEmitter;

// util are needed to extend EventEmitter class and to use spawn to instanciate a ping
var util = require('util');

// child_process is needed to create an instance of ping
var spawn = require('child_process').spawn;



function Ping (host) {
	var me = this;

	this.host = host;

	this._super = Monitor.prototype;


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

util.inherits(Ping, Monitor);

Ping.prototype.start = function () {
	var me = this;
	this.ping = spawn.apply(this, ['ping', [this.host]]);
	this.ping.stdout.on('data', this.sendData);
	this.ping.on('exit', function (code, signal) {
		me.state = Monitor.STOP;
		me.emit('exit', "ping exit!");

		// TODO manage exit and signall
		console.log('code: ', code);
		console.log('signal: ', signal);
	});
	this._super.start.call(this);
};

Ping.prototype.pause = function () {
	// send kill  STOP
	if (this.ping) {
		this.ping.kill('SIGSTOP');
		this._super.pause.call(this);
	}
};

Ping.prototype.resume = function () {
	// send kill  CONT 
	this.ping.kill('SIGCONT');
	this._super.resume.call(this);
};

Ping.prototype.stop = function () {
	if (this.ping) {
		// send kill KILL 
		this.ping.kill('SIGTERM');
		this.ping.removeListener('data', this.sendData);
		this.ping = null;
		this._super.stop.call(this);
	}
};

Ping.prototype.toString = function () {
	return '[Ping: ' + this.host + ']';
};

exports.Ping = Ping;
