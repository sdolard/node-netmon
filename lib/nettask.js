var
util = require('util'),

http = require('./http'),
ping = require('./ping'),
emptyFn = function(){},
autoId = 0,

NetTask = function(/*object*/ config, /*function*/ callback, /*object*/ callbackScope) {
	debugger;
	config = config || {};
	
	//console.log(util.inspect(config, false, 100));
	
	// host
	if (!config.host) {
		throw new Error('No host');
	}
	
	this.id = config.id || autoId++;
	
	// host
	if (!config.host) {
		throw new Error('No host');
	}
	this.host = config.host;
	
	// callback
	this.callback = callback || emptyFn;
	this.callbackScope = callbackScope;
	
	// action
	this.action = config.action || "ping";
	
	// action configuration
	this.actionConfig = config.config;	
	
	// enabled
	if (this.enabled === undefined) {
		this.enabled = true;
	}
	
	// description
	this.description = config.description || '';
	
	// Event
	this._on = config.on;
	
	// tasks
	this._tasks = [];
	
	this.run();
};


NetTask.prototype.run = function(){
	var 
	me = this,
	checkConfig;
	
	/*if (this._isComplete) {
	throw new Error('Task %s (%s) is already complete', this.id, this.description);
	}*/
	
	checkConfig = this.actionConfig || {};
	checkConfig.host = this.host;
	
	switch(this.action) {
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
						debugger;
						console.log("T> not managed http succeed: %s(%s)", r.host, r.statusCode);
						me._runTasks('success');
					}
				}
		});
		break;
	}
};


NetTask.prototype._getTasksToRun = function(type) {
	if (this._on && this._on[type] && this._on[type].run) {
		return this._on[type].run;
	}
	return [];
};


NetTask.prototype._runTasks = function (type) {
	debugger;
	var tasksConfig = this._getTasksToRun(type), 
	i, task, taskConfig;
	
	this._tasks.length = 0; // clear
	
	if (tasksConfig.length === 0) {
		debugger;
		this.callback.call(this.callbackScope, this.id);
		return;
	}
	
	for (i = 0; i < tasksConfig.length; i++){
		debugger;
		taskConfig = tasksConfig[i];
		taskConfig.id = this.id + '.' + parseInt(this._tasks.length + 1, 10);
		
		task = new NetTask(taskConfig, this._taskCompleteCallback, this);
		this._tasks.push(task);
	}
};

NetTask.prototype._taskCompleteCallback = function (id) {
	debugger;
	var i;
	for(i = 0; i < this._tasks.length; i++) {
		if (this._tasks[i].id === id){
			this._tasks.splice(i, 1);
			break;
		}
	}
	if (this._tasks.length === 0) {
		this.callback.call(this.callbackScope, this.id);
	}
};



exports.create = function(/*object*/ config, /*function*/ callback, /*object*/ callbackScope) {
	return new NetTask(/*object*/ config, /*function*/ callback, /*object*/ callbackScope);
};
