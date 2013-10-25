
#include <Wire.h>
#include <EEPROM.h>
#include <SoftwareSerial.h>
#include <XBee.h>
#include "Adafruit_BMP085.h"
#include <PString.h>

Adafruit_BMP085 bmp;
XBee xbee = XBee();

// Google I/O SMD Mote

// Authors: Alasdair Allan <alasdair@babilim.co.uk>, Rob Faludi <ron@faludi.com> and Kipp Bradford <kb@kippworks.com>
// Last Updated: 07-May-2013 15:35 EDT
// Last modification: Ready for production, modifications for altitude calculation, and fixes to serial data out 

#define BMP085_ADDRESS 0x77  // I2C address of BMP085
#define CODE_VERSION 2.3
#define SILENT_VALUE 380     // Starting neutral microphone value (self-correcting)
#define BMP085_DEBUG 1

// Pins
//
// 0         RX (from XBee)
// 1         TX (to XBee)

// 4         Shutdown for LT5334 RF Sensor (do not use)
const int rfShutdown = 4;

// 5         BMP085 XCLR
const int BMP085_XCLR = 5;

// 6         Button (Pressure Mat) 
//           (Also acts as pull-down pin for the Pressure Mat, if initially pulled LOW then pressure mat populated)
const int butPin = 6;

// 7         BMP085 EOC
const int BMP085_EOC = 7;

// 8         LED (Power)
// 9         LED (Loop Activity)
// 10        LED (Motion Detected - aka Button Pushed)
const int powr_led = 8;
const int loop_led = 9;
const int motn_led = 10;

// 11       RF Configuration Detector
const int rfPullDown = 11;

// 12        Pull-down pin for the Gas Sensor (If pulled LOW then Gas Sensor populated)
const int gasPullDown = 12;

// A0        Humidity Sensor (HTH-4030)
// A1        Light Sensor (TEMT6000)
// A2        Microphone (Adafruit Board)
// A3        Gas Sensor/RF Sensor (check Pin 5 and Pin 12 for which is populated if either)
//           NB: Cannot have both Gas Sensor and RF Sensor populated on same board as both share the output pin
const int hih4030 = A0;
const int temt6000 = A1;
const int micPin = A2;
const int analogPin = A3;

//Temperature & Humidity Sensor (BMP085) via I2C
// Uses I2C and the Wire Library
//
// NOTE: This is a 3.3V part
// NOTE: The SDA/SCL pins on the Uno and Leonardo are different.
// A4 & A5 (Arduino Uno)      
// 2 & 3 (Arduino Leonardo) 
//
// Route traces on your board to the dedicated SCL/SDA pins that the Uno R3 and Leonadro share.

// variables
short temperature;
long pressure;
const float p0 = 101325;             // Pressure at sea level (Pa)float altitude;
unsigned long samplingDelay = 20000; // default sampling delay in millis (SUPERCEDED BY ANYTHING STORED IN EEPROM)
unsigned long lastSampleTime = 0;
int micVal = 0;
int motionState = 0;
String inputString = "";   // a string to hold incoming data

// button variables
unsigned long total = 0;
unsigned long sinceLast = 0;

int buttonState;             // the current reading from the input pin
int lastButtonState = LOW;   // the previous reading from the input pin

int sentPacket = 0;

// the following variables are long's because the time, measured in miliseconds,
// will quickly become a bigger number than can be stored in an int.
long lastDebounceTime = 0;  // the last time the output pin was toggled
long debounceDelay = 50;    // the debounce time; increase if the output flickers
unsigned long lastCounterTime = 0; // the last time the EEPROM counter pin written
unsigned long lastCallbackTime = 0;// the last time the data was written

// population flags
int hasRF = 0;
int hasGas = 0;
int hasMat = 0;

void sendInfoPayload(String info) {
  info.replace('\n', ',');
  info.replace('\r', ' ');
  char payload[2+info.length()];
  payload[0] = 0xf3;  // payload type
  PString infoString(&payload[1], sizeof(payload)-1);
  infoString.print(info);
  
  // Specify the address of the remote XBee (this is the SH + SL)
  XBeeAddress64 addr64 = XBeeAddress64(0x0, 0x0); // Coordinator address
  
  // Create a TX Request
  ZBTxRequest zbTx = ZBTxRequest(addr64, (uint8_t *)payload, sizeof(payload));
  
  // Send the request
  xbee.send(zbTx);
}

// SETUP ------------------------------------------------------------------------------------------------------

