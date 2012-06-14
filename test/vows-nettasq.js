var 
vows = require('vows'),
assert = require('assert'),
util = require('util'),
events = require("events"),
nettasq = require('../lib/nettask');

exports.suite1 = vows.describe('nettask').addBatch({
		'When create a valid ping action task on localhost': {
			topic: function() {
				var
				promise = new events.EventEmitter(),
				pingTask = nettasq.create({
						action: 'ping',
						config: {
							host: 'localhost'
						}
				});
				
				pingTask.on('result', function (err, r, task) {
					if (err) { 
						promise.emit('error', err); 
					} else { 
						promise.emit('success', r); 
					}
				});
				pingTask.run();
				return promise;
			},
			'It succeed': function (err, r) {
				assert.isNotNull(r);
				assert.strictEqual(r.exitCode, 0);
			},
			'host is set to localhost': function (err, r) {
				assert.strictEqual(r.host, 'localhost');
			},
			'default timeout equals 2': function (err, r) {
				assert.strictEqual(r.timeout, 2);
			},
			
			'ipv6 is disabled by default': function (err, r) {
				assert.isFalse(r.ipV6);
			},
			'date is set': function (err, r) {
				assert.isNotNull(r.date);
			},
			'data is a string': function (err, r) {
				assert.isString(r.data);
			}
		}
});
