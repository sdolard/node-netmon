var 
ping = require('./ping'), // Ping monitor
util = require('util'), // util used to inherits from Monitor
monitor = require ('./monitor'); // used to create object NetworkMonitor

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
	this.monitors = [
		new ping.Ping('www.google.com', this.timeout),
		new ping.Ping('www.bing.com', this.timeout)
	];

	this.sendData = function (data) {
		me.emit('data', data.toString());
		me.current.stop(function (err) {
			if (err) {
				me.emit('news', err);
			}
			// TODO on peut faire quelque chose si le monitor precedant ne c'est pas arreter? 
			if (me.state === monitor.START) {
				// continue with next monitor
				me.next();
			}
		});
		me.current = null;
	};

	// connect sendData to each monitors
	this.monitors.forEach(function (mon) {
		console.log('connect event on ping ' + mon);
		mon.on('data', me.sendData);
	});
	this._super = monitor.Monitor.prototype;

	this._super.constructor.call(this);

}

util.inherits(NetworkMonitor, monitor.Monitor);

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


NetworkMonitor.prototype.next = function () {
	var me = this;

	this.index = (this.index + 1) % this.monitors.length; 
	this.current = this.monitors[this.index];

	console.log('current monitor [' + this.index + '] : ' + this.current);

	setTimeout(function () {
		console.log('interval finish. \nstart ' + me.current);
		me.current.start();
	}, this.interval);
};

NetworkMonitor.prototype.start = function () {
	this.index = 0;
	this.current = this.monitors[this.index];
	// dont do next on data but on end ....
	console.log('start monitor [' + this.index + '] : ' + this.current);
	this.current.start();
	this._super.start.call(this);
};

NetworkMonitor.prototype.pause = function () {
	this.current.pause();
	this._super.pause.call(this);
};

NetworkMonitor.prototype.resume = function () {
	this.current.resume();
	this._super.resume.call(this);
};

NetworkMonitor.prototype.stop = function (callback) {
	this.current.stop(function () {
		this.current = null;
		this._super.stop.call(this, callback);
	});
};

exports.NetworkMonitor = NetworkMonitor;
