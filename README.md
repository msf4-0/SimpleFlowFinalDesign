# SimpleFlow
A simple to use node-based GUI for creating multipurpose flows, such as those for training models to perform computer vision tasks.

<a href="alternative text"><img src="https://github.com/simpleflowgui/SimpleFlow/blob/main/simpleflow.png" align="middle" width="800" height="400"></a>

# Installation
## 1. Install Node.js and npm

(Linux)
```code
sudo apt update
sudo apt install Node.js
sudo apt install npm
```

(Windows)

Download and install https://nodejs.org/en/download

## 2. Install Python and pip

(Linux)
```code
sudo apt update
sudo apt-get install python3
sudo apt-get install python3-pip python-dev
```

(Windows)

Download and install https://www.python.org/downloads/windows/

## 3. Install Git
(Linux)
```code
sudo apt-get install git
```

(Windows)

Download and install https://git-scm.com/download/win

## 4. Clone xArm-Python-SDK github repository
Run the following command:
```code
git clone https://github.com/xArm-Developer/xArm-Python-SDK.git
cd xArm-Python-SDK
python setup.py install
cd ..
```

## 5. Clone SimpleFlow github repository

In cmd on Windows or Terminal on Linux:

```code
git clone https://github.com/simpleflowgui/SimpleFlow
```

## 5. Create a new React project using Vite
```code
cd SimpleFlow
npm create vite@latest my-react-flow-app -- --template react
npm install reactflow --force
cd my-react-flow-app
npm install
```

## 6. Run the setup file

(Linux)
```code
cd ..
sudo chmod +x setup.sh
./setup.sh
```

(Windows)
```code
cd ..
setup.cmd
```

## 7. Run the install file (Windows only)
If you have a CUDA-capable GPU, you can install the GPU version of PyTorch. You can verify that you have a CUDA-capable GPU through the Display Adapters section in the Windows Device Manager. Here you will find the vendor name and model of your graphics card(s). If you have an NVIDIA card that is listed in https://developer.nvidia.com/cuda-gpus, that GPU is CUDA-capable. To install the GPU version of PyTorch along with other packages, run the following command:
```code
install_gpu.cmd
```

Otherwise, install the CPU version of PyTorch along with other packages:
```code
install.cmd
```


## 8. Run SimpleFlow
(Linux)
```code
simpleflow
```

(Windows)
In cmd in SimpleFlow directory paste the following:

```code
simpleflow.cmd
```

or double-click on simpleflow.cmd file


# Docs

For all nodes guide [Nodes Guide](https://simpleflowgui.github.io/nodes)

For creating your first flow [Flow Guide](https://simpleflowgui.github.io/flow)

For how to get started with MQTT [MQTT Guide](https://simpleflowgui.github.io/mqtt)

For how to create a custom library [Custom Library Guide](https://simpleflowgui.github.io/custom)

For tutorial videos [Simple Flow Youtube Channel](https://youtube.com/@SimpleFlow-pr6vy?si=D2S3IpeaQFZu_bFT)




