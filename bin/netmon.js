var 
configLoader = require('../lib/config'),
netjob = require('../lib/netjob'),
configFile = __dirname + "/config.default.json";


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
			//debugger;
			netJob = netjob.create(config.monitor[i]);
		}
});





