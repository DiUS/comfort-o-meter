import time
import ilififowriter

ilififowriter.init_fifo('/dev/mmcblk0p6')

devId = 1
collectionId = devId
sensorId = 'volt'
sampleValueStep = 1.0001
sampleValue = 0
for i in range(10):
	sampleTimestamp = int(time.time())
	sampleValue = sampleValue + sampleValueStep
	ilififowriter.store_sample(sampleTimestamp, collectionId, devId, sensorId, sampleValue)
	time.sleep(5)
	