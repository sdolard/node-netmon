//#!/usr/bin/env node
var 
//node
util = require('util'),

// contrib
getopt = require('posix-getopt'), // contrib

// lib
configLoader = require('../lib/config'),
netjob = require('../lib/netjob'),

// global var
configFile = __dirname + "/config.default.json",
quiet = false,
optParser, opt;


/**
* Display help
*/
function displayHelp() {
    console.log('netmon [-c config_file] [–q] [–h]');
    console.log('netmon: A network job engine.');
    console.log('Options:');
    console.log('  c: jslint file (overload default)');
    console.log('  q: quiet. Do not display anything to console');	
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
optParser = new getopt.BasicParser(':hqc:', process.argv);
while ((opt = optParser.getopt()) !== undefined && !opt.error) {
    switch(opt.option) {
    case 'c': 
    	configFile = opt.optarg;
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

// Current configu file
_log('Reading configuration from: %s:', configFile);


function onTaskResult(/*Error*/err, /*Object*/data, /*NetTask*/task) {
	if (err) {
		_log('%s: %s on %s failed', task.id, task.action, task.host);
	} else {
		_log('%s: %s on %s succeed', task.id, task.action, task.host);
	}
}


function onJobDone(task) {
	_log('JOB DONE: id: %s', task.id);
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
		}
});





