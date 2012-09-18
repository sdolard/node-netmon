/*
Copyright © 2011-2012 by Sebastien Dolard (sdolard@gmail.com)
*/


var 
//node
util = require('util'),
fs = require('fs'),

// contrib
getopt = require('posix-getopt'), 
colors = require('colors'), 


// lib
configLoader = require('../lib/config'),
netjob = require('../lib/netjob'),

// gvar
INTERVAL_DEFAULT_VALUE = 1000,
app,

NetmonApp = function() {
	// global var
	this.configFile = __dirname + "/../bin/config.default.json";
	this.quiet = false;
	this.push_interval = INTERVAL_DEFAULT_VALUE; // default value in ms
	this.push_intetval_id = -1;
	
	
	this.jobs = {};
	this.output_json_file_name = undefined;
	this.port = undefined;
	this.io = undefined;
	
	this.getProcessArgs();	
	this.loadConfig();
};


/**
* Display help
*/

NetmonApp.prototype.displayHelp = function() {
	console.log('netmon [-c config_file] [-o output_json_file] [-p port] [-i interval] [-q] [-h] ');
	console.log('netmon: A network job engine.');
	console.log('Options:');
	console.log('  c: json config file');
	console.log('  q: quiet. Do not display anything to console');	
	console.log('  p: port. Send result to specified port. Socket io event: "mon"');
	console.log('  o: output json file');
	console.log('  i: millisecond interval to write to output_json_file/to emit via socketio. Default 1000ms.');
	console.log('  h: display this help');
};



NetmonApp.prototype.initSocketIo = function(port) {
	// note, io.listen(<port>) will create a http server for you
	this.io = require('socket.io').listen(port);
	this.io.set('log level', 1);
};


// Log
NetmonApp.prototype._log = function() {
	if (this.quiet) {
		return;
	}
	console.log.apply(console, arguments);
};

// Error log
NetmonApp.prototype._error = function() {
	if (this.quiet) {
		return;
	}
	console.error.apply(console, arguments);
};

NetmonApp.prototype.getProcessArgs = function(){
	var 
	optParser, opt;
	
	// Command line options
	optParser = new getopt.BasicParser(':hqc:o:p:i:', process.argv);
	while ((opt = optParser.getopt()) !== undefined && !opt.error) {
		switch(opt.option) {
		case 'c': 
			this.configFile = opt.optarg;
			break;
			
		case 'o': 
			this.output_json_file_name = opt.optarg;
			break;
			
		case 'h': // help
			this.displayHelp();
			process.exit();
			break;
			
		case 'q': // quiet
			this.quiet = true;
			break;
			
		case 'p': // port
			this.port = parseInt(opt.optarg, 10);
			break;
			
		case 'i': // interval
			this.push_interval = parseInt(opt.optarg, 10);
			break;
			
		default:
			this._error('Invalid or incomplete option');
			this.displayHelp();
			process.exit(1);	
		}
	}
	
	
	// Current config file
	this._log('Reading configuration from: %s', this.configFile);
	
	// output file
	if (this.output_json_file_name) {
		this._log('Result will be written in: %s', this.output_json_file_name);
	}
	// socket.io
	if (this.port > 0) {
		this.initSocketIo(this.port);
	}
	// push_interval
	if (this.push_interval !== INTERVAL_DEFAULT_VALUE) {
		this._log('Push interval default value changed: %dms (default %dms)', 
			this.push_interval, INTERVAL_DEFAULT_VALUE);
	}
};



NetmonApp.prototype.writeResult = function() {
	this.writeToFile();
	this.writeToSocket();
};

NetmonApp.prototype.writeToFile = function() {
	var 
	me = this;
	if (this.output_json_file_name === undefined) {
		return;
	}
	fs.writeFile(this.output_json_file_name, util.format('%j', this.jobs), function (err) {
			if (err) {
				me._error(err);
			}
	});
};

NetmonApp.prototype.writeToSocket = function() {
	if (this.port === undefined) {
		return;
	}
	this.io.sockets.emit('mon', util.format('%j', this.jobs));
};


