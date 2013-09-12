/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2011 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Gabriel Munteanu (gabios)

************************************************************************ */

/**
 * The popup represents a widget that gets shown above other widgets,
 * usually to present more info/details regarding an item in the application.
 *
 * There are 3 usages for now:
 *
 * <pre class='javascript'>
 * var widget = new qx.ui.mobile.form.Button("Error!");
 * var popup = new qx.ui.mobile.dialog.Popup(widget);
 * popup.show();
 * </pre>
 * Here we show a popup consisting of a single buttons alerting the user
 * that an error has occured.
 * It will be centered to the screen.
 * <pre class='javascript'>
 * var label = new qx.ui.mobile.basic.Label("Item1");
 * var widget = new qx.ui.mobile.form.Button("Error!");
 * var popup = new qx.ui.mobile.dialog.Popup(widget, label);
 * popup.show();
 * widget.addListener("tap", function(){
 *   popup.hide();
 * });
 *
 * </pre>
 *
 * In this case everything is as above, except that the popup will get shown next to "label"
 * so that the user can understand that the info presented is about the "Item1"
 * we also add a tap listener to the button that will hide out popup.
 *
 * Once created, the instance is reused between show/hide calls.
 *
 * <pre class='javascript'>
 * var widget = new qx.ui.mobile.form.Button("Error!");
 * var popup = new qx.ui.mobile.dialog.Popup(widget);
 * popup.placeTo(25,100);
 * popup.show();
 * </pre>
 *
 * Same as the first example, but this time the popup will be shown at the 25,100 coordinates.
 *
 *
 */
