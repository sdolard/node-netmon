var 
util = require('util'),
cron = require('cron'),

http = require('./http'),
ping = require('./ping'),
nettask = require('./nettask'),

CRON_EACH_SECOND = '* * * * * *',
netJobList = [],

NetJob = function (config) {
	config = config || {};
	
	// host
	if (!config.host) {
		throw new Error('No host');
	}
	this.host = config.host;
	
	// action
	this.action = config.action || "ping";
	
	// action configuration
	this.actionConfig = config.config;
	
	// cron
	this.cron = config.cron || CRON_EACH_SECOND;
	
	// enabled
	if (this.enabled === undefined) {
		this.enabled = true;
	}
	
	// description
	this.description = config.description || '';
	
	// Event
	this._on = config.on;
	
	// id
	this.id = parseInt(netJobList.length + 1, 10);
	netJobList.push(this);
	
	// _isRunning
	this._isRunning = false;	
	
	// tasks
	this._tasks = [];
	
	// Run
	this._cronJob = new cron.CronJob(this.cron, this._createCronJobCallback());
	this._cronJob.start();
};

NetJob.prototype._createCronJobCallback = function () {
	var me = this;
	
	return function() {
		var checkConfig;
		if (me._isRunning) {
			//console.log('job %s (%s) already running', me.id, me.description);
			return;
		}
		me._isRunning = true;
		
		checkConfig = me.actionConfig || {};
		checkConfig.host = me.host;
		
		switch(me.action) {
		case 'ping': 
			ping.check(checkConfig, function (err, r) {
					debugger;
					if (err) {
						console.log('Ping error on %s #', me.host, err.message);
						me._runTasks('failure');
					} else {
						if (r.exitCode === 0) {
							console.log("Ping succeed on: %s", r.host);
							me._runTasks('success');
						} else {
							console.log('Ping failed on %s #', r.host);
							me._runTasks('failure');
						}
					}
			});
			break;
			
		case 'http': 
			http.check(checkConfig, function (err, r) {
					debugger;
					if (err) {
						console.log('Http error:', err.message); 
						me._runTasks('failure');
					} else {
						switch(r.statusCode) {
						case 200:
						case 302:
							console.log("Http succeed on: %s", r.host);
							me._runTasks('success');
							break;
						default:
							console.log("J > not managed http succeed: %s(%s)", r.host, r.statusCode);
							me._runTasks('success');
						}
					}
			});
			break;
		}
	};
};


NetJob.prototype._getTasksToRun = function(type) {
	if (this._on && this._on[type] && this._on[type].run) {
		return this._on[type].run;
	}
	return [];
};


NetJob.prototype._runTasks = function (type) {
	var tasksConfig = this._getTasksToRun(type), 
	i, task, taskConfig;
	
	this._tasks.length = 0; // clear
	
	if (tasksConfig.length === 0) {
		this._isRunning = false;
		return;
	}
	
	for (i = 0; i < tasksConfig.length; i++){
		taskConfig = tasksConfig[i];
		taskConfig.id = this.id + '.' + parseInt(this._tasks.length + 1, 10);
		
		task = nettask.create(taskConfig, this._taskCompleteCallback, this);
		this._tasks.push(task);		
	}
};

NetJob.prototype._taskCompleteCallback = function (id) {
	debugger;
	var i;
	for(i = 0; i < this._tasks.length; i++) {
		if (this._tasks[i].id === id){
			this._tasks.splice(i, 1);
			break;
		}
	}
	if (this._tasks.length === 0) {
		this._isRunning = false;
	}
};


exports.create = function(config) {
	return new NetJob(config);
};
