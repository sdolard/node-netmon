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
jobList = {},
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
    	_log('Result will be written in: %s', output_json_file_name);
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
	fs.writeFile(output_json_file_name, util.format('%j', jobList), function (err) {
			if (err) {
				_error(err);
			}
	});
}

// Current config file
_log('Reading configuration from: %s', configFile);


function onTaskResult(/*Error*/err, /*Object*/data, /*NetTask*/task) {
	var msg = util.format('%s: %s on %s %s', data.date.toString(), task.action, task.host, err === undefined ? 'succeed': 'failed');
	if (err) {
		_log(msg.red);
	} else {
		_log(msg.green);	
	}
	
	//_log('%s: %s on %s %s (%s)', task.id, task.action, task.host, err === undefined ? 'succeed'.green : 'failed'.red, data.date.toString());
	jobList[task.id] = task;
}


function onJobDone(task) {
	//_log('JOB DONE: id %s', task.id);
	writeToFile();
}


configLoader.load(configFile, function(err, config){
		var i = 0,
		netJob;
		
		if (err) {
			_error(err);
			return;
		}
		
		if (!config.monitor) {
			_error('Invalid config file: no monitor property');
		}
		
		for (i = 0; i < config.monitor.length; i++){
			netJob = netjob.create(config.monitor[i]);
			netJob.on('result', onTaskResult);
			netJob.on('done', onJobDone);
			jobList[netJob.id] = netJob.cleanedUpTask();
		}
		
		// Init
		writeToFile();
});





