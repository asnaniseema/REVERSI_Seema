/********* zwh9gp5z***********************************/

/**  Set up the static files server **/

let static = require('node-static');

/*** Set up the http server library **/

let http = require('http');

/***  Assume that we are running on Heroku  **/

let port = process.env.PORT;

let directory = __dirname + '/public';

/* if we aren't on Heroku, then we need to adjust our port and directory **/


if((typeof port == 'undefined') || ( port === null)){
	port = 8080;
	directory = './public';
}

/* Set up our static files web server to deliver files from the filesystem */

let file = new static.Server(directory);

let app = http.createServer(
	function(request, response){
		request.addListener('end',
			function(){
				file.server(request.response);
			}
		
		
		).resume();	
		
	}
).listen(port);

//console.log('The server is running');