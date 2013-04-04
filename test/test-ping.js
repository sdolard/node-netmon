/*
Copyright © 2011-2012 by Sebastien Dolard (sdolard@gmail.com)
*/

var
assert = require('assert'),
os = require('os'),
ping = require('../lib/plugin/ping'),
emptyFn = function() {};

describe('ping', function(){

	it('should ping localhost', function(done){
		ping.run('', {
			host: 'localhost'
		}, function (err, config, response) {
			assert.equal(config.host, 'localhost');
			assert.equal(response.exitCode, 0);
			assert(response.date instanceof Date);
			assert.equal(typeof response.ttl, 'number');
			assert.equal(typeof response.mstime, 'number');
			done();
		}, emptyFn);
	});

	it('should not ping nohost', function(done){
		ping.run('', {
			host: 'nohost'
		}, function (err, config, response) {
			assert.equal(err.code, 'EPINGFAILED');
			assert.notEqual(response.exitCode, 0);
			assert(response.date instanceof Date);
			assert.equal(response.ttl, undefined);
			assert.equal(response.mstime, undefined);
			done();
		}, emptyFn);
	});

	it('should ping ::1', function(done){
		ping.run('', {
			host: '::1',
			ipV6: true
		}, function (err, config, response) {
			assert.equal(config.host, '::1');
			assert.equal(response.exitCode, 0);
			assert(response.date instanceof Date);
			assert.equal(typeof response.ttl, 'number');
			assert.equal(typeof response.mstime, 'number');
			done();
		}, emptyFn);
	});

	it('should not ping 1.0.0.0 in less than 1s', function(done){
		var start = new Date();
		ping.run('', {
			host: '1.0.0.0',
			timeout: 1
		}, function (err, config, response) {
			var end = new Date();
			assert.equal(config.host, '1.0.0.0');
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
			assert.equal(err.code, 'ENORESPONSE');
			assert(response.date instanceof Date);
			assert.equal(response.ttl, undefined);
			assert.equal(response.mstime, undefined);

			done();
		}, emptyFn);
	});
});