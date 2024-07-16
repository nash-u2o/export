$(function(){
  $('#select-geom option[value="draw-polygon"]').attr('selected', true);
  $('#select-file option[value="kml"]').attr('selected', true);

  var saveAs=saveAs||function(e){"use strict";if(typeof e==="undefined"||typeof navigator!=="undefined"&&/MSIE [1-9]\./.test(navigator.userAgent)){return}var t=e.document,n=function(){return e.URL||e.webkitURL||e},r=t.createElementNS("http://www.w3.org/1999/xhtml","a"),o="download"in r,a=function(e){var t=new MouseEvent("click");e.dispatchEvent(t)},i=/constructor/i.test(e.HTMLElement)||e.safari,f=/CriOS\/[\d]+/.test(navigator.userAgent),u=function(t){(e.setImmediate||e.setTimeout)(function(){throw t},0)},s="application/octet-stream",d=1e3*40,c=function(e){var t=function(){if(typeof e==="string"){n().revokeObjectURL(e)}else{e.remove()}};setTimeout(t,d)},l=function(e,t,n){t=[].concat(t);var r=t.length;while(r--){var o=e["on"+t[r]];if(typeof o==="function"){try{o.call(e,n||e)}catch(a){u(a)}}}},p=function(e){if(/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(e.type)){return new Blob([String.fromCharCode(65279),e],{type:e.type})}return e},v=function(t,u,d){if(!d){t=p(t)}var v=this,w=t.type,m=w===s,y,h=function(){l(v,"writestart progress write writeend".split(" "))},S=function(){if((f||m&&i)&&e.FileReader){var r=new FileReader;r.onloadend=function(){var t=f?r.result:r.result.replace(/^data:[^;]*;/,"data:attachment/file;");var n=e.open(t,"_blank");if(!n)e.location.href=t;t=undefined;v.readyState=v.DONE;h()};r.readAsDataURL(t);v.readyState=v.INIT;return}if(!y){y=n().createObjectURL(t)}if(m){e.location.href=y}else{var o=e.open(y,"_blank");if(!o){e.location.href=y}}v.readyState=v.DONE;h();c(y)};v.readyState=v.INIT;if(o){y=n().createObjectURL(t);setTimeout(function(){r.href=y;r.download=u;a(r);h();c(y);v.readyState=v.DONE});return}S()},w=v.prototype,m=function(e,t,n){return new v(e,t||e.name||"download",n)};if(typeof navigator!=="undefined"&&navigator.msSaveOrOpenBlob){return function(e,t,n){t=t||e.name||"download";if(!n){e=p(e)}return navigator.msSaveOrOpenBlob(e,t)}}w.abort=function(){};w.readyState=w.INIT=0;w.WRITING=1;w.DONE=2;w.error=w.onwritestart=w.onprogress=w.onwrite=w.onabort=w.onerror=w.onwriteend=null;return m}(typeof self!=="undefined"&&self||typeof window!=="undefined"&&window||this.content);if(typeof module!=="undefined"&&module.exports){module.exports.saveAs=saveAs}else if(typeof define!=="undefined"&&define!==null&&define.amd!==null){define("FileSaver.js",function(){return saveAs})}

  const source = new ol.source.Vector();

  const vector = new ol.layer.Vector({
      source: source,
  });

  const map = new ol.Map({
    view: new ol.View({
      center: [0, 0],
      zoom: 1,
    }),
    layers: [
      new ol.layer.Tile({
        source: new ol.source.OSM(),
      }),
      vector,
    ],
    target: 'map',
  });


  const drawPoint = new ol.interaction.Draw({
    type: "Point",
    source: source,
  });

  //NOTE: geojson lines exported from this program will not appear in QGIS unless they are "MultiLineString" instead of LineString
  const drawPolyline = new ol.interaction.Draw({
    type: "MultiLineString",
    source: source,
  });

  const drawPolygon = new ol.interaction.Draw({
    type: "Polygon",
    source: source,
  });

  map.addInteraction(drawPolygon);

  //Separates the differing geometries into an object with different lists for the shp file. Will result in a shapefile per geometry type
  function filterGeom(source){
    let feature;
    const filter = {
      point: [],
      linestring: [],
      polygon: []
    };

    const features = source.getFeatures();
      for(var i = 0; i < features.length; i++){
        feature = features[i];
        switch (feature.getGeometry().getType()){
          case "Point":
            filter["point"].push(feature);
            break;
          case "MultiLineString":
            filter["linestring"].push(feature);
            break;
          case "Polygon":
            filter["polygon"].push(feature);
            break;
        }
      }
    return filter;
  }

  //Used to transform an array of cloned features to a different coordinate system
  function transformData(features, src="EPSG:3857", dest="EPSG:4326"){
    const transformedFeatures = [];
    for(var i = 0; i < features.length; i++){
      var feature = features[i].clone();
      feature.getGeometry().transform(src, dest)
      transformedFeatures.push(feature);
    }
    return transformedFeatures;
  }

  // Save the data drawn on the map to a chosen file type
  function saveFile(fileType, fileName){
    let data, mimeType;

    var shpData = filterGeom(source);

    // Transform the features to EPSG:4326 for KML and SHP
    const transformedFeatures = transformData(source.getFeatures());
    const transformedShpFeatures = { 
      point: transformData(shpData["point"]),
      linestring: transformData(shpData["linestring"]),
      polygon: transformData(shpData["polygon"])
    };

    switch(fileType){
      case "kml":
        data = new ol.format.KML().writeFeatures(
          transformedFeatures,
        );

        mimeType = 'application/vnd.google-earth.kml+xml';
        fileName = fileName + "." + fileType;

        var blob = new Blob([data], {type: mimeType});
        saveAs(blob, fileName);

        break;
      case "geojson":
        const epsgString = "EPSG:3857";
        data = new ol.format.GeoJSON().writeFeatures(source.getFeatures());
        //Convert data to JSON to add crs property and then convert back to string
        var jsonData = JSON.parse(data);
        jsonData["crs"] = {
          "type": "name",
          "properties": {
            "name": epsgString,
          }
        };
        data = JSON.stringify(jsonData);
      
        mimeType = 'application/json';
        fileName = fileName + "." + fileType;

        var blob = new Blob([data], {type: mimeType});
        saveAs(blob, fileName);

        break;

      //NOTE: shp can only work with one type of data (Point vs LineString, vs Polygon) at a time.
      case "shp":
        for(let key in transformedShpFeatures){
          if(transformedShpFeatures[key].length > 0){
            data = new ol.format.GeoJSON().writeFeaturesObject(transformedShpFeatures[key]);

            //IMPORTANT: Every feature MUST have properties - properties cannot be null. If not, it cannot be parsed by shpwrite.zip
            for(var i = 0; i < data["features"].length; i++){
              data["features"][i]["properties"] = {name: "foo " + i};
            }

            mimeType = "application/zip";

            //folder is the name of the folder inside the zip file
            //outputType must be blob or else the zip folder has a conniption
            //types are listed followed by the names of the files they'll be put in
            const options = {
              folder: "my_shapes",
              outputType: "blob",
              compression: "DEFLATE",
              types: {
                point: "mypoints",
                polygon: "mypolygons",
                polyline: "mylines",
              },
            };
            
            //shpwrite.zip() returns a promise, so use .then()
            shpwrite.zip(data, options).then(function(zippedData){
              const blob = new Blob([zippedData], {type: mimeType});
              saveAs(blob, key + "_" + fileName);
            });
          }
        }
        break;
      default: 
        console.log("Unsupported file type");
        return;
    }
  }

  $("#kml").click(function(){
    saveFile("kml");
  });
  $("#geojson").click(function(){
    saveFile("geojson");
  });
  $("#shp").click(function(){
    saveFile("shp");
  });

    $("#submit").click(function(e){
      let fileType = $("#select-file").val()
      let fileName = $("#fname").val();
      if(fileName == ""){
        fileName = "map";
      }
      e.preventDefault()
      saveFile(fileType, fileName);
    })

  $('#select-geom').change(function(){
    switch($(this).val()){
      case 'draw-polygon':
        map.removeInteraction(drawPoint);
        map.removeInteraction(drawPolyline);
        map.addInteraction(drawPolygon);
        break;
      case 'draw-polyline':
        map.removeInteraction(drawPoint);
        map.removeInteraction(drawPolygon);
        map.addInteraction(drawPolyline);
        break;
      case 'draw-point':
        map.removeInteraction(drawPolygon);
        map.removeInteraction(drawPolyline);
        map.addInteraction(drawPoint);
        break;
    }
  });
})