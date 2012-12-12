/*
Copyright © 2011-2012 by Sebastien Dolard (sdolard@gmail.com)
*/


/*
Job engine description
- job
/- task set collection
/- task set
/- task
/- task
/- ...
/- task set
/- ...
- job
- ...


A 'task':
- is contain in a 'task set'
- run an action (ping, http check, tcp check, node netasq script...)
- can contains a 'task set collection' as dependency. 'task set collection' will be runned on THIS TASK 'taskresult' (success, failure, complete)
- emit a 'taskstart' event for each tasks of this set or subset
- emit a 'taskresult' event for each tasks of this set or subset
- emit a 'done' event when THIS task is done AND tasks of his 'task set collection' are done

A 'task set':
- is contain in a 'task set collection'
- is a set of tasks. It can contains only one
- run tasks in parallel (async node style)
- can contains a 'task set collection' as dependency. 'task set collection' will be runned on THOSE TASKS 'taskresult' (success, failure, complete)
- emit a 'taskstart' event for each contained tasks
- emit a 'taskresult' event for each contained tasks 
- emit a 'done' event when all 'tasks' are done


A 'task set collection':
- is contain in a 'job'
- is a collection of 'task set'. It can contains only one
- run 'task sets' with a sequential access. Previous 'task set' must be done to run next one, and so on
- emit a 'taskstart' event for each contained tasks
- emit a 'taskresult' event for each contained tasks 
- emit a 'done' event when all 'task sets' are done


A 'job'
- run a 'task set collection' when time arrive (cf cronTime rules)
- contains only one 'task set collection'
- emit a 'taskstart' event for each contained tasks
- emit a 'taskresult' event for each contained tasks 
- emit a 'done' event when 'task set collection' is done

*/

var 
// node
util = require('util'),
events = require('events'),

// contrib
cron = require('cron'),

// lib
nettask_set_collection = require('./nettask_set_collection'),

NetJob = (function() {
	var
	// global var
	autoId = 0,
	CRON_EACH_SECOND = '* * * * * *';
	
	
	/**
	* @param [{String|DateTime} config.cronTime] default '* * * * * *' > each second
	* @param [{Boolean} config.runOnce] default false, to run a job only one time
	* @param [{Boolean} config.verbose] default false
	* @param [{String|Number} config.id] default auto
	* @param [{Boolean} config.enabled] defaullt true
	* @param [{String} config.description] default ''
	*/ 
	function NetJob(config) {	
		events.EventEmitter.call(this);
		
		config = NetJob.sanitizeConfig(config);
		
		// verbose
		this.verbose = config.verbose;
		
		// id
		this.id = config.id;
		
		// cron
		this.cronTime = config.cronTime;
		
		// run once
		this.runOnce = config.runOnce;
		
		// enabled, used too to abord
		this.enabled = config.enabled;
		
		// description
		this.description = config.description;
		
		// done count
		this._doneCount = 0;

		// set to true when job is aborted
		// see 
		this._aborted = false;
		
		// _taskSetCollection
		this._taskSetCollection = nettask_set_collection.create(config.task, this.id); 
		this._taskSetCollection.on('taskstart', this._onTaskStart.bind(this));
		this._taskSetCollection.on('taskprogress', this._onTaskProgress.bind(this));
		this._taskSetCollection.on('taskresult', this._onTaskResult.bind(this));
		this._taskSetCollection.on('done', this._onTaskSetCollectionDone.bind(this));
		
		// CronJob
		this._cronJob = new cron.CronJob(this.cronTime, this._onCronJobTick.bind(this));
		
		// CronJob start
		if (this.enabled) {
			this._wasEnabled = true;
			this._cronJob.start();
		} else {
			this._wasEnabled = false;
		}
	}
	util.inherits(NetJob, events.EventEmitter);
	
	/**
	* @static
	*/
	NetJob.sanitizeConfig = function(config) {
		config = config || {};
		
		var cleanConfig = {};
		
		// verbose
		cleanConfig.verbose = config.verbose || false;
		
		// id
		if (config.id === undefined) {
			cleanConfig.id = autoId++;
		} else {
			cleanConfig.id = config.id;
		}
		
		// cron
		cleanConfig.cronTime = config.cronTime || CRON_EACH_SECOND;
		
		// runOnce
		cleanConfig.runOnce = config.runOnce;
		
		// enabled
		if (cleanConfig.enabled === undefined) {
			cleanConfig.enabled = true;
		}
		cleanConfig.enabled = config.enabled;
		
		// description
		cleanConfig.description = config.description || '';
		
		// task
		cleanConfig.task = config.task || [];
		
		return cleanConfig;
	};
	
	
	NetJob.prototype.getData = function(){
		return {
			verbose: this.verbose,
			id: this.id,
			cronTime: this.cronTime,
			runOnce: this.runOnce,
			doneCount: this._doneCount,
			enabled: this.enabled,
			description: this.description
		};
	};
	
	
	NetJob.prototype._onCronJobTick = function () {
		this._cronJob.stop(); 
		this._taskSetCollection.run();
	};
	
	
	NetJob.prototype.abort = function () {
		this.enabled = false;
		if (this._cronJob.running) {
			this._cronJob.stop();

			this._abort();
		}
	};

	NetJob.prototype._abort = function () {
		this._aborted = true;
		this.emit('abort', this);
	};
	
	/**
	* @param {Object} config
	* @param {Object} task
	*/
	NetJob.prototype._onTaskStart = function (config, task) {
		this.emit('taskstart', config, task, this);
	};
	
	/**
	* @param {Object} config
	* @param {Object} task
	*/
	NetJob.prototype._onTaskProgress = function (config, task, msg) {
		this.emit('taskprogress', config, task, msg, this);
	};
	
	/**
	* @param {Error} err
	* @param {Object} config
	* @param {Object} response
	* @param {NetTask} task
	*/
	NetJob.prototype._onTaskResult = function (err, config, response, task) {
		this.emit('taskresult', err, config, response, task, this);
	};
	
	
	/**
	* @param {NetTaskSetCollection} netTaskSetCollection
	*/
	NetJob.prototype._onTaskSetCollectionDone = function (taskSetCollection) {
		this._doneCount++;
		this.emit('done', this);
		if (!this.runOnce) {
			// job is stopped when tick event came
			if (this.enabled) {
				this._cronJob.start();
			} else {
				this._abort();
			}
		}
	};
	
	/**
	* @returns {Number} of job done 
	*/
	NetJob.prototype.getDoneCount = function () {
		return this._doneCount;
	};

	/**
	* @returns {Boolean} true if job is terminated
	* Terminated meens that job as been run at least once and is
	* no more running 
	*/
	NetJob.prototype.isTerminated = function () {
		if (!this._wasEnabled) {
			return true;
		}

		if (this._aborted) {
			return true;
		}

		if (!this.runOnce) {
			return false;
		}

		return this._doneCount > 0;
	};
	
	
	/**
	* NetTask only if verbose is positive
	* @public
	* @method
	*/
	NetJob.prototype._log = function() {
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
	NetJob.prototype._eexception = function(exception) {
		var error;
		if (exception instanceof Error) {
			error = exception;
		} else {
			error = new Error(exception.message);
			Error.captureStackTrace(error, NetJob.prototype._eexception); // we do not trace this function
			error.code = exception.code;
		}
		
		this.emit('error', error);
		this._log(error.stack);
	};

	return NetJob;
	
}());

exports.create = function(config) {
	return new NetJob(config);
};

exports.sanitizeConfig = function(config) {
	return NetJob.sanitizeConfig(config);
};

