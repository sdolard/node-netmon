/*
Copyright © 2011-2012 by Sebastien Dolard (sdolard@gmail.com)
*/

var
util = require('util'),
//vm = require('vm'),
events = require('events'),

// Global var
emptyFn = function () {};


/** 
* @function
* connect to a NETASQ appliance and run script related in config
* 
* @param {Object} config an object containing all information needed to check an http connection
* @param {String} config.host the host to connect
* @param {Number} [config.port=443] the port number to use.

* @param {Number} [config.timeout=2] connection timeout in s
*
* @param {Function} callback({Error}err, {Object} response) called when request is done
*/
function run (id, config, cb) {
	id = id || '';
	config = config || {};
	cb = cb || emptyFn;
	
	var 
	err, 
	script,
	emitter = new events.EventEmitter();
	
	emitter.once('returns', cb);
	
	if (!config.script) {
		err = new Error('No script');
		err.code = 'ENSCRIPTNFILENAME';
		return emitter.emit('returns', err);
	}
	
	try {
		script = require(util.format('%s/script/%s', __dirname, config.script));
	} catch(e) {
		return emitter.emit('returns', e);
	}
	script.run(id, config, process.stdout, function(err, result){
			emitter.emit('returns', err, config, result);
	});
}
exports.run = run;
