/*
Copyright © 2011-2012 by Sebastien Dolard (sdolard@gmail.com)
*/


var
util = require('util'),
fs = require('fs'),
vm = require('vm'),

// contrib
//netasqComm = require('netasqcomm'),

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
function run (config, cb) {
	config = config || {};
	cb = cb || emptyFn;
	
	var err, script;
	if (!config.script && !config.filename) {
		err = new Error('Neither script nor filename');
		err.code = 'ENSCRIPTNFILENAME';
		return cb(err);
	}
	if (config.script) {
		script = require(util.format('%s/script/%s', __dirname, config.script));
		script.run(config, process.stdout, function(err, result){
				cb(err, config, result);
		});
	}
}
exports.run = run;
