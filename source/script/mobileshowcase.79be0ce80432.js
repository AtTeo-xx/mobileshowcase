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
 * Shows a title text for {@link Form} or {@link Group}.
 */
qx.Class.define("qx.ui.mobile.form.Title",
{
  extend : qx.ui.mobile.basic.Label,


  properties :
  {
    wrap :
    {
      refine : true,
      init : false
    }
  },


  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    // overridden
    _getTagName : function()
    {
      return "h2";
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
 * A toolbar widget.
 *
 */
qx.Class.define("qx.ui.mobile.toolbar.ToolBar",
{
  extend : qx.ui.mobile.container.Composite,


 /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */
  construct : function(layout)
  {
    this.base(arguments, layout);
    if (!layout) {
      this.setLayout(new qx.ui.mobile.layout.HBox().set({
        alignY : "middle"
      }));
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
      init : "toolbar"
    }
  },

  members :
  {

    /**
      * Flag to keep the show/hidden state of the toolbar
      */
    __hidden: false,


    /**
      * Adds a new child widget.
      *
      * @param child {qx.ui.mobile.core.Widget} the widget to add.
      * @param layoutProperties {Map?null} Optional layout data for widget.
      */
    add : function(child, layoutProperties)
    {
      if(!(child instanceof qx.ui.mobile.toolbar.Separator))
      {
        layoutProperties = layoutProperties ? layoutProperties : {};
        qx.lang.Object.mergeWith(layoutProperties, {flex: 1}, false);
      }
      this.base(arguments, child, layoutProperties);
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
 * A separator widget used to separate widgets in a toolbar.
 *
 */
qx.Class.define("qx.ui.mobile.toolbar.Separator",
{
  extend : qx.ui.mobile.core.Widget,

  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

    construct : function()
    {
      this.base(arguments);
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
        init : "toolbar-separator"
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
 * A button used in toolbars.
 *
 */
qx.Class.define("qx.ui.mobile.toolbar.Button",
{
  extend : qx.ui.mobile.form.Button,

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
      init : "toolbar-button"
    }
  }

});/* ************************************************************************

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
 * Very basic dialog manager. Displays a native alert or confirm dialog if
 * the application is running in a PhoneGap environment. For debugging in a browser
 * it displays the browser <code>alert</code> or <code>confirm</code> dialog. In the near
 * future this should be replaced by dialog widgets.
 *
 * *Example*
 *
 * Here is a little example of how to use the widget.
 *
 * <pre class='javascript'>
 *    var buttons = [];
 *    buttons.push(qx.locale.Manager.tr("OK"));
 *    buttons.push(qx.locale.Manager.tr("Cancel"));
 *    var title = "Delete item";
 *    var text = "Do you want to delete the item?"
 *    qx.ui.mobile.dialog.Manager.getInstance().confirm(title, text, function(index) {
 *      if (index==1) {
 *        // delete the item
 *      }
 *    }, this, buttons);
 * </pre>
 *
 * This example displays a confirm dialog and defines a button click handler.
 */
qx.Class.define("qx.ui.mobile.dialog.Manager",
{
  extend : qx.core.Object,
  type : "singleton",


  /*
  *****************************************************************************
     STATICS
  *****************************************************************************
  */

  statics:
  {
    INPUT_DIALOG: 1,
    MESSAGE_DIALOG: 2,
    WARNING_DIALOG: 3,
    ERROR_DIALOG: 4,
    WAITING_DIALOG: 5
  },

  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    /**
     * Displays an alert box. When the application is running in a PhoneGap
     * environment, a native alert box is shown. When debugging in a browser, a
     * browser alert is shown.
     *
     * @param title {String} The title of the alert box
     * @param text {String} The text to display in the alert box
     * @param handler {Function} The handler to call when the <code>OK</code> button
     *     was pressed
     * @param scope {Object} The scope of the handler
     * @param button {String} The button title
     * @return {qx.ui.mobile.dialog.Dialog|Object} a reference to an alert dialog
     *          instance. An <code>Object</code>, if environment is
     *          <code>phonegap</code>, or a {@link qx.ui.mobile.dialog.Dialog}
     *          if not.
     * @lint ignoreDeprecated(alert)
     */
    alert : function(title, text, handler, scope, button)
    {
      // TOOD : MOVE THIS TO PHONEGAP CLASS
      if (qx.core.Environment.get("phonegap") && qx.core.Environment.get("phonegap.notification")) {
        var callback = function() {
          if (handler) {
            handler.call(scope);
          }
        }
        var button = this.__processDialogButtons(button);
        return navigator.notification.alert(text, callback, title, button);
      }
      else
      {
        return this.__showNonNativeDialog(title, text, handler, scope, [button], qx.ui.mobile.dialog.Manager.MESSAGE_DIALOG);
      }
    },


    /**
     * Displays a confirm box. When the application is running in a PhoneGap
     * environment, a native confirm box is shown. When debugging in a browser, a
     * browser confirm is shown.
     *
     * @param title {String} The title of the confirm box
     * @param text {String} The text to display in the confirm box
     * @param handler {Function} The handler to call when the <code>OK</code> button
     *     was pressed. The first parameter of the function is the <code>index</code>
     *     of the pressed button, starting from 1.
     * @param scope {Object} The scope of the handler
     * @param buttons {String[]} Each text entry of the array represents a button and
     *     its title
     * @return {qx.ui.mobile.dialog.Dialog} The dialog widget
     * @lint ignoreDeprecated(confirm)
     */
    confirm : function(title, text, handler, scope, buttons)
    {
      if (qx.core.Environment.get("phonegap") && qx.core.Environment.get("phonegap.notification"))
      {
        var callback = function(index)
        {
          handler.call(scope, index-1);
        }
        var buttons = this.__processDialogButtons(buttons);
        return navigator.notification.confirm(text, callback, title, buttons);
      }
      else
      {
        return this.__showNonNativeDialog(title, text, handler, scope, buttons, qx.ui.mobile.dialog.Manager.MESSAGE_DIALOG);
      }
    },

    /**
     * Displays an input dialog.
     *
     * @param title {String} The title of the input dialog.
     * @param text {String} The text to display in the input dialog.
     * @param handler {Function} The handler to call when the <code>OK</code> button
     *     was pressed. The first parameter of the function is the <code>index</code>
     *     of the pressed button, starting from 1.
     * @param scope {Object} The scope of the handler
     * @param buttons {String[]} Each text entry of the array represents a button and
     *     its title
     * @return {qx.ui.mobile.dialog.Dialog} The dialog widget
     * @lint ignoreDeprecated(confirm)
     */
    input : function(title, text, handler, scope, buttons)
    {
      return this.__showNonNativeDialog(title, text, handler, scope, buttons, qx.ui.mobile.dialog.Manager.INPUT_DIALOG);
    },

    /**
     * Displays an error dialog. When the application is running in an PhoneGap
     * environment, a native error dialog is shown. For debugging in a browser, a
     * browser confirm is shown.
     *
     * @param title {String} The title of the error dialog.
     * @param text {String} The text to display in the error dialog.
     * @param handler {Function} The handler to call when the <code>OK</code> button
     *     was pressed. The first parameter of the function is the <code>index</code>
     *     of the pressed button, starting from 1.
     * @param scope {Object} The scope of the handler
     * @param button {String} The text entry represents a button and its title
     * @return {qx.ui.mobile.dialog.Dialog} The dialog widget
     * @lint ignoreDeprecated(confirm)
     */
    error : function(title, text, handler, scope, button)
    {
      if (qx.core.Environment.get("phonegap") && qx.core.Environment.get("phonegap.notification")) {
        var callback = function() {
          if (handler) {
            handler.call(scope);
          }
        }
        var button = this.__processDialogButtons(button);
        return navigator.notification.alert(text, callback, title, button);
      }
      else
      {
        return this.__showNonNativeDialog(title, text, handler, scope, button, qx.ui.mobile.dialog.Manager.ERROR_DIALOG);
      }
    },


    /**
     * Displays a warning dialog. When the application is running in an PhoneGap
     * environment, a native warning dialog is shown. For debugging in a browser, a
     * browser confirm is shown.
     *
     * @param title {String} The title of the warning dialog.
     * @param text {String} The text to display in the warning dialog.
     * @param handler {Function} The handler to call when the <code>OK</code> button
     *     was pressed. The first parameter of the function is the <code>index</code>
     *     of the pressed button, starting from 1.
     * @param scope {Object} The scope of the handler
     * @param button {String} The text entry represents a button and its title
     * @return {qx.ui.mobile.dialog.Dialog} The dialog widget
     * @lint ignoreDeprecated(confirm)
     */
    warning : function(title, text, handler, scope, button)
    {
      if (qx.core.Environment.get("phonegap") && qx.core.Environment.get("phonegap.notification")) {
        var callback = function() {
          if (handler) {
            handler.call(scope);
          }
        }
        var button = this.__processDialogButtons(button);
        return navigator.notification.alert(text, callback, title, button);
      }
      else
      {
        return this.__showNonNativeDialog(title, text, handler, scope, button, qx.ui.mobile.dialog.Manager.WARNING_DIALOG);
      }
    },


    /**
     * Displays a waiting dialog.
     *
     * @param title {String} The title of the waiting dialog.
     * @param text {String} The text to display in the waiting dialog.
     * @param handler {Function} The handler to call when the <code>OK</code> button
     *     was pressed. The first parameter of the function is the <code>index</code>
     *     of the pressed button, starting from 1.
     * @param scope {Object} The scope of the handler
     * @param buttons {String[]} Each text entry of the array represents a button and
     *     its title
     * @return {qx.ui.mobile.dialog.Dialog} The dialog widget
     * @lint ignoreDeprecated(confirm)
     */
    wait : function(title, text, handler, scope, buttons)
    {
      return this.__showNonNativeDialog(title, text, handler, scope, buttons, qx.ui.mobile.dialog.Manager.WAITING_DIALOG);
    },


    /**
     * Processes the dialog buttons. Converts them to PhoneGap compatible strings.
     *
     * @param buttons {String[]} Each text entry of the array represents a button and
     *     its title
     * @return {String} The concatenated, PhoneGap compatible, button string
     */
    __processDialogButtons: function(buttons)
    {
      if(buttons) {
        if(buttons instanceof Array) {
          buttons = buttons.join(",");
        } else {
          buttons = ""+buttons;
        }
      }
      return buttons;
    },


    /**
     * Shows a dialog widget.
     *
     * @param title {String} The title of the dialog.
     * @param text {String} The text to display in the dialog.
     * @param handler {Function} The handler to call when the <code>OK</code> button
     *     was pressed. The first parameter of the function is the <code>index</code>
     *     of the pressed button, starting from 1.
     * @param scope {Object} The scope of the handler
     * @param buttons {String[]} Each text entry of the array represents a button and
     *     its title
     * @return {qx.ui.mobile.dialog.Dialog} The dialog widget
     * @param dialogType {Integer} One of the static dialog types.
     */
    __showNonNativeDialog: function(title, text, handler, scope, buttons, dialogType)
    {
      var widget = new qx.ui.mobile.container.Composite(new qx.ui.mobile.layout.VBox().set({alignY: "middle"}));
      var dialog = new qx.ui.mobile.dialog.Dialog(widget);
      dialog.setTitle(title);

      if(dialogType == qx.ui.mobile.dialog.Manager.ERROR_DIALOG) {
        dialog.setIcon('qx/mobile/icon/android/warning.png');
      }
      if(dialogType == qx.ui.mobile.dialog.Manager.WARNING_DIALOG) {
        dialog.setIcon('qx/mobile/icon/android/warning.png');
      }

      if(dialogType == qx.ui.mobile.dialog.Manager.WAITING_DIALOG)
      {
        var waitingWidget = new qx.ui.mobile.container.Composite(new qx.ui.mobile.layout.HBox().set({alignX: "center"}));
        widget.add(waitingWidget);
        waitingWidget.add(new qx.ui.mobile.dialog.BusyIndicator(text));
      }
      else
      {
        var labelWidget = new qx.ui.mobile.container.Composite(new qx.ui.mobile.layout.HBox().set({alignX: "center"}));
        labelWidget.add(new qx.ui.mobile.basic.Label(text));
        widget.add(labelWidget);
        if(dialogType == qx.ui.mobile.dialog.Manager.INPUT_DIALOG)
        {
          var inputWidget = new qx.ui.mobile.container.Composite(new qx.ui.mobile.layout.HBox().set({alignX: "center"}));
          var inputText = new qx.ui.mobile.form.TextField();
          inputWidget.add(inputText);
          widget.add(inputWidget);
        }

        var container = new qx.ui.mobile.container.Composite(new qx.ui.mobile.layout.HBox().set({alignX: "center"}));
        for(var i=0, l=buttons.length; i<l; i++)
        {
          var button = new qx.ui.mobile.form.Button(buttons[i]);
          /* see the comment in android.css for width: 0 for toolbar-button class*/
          button.addCssClass('dialogButton');
          container.add(button, {flex:1});
          var callback = (function(index){
            return function()
            {
              dialog.hide();
              if(handler) {
                handler.call(scope, index, inputText ? inputText.getValue() : null);
              }
              dialog.destroy();
            };
          })(i);
          button.addListener("tap", callback);
        }
        widget.add(container);
      }
      dialog.setModal(true);
      dialog.show();
      if(inputText) {
        inputText.getContainerElement().focus();
      }
      return dialog;
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
 * The widget displays a busy indicator.
 *
 * *Example*
 *
 * Here is a little example of how to use the widget.
 *
 * <pre class='javascript'>
 *   var busyIndicator = new qx.ui.mobile.dialog.BusyIndicator("Please wait");
 *   this.getRoot().add(busyIndicator);
 * </pre>
 *
 * This example create a widget to display the busy indicator.
 */
qx.Class.define("qx.ui.mobile.dialog.BusyIndicator",
{
  extend : qx.ui.mobile.basic.Atom,

  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  /**
   * @param label {String} Label to use
   */
  construct : function(label)
  {
    // the image passed as second argument is a blank 20x20 transparent png
    this.base(arguments, label, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAQAAAAngNWGAAAAAXNSR0IArs4c6QAAAAJiS0dEAP+Hj8y/AAAACXBIWXMAAA7DAAAOwwHHb6hkAAAAB3RJTUUH2wsJDS8ybObCaQAAABBJREFUKM9jYBgFo2AUkAIAAzQAATnIy0MAAAAASUVORK5CYII=');
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
      init : "spinnerContainer"
    },


    /**
     * The spinner css class to use.
     */
    spinnerClass :
    {
      apply : "_applySpinnerClass",
      nullable : false,
      check : "String",
      init : "spinner"
    }
  },

  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    // overridden
    _createIconWidget : function(iconUrl)
    {
      var iconWidget = this.base(arguments,iconUrl);
      iconWidget.addCssClass(this.getSpinnerClass());
      return iconWidget;
    },


    // property apply
    _applySpinnerClass : function(value, old)
    {
      if (old) {
        this.getIconWidget().removeCssClass(old);
      }
      if(value) {
        this.getIconWidget().addCssClass(value);
      }
    }
  }
});
/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2008 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Martin Wittemann (martinwittemann)

************************************************************************ */

/**
 * Form interface for all form widgets which have strings as their primary
 * data type like textfield's.
 */
qx.Interface.define("qx.ui.form.IStringForm",
{
  /*
  *****************************************************************************
     EVENTS
  *****************************************************************************
  */

  events :
  {
    /** Fired when the value was modified */
    "changeValue" : "qx.event.type.Data"
  },



  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    /*
    ---------------------------------------------------------------------------
      VALUE PROPERTY
    ---------------------------------------------------------------------------
    */

    /**
     * Sets the element's value.
     *
     * @param value {String|null} The new value of the element.
     */
    setValue : function(value) {
      return arguments.length == 1;
    },


    /**
     * Resets the element's value to its initial value.
     */
    resetValue : function() {},


    /**
     * The element's user set value.
     *
     * @return {String|null} The value.
     */
    getValue : function() {}
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
/* ************************************************************************

#require(qx.event.handler.Input)

************************************************************************ */

/**
 * The mixin contains all functionality to provide common properties for
 * text fields.
 */
qx.Mixin.define("qx.ui.mobile.form.MText",
{

  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  /**
   * @param value {var?null} The value of the widget.
   */
  construct : function(value)
  {
    this.initMaxLength();
    this.initPlaceholder();
    this.initReadOnly();

    this.addListener("keypress",function(e) {
      // On return
      if(e.getKeyCode() == 13) {
        this.blur();
      }
    }, this);
  },


  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  properties :
  {
   /**
     * Maximal number of characters that can be entered in the input field.
     */
    maxLength :
    {
      check : "PositiveInteger",
      nullable : true,
      init : null,
      apply : "_applyMaxLength"
    },


    /**
     * String value which will be shown as a hint if the field is all of:
     * unset, unfocused and enabled. Set to <code>null</code> to not show a placeholder
     * text.
     */
    placeholder :
    {
      check : "String",
      nullable : true,
      init : null,
      apply : "_applyAttribute"
    },


    /** Whether the field is read only */
    readOnly :
    {
      check : "Boolean",
      nullable : true,
      init : null,
      apply : "_applyAttribute"
    }
  },




  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */


  members :
  {
    // property apply
    _applyMaxLength : function(value, old)
    {
      this._setAttribute("maxlength", value);
    },


    /**
     * Points the focus of the form to this widget.
     */
    focus : function() {
      var targetElement = this.getContainerElement();
      if(targetElement) {
        qx.bom.Element.focus(targetElement);
      }
    },


    /**
     * Removes the focus from this widget.
     */
    blur : function() {
      var targetElement = this.getContainerElement();
      if(targetElement) {
        qx.bom.Element.blur(targetElement);
      }
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
/* ************************************************************************

#require(qx.event.handler.Input)

************************************************************************ */

/**
 * The mixin contains all functionality to provide a value property for input
 * widgets.
 */
qx.Mixin.define("qx.ui.mobile.form.MValue",
{

  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  /**
   * @param value {var?null} The value of the widget.
   */
  construct : function(value)
  {
    if (value) {
      this.setValue(value);
    }

    qx.event.Registration.addListener(this.getContentElement(), "change", this._onChangeContent, this);
    qx.event.Registration.addListener(this.getContentElement(), "input", this._onInput, this);
  },




  /*
  *****************************************************************************
     EVENTS
  *****************************************************************************
  */

  events :
  {
    /**
     * The event is fired on every keystroke modifying the value of the field.
     *
     * The method {@link qx.event.type.Data#getData} returns the
     * current value of the text field.
     */
    "input" : "qx.event.type.Data",


    /**
     * The event is fired each time the text field looses focus and the
     * text field values has changed.
     *
     * If you change {@link #liveUpdate} to true, the changeValue event will
     * be fired after every keystroke and not only after every focus loss. In
     * that mode, the changeValue event is equal to the {@link #input} event.
     *
     * The method {@link qx.event.type.Data#getData} returns the
     * current text value of the field.
     */
    "changeValue" : "qx.event.type.Data"
  },




  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  properties :
  {
    /**
     * Whether the {@link #changeValue} event should be fired on every key
     * input. If set to true, the changeValue event is equal to the
     * {@link #input} event.
     */
    liveUpdate :
    {
      check : "Boolean",
      init : false
    }

  },




  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    __oldValue : null,


    /**
     * Converts the incoming value.
     *
     * @param value {var} The value to convert
     * @return {var} The converted value
     */
    _convertValue : function(value)
    {
      if(typeof value === 'boolean')
      {
        return value;
      }
      else if (typeof value === 'number')
      {
        return value;
      }
      else
      {
        return value || "";
      }
    },


    /**
     * Sets the value.
     *
     * @param value {var} The value to set
     */
    setValue : function(value)
    {
      value = this._convertValue(value);
      if (this.__oldValue != value)
      {
        if (this._setValue) {
          this._setValue(value);
        } else {
          this._setAttribute("value", value);
        }
        this.__fireChangeValue(value);
      }
    },

    /**
     * Returns the set value.
     *
     * @return {var} The set value
     */
    getValue : function()
    {
      return this._convertValue(this._getValue ? this._getValue() : this._getAttribute("value"));
    },


    /**
     * Resets the value.
     */
    resetValue : function()
    {
      this.setValue(null);
    },


    /**
     * Event handler. Called when the {@link #changeValue} event occurs.
     *
     * @param evt {qx.event.type.Data} The event, containing the changed content.
     */
    _onChangeContent : function(evt)
    {
      this.__fireChangeValue(this._convertValue(evt.getData()));
    },


    /**
     * Event handler. Called when the {@link #input} event occurs.
     *
     * @param evt {qx.event.type.Data} The event, containing the changed content.
     */
    _onInput : function(evt)
    {
      this.fireDataEvent("input", evt.getData(), true);
      if (this.getLiveUpdate())
      {
        this.setValue(evt.getData());
      }
    },


    /**
     * Fires the {@link #changeValue} event.
     *
     * @param value {var} The current value to fire.
     */
    __fireChangeValue : function(value)
    {
      if (this.__oldValue != value)
      {
        this.__oldValue = value;
        this.fireDataEvent("changeValue", value)
      }
    }
  }
});
/**
 * The mixin contains all functionality to provide methods
 * for form elements to manipulate their state. [usually "valid" and "invalid"]
 *
 */
qx.Mixin.define("qx.ui.mobile.form.MState",
{

  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
  /**
   * The states of the element
   */
  __states: null,

  /**
   * Adds a state to the element
   * @param state {String} the state to be added
   *
   */
    addState : function(state) {
      if(this.__states === null) {
        this.__states = {};
      }
      this.__states[state] = true;
      this.addCssClass(state);
    },

    /**
     * Checkes whether the element has the state passed as argument
     * @param state {String} the state to be checked
     * @return {Boolean} true if the element has the state, false if it doesn't.
     *
     */
    hasState : function(state) {
      return this.__states!==null && this.__states[state] ;
    },

    /**
     * Removes a state from the element
     * @param state {String} the state to be removed
     *
     */
    removeState : function(state) {
      if(this.hasState(state)) {
        delete this.__states[state];
        this.removeCssClass(state);
      }
    },

    /**
     * Replaces a state of the element with a new state.
     * If the element doesn't have the state to be removed, then th new state will
     * just be added.
     * @param oldState {String} the state to be replaced
     * @param newState {String} the state to get injected in the oldState's place
     *
     */
    replaceState : function(oldState, newState) {
      if(this.hasState(oldState))
      {
        delete this.__states[oldState];
        this.__states[newState] = true;
        this.removeCssClass(oldState);
        this.addCssClass(newState);
      }
      else
      {
        this.addState(newState);
      }
    }

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
     * Martin Wittemann (martinwittemann)

************************************************************************ */

/**
 * Mixin handling the valid and required properties for the form widgets.
 */
qx.Mixin.define("qx.ui.form.MForm",
{

  construct : function()
  {
    if (qx.core.Environment.get("qx.dynlocale")) {
      qx.locale.Manager.getInstance().addListener("changeLocale", this.__onChangeLocale, this);
    }
  },


  properties : {

    /**
     * Flag signaling if a widget is valid. If a widget is invalid, an invalid
     * state will be set.
     */
    valid : {
      check : "Boolean",
      init : true,
      apply : "_applyValid",
      event : "changeValid"
    },


    /**
     * Flag signaling if a widget is required.
     */
    required : {
      check : "Boolean",
      init : false,
      event : "changeRequired"
    },


    /**
     * Message which is shown in an invalid tooltip.
     */
    invalidMessage : {
      check : "String",
      init: "",
      event : "changeInvalidMessage"
    },


    /**
     * Message which is shown in an invalid tooltip if the {@link #required} is
     * set to true.
     */
    requiredInvalidMessage : {
      check : "String",
      nullable : true,
      event : "changeInvalidMessage"
    }
  },


  members : {
    // apply method
    _applyValid: function(value, old) {
      value ? this.removeState("invalid") : this.addState("invalid");
    },


    /**
     * Locale change event handler
     *
     * @signature function(e)
     * @param e {Event} the change event
     */
    __onChangeLocale : qx.core.Environment.select("qx.dynlocale",
    {
      "true" : function(e)
      {
        // invalid message
        var invalidMessage = this.getInvalidMessage();
        if (invalidMessage && invalidMessage.translate) {
          this.setInvalidMessage(invalidMessage.translate());
        }
        // required invalid message
        var requiredInvalidMessage = this.getRequiredInvalidMessage();
        if (requiredInvalidMessage && requiredInvalidMessage.translate) {
          this.setRequiredInvalidMessage(requiredInvalidMessage.translate());
        }
      },

      "false" : null
    })
  },


  destruct : function()
  {
    if (qx.core.Environment.get("qx.dynlocale")) {
      qx.locale.Manager.getInstance().removeListener("changeLocale", this.__onChangeLocale, this);
    }
  }
});
/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2008 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Fabian Jakobs (fjakobs)
     * Jonathan Weiß (jonathan_rass)

   ======================================================================

     This class uses documentation of the native String methods from the MDC
     documentation of Mozilla.

     License:
       CC Attribution-Sharealike License:
       http://creativecommons.org/licenses/by-sa/2.5/

************************************************************************ */

/**
 * This class emulates the built-in JavaScript String class. It can be used as
 * base class for classes, which need to derive from String.
 *
 * Instances of this class can be used in any place a JavaScript string can.
 */
qx.Class.define("qx.type.BaseString",
{
  extend : Object,

  /**
   * @param txt {String?""} Initialize with this string
   */
  construct : function(txt)
  {
    var txt = txt || "";

    // no base call needed

    this.__txt = txt;
    this.length = txt.length;
  },

  members :
  {
    $$isString : true,
    length : 0,
    __txt : null,


    /**
     * Returns a string representing the specified object.
     *
     * The valueOf method of String returns the primitive value of a String
     * object as a string data type.
     * This method is usually called internally by JavaScript and not
     * explicitly in code.
     *
     * @return {String} A new string containing the string value.
     */
    toString : function() {
      return this.__txt;
    },


    /**
     *  Returns the specified character from a string.
     *
     * Characters in a string are indexed from left to right. The index of the
     * first character is 0, and the index of the last character in a string
     * called stringName is stringName.length - 1. If the index you supply is
     * out of range, JavaScript returns an empty string.
     *
     * @signature function(index)
     * @param index {Integer} An integer between 0 and 1 less than the length
     *   of the string.
     * @return {String} The character.
     */
    charAt : null,


    /**
     * Returns the primitive value of a String object.
     *
     * The valueOf method of String returns the primitive value of a String
     * object as a string data type.
     * This method is usually called internally by JavaScript and not
     * explicitly in code.
     *
     * @signature function()
     * @return {String} A new string containing the primitive value.
     */
    valueOf : null,


    /**
     * Returns a number indicating the Unicode value of the character at the given index.
     *
     * @signature function(index)
     * @param index {Integer} An integer greater than 0 and less than the length
     *   of the string; if it is not a number, it defaults to 0.
     * @return {Integer} The number.
     */
    charCodeAt : null,


    /**
     * Combines the text of two or more strings and returns a new string.
     * Changes to the text in one string do not affect the other string.
     *
     * @signature function(stringN)
     * @param stringN {String} One or more strings to be combined.
     * @return {String} The combined string.
     */
    concat : null,


    /**
     * Returns the index within the calling String object of the first
     * occurrence of the specified value, starting the search at fromIndex,
     * returns -1 if the value is not found.
     *
     * @signature function(index, offset)
     * @param index {String} A string representing the value to search for.
     * @param offset {Integer?0} The location within the calling string to start
     *   the search from. It can be any integer between 0 and the length of the
     *   string. The default value is 0.
     * @return {Integer} The index or -1.
     */
    indexOf : null,


    /**
     * Returns the index within the calling String object of the last occurrence
     * of the specified value, or -1 if not found. The calling string is
     * searched backward, starting at fromIndex.
     *
     * @signature function(index, offset)
     * @param index {String} A string representing the value to search for.
     * @param offset {Integer?0} The location within the calling string to start
     *   the search from, indexed from left to right. It can be any integer
     *   between 0 and the length of the string. The default value is the length
     *    of the string.
     * @return {Integer} The index or -1.
     */
    lastIndexOf : null,

    /**
     * Used to retrieve the matches when matching a string against a regular
     * expression.
     *
     * If the regular expression does not include the g flag, returns the same
     * result as regexp.exec(string). If the regular expression includes the g
     * flag, the method returns an Array containing all matches.
     *
     * @signature function(regexp)
     * @param regexp {Object} A regular expression object. If a non-RegExp object
     *  obj is passed, it is implicitly converted to a RegExp by using
     *   new RegExp(obj).
     * @return {Object} The matching RegExp object or an array containing all
     *   matches.
     */
    match : null,

    /**
     * Finds a match between a regular expression and a string, and replaces the
     * matched substring with a new substring.
     *
     * @signature function(regexp, aFunction)
     * @param regexp {Object} A RegExp object. The match is replaced by the
     *   return value of parameter #2. Or a String that is to be replaced by
     *   newSubStr.
     * @param aFunction {Function} A function to be invoked to create the new
     *   substring (to put in place of the substring received from parameter
     *   #1).
     * @return {String} The new substring.
     */
    replace : null,


    /**
     * Executes the search for a match between a regular expression and this
     * String object.
     *
     * If successful, search returns the index of the regular expression inside
     * the string. Otherwise, it returns -1.
     *
     * @signature function(regexp)
     * @param regexp {Object} A regular expression object. If a non-RegExp object
     *  obj is passed, it is implicitly converted to a RegExp by using
     *   new RegExp(obj).
     * @return {Object} The matching RegExp object or -1.
     *   matches.
     */
    search : null,

    /**
     * Extracts a section of a string and returns a new string.
     *
     * Slice extracts the text from one string and returns a new string. Changes
     * to the text in one string do not affect the other string.
     * As a negative index, endSlice indicates an offset from the end of the
     * string.
     *
     * @signature function(beginslice, endSlice)
     * @param beginslice {Integer} The zero-based index at which to begin
     *   extraction.
     * @param endSlice {Integer?null} The zero-based index at which to end
     *   extraction. If omitted, slice extracts to the end of the string.
     * @return {String} The extracted string.
     */
    slice : null,

    /**
     * Splits a String object into an array of strings by separating the string
     * into substrings.
     *
     * When found, separator is removed from the string and the substrings are
     * returned in an array. If separator is omitted, the array contains one
     * element consisting of the entire string.
     *
     * If separator is a regular expression that contains capturing parentheses,
     * then each time separator is matched the results (including any undefined
     * results) of the capturing parentheses are spliced into the output array.
     * However, not all browsers support this capability.
     *
     * Note: When the string is empty, split returns an array containing one
     *
     * @signature function(separator, limit)
     * @param separator {String?null} Specifies the character to use for
     *   separating the string. The separator is treated as a string or a regular
     *   expression. If separator is omitted, the array returned contains one
     *   element consisting of the entire string.
     * @param limit {Integer?null} Integer specifying a limit on the number of
     *   splits to be found.
     * @return {Array} The Array containing substrings.
     */
    split : null,

   /**
    * Returns the characters in a string beginning at the specified location
    * through the specified number of characters.
    *
    * Start is a character index. The index of the first character is 0, and the
    * index of the last character is 1 less than the length of the string. substr
    *  begins extracting characters at start and collects length characters
    * (unless it reaches the end of the string first, in which case it will
    * return fewer).
    * If start is positive and is greater than or equal to the length of the
    * string, substr returns an empty string.
    *
    * @signature function(start, length)
    * @param start {Integer} Location at which to begin extracting characters
    *   (an integer between 0 and one less than the length of the string).
    * @param length {Integer?null} The number of characters to extract.
    * @return {String} The substring.
    */
    substr : null,

    /**
     * Returns a subset of a String object.
     *
     * substring extracts characters from indexA up to but not including indexB.
     * In particular:
     * If indexA equals indexB, substring returns an empty string.
     * If indexB is omitted, substring extracts characters to the end of the
     * string.
     * If either argument is less than 0 or is NaN, it is treated as if it were
     * 0.
     * If either argument is greater than stringName.length, it is treated as if
     * it were stringName.length.
     * If indexA is larger than indexB, then the effect of substring is as if
     * the two arguments were swapped; for example, str.substring(1, 0) == str.substring(0, 1).
     *
     * @signature function(indexA, indexB)
     * @param indexA {Integer} An integer between 0 and one less than the
     *   length of the string.
     * @param indexB {Integer?null} (optional) An integer between 0 and the
     *   length of the string.
     * @return {String} The subset.
     */
    substring : null,

    /**
     * Returns the calling string value converted to lowercase.
     * The toLowerCase method returns the value of the string converted to
     * lowercase. toLowerCase does not affect the value of the string itself.
     *
     * @signature function()
     * @return {String} The new string.
     */
    toLowerCase : null,

    /**
     * Returns the calling string value converted to uppercase.
     * The toUpperCase method returns the value of the string converted to
     * uppercase. toUpperCase does not affect the value of the string itself.
     *
     * @signature function()
     * @return {String} The new string.
     */
    toUpperCase : null,


    /**
     * Return unique hash code of object
     *
     * @return {Integer} unique hash code of the object
     */
    toHashCode : function() {
      return qx.core.ObjectRegistry.toHashCode(this);
    },


   /**
    * The characters within a string are converted to lower case while
    * respecting the current locale.
    *
    * The toLowerCase method returns the value of the string converted to
    * lowercase. toLowerCase does not affect the value of the string itself.
    *
    * @signature function()
    * @return {String} The new string.
    */
    toLocaleLowerCase : null,

   /**
    * The characters within a string are converted to upper case while
    * respecting the current locale.
    * The toUpperCase method returns the value of the string converted to
    * uppercase. toUpperCase does not affect the value of the string itself.
    *
    * @signature function()
    * @return {String} The new string.
    */
    toLocaleUpperCase : null,

    /**
     * Call the same method of the super class.
     *
     * @param args {arguments} the arguments variable of the calling method
     * @param varags {var} variable number of arguments passed to the overwritten function
     * @return {var} the return value of the method of the base class.
     */
    base : function(args, varags) {
      return qx.core.Object.prototype.base.apply(this, arguments);
    }


  },

  /*
   *****************************************************************************
      DEFER
   *****************************************************************************
   */

   defer : function(statics, members)
   {
     // add asserts into each debug build
     if (qx.core.Environment.get("qx.debug")) {
       qx.Class.include(statics, qx.core.MAssert);
     }

     var mappedFunctions = [
       'charAt',
       'charCodeAt',
       'concat',
       'indexOf',
       'lastIndexOf',
       'match',
       'replace',
       'search',
       'slice',
       'split',
       'substr',
       'substring',
       'toLowerCase',
       'toUpperCase',
       'toLocaleLowerCase',
       'toLocaleUpperCase'
     ];

     // feature/bug detection:
     // Some older Firefox version (<2) break if valueOf is overridden
     members.valueOf = members.toString;
     if (new statics("").valueOf() == null) {
       delete members.valueOf;
     }

     for (var i=0, l=mappedFunctions.length; i<l; i++) {
       members[mappedFunctions[i]] = String.prototype[mappedFunctions[i]];
     }
   }

});/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2008 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Fabian Jakobs (fjakobs)

************************************************************************ */

/**
 * This class contains the translation of a message and all information
 * to translate it again into a different language.
 */
qx.Class.define("qx.locale.LocalizedString",
{
  extend : qx.type.BaseString,

  /**
   * @param translation {String} The translated message
   * @param messageId {String} The messageId to translate
   * @param args {Array} list of arguments passed used as values for format strings
   */
  construct : function(translation, messageId, args)
  {
    this.base(arguments, translation);

    this.__messageId = messageId;
    this.__args = args;
  },

  members :
  {

    __messageId : null,
    __args : null,

    /**
     * Get a translation of the string using the current locale.
     *
     * @return {LocalizedString} This string translated using the current
     *    locale.
     */
    translate : function() {
      return qx.locale.Manager.getInstance().translate(this.__messageId, this.__args);
    }
  }
})/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2008 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Sebastian Werner (wpbasti)
     * Andreas Ecker (ecker)
     * Fabian Jakobs (fjakobs)

************************************************************************ */

/*
#require(qx.event.dispatch.Direct)
#require(qx.locale.LocalizedString)
#cldr
*/

/**
 * The qx.locale.Manager provides static translation methods (like tr()) and
 * general locale information.
 */

qx.Class.define("qx.locale.Manager",
{
  type : "singleton",
  extend : qx.core.Object,




  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  construct : function()
  {
    this.base(arguments);

    this.__translations = qx.$$translations || {};
    this.__locales      = qx.$$locales || {};

    var locale = qx.core.Environment.get("locale");
    var variant = qx.core.Environment.get("locale.variant");
    if (variant !== "") {
      locale += "_" + variant;
    }

    this.__clientLocale = locale;

    this.setLocale(locale || this.__defaultLocale);
  },




  /*
  *****************************************************************************
     STATICS
  *****************************************************************************
  */

  statics :
  {
    /**
     * Translate a message
     *
     * @param messageId {String} message id (may contain format strings)
     * @param varargs {Object} variable number of arguments applied to the format string
     * @return {String | LocalizedString} The translated message or localized string
     * @see qx.lang.String.format
     */
    tr : function(messageId, varargs)
    {
      var args = qx.lang.Array.fromArguments(arguments);
      args.splice(0, 1);

      return qx.locale.Manager.getInstance().translate(messageId, args);
    },


    /**
     * Translate a plural message
     *
     * Depending on the third argument the plural or the singular form is chosen.
     *
     * @param singularMessageId {String} message id of the singular form (may contain format strings)
     * @param pluralMessageId {String} message id of the plural form (may contain format strings)
     * @param count {Integer} singular form if equals 1, otherwise plural
     * @param varargs {Object} variable number of arguments applied to the format string
     * @return {String | LocalizedString} The translated message or localized string
     * @see qx.lang.String.format
     */
    trn : function(singularMessageId, pluralMessageId, count, varargs)
    {
      var args = qx.lang.Array.fromArguments(arguments);
      args.splice(0, 3);

      // assumes "Two forms, singular used for one only" (seems to be the most common form)
      // (http://www.gnu.org/software/gettext/manual/html_node/gettext_150.html#Plural-forms)
      // closely related with bug #745
      if (count != 1) {
        return qx.locale.Manager.getInstance().translate(pluralMessageId, args);
      } else {
        return qx.locale.Manager.getInstance().translate(singularMessageId, args);
      }
    },


    /**
     * Translate a message with translation hint
     *
     * @param hint {String} hint for the translator of the message. Will be included in the .po file.
     * @param messageId {String} message id (may contain format strings)
     * @param varargs {Object} variable number of arguments applied to the format string
     * @return {String | LocalizedString} The translated message or localized string
     * @see qx.lang.String.format
     */
    trc : function(hint, messageId, varargs)
    {
      var args = qx.lang.Array.fromArguments(arguments);
      args.splice(0, 2);

      return qx.locale.Manager.getInstance().translate(messageId, args);
    },


    /**
     * Mark the message for translation but return the original message.
     *
     * @param messageId {String} the message ID
     * @return {String} messageId
     */
    marktr : function(messageId) {
      return messageId;
    }
  },




  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  properties :
  {
    /** current locale. locale is an language code like de, de_AT, en, en_GB, fr, ... */
    locale :
    {
      check : "String",
      nullable : true,
      apply : "_applyLocale",
      event : "changeLocale"
    }
  },




  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {

    __defaultLocale : "C",
    __locale : null,
    __language : null,
    __translations : null,
    __locales : null,
    __clientLocale : null,

    /**
     * Get the language code of the current locale
     *
     * This is the first part of a locale definition. The language for "de_DE" would be "de"
     *
     * @return {String} language code
     */
    getLanguage : function() {
      return this.__language;
    },


    /**
     * Get the territory code of the current locale
     *
     * This is the second part of a locale definition. The territory for "de_DE" would be "DE"
     *
     * @return {String} territory code
     */
    getTerritory : function() {
      return this.getLocale().split("_")[1] || "";
    },


    /**
     * Return the available application locales
     *
     * This corresponds to the LOCALES setting in config.json. Without argument,
     * it only returns the currently loaded locales, with an argument of true
     * all locales that went into the build. This is particularly interesting if
     * locales were generated as dedicated I18N parts, and have to be loaded
     * explicitly before being available.
     *
     * @param includeNonloaded {Boolean?null} include locales not yet loaded
     * @return {String[]} array of available locales
     */
    getAvailableLocales : function(includeNonloaded)
    {
      var locales = [];

      for (var locale in this.__locales)
      {
        if (locale != this.__defaultLocale) {
          if (this.__locales[locale] === null && !includeNonloaded) {
            continue;  // skip not yet loaded locales
          }
          locales.push(locale);
        }
      }

      return locales;
    },


    /**
     * Extract the language part from a locale.
     *
     * @param locale {String} locale to be used
     * @return {String} language
     */
    __extractLanguage : function(locale)
    {
      var language;
      if (locale == null) {
        return null;
      }
      var pos = locale.indexOf("_");

      if (pos == -1) {
        language = locale;
      } else {
        language = locale.substring(0, pos);
      }

      return language;
    },


    // property apply
    _applyLocale : function(value, old)
    {
      if (qx.core.Environment.get("qx.debug")) {
        if (!(value in this.__locales || value == this.__clientLocale)) {
          qx.log.Logger.warn("Locale: " + value+" not available.");
        }
      }

      this.__locale = value;
      this.__language = this.__extractLanguage(value);
    },


    /**
     * Add a translation to the translation manager.
     *
     * If <code>languageCode</code> already exists, its map will be updated with
     * <code>translationMap</code> (new keys will be added, existing keys will be
     * overwritten).
     *
     * @param languageCode {String} language code of the translation like <i>de, de_AT, en, en_GB, fr, ...</i>
     * @param translationMap {Map} mapping of message identifiers to message strings in the target
     *                             language, e.g. <i>{"greeting_short" : "Hello"}</i>. Plural forms
     *                             are separate keys.
     */
    addTranslation : function(languageCode, translationMap)
    {
      var catalog = this.__translations;
      if (catalog[languageCode])
      {
        for (var key in translationMap) {
          catalog[languageCode][key] = translationMap[key];
        }
      }
      else
      {
        catalog[languageCode] = translationMap;
      }
    },


    /**
     * Add a localization to the localization manager.
     *
     * If <code>localeCode</code> already exists, its map will be updated with
     * <code>localeMap</code> (new keys will be added, existing keys will be overwritten).
     *
     * @param localeCode {String} locale code of the translation like <i>de, de_AT, en, en_GB, fr, ...</i>
     * @param localeMap {Map} mapping of locale keys to the target locale values, e.g.
     *                        <i>{"cldr_date_format_short" : "M/d/yy"}</i>.
     */
    addLocale : function(localeCode, localeMap)
    {
      var catalog = this.__locales;
      if (catalog[localeCode])
      {
        for (var key in localeMap) {
          catalog[localeCode][key] = localeMap[key];
        }
      }
      else
      {
        catalog[localeCode] = localeMap;
      }
    },


    /**
     * Translate a message using the current locale and apply format string to the arguments.
     *
     * Implements the lookup chain locale (e.g. en_US) -> language (e.g. en) ->
     * default locale (e.g. C). Localizes the arguments if possible and splices
     * them into the message. If qx.dynlocale is on, returns a {@link
     * LocalizedString}.
     *
     * @param messageId {String} message id (may contain format strings)
     * @param args {Object[]} array of objects, which are inserted into the format string
     * @param locale {String ? #locale} locale to be used; if not given, defaults to the value of {@link #locale}
     * @return {String | LocalizedString} translated message or localized string
     */
    translate : function(messageId, args, locale)
    {
      var catalog = this.__translations;
      return this.__lookupAndExpand(catalog, messageId, args, locale);
    },

    /**
     * Provide localisation (CLDR) data.
     *
     * Implements the lookup chain locale (e.g. en_US) -> language (e.g. en) ->
     * default locale (e.g. C). Localizes the arguments if possible and splices
     * them into the message. If qx.dynlocale is on, returns a {@link
     * LocalizedString}.
     *
     * @param messageId {String} message id (may contain format strings)
     * @param args {Object[]} array of objects, which are inserted into the format string
     * @param locale {String ? #locale} locale to be used; if not given, defaults to the value of {@link #locale}
     * @return {String | LocalizedString} translated message or localized string
     */
    localize : function(messageId, args, locale)
    {
      var catalog = this.__locales;
      return this.__lookupAndExpand(catalog, messageId, args, locale);
    },


    /**
     * Look up an I18N key in a catalog and expand format strings.
     *
     * Implements the lookup chain locale (e.g. en_US) -> language (e.g. en) ->
     * default locale (e.g. C). Localizes the arguments if possible and splices
     * them into the message. If qx.dynlocale is on, returns a {@link
     * LocalizedString}.
     *
     * @param catalog {Map} map of I18N keys and their values
     * @param messageId {String} message id (may contain format strings)
     * @param args {Object[]} array of objects, which are inserted into the format string
     * @param locale {String ? #locale} locale to be used; if not given, defaults to the value of {@link #locale}
     * @return {String | LocalizedString} translated message or localized string
     */
    __lookupAndExpand : function(catalog, messageId, args, locale)
    {
      if (qx.core.Environment.get("qx.debug")) {
        this.assertObject(catalog);
        this.assertString(messageId);
        this.assertArray(args);
      }
      var txt;

      if (!catalog) {
        return messageId;
      }

      if (locale) {
        var language = this.__extractLanguage(locale);
      }
      else
      {
        locale = this.__locale;
        language = this.__language;
      }

      // e.g. DE_at
      if (!txt && catalog[locale]) {
        txt = catalog[locale][messageId];
      }

      // e.g. DE
      if (!txt && catalog[language]) {
        txt = catalog[language][messageId];
      }

      // C
      if (!txt && catalog[this.__defaultLocale]) {
        txt = catalog[this.__defaultLocale][messageId];
      }

      if (!txt) {
        txt = messageId;
      }

      if (args.length > 0)
      {
        var translatedArgs = [];
        for ( var i = 0; i < args.length; i++)
        {
          var arg = args[i];
          if (arg && arg.translate) {
            translatedArgs[i] = arg.translate();
          } else {
            translatedArgs[i] = arg;
          }
        }
        txt = qx.lang.String.format(txt, translatedArgs);
      }

      if (qx.core.Environment.get("qx.dynlocale")) {
        txt = new qx.locale.LocalizedString(txt, messageId, args);
      }

      return txt;
    }
  },


  /*
  *****************************************************************************
     DESTRUCTOR
  *****************************************************************************
  */

  destruct : function() {
    this.__translations = this.__locales = null;
  }
});
/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2008 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Sebastian Werner (wpbasti)
     * Martin Wittemann (martinwittemann)

************************************************************************ */

/**
 * This class comes with all relevant information regarding
 * the client's selected locale.
 *
 * This class is used by {@link qx.core.Environment} and should not be used
 * directly. Please check its class comment for details how to use it.
 *
 * @internal
 */
qx.Bootstrap.define("qx.bom.client.Locale",
{
  /*
  *****************************************************************************
     STATICS
  *****************************************************************************
  */

  statics :
  {
    /**
     * The name of the system locale e.g. "de" when the full locale is "de_AT"
     * @return {String} The current locale
     * @internal
     */
    getLocale : function() {
      var locale = qx.bom.client.Locale.__getNavigatorLocale();

      var index = locale.indexOf("-");
      if (index != -1) {
        locale = locale.substr(0, index);
      }

      return locale;
    },


    /**
     * The name of the variant for the system locale e.g. "at" when the
     * full locale is "de_AT"
     *
     * @return {String} The locales variant.
     * @internal
     */
    getVariant : function() {
      var locale = qx.bom.client.Locale.__getNavigatorLocale();
      var variant = "";

      var index = locale.indexOf("-");

      if (index != -1) {
        variant = locale.substr(index + 1);
      }

      return variant;
    },


    /**
     * Internal helper for accessing the navigators language.
     *
     * @return {String} The language set by the navigator.
     */
    __getNavigatorLocale : function()
    {
      var locale = (navigator.userLanguage || navigator.language || "");

      // Android Bug: Android does not return the system language from the
      // navigator language. Try to parse the language from the userAgent.
      // See http://code.google.com/p/android/issues/detail?id=4641
      if (qx.bom.client.OperatingSystem.getName() == "android")
      {
        var match = /(\w{2})-(\w{2})/i.exec(navigator.userAgent);
        if (match) {
          locale = match[0];
        }
      }

      return locale.toLowerCase();
    }
  },

  defer : function(statics) {
    qx.core.Environment.add("locale", statics.getLocale);
    qx.core.Environment.add("locale.variant", statics.getVariant);
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
     * Martin Wittemann (martinwittemann)

************************************************************************ */
/**
 * Can be included for implementing {@link qx.ui.form.IModel}. It only contains
 * a nullable property named 'model' with a 'changeModel' event.
 */
qx.Mixin.define("qx.ui.form.MModelProperty",
{
  properties :
  {
    /**
     * Model property for storing additional information for the including
     * object. It can act as value property on form items for example.
     *
     * Be careful using that property as this is used for the
     * {@link qx.ui.form.MModelSelection} it has some restrictions:
     *
     * * Don't use equal models in one widget using the
     *     {@link qx.ui.form.MModelSelection}.
     *
     * * Avoid setting only some model properties if the widgets are added to
     *     a {@link qx.ui.form.MModelSelection} widge.
     *
     * Both restrictions result of the fact, that the set models are deputies
     * for their widget.
     */
    model :
    {
      nullable: true,
      event: "changeModel",
      dereference : true
    }
  }
});/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2008 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Martin Wittemann (martinwittemann)

************************************************************************ */

/**
 * Form interface for all form widgets. It includes the API for enabled,
 * required and valid states.
 */
qx.Interface.define("qx.ui.form.IForm",
{
  /*
  *****************************************************************************
     EVENTS
  *****************************************************************************
  */

  events :
  {
    /** Fired when the enabled state was modified */
    "changeEnabled" : "qx.event.type.Data",

    /** Fired when the valid state was modified */
    "changeValid" : "qx.event.type.Data",

    /** Fired when the invalidMessage was modified */
    "changeInvalidMessage" : "qx.event.type.Data",

    /** Fired when the required was modified */
    "changeRequired" : "qx.event.type.Data"
  },


  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    /*
    ---------------------------------------------------------------------------
      ENABLED PROPERTY
    ---------------------------------------------------------------------------
    */

    /**
     * Set the enabled state of the widget.
     *
     * @param enabled {Boolean} The enabled state.
     */
    setEnabled : function(enabled) {
      return arguments.length == 1;
    },


    /**
     * Return the current set enabled state.
     *
     * @return {Boolean} If the widget is enabled.
     */
    getEnabled : function() {},


    /*
    ---------------------------------------------------------------------------
      REQUIRED PROPERTY
    ---------------------------------------------------------------------------
    */

    /**
     * Sets the required state of a widget.
     *
     * @param required {Boolean} A flag signaling if the widget is required.
     */
    setRequired : function(required) {
      return arguments.length == 1;
    },


    /**
     * Return the current required state of the widget.
     *
     * @return {Boolean} True, if the widget is required.
     */
    getRequired : function() {},


    /*
    ---------------------------------------------------------------------------
      VALID PROPERTY
    ---------------------------------------------------------------------------
    */

    /**
     * Sets the valid state of the widget.
     *
     * @param valid {Boolean} The valid state of the widget.
     */
    setValid : function(valid) {
      return arguments.length == 1;
    },


    /**
     * Returns the valid state of the widget.
     *
     * @return {Boolean} If the state of the widget is valid.
     */
    getValid : function() {},


    /*
    ---------------------------------------------------------------------------
      INVALID MESSAGE PROPERTY
    ---------------------------------------------------------------------------
    */

    /**
     * Sets the invalid message of the widget.
     *
     * @param message {String} The invalid message.
     */
    setInvalidMessage : function(message) {
      return arguments.length == 1;
    },


    /**
     * Returns the invalid message of the widget.
     *
     * @return {String} The current set message.
     */
    getInvalidMessage : function() {},



    /*
    ---------------------------------------------------------------------------
      REQUIRED INVALID MESSAGE PROPERTY
    ---------------------------------------------------------------------------
    */

    /**
     * Sets the invalid message if required of the widget.
     *
     * @param message {String} The invalid message.
     */
    setRequiredInvalidMessage : function(message) {
      return arguments.length == 1;
    },


    /**
     * Returns the invalid message if required of the widget.
     *
     * @return {String} The current set message.
     */
    getRequiredInvalidMessage : function() {}

  }
});
/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2008 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Martin Wittemann (martinwittemann)

************************************************************************ */

/**
 * Each object which wants to store data representative for the real item
 * should implement this interface.
 */
qx.Interface.define("qx.ui.form.IModel",
{

  /*
  *****************************************************************************
     EVENTS
  *****************************************************************************
  */

  events :
  {
    /** Fired when the model data changes */
    "changeModel" : "qx.event.type.Data"
  },



  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    /**
     * Set the representative data for the item.
     *
     * @param value {var} The data.
     */
    setModel : function(value) {},


    /**
     * Returns the representative data for the item
     *
     * @return {var} The data.
     */
    getModel : function() {},


    /**
     * Sets the representative data to null.
     */
    resetModel : function() {}
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
 * Abstract class for all input fields.
 */
qx.Class.define("qx.ui.mobile.form.Input",
{
  extend : qx.ui.mobile.core.Widget,
  include : [
    qx.ui.form.MForm,
    qx.ui.form.MModelProperty,
    qx.ui.mobile.form.MState
  ],
  implement : [
    qx.ui.form.IForm,
    qx.ui.form.IModel
  ],
  type : "abstract",


  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  construct : function()
  {
    this.base(arguments);
    this._setAttribute("type", this._getType());
  },

  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    // overridden
    _getTagName : function()
    {
      return "input";
    },


    /**
     * Returns the type of the input field. Override this method in the
     * specialized input class.
     */
    _getType : function()
    {
      if (qx.core.Environment.get("qx.debug")) {
        throw new Error("Abstract method call");
      }
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
 * The TextField is a single-line text input field.
 */
qx.Class.define("qx.ui.mobile.form.TextField",
{
  extend : qx.ui.mobile.form.Input,
  include : [qx.ui.mobile.form.MValue, qx.ui.mobile.form.MText],
  implement : [qx.ui.form.IStringForm],


  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  /**
   * @param value {var?null} The value of the widget.
   */
  construct : function(value)
  {
    this.base(arguments);
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
      init : "textField"
    }
  },




  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    // overridden
    _getType : function()
    {
      return "text";
    }
  }
});
