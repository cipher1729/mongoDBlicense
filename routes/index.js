var express = require('express');
var router = express.Router();
var assert = require('assert');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/records', function(req, res, next) {
  var db = req.db;
  var collection= db.get('usercollection');
  collection.find({},{}, function(e,docs){
	console.log(docs);
	 //res.render('records', { title: 'All records', records: JSON.stringify(docs), something:'hello' });
	res.render('records', { title: 'All records', records: docs, something:'hello' });
  });
  
 
});


/*POST a new record*/



module.exports = router;
