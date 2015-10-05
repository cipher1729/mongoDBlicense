var express = require('express');
var router = express.Router();
var assert = require('assert');
var fs= require('fs');
var image={};

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/records', function(req, res, next) {
  var db = req.db;
  var collection= db.get('usercollection');
  image = fs.readFileSync("C://Users//cipher1729//projects//licenserecog//testImg.png",'base64');
  //console.log(image);
  collection.find({},{}, function(e,docs){
	//console.log(docs);
	 //res.render('records', { title: 'All records', records: JSON.stringify(docs), something:'hello' });
	 docs[0].image= image;
	 console.log(docs[0].image);
	res.render('records', { title: 'All records', records: docs, something:'hello' });
  });
});


/*POST a new record*/
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
   collection.insert({
        "uuid" : uuid,
		"camera_id":camera_id,
        "site_id" : site_id,
		"image_width" : image_width,
		"image_height" : image_height,
		"epoch_time" : epoch_time,
		"processing_time_ms" : processing_time_ms,
		"results" : results
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





module.exports = router;
