var https = require('https');
var fs = require('fs');
var sp = require("serialport"); 
Ili = require ('./Ili.js')

var args = process.argv.splice(2)
var sample_index = parseInt(args[0],10)
var serial_port = args[1]

console.log(sample_index)
var previous_index = parseInt(fs.readFileSync('data/index.ini'))
console.log(previous_index)
sample_index = previous_index
console.log(sample_index)

var tempRegex = '[0-9].*\.[0-9][^:]'

var ili = new Ili('pki/key.pem', 'pki/cert.pem', 'pki/ca.crt', 'c001', 's002', '15', sample_index )

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

  if (readings.length < 7)
    return;

  // create datum filename
  var currentTime = Date.now();
  var fileName =  "data/iot-" + currentTime + ".log";

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

/*
  fs.writeFile(fileName, jsonStr, function (err) {
    if (err) throw err;

  });
*/


  ili.send_all_sensors(readings[0].replace(readingPrefix,''),
                      readings[1].replace(readingPrefix,''),
                      readings[2].replace(readingPrefix,''),
                      readings[3].replace(readingPrefix,''),
                      readings[4].replace(readingPrefix,''),
                      readings[5].replace(readingPrefix,''),
                      readings[6].replace(readingPrefix,''),
                      currentTime.toString())

  fs.writeFile('data/index.ini', ili.sample_index.toString(), function(err) {
    if (err) throw err;
    })

/*
  fs.unlink(fileName, function(err) {
    if (err) throw err;
    });
*/

}

/*
  List all serial ports available on start up
*/
/*sp.list(function (err, ports) {
//  console.log('XXXXXXXXXXXXXXXXXXXXXXXXXX')
  ports.forEach(function(port) {
    console.log(port.comName);
    console.log(port.pnpId);
    console.log(port.manufacturer);
  });
});*/

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
 //   console.log('\n');
    process_data(data)
  });  
  com.write("ls\n", function(err, results) {
    console.log('err ' + err);
    console.log('results ' + results);
  });  
});


//process_data('"T=32|P=98985|H=30.54|Light=46|A=269.22|Mic=6|Gas=140"')

