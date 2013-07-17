/*
Copyright © 2011-2012 by Sebastien Dolard (sdolard@gmail.com)
*/
/*jslint node: true*/
var
// Node
fs = require('fs'),
// contrib
jsrevival = require('jsrevival');



/**
* take a string and a callback and open givent file and give to the callback the config file
*
* @param String filename The name of file to open
* @param Function callback The function to call when file config is retrive or on an error
*/
function load (filename, callback) {

	var linter = jsrevival.create({
		JSLintOption : {
			anon      : true,
			bitwise   : true,
			browser   : true,
			'continue': true,
			css       : true,
			debug     : true,
			devel     : true,
			eqeq      : true,
			es5       : true,
			evil      : true,
			forin     : true,
			fragment  : true,
			indent    : 10,
			maxerr    : 1000,
			maxlen    : 2048,
			newcap    : true,
			node      : true,
			nomen     : true,
			on        : true,
			passfail  : true,
			plusplus  : true,
			properties: true,
			regexp    : true,
			rhino     : true,
			undef     : true,
			unparam   : true,
			sloppy    : true,
			stupid    : true,
			sub       : true,
			todo      : true,
			vars      : true,
			white     : true,
			windows   : true
		}
	});

	linter.on('ready', function() {
		linter.lint(filename);
	});

	linter.on('lint', function (errors, filename) {
		/*jslint stupid: true */
		var config;
		if (errors.length > 0) {
			return callback(errors);
		}
		try {
			config = JSON.parse(fs.readFileSync(filename));
		} catch (e_) {
			errors = e_;
		} finally {
			callback(undefined, config);
		}
	});

	linter.on('error', function(err) {
		callback(err);
	});
}

exports.load = load;
