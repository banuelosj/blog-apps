# sketch-snap-and-cut

This application highlights how one can take advantage of snapping in the Sketch widget to perform some polygon geometry cuts using the geometryEngine with the ArcGIS API for JavaScript. Snapping makes it easier for us to cut more symmetrical geometries, as we have right-angle indicators and parrallel line symbol indicators as part of the snapping engine. This application will show us how much easier our lives have been made since snapping was added to the Sketch widget in 2D MapViews and 3D SceneViews. You can also see the areas of the geometries you create in this example.

![sketch-snap-and-cut](https://github.com/banuelosj/blog-apps/jsapi/widgets/sketch/sketch-snap-and-cut/blob/main/sketch-snap-and-cut.png)

## How to use the application

To use the app, click on the draw button on the top left to start drawing a polyline. This polyline will be used to cut the geometries it intersects, and return new geometries that will be added as graphics onto the map. Once you draw a polyline, if the polyline intersects other graphics on the map, the cut button will become active. You can then click on the cut button to call the geometryEngine.cut() method and cut the geometries the polyline overlaps. Once you perform a cut, the new geometries created will be displayed on the map.

This app contains a toggle that allows for the toggling of the polygons' area labels on the map. If you toggle on this switch, then you can see the area for each polygon.

## Built With

- [ArcGIS JavaScript API](https://developers.arcgis.com/javascript/) - Using the 4.20 JavaScript API
- [Calcite-Components](https://developers.arcgis.com/calcite-design-system/components/)
- [Sketch widget](https://developers.arcgis.com/javascript/latest/api-reference/esri-widgets-Sketch.html)
- [geometryEngine](https://developers.arcgis.com/javascript/latest/api-reference/esri-geometry-geometryEngine.html)

## [Live Sample](https://banuelosj.github.io/blog-apps/jsapi/widgets/sketch/sketch-snap-and-cut/index.html)