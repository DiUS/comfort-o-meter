var https = require('https');
var fs = require('fs');
var sp = require("serialport"); 

var args = process.argv.splice(2)
var sample_index = parseInt(args[0],10)
var serial_port = args[2]

var tempRegex = '[0-9].*\.[0-9][^:]'

/*
  Setup HTTPS options
*/
var options = {
  hostname: 'au.intelligent.li',
  port: 443,
  path: "",
  method: 'POST',
  key: fs.readFileSync('pki/key.pem'),
  cert: fs.readFileSync('pki/cert.pem'),
  ca: fs.readFileSync('pki/ca.crt'),
  headers: {'Content-Type': 'application/octet-stream'},
  secureProtocol:  'SSLv3_method',
  agent: false
};


response_handler = function(res) {
  //console.log("statusCode: ", res.statusCode);
  //console.log("headers: ", res.headers);

  res.on('data', function(data) {
    console.log(data);
  });
}

var readingPrefix = new RegExp('[a-zA-Z]*=');

/*
  1. Convert arduinod data into JSON uplaod string
  2. Create data file for JSON
  3. Upload the data to tohe next index
*/
process_data = function(data) {

  // process data into JSON
  //
  // Expected format "T=32|P=98985|H=30.54|Light=46|A=269.22|Mic=6|Gas=140"
  //
  var readings = data.split('|')

  var jsonStr = "{"
  jsonStr += "temperature:" + readings[0].replace(readingPrefix,'') + ","
  jsonStr += "pressure:" + readings[1].replace(readingPrefix,'') + ","
  jsonStr += "relative_humidity:" + readings[2].replace(readingPrefix,'') + ","
  jsonStr += "light:" + readings[3].replace(readingPrefix,'') + ","
  jsonStr += "altitude:" + readings[4].replace(readingPrefix,'') + ","
  jsonStr += "sound:" + readings[5].replace(readingPrefix,'') + ","
  jsonStr += "gas:" + readings[6].replace(readingPrefix,'') + ","
  jsonStr += "time:" + currentTime
  jsonStr += "}"

  console.log(jsonStr);

  // create datum filename
  var currentTime = Date.now();
  var fileName =  "data/iot-" + currentTime + ".log";

  fs.writeFile(fileName, jsonStr, function (err) {
    if (err) throw err;

  //console.log(fileName + ' saved!');

  // Upload data file to next data point
  // See : Documentation
  // http://intelligent-li.dius.com.au/documentation/29/sources-rest/
  // Uses i.li API 
  //  /api/v1/sources/<collection>/<sensor>/blobs/<alignment>/<index>
  //
  var options.path = '/api/v1/sources/c001/s002/blobs/15/' + sample_index;
  sample_index++;

  var req = https.request(options, response_handler);
  req.on('error', function(e) {
        console.log('********* ERROR ************')
        console.error(e);
    });


  console.log("sending to " + options.path + ": " + fileName);
  req.write(fs.readFileSync(fileName));
  req.end();

  // delete data file
  fs.unlink(fileName, function(err) {
    if (err) throw err;
    });

  });
}

/*
  List all serial ports available on start up
*/
sp.list(function (err, ports) {
//  console.log('XXXXXXXXXXXXXXXXXXXXXXXXXX')
  ports.forEach(function(port) {
    console.log(port.comName);
    console.log(port.pnpId);
    console.log(port.manufacturer);
  });
});

/*
  1. Set up serial port
  2. Open port and read data
 */
var com = new sp.SerialPort(serial_port, {
  baudrate: 9600,
  parser: sp.parsers.readline("\n")
  }, false);

com.open(function () {
  console.log('open');
  com.on('data', function(data) {
 //   console.log('data received: ' + data);
    console.log('\n');
    process_data(data)
  });  
  com.write("ls\n", function(err, results) {
    console.log('err ' + err);
    console.log('results ' + results);
  });  
});

