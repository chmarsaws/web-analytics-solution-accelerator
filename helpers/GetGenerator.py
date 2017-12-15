import requests
import random
import sys
import argparse
import time

def getEvent():
	events = {
		0 : 'click',
		1 : 'pageview',
		2 : 'conversion',
		3 : 'exception',
		4 : 'playvideo',
		5 : 'login',
		6 : 'logoff'
	}
	return events[random.randint(0,6)]

def getPage():
	return 'page_' + str(random.randint(1,100)) + '.html'

def getUser():
	return 'user' + str(random.randint(1,1000)) 

def getReferer():
	return 'referer_' + str(random.randint(1,20))

def getUserAgent():
	return 'python_manual_agent_' + str(random.randint(1,20))

parser = argparse.ArgumentParser()
parser.add_argument("target",help="<http...> the http(s) location to send the GET request")
parser.add_argument("calls",help="the number of HTTP calls to make")
parser.add_argument("delay",help="the time in seconds to delay between calls (ie 0.5 is half a second)")

args = parser.parse_args()
i = 0
s = requests.Session()
print "calls=" + str(args.calls)
while (i < int(args.calls)):
	#datavalue = "{ 'event' : '" + getEvent() + "' }, { 'page' : '" + getPage() + "'}, { 'clientid' : '" + getUser() + "' }"
	#datavalue = "{0}-{1}-{2}".format(getEvent(),getPage(),getUser())
	time.sleep(float(args.delay))
	headers = {'event' : getEvent(), 'clientid' : getUser(), 'page' : getPage(), 'Referer' : getReferer() }
	r = s.get(args.target + '?call=' + str(i),headers=headers)
	#r = requests.get(args.target)
	if(r.status_code==200):
		sys.stdout.write( str(i) + "-")
	else:
		sys.stdout.write( str(i) + "---->" + str(r.status_code) + "\n")
	sys.stdout.flush()
	i+=1
