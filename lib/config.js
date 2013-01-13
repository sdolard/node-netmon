/*
Copyright © 2011-2012 by Sebastien Dolard (sdolard@gmail.com)
*/

/**
* load configuration file
*
*/

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

	var linter = jsrevival.create();

	linter.on('ready', function() {
		linter.lint(filename);
	});

	linter.on('lint', function (errors, filename) {
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
