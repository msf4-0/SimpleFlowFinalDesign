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

import time
import io
import base64
import json
import cv2
from PIL import Image
from ultralytics import YOLO
import sys
sys.path.append('../Nodes.py')
from Nodes import writelog
from paho.mqtt import client as mqtt_client

for key, value in list(globals().items()):
    if callable(value):
        if "function" in str(type(value)):
            importedfuncs.append(key)
        
newmethods={'Predict_and_Publish': {'0': ['text', 'Confidence threshold'], '1': ['radio', 'Plot labels', ['True', 'False']], '2': ['select','Device',["cpu","cuda"]], '3': ['text', 'Client ID'], '4': ['text', 'Broker'], '5': ['text', 'Port'], '6': ['text', 'Topic'], '7': ['text', 'Time interval between publishes']}}
color={'Predict_and_Publish': ''}

def Predict_and_Publish(inps):
    conf_thres = float(inps["vars"]["Confidence threshold"])
    plot_labels = inps["vars"]["Plot labels"] == "True"
    dev = 0 if inps["vars"]["Device"] == 'cuda' else 'cpu'
    publish_time = float(inps["vars"]["Time interval between publishes"])
    topic = inps["vars"]["Topic"]
    model = YOLO(inps['prev_node']['model'])
    vidcap = cv2.VideoCapture(0)
    time.sleep(1)
    client = mqtt_client.Client(inps["vars"]["Client ID"] if "Client ID" in inps["vars"] else "")
    client.connect(inps["vars"]["Broker"], int(inps["vars"]["Port"]))
    client.loop_start()
    notified = False
    start_time = time.time()
    while True:
        if vidcap.isOpened():
            ret, frame = vidcap.read() #capture a frame from live video
            #check whether frame is successfully captured
            if ret:
                cam = frame
            else:
                vidcap = cv2.VideoCapture(int(inps["prev_node"]["CameraVideoInput"]))
                time.sleep(2)
                print("Error : Failed to capture frame")
        # print error if the connection with camera is unsuccessful
        else:
            vidcap = cv2.VideoCapture(0)
            time.sleep(2)
            print("Cannot open camera")
        try:
            results = model.predict(cam, conf=conf_thres, device=dev)
            res_plotted = results[0].plot(labels=plot_labels)
            img = Image.fromarray(res_plotted)
            img = img.resize((512,512))
            b, g, r = img.split()
            img = Image.merge("RGB", (r, g, b))
            buf = io.BytesIO()
            img.save(buf, format='PNG')
            byte_im = buf.getvalue()
            byte_im = base64.b64encode(byte_im).decode('utf-8')
            byte_im_pil = byte_im
            byte_im = f"data:image/png;base64,{byte_im}"
            for result in results:
                log_string = ''
                boxes = result.boxes
                probs = result.probs
                for box in boxes:
                    if len(box) == 0:
                        return log_string if probs is not None else f'{log_string}(no detections), '
                    if probs is not None:
                        n5 = min(len(result.names), 5)
                        top5i = probs.argsort(0, descending=True)[:n5].tolist()
                        log_string += f"{', '.join(f'{result.names[j]} {probs[j]:.2f}' for j in top5i)}, "
                        log_string+="\n\n"
                clss = []
                clsn = []
                clsconf = []
                if boxes:  
                    for box in boxes:
                        if result.names[int(box.cls[0])] not in clss:
                            clsn.append(1)
                            clsconf.append([format(box.conf[0],'.2f')])
                            clss.append(result.names[int(box.cls[0])])
                        else:
                            clsn[clss.index(result.names[int(box.cls[0])])]+=1
                            clsconf[clss.index(result.names[int(box.cls[0])])].append(format(box.conf[0],'.2f'))
                    print(clss)
                    for c in clss:                                                                       
                        log_string += f"{clsn[clss.index(c)]} {c}{'s' * (clsn[clss.index(c)] > 1)} "
                        for i in range(0,len(clsconf[clss.index(c)])):
                            if i<len(clsconf[clss.index(c)])-1:
                                log_string += f"{clsconf[clss.index(c)][i]}    "
                            else:
                                log_string += f"{clsconf[clss.index(c)][i]}    "
            dictionary = {
                "source":inps["output_node"],
                "data":byte_im
            }        
            json_object = json.dumps(dictionary, indent=4)
            with open("../my-react-flow-app/sample.json", "w") as outfile:
                outfile.write(json_object)
        except:
            continue
        if not notified and time.time() - start_time >= publish_time - 3:
            writelog('Publishing in 3 seconds...')
            notified = True
        if time.time() - start_time >= publish_time:
            detections = {'Capacitor':0, 'Diode':0, 'IC':0, 'Pins':0, 'Resistor':0, 'Switch':0, 'Terminal':0, 'Transistor':0}
            for id, c in enumerate(clss):
                detections[c] = clsn[id]
            msg = json.dumps(detections)
            writelog(msg)
            result = client.publish(topic, msg)
            status = result[0]
            if status == 0:
                print(f"Published successfully.")
            else:
                print(f"Failed to publish.")
            notified = False
            start_time = time.time()
    return {"data":byte_im,"img":byte_im_pil,"outimagenode":inps["output_node"]}
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
