var 
vows = require('vows'),
assert = require('assert'),
util = require('util'),
ping = require('../lib/ping'),
localhostPing;


exports.suite1 = vows.describe('ping').addBatch({
    'When we ping localhost': {
	topic: function () {
		localhostPing = ping.create('localhost'); 
		localhostPing.star();
	},
	'We succeed': function (error, stdout, stderr) {
	}
    }
});