qx.Class.define("qx.ui.mobile.dialog.Popup",
{
  extend : qx.ui.mobile.core.Widget,


 /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  /**
   * @param widget {qx.ui.mobile.core.Widget} the widget the will be shown in the popup
   * @param anchor {qx.ui.mobile.core.Widget?} optional parameter, a widget to attach this popup to
   */
  construct : function(widget, anchor)
  {
    this.base(arguments);
    this.exclude();
    qx.core.Init.getApplication().getRoot().add(this);

    this.__arrow = new qx.ui.mobile.container.Composite();
    this._add(this.__arrow);

    this.__anchor = anchor;

    if(widget) {
      this._initializeChild(widget);
    }
  },


  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */
  properties :
  {
    // overridden
    defaultCssClass :
    {
      refine : true,
      init : "popup"
    },


    /**
     * The label/caption/text of the qx.ui.mobile.basic.Atom instance
     */
    title :
    {
      apply : "_applyTitle",
      nullable : true,
      check : "String",
      event : "changeTitle"
    },


    /**
     * Any URI String supported by qx.ui.mobile.basic.Image to display an icon
     */
    icon :
    {
      check : "String",
      apply : "_applyIcon",
      nullable : true,
      event : "changeIcon"
    }
  },


  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    __isShown : false,
    __childrenContainer : null,
    __percentageTop : null,
    __anchor: null,
    __widget: null,
    __titleWidget: null,
    __arrow : null,


    /**
     * Event handler. Called whenever the position of the popup should be updated.
     */
    _updatePosition : function()
    {
      if(this.__anchor)
      {
          var viewPortHeight = qx.bom.Viewport.getHeight();
          var viewPortWidth = qx.bom.Viewport.getWidth();
        
          var anchorPosition = qx.bom.element.Location.get(this.__anchor.getContainerElement());
          var popupDimension = qx.bom.element.Dimension.getSize(this.getContainerElement());
        
          var arrowSize = 12;
        
          var position = qx.util.placement.Placement.compute(popupDimension,{
            width:viewPortWidth,
            height:viewPortHeight
          },anchorPosition,{
            left:0,
            right:0,
            top:arrowSize,
            bottom:arrowSize
          },"bottom-left","keep-align","keep-align");
        
          // Reset Anchor.
          this._resetPosition();
          this.__arrow.removeCssClass('popupAnchorPointerTop');
          this.__arrow.removeCssClass('popupAnchorPointerTopRight');
          this.__arrow.removeCssClass('popupAnchorPointerBottom');
          this.__arrow.removeCssClass('popupAnchorPointerBottomRight');
        
          this.placeTo(position.left,position.top);
        
          var isTop = anchorPosition.top > position.top;
          var isLeft = anchorPosition.left > position.left;
          
          var isOutsideViewPort = position.top < 0 
            || position.left < 0 
            || position.left + popupDimension.width > viewPortWidth 
            || position.top + popupDimension.height > viewPortHeight;
          
          if(isOutsideViewPort) {
            this._positionToCenter();
          } else {
            if(isTop) {
              if(isLeft) {
                this.__arrow.addCssClass('popupAnchorPointerBottomRight');
              } else {
                this.__arrow.addCssClass('popupAnchorPointerBottom');
              }
            } else {
              if(isLeft) {
                this.__arrow.addCssClass('popupAnchorPointerTopRight');
              } else {
                this.__arrow.addCssClass('popupAnchorPointerTop');
              }
            }
          }
          
      } else if (this.__childrenContainer) {
        // No Anchor
        this._positionToCenter();
      }
    },


    /**
     * This method shows the popup.
     * First it updates the position, then registers the event handlers, and shows it.
     */
    show : function()
    {
      if (!this.__isShown)
      {
        this.__registerEventListener();

        // Move outside of viewport
        this.placeTo(-1000,-1000);

        // Needs to be added to screen, before rendering position, for calculating
        // objects height.
        this.base(arguments);

        // Now render position.
        this._updatePosition();
      }
      this.__isShown = true;
    },


    /**
     * Hides the popup.
     */
    hide : function()
    {
      if (this.__isShown)
      {
        this.__unregisterEventListener();
        this.exclude();
      }
      this.__isShown = false;
    },


    /**
     * Returns the shown state of this popup.
     * @return {Boolean} whether the popup is shown or not.
     */
    isShown : function() {
      return this.__isShown;
    },


    /**
     * Toggles the visibility of this popup.
     */
    toggleVisibility : function() {
      if(this.__isShown == true) {
        this.hide();
      } else {
        this.show();
      }
    },


    /**
     * This method positions the popup widget at the coordinates specified.
     * @param left {Integer} - the value the will be set to container's left style property
     * @param top {Integer} - the value the will be set to container's top style property
     */
    placeTo : function(left, top)
    {
      this._positionTo(left, top);
    },


    /**
     * This protected method positions the popup widget at the coordinates specified.
     * It is used internally by the placeTo and _updatePosition methods
     * @param left {Integer}  the value the will be set to container's left style property
     * @param top {Integer} the value the will be set to container's top style property
     */
    _positionTo : function(left, top) {
      this.getContainerElement().style.left = left + "px";
      this.getContainerElement().style.top = top + "px";
    },


    /**
     * Centers this widget to window's center position.
     */
    _positionToCenter : function() {
      var childDimension = qx.bom.element.Dimension.getSize(this.getContainerElement());

      this.getContainerElement().style.left = "50%";
      this.getContainerElement().style.top = "50%";
      this.getContainerElement().style.marginLeft = -(childDimension.width/2) + "px";
      this.getContainerElement().style.marginTop = -(childDimension.height/2) + "px";
    },


    /**
     * Resets the position of this element (left, top, margins...)
     */
    _resetPosition : function() {
      this.getContainerElement().style.left = null;
      this.getContainerElement().style.top = null;
      this.getContainerElement().style.marginLeft = null;
      this.getContainerElement().style.marginTop = null;
    },


    /**
     * Registers all needed event listeners
     */
    __registerEventListener : function()
    {
      qx.event.Registration.addListener(window, "resize", this._updatePosition, this);
      /*if (qx.core.Environment.get("qx.mobile.nativescroll") == false)
      {
        qx.event.message.Bus.getInstance().subscribe("iscrollstart", this.hide, this);
      }
      else
      {
        qx.event.Registration.addListener(window, "scroll", this.hide, this);
      }*/
    },


    /**
     * Unregisters all needed event listeners
     */
    __unregisterEventListener : function()
    {
      qx.event.Registration.removeListener(window, "resize", this._updatePosition, this);
      /*if (qx.core.Environment.get("qx.mobile.nativescroll") == false)
      {
        qx.event.Registration.removeListener(window, "iscrollstart", this.hide, this);
      }
      else
      {
        qx.event.Registration.removeListener(window, "scroll", this.hide, this);
      }*/
    },


    /**
     * This method creates the container where the popup's widget will be placed
     * and adds it to the popup.
     * @param widget {qx.ui.mobile.core.Widget} - what to show in the popup
     *
     */
    _initializeChild : function(widget)
    {
      if(this.__childrenContainer == null) {
        this.__childrenContainer = new qx.ui.mobile.container.Composite(new qx.ui.mobile.layout.VBox().set({alignY: "middle"}));
        this.__childrenContainer.setDefaultCssClass("popup-content")
        this._add(this.__childrenContainer);
      }

      if(this._createTitleWidget()) {
        this.__childrenContainer.remove(this._createTitleWidget());
        this.__childrenContainer.add(this._createTitleWidget());
      }

      this.__childrenContainer.add(widget, {flex:1});

      this.__widget = widget;
    },


    /**
     * Creates the title atom widget.
     *
     * @return {qx.ui.mobile.basic.Atom} The title atom widget.
     */
    _createTitleWidget : function()
    {
      if(this.__titleWidget) {
        return this.__titleWidget;
      }
      if(this.getTitle() || this.getIcon())
      {
        this.__titleWidget = new qx.ui.mobile.basic.Atom(this.getTitle(), this.getIcon());
        this.__titleWidget.addCssClass('dialogTitleUnderline');
        return this.__titleWidget;
      }
      else
      {
        return null;
      }
    },


    // property apply
    _applyTitle : function(value, old)
    {
      if(value) {
        if(this.__titleWidget)
        {
          this.__titleWidget.setLabel(value);
        }
        else
        {
          this.__titleWidget = new qx.ui.mobile.basic.Atom(value, this.getIcon());
          this.__titleWidget.addCssClass('dialogTitleUnderline');

          if(this.__widget) {
            this.__childrenContainer.addBefore(this._createTitleWidget(), this.__widget);
          } else {
            if(this.__childrenContainer) {
              this.__childrenContainer.add(this._createTitleWidget());
            }
          }
        }
      }
    },


    // property apply
    _applyIcon : function(value, old)
    {
      if(value) {
        if(this.__titleWidget)
        {
          this.__titleWidget.setIcon(value);
        }
        else
        {
          this.__titleWidget = new qx.ui.mobile.basic.Atom(this.getTitle(), value);
          this.__titleWidget.addCssClass('dialogTitleUnderline');

          if(this.__widget) {
            this.__childrenContainer.addBefore(this._createTitleWidget(), this.__widget);
          } else {
            if(this.__childrenContainer) {
              this.__childrenContainer.add(this._createTitleWidget());
            }
          }
        }
      }
    },


    /**
     * Adds the widget that will be shown in this popup. This method can be used in the case when you have removed the widget from the popup
     * or you haven't passed it in the constructor.
     * @param widget {qx.ui.mobile.core.Widget} - what to show in the popup
     */
    add : function(widget)
    {
      this.removeWidget();
      this._initializeChild(widget);
    },


    /**
     * A widget to attach this popup to.
     *
     * @param widget {qx.ui.mobile.core.Widget} The anchor widget.
     */
    setAnchor : function(widget) {
      this.__anchor = widget;
    },


    /**
     * Returns the title widget.
     *
     * @return {qx.ui.mobile.basic.Atom} The title widget.
     */
    getTitleWidget : function() {
      return this.__titleWidget;
    },


    /**
     * This method removes the widget shown in the popup.
     * @return {qx.ui.mobile.core.Widget|null} The removed widget or <code>null</code>
     * if the popup doesn't have an attached widget
     */
    removeWidget : function()
    {
      if(this.__widget)
      {
        this.__childrenContainer.remove(this.__widget);
        return this.__widget;
      }
      else
      {
        if (qx.core.Environment.get("qx.debug")) {
          qx.log.Logger.debug(this, "this popup has no widget attached yet");
        }
        return null;
      }
    }
  },


  /*
  *****************************************************************************
     DESTRUCTOR
  *****************************************************************************
  */

  destruct : function()
  {
    this.__unregisterEventListener();
    this._disposeObjects("__childrenContainer","__arrow");
  }
});
/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2009 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Sebastian Werner (wpbasti)
     * Fabian Jakobs (fjakobs)
     * Christian Hagendorn (chris_schmidt)

