var 
util = require('util'),
cron = require('cron'),
http = require('../lib/http'),
ping = require('../lib/ping'),
configLoader = require('../lib/config'),
configFile = __dirname + "/config.default.json",
CRON_EACH_SECOND = '* * * * * *',
jobList = [],
rootParent = {};

console.log(configFile);


function createActionfn(config) {
	return function() {
		if (config._isRunning) {
			console.log('job %d (%s) already running', config.id, config.description);
			return;
		}
		config._isRunning = true;
		
		switch(config.action) {
		case 'ping': 
			ping.check({
					host: config.host
			}, function (err, r) {
				
				if (err) {
					console.log(err.message);
				} else if(r.exitCode === 0) {
					console.log("Ping succeed on: %s", r.host);
				} else {
					console.log("Ping succeed: ", err);          
				}
				config._isRunning = false;
			});
			break;
			
		case 'http': 
			http.check({
					host: config.host
			}, function (err, r) {
				
				if (err) {
					console.log('Http error:', err.message); 
				} else if(r.statusCode === 200) {
					console.log("Http succeed on: %s", r.host);
				} else {
					console.log("Http succeed on: %s(%d)", r.host, r.statusCode); 
				}
				config._isRunning = false;
			});
			break;
			
		}
 	};
}


configLoader.load(configFile, function(err, config){
		var i = 0,
		jobConfig,
		cronJob;
		
		if (err) {
			console.log(err);
			return;
		}
		
		if (!config.monitor) {
			throw new Error('Invalid config file.');
		}
		
		for (i = 0; i < config.monitor.length; i++){
			//debugger;
			
			jobConfig = config.monitor[i];			
			console.log(util.inspect(jobConfig, false, 100));
			
			// host
			if (!jobConfig.host) {
				throw new Error('No host');
			}
			
			// action
			jobConfig.action = jobConfig.action || "ping";
			
			// cron
			jobConfig.cron = jobConfig.cron || CRON_EACH_SECOND;
			
			
			// enabled
			if (jobConfig.enabled === undefined) {
				jobConfig.enabled = true;
			}
			
			// id
			jobConfig.id = jobList.length + 1;
			
			// description
			jobConfig.description = jobConfig.description || '';
			
			// _isRunning
			jobConfig._isRunning = false;
			
			// _parent
			jobConfig._parent = rootParent;
			
			
			cronJob = new cron.CronJob(jobConfig.cron, createActionfn(jobConfig));
			jobList.push(cronJob);
		}
});



