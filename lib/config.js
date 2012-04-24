/**
 * load configuration file
 *
 */

var
fs = require('fs');


/**
 * take a string and a callback and open givent file and give to the callback the config file
 *
 * @param String filename The name of file to open
 * @param Function callback The function to call when file config is retrive or on an error
 */
function load (filename, callback) {
	fs.readFile(filename, 'utf-8', function (err, data) {
		debugger;
		var config = {};
		if (err) {
			return callback(err, data);
		}
		try {
			config = JSON.parse(data);

		} catch (e) {
			err = e;

		} finally {
			callback(err, config);
		}

	});
}

exports.load = load;
