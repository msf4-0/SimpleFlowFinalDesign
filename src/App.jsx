import React, { useState, useRef, useCallback, useEffect } from "react";
import logo from "./simpleflow.png";
import ReactFlow, {
  Background,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  Controls,
  Handle,
  Position,
  internalsSymbol,
} from "reactflow";
import "reactflow/dist/style.css";
import ConnectionLine from "./ConnectionLine";
import OutputImageNode, {
  CameraVideoInput,
  StartNode,
  EndNode,
  CustomNode,
  SelectCamera,
  Loop,
} from "./Nodes.jsx";
import Sidebar from "./Sidebar";
import "./index.css";

//For camera stream predictions
var stopflag = true;
var YOLOtrainflag = false;
var dataflag = false;
var stopped = false;
var loopflag = false;
var loadednodes = false;
var prevout = {};

const flowKey = "example-flow";

const rfStyle = {
  backgroundColor: "#eee",
};
const initialNodes = [{}];
/*
const initialNodes = [
  { id: 'start_0', type: 'Start', position: { x: 0, y: 0 }, data: { label: 'Start node',id:0} },
];*/
const nodeTypes = {
  Start: StartNode,
  End: EndNode,
  OutImage: OutputImageNode,
  CameraVideoInput: CameraVideoInput,
  SelectCamera: SelectCamera,
  Loop: Loop,
  CustomNode: CustomNode,
};
let id = 0;
const getId = (type) => `${type}_${id++}`;
const getIdStart = () => `start_${id++}`;

//Execute Button
const ExecButton = (props) => {
  return (
    <div id="exec" className="exec" onClick={props.doIt}>
      <div>
        <i
          class="bi bi-play-circle"
          style={{
            color: "black",
            fontSize: "2vw",
          }}
        ></i>
      </div>
    </div>
  );
};

//Stop Button
const StopButton = (props) => {
  return (
    <div id="stop" className="stop" onClick={props.dontIt}>
      <div>
        <i
          class="bi bi-stop-circle"
          style={{
            color: "black",
            fontSize: "2vw",
          }}
        ></i>
      </div>
    </div>
  );
};

//Save fLOW Button
const SaveFlowButton = (props) => {
  return (
    <div id="sf" className="sf" onClick={props.saveit}>
      <div>
        <i
          class="bi bi-floppy"
          style={{
            color: "black",
            fontSize: "2vw",
          }}
        ></i>
      </div>
    </div>
  );
};

//load fLOW Button
const LoadFlowButton = (props) => {
  return (
    <div id="lf" className="lf" onClick={props.loadit}>
      <div>
        <i
          class="bi bi-box-arrow-in-down"
          style={{
            color: "black",
            fontSize: "2vw",
          }}
        ></i>
      </div>
    </div>
  );
};

var drawerlvl = 0;
var drawerout = false;
var flag = true;
var customnodes = [];
var methods = {};
var colors = {};
var els = {
  Basic: [
    ["Start", "Start"],
    ["OutImage", "Output Image"],
    ["End", "End"],
    ["Loop", "Loop"],
    ["CameraVideoInput", "Camera Video Input"],
    ["SelectCamera", "Select Camera"],
  ],
};
var hide = false;
function slide2() {
  /* this one is to have the option to close the drawers to provide better vision */
  if (hide) {
    document.getElementById("exec").style.animation =
      "slideoutbuttongreen 1s forwards";
    document.getElementById("stop").style.animation =
      "slideoutbuttonred 1s forwards";
    document.getElementById("sf").style.animation =
      "slideoutbuttonsf 1s forwards";
    document.getElementById("lf").style.animation =
      "slideoutbuttonlf 1s forwards";
    document.getElementById("log").style.animation =
      "slideoutbuttonlog 1s forwards";
    hide = false;
  } else {
    document.getElementById("exec").style.animation =
      "slideinbuttongreen 1s forwards";
    document.getElementById("stop").style.animation =
      "slideinbuttonred 1s forwards";
    document.getElementById("sf").style.animation =
      "slideinbuttonsf 1s forwards";
    document.getElementById("lf").style.animation =
      "slideinbuttonlf 1s forwards";
    document.getElementById("log").style.animation =
      "slideinbuttonlog 1s forwards";
    hide = true;
    console.log("hide");
  }
}

var selectedlibrary = "";
function slide() {
  if (drawerout) {
    if (drawerlvl == 1) {
      document.getElementById("aside").offsetHeight;
      document.getElementById("aside").style.animation =
        "slideinp1 1s forwards";
    } else if (drawerlvl == 2) {
      document.getElementById("aside").offsetHeight;
      document.getElementById("aside").style.animation =
        "slideinpall 1s forwards";
      document.getElementById(selectedlibrary).style.animation =
        "librarydeselect 1s forwards";
      document.getElementById(selectedlibrary + "ribbon").style.animation =
        "librarydeselect 1s forwards";
      selectedlibrary = "";
    }
    document.getElementById("exec").style.animation =
      "slideoutbuttongreen 1s forwards";
    document.getElementById("stop").style.animation =
      "slideoutbuttonred 1s forwards";
    document.getElementById("sf").style.animation =
      "slideoutbuttonsf 1s forwards";
    document.getElementById("lf").style.animation =
      "slideoutbuttonlf 1s forwards";
    document.getElementById("log").style.animation =
      "slideoutbuttonlog 1s forwards";
    drawerout = !drawerout;
    drawerlvl = 0;
    console.log("siu");
  } else {
    if (closed == 0) {
      document.getElementById("aside").style.animation =
        "slideoutp1 1s forwards";
      document.getElementById("exec").style.animation =
        "slideinbuttongreen 1s forwards";
      document.getElementById("stop").style.animation =
        "slideinbuttonred 1s forwards";
      document.getElementById("sf").style.animation =
        "slideinbuttonsf 1s forwards";
      document.getElementById("lf").style.animation =
        "slideinbuttonlf 1s forwards";
      document.getElementById("log").style.animation =
        "slideinbuttonlog 1s forwards";
      drawerout = !drawerout;
      drawerlvl = 1;
    }
  }
}
//############################################################

