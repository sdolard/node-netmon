var
//node
util = require('util'),
events = require('events'),

// lib
http = require('./http'),
ping = require('./ping'),
tcp = require('./tcp'),
netasq_http_script = require('./netasq_http_script'),

// global var
autoId = 0,

NetTask = function(/*object*/ config) {
	var me = this;
	
	events.EventEmitter.call(this);
	//this.setMaxListeners(0); //TODO: ?
	
	config = config || {};
	
	this.verbose = config.verbose || false;
	this.log(util.inspect(config, false, 100));
	
	// host
	if (!config.host) {
		return this._eexception({
				message: 'No host',
				code: 'EINVALIDHOST' 
		});
	}
	this.host = config.host;
	
	// id
	this.id = config.id || autoId++;
	
	// action
	this.action = config.action || "ping";
	
	// action configuration
	this.actionConfig = config.config;	
	
	// enabled
	this.enabled = config.enabled;
	if (this.enabled === undefined) {
		this.enabled = true;
	}
	
	// description
	this.description = config.description || '';
	
	// Event
	this._on = config.on;
	
	// sub tasks
	this._subTasks = [];
	
	// Result
	//this.result = {};
};
util.inherits(NetTask, events.EventEmitter);


NetTask.prototype.getConfig = function(){
	return {
		verbose: this.verbose,
		host: this.host,
		id: this.id,
		action: this.action,
		enabled: this.enabled,
		description: this.description
	};
};


NetTask.prototype.run = function(){
	if (!this.enabled) {
		return;
	}
	
	var 
	me = this,
	config;
	
	config = this.actionConfig || {};
	config.host = this.host;
	
	switch(this.action) {
	case 'ping': 
		this._checkPing(config);
		break;
		
	case 'http': 
		this._checkHttp(config);
		break;
		
	case 'tcp': 
		this._checkTcp(config);
		break;

	case 'netasqhttpscript': 
		this._runNetasqHttpScript(config);
		break;
		
	default:
		this._eexception({
				message: 'Task type not supported: "' + this.action + '"',
				code: 'ENOTSUPPORTEDTASKTYPE' 
		});
	}
};


NetTask.prototype._checkPing = function(config) {
	var me = this;
	
	ping.check(config, function (err, r) {
			me.emit('result', err, r, me);
			if (err) {
				me.log('Ping error on %s #', me.host, err.message);
				me._runTasks('failure');
			} else {
				me.log("Ping succeed on: %s", r.host);
				me._runTasks('success');
			}
	});
};


NetTask.prototype._checkHttp = function(config) {
	var me = this;
	
	http.check(config, function (err, r) {
			me.emit('result', err, r, me);
			if (err) {
				me.log('Http error:', err.message); 
				me._runTasks('failure');
			} else {
				me.log("Http succeed: %s(%s)", r.host, r.statusCode);
				me._runTasks('success');
			}
	});
};


NetTask.prototype._checkTcp = function(config) {
	var me = this;
	
	tcp.check(config, function (err, r) {
			me.emit('result', err, r, me);
			if (err) {
				me.log('Tcp error:', err.message); 
				me._runTasks('failure');
			} else {
				me.log("Tcp succeed: %s", r.host);
				me._runTasks('success');
			}
	});
};


NetTask.prototype._runNetasqHttpScript = function(config) {
	var me = this;
	
	netasq_http_script.run(config, function (err, r) {
			me.emit('result', err, r, me);
			if (err) {
				me.log('Netasq HTTP script error:', err.message); 
				me._runTasks('failure');
			} else {
				me.log("Netasq HTTP script succeed: %s", r.host);
				me._runTasks('success');
			}
	});
};


NetTask.prototype._getTasksToRun = function(/*string*/type) {
	if (this._on && this._on[type] && this._on[type].run) {
		return this._on[type].run;
	}
	return [];
};


NetTask.prototype._runTasks = function (/*string*/type) {
	var tasksConfig = this._getTasksToRun(type), 
	i, task, taskConfig;
	
	this._subTasks.length = 0; // clear
	
	if (tasksConfig.length === 0) {
		this.emit('done', this);
		return;
	}
	
	for (i = 0; i < tasksConfig.length; i++){
		taskConfig = tasksConfig[i];
		taskConfig.id = this.id + '.' + parseInt(this._subTasks.length + 1, 10);
		this.log('New subtask: %s', taskConfig.id);
		
		// enabled ?
		if (taskConfig.enabled === undefined) {
			taskConfig.enabled = true;
		}
		if (!taskConfig.enabled) { // We do not add/run disabled tasks
			continue;
		}
		
		task = new NetTask(taskConfig);
		task.on('result', this._createTaskResultCallback());
		task.on('done', this._createTaskDoneCallback());
		this._subTasks.push(task);
		task.run();
	}
};


NetTask.prototype._createTaskResultCallback = function() {
	var me = this;
	return function (/*Error*/err, /*Object*/data, /*NetTask*/task) {
		me.emit('result', err, data, task);
	};
};


NetTask.prototype._createTaskDoneCallback = function() {
	var me = this;
	return function (/*NetTask*/task) {
		var i;
		for(i = 0; i < me._subTasks.length; i++) {
			if (me._subTasks[i].id === task.id){
				me._subTasks.splice(i, 1);
				break;
			}
		}
		if (me._subTasks.length === 0) {
			me.emit('done', me);
		}
	};
};

/**
* NetTask only if verbose is positive
* @public
* @method
*/
NetTask.prototype.log = function() {
    if (!this.verbose) {
        return;
    }
    var args = arguments,
    v = parseInt((new Date()).getTime(), 10) + ' verbose # ';
    args[0] = args[0].replace('\n', '\n' + v);
    args[0] = v.concat(args[0]);
    console.error.apply(console, args);
};


/**
* @private
*/
NetTask.prototype._eexception = function(exception) {
    var error;
    if (exception instanceof Error) {
        error = exception;
    } else {
        error = new Error(exception.message);
        Error.captureStackTrace(error, NetTask.prototype._eexception); // we do not trace this function
        error.code = exception.code;
    }
    
    this.emit('error', error);
    this.log(error.stack);
};


/**
*@private
*/
NetTask.prototype._eemit = function() {
    switch (arguments.length) {
    case 2:
        this.emit(arguments[0], arguments[1]);
        break;
    case 3:
        this.emit(arguments[0], arguments[1], arguments[2]);
        break;
    default:
        throw new Error('NetTask.prototype._eemit: argument(s) missing');
    }
};


exports.create = function(/*object*/ config) {
	return new NetTask(/*object*/ config);
};

