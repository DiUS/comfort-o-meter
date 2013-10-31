XBee module should be plugged in to Pi. If it is not on /dev/ttyUSB0 (check with 'ls -al /dev/tty*), edit the sensor.js file.
Your PKI files are expected to be in the 'pki' subdirectory.

Install node modules:
npm install serialport
npm install xbee-api

Run:
nodejs sensor.js