function Flow() {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  var executionflag = false;

  function destroyelements(id) {
    let childs = document.getElementById(id);
    while (childs.firstChild) {
      childs.removeChild(childs.lastChild);
    }
    document.getElementById(id).remove();
  }

  function popupclose() {
    document.getElementById("blur").style.visibility = "hidden";
    document.getElementById("popup").style.animation =
      "popupout 0.25s forwards";
    setTimeout(() => {
      document.getElementById("popup").style.visibility = "hidden";
    }, 250);
    var els = document.getElementsByClassName("dndflow")[0].children;
    for (let j = 10; j >= 0; j--) {
      for (let i = 0; i < els.length; i++) {
        setTimeout(() => {
          if (els[i].id != "popup") {
            els[i].style.filter = "blur(" + j * 0.2 + "px)";
          }
        }, 100);
      }
    }
    destroyelements("contpopup");
  }

  const saveflowroute = useCallback(() => {
    if (reactFlowInstance) {
      const flow = reactFlowInstance.toObject();
      var flowobj = { flowKey: JSON.stringify(flow) };
      document.getElementById("blur").style.visibility = "visible";
      document.getElementById("popup").style.visibility = "visible";
      document.getElementById("popup").style.animation =
        "popupin 0.25s forwards";
      var els = document.getElementsByClassName("dndflow")[0].children;
      for (let j = 0; j < 10; j++) {
        for (let i = 0; i < els.length; i++) {
          setTimeout(() => {
            if (els[i].id != "popup") {
              els[i].style.filter = "blur(" + j * 0.2 + "px)";
            }
          }, 100);
        }
      }
      /* parent div */
      var newel = document.createElement("div");
      newel.id = "contpopup";
      newel.style.display = "flex";
      newel.style.flexDirection = "column";
      newel.style.borderRadius = "15px";
      document.getElementById("popup").style.height = "32%";
      document.getElementById("popup").style.width = "40%";
      document.getElementById("popup").append(newel);

      /* title */
      var title = document.createElement("div");
      title.id = "titlepopup";
      title.style.backgroundColor = "#808080";
      title.style.color = "white";
      title.style.borderRadius = "5px 5px 0px 0px";
      title.style.textAlign = "center";
      title.style.border = "none";

      /*the title text*/
      newel = document.createElement("div");
      newel.id = "titletext";
      newel.innerHTML = "Save Flow";
      newel.style.marginTop = "10px";
      newel.style.marginBottom = "10px";
      newel.style.color = "white";
      newel.style.fontFamily = "DM Serif Display, sans-serif";
      newel.style.fontSize = "2.5vw";
      title.append(newel);

      document.getElementById("contpopup").append(title);
      /* the name of the field */
      var field = document.createElement("div");
      field.id = "fieldname";
      field.style.display = "flex";
      field.style.flexDirection = "row";
      field.style.justifyContent = "center";
      field.style.alignItems = "center";
      field.style.position = "absolute";
      field.style.top = "49%";
      field.style.left = "0%";
      field.style.width = "100%";

      newel = document.createElement("div");
      newel.id = "inputlabel";
      newel.innerHTML = "Enter Flow Name: ";
      newel.style.backgroundColor = "#3C4048";
      newel.style.fontSize = "1.4vw";
      newel.style.color = "white";
      newel.style.fontFamily = "Noto Sans, sans-serif";
      newel.style.fontWeight = "300";
      newel.style.width = "30%";
      newel.style.marginRight = "3%";
      field.append(newel);

      /* the input field */
      newel = document.createElement("input");
      newel.id = "inputname";
      newel.style.width = "50%";
      newel.style.height = "10%";
      newel.style.fontSize = "20px";
      newel.style.color = "white";
      newel.style.backgroundColor = "#616675";
      newel.style.border = "none";
      newel.style.boxShadow = "2px 2px 2px grey";
      newel.style.borderRadius = "0px";

      field.append(newel);
      document.getElementById("contpopup").append(field);

      /* the container for the submit and close buttons */
      var container_close_save = document.createElement("div");
      container_close_save.id = "container";
      container_close_save.style.display = "flex";
      container_close_save.style.flexDirection = "row";
      container_close_save.style.justifyContent = "space-between";
      container_close_save.style.justifyContent = "center";
      container_close_save.style.marginTop = "20px";

      /* the submit button */
      var submit = document.createElement("div");
      submit.id = "submitpopup";
      submit.className = "defaultbutton";
      submit.style.backgroundColor = "#616675";
      submit.style.position = "absolute";
      submit.style.fontSize = "18px";
      submit.style.color = "white";
      submit.style.display = "flex";
      submit.style.alignSelf = "center";
      submit.style.top = "82%";
      submit.style.left = "25%";
      submit.style.borderRadius = "5px";

      /*the submit text*/
      newel = document.createElement("div");
      newel.id = "submittext";
      newel.innerHTML = "Save";
      newel.style.color = "white";
      newel.style.fontSize = "1vw";
      submit.append(newel);

      /*the close button*/
      var close = document.createElement("div");
      close.id = "closepopup";
      close.className = "defaultbutton";
      close.style.backgroundColor = "#616675";
      close.style.fontSize = "18px";
      close.style.color = "white";
      close.style.display = "flex";
      close.style.cursor = "pointer";
      close.style.position = "absolute";
      close.style.top = "82%";
      close.style.right = "25%";
      close.style.borderRadius = "5px";

      /*the close text*/
      newel = document.createElement("div");
      newel.id = "submittext";
      newel.innerHTML = "Close";
      newel.style.fontSize = "1vw";
      newel.style.cursor = "pointer";
      newel.style.color = "white";
      close.append(newel);

      container_close_save.append(submit, close);
      document.getElementById("contpopup").append(container_close_save);

      submit.onclick = function () {
        var filename = document.getElementById("inputname").value;
        popupclose();
        saveflow(flowobj, filename);
      };
      close.onclick = function () {
        popupclose();
      };
    }
  }, [reactFlowInstance]);

  const onRestore = useCallback(
    (json) => {
      const restoreFlow = async () => {
        const flow = JSON.parse(json["flowKey"]);
        if (flow) {
          setNodes([]);
          setEdges([]);
          setTimeout(() => {
            setNodes(flow.nodes || []);
            setEdges(flow.edges || []);
          }, 100);
        }
      };
      restoreFlow();
    },
    [setNodes]
  );

  function GetImageData() {
    try {
      fetch("./sample.json")
        .then((response) => response.json())
        .then((json) => {
          try {
            document.getElementById("image_" + json["source"]).src =
              json["data"];
          } catch (error) {
            console.log(error);
          }
        });
      if (dataflag) {
        requestAnimationFrame(GetImageData);
      }
    } catch (error) {}
  }

  function PrintYOLOTrainOutput() {
    try {
      fetch("./YOLOtrain.txt")
        .then((response) => response.text())
        .then((text) => {
          if (true) {
            text = String(text);
            var lines = text.split("\r");
            document.getElementById("log").innerHTML = "";
            var out = "";
            for (let i = 0; i < lines.length; i++) {
              out += "<pre>" + lines[i] + "\n" + "</pre>";
            }
            document.getElementById("log").innerHTML = out;
          }
        });
    } catch (error) {}
    if (YOLOtrainflag) {
      requestAnimationFrame(PrintYOLOTrainOutput);
    } else {
      readlog();
    }
  }
  function handleTransfer() {
    fetch("http://localhost:5000/clearlog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: null,
    }).then((response) => response.json());
    executionflag = true;
    readlog();
    var inps = {};
    for (var i = 0; i < Object.keys(nodes).length; i++) {
      inps[nodes[i]["data"]["id"]] = nodes[i]["data"]["inps"];
      /*
      if(nodes[i]["data"]["id"].includes("CameraVideoInput")){
        stopflag = false;
      }*/
      if (nodes[i]["data"]["id"].includes("CameraVideoInput")) {
        dataflag = true;
        GetImageData();
      }
      if (nodes[i]["data"]["id"].includes("CustomNode")) {
        if (nodes[i]["data"]["custom_node"]["name"].includes("Train_YOLO")) {
          YOLOtrainflag = true;
          PrintYOLOTrainOutput();
        }
      }
      var edges_in = "";
      if (nodes[i]["data"]["id"].includes("Loop") && loopflag) {
        var newedges = {};
        var prevloop = "";
        var lastnode = "";
        var sources = [];
        for (let n = 0; n < Object.keys(edges).length; n++) {
          if (edges[n]["source"].includes("Loop")) {
            newedges[n] = edges[n];
            prevloop = edges[n]["target"];
          }
        }
        while (lastnode != prevloop) {
          let prevprev = prevloop;
          for (let n = 0; n < Object.keys(edges).length; n++) {
            if (edges[n]["source"] == prevloop) {
              if (!edges[n]["target"].includes("OutImage")) {
                newedges[n] = edges[n];
                prevloop = edges[n]["target"];
                sources.push(edges[n]["source"]);
              }
            }
          }
          if (prevloop == prevprev) {
            lastnode = prevloop;
          }
        }
        for (let n = 0; n < Object.keys(edges).length; n++) {
          if (
            edges[n]["target"].includes("OutImage") &&
            sources.includes(edges[n]["source"])
          ) {
            newedges[n] = edges[n];
          }
        }
        edges_in = newedges;
        var loopout = prevout;
      } else {
        edges_in = edges;
        var loopout = {};
      }
    }
    if (loopflag) {
      fetch("http://localhost:5000/communicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          edges: newedges,
          inps: inps,
          loopout: loopout,
          lf: "loop",
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          function resultout() {
            prevout = data;
            var nodes_out = Object.keys(data);
            for (let i = 0; i < nodes_out.length; i++) {
              if (
                data[nodes_out[i]]["outimagenode"] &&
                data[nodes_out[i]]["outimagenode"] != ""
              ) {
                document.getElementById(
                  "image_" + data[nodes_out[i]]["outimagenode"]
                ).src = data[nodes_out[i]]["data"];
              }
            }
            YOLOtrainflag = false;
            executionflag = false;
            for (var i = 0; i < Object.keys(nodes).length; i++) {
              if (nodes[i]["data"]["id"].includes("Loop") && !stopped) {
                loopflag = true;
              }
            }
            /*
          if(!(stopflag)){
            handleTransfer();
          }
          */
            if (loopflag) {
              handleTransfer();
            }
          }
          function executeresults() {
            if (data) {
              resultout();
            } else {
              setTimeout(() => {
                executeresults();
              }, 100);
            }
          }
          executeresults();
        });
    } else {
      fetch("http://localhost:5000/communicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          edges: edges,
          inps: inps,
          loopout: loopout,
          lf: "",
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          function resultout() {
            prevout = data;
            var nodes_out = Object.keys(data);
            for (let i = 0; i < nodes_out.length; i++) {
              if (
                data[nodes_out[i]]["outimagenode"] &&
                data[nodes_out[i]]["outimagenode"] != ""
              ) {
                document.getElementById(
                  "image_" + data[nodes_out[i]]["outimagenode"]
                ).src = data[nodes_out[i]]["data"];
              }
            }
            executionflag = false;
            YOLOtrainflag = false;
            for (var i = 0; i < Object.keys(nodes).length; i++) {
              if (nodes[i]["data"]["id"].includes("Loop") && !stopped) {
                loopflag = true;
              }
            }
            if (!stopflag) {
              handleTransfer();
            }
            if (loopflag) {
              handleTransfer();
            }
          }
          function executeresults() {
            if (data) {
              resultout();
            } else {
              setTimeout(() => {
                executeresults();
              }, 100);
            }
          }
          executeresults();
        });
    }
  }

  function savelibrary(lib, imports, text, inputmethods, colors) {
    fetch("http://localhost:5000/savelibrary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        library: lib,
        imports: imports,
        text: text,
        methods: inputmethods,
        colors: colors,
      }),
    })
      .then((response) => response.json())
      .then((data) => {});
    document.getElementById("blur").style.visibility = "hidden";
    document.getElementById("popup").style.animation =
      "popupout 0.25s forwards";
    setTimeout(() => {
      document.getElementById("popup").style.visibility = "hidden";
    }, 250);
    var els = document.getElementsByClassName("dndflow")[0].children;
    for (let j = 10; j >= 0; j--) {
      for (let i = 0; i < els.length; i++) {
        setTimeout(() => {
          if (els[i].id != "popup") {
            els[i].style.filter = "blur(" + j * 0.2 + "px)";
          }
        }, 100);
      }
    }
    destroyelements("contpopup");
  }

  function spawncreatescreen() {
    var methods = {};
    var allinputs = {};
    var nodename = "";
    var color = "";
    var colors = {};
    document.getElementById("blur").style.visibility = "visible";
    document.getElementById("popupspawn").style.visibility = "visible";
    document.getElementById("popupspawn").style.animation =
      "popupin 0.25s forwards";
    var els = document.getElementsByClassName("dndflow")[0].children;
    for (let j = 0; j < 10; j++) {
      for (let i = 0; i < els.length; i++) {
        setTimeout(() => {
          if (els[i].id != "popupspawn") {
            els[i].style.filter = "blur(" + j * 0.2 + "px)";
          }
        }, 100);
      }
    }

    /* parent div */
    var newel = document.createElement("div");
    newel.id = "contpopup";
    newel.style.display = "flex";
    newel.style.backgroundColor = "#3C4048";
    document.getElementById("popupspawn").append(newel);

    /* close button */
    newel = document.createElement("div");
    newel.id = "closewindow";
    newel.innerHTML = "Close";
    newel.style.fontSize = "1vw";
    newel.style.backgroundColor = "#616675";
    newel.style.position = "absolute";
    newel.className = "defaultbutton";
    newel.style.top = "92%";
    newel.style.left = "5%";
    newel.onclick = function () {
      document.getElementById("blur").style.visibility = "hidden";
      document.getElementById("popupspawn").style.animation =
        "popupout 0.25s forwards";
      setTimeout(() => {
        document.getElementById("popupspawn").style.visibility = "hidden";
      }, 250);
      var els = document.getElementsByClassName("dndflow")[0].children;
      for (let j = 10; j >= 0; j--) {
        for (let i = 0; i < els.length; i++) {
          setTimeout(() => {
            if (els[i].id != "popupspawn") {
              els[i].style.filter = "blur(" + j * 0.2 + "px)";
            }
          }, 100);
        }
      }
      destroyelements("contpopup");
    };
    document.getElementById("contpopup").append(newel);
    /* Create button */
    newel = document.createElement("div");
    newel.id = "contpopupcreate";
    newel.className = "defaultbutton";
    newel.innerHTML = "Create";
    newel.style.position = "absolute";
    newel.style.top = "92%";
    newel.style.right = "5%";
    newel.style.fontSize = "1vw";
    newel.addEventListener("click", function () {
      if (document.getElementById("contpopupnodecode")) {
        let lib = document.getElementById("contpopuplibname").value;
        let text = document.getElementById("contpopupnodecode").value;
        let imports = document.getElementById("contpopupnodeimports").value;
        savelibrary(lib, imports, text, methods, colors);
      } else {
        /* the right side of the popout */
        methods[nodename] = allinputs;
        colors[nodename] = color;
        document.getElementById("contpopupadd").remove();
        document.getElementById("contpopupcont3").remove();

        /* Import label */
        newel = document.createElement("div");
        newel.id = "contpopupnodeimportslabel";
        newel.className = "defaultlabel";
        newel.innerHTML = "Imports";
        newel.style.left = "50%";
        newel.style.top = "29%";
        document.getElementById("contpopup").append(newel);
        /* Import text area */
        newel = document.createElement("textarea");
        newel.id = "contpopupnodeimports";
        newel.style.resize = "none";
        newel.style.overflowY = "scroll";
        newel.rows = 5;
        newel.cols = 40;
        newel.style.position = "absolute";
        newel.style.border = "1px solid black";
        newel.style.left = "50%";
        newel.style.top = "34%";
        newel.style.width = "45%";
        newel.style.height = "22.75%";
        newel.style.backgroundColor = "#616675";
        document.getElementById("contpopup").append(newel);

        /* Code interface */
        newel = document.createElement("div");
        newel.id = "contpopupnodecodelabel";
        newel.className = "defaultlabel";
        newel.innerHTML = "Node Function";
        newel.style.left = "50%";
        newel.style.top = "60%";
        document.getElementById("contpopup").append(newel);
        /* Code text area */
        newel = document.createElement("textarea");
        newel.id = "contpopupnodecode";
        newel.style.resize = "none";
        newel.style.overflowY = "scroll";
        newel.rows = 10;
        newel.cols = 40;
        newel.style.position = "absolute";
        newel.style.border = "1px solid black";
        newel.style.left = "50%";
        newel.style.top = "65.3%";
        newel.style.width = "45%";
        newel.style.height = "22.75%";
        newel.style.backgroundColor = "#616675";
        document.getElementById("contpopup").append(newel);

        document.getElementById("contpopupnodevarslabel").remove();
        document.getElementById("contpopupcreate").style.right = "5%";
        document.getElementById("contpopupcreate").innerHTML = "Create";
      }
    });
    document.getElementById("contpopup").append(newel);

    /* Enter Library Name */
    newel = document.createElement("div");
    newel.id = "contpopuplibnamelabel";
    newel.className = "defaultlabel";
    newel.innerHTML = "Enter Library Name";
    newel.style.left = "5%";
    newel.style.top = "4%";
    newel.style.width = "40%";
    newel.style.marginRight = "10px";
    document.getElementById("contpopup").append(newel);

    /* Library Name Input */
    newel = document.createElement("input");
    newel.id = "contpopuplibname";
    newel.className = "defaultinput";
    newel.type = "text";
    newel.style.width = "55%";
    newel.style.left = "40%";
    newel.style.top = "4%";
    document.getElementById("contpopup").append(newel);

    /* Paste Imports Label */
    newel = document.createElement("p");
    newel.id = "contpopupnodeimportslabel";
    newel.className = "defaultlabel";
    newel.innerHTML = "Imports";
    newel.style.left = "50%";
    newel.style.top = "25%";
    document.getElementById("contpopup").append(newel);

    /* Paste Imports Text Area */
    newel = document.createElement("textarea");
    newel.id = "contpopupnodeimports";
    newel.style.resize = "none";
    newel.style.overflowY = "scroll";
    newel.rows = 5;
    newel.cols = 40;
    newel.style.position = "absolute";
    newel.style.border = "1px solid black";
    newel.style.left = "50%";
    newel.style.top = "34%";
    newel.style.width = "45%";
    newel.style.height = "22.75%";
    newel.style.backgroundColor = "#616675";
    document.getElementById("contpopup").append(newel);

    /* Paste Node Function Code Label */
    newel = document.createElement("div");
    newel.id = "contpopupnodecodelabel";
    newel.className = "defaultlabel";
    newel.innerHTML = "Node Function";
    newel.style.left = "50%";
    newel.style.top = "60%";
    document.getElementById("contpopup").append(newel);

    /* Paste Node Function Code Text Area */
    newel = document.createElement("textarea");
    newel.id = "contpopupnodecode";
    newel.style.resize = "none";
    newel.style.overflowY = "scroll";
    newel.rows = 10;
    newel.cols = 40;
    newel.style.position = "absolute";
    newel.style.border = "1px solid black";
    newel.style.left = "50%";
    newel.style.top = "65.3%";
    newel.style.width = "45%";
    newel.style.height = "22.75%";
    newel.style.backgroundColor = "#616675";
    document.getElementById("contpopup").append(newel);

    /* Node Name Enter Label */
    newel = document.createElement("div");
    newel.id = "contpopupnodeaddmethodslabel";
    newel.className = "defaultlabel";
    newel.innerHTML = "Enter Node Name";
    newel.style.left = "5%";
    newel.style.top = "14%";
    newel.style.width = "40%";
    newel.style.marginRight = "10px";
    document.getElementById("contpopup").append(newel);

    /* Node Name Enter Input */
    newel = document.createElement("input");
    newel.id = "contpopupnodeaddmethods";
    newel.className = "defaultinput";
    newel.type = "text";
    newel.style.width = "55.4%";
    newel.style.left = "40%";
    newel.style.top = "14%";
    newel.addEventListener("change", function () {
      let node = document.createElement("p");
      node.id = "node_" + this.value;
      node.innerHTML = this.value;
      node.className = "defaultlabel";
      node.style.marginLeft = "10px";
      node.style.cursor = "pointer";
      node.style.width = "150px";
      node.style.position = "relative";
      node.addEventListener("click", function () {
        let elemcolor = document.createElement("input");
        elemcolor.id = "nodecolor";
        elemcolor.type = "color";
        if (color != "") {
          elemcolor.value = color;
        }
        elemcolor.style.position = "absolute";
        elemcolor.style.top = "2%";
        elemcolor.style.left = "88%";
        elemcolor.style.width = "30px";
        elemcolor.style.height = "25px";
        elemcolor.addEventListener("change", function () {
          color = this.value;
        });
        setTimeout(() => {
          document.getElementById("contpopupcont3").append(elemcolor);
        }, 100);
        if (nodename != "") {
          colors[nodename] = color;
          methods[nodename] = allinputs;
          allinputs = {};
        }
        nodename = this.innerHTML;
        if (methods[nodename]) {
          allinputs = methods[nodename];
        }
        let childs = document.getElementById("contpopupcont2");
        while (childs.firstChild) {
          childs.removeChild(childs.lastChild);
        }
        for (let x = 0; x < Object.keys(allinputs).length; x++) {
          newel = document.createElement("p");
          newel.id = "var_" + allinputs[x][1];
          newel.innerHTML = allinputs[x][1];
          newel.style.width =
            document.getElementById("contpopupcont2").style.width;
          newel.style.marginLeft = "10px";
          newel.addEventListener("click", function () {
            this.remove();
            for (let y = 0; y < Object.keys(allinputs).length; y++) {
              if (allinputs[y][1] == this.innerHTML) {
                delete allinputs[y];
              }
              break;
            }
          });
          document.getElementById("contpopupcont2").append(newel);
        }
        if (document.getElementById("contpopupnodecode")) {
          document.getElementById("contpopupnodecode").remove();
          document.getElementById("contpopupnodecodelabel").remove();
          document.getElementById("contpopupnodeimports").remove();
          document.getElementById("contpopupnodeimportslabel").remove();

          /* the title for the right side input which changes after clicking the item in the list */
          newel = document.createElement("p");
          newel.id = "contpopupnodevarslabel";
          newel.className = "defaultlabel";
          newel.innerHTML = "Node Input Variables";
          newel.style.left = "50%";
          newel.style.top = "25%";
          document.getElementById("contpopup").append(newel);

          /* the button to go back to the previous right side*/
          document.getElementById("contpopupcreate").style.right = "24%";
          document.getElementById("contpopupcreate").innerHTML = "Back";
          let newelem = document.createElement("div");
          newelem.id = "contpopupadd";
          newelem.className = "defaultbutton";
          newelem.innerHTML = "Add";
          newelem.style.position = "absolute";
          newelem.style.right = "5%";
          newelem.style.top = "92%";
          newelem.style.zIndex = "3";
          newelem.style.paddingLeft = "13.5px";
          newelem.style.paddingRight = "13.5px";
          newelem.style.backgroundColor = "#616675";
          newelem.addEventListener("click", function () {
            if (document.getElementById("contpopupcont3select").value != "") {
              let numkeys = Object.keys(allinputs).length;
              if (
                document.getElementById("contpopupcont3select").value == "text"
              ) {
                allinputs[numkeys] = [
                  document.getElementById("contpopupcont3select").value,
                  document.getElementById("contpopupcont3varname").value,
                ];
              } else if (
                document.getElementById("contpopupcont3select").value == "file"
              ) {
                allinputs[numkeys] = [
                  document.getElementById("contpopupcont3select").value,
                  document.getElementById("contpopupcont3varname").value,
                  document.getElementById("contpopupcont3folderfile").value,
                ];
              } else if (
                document.getElementById("contpopupcont3select").value ==
                "selectdynamic"
              ) {
                let obj = document.getElementById(
                  "contpopupcont3optionaldynamic"
                ).value;
                allinputs[numkeys] = [
                  "select",
                  document.getElementById("contpopupcont3varname").value,
                  obj,
                ];
                if (
                  document.getElementById("contpopupcont3changedynamic")
                    .value != ""
                ) {
                  allinputs[numkeys].push(
                    document.getElementById("contpopupcont3changedynamic").value
                  );
                }
              } else if (
                document.getElementById("contpopupcont3select").value ==
                "filedynamic"
              ) {
                let obj = document.getElementById(
                  "contpopupcont3filedynamic"
                ).value;
                allinputs[numkeys] = [
                  "file",
                  document.getElementById("contpopupcont3varname").value,
                  obj,
                ];
              } else if (
                document.getElementById("contpopupcont3select").value ==
                  "radio" ||
                document.getElementById("contpopupcont3select").value ==
                  "select"
              ) {
                if (
                  document.getElementById("contpopupcont3optional").value == ""
                ) {
                  let arr = [];
                  let childs =
                    document.getElementById("contpopupcont4").children;
                  for (let i = 0; i < childs.length; i++) {
                    arr.push(childs[i].innerHTML);
                  }
                  allinputs[numkeys] = [
                    document.getElementById("contpopupcont3select").value,
                    document.getElementById("contpopupcont3varname").value,
                    arr,
                  ];
                } else {
                  let arr = [];
                  let childs = document
                    .getElementById("contpopupcont3optional")
                    .value.split(",");
                  for (let i = 0; i < childs.length; i++) {
                    arr.push(childs[i]);
                  }
                  allinputs[numkeys] = [
                    document.getElementById("contpopupcont3select").value,
                    document.getElementById("contpopupcont3varname").value,
                    arr,
                  ];
                }
                if (
                  document.getElementById("contpopupcont3change").value != ""
                ) {
                  allinputs[numkeys].push(
                    document.getElementById("contpopupcont3change").value
                  );
                }
              }
              newel = document.createElement("p");
              newel.id =
                "var_" + document.getElementById("contpopupcont3varname").value;
              newel.innerHTML = document.getElementById(
                "contpopupcont3varname"
              ).value;
              newel.style.width =
                document.getElementById("contpopupcont2").style.width;
              newel.addEventListener("click", function () {
                this.remove();
                for (let y = 0; y < Object.keys(allinputs).length; y++) {
                  if (allinputs[y][1] == this.innerHTML) {
                    delete allinputs[y];
                  }
                  break;
                }
              });
              let flagadd = true;
              for (let x = 0; x < Object.keys(allinputs).length - 1; x++) {
                if (
                  allinputs[x][1] ==
                  document.getElementById("contpopupcont3varname").value
                ) {
                  flagadd = false;
                  break;
                }
              }
              if (flagadd) {
                document.getElementById("contpopupcont2").append(newel);
                document.getElementById("contpopupcont3varname").value = "";
              } else {
                delete allinputs[numkeys];
              }
            }
          });
          /* the container for the right popout */
          document.getElementById("contpopup").append(newelem);
          newel = document.createElement("div");
          newel.id = "contpopupcont3";
          newel.style.position = "absolute";
          newel.style.top = "34%";
          newel.style.left = "50%";
          newel.style.width = "45%";
          newel.style.height = "55%";
          newel.style.backgroundColor = "#616675";
          newel.style.overflowY = "scroll";
          newel.style.borderRadius = "5px";
          newel.className = "defaultscrollinvisible";
          document.getElementById("contpopup").append(newel);

          /* the first item at the right side */
          newel = document.createElement("div");
          newel.id = "contpopupcont3selectlabel";
          newel.className = "defaultlabel";
          newel.style.position = "absolute";
          newel.style.top = "8%";
          newel.style.left = "5%";
          newel.style.fontSize = "1vw";
          newel.innerHTML = "Input Type";
          document.getElementById("contpopupcont3").append(newel);

          /* dropdown list for the input variables */
          newel = document.createElement("select");
          newel.id = "contpopupcont3select";
          newel.className = "defaultselect";
          newel.style.position = "absolute";
          newel.style.top = "8.3%";
          newel.style.left = "40%";
          newel.style.width = "45%";
          newel.addEventListener("change", function () {
            if (this.value == "select" || this.value == "radio") {
              if (!document.getElementById("contpopupcont3choicenamelabel")) {
                newel = document.createElement("p");
                newel.id = "contpopupcont3changelabel";
                newel.className = "defaultlabel";
                newel.style.position = "absolute";
                newel.style.top = "28%";
                newel.style.left = "5%";
                newel.style.fontSize = "1vw";
                newel.style.padding = "0px";
                newel.innerHTML = "Change";
                document.getElementById("contpopupcont3").append(newel);
                newel = document.createElement("input");
                newel.id = "contpopupcont3change";
                newel.type = "text";
                newel.style.position = "absolute";
                newel.style.width = "42.5%";
                newel.style.left = "40%";
                newel.style.top = "32.6%";
                newel.style.borderRadius = "5px";
                document.getElementById("contpopupcont3").append(newel);
                newel = document.createElement("p");
                newel.id = "contpopupcont3choicenamelabel";
                newel.className = "defaultlabel";
                newel.style.position = "absolute";
                newel.style.top = "40%";
                newel.style.left = "5%";
                newel.style.fontSize = "1vw";
                newel.style.padding = "0px";
                newel.innerHTML = "Option Name";
                document.getElementById("contpopupcont3").append(newel);
                newel = document.createElement("input");
                newel.id = "contpopupcont3choicename";
                newel.type = "text";
                newel.style.position = "absolute";
                newel.style.left = "40%";
                newel.style.width = "42.5%";
                newel.style.top = "45%";
                newel.style.borderRadius = "5px";
                document.getElementById("contpopupcont3").append(newel);
                newel = document.createElement("div");
                newel.id = "contpopupcont4";
                newel.style.position = "absolute";
                newel.style.top = "55%";
                newel.style.left = "5%";
                newel.style.width = "90%";
                newel.style.height = "20%";
                newel.style.border = "2px solid black";
                newel.style.borderRadius = "5px";
                newel.style.overflowY = "scroll";
                newel.className = "defaultscrollinvisible";
                document.getElementById("contpopupcont3").append(newel);
                let el = document.createElement("div");
                el.id = "contadd";
                el.className = "contadd";
                el.style.position = "absolute";
                el.style.transform = "scale(0.5)";
                el.style.filter = "brightness(0%)";
                el.style.top = "55%";
                el.style.right = "3%";
                el.addEventListener("click", function () {
                  if (
                    document.getElementById("contpopupcont3choicename").value !=
                    ""
                  ) {
                    el = document.createElement("div");
                    el.style.width =
                      document.getElementById("contpopupcont4").style.width;
                    el.id =
                      "choice_" +
                      document.getElementById("contpopupcont3choicename").value;
                    el.innerHTML = document.getElementById(
                      "contpopupcont3choicename"
                    ).value;
                    document.getElementById("contpopupcont4").append(el);
                    document.getElementById("contpopupcont3choicename").value =
                      "";
                  }
                });
                document.getElementById("contpopupcont3").append(el);
                var newel = document.createElement("div");
                newel.className = "outtercircleadd";
                el.append(newel);
                newel = document.createElement("div");
                newel.className = "plusadd";
                el.append(newel);
                newel = document.createElement("p");
                newel.id = "contpopupcont3optionallabel";
                newel.className = "defaultlabel";
                newel.style.position = "absolute";
                newel.style.top = "72%";
                newel.style.left = "5%";
                newel.style.fontSize = "15px";
                newel.style.padding = "0px";
                newel.innerHTML = "Paste Options (Optional)";
                document.getElementById("contpopupcont3").append(newel);
                newel = document.createElement("textarea");
                newel.id = "contpopupcont3optional";
                newel.style.resize = "none";
                newel.style.overflowY = "scroll";
                newel.rows = 2;
                newel.cols = 40;
                newel.style.width = "90%";
                newel.style.height = "10%";
                newel.style.position = "absolute";
                newel.style.left = "5%";
                newel.style.top = "85%";
                document.getElementById("contpopupcont3").append(newel);
              }
            } else {
              if (document.getElementById("contpopupcont3choicenamelabel")) {
                document
                  .getElementById("contpopupcont3choicenamelabel")
                  .remove();
                document.getElementById("contpopupcont3choicename").remove();
                document.getElementById("contpopupcont4").remove();
                document.getElementById("contadd").remove();
                document.getElementById("contpopupcont3changelabel").remove();
                document.getElementById("contpopupcont3change").remove();
                document.getElementById("contpopupcont3optionallabel").remove();
                document.getElementById("contpopupcont3optional").remove();
              }
            }
            if (this.value == "file") {
              newel = document.createElement("p");
              newel.id = "contpopupcont3folderfilelabel";
              newel.innerHTML = "File/Folder";
              newel.style.position = "absolute";
              newel.style.fontSize = "1vw";
              newel.style.top = "28%";
              newel.style.left = "5%";
              newel.style.padding = "0px";
              newel.className = "defaultlabel";
              document.getElementById("contpopupcont3").append(newel);
              newel = document.createElement("select");
              newel.id = "contpopupcont3folderfile";
              newel.style.position = "absolute";
              newel.style.left = "40%";
              newel.style.top = "32.6%";
              newel.style.width = "45%";
              newel.style.height = "5.5%";
              newel.className = "defaultselect";
              document.getElementById("contpopupcont3").append(newel);
              let newelopt = document.createElement("option");
              newelopt.value = "Folder";
              newelopt.innerHTML = "Folder";
              document
                .getElementById("contpopupcont3folderfile")
                .append(newelopt);
              newelopt = document.createElement("option");
              newelopt.value = "File";
              newelopt.innerHTML = "File";
              document
                .getElementById("contpopupcont3folderfile")
                .append(newelopt);
            } else {
              if (document.getElementById("contpopupcont3folderfilelabel")) {
                document
                  .getElementById("contpopupcont3folderfilelabel")
                  .remove();
                document.getElementById("contpopupcont3folderfile").remove();
              }
            }
            if (this.value == "selectdynamic") {
              newel = document.createElement("p");
              newel.id = "contpopupcont3changelabeldynamic";
              newel.className = "defaultlabel";
              newel.style.position = "absolute";
              newel.style.top = "28%";
              newel.style.left = "5%";
              newel.style.fontSize = "1vw";
              newel.style.padding = "0px";
              newel.innerHTML = "Change";
              document.getElementById("contpopupcont3").append(newel);
              newel = document.createElement("input");
              newel.id = "contpopupcont3changedynamic";
              newel.type = "text";
              newel.style.position = "absolute";
              newel.style.left = "40%";
              newel.style.top = "32.6%";
              newel.style.borderRadius = "5px";
              newel.style.width = "42.5%";
              document.getElementById("contpopupcont3").append(newel);
              newel = document.createElement("p");
              newel.id = "contpopupcont3optionallabeldynamic";
              newel.className = "defaultlabel";
              newel.style.position = "absolute";
              newel.style.top = "40%";
              newel.style.left = "5%";
              newel.style.fontSize = "1vw";
              newel.style.padding = "0px";
              newel.innerHTML = "Paste Options as an Object";
              document.getElementById("contpopupcont3").append(newel);
              newel = document.createElement("textarea");
              newel.id = "contpopupcont3optionaldynamic";
              newel.style.resize = "none";
              newel.style.overflowY = "scroll";
              newel.rows = 5;
              newel.cols = 40;
              newel.style.position = "absolute";
              newel.style.left = "5%";
              newel.style.top = "53%";
              newel.style.width = "90%";
              document.getElementById("contpopupcont3").append(newel);
            } else {
              if (document.getElementById("contpopupcont3changelabeldynamic")) {
                document
                  .getElementById("contpopupcont3changelabeldynamic")
                  .remove();
                document.getElementById("contpopupcont3changedynamic").remove();
                document
                  .getElementById("contpopupcont3optionallabeldynamic")
                  .remove();
                document
                  .getElementById("contpopupcont3optionaldynamic")
                  .remove();
              }
            }
            if (this.value == "filedynamic") {
              newel = document.createElement("p");
              newel.id = "contpopupcont3filelabeldynamic";
              newel.className = "defaultlabel";
              newel.style.position = "absolute";
              newel.style.top = "28%";
              newel.style.left = "5%";
              newel.style.fontSize = "1vw";
              newel.style.padding = "0px";
              newel.innerHTML = "Paste Options as an Object";
              document.getElementById("contpopupcont3").append(newel);
              newel = document.createElement("textarea");
              newel.id = "contpopupcont3filedynamic";
              newel.style.resize = "none";
              newel.style.overflowY = "scroll";
              newel.rows = 5;
              newel.cols = 40;
              newel.style.position = "absolute";
              newel.style.left = "5%";
              newel.style.top = "40%";
              newel.style.width = "90%";
              document.getElementById("contpopupcont3").append(newel);
            } else {
              if (document.getElementById("contpopupcont3filedynamic")) {
                document.getElementById("contpopupcont3filedynamic").remove();
                document
                  .getElementById("contpopupcont3filelabeldynamic")
                  .remove();
              }
            }
          });
          document.getElementById("contpopupcont3").append(newel);
          let opts = [
            ["Text Input", "text"],
            ["File Input", "file"],
            ["Radio Input", "radio"],
            ["Dropdown Menu", "select"],
            ["Dropdown Menu (Dynamic)", "selectdynamic"],
            ["File Input (Dynamic)", "filedynamic"],
          ];
          for (let i = 0; i < opts.length; i++) {
            newel = document.createElement("option");
            newel.value = opts[i][1];
            newel.innerHTML = opts[i][0];
            document.getElementById("contpopupcont3select").append(newel);
          }
          /* the second item at the right side */
          newel = document.createElement("div");
          newel.id = "contpopupcont3varnamelabel";
          newel.className = "defaultlabel";
          newel.style.position = "absolute";
          newel.style.top = "20.3%";
          newel.style.left = "5%";
          newel.style.fontSize = "15px";
          newel.style.padding = "0px";
          newel.style.fontSize = "1vw";
          newel.innerHTML = "Name";
          document.getElementById("contpopupcont3").append(newel);
          newel = document.createElement("input");
          newel.id = "contpopupcont3varname";
          newel.type = "text";
          newel.style.position = "absolute";
          newel.class = "defaultinput";
          newel.style.borderRadius = "5px";
          newel.style.left = "40%";
          newel.style.top = "20.3%";
          newel.style.width = "42.5%";
          document.getElementById("contpopupcont3").append(newel);
        }
      });
      document.getElementById("contpopupcont1").append(node);
    });
    document.getElementById("contpopup").append(newel);
    var title_nodename = document.createElement("div");
    title_nodename.id = "contpopupnodename";
    title_nodename.innerHTML = "Node Name";
    title_nodename.className = "defaultlabel";
    title_nodename.style.position = "absolute";
    title_nodename.style.top = "23%";
    title_nodename.style.left = "5%";
    document.getElementById("contpopup").append(title_nodename);
    newel = document.createElement("div");
    newel.id = "contpopupcont1";
    newel.className = "defaultscrollinvisible";
    newel.style.backgroundColor = "#616675";
    newel.style.width = "20%";
    newel.style.height = "60%";
    newel.style.position = "absolute";
    newel.style.top = "29%";
    newel.style.left = "5%";
    newel.style.overflowY = "scroll";
    newel.style.borderRadius = "5px";
    document.getElementById("contpopup").append(newel);
    /*the node type label*/
    newel = document.createElement("div");
    newel.id = "contpopupnodetypelabel";
    newel.className = "defaultlabel";
    newel.innerHTML = "Node Type";
    newel.style.left = "27%";
    newel.style.top = "23%";
    document.getElementById("contpopup").append(newel);
    /* the node type which is shown after being added using the right side */
    newel = document.createElement("div");
    newel.id = "contpopupcont2";
    newel.className = "defaultscrollinvisible";
    newel.style.width = "20%";
    newel.style.height = "60%";
    newel.style.position = "absolute";
    newel.style.top = "29%";
    newel.style.left = "27%";
    newel.style.backgroundColor = "#616675";
    newel.style.overflowY = "scroll";
    newel.style.borderRadius = "5px";
    document.getElementById("contpopup").append(newel);
  }

  function loadallnodes() {
    fetch("http://localhost:5000/loadnodes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: null,
    })
      .then((response) => response.json())
      .then((data) => {
        function resultout() {
          //#########################remove later
          const onDragStart = (
            event,
            nodeType,
            name,
            junctions,
            lib,
            datamet,
            color
          ) => {
            event.dataTransfer.setData("text/lib", lib);
            event.dataTransfer.setData("text/junction", junctions);
            event.dataTransfer.setData("text", name);
            event.dataTransfer.setData("application/reactflow", nodeType);
            event.dataTransfer.setData("text/datamet", JSON.stringify(datamet));
            event.dataTransfer.setData("text/color", JSON.stringify(color));
            event.dataTransfer.effectAllowed = "move";
          };
          function spawn() {
            var keys1 = Object.keys(els);
            for (let i = 0; i < Object.keys(els).length; i++) {
              var dict = { dummy: "dummy" };
              methods[i] = dict;
            }
            let lastkey = parseInt(Object.keys(methods).slice(-1));
            for (let i = 0; i < Object.keys(data).length; i++) {
              els[data[i]["lib_name"]] = data[i]["funcs"];
              customnodes.push(data[i]);
              if (customnodes[i]["methods"] != "undefined") {
                methods[i + lastkey + 1] = customnodes[i]["methods"];
                colors[i + lastkey + 1] = data[i]["color"];
              } else {
                methods[i + lastkey + 1] = { dummy: "dummy" };
                colors[i + lastkey + 1] = "#265A00";
              }
            }
            var el = document.createElement("div");
            el.id = "hand";
            el.addEventListener("click", slide);
            var newel = document.createElement("div");
            newel.id = "handicon";
            newel.innerHTML = '<i class="bi bi-list"></i>';
            newel.style.fontSize = "90%";
            newel.style.color = "white";
            newel.style.fontSize = "3.2vw";
            el.append(newel);
            document.getElementById("aside").append(el);
            var el = document.createElement("div");
            el.id = "librarytitle";
            el.style.display = "flex";
            el.style.backgroundColor = "#D9D9D9";
            el.style.color = "black";
            el.style.height = "8%";
            el.style.textAlign = "center";
            el.style.alignItems = "center";
            el.style.justifyContent = "center";
            el.style.zIndex = "2";
            el.style.fontFamily = "Verdana, Geneva, Tahoma, sans-serif";

            /* the title text*/
            newel = document.createElement("div");
            newel.id = "librarytitletext";
            newel.innerHTML = "Libraries";
            newel.style.fontSize = "3.5vw";
            newel.style.fontFamily = "DM Serif Display, sans-serif";
            newel.style.marginRight = "10%";

            el.append(newel);
            document.getElementById("aside").append(el);
            var keys = Object.keys(els);
            for (let i = 0; i < keys.length; i++) {
              var el = document.createElement("div");
              el.className = "libraryribbon";
              el.style.left = "5%";
              el.style.top = 13 + 8 * i + "%";
              el.id = keys[i] + "ribbon";
              document.getElementById("aside").append(el);
              var el = document.createElement("div");
              el.id = keys[i];
              el.className = "library";
              el.style.left = "5%";
              el.style.top = 13 + 8 * i + "%";
              el.addEventListener("click", function () {
                if (selectedlibrary != this.id) {
                  this.style.animation = "libraryselect 1s forwards";
                  document.getElementById(this.id + "ribbon").style.animation =
                    "libraryselect 1s forwards";
                  if (selectedlibrary != "") {
                    document.getElementById(selectedlibrary).style.animation =
                      "librarydeselect 1s forwards";
                    document.getElementById(
                      selectedlibrary + "ribbon"
                    ).style.animation = "librarydeselect 1s forwards";
                  }
                }
                selectedlibrary = keys[i];
                let childs = document.getElementById("sideextend");
                while (childs.firstChild) {
                  childs.removeChild(childs.lastChild);
                }
                document.getElementById("aside").style.animation =
                  "slideoutp2 1s forwards";
                drawerlvl = 2;
                for (let j = 0; j < els[keys[i]].length; j++) {
                  const foo = (event) =>
                    onDragStart(
                      event,
                      els[keys[i]][j][0],
                      els[keys[i]][j][1],
                      els[keys[i]][j][2],
                      keys[i],
                      methods[i][els[keys[i]][j][1]],
                      colors[i]
                    );
                  var text = document.createElement("p");
                  text.innerHTML = els[keys[i]][j][1].replaceAll("_", " ");
                  text.style.fontSize = "0.8em";
                  var el = document.createElement("div");
                  el.id = els[keys[i]][j][1] + "_" + j;
                  el.className = "nodesv2";
                  el.style.fontSize = "1.3vw";
                  el.addEventListener("dragstart", foo);
                  el.setAttribute("draggable", true);
                  el.append(text);
                  document.getElementById("sideextend").append(el);
                }
              });
              document.getElementById("aside").append(el);
              var el2 = document.createElement("p");
              el2.style.fontFamily = "Noto Sans, sans-serif";
              if (keys[i].search("_")) {
                el2.innerHTML = keys[i].replaceAll("_", " ");
              } else {
                el2.innerHTML = keys[i];
              }
              el.append(el2);
            }
            var el = document.createElement("div");
            el.id = "sideextend";
            document.getElementById("aside").append(el);
            el = document.createElement("div");
            el.style.backgroundColor = "#D9D9D9";
            el.addEventListener("click", spawncreatescreen);
            document.getElementById("aside").append(el);
            var newel = document.createElement("div");
            newel.id = "addlibraryCont";
            newel.className = "outtercircleadd";
            newel.style.width = "60%";
            el.append(newel);

            var addLibrary = document.createElement("div");
            addLibrary.id = "addLibrary";
            addLibrary.style.cursor = "pointer";
            addLibrary.innerHTML = "Add Library";
            addLibrary.style.alignSelf = "center";
            addLibrary.style.fontSize = "1.3vw";
            addLibrary.style.fontFamily = "Noto Sans, sans-serif";
            addLibrary.style.marginTop = "10px";
            addLibrary.style.marginBottom = "10px";

            /* the icon */
            var iconadd = document.createElement("div");
            iconadd.id = "iconadd";
            iconadd.innerHTML = '<i class="bi bi-plus-square-fill"></i>';
            iconadd.style.fontSize = "1.3vw";
            iconadd.style.alignSelf = "center";
            iconadd.style.marginRight = "15px";
            iconadd.style.marginTop = "10px";
            iconadd.style.marginBottom = "10px";

            newel.append(iconadd);
            newel.append(addLibrary);
          }

          function addels() {
            if (document.getElementById("aside")) {
              spawn();
              flag = false;
            } else {
              setTimeout(() => {
                addels();
              }, 100);
            }
          }
          if (flag) {
            setTimeout(() => {
              if (flag) {
                addels();
              }
            }, 100);
          }
        }
        function executeresults() {
          if (data) {
            resultout();
          }
        }
        executeresults();
      });
  }

  function loadflowroute() {
    document.getElementById("blur").style.visibility = "visible";
    document.getElementById("popup").style.visibility = "visible";
    document.getElementById("popup").style.animation = "popupin 0.25s forwards";
    var els = document.getElementsByClassName("dndflow")[0].children;
    for (let j = 0; j < 10; j++) {
      for (let i = 0; i < els.length; i++) {
        setTimeout(() => {
          if (els[i].id != "popup") {
            els[i].style.filter = "blur(" + j * 0.2 + "px)";
          }
        }, 100);
      }
    }
    /* parent div */
    var newel = document.createElement("div");
    newel.id = "contpopup";
    newel.style.display = "flex";
    newel.style.flexDirection = "column";
    newel.style.backgroundColor = "#3c4048";
    newel.style.borderRadius = "15px";
    document.getElementById("popup").style.height = "auto";
    document.getElementById("popup").style.width = "auto";
    document.getElementById("popup").append(newel);

    /* title */
    var title = document.createElement("div");
    title.id = "titlepopup";
    title.style.backgroundColor = "transparent";
    title.style.fontSize = "25px";
    title.style.paddingTop = "40px";
    title.style.paddingBottom = "15px";
    title.style.color = "white";

    /*the title text*/
    newel = document.createElement("div");
    newel.id = "titletext";
    newel.innerHTML = "Saved Flows";
    newel.style.fontFamily = "DM Serif Display, sans-serif";
    newel.style.fontSize = "2.5vw";
    newel.style.paddingRight = "150px";
    newel.style.paddingLeft = "150px";
    newel.style.color = "white";
    title.append(newel);

    document.getElementById("contpopup").append(title);

    /* the content */
    var list_cont = document.createElement("div");
    list_cont.id = "contpopupcont";
    list_cont.style.backgroundColor = "#707070";
    list_cont.style.marginBottom = "15px";
    list_cont.style.marginLeft = "30px";
    list_cont.style.marginRight = "30px";
    list_cont.style.height = "350px";
    list_cont.style.overflowY = "auto";
    list_cont.style.overflowX = "hidden";
    list_cont.style.borderRadius = "10px 10px 0 0";

    var cont = document.createElement("div");
    cont.id = "cont2";
    cont.style.display = "flex";
    cont.style.flexDirection = "row";
    cont.style.justifyContent = "space-between";

    fetch("http://localhost:5000/flows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: null,
    })
      .then((response) => response.json())
      .then((data) => {
        for (let i = 0; i < data["flowslist"].length; i++) {
          var newel = document.createElement("p");
          newel.id = "flow" + i + 1;
          newel.style.cursor = "pointer";
          newel.style.fontSize = "20px";
          newel.style.backgroundColor = "#D9D9D9";
          newel.style.textAlign = "center";
          newel.style.margin = "0";
          newel.style.color = "black";
          newel.style.paddingTop = "10px";
          newel.style.paddingBottom = "10px";
          newel.style.fontFamily = "Noto Sans, sans-serif";
          newel.style.fontWeight = "400";
          newel.style.boxShadow = "0 5px 10px 5px rgba(0, 0, 0, 0.5)";
          newel.innerHTML = data["nameslist"][i];
          newel.onclick = function () {
            fetch("./" + this.innerHTML + ".json")
              .then((response) => response.json())
              .then((json) => onRestore(json));
            popupclose();
          };
          list_cont.append(newel);
        }
        document.getElementById("contpopup").append(list_cont);

        /* the upload button */
        var upload = document.createElement("div");
        upload.id = "uploadflow";
        upload.className = "defaultbutton";
        upload.style.cursor = "pointer";
        upload.style.display = "flex";
        upload.style.flexDirection = "row";
        upload.style.justifyContent = "center";
        upload.style.alignItems = "center";
        upload.style.fontSize = "1vw";
        upload.style.backgroundColor = "#616675";
        upload.style.textAlign = "center";
        upload.style.marginBottom = "15px";
        upload.style.alignSelf = "flex-start";
        upload.style.marginLeft = "29px";
        upload.style.marginRight = "8px";
        upload.style.borderRadius = "8px";

        /* the upload icon */
        newel = document.createElement("div");
        newel.id = "uploadicon";
        newel.innerHTML = '<i class="bi bi-file-earmark-arrow-up"></i>';
        newel.style.fontSize = "1.2vw";
        newel.style.color = "black";
        newel.style.marginRight = "8px";
        upload.append(newel);

        /* the upload text */
        newel = document.createElement("div");
        newel.id = "uploadtext";
        newel.style.color = "white";
        newel.innerHTML = "Upload Files";
        newel.style.marginRight = "8px";
        upload.append(newel);

        upload.onclick = function () {
          console.log("upload");
          readjson();
        };

        /*the close button*/
        var closed1 = document.createElement("div");
        closed1.id = "closepopup";
        closed1.className = "defaultbutton";
        closed1.style.backgroundColor = "#616675";
        closed1.style.fontSize = "20px";
        closed1.style.color = "white";
        closed1.style.display = "flex";
        closed1.style.alignSelf = "center";
        closed1.style.marginBottom = "15px";
        closed1.style.marginRight = "29px";
        closed1.style.borderRadius = "5px";
        closed1.style.justifyContent = "center";
        closed1.style.alignItems = "center";
        closed1.style.cursor = "pointer";
        closed1.style.alignSelf = "flex-end";

        /*the close text*/
        newel = document.createElement("div");
        newel.id = "submittext";
        newel.innerHTML = "Close";
        newel.style.fontSize = "1vw";
        newel.style.marginTop = "3px";
        newel.style.marginBottom = "3px";
        closed1.append(newel);

        closed1.onclick = function () {
          document.getElementById("blur").style.visibility = "hidden";
          document.getElementById("popup").style.animation =
            "popupout 0.25s forwards";
          setTimeout(() => {
            document.getElementById("popup").style.visibility = "hidden";
          }, 250);
          var els = document.getElementsByClassName("dndflow")[0].children;
          for (let j = 10; j >= 0; j--) {
            for (let i = 0; i < els.length; i++) {
              setTimeout(() => {
                if (els[i].id != "popup") {
                  els[i].style.filter = "blur(" + j * 0.2 + "px)";
                }
              }, 100);
            }
          }
          destroyelements("contpopup");
        };
        cont.append(upload, closed1);
        document.getElementById("contpopup").append(cont);
      });
  }

  function readjson() {
    var inps = {};
    fetch("http://localhost:5000/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ node: "dummy_1", inps: inps }),
    })
      .then((response) => response.json())
      .then((data) => {
        function resultout() {
          fetch("./" + data["path_shortcut"])
            .then((response) => response.json())
            .then((json) => onRestore(json));
          popupclose();
        }
        function executeresults() {
          if (data) {
            resultout();
          } else {
            setTimeout(() => {
              executeresults();
            }, 100);
          }
        }
        executeresults();
      });
  }

  function readlog() {
    fetch("./test.txt")
      .then((response) => response.text())
      .then((text) => {
        if (true) {
          var lines = text.split("\n");
          document.getElementById("log").innerHTML = "";
          var out = "Executing Flow...<br>";
          for (let i = 0; i < lines.length; i++) {
            out += lines[i] + "<br>";
            if (lines[i] == "End") {
              executionflag = false;
            } else if (lines[i].includes("Train Yolo")) {
              YOLOtrainflag = true;
              PrintYOLOTrainOutput();
            }
          }
          document.getElementById("log").innerHTML = out;
          if (!YOLOtrainflag) {
            requestAnimationFrame(readlog);
          }
        }
      });
  }

  function saveflow(flow, filename) {
    fetch("http://localhost:5000/saveflow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flow: flow, filename: filename }),
    })
      .then((response) => response.json())
      .then((data) => {});
  }

  var upload = {
    uploadfile: function (node, n) {
      var inps = node["inps"];
      fetch("http://localhost:5000/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ node: node["id"], inps: inps }),
      })
        .then((response) => response.json())
        .then((data) => {
          node["update"].update_data(data["path"], data["path_shortcut"], n);
        });
    },
  };

  var funcs = {
    getcams: function (node) {
      var inps = node["inps"];
      fetch("http://localhost:5000/loadcams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: null,
      })
        .then((response) => response.json())
        .then((data) => {
          node["update"].update_data(data["camslist"]);
        });
    },
  };

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  );
  const onConnect = useCallback(
    (connection) =>
      setEdges((eds) =>
        addEdge(
          { ...connection, style: { stroke: "black", strokeWidth: 3 } },
          eds
        )
      ),
    [setEdges]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);
  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const type = event.dataTransfer.getData("application/reactflow");
      if (String(type) == "CustomNode") {
        var inner = event.dataTransfer.getData("text");
        var junctions = event.dataTransfer.getData("text/junction");
        var lib = event.dataTransfer.getData("text/lib");
        var datamethods = event.dataTransfer.getData("text/datamet");
        var color = event.dataTransfer.getData("text/color");
        if (datamethods == "undefined") {
          datamethods = "";
        }
      } else {
        var inner = "";
        var junctions = "";
        var lib = "";
        var datamethods = "";
        var color = "#265A00";
      }

      // check if the dropped element is valid
      if (typeof type === "undefined" || !type) {
        return;
      }

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });
      if (type == "Start") {
        var newid = getIdStart();
      } else {
        var newid = getId(type);
      }
      const newNode = {
        id: newid,
        type,
        position,
        data: {
          label: `${type}`,
          id: newid,
          inps: { vars: {} },
          upload: upload,
          innerHTML: inner,
          junctions: junctions,
          lib: lib,
          datamethods: datamethods,
          exist: false,
          color: color,
          dropped: false,
          funcs: funcs,
        },
      };
      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance]
  );

  const gotogithub = () => {
    window.open("https://github.com/simpleflowgui/SimpleFlow");
  };

  const runit = () => {
    stopped = false;
    handleTransfer();
  };

  const stopexec = () => {
    stopflag = true;
    loopflag = false;
    stopped = true;
    dataflag = false;
    fetch("http://localhost:5000/stopprocess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: null,
    })
      .then((response) => response.json())
      .then((data) => {});
  };

  const flowsaved = () => {
    saveflowroute();
  };

  const flowloaded = () => {
    loadflowroute();
  };

  if (nodes) {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i]["data"]["upload"] != upload) {
        nodes[i]["data"]["upload"] = upload;
      }
    }
  }
  if (!loadednodes) {
    loadallnodes();
    loadednodes = true;
  }

  return (
    <div className="dndflow" style={{ width: "98vw", height: "98vh" }}>
      <ReactFlowProvider>
        <Background color="white" variant={"dots"} gap={20} />
        <div className="reactflow-wrapper" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onInit={setReactFlowInstance}
            connectionLineComponent={ConnectionLine}
            fitView
            snapToGrid={true}
            snapGrid={[21, 21]}
          >
            <Controls />
          </ReactFlow>
        </div>
        <Sidebar />
        <ExecButton doIt={runit} />
        <StopButton dontIt={stopexec} />
        <SaveFlowButton saveit={flowsaved} />
        <LoadFlowButton loadit={flowloaded} />
      </ReactFlowProvider>
      <div id="log" className="defaultscrollinvisible "></div>
      <button className="close_all" onClick={slide2} style={{ color: "white" }}>
        Hide
      </button>
      <div id="blur" className="blur"></div>
      <div id="popup" className="popup"></div>
      <div id="popupspawn" className="popupspawn"></div>
      <img
        src={logo}
        width={200}
        className="logo"
        onClick={gotogithub}
        style={{ cursor: "pointer" }}
      ></img>
    </div>
  );
}

export default Flow;