void setup() {
  Serial.begin(9600);
  xbee.setSerial(Serial);

  // while the serial stream is not open, do nothing.
  //
  // WARNING: Needs to be removed for production release!!!
  //while (!Serial) ;
  sendInfoPayload("Initializing...");

  char versionBuffer[10];
  sendInfoPayload("SensorMote (Google I/O) v" + String(dtostrf(CODE_VERSION, 6, 2, versionBuffer)));

  pinMode(rfShutdown, INPUT);    // TESTING ONLY. SHOULD BE OUTPUT
  pinMode(BMP085_XCLR, OUTPUT); 
  pinMode(BMP085_EOC, INPUT);    // End of conversion signal

  // Pull Down Resistors
  pinMode(butPin, INPUT);      
  pinMode(rfPullDown, INPUT);  
  pinMode(gasPullDown, INPUT); 

  digitalWrite(butPin, HIGH);  
  digitalWrite(rfPullDown, HIGH);  
  digitalWrite(gasPullDown, HIGH);  

  // LEDs
  pinMode( powr_led, OUTPUT);
  pinMode( loop_led, OUTPUT);
  pinMode( motn_led, OUTPUT);

  sendInfoPayload("Checking LEDs...");

  digitalWrite(powr_led, HIGH);  // LED CHECK
  delay(1000);
  digitalWrite(powr_led, LOW);   // LED CHECK
  digitalWrite(loop_led, HIGH);  // LED CHECK
  delay(1000);
  digitalWrite(loop_led, LOW);   // LED CHECK
  digitalWrite(motn_led, HIGH);  // LED CHECK
  delay(1000);
  digitalWrite(motn_led, LOW);   // LED CHECK

  digitalWrite(powr_led, HIGH);  // LED OPERATIONAL
  digitalWrite(loop_led, HIGH);  // LED OPERATIONAL

  //get the saved sampling delay from memory
  unsigned long eepromNumber = getNumber();

  // ignore a zero value
  if (eepromNumber > 0) {
    samplingDelay = eepromNumber;
  }
  sendInfoPayload( "Sampling delay = " + String(samplingDelay, DEC));

  sendInfoPayload("Setting BMP085_XCLR high");
  digitalWrite(BMP085_XCLR, HIGH);  // Make sure BMP085 is on

  sendInfoPayload("Calling bmp085.begin( )");  
  bmp.begin(); 

  if( digitalRead(rfPullDown) == LOW ) {
    sendInfoPayload( "RF Sensor circuitry populated");
    hasRF = 1;
  } 
  else {
    sendInfoPayload( "No RF Sensor circuitry");
  }

  if( digitalRead(gasPullDown) == LOW ) {
    sendInfoPayload( "Gas Sensor circuitry populated");
    hasGas = 1;
  } 
  else {
    sendInfoPayload( "No Gas Sensor circuitry");
  }

  if( digitalRead(butPin) == LOW ) {
    sendInfoPayload( "Pressure Mat circuitry populated");
    hasMat = 1;
  } 
  else {
    sendInfoPayload( "No Pressure Mat circuitry");
  }
  digitalWrite(loop_led, LOW);

}

// LOOP ------------------------------------------------------------------------------------------------------
//
// Main loop
// 1) Checks to see whether we should send a data sample
// 2) Looks for button pushes
// 3) Looks for config updates on the XBee network

void loop() {

  if ((millis() - lastSampleTime) > samplingDelay || lastSampleTime==0) {
    getSample();
    lastSampleTime = millis();
  } 

  // Check Mesh network for sample rate update
  checkForInput();  
}

// GET SAMPLE ------------------------------------------------------------------------------------------------------
// Grabs sample data and outputs it to the serial port and XBee network

void getSample() {
  digitalWrite(loop_led,HIGH);

  temperature = bmp.readTemperature();
  pressure = bmp.readPressure(); 
  int light = analogRead(temt6000);
  int humid = analogRead(hih4030);
  float relative_humid = ((0.0004*temperature + 0.149)*humid)-(0.0617*temperature + 24.436);
  float altitude = bmp.readAltitude(102210); // in metres
  micVal = getSound(); 
  int gasValue =  analogRead(analogPin);
  
  // Send readings to the ZigBee coordinator
  char buffer[10];
  String readings = "";
  readings += temperature;
  readings += ",";
  readings += pressure;
  readings += ",";
  readings += dtostrf(relative_humid, 6, 2, buffer);
  readings += ",";
  readings += light;
  readings += ",";
  readings += dtostrf(altitude, 6, 2, buffer);
  readings += ",";
  readings += micVal;
  readings += ",";
  readings += gasValue;
  sendInfoPayload(readings);

  digitalWrite(loop_led, LOW);
  sinceLast = 0;
}

// CHECK FOR INPUT ------------------------------------------------------------------------------------------------------
//
// Checks for configuration updates over the XBee network

void checkForInput() {
}

// GET SOUND ------------------------------------------------------------------------------------------------------
//
// Does something sensible(ish) with the microphone input

int getSound() {
  static int average = SILENT_VALUE; // stores the neutral position for the mic
  static int avgEnvelope = 0; // stores the average sound pressure level
  int avgSmoothing = 10; // larger values give more smoothing for the average
  int envSmoothing = 2; // larger values give more smoothing for the envelope
  int numSamples=1000; //how many samples to take
  int envelope=0; //stores the mean sound from many samples
  for (int i=0; i<numSamples; i++) {
    int sound=analogRead(micPin); // look at the voltage coming from the mic
    int sampleEnvelope = abs(sound - average); // the distance from this reading to the average
    envelope = (sampleEnvelope+envelope)/2;
    avgEnvelope = (envSmoothing * avgEnvelope + sampleEnvelope) / (envSmoothing + 1);
    //Serial.println(avgEnvelope);
    average = (avgSmoothing * average + sound) / (avgSmoothing + 1); //create a new average
  }
  return envelope;
}



