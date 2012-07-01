/*
Copyright © 2011-2012 by Sebastien Dolard (sdolard@gmail.com)
*/


var 
vows = require('vows'),
assert = require('assert'),
util = require('util'),
os = require('os'),
events = require("events"),
ping = require('../lib/plugin/ping'),
start,
end;

exports.suite1 = vows.describe('ping').addBatch({
		'When we ping localhost': {
			topic: function() {
				var promise = new events.EventEmitter();
				
				ping.run({
						host: 'localhost'
				}, function (err, config, response) {
					if (err) { 
						promise.emit('error', err, config, response); 
					} else { 
						promise.emit('success', config, response); 
					}
				});
				return promise;
			},
			'It succeed': function (err, config, response) {
				assert.equal(config.host, 'localhost');
				assert.equal(response.exitCode, 0);
			},'Date is set': function (err, config, response) {
				assert.isNotNull(response.date);
			},'ttl is a number': function (err, config, response) {
				assert.isNumber(response.ttl);
			},'mstime is a number': function (err, config, response) {
				assert.isNumber(response.mstime);
			}
		},
		'When we ping nohost': {
			topic: function() {
				var promise = new events.EventEmitter();
				
				ping.run({
						host: 'nohost'
				}, function (err, config, response) {
					if (err) { 
						promise.emit('error', err, config, response); 
					} else { 
						promise.emit('success', config, response); 
					}
				});
				return promise;
			},
			'It failed': function (err, config, response) {
				//console.log(util.inspect(config, response));
				assert.equal(err.code, 'EPINGFAILED');
				assert.notEqual(response.exitCode, 0);
				
			},'Date is set': function (err, config, response) {
				assert.isNotNull(response.date);
			},'ttl is undefined': function (err, config, response) {
				assert.isUndefined(response.ttl);
			},'mstime is undefined': function (err, config, response) {
				assert.isUndefined(response.mstime);
			}
		},
		'When we ping ::1': {
			topic: function() {
				var promise = new events.EventEmitter();
				
				ping.run({
						host: '::1',
						ipV6: true
				}, function (err, config, response) {
					if (err) { 
						promise.emit('error', err, config, response); 
					} else { 
						promise.emit('success', config, response); 
					}
				});
				return promise;
			},
			'It succeed': function (err, config, response) {
				assert.equal(config.host, '::1');
				assert.equal(response.exitCode, 0);
			},'Date is set': function (err, config, response) {
				assert.isNotNull(response.date);
			},'ttl is a number': function (err, config, response) {
				assert.isNumber(response.ttl);
			},'mstime is a number': function (err, config, response) {
				assert.isNumber(response.mstime);
			}
		},
		'When we ping 1.1.1.1 with timeout set to 1s': {
			topic: function() {
				var	 
				promise = new events.EventEmitter();
				start = new Date();
				
				ping.run({
						host: '1.1.1.1',
						timeout: 1
				}, function (err, config, response) {
					end = new Date();
					if (err) { 
						promise.emit('error', err, config, response); 
					} else { 
						promise.emit('success', config, response); 
					}
					
				});
				return promise;
			},
			'It takes 1s to return': function (err, config, response) {
				assert.equal(config.host, '1.1.1.1');
				
				switch(os.platform()){
				case 'linux':	
					assert.equal(response.exitCode, 1);
					break;
					
				case 'darwin':
					assert.equal(response.exitCode, 2);
					break;
					
				default:
					assert.equal(response.exitCode, 1);
				}		
				
				assert.equal(end.getTime() - start.getTime() >= 1000, true);
			},
			'It failed': function (err, config, response) {
				//console.log(util.inspect(config, response));
				assert.equal(err.code, 'ENORESPONSE');
				assert.notEqual(response.exitCode, 0);
				
			},'Date is set': function (err, config, response) {
				assert.isNotNull(response.date);
			},'ttl is undefined': function (err, config, response) {
				assert.isUndefined(response.ttl);
			},'mstime is undefined': function (err, config, response) {
				assert.isUndefined(response.mstime);
			}
		}
});