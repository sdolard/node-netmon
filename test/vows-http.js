var 
vows = require('vows'),
assert = require('assert'),
util = require('util'),
events = require("events"),
nhttp = require('http'),
http = require('../lib/http');

exports.suite1 = vows.describe('http/s').addBatch({
		'When checking www.google.com': {
			topic: function() {
				var promise = new events.EventEmitter();
				
				http.check({
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
				assert.isFalse(r.ssl);
			},
			'Default path is /': function (err, r) {
				assert.equal(r.path, '/');		
			},
			'Default timout is 2s': function (err, r) {
				assert.equal(r.timeout, 2000);		
			},
			'There is a statusCode': function (err, r) {
				assert.isTrue(r.statusCode > 0);		
			},
			'statusMessage corresponds to statusCode': function (err, r) {
				assert.isTrue(r.statusMessage === nhttp.STATUS_CODES[r.statusCode.toString()]);		
			},
			'It succeed': function (err, r) {
				assert.isNotNull(r);
			}
		},
		'When checking an invalid hostname': {
			topic: function() {
				var promise = new events.EventEmitter();
				
				http.check({
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
			}
		},
		'When checking google/thispathdonotexists path': {
			topic: function() {
				var promise = new events.EventEmitter();
				
				http.check({
						host: 'www.google.com', 
						path: '/thispathdonotexists'
				}, function (err, r) {
					if (err) { 
						promise.emit('error', err, r); 
					} else {
						promise.emit('success', r); 
					}
				});
				return promise;
			},
			'Path do not exists': function (err, r) {
				assert.equal(err.code, 'EUNEXPECTEDSTATUSCODE');
				assert.equal(r.path, '/thispathdonotexists');
			}
		},
		'When checking google on evil port with a 500ms timeout': {
			topic: function() {
				var promise = new events.EventEmitter();
				
				http.check({
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
			}
		},
		'When checking mail.google.com with ssl': {
			topic: function() {
				var promise = new events.EventEmitter();
				
				http.check({
						host: 'mail.google.com', 
						ssl: true
				}, function (err, r) {
					if (err) { 
						promise.emit('error', err, r); 
					} else {
						promise.emit('success', r); 
					}
				});
				return promise;
			},
			'It succeed': function (err,r) {
				assert.isNotNull(r);
			},
			'Default ssl port is 443': function (err,r) {
				assert.equal(r.port, 443);
				assert.isTrue(r.ssl);
			}
		}	
});