************************************************************************ */

/**
 * Contains methods to compute a position for any object which should
 * be positioned relative to another object.
 */
qx.Class.define("qx.util.placement.Placement",
{
  extend : qx.core.Object,

  construct : function()
  {
    this.base(arguments);
    this.__defaultAxis = qx.util.placement.DirectAxis;
  },


  properties :
  {
    /**
     * The axis object to use for the horizontal placement
     */
    axisX : {
      check: "Class"
    },

    /**
     * The axis object to use for the vertical placement
     */
    axisY : {
      check: "Class"
    },

    /**
     * Specify to which edge of the target object, the object should be attached
     */
    edge : {
      check: ["top", "right", "bottom", "left"],
      init: "top"
    },

    /**
     * Specify with which edge of the target object, the object should be aligned
     */
    align : {
      check: ["top", "right", "bottom", "left", "center", "middle"],
      init: "right"
    }
  },


  statics :
  {
    __instance : null,

    /**
     * DOM and widget independent method to compute the location
     * of an object to make it relative to any other object.
     *
     * @param size {Map} With the keys <code>width</code> and <code>height</code>
     *   of the object to align
     * @param area {Map} Available area to position the object. Has the keys
     *   <code>width</code> and <code>height</code>. Normally this is the parent
     *   object of the one to align.
     * @param target {Map} Location of the object to align the object to. This map
     *   should have the keys <code>left</code>, <code>top</code>, <code>right</code>
     *   and <code>bottom</code>.
     * @param offsets {Map} Map with all offsets for each direction.
     *   Comes with the keys <code>left</code>, <code>top</code>,
     *   <code>right</code> and <code>bottom</code>.
     * @param position {String} Alignment of the object on the target, any of
     *   "top-left", "top-center", "top-right", "bottom-left", "bottom-center", "bottom-right",
     *   "left-top", "left-middle", "left-bottom", "right-top", "right-middle", "right-bottom".
     * @param modeX {String} Horizontal placement mode. Valid values are:
     *   <ul>
     *   <li><code>direct</code>: place the object directly at the given
     *   location.</li>
     *   <li><code>keep-align</code>: if parts of the object is outside of the visible
     *   area it is moved to the best fitting 'edge' and 'alignment' of the target.
     *   It is guaranteed the the new position attaches the object to one of the
     *   target edges and that that is aligned with a target edge.</li>
     *   <li>best-fit</li>: If parts of the object are outside of the visible
     *   area it is moved into the view port ignoring any offset, and position
     *   values.
     *   </ul>
     * @param modeY {String} Vertical placement mode. Accepts the same values as
     *   the 'modeX' argument.
     * @return {Map} A map with the final location stored in the keys
     *   <code>left</code> and <code>top</code>.
     */
    compute: function(size, area, target, offsets, position, modeX, modeY)
    {
      this.__instance = this.__instance || new qx.util.placement.Placement();

      var splitted = position.split("-");
      var edge = splitted[0];
      var align = splitted[1];

      if (qx.core.Environment.get("qx.debug"))
      {
        if (align === "center" || align === "middle")
        {
          var expected = "middle";
          if (edge === "top" || edge === "bottom") {
            expected = "center";
          }
          qx.core.Assert.assertEquals(expected, align, "Please use '" + edge + "-" + expected + "' instead!");
        }
      }

      this.__instance.set({
        axisX: this.__getAxis(modeX),
        axisY: this.__getAxis(modeY),
        edge: edge,
        align: align
      });

      return this.__instance.compute(size, area, target, offsets);
    },


    __direct : null,
    __keepAlign : null,
    __bestFit : null,

    /**
     * Get the axis implementation for the given mode
     *
     * @param mode {String} One of <code>direct</code>, <code>keep-align</code> or
     *   <code>best-fit</code>
     * @return {qx.util.placement.AbstractAxis}
     */
    __getAxis : function(mode)
    {
      switch(mode)
      {
        case "direct":
          this.__direct = this.__direct || qx.util.placement.DirectAxis;
          return this.__direct;

        case "keep-align":
          this.__keepAlign = this.__keepAlign || qx.util.placement.KeepAlignAxis;
          return this.__keepAlign;

        case "best-fit":
          this.__bestFit = this.__bestFit || qx.util.placement.BestFitAxis;
          return this.__bestFit;

        default:
          throw new Error("Invalid 'mode' argument!'");
      }
    }
  },


  members :
  {
    __defaultAxis : null,

    /**
     * DOM and widget independent method to compute the location
     * of an object to make it relative to any other object.
     *
     * @param size {Map} With the keys <code>width</code> and <code>height</code>
     *   of the object to align
     * @param area {Map} Available area to position the object. Has the keys
     *   <code>width</code> and <code>height</code>. Normally this is the parent
     *   object of the one to align.
     * @param target {Map} Location of the object to align the object to. This map
     *   should have the keys <code>left</code>, <code>top</code>, <code>right</code>
     *   and <code>bottom</code>.
     * @param offsets {Map} Map with all offsets for each direction.
     *   Comes with the keys <code>left</code>, <code>top</code>,
     *   <code>right</code> and <code>bottom</code>.
     * @return {Map} A map with the final location stored in the keys
     *   <code>left</code> and <code>top</code>.
     */
    compute : function(size, area, target, offsets)
    {
      if (qx.core.Environment.get("qx.debug"))
      {
        this.assertObject(size, "size");
        this.assertNumber(size.width, "size.width");
        this.assertNumber(size.height, "size.height");

        this.assertObject(area, "area");
        this.assertNumber(area.width, "area.width");
        this.assertNumber(area.height, "area.height");

        this.assertObject(target, "target");
        this.assertNumber(target.top, "target.top");
        this.assertNumber(target.right, "target.right");
        this.assertNumber(target.bottom, "target.bottom");
        this.assertNumber(target.left, "target.left");

        this.assertObject(offsets, "offsets");
        this.assertNumber(offsets.top, "offsets.top");
        this.assertNumber(offsets.right, "offsets.right");
        this.assertNumber(offsets.bottom, "offsets.bottom");
        this.assertNumber(offsets.left, "offsets.left");
      }

      var axisX = this.getAxisX() || this.__defaultAxis;
      var left = axisX.computeStart(
        size.width,
        {start: target.left, end: target.right},
        {start: offsets.left, end: offsets.right},
        area.width,
        this.__getPositionX()
      );

      var axisY = this.getAxisY() || this.__defaultAxis;
      var top = axisY.computeStart(
        size.height,
        {start: target.top, end: target.bottom},
        {start: offsets.top, end: offsets.bottom},
        area.height,
        this.__getPositionY()
      );

      return {
        left: left,
        top: top
      }
    },


    /**
     * Get the position value for the horizontal axis
     *
     * @return {String} the position
     */
    __getPositionX : function()
    {
      var edge = this.getEdge();
      var align = this.getAlign();

      if (edge == "left") {
        return "edge-start";
      } else if (edge == "right") {
        return "edge-end";
      } else if (align == "left") {
        return "align-start";
      } else if (align == "center") {
        return "align-center";
      } else if (align == "right") {
        return "align-end";
      }
    },


    /**
     * Get the position value for the vertical axis
     *
     * @return {String} the position
     */
    __getPositionY : function()
    {
      var edge = this.getEdge();
      var align = this.getAlign();

      if (edge == "top") {
        return "edge-start";
      } else if (edge == "bottom") {
        return "edge-end";
      } else if (align == "top") {
        return "align-start";
      } else if (align == "middle") {
        return "align-center";
      } else if (align == "bottom") {
        return "align-end";
      }
    }
  },


  destruct : function()
  {
    this._disposeObjects('__defaultAxis');
  }
});/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2009 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Fabian Jakobs (fjakobs)
     * Christian Hagendorn (chris_schmidt)

