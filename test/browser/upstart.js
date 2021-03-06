/*
    Launch sails server and load browser tests
*/
var fs = require('fs'),
    spawn = require('child_process').spawn,
    sails,
    err;

// Set environment variables for the child process
process.env.NODE_ENV = (process.argv.indexOf('development') >= 0) ? 'development' : 'test';
process.env.TEST_ROOT= "http://localhost:1337";

// Copy test data into place:
// cp test/data/disk.db .tmp/disk.db
// Doing in JS instead of shell for Windows
// source: http://stackoverflow.com/a/14387791
function copyFile(source, target, cb) {
  var cbCalled = false;

  var rd = fs.createReadStream(source);
  rd.on("error", function(err) {
    done(err);
  });
  var wr = fs.createWriteStream(target);
  wr.on("error", function(err) {
    done(err);
  });
  wr.on("close", function(ex) {
    done();
  });
  rd.pipe(wr);

  function done(err) {
    if (!cbCalled) {
      cb(err);
      cbCalled = true;
    }
  }
}
copyFile('./test/data/disk.db', './.tmp/disk.db', start);

function start(err) {
  if (err) return console.log('error: ', err);

  console.log('lifting sails: env=' + process.env.NODE_ENV);

  var config = {
    // turn down the log level so we can view the test results
    log: {
      level: 'error'
    },
    hooks: {
      grunt: false
    }
  }

  // Lift Sails and store the app reference
  require('sails').lift(config, function(e, s) {
    sails = s;
    err = e;
    // export properties for upcoming tests with supertest.js
    sails.localAppURL = localAppURL = ( sails.usingSSL ? 'https' : 'http' ) + '://' + sails.config.host + ':' + sails.config.port + '';

    var test = spawn('./node_modules/.bin/mocha-casperjs', ['test/browser/browser.js']);
    test.stdout.on('data', function (data) {
      console.log(''+data);
    });

    test.stderr.on('data', function (data) {
      console.error('stderr: '+data);
    });

    test.on('exit', function (code) {
      sails.lower(function() {
        process.exit(code);
      });
    });
  });
}
