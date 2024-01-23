import os, json,sys
sys.path.append('../Nodes.py')
from Nodes import writelog


info = {
    "lib_name":os.path.basename(__file__).split(".")[0],
    "funcs":[
    ]
}
methods = {

}

color = {}

importedfuncs = []


#Add your node functions here (function name is node name)
'''

example:

def node1():                    ---> node1 is node name
    print("node1")              ---> body of the function (function will print the string "node1")

'''

##funcs start

import numpy as np
import cv2
import easyocr
from paho.mqtt import client as mqtt_client
from PIL import Image
import io
import base64


for key, value in list(globals().items()):
    if callable(value):
        if "function" in str(type(value)):
            importedfuncs.append(key)
        
newmethods={'OCR_and_MQTT': {'0': ['text', 'Client ID'], '1': ['text', 'Broker'], '2': ['text', 'Port'], '3': ['text', 'Publish Topic'], '4': ['text', 'Subscribe Topic'], '5': ['select', 'Device', ['cpu', 'cuda']]}}
color={'OCR_and_MQTT': ''}


def OCR_and_MQTT(inps):
    if inps["vars"]["Device"] == 'cuda':
        reader = easyocr.Reader(['en'])
    else:
        reader = easyocr.Reader(['en'], gpu=False)
    client = mqtt_client.Client(inps["vars"]["Client ID"] if "Client ID" in inps["vars"] else "")
    def on_message(client, userdata, msg):
        base64_image_string = msg.payload.decode()
        base64_data = base64_image_string.split(",")[1]
        image_bytes = base64.b64decode(base64_data)
        image_array = np.frombuffer(image_bytes, dtype=np.uint8)
        image = cv2.imdecode(image_array, cv2.IMREAD_GRAYSCALE)
        # _, image = cv2.threshold(image, 135, 255, cv2.THRESH_BINARY)
        reader = userdata['reader']
        result = reader.readtext(image, detail=0)
        string = ''.join(result)
        string = ''.join([c for c in string if c in ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']])
        if len(string) == 7:
            if userdata['last_value'] is None:
                client.publish(inps["vars"]["Publish Topic"], string)
                userdata['last_value'] = int(string)
            elif abs(int(string) - userdata['last_value']) < 100:
                client.publish(inps["vars"]["Publish Topic"], string)
                userdata['last_value'] = int(string)
    client.on_message = on_message
    client.user_data_set({'reader': reader, 'last_value': None})
    client.connect(inps["vars"]["Broker"], int(inps["vars"]["Port"]))
    client.subscribe(inps["vars"]["Subscribe Topic"])
    client.loop_start()
    try:
        writelog('Connected to broker.')
        while True:
            pass
    except KeyboardInterrupt:
        writelog("Stopping the loop.")
        client.loop_stop()
        client.disconnect()
    return {"outimagenode":inps["output_node"]}


##funcs end

#------------------------------------------------------------
#Add node parameter input methods (input file, input text,radio,dropdown)

def getdatamethod(newmethods):
    for i in newmethods:
        if i in methods:
            print(i)

            methods[i] = newmethods[i]
    info["methods"] = methods
    


def setinfo():
    l = []
    basefuncs = ["setinfo","exec","load","getdatamethod","value"]
    for key, value in list(globals().items()):
        if callable(value):
            if "function" in str(type(value)) and key not in importedfuncs:
                l.append(key)
    for i in l:
        if i not in basefuncs:
            arr = ["CustomNode",i]
            info["funcs"].append(arr)
            methods[i] = {}

def exec(nodename,inps):
    out = globals()[nodename](inps)
    json_object = json.dumps(out, indent=4)
    with open("./customnodeoutput.json","w") as file:
        file.write(json_object)

def load():
    global info
    info = {
        "lib_name":os.path.basename(__file__).split(".")[0],
        "color":color,
        "funcs":[
        ]
    }
    setinfo()
    getdatamethod(newmethods)
    return info


