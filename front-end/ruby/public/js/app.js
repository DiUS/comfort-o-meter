var context = cubism.context()
    .step(5e3)
    .size(1024)
    .serverDelay(1*1000)
    .clientDelay(1*1000);

var feeds = {
    "9f0590f33ec088fdfcbbbb4ba0b69d84" : { feedNum: 1, start: 0, step: 5, values : {} },
    "d69395e3dac827c408fb2512dc69f97b" : { feedNum: 2, start: 0, step: 5, values : {} },
    "0c5639bd4ce7069c04ee1c474b6567f4" : { feedNum: 3, start: 0, step: 5, values : {} },
    "b8f925d50eef3861912f7f1c9b1b98b2" : { feedNum: 4, start: 0, step: 5, values : {} },
    "a82ceb6076288dd0702e499b5c5658fd" : { feedNum: 5, start: 0, step: 5, values : {} },
    "c9f7153540a45f3a35ca0a82f2501435" : { feedNum: 6, start: 0, step: 5, values : {} }
};

$(function() 
{
    feedSocket = new FeedSocket(feeds, "ws://localhost:8001");

    window.onbeforeunload = function() 
    {
        feedSocket.close();
    }
    
    feedSocket.open();

    var timer = setInterval(function()
    {
        var feedsWithData = 0;    
        for (var feed in this.feeds)
        {
            if (Object.keys(feeds[feed].values).length != 0)
            {
                feedsWithData = feedsWithData + 1;
            }
        }
        if (feedsWithData == Object.keys(feeds).length)
        {   
            clearInterval(timer);
            d3.select("body").selectAll(".axis")
                .data(["top", "bottom"])
                .enter().append("div")
                .attr("class", function(d) { return d + " axis"; })
                .each(function(d) { d3.select(this).call(context.axis().ticks(12).orient(d)); });
            
            d3.select("body").append("div")
                .attr("class", "rule")
                .call(context.rule());

            d3.select("body").selectAll(".horizon")
                    .data(d3.range(1, Object.keys(feeds).length + 1).map(load_data)) 
                    .enter().insert("div", ".bottom")
                    .attr("class", "horizon")
                    .call(context.horizon().extent([-10, 10]));

            context.on("focus", function(i) 
            {
                d3.selectAll(".value").style("right", i == null ? null : context.size() - i + "px");
            });
        }
    },200);

});

function get_feed_index(x)
{
    for (var f in feeds)
    {
        if (feeds.hasOwnProperty(f))
        {
            if (feeds[f].feedNum == x)
            {
                return feeds[f];
            }
        }
    }     
}

function load_data(x) 
{
    var value = 0,
        values = [],
        i = 0,
        last,
        feed = get_feed_index(x);

    return context.metric(
        function(start, stop, step, callback) 
        {
            values = [];
            start = +start, stop = +stop;
            last = start;
            while (last < stop) 
            {
                var last_utc = last; //  + (new Date().getTimezoneOffset() * 60000);

                if (feed['values'].hasOwnProperty(last_utc / 1000))
                { 
                    value = feed['values'][last_utc / 1000];
                }
                else
                {
                    value = 0;
                }
                last += step;
                values.push(value);
            }
            callback(null, values);// = values.slice((stop - start) / step));
        }, x);
}
