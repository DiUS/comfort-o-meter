#!/bin/bash

# start up comfort-o-meter
#!/bin/bash

#node client_dslabs.js 1 /dev/ttyUSB0 pda001 > /dev/null


NODE=/opt/node/bin/node
SERVER_JS_FILE=/home/pi/comfort-o-meter/node/client_dslabs.js
USER=pi
OUT=/dev/null

case "$1" in

start)
	echo "starting node: $NODE $SERVER_JS_FILE"
	sudo -u $USER $NODE $SERVER_JS_FILE 1 $2 pda001 > $OUT 2>$OUT &
	;;

stop)
	killall $NODE
	;;

*)
	echo "usage: $0 (start|stop) (serial port)"
esac

exit 0

