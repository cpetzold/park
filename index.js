var pg = require('pg');
var express = require('express');

var pgUri = 'postgres://park:pk112358@park.cvusblqc6wjp.us-west-2.rds.amazonaws.com/park';

var app = express();

var query = 'SELECT *, ST_Distance(ST_Transform(ST_SetSRID(ST_MakePoint($1, $2), 4326), 2227), geom) AS distance ' +
            'FROM sfsweeproutes ' +
            'WHERE geom && ST_Expand(ST_Transform(ST_SetSRID(ST_MakePoint($1, $2), 4326), 2227), 100) ' +
            'ORDER BY distance ' +
            'LIMIT 10';

app.get('/', function (req, res, next) {
  pg.connect(pgUri, function(err, client, done) {
    if (err) {
      return console.error('error fetching client from pool', err);
    }

    client.query(query, [req.query.lat, req.query.long], function(err, result) {
      done();

      var match = result.rows[0];

      res.json(match);
    });
  });
});

var server = app.listen(3000, function () {


// error handlers
require('./libs/errors')(app);

  var host = server.address().address;
  var port = server.address().port;

  console.log('http://%s:%s', host, port);

});
