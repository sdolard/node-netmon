/*
Copyright © 2011-2012 by Sebastien Dolard (sdolard@gmail.com)
*/


/*
A 'task':
- is contain in a 'task set'
- run an action (ping, http check, tcp check, node netasq script...)
- can contains a 'task set collection' as dependency. 'task set collection' will be runned on THIS TASK 'result' (success, failure, complete)
- emit a 'result' event for each tasks of this set or subset
- emit a 'done' event when THIS task is done AND tasks of his 'task set collection' are done

*/

var
//node
util = require('util'),
events = require('events'),

// lib
nettask_set_collection = require('./nettask_set_collection'),

// global var
autoId = 0,

/**
* @class
* @param {String} config.action ping|http|tcp|script
* @param [{Boolean} config.verbose] default false
* @param [{String|Number} config.id] default auto
* @param [{Object} config.config] default function of action value
* @param [{Boolean} config.enabled] defaullt true
* @param [{String} config.description] default ''
* @param [{Object} config.on] success.run, failure.run, complete.run
* config.on.success.run will called when this task or a sub task succeed 
* config.on.failure.run will called when this task or a sub task failed 
* config.on.complete.run will called when this task and sub tasks will be complete
*/
NetTask = function(config) {
	events.EventEmitter.call(this);
	
	config = NetTask.sanitizeConfig(config);
	if (config instanceof Error) {
		this._eexception(config);
	}
	
	// vorbose
	this.verbose = config.verbose;
	
	// id
	this.id = config.id;
	
	// action
	this.action = config.action;
	
	// action configuration
	this.config = config.config;	
	
	// enabled
	this.enabled = config.enabled;
	
	// description
	this.description = config.description || '';
	
	// Event
	this._on = config.on;
	
	// sub tasks
	this._subNetTaskSetCollections = [];
	
	this.log(util.inspect(config, true, 100));
	
};
util.inherits(NetTask, events.EventEmitter);


NetTask.sanitizeConfig = function(config){
	config = config || {};
	
	var err,
	cleanConfig = {};
	
	// verbose
	cleanConfig.verbose = config.verbose || false;

	// id
	if (config.id === undefined) {
		cleanConfig.id = autoId++;
	} else {
		cleanConfig.id = config.id;
	}
	
	// action
	cleanConfig.action = config.action;
	if(!cleanConfig.action) {
		err = new Error('action is undefined');
		err.code = 'EINVALIDACTION';
		return err;
	}
	
	// action configuration
	cleanConfig.config = config.config;
	
	// enabled
	cleanConfig.enabled = config.enabled;
	if (cleanConfig.enabled === undefined) {
		cleanConfig.enabled = true;
	}
	
	// description
	cleanConfig.description = config.description || '';
	
	// on
	cleanConfig.on = config.on;
	
	return cleanConfig;
};



NetTask.prototype.getConfig = function(){
	return {
		verbose: this.verbose,
		config: this.config,
		id: this.id,
		action: this.action,
		enabled: this.enabled,
		description: this.description
	};
};


NetTask.prototype.run = function(){
	var 
	me = this,
	plugin;
	
	plugin = require('./plugin/'+ this.action);
	if (!plugin) {
		return this._eexception({
				message: 'Plugin not found: "' + this.action + '"',
				code: 'EPLUGIN' 
		});
	}
	
	if (plugin.hasOwnProperty('run')) {
		plugin.run(this.config, function (err, config, response) {
				debugger;
				me.emit('result', err, config, response, me);
				me._runSubNetTaskSetCollection('complete');
				if (err) {
					me.log('%s failed: %s', this.action, err.message);
					me._runSubNetTaskSetCollection('failure');
				} else {
					me.log("%s succeed", this.action);
					me._runSubNetTaskSetCollection('success');
				}
				if (me._subNetTaskSetCollections.length === 0) {
					me.emit('done', me);
				}
		});
	} else {
		this._eexception({
				message: 'Task type not supported: "' + this.action + '"',
				code: 'ENOTSUPPORTEDTASKTYPE' 
		});
	}
};



/**
* @param {String} type
*/
NetTask.prototype._getNetTaskSetCollectionToRun = function(type) {
	if (this._on && this._on[type] && this._on[type].run) {
		return this._on[type].run;
	}
	return [];
};



/**
* @param {String} type
*/
NetTask.prototype._runSubNetTaskSetCollection = function(type){
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
	netTaskSetCollection.on('result', this._onTaskSetCollectionResult.bind(this));
	netTaskSetCollection.on('done', this._onTaskSetCollectionDone.bind(this));
	this._subNetTaskSetCollections.push(netTaskSetCollection);
	netTaskSetCollection.run();
};


/**
* @param {Error} err
* @param {Object} data
* @param {NetTask} taskSet
*/
NetTask.prototype._onTaskSetCollectionResult = function (err, config, response, task) {
	this.emit('result', err, config, response, task);
};


/**
* @param {NetTaskSetCollection} netTaskSetCollection
*/
NetTask.prototype._onTaskSetCollectionDone = function (netTaskSetCollection) {
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
* @param {object} config
*/
exports.create = function(config) {
	return new NetTask(config);
};

/**
* @param {object} config
*/
exports.sanitizeConfig = function( config) {
	return NetTask.sanitizeConfig(config);
};