NetmonApp.prototype.toDataItem = function(config) {
	config = config || {};
	var data;
	
	if(config.job) {
		data = config.job.getConfig();
	} else {
		data = config.task.getConfig();
	}
	data.err = config.err;
	data.config = config.config;
	data.response = config.response;
	
	return data;
};

/**
* {Error} Error
* {Object} config
* {Object} reponse
* {NetTask} task
* {NetJob} job
*/
NetmonApp.prototype.onTaskResult = function(err, config, response, task, job) {
	var msg = util.format('%s (%s): %s on %s %s', 
		response ? response.date.toString(): new Date().toString(), 
		task.id, 
		task.action, 
		task.config.host, 
		err === undefined ? 'succeed': 'failed');
	
	if (err) {
		msg = util.format('%s (%s: %s)', msg, err.code, err.message);
		this._error(msg.red);
	} else {
		this._log(msg.green);	
	}
	
	// Creating task property if not exists
	if (!this.jobs[job.id].hasOwnProperty('task')) {
		this.jobs[job.id].task = {};
	}
	this.jobs[job.id].task[task.id] = this.toDataItem({
			task: task,
			err: err,
			config: config,
			response: response
	});
};

/**
* {NetJob} job 
*/
NetmonApp.prototype.onJobDone = function(job) {
	if (job.runOnce && job.getDoneCount() === 1) {
		this.jobs[job.id].doneCount = job.getDoneCount(); 
		this._log('JOB TERMINATED: id %s'.white, job.id);
		this.stopIfOnceJobsDone();
	} else {
		this._log('JOB DONE: id %s'.white, job.id);
	}
};

/**
* {NetJob} job 
*/
NetmonApp.prototype.stopIfOnceJobsDone = function() {
	var 
	jobId,
	jobCount = 0,
	terminatedJobs = 0;
	for (jobId in this.jobs) {
		if (this.jobs.hasOwnProperty(jobId)) {
			jobCount++;
			if (this.jobs[jobId].runOnce && this.jobs[jobId].doneCount > 0) {
				terminatedJobs++;
			}
		}
	}
	if (terminatedJobs > 0 && terminatedJobs === jobCount) {
		if (terminatedJobs > 1) {
			this._log('JOBS TERMINATED.'.white);
		}
		if (this.push_intetval_id !== -1) {
			clearInterval(this.push_intetval_id);
			this.push_intetval_id = -1;
		}
		this.writeResult();
		this._log('Please wait. Halting...'.white);
	}
};


NetmonApp.prototype.loadConfig = function() {
	var
	me = this;
	
	configLoader.load(this.configFile, function(err, config){
			var 
			i = 0,
			jobConfig, 
			job, 
			jobCount = 0;
			
			if (err) {
				me._error(err);
				process.exit(1);
				return;
			}
			
			if (!config.crontab) {
				me._error('Invalid config file: no crontab property');
			}
			
			for (i = 0; i < config.crontab.length; i++){
				jobConfig = netjob.sanitizeConfig(config.crontab[i]);
				jobConfig.id = 'job' + parseInt(jobCount++,10);
				if (!jobConfig.enabled) { // must be done after setting ID, jobCount is always inc even if state is off
					continue;
				}
				me._log('Adding job: ', jobConfig.description);
				//me._log('job: ', util.inspect(jobConfig, true, 100));
				
				
				if (jobConfig.task.length === 0) {
					me._error('An enabled job has no task'.red);
					continue;
				}
				
				job = netjob.create(jobConfig);
				job.on('result', me.onTaskResult.bind(me));
				job.on('done', me.onJobDone.bind(me));
				me.jobs[job.id] = me.toDataItem({
						job: job
				});
			}
			if (Object.keys(me.jobs).length === 0) {
				me._error('No job. Aborting.'.red);
				process.exit(1);
			} else {
				// Init
				me.writeResult();
				
				// Write result to file each second 
				if (me.output_json_file_name || me.port > 0) {
					me.push_intetval_id = setInterval(me.writeResult.bind(me), me.push_interval);
				}
			}
	});	
};

app = new NetmonApp(); 


/*
process.on('uncaughtException', function (err) {
console.log('Caught exception: ' + err);
process.exit(1);
});
*/

