# Continuously read the serial port and process IO data received from a remote XBee.

from xbee import ZigBee
import serial
import struct
from array import array
from datetime import datetime, date, time
import sys
import time
import ilififowriter

def ByteToHex(byteStr): 
	# Convert a byte string to it's hex string representation e.g. for output.
	return ''.join( [ "%02X" % ord( x ) for x in byteStr ] ).strip() 

ser = serial.Serial('/dev/ttyUSB0', 9600)
xbee = ZigBee(ser, escaped=True)

# Set up the Intelligent.li FIFO writer
ilififowriter.init_fifo('/dev/mmcblk0p6')

# Continuously listen for sensor mote packets and send them to Intelligent.li
print 'Continuously read packets and send them to Intelligent.li'
while True:
	try:
		response = xbee.wait_read_frame()
		msgType = struct.unpack("B", response['rf_data'][0])[0]
		if msgType == 0xf3:
			sourceAddress = ByteToHex(response['source_addr_long'])
			sensorString = response['rf_data'][1:]
			print 'info received from ' + sourceAddress + ': ' + sensorString
			sampleTimestamp = int(time.time())
			deviceID = int(sourceAddress, 16)
			collectionID = deviceID
			# parse the string we received from the sensor mote
			names = sensorString.split("&")[0].split("=")[1].split(",")
			values = sensorString.split("&")[1].split("=")[1].split(",")
			for idx, val in enumerate(names):
				sensorID = val
				sensorValue = float(filter( lambda x: x in '0123456789.', values[idx])) # cleaning up any funny non-numeric chars
				print 'storing: ' + sensorID + '=' + '%f' % sensorValue
				ilififowriter.store_sample(sampleTimestamp, collectionID, deviceID, sensorID, sensorValue)
		else:
			print 'not a recognised message type.'
	except KeyboardInterrupt:
		break

ser.close()
