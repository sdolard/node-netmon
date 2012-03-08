var 
vows = require('vows'),
assert = require('assert'),
util = require('util'),
events = require("events"),

ping = require('../lib/ping'),
start,
end;

exports.suite1 = vows.describe('ping').addBatch({
		'When we ping localhost': {
			topic: function() {
				var promise = new events.EventEmitter();
				
				ping.check('localhost', function (r) {
						promise.emit('success', r);
				});
				return promise;
			},
			'We succeed': function (r) {
				assert.equal(r.host, 'localhost');
				assert.equal(r.exitCode, 0);
			}
		},
		'When we ping nohost': {
			topic: function() {
				var promise = new events.EventEmitter();
				
				ping.check('nohost', function (r) {
						promise.emit('success', r);
				});
				return promise;
			},
			'We failed': function (r) {
				assert.equal(r.host, 'nohost');
				assert.notEqual(r.exitCode, 0);
			}
		},
		'When we ping ::1': {
			topic: function() {
				var promise = new events.EventEmitter();
				
				ping.check('::1', true, function (r) {
						promise.emit('success', r);
				});
				return promise;
			},
			'We succeed': function (r) {
				assert.equal(r.host, '::1');
				assert.equal(r.exitCode, 0);
				
			}
		},
		'When we ping 1.1.1.1 with timeout set to 2s': {
			topic: function() {
				var  
				promise = new events.EventEmitter();
				start = new Date();
				
				ping.check('1.1.1.1', 2, function (r) {
						end = new Date();
						promise.emit('success', r);
						
				});
				return promise;
			},
			'It takes 2s to return': function (r) {
				assert.equal(r.host, '1.1.1.1');
				assert.notEqual(r.exitCode, 0);
				assert.equal(end.getTime() - start.getTime() >= 2000, true);
			}
		}
});