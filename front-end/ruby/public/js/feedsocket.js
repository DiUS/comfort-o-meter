/*
 * FeedSocket Copyright Percepscion Pty. Ltd.
 * 
 * Provides a class for connecting to a feed
 * server via web sockets.
 *
 * 
 */
function FeedSocket(f, url)
{
    if (!("WebSocket" in window)) 
    {
        return;
    }
    this.feeds = f;

    this.open = function()
    {
        this.ws = new WebSocket(url);
        this.ws.parent = this;

        this.ws.onmessage = function (msg)
        {
            var message = JSON.parse(msg.data);
            if (message.hasOwnProperty("guid") && message.hasOwnProperty("values"))
            {
                if (this.parent.feeds.hasOwnProperty(message.guid))
                {
                    for (var val in message.values)
                    {
                        this.parent.feeds[message.guid].values[val] = message.values[val];
                    }
                }
            }
        };

        this.ws.onopen = function()
        {
            var start = ((new Date() / 1000) | 0) - (60 * 60 * 2)

            for (var feed in this.parent.feeds)
            {
                if (this.parent.feeds.hasOwnProperty(feed)) 
                {
                    if (this.parent.feeds[feed].start == 0)
                    { 
                        this.parent.feeds[feed].start = 
                           (start / this.parent.feeds[feed].step) * this.parent.feeds[feed].step;
                    }

                    this.send(JSON.stringify(
                    {
                        'action' : 'subscribe', 
                        'guid'   : feed, 
                        'step'   : this.parent.feeds[feed].step, 
                        'start'  : this.parent.feeds[feed].start
                    }));
                }
            }
        };

        this.ws.onclose = function()
        { 
            var that = this;
            setTimeout(function(){ that.parent.open();}, 1000);
        };

        this.ws.onerror = function()
        {
            var that = this;
            setTimeout(function(){ that.parent.open(); }, 1000);
        }
    }

    this.unsubscribe = function(feed)
    {
        this.ws.send(JSON.stringify({'action' : 'unsubscribe', 'guid' : feed}));
    }

    this.unsubscribeAll = function()
    {
        for (var feed in this.feeds)
        {
            this.unsubscribe(feed);
        }
    }

    this.close = function() 
    {
        this.ws.onclose = function () {};
        this.ws.onerror = function () {};
        this.unsubscribeAll(); 
        this.ws.close();
    }
}
