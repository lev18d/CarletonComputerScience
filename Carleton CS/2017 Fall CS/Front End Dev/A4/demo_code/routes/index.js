var url = require('url');
var sqlite3 = require('sqlite3').verbose(); //verbose provides more detailed stack trace
var db = new sqlite3.Database('data/recipes.db');

db.serialize(function(){
	  //make sure a couple of users exist in the database.
	  //user: ldnel password: secret
	  //user: frank password: secret2
      var sqlString = "CREATE TABLE IF NOT EXISTS users (userid TEXT PRIMARY KEY, password TEXT)";
      db.run(sqlString);
      sqlString = "INSERT OR REPLACE INTO users VALUES ('ldnel', 'secret')";
      db.run(sqlString);
      sqlString = "INSERT OR REPLACE INTO users VALUES ('frank', 'secret2')";
      db.run(sqlString);
  });

exports.authenticate = function (request, response, next){
    /*
	Middleware to do BASIC http 401 authentication
	*/
    var auth = request.headers.authorization;
	// auth is a base64 representation of (username:password)
	//so we will need to decode the base64
	if(!auth){
 	 	//note here the setHeader must be before the writeHead
		response.setHeader('WWW-Authenticate', 'Basic realm="need to login"');
        response.writeHead(401, {'Content-Type': 'text/html'});
		console.log('No authorization found, send 401.');
 		response.end();
	}
	else{
	    console.log("Authorization Header: " + auth);
        //decode authorization header
		// Split on a space, the original auth
		//looks like  "Basic Y2hhcmxlczoxMjM0NQ==" and we need the 2nd part
        var tmp = auth.split(' ');

		// create a buffer and tell it the data coming in is base64
        var buf = new Buffer(tmp[1], 'base64');

        // read it back out as a string
        //should look like 'ldnel:secret'
		var plain_auth = buf.toString();
        console.log("Decoded Authorization ", plain_auth);

        //extract the userid and password as separate strings
        var credentials = plain_auth.split(':');      // split on a ':'
        var username = credentials[0];
        var password = credentials[1];
        console.log("User: ", username);
        console.log("Password: ", password);

		var authorized = false;
		//check database users table for user
		db.all("SELECT userid, password FROM users", function(err, rows){
		for(var i=0; i<rows.length; i++){
		      if(rows[i].userid == username & rows[i].password == password) authorized = true;
		}
		if(authorized == false){
 	 	   //we had an authorization header by the user:password is not valid
		   response.setHeader('WWW-Authenticate', 'Basic realm="need to login"');
           response.writeHead(401, {'Content-Type': 'text/html'});
		   console.log('No authorization found, send 401.');
 		   response.end();
		}
        else
		  next();
		});
	}

	//notice no call to next()

}
function addHeader(request, response){
        // about.html
        var title = 'COMP 2406:';
        response.writeHead(200, {'Content-Type': 'text/html'});
        response.write('<!DOCTYPE html>');
        response.write('<html><head><title>About</title></head>' + '<body>');
        response.write('<h1>' +  title + '</h1>');
		response.write('<hr>');
}

function addFooter(request, response){
 		response.write('<hr>');
		response.write('<h3>' +  'Carleton University' + '</h3>');
		response.write('<h3>' +  'School of Computer Science' + '</h3>');
        response.write('</body></html>');

}



exports.index = function (request, response){
        // index.html
	     response.render('index', { title: 'COMP 2406', body: 'rendered with handlebars'});
}

function parseURL(request, response){
	var parseQuery = true; //parseQueryStringIfTrue
    var slashHost = true; //slashDenoteHostIfTrue
    var urlObj = url.parse(request.url, parseQuery , slashHost );
    console.log('path:');
    console.log(urlObj.path);
    console.log('query:');
    console.log(urlObj.query);
    //for(x in urlObj.query) console.log(x + ': ' + urlObj.query[x]);
	return urlObj;

}

exports.users = function(request, response){
        // users.html
		db.all("SELECT userid, password FROM users", function(err, rows){
 	       response.render('users', {title : 'Users:', userEntries: rows});
		})

}
// find as a duplicate 
exports.find = function (request, response){
        // find.html
		console.log("RUNNING FIND recipes");

		var urlObj = parseURL(request, response);
		var sql = "SELECT id, recipe_name FROM recipes";


        if(urlObj.query['recipe_name']) {
		    console.log("finding recipe_name: " + urlObj.query['recipe_name']);
		    sql = "SELECT id, recipe_name FROM recipes WHERE recipe_name LIKE '%" +
			          urlObj.query['recipe_name'] + "%'";
		}
    console.log(sql);

		db.all(sql, function(err, rows){
	       response.render('recipes', {recipe_name: 'recipe_name:', recipeEntries: rows});
 		});
}

// the recipe details route is used to get all of the details corresponding to
// a recipe item. it loads to the recipesDetails.hbs file

exports.recipeDetails = function(request, response){

	var urlObj = parseURL(request, response);
	var ID = urlObj.path; //expected form: /recipes/0 to 65
	ID = ID.substring(ID.lastIndexOf("/")+1, ID.length);  // uses the ID to identify a given recipe in the DB

	var sql = "SELECT id, recipe_name, contributor,category,description,spices,source,rating,ingredients,directions FROM recipes WHERE id=" + ID;
	console.log("GET RECIPE DETAILS: " + ID );

	db.all(sql, function(err, rows){
		let recipe = rows[0];  //uses the first element in the array to hold the recipe item

	response.render('recipeDetails', {title: 'Recipe Details:', recipe: recipe});
});

}
