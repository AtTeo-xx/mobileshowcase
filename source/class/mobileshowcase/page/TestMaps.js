/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2012 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Christopher Zuendorf (czuendorf)

************************************************************************ */

/*
 * If you have added resources to your app remove the leading '*' in the
 * following line to make use of them.

#asset(qx/mobile/css/*)
#ignore(OpenLayers)
#ignore(OpenLayers.Layer)

************************************************************************ */

/**
 * Mobile page showing a OpenStreetMap map.
 *
 * @ignore(OpenLayers)
 */
qx.Class.define("mobileshowcase.page.TestMaps",
{
  extend : qx.ui.mobile.page.NavigationPage,

  construct : function()
  {
    this.base(arguments,false);
    this.setTitle("TestMaps");
    this.setShowBackButton(true);
    this.setBackButtonText("Back");

    this._geolocationEnabled = qx.core.Environment.get("html.geolocation");
  },


  members :
  {
    _mapUri: "http://www.openlayers.org/api/OpenLayers.js",
    _map : null,
    _markers : null,
    _myPositionMarker : null,
    _mapnikLayer : null,
    _geolocationEnabled : false,
    _showMyPositionButton : null,
    _postalCode : null,

    // overridden
    _initialize : function()
    {
      this.base(arguments);

      if(this._geolocationEnabled) {
        this._initGeoLocation();
      }

      this._loadMapLibrary();

      // Listens on window orientation change, and triggers redraw of map.
      // Needed for triggering OpenLayers to use a bigger area, and draw more tiles.
      qx.event.Registration.addListener(window, "orientationchange", this._redrawMap, this);
    },


    /**
     * Used the Mapnik Layer for redrawing. Needed after orientationChange event
     * and drawing markers.
     */
    _redrawMap : function () {
      if(this._mapnikLayer!= null){
        this._mapnikLayer.redraw();
      }
    },


    /**
     * Prepares GeoLocation, and installs needed listeners.
     */
    _initGeoLocation : function() {
      var geo = qx.bom.GeoLocation.getInstance();
      geo.addListener("position", this._onGeolocationSuccess,this);
      geo.addListener("error", this._onGeolocationError,this);
    },


    /**
     * Callback function when Geolocation did work.
     */
    _onGeolocationSuccess : function(position) {
      var latitude = position.getLatitude();
      var longitude = position.getLongitude();

      var fromProjection = new OpenLayers.Projection("EPSG:4326");   // Transform from WGS 1984
      var toProjection = new OpenLayers.Projection("EPSG:900913"); // to Spherical Mercator Projection
      var mapPosition = new OpenLayers.LonLat(longitude,latitude).transform( fromProjection, toProjection);
      var zoom = 15;

      this._map.setCenter(mapPosition, zoom);
      this._setMarkerOnMap(this._map,mapPosition);

      this._redrawMap();
    },


    /**
     * Callback function when Geolocation returned an error.
     */
    _onGeolocationError : function() {
      this._showMyPositionButton.setEnabled(false);

      var buttons = [];
      buttons.push(qx.locale.Manager.tr("OK"));
      var title = "Problem with Geolocation";
      var text = "Please activate location services on your browser and device."
      qx.ui.mobile.dialog.Manager.getInstance().confirm(title, text, function() {
      }, this, buttons);
    },


    /**
     * Retreives GeoPosition out of qx.bom.Geolocation and zooms to this point on map.
     */
    _getGeoPosition : function() {
      var geo = qx.bom.GeoLocation.getInstance();
      geo.getCurrentPosition(false, 1000, 1000);
    },


    // overridden
    _createScrollContainer : function()
    {
      // MapContainer
      var layout = new qx.ui.mobile.layout.VBox().set({
        alignX : "center",
        alignY : "middle"
      });

      var mapContainer = new qx.ui.mobile.container.Composite(layout);

      mapContainer.setId("osmMap");
      return mapContainer;
    },


    // overridden
    _createContent : function() {
       var menuContainer = new qx.ui.mobile.container.Composite();
       menuContainer.setId("mapMenu");

       // LABEL
       var descriptionLabel = new qx.ui.mobile.basic.Label("Page Title");
       descriptionLabel.addCssClass("osmMapLabel");

       // TOGGLE BUTTON
       var toggleNaviButton = new qx.ui.mobile.form.ToggleButton(true,"Show","Hide",12);

       // SHOW MY POSITION BUTTON
       this._showMyPositionButton = new qx.ui.mobile.form.Button("Find me!");
       this._showMyPositionButton.addListener("tap", this._getGeoPosition, this);

       // Button is disabled, when Geolocation is not possible.
       this._showMyPositionButton.setEnabled(this._geolocationEnabled);

       toggleNaviButton.addListener("changeValue", function() {
        var newNavBarState = !this.isNavigationBarHidden();
        this.setNavigationBarHidden(newNavBarState);
        this.show();
       },this);

      this._postalCode = new qx.ui.mobile.form.TextField().set({placeholder:"CAP"});

       var groupPosition = new qx.ui.mobile.form.Group([this._showMyPositionButton],false);
       var groupFullScreen = new qx.ui.mobile.form.Group([descriptionLabel,toggleNaviButton],true);
       var groupPostalCode = new qx.ui.mobile.form.Group([this._postalCode],true);

       this._showMyPositionButton.addCssClass("map-shadow");
       groupFullScreen.addCssClass("map-shadow");

       menuContainer.add(groupFullScreen);
       menuContainer.add(groupPosition);
       menuContainer.add(groupPostalCode);

       return menuContainer;
    },


    /**
     * Loads JavaScript library which is needed for the map.
     */
    _loadMapLibrary : function() {

      var self = this;
      var req = new qx.bom.request.Script();

      req.onload = function() {
        self._map = new OpenLayers.Map("osmMap");
        self._mapnikLayer = new OpenLayers.Layer.OSM("mapnik",null,{});

        self._map.addLayer(self._mapnikLayer);
        var pois = new OpenLayers.Layer.Text( "My Points",
                    { location:"./Points.txt",
                      projection: self._map.displayProjection
                    });
        self._map.addLayer(pois);
 
        self._zoomMapToDefaultPosition();
      }

      req.open("GET", this._mapUri);
      req.send();
    },


    /**
     * Zooms the map to a default position.
     * In this case: Roma, Italia
     */
    _zoomMapToDefaultPosition : function() {
      var fromProjection = new OpenLayers.Projection("EPSG:4326");   // Transform from WGS 1984
      var toProjection = new OpenLayers.Projection("EPSG:900913"); // to Spherical Mercator Projection
      var mapPosition = new OpenLayers.LonLat(12.48321,41.892666).transform( fromProjection, toProjection);
      var zoom = 15;

      this._map.setCenter(mapPosition, zoom);
      this._setMarkerOnMap(this._map,mapPosition);
    },


    /**
     * Draws a Marker on the map.
     */
    _setMarkerOnMap : function(map,mapPosition) {
      if(this._markers==null) {
        this._markers = new OpenLayers.Layer.Markers( "Markers" );
        map.addLayer(this._markers);
      }

      if(this._myPositionMarker != null) {
        this._markers.removeMarker(this._myPositionMarker);
      }

      this._myPositionMarker = new OpenLayers.Marker(mapPosition,icon);

      var size = new OpenLayers.Size(21,25);
      var offset = new OpenLayers.Pixel(-(size.w/2), -size.h);
      var icon = new OpenLayers.Icon('http://www.openlayers.org/dev/img/marker.png', size, offset);

      this._markers.addMarker(this._myPositionMarker);
    },


    // overridden
    _back : function()
    {
      qx.core.Init.getApplication().getRouting().executeGet("/", {reverse:true});
    },


    /*
    *****************************************************************************
      DESTRUCTOR
    *****************************************************************************
    */
    destruct : function()
    {
      this._disposeObjects("_mapUri","_map","_myPositionMarker","_markers","_showMyPositionButton","_mapnikLayer");
    }
  }
});


