/*
Copyright © 2011-2012 by Sebastien Dolard (sdolard@gmail.com)
*/

var
assert = require('assert'),
tcp = require('../lib/plugin/tcp'),
emptyFn = function() { return; };

describe('tcp', function(){
	it ('should connect to www.google.com on port 80', function(done){
		tcp.run('',
			{
				port: 80,
				host: 'www.google.com'
			}, function (err, config, response) {
				assert.equal(err, undefined);
				assert.equal(config.host, 'www.google.com');
				assert.equal(config.port, 80);
				assert.equal(config.timeout, 1);
				assert(response !== null);
				assert(response !== undefined);
				assert(response.date !== null);
				assert(response.date !== undefined);
				done();
			},
			emptyFn
		);
	});

	it ('should not connect to an invalid hostname', function(done){
		tcp.run('',
			{
				port: 80,
				host: '---&'
			}, function (err, config, response) {
				assert.equal(config.host, '---&');
				assert.equal(err.code, 'ENOTFOUND');
				assert.equal(response, undefined);
				done();
			},
			emptyFn
		);
	});

	it ('should not connect to google on port 666', function(done){
		tcp.run('',
			{
				host: 'www.google.com',
				port: 666,
				timeout: 1
			}, function (err, config, response) {
				assert.equal(err.code, 'ETIMEOUT');
				assert.equal(config.port, 666);
				assert.equal(config.timeout, 1);
				assert.equal(response, undefined);
				done();
			},
			emptyFn
		);
	});
});
