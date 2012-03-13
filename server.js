var
port = 8000,
app = require('http').createServer(handler).listen(port),
io = require('socket.io').listen(app),
fs = require('fs'),
spawn = require('child_process').spawn,
netmon = require('./lib/netmon'),
monitor = new netmon.NetworkMonitor({
	monitors: {
		'www.google.com': {
			type: ['ping', 'http']
		},
		'www.bing.com': {
			type: ['ping']
		}
	}
});

console.log('Listening on http://localhost:%d/', port);

io.sockets.on('connection', function (socket) {

	// connect action event
	socket.on('action', function (action) {
		var state = monitor.state;
		action = action.toUpperCase();

		//console.log('action : ' + action);
		//console.log('monitor state : ' + state);

		if (action === netmon.START) {
			if (state === netmon.START) {
				socket.emit('news', "monitor already started!");
				return;
			}
			monitor.start();
		}

		if (action === netmon.STOP) {
			if (state === netmon.STOP) {
				socket.emit('news', "monitor already stoped!");
				return;
			}
			monitor.stop(function () {
				socket.emit('news', "monitor stoped!");
			});
		}
	});

	socket.emit('news', "welcome. monitor is currently " + monitor.state);
	function output (data) {
		socket.emit('update', data);
	}

	function stateupdate (data) {
		socket.emit('news', data);
	}

	monitor.on('state', stateupdate);
	
	monitor.on("data", output);

	socket.on("disconnect", function (socket) {
		monitor.removeListener("data", output);
		monitor.removeListener("state", stateupdate);
	});

});

// send to every websocket that the monitor is off 
monitor.on('exit', function () {
	console.log('monitor exit');
	io.sockets.emit('news', "monitor terminated");
});


function handler (req, res) {
	fs.readFile(__dirname + '/index.html',
		function (err, data) {
			if (err) {
			res.writeHead(500);
			return res.end('Error loading index.html');
		}

		res.writeHead(200);
		res.end(data);
	});
}

app.on('close', function () {
	monitor.stdin.end();
});

monitor.start();
