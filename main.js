const { entrypoints } = require("uxp");
const { action } = require("photoshop").action;
const {app, constants} = require("photoshop");
const photoshopCore = require("photoshop").core;
  // showAlert = () => {
  //   alert("This is an alert message");
  // }
  entrypoints.setup({
    // commands: {
    //   showAlert,
    // },
    panels: {
      vanilla: {
        show(node) {
        }
      }
    }
  });

async function isFolderExist(folder, filename) {
  try {
    var entry = await folder.getEntry(filename);
    fileExists = true;
  }
  catch(fileError) {
    fileExists = false;
  }
  return fileExists
}

async function showLayerNames() {
    console.log(require("photoshop").action)
    const fs = require('uxp').storage.localFileSystem;
    const folderPath = await fs.getFolder();

    const nativePath = folderPath.nativePath
    console.log(folderPath)
    console.log(typeof(folderPath))

    if (folderPath !== null) {
      await getAllLayers(app.activeDocument.layers, app.activeDocument, folderPath)
    }
};

const exportLayers = async (layers, folderEntry) => {
    await photoshopCore.executeAsModal(async () => {
        try{
            let lastlayer = layers[layers.length - 1]
            let duplicatedLastlayer = null;
            let documentOption = {
              // title: "My Default Size 1",
              width: (lastlayer.bounds.right - lastlayer.bounds.left), 
              height: (lastlayer.bounds.bottom - lastlayer.bounds.top), 
              resolution: lastlayer.document.resolution, 
              mode: lastlayer.document.mode, 
              fill: "transparent"
            }
            var tempDocument = await app.documents.add(documentOption)
            for (let i = layers.length - 1;i >= 0; i--){
             
              const duplicatedLayer = await layers[i].duplicate(tempDocument, constants.ElementPlacement.PLACEATBEGINNING)
              if(i === layers.length - 1){
                await duplicatedLayer.translate(-duplicatedLayer.bounds.left, -duplicatedLayer.bounds.top)
                duplicatedLastlayer = duplicatedLayer
                continue
              }
              let offsetTop = layers[i].bounds.top - lastlayer.bounds.top
              let offsetLeft = layers[i].bounds.left - lastlayer.bounds.left
              await duplicatedLayer.translate(-duplicatedLayer.bounds.left + duplicatedLastlayer.bounds.left + offsetLeft, -duplicatedLayer.bounds.top + duplicatedLastlayer.bounds.top + offsetTop)
            }
            await tempDocument.saveAs.png(
                await folderEntry.createEntry(lastlayer.name),{  }, true
            );
            
            tempDocument.closeWithoutSaving()
        }catch(e){
            console.log(e);
        }
    });
}

const visibleAllLayers = (layers, visible) => {
  for (var i = 0; i < layers.length; i++){
      var layer = layers[i]
      if (layer.kind !== "group") {
        layer.visible = visible;
      } else {
        visibleAllLayers(layer.layers, visible);
      }
  };
};

let layerBuffer = [];

async function getAllLayers(layers, activeDocument, folder) {
  try{
    var currentPath = folder.nativePath
    for (var i = 0; i < layers.length; i++){
      var layer = layers[i]
      if(i>0) lastLayer = layers[i-1]
      console.log("start export layer: " +layer.name)
      if (layer.kind !== "group") {
        var layerName = layer.name;
        var filename = currentPath + "/" +  layerName + ".png"
        layerBuffer.push(layer)
        if(layer.isClippingMask) {
            continue
        }else{
            await exportLayers(layerBuffer, folder);
            layerBuffer = []
        }
        console.log(filename + " create save success")
      } else {
        var folderName = currentPath + "/" + layer.name;
        //Check if it exist, if not create it.
        var exist = await isFolderExist(folder, layer.name)
        let childFolder = null;
        if (!exist) {
          childFolder = await folder.createFolder(layer.name);
          console.log(childFolder.nativePath + " create success")
        } else{
          childFolder = await folder.getEntry(layer.name)
          console.log(childFolder.nativePath + " exist")
        }
        await getAllLayers(layer.layers, activeDocument, childFolder);
      }

    }
  }catch(e){
    console.log(e);
  }
}

document.getElementById("btnPopulate").addEventListener("click", showLayerNames);