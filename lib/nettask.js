/*
Copyright © 2011-2012 by Sebastien Dolard (sdolard@gmail.com)
*/


/*
A 'task':
- is contain in a 'task set'
- run an action (ping, http check, tcp check, node netasq script...)
- can contains a 'task set collection' as dependency. 'task set collection' will be runned on THIS TASK 'taskresult' (success, failure, complete)
- emit a 'taskstart' event for each tasks of this set or subset
- emit a 'taskprogress' event for each tasks of this set or subset
- emit a 'taskresult' event for each tasks of this set or subset
- emit a 'done' event when THIS task is done AND tasks of his 'task set collection' are done

*/

var
//node
util = require('util'),
events = require('events'),

// contrib
_ = require('underscore'),


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

	// state
	this.state = 'neverstarted';

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



NetTask.prototype.getData = function(){
	var config = {
		verbose: this.verbose,
		config: _.clone(this.config),
		id: this.id,
		action: this.action,
		enabled: this.enabled,
		description: this.description,
		state: this.state
	};
	// we do not return password
	delete config.config.pwd;
	// we do not return login
	delete config.config.login;

	return config;
};


NetTask.prototype.run = function(){
	var
	me = this,
	plugin;

	function start() {
		var startTime = Date.now();

		plugin.run(me.id, me.config,  function (err, config, response) {
			if (!err) {
				response = response || {};
				if (typeof response === 'string') {
					response = {
						msg: response
					};
				}
				if (!response.date) {
					response.date = new Date();
				}

				response.msDuration = Date.now() - startTime;
			} else {
				err.msDuration = Date.now() - startTime;
			}
			me.state = 'result';
			me.emit('taskresult', err, config, response, me);
			me._runSubNetTaskSetCollection('complete');
			if (err) {
				me.log('%s failed: %s', this.action, err.message);
				me._runSubNetTaskSetCollection('failure');
			} else {
				me.log("%s succeed", this.action);
				me._runSubNetTaskSetCollection('success');
			}
			if (me._subNetTaskSetCollections.length === 0) {
				me.state = 'done';
				me.emit('done', me);
			}
		}, function(msg) {
			msg = msg || {};
			if (typeof msg === 'string') {
				msg = {
					msg: msg
				};
			}
			if (!msg.msg) {
				msg.msg = '';
			}
			if (!msg.date) {
				msg.date = new Date();
			}
			msg.msDuration = Date.now() - startTime;

			me.state = 'progress';
			me.emit('taskprogress', me.config, me, msg);
		});
	}

	try {
		plugin = require('./plugin/'+ this.action);
	} catch(e) {
		return this._eexception({
				message: 'Plugin not found: "' + this.action + '"',
				code: 'EPLUGINNOTFOUND'
		});
	}

	if (plugin.hasOwnProperty('run')) {
		this.state  = 'starting';
		this.emit('taskstart', this.config, this);
		start();
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
	netTaskSetCollection.on('taskstart', this._onTaskSetCollectionStart.bind(this));
	netTaskSetCollection.on('taskprogress', this._onTaskSetCollectionProgress.bind(this));
	netTaskSetCollection.on('taskresult', this._onTaskSetCollectionResult.bind(this));
	netTaskSetCollection.on('done', this._onTaskSetCollectionDone.bind(this));
	this._subNetTaskSetCollections.push(netTaskSetCollection);
	netTaskSetCollection.run();
};


/**
* @param {Object} config
* @param {NetTask} taskSet
*/
NetTask.prototype._onTaskSetCollectionStart = function (config, task) {
	this.emit('taskstart', config, task);
};

/**
* @param {Object} config
* @param {NetTask} taskSet
* @param {Object} msg
*/
NetTask.prototype._onTaskSetCollectionProgress = function (config, task, msg) {
	this.emit('taskprogress', config, task, msg);
};

/**
* @param {Error} err
* @param {Object} config
* @param {Object} response
* @param {NetTask} taskSet
*/
NetTask.prototype._onTaskSetCollectionResult = function (err, config, response, task) {
	this.emit('taskresult', err, config, response, task);
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
	this.state = 'done';
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