************************************************************************ */

/**
 * Abstract class to compute the position of an object on one axis.
 */
qx.Bootstrap.define("qx.util.placement.AbstractAxis",
{
  extend : Object,

  statics :
  {
    /**
     * Computes the start of the object on the axis
     *
     * @param size {Integer} Size of the object to align
     * @param target {Map} Location of the object to align the object to. This map
     *   should have the keys <code>start</code> and <code>end</code>.
     * @param offsets {Map} Map with all offsets on each side.
     *   Comes with the keys <code>start</code> and <code>end</code>.
     * @param areaSize {Integer} Size of the axis.
     * @param position {String} Alignment of the object on the target. Valid values are
     *   <ul>
     *   <li><code>edge-start</code> The object is placed before the target</li>
     *   <li><code>edge-end</code> The object is placed after the target</li>
     *   <li><code>align-start</code>The start of the object is aligned with the start of the target</li>
     *   <li><code>align-center</code>The center of the object is aligned with the center of the target</li>
     *   <li><code>align-end</code>The end of the object is aligned with the end of the object</li>
     *   </ul>
     * @return {Integer} The computed start position of the object.
     * @abstract
     */
    computeStart : function(size, target, offsets, areaSize, position) {
      throw new Error("abstract method call!");
    },


    /**
     * Computes the start of the object by taking only the attachment and
     * alignment into account. The object by be not fully visible.
     *
     * @param size {Integer} Size of the object to align
     * @param target {Map} Location of the object to align the object to. This map
     *   should have the keys <code>start</code> and <code>end</code>.
     * @param offsets {Map} Map with all offsets on each side.
     *   Comes with the keys <code>start</code> and <code>end</code>.
     * @param position {String} Accepts the same values as the <code> position</code>
     *   argument of {@link #computeStart}.
     * @return {Integer} The computed start position of the object.
     */
    _moveToEdgeAndAlign : function(size, target, offsets, position)
    {
      switch(position)
      {
        case "edge-start":
          return target.start - offsets.end - size;

        case "edge-end":
          return target.end + offsets.start;

        case "align-start":
          return target.start + offsets.start;

        case "align-center":
          return target.start + parseInt((target.end - target.start - size) / 2, 10) + offsets.start;

        case "align-end":
          return target.end - offsets.end - size;
      }
    },


    /**
     * Whether the object specified by <code>start</code> and <code>size</code>
     * is completely inside of the axis' range..
     *
     * @param start {Integer} Computed start position of the object
     * @param size {Integer} Size of the object
     * @param areaSize {Integer} The size of the axis
     * @return {Boolean} Whether the object is inside of the axis' range
     */
    _isInRange : function(start, size, areaSize) {
      return start >= 0 && start + size <= areaSize;
    }
  }
});
/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2009 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Fabian Jakobs (fjakobs)
     * Christian Hagendorn (chris_schmidt)

