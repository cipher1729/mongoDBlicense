var express = require('express');
var router = express.Router();
var assert = require('assert');
var fs= require('fs');
var image={};
var firstCar = true;

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});


//for user to validate credentials
router.get('/login', function(req, res, next){
	
	var db = req.db;
	var collection= db.get('usercollection');
	var phone= req.query.phone;
	var password=req.query.password;
	
	console.log(phone);
	var licensePlate={};
	collection.find({"phone": phone},{}, function(e,docs){
			 console.log("e is"+ e);
			 //does not exist in database
			 if(docs.length==0)
			 res.send("Not found!");
			 else
			 {
				//account is found need to find password
				if(docs[0].password== password)
					res.send("Validated!");
				else
					res.send("Password did not match!");
			 }
	});
  
  
	
  
});

//for user to register in an account
router.post('/signup', function(req, res, next){
 
  var db = req.db;
  var collection= db.get('usercollection');
  
  //get user's name, phone, email and licensePlateNumber
 var name=req.body.name; 
 var phone= req.body.phone;
 var password= req.body.password;
  var email=req.body.email;
  var licensePlate=req.body.licensePlate;
  var timeIn=0;
  var timeOut=0;
  
  //find if phone already exists
  collection.find({"phone":phone},{}, function(e,docs){
   if(docs.length!=0)
		res.send("Already Exists!");
   else
	//if not insert this entry into the database
		collection.insert({
		"name":name,
        "phone" : phone,
		"password":password,
		"email":email,
		"licensePlate": licensePlate,
		"timeIn":timeIn,
		"timeOut":timeOut
		}, function (err, doc) {
			if (err) {
				// If it failed, return error
				res.send("There was a problem adding the information to the database.");
			}
			else {
				res.send("Added to database");
			}
		});
   });
});

function populateLots(collection)
{
	//populate the lotcollection
	for(var i=0;i<21;i++)
	{
		collection.insert({"cameraId":i, "occupied": false},{});
	}
	
}

/* for indicating that car has entered database, to be called by entry camera*/
router.post('/createdetail', function(req,res,next){
	var cameraId = parseInt(req.body.cameraId);
	var licensePlate= req.body.licensePlate;
	var db = req.db;
    
	
	var collection= db.get('detailcollection');
  
	//populate lotcollection if this is the first car
	if(firstCar==true)
	populateLots(db.get('lotcollection'));
	
	//find if phone already exists
    collection.find({"cameraId":cameraId},{}, function(e,docs){
	//if not insert this entry into the database
		collection.insert({
		"cameraId":cameraId,
        "licensePlate" : licensePlate
		}, function (err, doc) {
			if (err) {
				// If it failed, return error
				res.send("There was a problem adding the information to the detail database.");
			}
			else {
				res.send("Detail Added to database");
			}
		});
   });
   
   //log entry time for user
	
		var userCollection = db.get('usercollection');
		userCollection.update({"licensePlate":licensePlate},{$set:{"timeIn":new Date().getTime() / 1000}}); 
});



/* for updating detail record by some camera */
router.post('/updatedetail', function(req,res,next){
	var cameraId = parseInt(req.body.cameraId);
	var licensePlate = req.body.licensePlate;
	//console.log(cameraId);
	var db = req.db;
    var detailCollection= db.get('detailcollection');
	var lotCollection= db.get('lotcollection');
    var userCollection= db.get('usercollection');
   
   console.log(licensePlate);
	//find if phone already exists
   
   detailCollection.find({"licensePlate":licensePlate},{}, function(e,docs){
   
	if(docs.length!=0)
	{
					//SET IT TO OCCUPIED
					lotCollection.find({"cameraId":cameraId},{},function(e,docs){
								console.log(docs);
								if(docs.length==0)
								res.send("No lot entry for this id exists");
								else
								{
								//if id is either 0 or 20 the lot has just become free. Else it has just become occupied
									if(cameraId==20)
									{	//user is exiting parking lot
										console.log("Exiting!");
										var actualCameraId={};
										//get cameraId first and then remove
										detailCollection.find({"licensePlate":licensePlate},{},function(e, docs){
											
											actualCameraId = docs[0].cameraId;
											console.log(docs);
											
											detailCollection.remove({"licensePlate":licensePlate}); 
											console.log("removed licenseplate " + licensePlate );
										
											//log exit time for user
												userCollection.find({"licensePlate": licensePlate},{},function(e,docs){
													userCollection.update({"licensePlate":licensePlate},{$set:{"timeOut":new Date().getTime() / 1000}}); 
											});

											
											lotCollection.update({"cameraId":actualCameraId},{$set:{"occupied":false}}); 
											//record his exit time
										
										
										
										});
									
										
										
										
									}
									else
									{
										console.log(" Non 20 block ");
										lotCollection.update({"cameraId":cameraId},{$set:{"occupied":true}}); 
										detailCollection.update({"licensePlate":licensePlate},{$set:{"cameraId":cameraId}}); 
									}
								}
					});
    }
	else
		res.send("Cannot update. CameraId does not exist in database.");
	});
});


