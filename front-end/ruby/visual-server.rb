require 'sinatra/base'
require 'eventmachine'
require 'em-websocket'

# This code is based on the recipe http://recipes.sinatrarb.com/p/embed/event-machine
def run(opts)
  EM.run do
    
    # define some defaults for our app
    server         = opts[:server] || 'thin'
    web_app        = opts[:app]
    host           = opts[:host] || '0.0.0.0'
    web_app_port   = opts[:web_app_port] || '8000'
    local_ws_port  = opts[:local_ws_port] || '8001'
    remote_ws_host = opts[:remote_ws_host] || 'intelligent.li'
    remote_ws_port = opts[:remote_ws_port] || '443'
    key_file       = opts[:key_file] || '/tmp/app.pem'
    cert_file      = opts[:cert_file] || '/tmp/ca.crt'

    dispatch = Rack::Builder.app do
      map '/' do
        run web_app
      end
    end
    
    # Need to make sure we're using an EM-compatible web-server.
    unless ['thin', 'hatetepe', 'goliath'].include? server
      raise "Need an EM webserver, but #{server} isn't"
    end
    
    # Start the web server
    Rack::Server.start({
      app:    dispatch,
      server: server,
      Host:   host,
      Port:   web_app_port
    })

    # Set up the websocket server for the JavaScript client
    EventMachine::WebSocket.start({:host => host, :port => local_ws_port}) do |ws|
      ws.onopen {
        output = EM::Channel.new
        input = EM::Channel.new
        server_close = EM::Channel.new
        client_close = EM::Channel.new

        output_sid = output.subscribe { |msg| ws.send msg }
        server_close_sid = server_close.subscribe { |msg| ws.close_connection }

        # Set up the websocket connection to Intelligent.li
        EventMachine::connect remote_ws_host, remote_ws_port.to_i, ConnectionHandler, input, output, server_close, client_close, key_file, cert_file

        ws.onmessage { |msg|
          puts "got message from JS client #{msg}"
          input.push(msg)
        }

        ws.onclose {
          output.unsubscribe(output_sid)
          server_close.unsubscribe(server_close_sid)
          client_close.push("exit")
        }
      }
    end
  end
end

class App < Sinatra::Base
  configure do
    set :threaded, false
  end
  
  get '/' do
    # 'Hello!'
    erb :index
  end
end

class ConnectionHandler < EventMachine::Connection

  def initialize(input, output, server_close, client_close, key_file, cert_file)
    super
    @input = input
    @output = output
    @server_close = server_close
    @client_close = client_close
    @key_file = key_file
    @cert_file = cert_file

    @input_sid = @input.subscribe { |msg| send_data msg }
    @client_close_sid = @client_close.subscribe { |msg| close_connection }
  end

  def post_init
    start_tls(:private_key_file => @key_file, :cert_chain_file => @cert_file, :verify_peer => false)
  end

  def receive_data(data)
    puts "got message from remote #{data}"
    @output.push(data)
  end

  def unbind
    @server_close.push("exit")
    @input.unsubscribe(@input_sid)
    @client_close.unsubscribe(@client_close_sid)
  end

end

# start the Sinatra web application
run app: App.new
