var 
// node
util = require('util'),
events = require('events'),

// contrib
cron = require('cron'),

// lib
http = require('./http'),
ping = require('./ping'),
nettask = require('./nettask'),

// global var
CRON_EACH_SECOND = '* * * * * *',

NetJob = function (config) {
	var me = this;
	
	events.EventEmitter.call(this);
	//this.setMaxListeners(0);//TODO: ?
	
	config = config || {};
	
	this.verbose = config.verbose || false;
	
	this._task = nettask.create(config); 
	this._task.on('result', function (/*Error*/err, /*Object*/data, /*NetTask*/task) {
			me.emit('result', err, data, task, this._task === task ? me : undefined);
	});
	this._task.on('done', function (/*NetTask*/task) {
			me._isRunning = false;
			me.emit('done', task, this._task === task ? me : undefined);
	});
	
	this.id = this._task.id;
	
	// cron
	this.cron = config.cron || CRON_EACH_SECOND;
	
	// _isRunning
	this._isRunning = false;	
	
	// Run
	this._cronJob = new cron.CronJob(this.cron, this._createCronJobCallback());
	this._cronJob.start();
};
util.inherits(NetJob, events.EventEmitter);


NetJob.prototype.getConfig = function(){
	var taskConfig = this._task.getConfig();
	
	taskConfig.cron = this.cron;
	taskConfig.verbose = this.verbose;
	
	return taskConfig;
};


NetJob.prototype._createCronJobCallback = function () {
	var me = this;
	
	return function() {
		var checkConfig;
		if (me._isRunning) {
			return;
		}
		if (me._task.enabled) {
			me._isRunning = true;
			me._task.run();
		} else {
			me._isRunning = false;
		}
	};
};

/**
* NetTask only if verbose is positive
* @public
* @method
*/
NetJob.prototype.log = function() {
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
    this.log(error.stack);
};


/**
*@private
*/
NetJob.prototype._eemit = function() {
    switch (arguments.length) {
    case 2:
        this.emit(arguments[0], arguments[1]);
        break;
    case 3:
        this.emit(arguments[0], arguments[1], arguments[2]);
        break;
    default:
        throw new Error('NetJob.prototype._eemit: argument(s) missing');
    }
};


exports.create = function(config) {
	return new NetJob(config);
};
