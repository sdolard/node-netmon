/*
Copyright © 2011-2012 by Sebastien Dolard (sdolard@gmail.com)
*/


/*

A 'task set collection':
- is contain in a 'job'
- is a collection of 'task set'. It can contains only one
- run 'task sets' with a sequential access. Previous 'task set' must be done to run next one, and so on
- emit a 'taskstart' event for each contained tasks
- emit a 'taskresult' event for each contained tasks 
- emit a 'done' event when all 'task sets' are done

*/

var
// node
util = require('util'),
events = require('events'),

// lib
nettask_set = require('./nettask_set'),

// global var
autoId = 0,

/**
* @class
* @param [{Array} tasks]
* @param [{String} parentId]
*/
NetTaskSetCollection = function(tasks, parentId) {
	events.EventEmitter.call(this);
	
	tasks = NetTaskSetCollection.sanitizeConfig(tasks);
	
	if(tasks instanceof Error) {
		return this._eexception(tasks); 
	}
	
	// tasks
	this.tasks = tasks;
	
	// id
	if (parentId === undefined) {
		this.id = autoId++;
	} else {
		this.id = parentId + '.c';
	}
};
util.inherits(NetTaskSetCollection, events.EventEmitter);


NetTaskSetCollection.prototype.run = function(){
	var i, taskSetConfig, taskSet, taskSetCount = 0;
	
	// collection
	this._collection = [];	
	for (i = 0; i < this.tasks.length; i++) {
		taskSetConfig = nettask_set.sanitizeConfig(this.tasks[i]);
		if (taskSetConfig instanceof Error) {
			return this._eexception(taskSetConfig);
		}

		taskSetConfig.id = this.id + '.s' + parseInt(taskSetCount++, 10);		
		if (!taskSetConfig.enabled) { // must be done after setting ID, taskSetCount is always inc even if state is off
			continue;
		}

		taskSet = nettask_set.create(taskSetConfig);
		taskSet.on('taskstart', this._onTaskStart.bind(this));
		taskSet.on('taskprogress', this._onTaskProgress.bind(this));
		taskSet.on('taskresult', this._onTaskResult.bind(this));
		// Should be once to manage sync exception
		// Those will break collection managment
		taskSet.once('done', this._onTaskSetDone.bind(this));
		this._collection.push(taskSet);
	}
	
	if (this._collection.length === 0) {
		this.emit('done', this);
	} else {
		// We run first one
		this._collection[0].run();
	}
};


NetTaskSetCollection.sanitizeConfig = function(config) {
	var err, cleanConfig;
	if (!config instanceof Array) {
		err = new Error('tasks must be an array');
		err.code = 'EINVALIDTASKS';
		return err;
	}

	if (config.length === 0) {
		return config;
	}
	
	if (!config[0].set) {
		cleanConfig = [];
		cleanConfig.push({
				set: config
			});
	} else {
		cleanConfig = config;
	}
	return cleanConfig;
};

/**
* @param {Object} config
* @param {NetTask} task
*/
NetTaskSetCollection.prototype._onTaskStart = function (config, task) {
	this.emit('taskstart', config, task);
};

/**
* @param {Object} config
* @param {NetTask} task
* @param {Object} msg
*/
NetTaskSetCollection.prototype._onTaskProgress = function (config, task, msg) {
	this.emit('taskprogress', config, task, msg);
};

/**
* @param {Error} err
* @param {Object} config
* @param {Object} response
* @param {NetTask} task
*/
NetTaskSetCollection.prototype._onTaskResult = function (err, config, response, task) {
	this.emit('taskresult', err, config, response, task);
};


/**
* @param {NetTaskSet} netTaskSet
*/
NetTaskSetCollection.prototype._onTaskSetDone = function (netTaskSet) {	
	// We remove first netTaskSet 
	var previousNetTaskSet = this._collection.shift();
	if (previousNetTaskSet !== netTaskSet){
		console.log('previousNetTaskSet', previousNetTaskSet);
		console.log('netTaskSet', netTaskSet);
		return this._eexception({
				message: 'Removing invalid netTaskSet (a task MUST call only once the cb!)',
				code: 'EINVALIDNETTASKSET'
		});
	}
	
	if (this._collection.length === 0) {
		this.emit('done', this);
	} else {
		// Running next one
		this._collection[0].run();
	}
};

/**
* NetTaskSetCollection only if verbose is positive
* @public
* @method
*/
NetTaskSetCollection.prototype.log = function() {
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
NetTaskSetCollection.prototype._eexception = function(exception) {
	var error;
	if (exception instanceof Error) {
		error = exception;
	} else {
		error = new Error(exception.message);
		Error.captureStackTrace(error, NetTaskSetCollection.prototype._eexception); // we do not trace this function
		error.code = exception.code;
	}
	
	this.emit('error', error);
	this.log(error.stack);
};

/******************************************************************************/
// exports
exports.create = function(config, parentId) {
	return new NetTaskSetCollection(config, parentId);
};

