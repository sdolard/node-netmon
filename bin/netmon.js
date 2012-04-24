var 
util = require('util'),
http = require('../lib/http'),
ping = require('../lib/ping'),
configLoader = require('../lib/config'),
configFile = __dirname + "/config.default.json";
console.log(configFile);
configLoader.load(configFile, function(err, config){
		if (err) {
			console.log(err);
			return;
		}
		console.log(util.inspect(config, false, 100));
});

