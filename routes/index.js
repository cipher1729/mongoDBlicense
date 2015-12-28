var express = require('express');
var router = express.Router();
var assert = require('assert');
var fs= require('fs');

//for doing periodic gps requests
var CronJob = require('cron').CronJob;


var http = require('http').Server(express);
var io = require('socket.io')(http);

var image={};
var firstCar = true;

//for handling periodic` GPS requests



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
			// console.log("e is"+ e);
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
	
			  // mySocket.emit('getGpsRequest',{});
			   //console.log("sending GPS request to clients!");
	
	
		
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
  var carColor= req.body.carColor;
  var carType= req.body.carType;
  
  //current GPS location
  var carGps=0;
  //is he near the site
  var nearSite= false;
  var timeIn=[];
  var timeOut=[];
  var reservationIn=[];
  var reservationOut=[];  
  var timeSpent=0;
  
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
		"timeOut":timeOut,
		"timeSpent":timeSpent,
		"carColor":carColor,
		"carType":carType,
		"carGps":carGps,
		"nearSite":nearSite,
		"reservationIn":reservationIn,
		"reservationOut":reservationOut
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
	var licensePlate= {};
	var db = req.db;
    var uuid= req.body.uuid;
	var siteId= req.body.siteId;
	var results= req.body.results;
	var license_image= req.body.license_image;
	var detectedCarColor= req.body.detectedCarColor;
	
	var detailCollection= db.get('detailcollection');
	var userCollection = db.get('usercollection');
	
	results = JSON.parse(results);
	licensePlate = results[0].plate;
	
	
	//populate lotcollection if this is the first car
	if(firstCar==true)
	populateLots(db.get('lotcollection'));
	
	//find if phone already exists
    //bug?
	userCollection.find({"licensePlate":licensePlate},{}, function(e,docs){
	//if not insert this entry into the database
	
		if(docs.length!=0)
		{
			//get the 0th entry of the results array and get the plate from that
			
			
			
			detailCollection.insert({
			"cameraId":cameraId,
			"userFound":false,
			"licensePlate" : licensePlate,
			"uuid":uuid,
			"siteId":siteId,
			"results":results,
			"license_image":license_image,
			"detectedCarColor":detectedCarColor,
			}, function (err, doc) {
				if (err) {
					// If it failed, return error
					res.send("There was a problem adding the information to the detail database.");
				}
				else {
					res.send("Detail Added to database");
				}
			});
		}
   });
   
		
		//here i need to append to the inTime
		//first read the values from the collection
		var currentTimeInArray={};
		userCollection.find({"licensePlate":licensePlate},{},function(e,docs){
			if(docs.length!=0)
			{	currentTimeInArray = docs[0].timeIn;
				currentTimeInArray.push(new Date().getTime() / 1000);
				userCollection.update({"licensePlate":licensePlate},{$set:{"timeIn":currentTimeInArray}}); 
			}
		});
		
		
});



