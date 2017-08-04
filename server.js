var http = require('http');
var express = require('express');
var mongodb = require('mongodb');
var validUrl = require('valid-url');
var app = express();
var shortid = require('shortid'); //for generating unique ids for urls
var Search = require('bing.search');
var search = new Search(process.env.BINGKEY);
var axios = require('axios');
var mongoose = require('mongoose');
var strftime = require('strftime');
var uri = 'mongodb://' + process.env.USER + ':' + process.env.PASS + '@' + process.env.HOST + ':' + process.env.PORT + '/' + process.env.DB;


app.use(express.static('public'));

app.route('/')
  .get(function(req, res) {
    res.sendFile(process.cwd() + '/views/index.html');
  });

app.use('/public', express.static(process.cwd() + '/public'));

////axios -- npm for handling get requests with nodejs -- because jquery doesn't work on server
var bing = axios.create({ //create own instance of axios with custom headers and url
  baseURL: 'https://api.cognitive.microsoft.com/bing/v5.0/images/search?q=',
  timeout: 1000,
  headers: {
    'Ocp-Apim-Subscription-Key': process.env.BINGKEY,
    'X-MSEdge-ClientID': "27D5B0926DF768B73F31BA466CF16914"
  }
  //     : 
  //     User-Agent: Mozilla/5.0 (compatible; MSIE 10.0; Windows Phone 8.0; Trident/6.0; IEMobile/10.0; ARM; Touch; NOKIA; Lumia 822)  
  //     X-Search-ClientIP: 999.999.999.999  
  //     X-Search-Location: lat:47.60357;long:-122.3295;re:100  
  //     // X-MSEdge-ClientID: <id>  //only after first request)
  //     Host: api.cognitive.microsoft.com  
});

app.get('/search/*', function(req, res) {
  var offsetnum = (req.query.offset * 10) || 0; //set the offset number if there's a qs specified?
  var count = 10;
  var searchQuery = req.params[0]; //get the search query
  console.log(searchQuery);
  var time = Date.now();
  time = strftime('%F %T', new Date(time));
  //store search string and when it was searched in mongo db 
  var dataEntry = [{
    term: searchQuery,
    when: time
  }];
  mongodb.MongoClient.connect(uri, function(err, db) {//connect to database
    if (err) throw err;
    var searches = db.collection('searches');//connect to searches database
    searches.insert(dataEntry, function(err, result) {//insert our serch time and term
      if (err) throw err;
      // console.log('ive written to the db');
      db.close();
    });
  });
////make our search url for the bing image serach API (using axios instance called bing)
  var urlSearch = searchQuery + "&count=" + count + "&offset=" + offsetnum + "&mkt=en-us HTTP/1.1";
//axios instance bing (created above)
  bing.get(urlSearch) // here's the axios bing api get request
    .then(function(response) {//success!
      var result = [];//create result array
      response.data.value.forEach(function(imageObj) {//loop through and get only the fields we need
        result.push({//push fields we need to new results array
          url: imageObj.contentUrl, //image url
          snippet: imageObj.name, //alt-text
          thumbnail: imageObj.thumbnailUrl, //thumbnail url
          context: imageObj.hostPageUrl //pageurl
        });
      });
      res.end(JSON.stringify(result));//display the resulting json in our website
    })
    .catch(function(error) {
      console.log("error");
    });

});

//searches for history must go to /history
app.get('/history', function(req, res) {
  mongodb.MongoClient.connect(uri, function(err, db) {//connect to mongo db
    if (err) throw err;
    var searches = db.collection('searches');
    searches.find({}, //find all docs
        {
          _id: 0
        } //_id:0 suppresses the _id field, (don't return this field only)
      )
      .sort({
        $natural: -1
      }) //this is to return latest entry first 
      .limit(10).toArray(function(error, documents) {//only 10 last searches shown
        if (err) return console.error(err)
        res.end(JSON.stringify(documents));//display in page
      })
    db.close();
  });
});

app.get("/*", function(request, response) {
  response.sendFile(__dirname + '/views/index.html');
});
// listen for requests :)
var listener = app.listen("3000", function() {
  console.log('Your app is listening on port ' + listener.address().port);
});

///*********************************************************************

//attempt with mongoose
// mongoose.connect(uri);//connect to the mongoDB //deprecated method

// var promise = mongoose.createConnection(uri, {
//   useMongoClient: true,
//   /* other options */
// });
// promise.then(function(db) {
//   /* Use `db`, for instance `db.model()`
// });
// // Or, if you already have a connection
// connection.openUri('mongodb://localhost/myapp', { /* options */ });


// var userSchema = mongoose.Schema({
//   firstName: String,
//   lastName: String,
//   email: String
// });



//***********************************************************************
//first attempt at connecting directly to the bing image search api

// app.get('/api/imagesearch/*', function(req, res) {
//   var searchQuery = req.params[0]; //get the search query
//   console.log(searchQuery + ": is what you searched");
//   // var pageNumber = (req.query.offset || 0);//set the page number if there's a qs specified?
//   // searchQuery = encodeURI(searchQuery);//URL encode the term before setting the query parameter
//   // searchQuery = "https://api.cognitive.microsoft.com/bing/v5.0/images/search?q=" + searchQuery + "&mkt=en-us HTTP/1.1";

//************************************************************************************
//second attempt  --- using bing.search from npm
//   //BING SEARCH API
//   // console.log(process.env.BINGKEY);

//     search.images(searchQuery, function(err, results) {
//         if (err) {
//           console.error(err);
//           res.status(500).json(err);
//         } else {
//           // console.log(util.inspect(results, 
//           //   {colors: true, depth: null}));
//             // console.log(results[0].title);
//           res.status(200).json(results);
//             // res.end(JSON.stringify(results));
//         }
//                 });
// });

//  //             },
//             type: "POST",
//             // Request body
//             data: "{body}",
//         })
//         .done(function(data) {
//             console.log("success");
//           console.log(JSON.stringify(data));
//           res.send(JSON.stringify(data));
//         })
//         .fail(function() {
//             console.log("error");
//         });
//     });
// });

//   GET 'https://api.cognitive.microsoft.com/bing/v5.0/images/search';
// app.get('/search/*', function (req, res) {
//   var url = 'https://api.cognitive.microsoft.com/bing/v5.0/images/search?q=sailing+dinghies&mkt=en-us HTTP/1.1' 
// http.get(url, 
//     Ocp-Apim-Subscription-Key: 
//     User-Agent: Mozilla/5.0 (compatible; MSIE 10.0; Windows Phone 8.0; Trident/6.0; IEMobile/10.0; ARM; Touch; NOKIA; Lumia 822)  
//     X-Search-ClientIP: 999.999.999.999  
//     X-Search-Location: lat:47.60357;long:-122.3295;re:100  
//     // X-MSEdge-ClientID: <2B3B49D4829560A23725430783CA61B6>  //only after first request)
//     Host: api.cognitive.microsoft.com  

// }