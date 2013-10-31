
function calculate_sample_index(date, period)
{
	var millis = date.getTime();
	var seconds = millis / 1000;
 	var intervalIdx = seconds / period;
	return Math.floor(intervalIdx);
}

function sample_index_to_time(idx, period)
{
	return new Date(idx * 1000 * period);
}

var idx = calculate_sample_index(new Date(), 15);
console.log("idx  = " + idx);
console.log("time = " + sample_index_to_time(idx, 15));
console.log("now  = " + new Date());

