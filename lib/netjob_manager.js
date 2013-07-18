/*jslint node: true */
var
// node
util = require('util'),
events = require('events'),

// lib
netjob = require('./netjob'),
configLoader = require('./config'),

NetJobManager = (function() {

	function NetJobManager() {
		events.EventEmitter.call(this);
		this._jobs = {}; // jobs object ref
		this._jobsTasks = {}; // jobs tasks
		this._jobCount = 0; // used to create job id
	}
	util.inherits(NetJobManager, events.EventEmitter);

	/*
	* TODO: abort, cleanup, reload
	*/
	NetJobManager.prototype.load = function (filename, callback) {
		this.once('loaded', callback);

		configLoader.load(filename, function(err, config){
			var i = 0, e;

			if (err) {
				this.emit('loaded', err);
				return;
			}

			if (!config.jobs) {
				e = new Error('Invalid config file: no \'jobs\' property');
				e.code = 'EINVALIDCONFIGFILE';
				this.emit('loaded', e);
				return;
			}

			for (i = 0; i < config.jobs.length; i++){
				this.addJob(netjob.sanitizeConfig(config.jobs[i]));
			}
			this.emit('loaded');
		}.bind(this));
	};


	/**
	* Add a job
	* @params {Object} config
	*/
	NetJobManager.prototype.addJob = function (config) {
		var job;

		config = netjob.sanitizeConfig(config);

		// We check if config has at least one task
		if (config.task.length <= 0) {
			return this._eexception({
				code: 'EJOBWITHOUTANYTASK',
				message: 'Job defined without any task'
			});
		}

		// auto id
		config.id = 'j' + this._jobCount++;

		/*if (!jobConfig.enabled) { // must be done after setting ID, jobCount is always inc even if state is off
				continue;
		}*/

		job =  netjob.create(config);
		job.on('taskstart', this._onTaskStart.bind(this));
		job.on('taskprogress', this._onTaskProgress.bind(this));
		job.on('taskresult', this._onTaskResult.bind(this));
		job.on('done', this._onJobDone.bind(this));
		job.on('abort', this._onJobAbort.bind(this));
		this._jobs[job.id] = {
			job: job
		};

		this._jobsTasks[job.id] = {
			config: netjob.sanitizeConfig(config, false),
			tasks: {},
			doneCount: 0
		};

		this.emit('jobadd', job);
	};

	/*
	* @returns {Number}
	*/
	NetJobManager.prototype.jobCount = function() {
		return Object.keys(this._jobs).length;
	};


	/**
	* {Error} Error
	* {Object} config
	* {Object} reponse
	* {NetTask} task
	* {NetJob} job
	*/
	NetJobManager.prototype._onTaskStart = function(config, task, job) {
		this._jobsTasks[job.id].tasks[task.id] = this.toDataItem({
				task: task,
				config: config
		});

		this.emit('taskstart', config, task, job);
	};

	/**
	* {Error} Error
	* {Object} config
	* {Object} reponse
	* {NetTask} task
	* {NetJob} job
	*/
	NetJobManager.prototype._onTaskProgress = function(config, task, message, job) {
		this._jobsTasks[job.id].tasks[task.id] = this.toDataItem({
				task: task,
				config: config,
				message: message
		});

		this.emit('taskprogress', config, task, message, job);
	};

	/**
	* {Error} err
	* {Object} config
	* {Object} reponse
	* {NetTask} task
	* {NetJob} job
	*/
	NetJobManager.prototype._onTaskResult = function(err, config, response, task, job) {
		this._jobsTasks[job.id].tasks[task.id] = this.toDataItem({
				task: task,
				err: err,
				config: config,
				response: response
		});

		this.emit('taskresult', err, config, response, task, job);
	};


	NetJobManager.prototype._onJobDone = function(job) {
		this._jobsTasks[job.id].doneCount = job.getDoneCount();
		this.emit('jobdone', job);
	};

	NetJobManager.prototype._onJobAbort = function(job) {
		this.emit('jobabort', job);
	};


	/**
	* @returns {Boolean} true if all jobs are terminated
	*/
	NetJobManager.prototype.jobsAreTerminated = function() {
		var jobId;
		if (this.jobCount() === 0) {
			return true;
		}

		for (jobId in this._jobs) {
			if (this._jobs.hasOwnProperty(jobId)) {
				if (!this._jobs[jobId].job.isTerminated()) {
					return false;
				}
			}
		}

		return true;
	};

	NetJobManager.prototype.toDataItem = function(config) {
		config = config || {};
		var data, i, keys;

		if(config.job) {
			data = config.job.getData();
		} else {
			data = config.task.getData();
		}

		// TODO: thing to serialize correctly Error message property
		if (config.err) {
			data.err = {};
			keys = Object.keys(config.err);
			for (i = 0;  i < keys.length; i++) {
				data.err[keys[i]] = config.err[keys[i]];
			}
			data.err.message = config.err.message;
		}
		data.response = config.response;
		data.message = config.message;

		return data;
	};

	/*
	*
	*/
	NetJobManager.prototype.abort = function() {
		var jobId;
		for (jobId in this._jobs) {
			if (this._jobs.hasOwnProperty(jobId)) {
				this._jobs[jobId].job.abort();
			}
		}
	};

	/*
	* @private
	*/
	NetJobManager.prototype._eexception = function(exception) {
		var error;
		if (exception instanceof Error) {
			error = exception;
		} else {
			error = new Error(exception.message);
			Error.captureStackTrace(error, NetJobManager.prototype._eexception); // we do not trace this function
			error.code = exception.code;
		}

		this.emit('error', error);
		this._log(error.stack);
	};

	/**
	* NetTask only if verbose is positive
	* @public
	* @method
	*/
	NetJobManager.prototype._log = function() {
		if (!this.verbose) {
			return;
		}
		var args = arguments,
		v = parseInt((new Date()).getTime(), 10) + ' verbose # ';
		args[0] = args[0].replace('\n', '\n' + v);
		args[0] = v.concat(args[0]);
		console.error.apply(console, args);
	};

	/*
	*
	*/
	NetJobManager.prototype.jobsTasks = function() {
		return this._jobsTasks;
	};

	return NetJobManager;
}());


exports.create = function() {
	return new NetJobManager();
};