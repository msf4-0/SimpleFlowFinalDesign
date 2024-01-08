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

newmethods={'Pick_and_Place': {'0': ['text', 'TCP speed'], '1': ['file', 'Model Path', 'File'], '2': ['select', 'Device', ['cpu', 'cuda']], '3': ['text', 'Time interval between runs (s)']}}
color={'Pick_and_Place': '','a': ''}


import sys
import os
import io, base64, json
import math
import time
import queue
import datetime
import random
import traceback
import threading
import copy
import numpy as np
from PIL import Image, ImageDraw
from ultralytics import YOLO
import cv2

sys.path.append(os.path.join(os.path.expanduser('~'), 'xArm-Python-SDK'))
from xarm import version
from xarm.wrapper import XArmAPI

for key, value in list(globals().items()):
    if callable(value):
        if "function" in str(type(value)):
            importedfuncs.append(key)
        

def Pick_and_Place(inps):
    class RobotMain(object):
        """Robot Main Class"""
        def __init__(self, robot, **kwargs):
            self.alive = True
            self._arm = robot
            self._tcp_speed = int(inps["vars"]["TCP speed"])
            self._tcp_acc = 2000
            self._angle_speed = 20
            self._angle_acc = 500
            self.camera_offset = 30
            self._vars = {}
            self._funcs = {}
            self._robot_init()

        # Robot init
        def _robot_init(self):
            self._arm.clean_warn()
            self._arm.clean_error()
            self._arm.motion_enable(True)
            self._arm.set_mode(0)
            self._arm.set_state(0)
            time.sleep(1)
            self._arm.register_error_warn_changed_callback(self._error_warn_changed_callback)
            self._arm.register_state_changed_callback(self._state_changed_callback)
            if hasattr(self._arm, 'register_count_changed_callback'):
                self._arm.register_count_changed_callback(self._count_changed_callback)

        # Register error/warn changed callback
        def _error_warn_changed_callback(self, data):
            if data and data['error_code'] != 0:
                self.alive = False
                self.pprint('err={}, quit'.format(data['error_code']))
                self._arm.release_error_warn_changed_callback(self._error_warn_changed_callback)

        # Register state changed callback
        def _state_changed_callback(self, data):
            if data and data['state'] == 4:
                self.alive = False
                self.pprint('state=4, quit')
                self._arm.release_state_changed_callback(self._state_changed_callback)

        # Register count changed callback
        def _count_changed_callback(self, data):
            if self.is_alive:
                self.pprint('counter val: {}'.format(data['count']))

        def _check_code(self, code, label):
            if not self.is_alive or code != 0:
                self.alive = False
                ret1 = self._arm.get_state()
                ret2 = self._arm.get_err_warn_code()
                self.pprint('{}, code={}, connected={}, state={}, error={}, ret1={}. ret2={}'.format(label, code, self._arm.connected, self._arm.state, self._arm.error_code, ret1, ret2))
            return self.is_alive

        @staticmethod
        def pprint(*args, **kwargs):
            try:
                stack_tuple = traceback.extract_stack(limit=2)[0]
                print('[{}][{}] {}'.format(time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(time.time())), stack_tuple[1], ' '.join(map(str, args))))
            except:
                print(*args, **kwargs)

        @property
        def arm(self):
            return self._arm

        @property
        def VARS(self):
            return self._vars

        @property
        def FUNCS(self):
            return self._funcs

        @property
        def is_alive(self):
            if self.alive and self._arm.connected and self._arm.error_code == 0:
                if self._arm.state == 5:
                    cnt = 0
                    while self._arm.state == 5 and cnt < 5:
                        cnt += 1
                        time.sleep(0.1)
                return self._arm.state < 4
            else:
                return False

        def wide_pick(self):
            print('Opening camera...')
            vidcap = cv2.VideoCapture(0)
            while not vidcap.isOpened():
                print('Camera is not opened')
                time.sleep(1)
            print('Camera opened.')
            if "Model Path" not in inps["vars"]:
                writelog('Please specify a model path.')
                return
            try:
                model = YOLO(str(inps["vars"]["Model Path"]))
            except:
                writelog('The model cannot be loaded.')
                return
            print('Model loaded.')
            device = inps["vars"]["Device"]
            self._arm.open_lite6_gripper()
            time.sleep(0.8)
            self._arm.stop_lite6_gripper()

            tol = 5   # pixels
            scale = 0.3    # mm/px
            x_offset = 46   # mm
            y_offset = -5
            img_width, img_height = 640, 480
            scan_pos = [[170, -40, 180, 180.0, 0.0, 0.0], [170, 50, 180, 180.0, 0.0, 0.0], [290, 50, 180, 180.0, 0.0, 0.0], [290, -40, 180, 180.0, 0.0, 0.0]]

            while True:
                counter = 0
                for position in copy.deepcopy(scan_pos):
                    self._arm.set_position(*position, wait=True, speed=self._tcp_speed)
                    time.sleep(0.8)
                    ret, frame = vidcap.read()
                    if ret:
                        print('Image captured.\nRunning inference...')
                        results = model.predict(frame, conf=0.8, imgsz=640, device=device)
                        print('Inference completed.')
                    else:
                        print('Failed to capture image.')
                        continue
                    try:
                        result = results[0]
                    except:
                        print('No results from YOLO.')
                        continue

                    res_plotted = result.plot()
                    img = Image.fromarray(res_plotted)
                    img = img.resize((512,512))
                    b, g, r = img.split()
                    img = Image.merge("RGB", (r, g, b))
                    buf = io.BytesIO()
                    img.save(buf, format='PNG')
                    byte_im = buf.getvalue()
                    byte_im = base64.b64encode(byte_im).decode('utf-8')
                    byte_im = f"data:image/png;base64,{byte_im}"
                    # Data to be written
                    dictionary = {
                        "source":inps["output_node"],
                        "data":byte_im
                    }        
                    # Serializing json
                    json_object = json.dumps(dictionary, indent=4)
                    # Writing to sample.json
                    with open("../my-react-flow-app/sample.json", "w") as outfile:
                        outfile.write(json_object)

                    if result.masks is None:
                        print('No detections.')
                        continue
                    difference = []
                    ob_positions = []
                    for points in result.masks.xy:
                        center_x = (np.max(points[:, 0]) + np.min(points[:, 0])) / 2
                        center_y = (np.max(points[:, 1]) + np.min(points[:, 1])) / 2
                        difference_x = center_x - 0.5*img_width
                        difference_y = center_y - 0.5*img_height
                        difference.append(math.sqrt(difference_x**2 + difference_y**2))
                        distance_x = difference_x * scale
                        distance_y = difference_y * scale
                        ob_positions.append((position[0] - distance_y, position[1] - distance_x))
                    closest_index = difference.index(min(difference))
                    for i in range(len(ob_positions)):
                        if i == 0:
                            position[0] = ob_positions[closest_index][0]
                            position[1] = ob_positions[closest_index][1]
                        else:
                            position[0] = ob_positions[i-1][0]
                            position[1] = ob_positions[i-1][1]
                        position[2] = 180
                        position[5] = 0
                        self._arm.set_position(*position, wait=True, speed=self._tcp_speed)
                        while True:
                            time.sleep(0.8)
                            ret, frame = vidcap.read()
                            if ret:
                                print('Image captured.\nRunning inference...')
                                results = model.predict(frame, conf=0.8, imgsz=640, device=device)
                                print('Inference completed.')
                                try:
                                    result = results[0]
                                except:
                                    print('No results from YOLO.')
                                    continue

                                res_plotted = result.plot()
                                img = Image.fromarray(res_plotted)
                                img = img.resize((512,512))
                                b, g, r = img.split()
                                img = Image.merge("RGB", (r, g, b))
                                buf = io.BytesIO()
                                img.save(buf, format='PNG')
                                byte_im = buf.getvalue()
                                byte_im = base64.b64encode(byte_im).decode('utf-8')
                                byte_im = f"data:image/png;base64,{byte_im}"
                                # Data to be written
                                dictionary = {
                                    "source":inps["output_node"],
                                    "data":byte_im
                                }        
                                # Serializing json
                                json_object = json.dumps(dictionary, indent=4)
                                # Writing to sample.json
                                with open("../my-react-flow-app/sample.json", "w") as outfile:
                                    outfile.write(json_object)

                                if result.masks is None:
                                    print('No detections.')
                                    continue
                                difference, differences_x, differences_y = [], [], []
                                for points in result.masks.xy:
                                    center_x = (np.max(points[:, 0]) + np.min(points[:, 0])) / 2
                                    center_y = (np.max(points[:, 1]) + np.min(points[:, 1])) / 2
                                    differences_x.append(center_x - 0.5*img_width)
                                    differences_y.append(center_y - 0.5*img_height)
                                    difference.append(math.sqrt(differences_x[-1]**2 + differences_y[-1]**2))
                                closest_id = difference.index(min(difference))
                                difference_x = differences_x[closest_id]
                                difference_y = differences_y[closest_id]
                                if abs(difference_x) <= tol and abs(difference_y) <= tol:
                                    print('Target reached.')
                                    position[0] += x_offset
                                    position[1] += y_offset
                                    position[2] = 15.5
                                    points = result.masks.xy[closest_id]
                                    if np.max(points[:, 1]) - np.min(points[:, 1]) >= 110:    # at an angle
                                        p1 = points[np.argmin(points[:, 0])]
                                        p2 = points[np.argmin(points[:, 1])]
                                        angle = math.atan2(p1[1] - p2[1], p2[0] - p1[0])
                                        angle = math.degrees(angle)
                                        position[5] = angle if angle <= 45 else angle - 90
                                    self._arm.set_position(*position, wait=True, speed=self._tcp_speed)
                                    position[2] = -0.7
                                    self._arm.set_position(*position, wait=True, speed=self._tcp_speed)
                                    self._arm.close_lite6_gripper()
                                    time.sleep(0.8)
                                    position[2] = 135
                                    position[5] = 0
                                    self._arm.set_position(*position, wait=True, speed=self._tcp_speed)
                                    position = [107-48*(counter // 4), -153-48*(counter % 4), 135, 180, 0, 0]
                                    self._arm.set_position(*position, wait=True, speed=self._tcp_speed)
                                    position[2] = 89
                                    self._arm.set_position(*position, wait=True, speed=self._tcp_speed)
                                    self._arm.open_lite6_gripper()
                                    time.sleep(0.5)
                                    self._arm.stop_lite6_gripper()
                                    position[2] = 135
                                    self._arm.set_position(*position, wait=True, speed=self._tcp_speed)
                                    counter += 1
                                    break
                                else:
                                    print('Target not reached.')
                                    distance_x = difference_x * scale
                                    distance_y = difference_y * scale
                                    position[1] -= distance_x
                                    position[0] -= distance_y
                                    self._arm.set_position(*position, wait=True, speed=self._tcp_speed)
                            else:
                                print('Failed to capture image.')
                                continue
                        if i == 0:
                            del ob_positions[closest_index]
                position = [200, 25, 180, 180.0, 0.0, 0.0]
                self._arm.set_position(*position, speed=self._tcp_speed)
                self._arm.move_gohome(speed=100, wait=True)
                if "Time interval between runs (s)" in inps["vars"]:
                    time.sleep(int(inps["vars"]["Time interval between runs (s)"]))
                else:
                    break

        # Robot Main Run
        def run(self):
            try:
                self._arm.set_tcp_offset([0, 0, 83.6, 0, 0, 0], wait=True)
                self._arm.set_collision_sensitivity(5)
                self._arm.set_state(0)
                self._arm.move_gohome(speed=50)
                self.wide_pick()
            except Exception as e:
                self.pprint('MainException: {}'.format(e))
            self.alive = False
            self._arm.release_error_warn_changed_callback(self._error_warn_changed_callback)
            self._arm.release_state_changed_callback(self._state_changed_callback)
            if hasattr(self._arm, 'release_count_changed_callback'):
                self._arm.release_count_changed_callback(self._count_changed_callback)

    if "prev_node" not in inps or "CameraVideoInput" not in inps["prev_node"]:
        writelog("Please add a Camera Video Input node before this node.")
        return {}
    RobotMain.pprint('xArm-Python-SDK Version:{}'.format(version.__version__))
    arm = XArmAPI('192.168.4.154', baud_checkset=False)
    robot_main = RobotMain(arm)
    robot_main.run()
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
