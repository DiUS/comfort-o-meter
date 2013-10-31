var util = require('util');
var SerialPort = require('serialport').SerialPort;
var xbee_api = require('xbee-api/lib/xbee-api.js');
var C = xbee_api.constants;
Ili = require ('./Ili.js')


var xbeeAPI = new xbee_api.XBeeAPI({
  api_mode: 1
});


/** 
 * Initialise and open the serial port that communicates with the XBee module
 */
var serialport = new SerialPort("/dev/ttyUSB0", { 
  baudrate: 9600, 
  parser: xbeeAPI.rawParser()
});

serialport.on("open", function() {
  var frame_obj = { // AT Request to be sent to
    type: C.FRAME_TYPE.AT_COMMAND,
    command: "NI",
    commandParameter: [],
  };

  serialport.write(xbeeAPI.buildFrame(frame_obj));
});


/**
 * Event handler for incoming data from XBee
 */
xbeeAPI.on("frame_object", function(frame) {
  if(frame.data !== undefined) {
    insertReading(frame.remote64, frame.data);
  }
});


/**
 * convert the XBee frame data back into a readable string
 */
function dataToString(data) {
  var str = "";
  for(var i=0; i<data.length; i++) {
    var chr = parseInt(data[i]);
    if( chr >= 32 && chr <= 127) {
      str += String.fromCharCode( parseInt(data[i]) );
    }
  }
  return str;
}


/**
 * Send the sensor reading to intelligent.li
 */
function insertReading(collection, frameData) 
{
  var strValues = dataToString(frameData).split(",");
  var values = [
    parseFloat(strValues[1]),  // temperature
    parseFloat(strValues[2]),  // pressure
    parseFloat(strValues[3]),  // humidity
    parseFloat(strValues[4]),  // light
    parseFloat(strValues[5]),  // altitude
    parseFloat(strValues[6]),  // noise
    parseFloat(strValues[7])]; // gas

  var sample_index = calculate_sample_index(new Date(), 15);  
  var ili = new Ili('pki/key.pem', 'pki/cert.pem', 'pki/ca.crt', collection, 'sensor', '15', sample_index );
  ili.send_all_sensors(collection, values[0], values[1], values[2], values[3], values[4], values[5], values[6], new Date().toString());
  console.log("should be done");
}


/** 
 * Calculate a sample index based on the current time
 */
function calculate_sample_index(date, period)
{
        var millis = date.getTime();
        var seconds = millis / 1000;
        var intervalIdx = seconds / period;
        return Math.floor(intervalIdx);
}

function sample_index_to_time(idx, period)
{
        return new Date(idx * 1000 * period);
}


