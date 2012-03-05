var 
	Ping = require('./ping.js').Ping,
	util = require('util');
// ping.start();



// Monitor extend EventEmiter so events lib are needed
var EventEmitter = require('events').EventEmitter;

var Monitor = require ('./monitor').Monitor;

function NetworkMonitor () {
	var me = this;

	this.index = 0;
	this.pings = [
		new Ping('www.google.com'),
		new Ping('www.bing.com')
	];

	this.sendData = function (data) {
		me.emit('data', data.toString());
		me.currentPing().stop();
	};

	this.nextOnStop = function (state) {
		if (state === Monitor.STOP) {
			me.next();
		}
	};
	this.pings.forEach(function (ping) {
		console.log('connect event on ping ' + ping.toString());
		ping.on('data', me.sendData);
		ping.on('state', me.nextOnStop);
	});
	this._super = Monitor.prototype;

	this._super.constructor.call(this);

}

util.inherits(NetworkMonitor, Monitor);

NetworkMonitor.prototype.currentPing = function () {
	return this.pings[this.index];
};

NetworkMonitor.prototype.next = function () {
	var me = this;
	console.log('next!');
	this.index = (this.index + 1) % this.pings.length; 
	console.log('new index = ' + this.index);
	setTimeout(function () {
		console.log('start ' + me.currentPing().toString());
		me.currentPing().start();
	}, 2000);
};

NetworkMonitor.prototype.start = function () {
	this.index = 0;
	// dont do next on data but on end ....
	console.log('start ' + this.currentPing().toString());
	this.pings[this.index].start();
	this._super.start.call(this);
};

NetworkMonitor.prototype.pause = function () {
	this.currentPing().pause();
	this._super.pause.call(this);
};

NetworkMonitor.prototype.resume = function () {
	this.currentPing().resume();
	this._super.resume.call(this);
};

NetworkMonitor.prototype.stop = function () {
	this.currentPing().stop();
	this._super.stop.call(this);
};

exports.NetworkMonitor = NetworkMonitor;