router.get('/findlot', function(req, res, next){
	var db = req.db;
    
	//get the phone number, find the corresponding license and then use the license to retrieve details
	var phone= req.query.phone;
	
	console.log(phone);
	var userCollection = db.get('usercollection');
	
			userCollection.find({"phone":phone},{},function(e,docs){
				var licensePlate = docs[0].licensePlate;
			
				console.log(" to find " + licensePlate); 
					
					var collection= db.get('lotcollection');
					collection.find({},{}, function(e,docs){
					
						//send all records
						
						var allRecords = docs;
						var detailCollection= db.get('detailcollection');
						detailCollection.find({"licensePlate":licensePlate},{},function(e,docs){
					
							if(docs.length==0)
							{
									var sendObj= {"results": allRecords, "cameraId":0,"licensePlate": licensePlate};
									var sendString = JSON.stringify(sendObj); 
									res.send(sendString);
							}
							else
							{
								var sendObj= {"results": allRecords, "cameraId":(docs[0].cameraId),"licensePlate": licensePlate};
								var sendString = JSON.stringify(sendObj); 
								res.send(sendString);
							}
					
					});
						
			});
	});
	
	//get the users licensePlate
	//var licensePlate = req.query.licensePlate;
});

//for getting user details, wants the phone as query parameter
router.get('/userdetails', function(req,res,next){
	var db = req.db;
    
	//get the phone number, find the corresponding license and then use the license to retrieve details
	var phone= req.query.phone;
	console.log(phone);	
	var userCollection = db.get('usercollection');
	userCollection.find({"phone":phone},{},function(e,docs){
		if(docs.length==0)
		res.send("Can't find user");
		else
		{	//time diff in seconds
			var diff = (docs[0].timeOut - docs[0].timeIn)/1000;
			var payment = diff * 0.5;
			var resultObject = {"payment":payment, "timeSpent": diff, "name": docs[0].name, "phone": docs[0].phone, "email":docs[0].email, "licensePlate":docs[0].licensePlate};
			res.send(JSON.stringify(resultObject));
		}
	});


});
/*
router.get('/records', function(req, res, next) {
  var db = req.db;
  var collection= db.get('usercollection');
  image = fs.readFileSync("C://Users//cipher1729//projects//licenserecog/200.jpg",'base64');
  //console.log(image);
  collection.find({},{}, function(e,docs){
	//console.log(docs);
	 //res.render('records', { title: 'All records', records: JSON.stringify(docs), something:'hello' });
	 docs[0].image= image;
	 //console.log(docs[0].image);
	res.render('records', { title: 'All records', records: docs, something:'hello' });
  });
});
router.post('/addRecord',function(req, res, next) {
  var db = req.db;
  var collection= db.get('usercollection');
  var uuid= req.body.uuid;
  var camera_id= req.body.camera_id;
  var site_id = req.body.site_id;
  var image_width= req.body.image_width;
  var image_height = req.body.image_height;
  var epoch_time = req.body.epoch_time;
  var processing_time_ms= req.body.processing_time_ms;
  var results = req.body.results;
  console.log(results);
  var license_image = req.body.license_image;
   collection.insert({
        "uuid" : uuid,
		"camera_id":camera_id,
        "site_id" : site_id,
		"image_width" : image_width,
		"image_height" : image_height,
		"epoch_time" : epoch_time,
		"processing_time_ms" : processing_time_ms,
		"results" : results,
		"license_image":license_image
    }, function (err, doc) {
        if (err) {
            // If it failed, return error
            res.send("There was a problem adding the information to the database.");
        }
        else {
            // And forward to success page
            res.redirect("records");
        }
    });
});

router.post('/addUser',function(req, res, next) {
  var db = req.db;
  var collection= db.get('logincollection');
  var username= req.body.username;
  var password= req.body.password;
 
   collection.find({"username":username,"password":password},{}, function(e,docs){
   if(docs.length!=0)
		res.send("Exists!");
   else
		collection.insert({
        "username" :username,
		"password":password
		}, function (err, doc) {
        if (err) {
            // If it failed, return error
            res.send("There was a problem adding the information to the database.");
			
        }
        else {
            // And forward to success page
            console.log(username);
			console.log(password);
			res.send("Success!");
        }
		});
   });
   
});

router.get('/checkUser', function(req, res, next) {
  var db = req.db;
  var collection= db.get('logincollection');
  var username= req.param('username');
  var password= req.param('password');
 
   console.log(username);
   console.log(password);
  collection.find({"username": username},{}, function(e,docs){
	 console.log("e is"+ e);
	 var found=false;
	 for(var k=0;k<docs.length;k++)
	 {
		 if(docs[k].password == password) 
		 found=true;
	}
	if(found==true)
	res.send("Found!");
	else
	res.send("Not found :(");
  });
});

*/


module.exports = router;
