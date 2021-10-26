require([
  "esri/widgets/Sketch",
  "esri/widgets/Sketch/SketchViewModel",
  "esri/Map",
  "esri/layers/GraphicsLayer",
  "esri/Graphic",
  "esri/views/MapView",
  "esri/geometry/geometryEngine"
], (Sketch, SketchViewModel, Map, GraphicsLayer, Graphic, MapView, geometryEngine) => {
  let cuttable = false;
  let cuttingPolyline = null;
  let selectedGraphics = [];
  let containerPolygons = [];
  let currentGraphics = null;
  const labelsVisible = false;

  let areaUnit = "square-kilometers";
  let areaLabel = " sq. km";
  
  const graphicsLayer = new GraphicsLayer({ title: "GraphicsLayer" });
  const labelsGraphicsLayer = new GraphicsLayer({ visible: false, title: "LabelsLayer" });

  const cropSquare = {
    type: "polygon",
    rings: [
      [
        [-10862352.308763005, 4961537.147473844],
        [-10861323.03641855, 4961537.147473847],
        [-10861323.036418546, 4960482.555349202],
        [-10862352.308763001, 4960482.555349198],
        [-10862352.308763005, 4961537.147473844]
      ]
    ],
    spatialReference: { wkid: 102100 }
  }

  const fillSymbol = {
    type: "simple-fill",
    style: "diagonal-cross",
    color: "#007AC2",
    outline: {
      width: 3,
      color: "#007AC2"
    }
  }

  const pieceFillSymbol = {
    type: "simple-fill",
    style: "solid",
    color: [0, 122, 194, 0.3],
    outline: {
      width: 3,
      color: "#115091"
    }
  }

  const areaTextSymbol = {
    type: "text",
    color: "#000000",
    font: {
      size: 14,
      weight: "bold"
    },
    text: "Here lies the centroid"
  }

  const lineSymbol = {
    type: "simple-line",
    color: "#FF9C00",
    width: 3,
    style: "short-dot"
  }

  const map = new Map({
    basemap: "satellite",
    layers: [graphicsLayer, labelsGraphicsLayer]
  });

  const view = new MapView({
    container: "viewDiv",
    map: map,
    zoom: 16,
    center: [-97.57427, 40.65113]
  });

  const sketch = new Sketch({
    layer: graphicsLayer,
    view: view,
    // graphic will be selected as soon as it is created
    creationMode: "update",
    // turn snapping on by default for graphicsLayer only
    snappingOptions: {
      enabled: true,
      featureSources: [{ layer: graphicsLayer, enabled: true }]
    },
    // hide the point and polyline draw tools, as well as the lasso selection
    visibleElements: {
      createTools: {
        point: false,
        polyline: false
      },
      selectionTools: {
        "lasso-selection": false
      }
    },
    // override the default symbology with SketchViewModel
    viewModel: new SketchViewModel({
      view: view,
      layer: graphicsLayer,
      polygonSymbol: pieceFillSymbol,
      polylineSymbol: lineSymbol
    })
  });

  view.ui.add(sketch, "top-right");

  sketch.on("create", (evt) => {
    if(evt.state === "complete" && evt.tool === "polyline") {
      document.getElementById("errorDiv").innerText = "";
      drawCutterBtn.disabled = true;

      // highlight the graphics that overlap and intersect
      // the cutting polyline
      selectIntersectingGraphics(graphicsLayer, evt.graphic);
    }
    // let's override the default symbol of all polygon tools
    if(evt.state === "complete" && (evt.tool === "polygon" || evt.tool === "rectangle" || evt.tool === "circle")) {
      getArea(evt.graphic.geometry);
    }
  });

  // listen for a delete on Sketch
  sketch.on("delete", (evt) => {
    for (const graphic of evt.graphics) {
      // if we delete the cutter line, then disable cut and enable draw
      if(graphic.geometry.type === "polyline") {
        drawCutterBtn.disabled = false;
        cutBtn.disabled = true;
        cuttingPolyline = null;
        break;
      }
    }
  });

  view.when(() => {
    // set pre-defined graphic
    const cropGraphic = new Graphic({
      geometry: cropSquare,
      symbol: fillSymbol,
      spatialReference: view.spatialReference
    });

    graphicsLayer.add(cropGraphic);
    // let's calculate the area so it can be displayed when labels are toggled
    getArea(cropGraphic.geometry);
  });

  // find the centroid of the polygon, to add a text symbol
  // at the centroid with the graphic area
  // maybe perimeter as well
  // pass in a geometry as the param
  function findCentroid(geom) {
    return !geom.centroid ? null : geom.centroid;
  }

  // use geometryEngine to calculate geodesic area
  function getArea(geom) {
    const area = geometryEngine.geodesicArea(geom, areaUnit);  // set to "square-kilometers" 
    setAreaText(geom, area.toFixed(2));
  }

  // set the area as a text symbol at the centroid of the geometry
  function setAreaText(geom, area) {
    const point = findCentroid(geom);
    const symb = areaTextSymbol;
    symb.text = `${area}${areaLabel}`;

    const graphic = new Graphic({
      geometry: point,
      symbol: symb,
      spatialReference: view.spatialReference
    });

    labelsGraphicsLayer.add(graphic);
  }

  // cut the polygonGraphic passed as argument 1 with the
  // polylineGraphic geometry
  function cutPolygon(polygonGraphic, cutterGraphic) {
    // disable button so it can't be clicked
    cutBtn.disabled = true;

    const sections = geometryEngine.cut(polygonGraphic.geometry, cutterGraphic.geometry);

    if(!!sections.length) {
      // remove current polygon and cutter line
      graphicsLayer.remove(polygonGraphic);
      graphicsLayer.remove(cutterGraphic);
      // display the new section polygons
      displaySections(sections);
    } else {
      graphicsLayer.remove(cutterGraphic);
      if(graphicsLayer.graphics.length > currentGraphics) {
        return;
      } else {
        document.getElementById("errorDiv").innerText = "not a valid cut";
        return;
      }
    }
  }

  // add sections to the graphicslayer
  function displaySections(geometries) {
    geometries.forEach((geom) => {
      const graphic = new Graphic({
        geometry: geom,
        symbol: pieceFillSymbol
      });
      graphicsLayer.add(graphic);
    });
  }

  // select the graphics that will be cut (does not highlight)
  function selectIntersectingGraphics(layer, lineGraphic) {
    containerPolygons = [];
    selectedGraphics = [];
    const crossingGraphics = layer.graphics.filter((graphic) => {
      if(graphic.geometry === lineGraphic.geometry) {
        return false;
      }
      const intersects = !!geometryEngine.intersects(lineGraphic.geometry, graphic.geometry);

      if (!!geometryEngine.crosses(lineGraphic.geometry, graphic.geometry)) {
        containerPolygons.push(graphic);
      }
      if (!!geometryEngine.contains(graphic.geometry, lineGraphic.geometry)) {
        containerPolygons.push(graphic);
      }

      return intersects;
    });

    if(crossingGraphics.items.length > 0) {
      crossingGraphics.items.forEach((graphic) => {
        selectedGraphics.push(graphic);
      });
      cutBtn.disabled = false;
      cuttable = true;
      cuttingPolyline = lineGraphic;
    } else {
      drawCutterBtn.disabled = false;
      cuttingPolyline = lineGraphic;
    }
  }

  // calcite logic
  view.ui.add(document.getElementById("block"), "top-left");

  const labelSwitch = document.getElementById("labelSwitch");
  const drawCutterBtn = document.getElementById("drawCutterBtn");
  const cutBtn = document.getElementById("cutBtn");
  const unitsSelect = document.getElementById("unitsSelect");

  labelSwitch.addEventListener("calciteSwitchChange", displayAreaLabels);
  unitsSelect.addEventListener("calciteSelectChange", () => { handleSelectChange(unitsSelect); });
  drawCutterBtn.onclick = () => { drawCutterLine() };
  cutBtn.onclick = () => { cutGeometries() };

  // draw the polyline used for cutting the geometries
  function drawCutterLine() {
    if(!!cuttingPolyline) {
      graphicsLayer.remove(cuttingPolyline);
    }
    sketch.create("polyline");
  }

  // cut the selected geometryies with the drawn polyline
  function cutGeometries() {
    currentGraphics = graphicsLayer.graphics.length - 1; // excluding the cutting line
    selectedGraphics.forEach(graphic => {
      cutPolygon(graphic, cuttingPolyline);
    });
    drawCutterBtn.disabled = false;
    if(labelsGraphicsLayer.visible) {
      labelsGraphicsLayer.removeAll();

      // loop through all the graphics and calculate each polygon"s area
      graphicsLayer.graphics.forEach(graphic => {
        if (graphic.geometry.type === "polygon") {
          getArea(graphic.geometry);
        }
      });
    }
  }

  // display area labels for all polygons
  function displayAreaLabels(evt) {
    if(evt.detail.switched) {
      // remove existing labels in case the graphics were moved
      labelsGraphicsLayer.removeAll();

      // loop through all the graphics and calculate each polygon's area
      graphicsLayer.graphics.forEach(graphic => {
        if (graphic.geometry.type === "polygon") {
          getArea(graphic.geometry);
        }
      });
      labelsGraphicsLayer.visible = true;
    } else {
      // hide the labels
      labelsGraphicsLayer.visible = false;
    }
  }

  function handleSelectChange(element) {
    areaUnit = element.selectedOption.value;
    setAreaLabel(areaUnit);
    // remove existing labels in case the graphics were moved
    labelsGraphicsLayer.removeAll();

    // loop through all the graphics and calculate each polygon's area
    graphicsLayer.graphics.forEach(graphic => {
      if (graphic.geometry.type === "polygon") {
        getArea(graphic.geometry);
      }
    });
  }

  function setAreaLabel(unit) {
    switch (unit) {
      case "acres":
        areaLabel = " ac";
        break;
      case "hectares":
        areaLabel = " ha";
        break;
      case "square-feet":
        areaLabel = " sq. ft";
        break;
      case "square-meters":
        areaLabel = " sq. m";
        break;
      case "square-yards":
        areaLabel = " sq. yd";
        break;
      case "square-kilometers":
        areaLabel = " sq. km";
        break;
      case "square-miles":
        areaLabel = " sq. mi";
        break;
      default:
        return;
    }
  }
});