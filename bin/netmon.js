//#!/usr/bin/env node
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

// global var
configFile = __dirname + "/config.default.json",
quiet = false,
optParser, opt,
jobs = {},
output_json_file_name;


/**
* Display help
*/
function displayHelp() {
    console.log('netmon [-c config_file] [-o output_json_file] [–q] [–h]');
    console.log('netmon: A network job engine.');
    console.log('Options:');
    console.log('  c: jslint file (overload default)');
    console.log('  q: quiet. Do not display anything to console');	
    console.log('  o: output json file');
    console.log('  h: display this help');
}


// Log
function _log() {
    if (quiet) {
    	return;
    }
    console.log.apply(console, arguments);
}

// Error log
function _error() {
    if (quiet) {
    	return;
    }
    console.error.apply(console, arguments);
}


// Command line options
optParser = new getopt.BasicParser(':hqc:o:', process.argv);
while ((opt = optParser.getopt()) !== undefined && !opt.error) {
    switch(opt.option) {
    case 'c': 
    	configFile = opt.optarg;
    	break;
    	
    case 'o': 
    	output_json_file_name = opt.optarg;
    	break;
    	
    case 'h': // help
    	displayHelp();
    	process.exit();
    	break;
    	
    case 'q': // quiet
    	quiet = true;
    	break;
    	
    default:
    	_error('Invalid or incomplete option');
    	displayHelp();
    	process.exit(1);	
    }
}

function writeToFile() {
	if (output_json_file_name === undefined) {
		return;
	}
	fs.writeFile(output_json_file_name, util.format('%j', jobs), function (err) {
			if (err) {
				_error(err);
			}
	});
}

// Current config file
_log('Reading configuration from: %s', configFile);
// output file
if (output_json_file_name) {
	_log('Result will be written in: %s', output_json_file_name);
}

function toDataItem(config) {
	config = config || {};
	var data;
	if(config.job) {
		data = config.job.getConfig();
	} else {
		data = config.task.getConfig();
	}
	data.err = config.err;
	data.data = config.data;
	
	return data;
}

function onTaskResult(/*Error*/err, /*Object*/data, /*NetTask*/ task, /*NetJob*/job) {
	var msg = util.format('%s (%s): %s on %s %s', data.date.toString(), task.id, task.action, task.host, 
		err === undefined ? 'succeed': 'failed');
	
	if (err) {
		msg = util.format('%s (%s: %s)', msg, err.code, err.message);
		_log(msg.red);
	} else {
		_log(msg.green);	
	}
	
	// Creating task property if not exists
	if (!jobs[job.id].hasOwnProperty('task')) {
		jobs[job.id].task = {};
	}
	
	jobs[job.id].task[task.id] = toDataItem({
			task: task,
			err: err,
			data: data
	});
}


function onJobDone(/*NetJob*/ job) {
	_log('JOB DONE: id %s', job.id);
}


configLoader.load(configFile, function(err, config){
		var i = 0,
		jobConfig, job, jobCount = 0;
		
		if (err) {
			_error(err);
			return;
		}
		
		if (!config.crontab) {
			_error('Invalid config file: no crontab property');
		}
		
		for (i = 0; i < config.crontab.length; i++){
			jobConfig = netjob.sanitizeConfig(config.crontab[i]);
			jobConfig.id = 'job' + parseInt(jobCount++,10);
			if (!jobConfig.enabled) { // must be done after setting ID, jobCount is always inc even if state is off
				continue;
			}
			if (jobConfig.task.length === 0) {
				_error('An enabled job has no task'.red);
				continue;
			}

			job = netjob.create(jobConfig);
			job.on('result', onTaskResult);
			job.on('done', onJobDone);
			jobs[job.id] = toDataItem({
					job: job
			});
			
		}
		
		// Init
		writeToFile();
});


// Write result to file each second
if (output_json_file_name) {
	setInterval(function() {
			writeToFile();	
	}, 1000);
}

/*process.on('uncaughtException', function (err) {
		console.log('Caught exception: ' + err);
		process.exit(1);
});*/