************************************************************************ */

/**
 * Places the object directly at the specified position. It is not moved if
 * parts of the object are outside of the axis' range.
 */
qx.Bootstrap.define("qx.util.placement.DirectAxis",
{
  statics :
  {
    /**
     * Computes the start of the object by taking only the attachment and
     * alignment into account. The object by be not fully visible.
     *
     * @param size {Integer} Size of the object to align
     * @param target {Map} Location of the object to align the object to. This map
     *   should have the keys <code>start</code> and <code>end</code>.
     * @param offsets {Map} Map with all offsets on each side.
     *   Comes with the keys <code>start</code> and <code>end</code>.
     * @param position {String} Accepts the same values as the <code> position</code>
     *   argument of {@link #computeStart}.
     * @return {Integer} The computed start position of the object.
     */
    _moveToEdgeAndAlign : qx.util.placement.AbstractAxis._moveToEdgeAndAlign,

    /**
     * Computes the start of the object on the axis
     *
     * @param size {Integer} Size of the object to align
     * @param target {Map} Location of the object to align the object to. This map
     *   should have the keys <code>start</code> and <code>end</code>.
     * @param offsets {Map} Map with all offsets on each side.
     *   Comes with the keys <code>start</code> and <code>end</code>.
     * @param areaSize {Integer} Size of the axis.
     * @param position {String} Alignment of the object on the target. Valid values are
     *   <ul>
     *   <li><code>edge-start</code> The object is placed before the target</li>
     *   <li><code>edge-end</code> The object is placed after the target</li>
     *   <li><code>align-start</code>The start of the object is aligned with the start of the target</li>
     *   <li><code>align-center</code>The center of the object is aligned with the center of the target</li>
     *   <li><code>align-end</code>The end of the object is aligned with the end of the object</li>
     *   </ul>
     * @return {Integer} The computed start position of the object.
     */
    computeStart : function(size, target, offsets, areaSize, position) {
      return this._moveToEdgeAndAlign(size, target, offsets, position);
    }
  }
});/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2009 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Fabian Jakobs (fjakobs)
     * Christian Hagendorn (chris_schmidt)

