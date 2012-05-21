var 
vows = require('vows'),
assert = require('assert'),
util = require('util'),
events = require("events"),
tcp = require('../lib/tcp');

exports.suite1 = vows.describe('tcp').addBatch({
		'When checking www.google.com': {
			topic: function() {
				var promise = new events.EventEmitter();
				
				tcp.check({
						port: 80,
						host: 'www.google.com'
				}, function (err, r) {
					if (err) { 
						promise.emit('error', err, r); 
					} else { 
						promise.emit('success', r); 
					}
				});
				return promise;
			},
			'host is www.google.com': function (err, r) {
				assert.equal(r.host, 'www.google.com');		
			},
			'Default port is 80': function (err, r) {
				assert.equal(r.port, 80);	
			},
			
			'Default timout is 2s': function (err, r) {
				assert.equal(r.timeout, 2000);		
			},
			'It succeed': function (err, r) {
				assert.isNotNull(r);
			},
			'date is set': function (err, r) {
				assert.isNotNull(r.date);
			}
		},
		'When checking an invalid hostname': {
			topic: function() {
				var promise = new events.EventEmitter();
				
				tcp.check({
						port: 80,
						host: '---'
				}, function (err, r) {
					if (err) { 
						promise.emit('error', err, r); 
					} else {
						promise.emit('success', r); 
					}
				});
				return promise;
			},
			'response is valid': function (err, r) {
				assert.equal(r.host, '---');
			},
			'It failed': function (err, r) {
				assert.equal(err.code, 'ENOTFOUND');
			},
			'date is set': function (err, r) {
				assert.isNotNull(r.date);
			}
		},
		'When checking google on evil port with a 500ms timeout': {
			topic: function() {
				var promise = new events.EventEmitter();
				
				tcp.check({
						host: 'www.google.com', 
						port: 666,
						timeout: 500
				}, function (err, r) {
					if (err) { 
						promise.emit('error', err, r); 
					} else {
						promise.emit('success', r); 
					}
				});
				return promise;
			},
			'It failed in 500ms': function (err,r) {
				assert.equal(err.code, 'ETIMEOUT');
				assert.equal(r.port, 666);
				assert.equal(r.timeout, 500);
			},
			'date is set': function (err, r) {
				assert.isNotNull(r.date);
			}
		}	
});
