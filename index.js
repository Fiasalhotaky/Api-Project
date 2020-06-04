/*
=-=-=-=-=-=-=-=-=-=-=-=-
Final Project
=-=-=-=-=-=-=-=-=-=-=-=-
Student ID:23327516
Comment (Required):

https://accounts.google.com/o/oauth2/v2/auth?
 scope=https://www.googleapis.com/auth/drive&
 access_type=offline&
 include_granted_scopes=true&
 state=state_parameter_passthrough_value&
 redirect_uri=http://localhost:3000&
 response_type=code&
 client_id=642523886437-9opglahimr0b9nmm8c3gagnuvjc32ot2.apps.googleusercontent.com

=-=-=-=-=-=-=-=-=-=-=-=-
*/

const http = require('http');
const https = require('https');
const querystring = require('querystring');
//const authentication_cache = './auth/authentication-res.json';
const fs = require('fs');
//const path = require('path');
const url = require('url');
const port = 3000;
const credentials = require('./auth/credentials.json');
const server = http.createServer();
const main = fs.createReadStream('html/main.html');
const logo = fs.createReadStream('images/logo.ico');
const banner = fs.createReadStream('images/banner.png');

server.on("request", connection_handler);
function connection_handler(req, res){
	
	console.log(`New Request for ${req.url} from ${req.socket.remoteAddress}`);

	if( req.url === '/'){
		res.writeHead(200, {'Content-Type' : 'text/html'});
    	main.pipe(res);
	}else if(req.url.startsWith ( '/logo')){
		res.writeHead(200, {'Content-Type' : 'image/x-icon'});
		logo.pipe(res);
	}else if(req.url === '/images/banner.jpg'){
		res.writeHead(200, {'Content-Type' : 'image/x-icon'});
    	banner.pipe(res);
	}else if(req.url.startsWith('/daily-sports/')){ 
			let image_stream = fs.createReadStream(`.${req.url}`);
				image_stream.on('ready', function(){
					res.writeHead(200, {'Content-Type' : 'image/png'});
					image_stream.pipe(res);
				});
		
			image_stream.on('error', function(err) {
				res.writeHead(404, {"Content-Type" : "text/plain"});
				res.write("404 Not found");
				res.end();
			});

		}else if(req.url.startsWith('/search')){
            
            //players name example Westbrook, Harden, Durant, Lebron, Irving, Carmelo
			let users_input = url.parse(req.url, true).query;
			if(users_input.players){
				console.log(users_input.players);

			}else {
				res.writeHead(404, {"Content-Type" : "text/plain"});
				res.write("404 Not found");
				res.end();
            }

           const searchUrl = "https://www.balldontlie.io/api/v1/players?search=" + users_input.players;
           console.log(searchUrl);

            //const searchUrl = "https://www.balldontlie.io/api/v1/players"
           let player_search = https.get(searchUrl, function(response) {
               recieved_response(response, users_input);
           });
           player_search.on('error', function (e) {
            console.log(e);
        });
        console.log("Information Received: ");
        player_search.end();

        const recieved_response = function(response, users_input) {
            response.setEncoding("utf8");
            let body = "";
            response.on("data", function(chunk) {body += chunk;});
            response.on("end", function() {
                
                let player_info = JSON.parse(body);
                console.log(player_info)
                for(var i = 0; i < player_info.data.length; i++){
                    //console.log(player_info.data[i].last_name);
                    if(player_info.data[i].last_name == users_input.players || player_info.data[i].first_name == users_input.players ){
                        
                        let player = player_info.data[i].first_name + " "+ player_info.data[i].last_name + "\n " + player_info.data[i].team.abbreviation 
                        +"\n "+ player_info.data[i].team.full_name +
                        "\n Conference: " + player_info.data[i].team.conference +
                        "\n Position: " + player_info.data[i].position + "\n Height: " + 
                        player_info.data[i].height_feet + "'"+ player_info.data[i].height_inches + "\n Weight: " +
                        player_info.data[i].weight_pounds;

                        console.log(player);
                        
                        let fileName = users_input.players + ".txt";
                        
                        fs.writeFileSync(fileName, player, function(err) {
                        if(err)throw err;
                        console.log(fileName +' Saved!');
                      })

                      const file = fs.createReadStream(fileName);
                        res.writeHead(200, {'Content-Type' : 'text/plain'});
    	                file.pipe(res);
                    
                      //post_data   
			    let post_data = {
                "client_id": credentials.client_id,
                "client_secret": credentials.client_secret,
                "code": credentials.code,
                "grant_type":"authorization_code",
                "redirect_uri": "http://localhost:3000",
                
                }
            
               //post_data = decodeURIComponent(post_data);
            post_data = querystring.stringify(post_data);
            //post_data = querystring.decode(post_data);
                console.log(post_data);

			//Headers object containing Content-Type 
			//"Content-Length" and set it to be the calculated value post_data.length. 
			const headers = { 
							"Content-Type": "application/x-www-form-urlencoded",
							"Content-Length": post_data.length
            }
            
            const options = {
                method: 'POST',
                headers: headers
            };
            
            const token_endpoint = 'https://oauth2.googleapis.com/token';
            let auth_sent_time = new Date();
            let authentication_req = https.request(token_endpoint, options, function(authentication_res)    {
                    received_authentication(authentication_res, users_input, auth_sent_time, res);
            });

            authentication_req.on('error', function (e) {
                console.log(e);
            });

            console.log("Requesting Token");
            authentication_req.end(post_data);

            const received_authentication = function(authentication_res, users_input, auth_sent_time, res) {
                authentication_res.setEncoding("utf8");
                let body = "";
                authentication_res.on("data", function(chunk) {body += chunk;});
                authentication_res.on("end", function() {
                    //data returned is a JSON encoded string, use JSON.parse()
                    console.log(body);
                    let google_auth = JSON.parse(body);
                    console.log(google_auth);
            
                    if(google_auth.access_token.includes("")){
                        

                        let bearer = "Bearer "+ google_auth.access_token;
                        console.log(bearer);
                        
                        var metadata = {
                            name: users_input.players + ".txt"
                    };
                    console.log(metadata);
                    const contentType = 'text/plain';
                    let data = fs.readFileSync(fileName,{encoding:"utf8"});

                    let setBoundary = '--------BOUNDARY';

                    let requestBody = '\r\n--' + setBoundary + '\r\n'
                    + 'Content-Type: ' + 'application/json; charset=UTF-8' + '\r\n\r\n'
                    + '{' + '\r\n'
                    + '"name":"' + metadata.name + '"\r\n'
                    + '}' + '\r\n\r\n'
                    + '--' + setBoundary + '\r\n'
                    + 'Content-Type: ' + 'text/plain' + '\r\n\r\n'
                    + data + '\r\n'
                    + '\r\n--' + setBoundary + '--';

                    const options2 = {
                    hostname: 'www.googleapis.com',
                    path: '/upload/drive/v3/files?uploadType=multipart',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'multipart/related; boundary=' + setBoundary,
                        'Content-Length': requestBody.length,
                        Authorization: bearer,
                    },
                    };

                    //console.log(options2);
                    //console.log(requestBody);

                    const req = https.request(options2, (res) => {
                    console.log(`STATUS: ${res.statusCode}`);
                    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
                    res.setEncoding('utf8');
                    res.on('data', (chunk) => {
                        console.log(`BODY: ${chunk}`);
                    });
                    res.on('end', () => {
                        console.log('No more data in response.');
                    });
                    });

                    req.on('error', (e) => {
                    console.error(`problem with request: ${e.message}`);
                    });

                    req.write(requestBody);
                    req.end();
                       
                    }
            
                    
                });
                }
            
            // */
                    }
                }
            });
        }

			
	}
}

server.on("listening", listening_handler);
server.listen(port);
function listening_handler(){
	console.log(`Now Listening on testing Port ${port}`);
}



    