************************************************************************ */

/**
 * Places the object to the target. If parts of the object are outside of the
 * range this class places the object at the best "edge", "alignment"
 * combination so that the overlap between object and range is maximized.
 */
qx.Bootstrap.define("qx.util.placement.KeepAlignAxis",
{
  statics :
  {
    /**
     * Computes the start of the object by taking only the attachment and
     * alignment into account. The object by be not fully visible.
     *
     * @param size {Integer} Size of the object to align
     * @param target {Map} Location of the object to align the object to. This map
     *   should have the keys <code>start</code> and <code>end</code>.
     * @param offsets {Map} Map with all offsets on each side.
     *   Comes with the keys <code>start</code> and <code>end</code>.
     * @param position {String} Accepts the same values as the <code> position</code>
     *   argument of {@link #computeStart}.
     * @return {Integer} The computed start position of the object.
     */
    _moveToEdgeAndAlign : qx.util.placement.AbstractAxis._moveToEdgeAndAlign,

    /**
     * Whether the object specified by <code>start</code> and <code>size</code>
     * is completely inside of the axis' range..
     *
     * @param start {Integer} Computed start position of the object
     * @param size {Integer} Size of the object
     * @param areaSize {Integer} The size of the axis
     * @return {Boolean} Whether the object is inside of the axis' range
     */
    _isInRange : qx.util.placement.AbstractAxis._isInRange,

    /**
     * Computes the start of the object on the axis
     *
     * @param size {Integer} Size of the object to align
     * @param target {Map} Location of the object to align the object to. This map
     *   should have the keys <code>start</code> and <code>end</code>.
     * @param offsets {Map} Map with all offsets on each side.
     *   Comes with the keys <code>start</code> and <code>end</code>.
     * @param areaSize {Integer} Size of the axis.
     * @param position {String} Alignment of the object on the target. Valid values are
     *   <ul>
     *   <li><code>edge-start</code> The object is placed before the target</li>
     *   <li><code>edge-end</code> The object is placed after the target</li>
     *   <li><code>align-start</code>The start of the object is aligned with the start of the target</li>
     *   <li><code>align-center</code>The center of the object is aligned with the center of the target</li>
     *   <li><code>align-end</code>The end of the object is aligned with the end of the object</li>
     *   </ul>
     * @return {Integer} The computed start position of the object.
     */
    computeStart : function(size, target, offsets, areaSize, position)
    {
      var start = this._moveToEdgeAndAlign(size, target, offsets, position);
      var range1End, range2Start;

      if (this._isInRange(start, size, areaSize)) {
        return start;
      }

      if (position == "edge-start" || position == "edge-end")
      {
        range1End = target.start - offsets.end;
        range2Start = target.end + offsets.start;
      }
      else
      {
        range1End = target.end - offsets.end;
        range2Start = target.start + offsets.start;
      }

      if (range1End > areaSize - range2Start) {
        start = range1End - size;
      } else {
        start = range2Start;
      }

      return start;
    }
  }
});/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2009 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Fabian Jakobs (fjakobs)
     * Christian Hagendorn (chris_schmidt)

