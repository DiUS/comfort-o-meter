var pg = require('pg');
var conString = "postgres://sensor:sensor@localhost/sensor";
var client = new pg.Client(conString);
var util = require('util');
var SerialPort = require('serialport').SerialPort;
var xbee_api = require('xbee-api/lib/xbee-api.js');
var C = xbee_api.constants;

var xbeeAPI = new xbee_api.XBeeAPI({
  api_mode: 1
});

var serialport = new SerialPort("/dev/ttyUSB0", {
  baudrate: 9600,
  parser: xbeeAPI.rawParser()
});


client.connect(function(err) {
  if(err) {
    return console.error('could not connect to postgres', err);
  }
  client.query('SELECT NOW() AS "theTime"', function(err, result) {
    if(err) {
      return console.error('error running query', err);
    }
    console.log("Database connected OK");
  });
});


serialport.on("open", function() {
  var frame_obj = { // AT Request to be sent to
    type: C.FRAME_TYPE.AT_COMMAND,
    command: "NI",
    commandParameter: [],
  };

  serialport.write(xbeeAPI.buildFrame(frame_obj));
});

// All frames parsed by the XBee will be emitted here
xbeeAPI.on("frame_object", function(frame) {
  if(frame.data !== undefined) {
    insertReading(frame.remote64, frame.data);
  }
});

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

function insertReading(sensorId, frameData) {
  var str = sensorId + "," + dataToString(frameData);
  var strValues = str.split(",");
  var values = [
    sensorId, 
    parseFloat(strValues[1]), 
    parseFloat(strValues[2]) / 100.0, 
    parseFloat(strValues[3]), 
    parseFloat(strValues[4]), 
    parseFloat(strValues[6]), 
    parseFloat(strValues[7])];
  
  client.query({
    name:"insert reading",
    text:"insert into readings(sensor_id, temperature, pressure, humidity, light, noise, gas) values ($1, $2, $3, $4, $5, $6, $7)",
    values: values
  }, function(err, result) {
    console.log("ERR: " + err);
    console.log("RES: " + result);
  });

  var now = new Date();
  var date = formatDate(now);
  var time = formatTime(now);      
  console.log(sensorId + "," + date + "," + time + "," + values);
}

function handleError(err) {
  if(!err) 
    return false;

  console.log(err);
  return true;
}

function toRow(str) {
  return {
    sensor_id: values[1],
    temperature: values[2],
    pressure: values[3],
    humidity: values[4],
    light: values[5],
    altitude: values[6],
    noise: values[7],
    gas: values[8]
  };
}

function formatTime(date) {
  var h = date.getHours();
  var m = date.getMinutes();
  var s = date.getSeconds();
  return h+":"+m+":"+s;
}

function formatDate(date) {
  var d = date.getDate();
  var m = date.getMonth() + 1;
  var y = date.getFullYear();
  return d+"/"+m+"/"+y;
}
