var 
//node
util = require('util'),

// lib
configLoader = require('../lib/config'),
netjob = require('../lib/netjob'),

// global var
configFile = __dirname + "/config.default.json";

function onTaskResult(/*Error*/err, /*Object*/data, /*NetTask*/task) {
	if (err) {
		console.log('%s: %s on %s failed', task.id, task.action, task.host);
	} else {
		console.log('%s: %s on %s succeed', task.id, task.action, task.host);
	}
	//console.log('TASK RESULT: id: %s: %s', task.id, util.inspect(data, false, 100));
}

function onJobDone(task) {
	console.log('JOB DONE: id: %s', task.id);
}

configLoader.load(configFile, function(err, config){
		var i = 0,
		netJob;
		
		if (err) {
			console.log(err);
			return;
		}
		
		if (!config.monitor) {
			throw new Error('Invalid config file: no monitor property');
		}
		
		for (i = 0; i < config.monitor.length; i++){
			netJob = netjob.create(config.monitor[i]);
			netJob.on('result', onTaskResult);
			netJob.on('done', onJobDone);
		}
});





