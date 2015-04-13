var pg = require('pg');
var nconf = require('nconf');
var express = require('express');
var app = express();

//load variables
nconf
  .argv()
  .env()
  .file({file:'./config.json'});

var query = 'SELECT *, ST_Distance(ST_Transform(ST_SetSRID(ST_MakePoint($1, $2), 4326), 2227), geom) AS distance ' +
            'FROM sfsweeproutes ' +
            'WHERE geom && ST_Expand(ST_Transform(ST_SetSRID(ST_MakePoint($1, $2), 4326), 2227), 100) ' +
            'ORDER BY distance ' +
            'LIMIT 10';

app.get('/rules', function (req, res, next) {
  pg.connect(nconf.get('PG_URL'), function(err, client, done) {
    if(err) return next(err);

    if(!req.query || !req.query.lat || !req.query.lon) {
      return res.json({error: 'No lat and lon provided'});
    }

    client.query(query, [req.query.lat, req.query.lon], function(err, result) {
      if(err) return next(err);

      done();

      var match = result.rows[0];

      res.json(match);
    });
  });
});


app.post('/webhook', function(req, res, next) {
  res.json('OK');

  if(req.body && req.body.type === 'trip:finished') {
    var lat = req.body.location.lat,
        lon = req.body.location.lon,
        time = req.body.created_at,
        userID = req.body.user.v2_id;

    //TODO: update parked status and any pending notifications for user
    //TODO: ensure time > last parked time
  }
});


// error handlers
require('./libs/errors')(app);

app.set('port', process.env.PORT || 3000);

var server = app.listen(app.get('port'), function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('http://%s:%s', host, port);

});