/* for updating detail record by some camera */
router.post('/updatedetail', function(req,res,next){
	var cameraId = parseInt(req.body.cameraId);
	
	//get the new licensePlate from the new JSON Object
	var results= JSON.parse(req.body.results);
	var licensePlate = results[0].plate;
	
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
											//also log time spent in the lot
											var currentTimeOutArray=[];
												userCollection.find({"licensePlate": licensePlate},{},function(e,docs){
													currentTimeOutArray = docs[0].timeOut;
													currentTimeOutArray.push(new Date().getTime() / 1000);
													
													userCollection.update({"licensePlate":licensePlate},{$set:{"timeOut":currentTimeOutArray}});
													
													
													//get the latest inTime and outTime and store their difference in timeSpent
													var noOfTimeInEntries = docs[0].timeIn.length;
													var noOfTimeOutEntries = docs[0].timeOut.length;
													
													var latestTimeIn = docs[0].timeIn[noOfTimeInEntries-1];
													var latestTimeOut = docs[0].timeOut[noOfTimeOutEntries-1];
													
													userCollection.update({"licensePlate":licensePlate},{$set:{"timeSpent":latestTimeOut- latestTimeIn}});
													
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
										
										//need to check if there is some user corresponding to this licensePlate
										userCollection.find({"licensePlate":licensePlate},{},function(e, docs){
										//set user to found if some user exists corresponding to that licensePlate										
											if(e!=null){
												detailCollection.update({"licensePlate":licensePlate},{$set:{"userFound":true}}); 
											}
										});
   
										
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
			
				//console.log(" to find " + licensePlate); 
					
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
	//console.log(phone);	
	var userCollection = db.get('usercollection');
	userCollection.find({"phone":phone},{},function(e,docs){
		if(docs.length==0)
		res.send("Can't find user");
		else
		{	
			//TODO
			//time diff in seconds
			/*
			var diff = (docs[0].timeOut - docs[0].timeIn)/1000;
			var payment = diff * 0.5;
			*/
			var resultObject = {"payment":docs[0].timeSpent*0.5, "timeSpent": docs[0].timeSpent, "name": docs[0].name, "phone": docs[0].phone, "email":docs[0].email, "licensePlate":docs[0].licensePlate};
			res.send(JSON.stringify(resultObject));
			
		}
	});
});

router.post('/addReservation', function(req,res,next){
	var db = req.db;
	var userCollection = db.get('usercollection');
	
	//get phone number to match with user
	var phone = req.body.phone;
	var inmonth = req.body.inmonth;
	var inday = req.body.inday;
	var inhour = req.body.inhour;
	var inminute = req.body.inminute;
	var indayofweek= {};
	
	if(req.body.indayofweek=="Sunday")
		indayofweek=0;
	else if(req.body.indayofweek=="Monday")
		indayofweek=1;
	else if(req.body.indayofweek=="Tuesday")
		indayofweek=2;
	else if(req.body.indayofweek=="Wednesday")
		indayofweek=3;
	else if(req.body.indayofweek=="Thursday")
		indayofweek=4;
	else if(req.body.indayofweek=="Friday")
		indayofweek=5;
	else if(req.body.indayofweek=="Saturday")
		indayofweek=6;
		
	
	
	var outmonth = req.body.outmonth;
	var outday = req.body.outday;
	var outhour = req.body.outhour;
	var outminute = req.body.outminute;
	var outdayofweek= {};
	
	if(req.body.outdayofweek=="Sunday")
		outdayofweek=0;
	else if(req.body.outdayofweek=="Monday")
		outdayofweek=1;
	else if(req.body.outdayofweek=="Tuesday")
		outdayofweek=2;
	else if(req.body.outdayofweek=="Wednesday")
		outdayofweek=3;
	else if(req.body.outdayofweek=="Thursday")
		outdayofweek=4;
	else if(req.body.outdayofweek=="Friday")
		outdayofweek=5;
	else if(req.body.outdayofweek=="Saturday")
		outdayofweek=6;
		
	
	//form the reservation object and update the correct user's details
	var currentReservationInArray = {};
	var currentReservationOutArray = {};
	
	//console.log(JSON.stringify(reservationInTime));
	//console.log(JSON.stringify(reservationInTime));
	
	
	//get the current reservation array from the user in a variable. Append to that variable.
	userCollection.find({"phone":phone},{},function(e, docs){
	
		if(docs.length==0)
			res.send("Failed");
		else
		{
			res.send("Confirmed");
			currentReservationInArray = docs[0].reservationIn;
			currentReservationOutArray = docs[0].reservationOut;
		
			var reservationInJSONObject ={"inmonth":inmonth, "inday":inday,"inhour":inhour,"inminute":inminute, "indayofweek":indayofweek};
			var reservationOutJSONObject ={"outmonth":outmonth, "outday":outday,"outhour":outhour,"outminute":outminute, "outdayofweek":outdayofweek};
			
			currentReservationInArray.push(reservationInJSONObject);
			currentReservationInArray.push(reservationOutJSONObject);
		
			//store the appended variable into the row.
			userCollection.update({"phone":phone},{$set:{"reservationIn":currentReservationInArray}});
			userCollection.update({"phone":phone},{$set:{"reservationOut":currentReservationOutArray}});
		
		
			//schedule a cron job
			var cronInput = '00'+' '+inminute+' '+inhour+' '+inday+' '+inmonth+' '+indayofweek;
			
			console.log(cronInput);
			var job = new CronJob(cronInput, function() {
			  
			  //when the time occurs, get the gps from the mobile
			   mySocket.emit('getGpsRequest',{});
			   console.log("sending GPS request to clients!");
			  }, function () {
				/* This function is executed when the job stops */
			  },
			  true, /* Start the job right now */
			  'America/Phoenix' /* Time zone of this job. */
			);
			job.start();
			
		}
		//print out all the date time values
		
	});
		
});

router.get('/getNoMatch', function(req,res,next){
	//return all plates whose userFound is false
	var db = req.db;
	var detailCollection= db.get('detailcollection');
	detailCollection.find({"userFound":false},{licensePlate:1}, function(e,docs){
		res.send(JSON.stringify(docs));
	});
});

router.post('/assignPlateToUser', function(req,res,next){
	
	var db = req.db;
	var detailCollection= db.get('detailcollection');
	var userCollection = db.get('usercollection');
	
	//get licensePlate and phone from query
	var licensePlate = req.body.licensePlate;
	var phone= req.body.phone;
	
	//update the licensePlate in the usercollection
	userCollection.update({"phone":phone},{$set:{"licensePlate":licensePlate}});
	
	//set user found to true in details
	detailCollection.update({"licensePlate":licensePlate},{$set:{"userFound":true}});
	
	
});

router.get('/viewLicenseRecords', function(req, res, next) {
  var db = req.db;
  var detailCollection= db.get('detailcollection');
 
	detailCollection.find({},{}, function(e,docs){
		console.log(docs.length);
		res.render('records', { title: 'All records', records: docs, something:'hello' });
	});
	
	
  //fake stuff
   //var firstRecord={};
  /*
  image = fs.readFileSync("C://Users//cipher1729//projects//12DecLicensePlate//mongoDBlicense-master//testImg.png",'base64');
  firstRecord["camera_id"] =23;
  firstRecord["site_id"] ="delhi";
  firstRecord["license_image"]= image;
  var results=[{"plate":"S11FRE",confidence:99.99},{"plate":"S22FRE",confidence:88.88}];
  firstRecord["results"]=results;
  image = req.body.license_image;
  firstRecord["camera_id"] =req.body.camera_id;
  firstRecord["site_id"] =req.body.site_id;
  firstRecord["license_image"]= image;
  var results=req.body.results;
  firstRecord["results"]=results;

  
  
  //console.log(image);
  //collection.find({},{}, function(e,docs){
	//console.log(docs);
	 //res.render('records', { title: 'All records', records: JSON.stringify(docs), something:'hello' });
	 //docs[0].image= image;
	 //console.log(docs[0].image);
	var docs={};
	docs[0]= firstRecord;
	*/
	
	
  //});
});


/*
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



router.post('/setGps', function(req,res,next){
	var db = req.db;
	var userCollection= db.get('usercollection');
	var phone =  req.body.phone;
	var carGps = req.body.carGps;
	console.log(carGps);
	userCollection.update({"phone":phone},{$set:{"carGps":carGps}});
	res.send("Set!");
});




module.exports = router;