************************************************************************ */

/**
 * Places the object according to the target. If parts of the object are outside
 * of the axis' range the object's start is adjusted so that the overlap between
 * the object and the axis is maximized.
 */
qx.Bootstrap.define("qx.util.placement.BestFitAxis",
{
  statics :
  {
    /**
     * Whether the object specified by <code>start</code> and <code>size</code>
     * is completely inside of the axis' range..
     *
     * @param start {Integer} Computed start position of the object
     * @param size {Integer} Size of the object
     * @param areaSize {Integer} The size of the axis
     * @return {Boolean} Whether the object is inside of the axis' range
     */
    _isInRange : qx.util.placement.AbstractAxis._isInRange,

    /**
     * Computes the start of the object by taking only the attachment and
     * alignment into account. The object by be not fully visible.
     *
     * @param size {Integer} Size of the object to align
     * @param target {Map} Location of the object to align the object to. This map
     *   should have the keys <code>start</code> and <code>end</code>.
     * @param offsets {Map} Map with all offsets on each side.
     *   Comes with the keys <code>start</code> and <code>end</code>.
     * @param position {String} Accepts the same values as the <code> position</code>
     *   argument of {@link #computeStart}.
     * @return {Integer} The computed start position of the object.
     */
    _moveToEdgeAndAlign : qx.util.placement.AbstractAxis._moveToEdgeAndAlign,

    /**
     * Computes the start of the object on the axis
     *
     * @param size {Integer} Size of the object to align
     * @param target {Map} Location of the object to align the object to. This map
     *   should have the keys <code>start</code> and <code>end</code>.
     * @param offsets {Map} Map with all offsets on each side.
     *   Comes with the keys <code>start</code> and <code>end</code>.
     * @param areaSize {Integer} Size of the axis.
     * @param position {String} Alignment of the object on the target. Valid values are
     *   <ul>
     *   <li><code>edge-start</code> The object is placed before the target</li>
     *   <li><code>edge-end</code> The object is placed after the target</li>
     *   <li><code>align-start</code>The start of the object is aligned with the start of the target</li>
     *   <li><code>align-center</code>The center of the object is aligned with the center of the target</li>
     *   <li><code>align-end</code>The end of the object is aligned with the end of the object</li>
     *   </ul>
     * @return {Integer} The computed start position of the object.
     */
    computeStart : function(size, target, offsets, areaSize, position)
    {
      var start = this._moveToEdgeAndAlign(size, target, offsets, position);

      if (this._isInRange(start, size, areaSize)) {
        return start;
      }

      if (start < 0) {
        start = Math.min(0, areaSize - size);
      }

      if (start + size > areaSize) {
        start = Math.max(0, areaSize - size);
      }

      return start;
    }
  }
});
/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2011 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Gabriel Munteanu (gabios)

************************************************************************ */

/**
 * This widget displays a dialog.
 *
 * *Example*
 *
 * <pre class='javascript'>
 * var label = new qx.ui.mobile.basic.Label("Hello World");
 * var dialog = new qx.ui.mobile.dialog.Dialog(label);
 * dialog.setTitle("Info");
 * dialog.setModal(true); // true by default
 * dialog.show();
 * </pre>
 *
 * This example creates a label widget and adds this widget to a dialog.
 */
