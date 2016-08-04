var express = require('express');
var app = express();
app.enable('trust proxy');

// export MLAB_LITTLE_URL_URI="mongodb://user:pass@ds042729.mlab.com:42729/little-url"
// heroku config:set MLAB_LITTLEURL_URI=mongodb://user:pass@ds042729.mlab.com:42729/little-url
var client = require('mongodb').MongoClient;
var dburl = process.env.MLAB_LITTLE_URL_URI;
var db;
var collection;

client.connect(dburl, function(err, connection) {
  if (err) {
    console.log('Unable to connect to the mongoDB server. Error:', err);
    throw err;
  } else {
    console.log('Connection established to', dburl);
    db = connection;
    collection = db.collection('newurl');
  }
});

app.get("/", function(req, res) {
  res.send("Little-url app. Please refer to new/ to get further info");
});

var newurlregexp = /\/new\/(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})).?)(?::\d{2,5})?(?:[/?#]\S*)?/;
app.get(newurlregexp, function(req, res, next) {
  var newurl = req.url.slice(5); // get rid of /new/
  var obj = {};
  var id;
  obj.original_url = newurl;
  collection.findOne({ newurl: newurl }).then(function(item) {
    if (!(item)) {
      collection.count({}).then(function(cnt) {
        id = cnt+1;
        console.log("count",cnt);
        collection.insertOne({ newurl: newurl, id: id }).then(function(db){
          obj.short_url = "http://"+req.get('Host')+"/"+id;
          res.send(JSON.stringify(obj));
        });
      });
    } else {
      id = item.id;
      obj.short_url = "http://"+req.get('Host')+"/"+id;
      res.send(JSON.stringify(obj));
    }
  });
});

app.get(/\/new\/[\s\S]*/, function(req, res, next) {
  var obj = {};
  obj.error = "Wrong url format, make sure you have a valid protocol and real site.";
  res.send(JSON.stringify(obj));
});

app.get('/:id', function(req, res, next) {
  collection.findOne({id: +req.params.id}).then(function(item) {
    console.log("item",item);
    if (item) {
      res.redirect(item.newurl);
    } else {
      res.send("not a valid url");
    }
  });
});

var port = process.env.PORT || 8080;
app.listen(port, function () {
  console.log('Node.js listening on port ' + port + '...');
});
