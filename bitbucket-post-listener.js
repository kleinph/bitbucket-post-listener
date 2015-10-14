var http = require('http');
var exec = require('child_process').exec;
var querystring = require('querystring');

var branches = {
	'develop': '/usr/bin/deploy.sh',
	'master': '/usr/bin/local/deploy.sh'
};

var server = http.createServer(function(req, res) {
	console.log('request from', req.connection.remoteAddress);
	if (req.method !== 'POST') {
		console.log('cancel: no POST');
		res.writeHead(405, { Allow: "POST" });
		res.end();
		return;
	}

	var body = '';
	// set encoding to get strings instead of buffers
	req.setEncoding('utf8');

	req.on('data', function(chunk) {
		body += chunk;
	});

	req.on('end', function() {
		// console.log('received data:', body);
		// console.log('parsed data', querystring.parse(body));
		var message = '';

		try {
			var data = JSON.parse(querystring.parse(body).payload);
			var script = check(data);

			if (script) {
				function onError(err) {
					res.statusCode = 500;
					message = 'error: ' + err.message;
				}

				function onSuccess() {
					res.statusCode = 204;
				}

				runScript(script, onError, onSuccess);
				script = '';
			} else {
				// gently ignore the request
				res.statusCode = 200;
				res.write('wrong branch');
			}

		} catch (err) {
			res.statusCode = 400;
			message = 'bad data: ' + err.message;
		}

		console.log('response: %s - %s\n', res.statusCode, message);
		res.end(message);
	});
});

function check(data) {
	var script;

	data.commits.some(function(commit) {
		// check if it matches one of the specified branches
		script = branches[commit.branch];
		return !!script;
	});

	return script;
}

function runScript(script, onError, onSuccess) {
	exec(script, function(error, stdout, stderr) {
		console.log(stdout);
		console.error(stderr);

		if (error) {
			console.log('error:', error.message);
			onError(error);
			return;
		}

		onSuccess();
	});
}

var port = 8080;

server.listen(port);
console.log('Server listening on port %s', port);
