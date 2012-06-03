/*

A 'task set':
  - is contain in a 'task set collection'
  - is a set of tasks. It can contains only one
  - run tasks in parallel (async node style)
  - can contains a 'task set collection' as dependency. 'task set collection' will be runned on THOSE TASKS 'result' (success, failure, complete)
  - emit a 'result' event for each contained tasks 
  - emit a 'done' event when all 'tasks' are done
  
*/

var
//node
util = require('util'),
events = require('events'),

// lib
nettask = require('./nettask'),
nettask_set_collection = require('./nettask_set_collection'),

// global var
autoId = 0,

/**
* @class
* @param [{Array|Object} config]
*/
NetTaskSet = function(config) {
	events.EventEmitter.call(this);
	
	config = NetTaskSet.sanitizeConfig(config);
	
	// set
	this.set = config.set;
	
	// id
	this.id = config.id;
	
	// verbose
	this.verbose = config.verbose;
	
	// enabled
	this.enabled = config.enabled;
	
	// description
	this.description = config.description;
	
	// Event
	this._on = config.on;
	
	// tasks
	this._tasks = [];
	
	// sub tasks
	this._subNetTaskSetCollections = [];
};
util.inherits(NetTaskSet, events.EventEmitter);


/**
* @static
*/
NetTaskSet.sanitizeConfig = function(config) {
	config = config || [];
	var cleanConfig = {};
	
	// array of tasks or 'set' property?
	if (config.set) {
		cleanConfig.set = config.set || [];
		// Event
		cleanConfig.on = config.on;
	} else {
		cleanConfig.set = [];
		cleanConfig.set.push(config);
	}
	
	// id
	if (config.id === undefined) {
		cleanConfig.id = autoId++;
	} else {
		cleanConfig.id = config.id;
	}
	
	// verbose
	cleanConfig.verbose = config.verbose || false;
	
	// enabled
	if (cleanConfig.enabled === undefined) {
		cleanConfig.enabled = true;
	}
	
	// description
	cleanConfig.description = config.description || '';
	
	return cleanConfig;
};


NetTaskSet.prototype.run = function(){
	var i, taskConfig, task, taskCount = 0;
	this._resultCount = {
		failure: 0,
		success: 0
	};
	for(i = 0; i < this.set.length; i++) {
		taskConfig = nettask.sanitizeConfig(this.set[i]);
		taskConfig.id = this.id + '.task' + parseInt(taskCount++, 10);
		if (!taskConfig.enabled) { // must be done after setting ID, taskCount is always inc even if state is off
			continue;
		}
		task = nettask.create(taskConfig);
		task.on('result', this._onTaskResult.bind(this));
		task.on('done', this._onTaskDone.bind(this));
		this._tasks.push(task);
		task.run();
	}
	
	// If there is no task, we send done event
	if (this._tasks.length === 0) {
		this.emit('done', this);
	}
};


/**
* @param {Error} err
* @param {Object} data
* @param {NetTask} taskSet
*/
NetTaskSet.prototype._onTaskResult = function (err, data, task) {
	if (err) {
		this._resultCount.failure++;
	} else {
		this._resultCount.success++;
	}
	this.emit('result', err, data, task);
};


/**
* @param {NetTask} task
*/
NetTaskSet.prototype._onTaskDone = function (task) {
	var i;
	for(i = 0; i < this._tasks.length; i++) {
		if (this._tasks[i] === task){
			this._tasks.splice(i, 1);
			break;
		}
	}
	if (this._tasks.length !== 0) {
		return;
	}
	
	this._runSubNetTaskSetCollections();	
};

/**
* @param {String} type
*/
NetTaskSet.prototype._getNetTaskSetCollectionToRun = function(type) {
	if (this._on && this._on[type] && this._on[type].run) {
		return this._on[type].run;
	}
	return [];
};


NetTaskSet.prototype._runSubNetTaskSetCollections = function(){
	// Complete event
	this._runSubNetTaskSetCollection('complete');
	
	if (this._resultCount.failure === 0 && this._resultCount.success > 0) {
		this._runSubNetTaskSetCollection('success');
	}
	
	if (this._resultCount.success === 0 && this._resultCount.failure > 0) {
		this._runSubNetTaskSetCollection('failure');
	}
	
	if (this._subNetTaskSetCollections.length === 0) {
		this.emit('done', this);
	}
};

/**
* @param {String} type
*/
NetTaskSet.prototype._runSubNetTaskSetCollection = function(type){
	var 
	netTaskSetCollectionConfig,
	netTaskSetCollection;
	
	// netTaskSetCollectionConfig
	netTaskSetCollectionConfig = this._getNetTaskSetCollectionToRun(type);
	if (netTaskSetCollectionConfig.length === 0) {
		return;
	}
	
	// netTaskSetCollection
	netTaskSetCollection = nettask_set_collection.create(netTaskSetCollectionConfig, this.id + '.' + type);
	netTaskSetCollection.on('result', this._onTaskResult.bind(this));
	netTaskSetCollection.on('done', this._onTaskSetCollectionDone.bind(this));
	this._subNetTaskSetCollections.push(netTaskSetCollection);
	netTaskSetCollection.run();
};


/**
* @param {NetTaskSetCollection} netTaskSetCollection
*/
NetTaskSet.prototype._onTaskSetCollectionDone = function (netTaskSetCollection) {
	var i;
	for(i = 0; i < this._subNetTaskSetCollections.length; i++) {
		if (this._subNetTaskSetCollections[i] === netTaskSetCollection){
			this._subNetTaskSetCollections.splice(i, 1);
			break;
		}
	}
	if (this._subNetTaskSetCollections.length !== 0) {
		return;
	}
	
	this.emit('done', this);
};



/**
* NetTaskSet only if verbose is positive
* @public
* @method
*/
NetTaskSet.prototype.log = function() {
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
NetTaskSet.prototype._eexception = function(exception) {
    var error;
    if (exception instanceof Error) {
        error = exception;
    } else {
        error = new Error(exception.message);
        Error.captureStackTrace(error, NetTaskSet.prototype._eexception); // we do not trace this function
        error.code = exception.code;
    }
    
    this.emit('error', error);
    this.log(error.stack);
};

/**
* @param {object} config
*/
exports.create = function(config) {
	return new NetTaskSet( config);
};

/**
* @param {object} config
*/
exports.sanitizeConfig = function( config) {
	return NetTaskSet.sanitizeConfig(config);
};
