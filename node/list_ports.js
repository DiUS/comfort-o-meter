var sp = require("serialport");	


sp.list(function (err, ports) {
	console.log('XXXXXXXXXXXXXXXXXXXXXXXXXX')
  ports.forEach(function(port) {
    console.log(port.comName);
    console.log(port.pnpId);
    console.log(port.manufacturer);
  });
});