/*


pointlayer = new OpenLayers.Layer.Vector('Original');

pointlayer.addFeatures([
    new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(10, 2)),
    new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(20, -10)),
    new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(30, 15)),
    new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(40, 5))
    ]);

pointlayer.features[0].style = OpenLayers.Util.applyDefaults({
    strokeColor: '#ff0000'
}, pointlayer.styleMap.styles.default.defaultStyle);
pointlayer.features[1].style = OpenLayers.Util.applyDefaults({
    strokeColor: '#00ff00'
}, pointlayer.styleMap.styles.default.defaultStyle);
pointlayer.features[2].style = OpenLayers.Util.applyDefaults({
    strokeColor: '#0000ff'
}, pointlayer.styleMap.styles.default.defaultStyle);
pointlayer.features[3].style = OpenLayers.Util.applyDefaults({
    strokeColor: '#000000'
}, pointlayer.styleMap.styles.default.defaultStyle);

pointlayer.redraw();

_tracklayer = new OpenLayers.Layer.PointTrack('SourceNode', {styleFrom: OpenLayers.Layer.PointTrack.SOURCE_NODE, visibility: false});
_tracklayer.addNodes(pointlayer.features);

tracklayer = new OpenLayers.Layer.PointTrack('TargetNode', {styleFrom: OpenLayers.Layer.PointTrack.TARGET_NODE, visibility: false});
tracklayer.addNodes(pointlayer.features);


map.addLayers([baselayer, pointlayer, _tracklayer, tracklayer]);
map.addControl(new OpenLayers.Control.LayerSwitcher());
map.zoomToExtent(new OpenLayers.Bounds(-10, -16, 60, 20));



*/
