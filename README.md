comfort-o-meter
===============

The IoT SIG project to monitor office environmental data. See the [wiki page](https://github.com/DiUS/comfort-o-meter/wiki) for setup details.

Two examples

* python - python-based gateway and mote code
* node - node.js-based gateway and mote code

Ideas for improvement
---------------------
* Improve the accuracy of the altitude reading by finding out the daily actual local atmospheric pressure at sea level and use that instead of using a hard-coded assumed value.
* Use [Protocol Buffers](http://code.google.com/p/protobuf/) (or similar header-based cross-platform message definition mechanism) to encode and decode the message over ZigBee more efficiently.
* Make the sound level average more samples over a longer period to get a more realistic reading of ambient sound.
