var https = require('https')
var fs = require('fs')

function Ili(keyFile, certFile, caFile, collection, sensor, increment, sample_index) {
  this.hostname = 'au.intelligent.li'
  this.port = 443
  this.path = ''
  this.method = '',
  this.key = fs.readFileSync(keyFile)
  this.cert = fs.readFileSync(certFile)
  this.ca = fs.readFileSync(caFile)
  this.headers = {}
  this.secureProtocol =  'SSLv3_method'
  this.agent = false
 
  this.sensor = sensor
  this.increment = increment
  this.sample_index = sample_index
  this.collection = collection

  this.options = {
	  hostname: this.hostname,
	  port: this.port,
	  path: '',
	  method: '',
	  key: this.key,
	  cert: this.cert,
	  ca: this.ca,
	  headers: this.headers,
	  secureProtocol:  this.secureProtocol,
	  agent: this.agent
  }

}

Ili.prototype.response_handler = function(res) {
  console.log("url: ", res.message);
  console.log("statusCode: ", res.statusCode);
  console.log("headers: ", res.headers);
  
  var data = '';

  res.on('data', function(chunk) {
    data += chunk
  })

  res.on('end', function() {
    console.log(data)
  })

}


Ili.prototype.send_blob_reading = function(fileName) {
  this.options.method = 'POST'
  this.headers = {'Content-Type': 'application/octet-stream'}
  this.options.path = '/api/v1/sources/' + this.collection + '/'+ this.sensor +'/blobs/' + this.increment + '/' + this.sample_index
//  this.options.path = '/api/v1/sources/c001/s002/blobs/15/' + this.sample_index;
  this.sample_index++;

  var req = https.request(this.options, this.response_handler)
  req.on('error', function(e) {
        console.log('********* ERROR ************')
        console.error(e)
    })


  console.log("sending to " + this.options.path + ": " + fileName)
  req.write(fs.readFileSync(fileName))
  req.end()
}

Ili.prototype.next_sample = function() {
  this.sample_index++;
}

Ili.prototype.send_sensor = function(sensorX, reading) {
  this.options.method = 'POST'
  this.headers = {'Content-Type': 'application/json'}
  this.options.path = '/api/v1/sources/' + this.collection + '/'+ sensorX +'/samples/' + this.increment + '/' + this.sample_index + '/' + parseFloat(reading).toFixed(4)
//  this.options.path = '/api/v1/sources/c001/s002/blobs/15/' + this.sample_index;
//  this.sample_index++;

  var req = https.request(this.options, this.response_handler)
  req.on('error', function(e) {
        console.log('********* ERROR ************')
        console.error(e)
    })


  console.log("sending to " + this.options.path /*+ ": " + reading*/)

  req.write('')
  req.end()
}

Ili.prototype.send_all_sensors = function(temperature, pressure, relative_humidity, light, altitude, sound, gas, time, lattitude, longitude) {
  this.send_sensor('temperature', temperature)
  this.send_sensor('pressure', pressure)
  this.send_sensor('relative_humidity', relative_humidity)
  this.send_sensor('light', light)
  this.send_sensor('altitude', altitude)
  this.send_sensor('sound', sound)
  this.send_sensor('gas', gas)
  //this.send_sensor('time', time)
  this.send_sensor('lattitude', lattitude)
  this.send_sensor('longitude', longitude)
  this.next_sample()  
}

module.exports = Ili