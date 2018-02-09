#!/usr/bin/env python

import os
import json
import datetime

if __name__ == '__main__':
    manifest = open('./web/manifest.json','w+',1)
    manifest.write('{\n')
    manifest.write('\t \"created\" : \"' + str(datetime.datetime.now()) + '\" ,\n')
    manifest.write('\t \"files\" : [\n')
    started = False
    for dirname, dirnames, filenames in os.walk('web'):
        for filename in filenames:
            if not filename.startswith('.'):
                if(started):
                    manifest.write(',\n')
                else:
                    started = True
                manifest.write('\t\t \"' + dirname.replace('\\','/')  + '/' + filename + '\"')
    manifest.write('\t\t]\n')
    manifest.write('}')
    manifest.flush()
    manifest.close()
    