qx.Class.define("qx.ui.mobile.dialog.Dialog",
{
  extend : qx.ui.mobile.dialog.Popup,

  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  properties :
  {
    // overridden
    defaultCssClass :
    {
      refine : true,
      init : "dialog"
    },


    /**
     * Whether the dialog should be displayed modal.
     */
    modal :
    {
      init : true,
      check : "Boolean",
      nullable: false
    }

  },


  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {

    __blocker : false,


    /**
     * Shows the blocker.
     */
    show : function()
    {
      if(this.getModal())
      {
        this._getBlocker().show();
      }
      this.base(arguments);
    },


    /**
     * Hides the blocker. The blocker is only hidden when the hide method
     * is called as many times as the {@link #show} method.
     */
    hide : function()
    {
      if(this.getModal())
      {
        this._getBlocker().hide();
      }
      this.base(arguments);
    },


    /**
     * Returns the blocker widget.
     *
     * @return {qx.ui.mobile.core.Blocker} Returns the blocker widget.
     */
    _getBlocker : function()
    {
      if(!this.__blocker) {
        this.__blocker = new qx.ui.mobile.core.Blocker();
        this.__blocker.hide();
        qx.core.Init.getApplication().getRoot().add(this.__blocker);
        var blockerZIndex = qx.bom.element.Style.get(this.__blocker.getContainerElement(), 'zIndex');
        blockerZIndex = parseInt(blockerZIndex) +1;
        qx.bom.element.Style.set(this.getContainerElement(), 'zIndex', blockerZIndex);
      }
      return this.__blocker;
    }

  }

});
/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2011 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Tino Butz (tbtz)

************************************************************************ */

/**
 * This class blocks events and can be included into all widgets.
 *
 */
qx.Class.define("qx.ui.mobile.core.Blocker",
{
  extend : qx.ui.mobile.core.Widget,


  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  properties :
  {
    // overridden
    defaultCssClass :
    {
      refine : true,
      init : "blocker"
    }
  },




  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    __count : 0,


    /**
     * Shows the blocker. When the show method is called a counter is incremented.
     * The {@link #hide} method needs to be called as many times as the {@link #show}
     * method. This behavior is useful, when you want to show a loading indicator.
     */
    show : function()
    {
      if (this.__count == 0)
      {
        this._updateSize();
        this.__registerEventListener();
        this.base(arguments);
      }
      this.__count++;
    },


    /**
     * Hides the blocker. The blocker is only hidden when the hide method
     * is called as many times as the {@link #show} method.
     */
    hide : function()
    {
      this.__count--;
      if (this.__count <= 0)
      {
        this.__count = 0;
        this.__unregisterEventListener();
        this.exclude();
      }
    },


    /**
     * Force the blocker to hide, even when the show counter is larger than
     * zero.
     */
    forceHide : function()
    {
      this.__count = 0;
      this.hide();
    },


    /**
     * Whether the blocker is shown or not.
     * @return {Boolean} <code>true</code> if the blocker is shown
     */
    isShown : function()
    {
      return this.__count > 0;
    },


    /**
     * Event handler. Called whenever the size of the blocker should be updated.
     */
    _updateSize : function()
    {
      if(qx.core.Init.getApplication().getRoot() == this.getLayoutParent())
      {
        this.getContainerElement().style.top = qx.bom.Viewport.getScrollTop() + "px";
        this.getContainerElement().style.left = qx.bom.Viewport.getScrollLeft() + "px";
        this.getContainerElement().style.width = qx.bom.Viewport.getWidth() + "px";
        this.getContainerElement().style.height = qx.bom.Viewport.getHeight()  + "px";
      }
      else
      {
        var dimension = qx.bom.element.Dimension.getSize(this.getLayoutParent().getContainerElement());
        this.getContainerElement().style.width = dimension.width + "px";
        this.getContainerElement().style.height = dimension.height  + "px";
      }
    },


    /**
     * Event handler. Called when the touch event occurs.
     * Prevents the default of the event.
     *
     * @param evt {qx.event.type.Touch} The touch event
     */
    _onTouch : function(evt)
    {
      evt.preventDefault();
    },


    /**
     * Event handler. Called when the scroll event occurs.
     *
     * @param evt {qx.event.type.Touch} The touch event
     */
    _onScroll : function(evt)
    {
      this._updateSize();
    },


    /**
     * Registers all needed event listener.
     */
    __registerEventListener : function()
    {
      qx.event.Registration.addListener(window, "resize", this._updateSize, this);
      qx.event.Registration.addListener(window, "scroll", this._onScroll, this);
      this.addListener("touchstart", this._onTouch, this);
      this.addListener("touchmove", this._onTouch, this);
    },


    /**
     * Unregisters all needed event listener.
     */
    __unregisterEventListener : function()
    {
      qx.event.Registration.removeListener(window, "resize", this._updateSize, this);
      qx.event.Registration.removeListener(window, "scroll", this._onScroll, this);
      this.removeListener("touchstart", this._onTouch, this);
      this.removeListener("touchmove", this._onTouch, this);
    }
  },




  /*
  *****************************************************************************
     DESTRUCTOR
  *****************************************************************************
  */

  destruct : function()
  {
    this.__unregisterEventListener();
  }
});
