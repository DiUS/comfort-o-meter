# Continuously read the serial port and process IO data received from a remote XBee.

from xbee import ZigBee
import serial
import struct
from array import array
from datetime import datetime, date, time
import sys

def ByteToHex(byteStr): 
	# Convert a byte string to it's hex string representation e.g. for output.
	return ''.join( [ "%02X" % ord( x ) for x in byteStr ] ).strip() 

ser = serial.Serial('/dev/tty.usbserial-AD01SS0B', 9600)
xbee = ZigBee(ser, escaped=True)

# Continuously read and print packets
print 'Continuously read and print packets'
while True:
	try:
		response = xbee.wait_read_frame()
		msgType = struct.unpack("B", response['rf_data'][0])[0]
		if msgType == 0xf3:
			print 'info received from ' + ByteToHex(response['source_addr_long']) + ': ' + response['rf_data'][1:]
		else:
			print 'not a recognised message type.'
	except KeyboardInterrupt:
		break

ser.close()
