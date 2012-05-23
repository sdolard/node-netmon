var 
vows = require('vows'),
assert = require('assert'),
util = require('util'),
os = require('os'),
events = require("events"),
ping = require('../lib/ping'),
start,
end;

exports.suite1 = vows.describe('ping').addBatch({
		'When we ping localhost': {
			topic: function() {
				var promise = new events.EventEmitter();
				
				ping.check({
						host: 'localhost'
				}, function (err, r) {
					if (err) { 
						promise.emit('error', err, r); 
					} else { 
						promise.emit('success', r); 
					}
				});
				return promise;
			},
			'It succeed': function (r) {
				assert.equal(r.host, 'localhost');
				assert.equal(r.exitCode, 0);
			},'Date is set': function (r) {
				assert.isNotNull(r.date);
			},'ttl is a number': function (r) {
				assert.isNumber(r.ttl);
			},'mstime is a number': function (r) {
				assert.isNumber(r.mstime);
			}
		},
		'When we ping nohost': {
			topic: function() {
				var promise = new events.EventEmitter();
				
				ping.check({
						host: 'nohost'
				}, function (err, r) {
					if (err) { 
						promise.emit('error', err, r); 
					} else { 
						promise.emit('success', r); 
					}
				});
				return promise;
			},
			'It failed': function (err, r) {
				//console.log(util.inspect(r));
				assert.equal(err.code, 'EPINGFAILED');
				assert.notEqual(r.exitCode, 0);
				
			},'Date is set': function (err, r) {
				assert.isNotNull(r.date);
			},'ttl is undefined': function (err, r) {
				assert.isUndefined(r.ttl);
			},'mstime is undefined': function (err, r) {
				assert.isUndefined(r.mstime);
			}
		},
		'When we ping ::1': {
			topic: function() {
				var promise = new events.EventEmitter();
				
				ping.check({
						host: '::1',
						ipV6: true
				}, function (err, r) {
					if (err) { 
						promise.emit('error', err, r); 
					} else { 
						promise.emit('success', r); 
					}
				});
				return promise;
			},
			'It succeed': function (r) {
				assert.equal(r.host, '::1');
				assert.equal(r.exitCode, 0);
			},'Date is set': function (r) {
				assert.isNotNull(r.date);
			},'ttl is a number': function (r) {
				assert.isNumber(r.ttl);
			},'mstime is a number': function (r) {
				assert.isNumber(r.mstime);
			}
		},
		'When we ping 1.1.1.1 with timeout set to 1s': {
			topic: function() {
				var  
				promise = new events.EventEmitter();
				start = new Date();
				
				ping.check({
						host: '1.1.1.1',
						timeout: 1
				}, function (err, r) {
					end = new Date();
					if (err) { 
						promise.emit('error', err, r); 
					} else { 
						promise.emit('success', r); 
					}
					
				});
				return promise;
			},
			'It takes 1s to return': function (err, r) {
				assert.equal(r.host, '1.1.1.1');
				
				switch(os.platform()){
				case 'linux': 	
					assert.equal(r.exitCode, 1);
					break;
					
				case 'darwin':
					assert.equal(r.exitCode, 2);
					break;
					
				default:
					assert.equal(r.exitCode, 1);
				}		
				
				assert.equal(end.getTime() - start.getTime() >= 1000, true);
			},
			'It failed': function (err, r) {
				//console.log(util.inspect(r));
				assert.equal(err.code, 'ENORESPONSE');
				assert.notEqual(r.exitCode, 0);
				
			},'Date is set': function (err, r) {
				assert.isNotNull(r.date);
			},'ttl is undefined': function (err, r) {
				assert.isUndefined(r.ttl);
			},'mstime is undefined': function (err, r) {
				assert.isUndefined(r.mstime);
			}
		}
});