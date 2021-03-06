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
     * Tristan Koch (tristankoch)

************************************************************************ */

/* ************************************************************************
#ignore(XDomainRequest)
#require(qx.bom.request.Xhr#open)
#require(qx.bom.request.Xhr#send)
#require(qx.bom.request.Xhr#on)
#require(qx.bom.request.Xhr#onreadystatechange)
#require(qx.bom.request.Xhr#onload)
#require(qx.bom.request.Xhr#onloadend)
#require(qx.bom.request.Xhr#onerror)
#require(qx.bom.request.Xhr#onabort)
#require(qx.bom.request.Xhr#ontimeout)
#require(qx.bom.request.Xhr#setRequestHeader)
#require(qx.bom.request.Xhr#getAllResponseHeaders)
#require(qx.bom.request.Xhr#getRequest)
************************************************************************ */

/**
 * A wrapper of the XMLHttpRequest host object (or equivalent). The interface is
 * similar to <a href="http://www.w3.org/TR/XMLHttpRequest/">XmlHttpRequest</a>.
 *
 * Hides browser inconsistencies and works around bugs found in popular
 * implementations.
 *
 * <div class="desktop">
 * Example:
 *
 * <pre class="javascript">
 *  var req = new qx.bom.request.Xhr();
 *  req.onload = function() {
 *    // Handle data received
 *    req.responseText;
 *  }
 *
 *  req.open("GET", url);
 *  req.send();
 * </pre>
 * </div>
 */
qx.Bootstrap.define("qx.bom.request.Xhr",
{

  construct: function() {
    this.__onNativeReadyStateChangeBound = qx.Bootstrap.bind(this.__onNativeReadyStateChange, this);
    this.__onNativeAbortBound = qx.Bootstrap.bind(this.__onNativeAbort, this);
    this.__onTimeoutBound = qx.Bootstrap.bind(this.__onTimeout, this);

    this.__initNativeXhr();
    this._emitter = new qx.event.Emitter();

    // BUGFIX: IE
    // IE keeps connections alive unless aborted on unload
    if (window.attachEvent) {
      this.__onUnloadBound = qx.Bootstrap.bind(this.__onUnload, this);
      window.attachEvent("onunload", this.__onUnloadBound);
    }

  },

  statics :
  {
    UNSENT: 0,
    OPENED: 1,
    HEADERS_RECEIVED: 2,
    LOADING: 3,
    DONE: 4
  },


  events : {
    /** Fired at ready state changes. */
    "readystatechange" : "qx.bom.request.Xhr",

    /** Fired on error. */
    "error" : "qx.bom.request.Xhr",

    /** Fired at loadend. */
    "loadend" : "qx.bom.request.Xhr",

    /** Fired on timeouts. */
    "timeout" : "qx.bom.request.Xhr",

    /** Fired when the request is aborted. */
    "abort" : "qx.bom.request.Xhr",

    /** Fired on successful retrieval. */
    "load" : "qx.bom.request.Xhr"
  },


  members :
  {
    /*
    ---------------------------------------------------------------------------
      PUBLIC
    ---------------------------------------------------------------------------
    */

    /**
     * {Number} Ready state.
     *
     * States can be:
     * UNSENT:           0,
     * OPENED:           1,
     * HEADERS_RECEIVED: 2,
     * LOADING:          3,
     * DONE:             4
     */
    readyState: 0,

    /**
     * {String} The response of the request as text.
     */
    responseText: "",

    /**
     * {Object} The response of the request as a Document object.
     */
    responseXML: null,

    /**
     * {Number} The HTTP status code.
     */
    status: 0,

    /**
     * {String} The HTTP status text.
     */
    statusText: "",

    /**
     * {Number} Timeout limit in milliseconds.
     *
     * 0 (default) means no timeout. Not supported for synchronous requests.
     */
    timeout: 0,

    /**
     * Initializes (prepares) request.
     *
     * @lint ignoreUndefined(XDomainRequest)
     *
     * @param method {String?"GET"}
     *  The HTTP method to use.
     * @param url {String}
     *  The URL to which to send the request.
     * @param async {Boolean?true}
     *  Whether or not to perform the operation asynchronously.
     * @param user {String?null}
     *  Optional user name to use for authentication purposes.
     * @param password {String?null}
     *  Optional password to use for authentication purposes.
     */
    open: function(method, url, async, user, password) {
      this.__checkDisposed();

      // Mimick native behavior
      if (typeof url === "undefined") {
        throw new Error("Not enough arguments");
      } else if (typeof method === "undefined") {
        method = "GET";
      }

      // Reset flags that may have been set on previous request
      this.__abort = false;
      this.__send = false;
      this.__conditional = false;

      // Store URL for later checks
      this.__url = url;

      if (typeof async == "undefined") {
        async = true;
      }
      this.__async = async;

      // BUGFIX
      // IE < 9 and FF < 3.5 cannot reuse the native XHR to issue many requests
      if (!this.__supportsManyRequests() && this.readyState > qx.bom.request.Xhr.UNSENT) {
        // XmlHttpRequest Level 1 requires open() to abort any pending requests
        // associated to the object. Since we're dealing with a new object here,
        // we have to emulate this behavior. Moreover, allow old native XHR to be garbage collected
        //
        // Dispose and abort.
        //
        this.dispose();

        // Replace the underlying native XHR with a new one that can
        // be used to issue new requests.
        this.__initNativeXhr();
      }

      // Restore handler in case it was removed before
      this.__nativeXhr.onreadystatechange = this.__onNativeReadyStateChangeBound;

      try {
        if (qx.core.Environment.get("qx.debug.io")) {
          qx.Bootstrap.debug(qx.bom.request.Xhr, "Open native request with method: " +
            method + ", url: " + url + ", async: " + async);
        }

        this.__nativeXhr.open(method, url, async, user, password);

      // BUGFIX: IE, Firefox < 3.5
      // Some browsers do not support Cross-Origin Resource Sharing (CORS)
      // for XMLHttpRequest. Instead, an exception is thrown even for async requests
      // if URL is cross-origin (as per XHR level 1). Use the proprietary XDomainRequest
      // if available (supports CORS) and handle error (if there is one) this
      // way. Otherwise just assume network error.
      //
      // Basically, this allows to detect network errors.
      } catch(OpenError) {

        // Only work around exceptions caused by cross domain request attempts
        if (!qx.util.Request.isCrossDomain(url)) {
          // Is same origin
          throw OpenError;
        }

        if (!this.__async) {
          this.__openError = OpenError;
        }

        if (this.__async) {
          // Try again with XDomainRequest
          // (Success case not handled on purpose)
          // - IE 9
          if (window.XDomainRequest) {
            this.readyState = 4;
            this.__nativeXhr = new XDomainRequest();
            this.__nativeXhr.onerror = qx.Bootstrap.bind(function() {
              this._emit("readystatechange");
              this._emit("error");
              this._emit("loadend");
            }, this);

            if (qx.core.Environment.get("qx.debug.io")) {
              qx.Bootstrap.debug(qx.bom.request.Xhr, "Retry open native request with method: " +
                method + ", url: " + url + ", async: " + async);
            }
            this.__nativeXhr.open(method, url, async, user, password);
            return;
          }

          // Access denied
          // - IE 6: -2146828218
          // - IE 7: -2147024891
          // - Legacy Firefox
          window.setTimeout(qx.Bootstrap.bind(function() {
            if (this.__disposed) {
              return;
            }
            this.readyState = 4;
            this._emit("readystatechange");
            this._emit("error");
            this._emit("loadend");
          }, this));
        }

      }

      // BUGFIX: IE < 9
      // IE < 9 tends to cache overly agressive. This may result in stale
      // representations. Force validating freshness of cached representation.
      if (qx.core.Environment.get("engine.name") === "mshtml" &&
        qx.core.Environment.get("browser.documentmode") < 9 &&
        this.__nativeXhr.readyState > 0) {
          this.__nativeXhr.setRequestHeader("If-Modified-Since", "-1");
        }

      // BUGFIX: Firefox
      // Firefox < 4 fails to trigger onreadystatechange OPENED for sync requests
      if (qx.core.Environment.get("engine.name") === "gecko" &&
          parseInt(qx.core.Environment.get("engine.version"), 10) < 2 &&
          !this.__async) {
        // Native XHR is already set to readyState DONE. Fake readyState
        // and call onreadystatechange manually.
        this.readyState = qx.bom.request.Xhr.OPENED;
        this._emit("readystatechange");
      }

    },

    /**
     * Sets an HTTP request header to be used by the request.
     *
     * Note: The request must be initialized before using this method.
     *
     * @param key {String}
     *  The name of the header whose value is to be set.
     * @param value {String}
     *  The value to set as the body of the header.
     * @return {qx.bom.request.Xhr} Self for chaining.
     */
    setRequestHeader: function(key, value) {
      this.__checkDisposed();

      // Detect conditional requests
      if (key == "If-Match" || key == "If-Modified-Since" ||
        key == "If-None-Match" || key == "If-Range") {
        this.__conditional = true;
      }

      this.__nativeXhr.setRequestHeader(key, value);
      return this;
    },

    /**
     * Sends request.
     *
     * @param data {String|Document?null}
     *  Optional data to send.
     * @return {qx.bom.request.Xhr} Self for chaining.
     */
    send: function(data) {
      this.__checkDisposed();

      // BUGFIX: IE & Firefox < 3.5
      // For sync requests, some browsers throw error on open()
      // while it should be on send()
      //
      if (!this.__async && this.__openError) {
        throw this.__openError;
      }

      // BUGFIX: Opera
      // On network error, Opera stalls at readyState HEADERS_RECEIVED
      // This violates the spec. See here http://www.w3.org/TR/XMLHttpRequest2/#send
      // (Section: If there is a network error)
      //
      // To fix, assume a default timeout of 10 seconds. Note: The "error"
      // event will be fired correctly, because the error flag is inferred
      // from the statusText property. Of course, compared to other
      // browsers there is an additional call to ontimeout(), but this call
      // should not harm.
      //
      if (qx.core.Environment.get("engine.name") === "opera" &&
          this.timeout === 0) {
        this.timeout = 10000;
      }

      // Timeout
      if (this.timeout > 0) {
        this.__timerId = window.setTimeout(this.__onTimeoutBound, this.timeout);
      }

      // BUGFIX: Firefox 2
      // "NS_ERROR_XPC_NOT_ENOUGH_ARGS" when calling send() without arguments
      data = typeof data == "undefined" ? null : data;

      // Some browsers may throw an error when sending of async request fails.
      // This violates the spec which states only sync requests should.
      try {
        if (qx.core.Environment.get("qx.debug.io")) {
          qx.Bootstrap.debug(qx.bom.request.Xhr, "Send native request");
        }
        this.__nativeXhr.send(data);
      } catch(SendError) {
        if (!this.__async) {
          throw SendError;
        }

        // BUGFIX
        // Some browsers throws error when file not found via file:// protocol.
        // Synthesize readyState changes.
        if (this._getProtocol() === "file:") {
          this.readyState = 2;
          this.__readyStateChange();

          var that = this;
          window.setTimeout(function() {
            if (that.__disposed) {
              return;
            }
            that.readyState = 3;
            that.__readyStateChange();

            that.readyState = 4;
            that.__readyStateChange();
          });

        }

      }

      // BUGFIX: Firefox
      // Firefox fails to trigger onreadystatechange DONE for sync requests
      if (qx.core.Environment.get("engine.name") === "gecko" && !this.__async) {
        // Properties all set, only missing native readystatechange event
        this.__onNativeReadyStateChange();
      }

      // Set send flag
      this.__send = true;
      return this;
    },

    /**
     * Abort request.
     *
     * Cancels any network activity.
     * @return {qx.bom.request.Xhr} Self for chaining.
     */
    abort: function() {
      this.__checkDisposed();

      this.__abort = true;
      this.__nativeXhr.abort();

      if (this.__nativeXhr) {
        this.readyState = this.__nativeXhr.readyState;
      }
      return this;
    },


    /**
     * Helper to emit events and call the callback methods.
     * @param event {String} The name of the event.
     */
    _emit: function(event) {
      this["on" + event]();
      this._emitter.emit(event, this);
    },

    /**
     * Event handler for XHR event that fires at every state change.
     *
     * Replace with custom method to get informed about the communication progress.
     */
    onreadystatechange: function() {},

    /**
     * Event handler for XHR event "load" that is fired on successful retrieval.
     *
     * Note: This handler is called even when the HTTP status indicates an error.
     *
     * Replace with custom method to listen to the "load" event.
     */
    onload: function() {},

    /**
     * Event handler for XHR event "loadend" that is fired on retrieval.
     *
     * Note: This handler is called even when a network error (or similar)
     * occurred.
     *
     * Replace with custom method to listen to the "loadend" event.
     */
    onloadend: function() {},

    /**
     * Event handler for XHR event "error" that is fired on a network error.
     *
     * Replace with custom method to listen to the "error" event.
     */
    onerror: function() {},

    /**
    * Event handler for XHR event "abort" that is fired when request
    * is aborted.
    *
    * Replace with custom method to listen to the "abort" event.
    */
    onabort: function() {},

    /**
    * Event handler for XHR event "timeout" that is fired when timeout
    * interval has passed.
    *
    * Replace with custom method to listen to the "timeout" event.
    */
    ontimeout: function() {},


    /**
     * Add an event listener for the given event name.
     *
     * @param name {String} The name of the event to listen to.
     * @param listener {Function} The function to execute when the event is fired
     * @param ctx {var?} The context of the listener.
     * @return {qx.bom.request.Xhr} Self for chaining.
     */
    on: function(name, listener, ctx) {
      this._emitter.on(name, listener, ctx);
      return this;
    },


    /**
     * Get a single response header from response.
     *
     * @param header {String}
     *  Key of the header to get the value from.
     * @return {String}
     *  Response header.
     */
    getResponseHeader: function(header) {
      this.__checkDisposed();

      return this.__nativeXhr.getResponseHeader(header);
    },

    /**
     * Get all response headers from response.
     *
     * @return {String} All response headers.
     */
    getAllResponseHeaders: function() {
      this.__checkDisposed();

      return this.__nativeXhr.getAllResponseHeaders();
    },

    /**
     * Get wrapped native XMLHttpRequest (or equivalent).
     *
     * Can be XMLHttpRequest or ActiveX.
     *
     * @return {Object} XMLHttpRequest or equivalent.
     */
    getRequest: function() {
      return this.__nativeXhr;
    },

    /*
    ---------------------------------------------------------------------------
      HELPER
    ---------------------------------------------------------------------------
    */

    /**
     * Dispose object and wrapped native XHR.
     * @return {Boolean} <code>true</code> if the object was successfully disposed
     */
    dispose: function() {
      if (this.__disposed) {
        return false;
      }

      window.clearTimeout(this.__timerId);

      // Remove unload listener in IE. Aborting on unload is no longer required
      // for this instance.
      if (window.detachEvent) {
        window.detachEvent("onunload", this.__onUnloadBound);
      }

      // May fail in IE
      try {
        this.__nativeXhr.onreadystatechange;
      } catch(PropertiesNotAccessable) {
        return false;
      }

      // Clear out listeners
      var noop = function() {};
      this.__nativeXhr.onreadystatechange = noop;
      this.__nativeXhr.onload = noop;
      this.__nativeXhr.onerror = noop;

      // Abort any network activity
      this.abort();

      // Remove reference to native XHR
      this.__nativeXhr = null;

      this.__disposed = true;
      return true;
    },

    /*
    ---------------------------------------------------------------------------
      PROTECTED
    ---------------------------------------------------------------------------
    */

    /**
     * Create XMLHttpRequest (or equivalent).
     *
     * @return {Object} XMLHttpRequest or equivalent.
     */
    _createNativeXhr: function() {
      var xhr = qx.core.Environment.get("io.xhr");

      if (xhr === "xhr") {
        return new XMLHttpRequest();
      }

      if (xhr == "activex") {
        return new window.ActiveXObject("Microsoft.XMLHTTP");
      }

      qx.Bootstrap.error(this, "No XHR support available.");
    },

    /**
     * Get protocol of requested URL.
     *
     * @return {String} The used protocol.
     */
    _getProtocol: function() {
      var url = this.__url;
      var protocolRe = /^(\w+:)\/\//;

      // Could be http:// from file://
      if (url !== null && url.match) {
        var match = url.match(protocolRe);
        if (match && match[1]) {
          return match[1];
        }
      }

      return window.location.protocol;
    },

    /*
    ---------------------------------------------------------------------------
      PRIVATE
    ---------------------------------------------------------------------------
    */

    /**
     * {Object} XMLHttpRequest or equivalent.
     */
    __nativeXhr: null,

    /**
     * {Boolean} Whether request is async.
     */
    __async: null,

    /**
     * {Function} Bound __onNativeReadyStateChange handler.
     */
    __onNativeReadyStateChangeBound: null,

    /**
     * {Function} Bound __onNativeAbort handler.
     */
    __onNativeAbortBound: null,

    /**
     * {Function} Bound __onUnload handler.
     */
    __onUnloadBound: null,

    /**
     * {Function} Bound __onTimeout handler.
     */
    __onTimeoutBound: null,

    /**
     * {Boolean} Send flag
     */
    __send: null,

    /**
     * {String} Requested URL
     */
    __url: null,

    /**
     * {Boolean} Abort flag
     */
    __abort: null,

    /**
     * {Boolean} Timeout flag
     */
    __timeout: null,

    /**
     * {Boolean} Whether object has been disposed.
     */
    __disposed: null,

    /**
     * {Number} ID of timeout timer.
     */
    __timerId: null,

    /**
     * {Error} Error thrown on open, if any.
     */
    __openError: null,

    /**
     * {Boolean} Conditional get flag
     */
     __conditional: null,

    /**
     * Init native XHR.
     */
    __initNativeXhr: function() {
      // Create native XHR or equivalent and hold reference
      this.__nativeXhr = this._createNativeXhr();

      // Track native ready state changes
      this.__nativeXhr.onreadystatechange = this.__onNativeReadyStateChangeBound;

      // Track native abort, when supported
      if (this.__nativeXhr.onabort) {
        this.__nativeXhr.onabort = this.__onNativeAbortBound;
      }

      // Reset flags
      this.__disposed = this.__send = this.__abort = false;
    },

    /**
     * Track native abort.
     *
     * In case the end user cancels the request by other
     * means than calling abort().
     */
    __onNativeAbort: function() {
      // When the abort that triggered this method was not a result from
      // calling abort()
      if (!this.__abort) {
        this.abort();
      }
    },

    /**
     * Handle native onreadystatechange.
     *
     * Calls user-defined function onreadystatechange on each
     * state change and syncs the XHR status properties.
     */
    __onNativeReadyStateChange: function() {
      var nxhr = this.__nativeXhr,
          propertiesReadable = true;

      if (qx.core.Environment.get("qx.debug.io")) {
        qx.Bootstrap.debug(qx.bom.request.Xhr, "Received native readyState: " + nxhr.readyState);
      }

      // BUGFIX: IE, Firefox
      // onreadystatechange() is called twice for readyState OPENED.
      //
      // Call onreadystatechange only when readyState has changed.
      if (this.readyState == nxhr.readyState) {
        return;
      }

      // Sync current readyState
      this.readyState = nxhr.readyState;

      // BUGFIX: IE
      // Superfluous onreadystatechange DONE when aborting OPENED
      // without send flag
      if (this.readyState === qx.bom.request.Xhr.DONE &&
          this.__abort && !this.__send) {
        return;
      }

      // BUGFIX: IE
      // IE fires onreadystatechange HEADERS_RECEIVED and LOADING when sync
      //
      // According to spec, only onreadystatechange OPENED and DONE should
      // be fired.
      if (!this.__async && (nxhr.readyState == 2 || nxhr.readyState == 3)) {
        return;
      }

      // Default values according to spec.
      this.status = 0;
      this.statusText = this.responseText = "";
      this.responseXML = null;

      if (this.readyState >= qx.bom.request.Xhr.HEADERS_RECEIVED) {
        // In some browsers, XHR properties are not readable
        // while request is in progress.
        try {
          this.status = nxhr.status;
          this.statusText = nxhr.statusText;
          this.responseText = nxhr.responseText;
          this.responseXML = nxhr.responseXML;
        } catch(XhrPropertiesNotReadable) {
          propertiesReadable = false;
        }

        if (propertiesReadable) {
          this.__normalizeStatus();
          this.__normalizeResponseXML();
        }
      }

      this.__readyStateChange();

      // BUGFIX: IE
      // Memory leak in XMLHttpRequest (on-page)
      if (this.readyState == qx.bom.request.Xhr.DONE) {
        // Allow garbage collecting of native XHR
        if (nxhr) {
          nxhr.onreadystatechange = function() {};
        }
      }

    },

    /**
     * Handle readystatechange. Called internally when readyState is changed.
     */
    __readyStateChange: function() {
      var that = this;

      // Cancel timeout before invoking handlers because they may throw
      if (this.readyState === qx.bom.request.Xhr.DONE) {
        // Request determined DONE. Cancel timeout.
        window.clearTimeout(this.__timerId);
      }

      // BUGFIX: IE
      // IE < 8 fires LOADING and DONE on open() - before send() - when from cache
      if (qx.core.Environment.get("engine.name") == "mshtml" &&
          qx.core.Environment.get("browser.documentmode") < 8) {

        // Detect premature events when async. LOADING and DONE is
        // illogical to happen before request was sent.
        if (this.__async && !this.__send && this.readyState >= qx.bom.request.Xhr.LOADING) {

          if (this.readyState == qx.bom.request.Xhr.LOADING) {
            // To early to fire, skip.
            return;
          }

          if (this.readyState == qx.bom.request.Xhr.DONE) {
            window.setTimeout(function() {
              if (that.__disposed) {
                return;
              }
              // Replay previously skipped
              that.readyState = 3;
              that._emit("readystatechange");

              that.readyState = 4;
              that._emit("readystatechange");
              that.__readyStateChangeDone();
            });
            return;
          }

        }
      }

      // Always fire "readystatechange"
      this._emit("readystatechange");
      if (this.readyState === qx.bom.request.Xhr.DONE) {
        this.__readyStateChangeDone();
      }
    },

    /**
     * Handle readystatechange. Called internally by
     * {@link #__readyStateChange} when readyState is DONE.
     */
    __readyStateChangeDone: function() {
      // Fire "timeout" if timeout flag is set
      if (this.__timeout) {
        this._emit("timeout");

        // BUGFIX: Opera
        // Since Opera does not fire "error" on network error, fire additional
        // "error" on timeout (may well be related to network error)
        if (qx.core.Environment.get("engine.name") === "opera") {
          this._emit("error");
        }

        this.__timeout = false;

      // Fire either "abort", "load" or "error"
      } else {
        if (this.__abort) {
          this._emit("abort");
        } else{
          if (this.__isNetworkError()) {
            this._emit("error");
          } else {
            this._emit("load");
          }
        }
      }

      // Always fire "onloadend" when DONE
      this._emit("loadend");
    },

    /**
     * Check for network error.
     *
     * @return {Boolean} Whether a network error occured.
     */
    __isNetworkError: function() {
      var error;

      // Infer the XHR internal error flag from statusText when not aborted.
      // See http://www.w3.org/TR/XMLHttpRequest2/#error-flag and
      // http://www.w3.org/TR/XMLHttpRequest2/#the-statustext-attribute
      //
      // With file://, statusText is always falsy. Assume network error when
      // response is empty.
      if (this._getProtocol() === "file:") {
        error = !this.responseText;
      } else {
        error = !this.statusText;
      }

      return error;
    },

    /**
     * Handle faked timeout.
     */
    __onTimeout: function() {
      // Basically, mimick http://www.w3.org/TR/XMLHttpRequest2/#timeout-error
      var nxhr = this.__nativeXhr;
      this.readyState = qx.bom.request.Xhr.DONE;

      // Set timeout flag
      this.__timeout = true;

      // No longer consider request. Abort.
      nxhr.abort();
      this.responseText = "";
      this.responseXML = null;

      // Signal readystatechange
      this.__readyStateChange();
    },

    /**
     * Normalize status property across browsers.
     */
    __normalizeStatus: function() {
      var isDone = this.readyState === qx.bom.request.Xhr.DONE;

      // BUGFIX: Most browsers
      // Most browsers tell status 0 when it should be 200 for local files
      if (this._getProtocol() === "file:" && this.status === 0 && isDone) {
        if (!this.__isNetworkError()) {
          this.status = 200;
        }
      }

      // BUGFIX: IE
      // IE sometimes tells 1223 when it should be 204
      if (this.status === 1223) {
        this.status = 204;
      }

      // BUGFIX: Opera
      // Opera tells 0 for conditional requests when it should be 304
      //
      // Detect response to conditional request that signals fresh cache.
      if (qx.core.Environment.get("engine.name") === "opera") {
        if (
          isDone &&                 // Done
          this.__conditional &&     // Conditional request
          !this.__abort &&          // Not aborted
          this.status === 0         // But status 0!
        ) {
          this.status = 304;
        }
      }
    },

    /**
     * Normalize responseXML property across browsers.
     */
    __normalizeResponseXML: function() {
      // BUGFIX: IE
      // IE does not recognize +xml extension, resulting in empty responseXML.
      //
      // Check if Content-Type is +xml, verify missing responseXML then parse
      // responseText as XML.
      if (qx.core.Environment.get("engine.name") == "mshtml" &&
          (this.getResponseHeader("Content-Type") || "").match(/[^\/]+\/[^\+]+\+xml/) &&
           this.responseXML && !this.responseXML.documentElement) {
        var dom = new window.ActiveXObject("Microsoft.XMLDOM");
        dom.async = false;
        dom.validateOnParse = false;
        dom.loadXML(this.responseText);
        this.responseXML = dom;
      }
    },

    /**
     * Handler for native unload event.
     */
    __onUnload: function() {
      try {
        // Abort and dispose
        if (this) {
          this.dispose();
        }
      } catch(e) {}
    },

    /**
     * Helper method to determine whether browser supports reusing the
     * same native XHR to send more requests.
     * @return {Boolean} <code>true</code> if request object reuse is supported
     */
    __supportsManyRequests: function() {
      var name = qx.core.Environment.get("engine.name");
      var version = qx.core.Environment.get("browser.version");

      return !(name == "mshtml" && version < 9 ||
               name == "gecko" && version < 3.5);
    },

    /**
     * Throw when already disposed.
     */
    __checkDisposed: function() {
      if (this.__disposed) {
        throw new Error("Already disposed");
      }
    }
  },

  defer: function() {
    qx.core.Environment.add("qx.debug.io", false);
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
     * Tristan Koch (tristankoch)

************************************************************************ */

/**
 * Static helpers for handling requests.
 */
qx.Bootstrap.define("qx.util.Request",
{
  statics:
  {
    /**
     * Whether URL given points to resource that is cross-domain,
     * i.e. not of same origin.
     *
     * @param url {String} URL.
     * @return {Boolean} Whether URL is cross domain.
     */
    isCrossDomain: function(url) {
      var result = qx.util.Uri.parseUri(url),
          location = window.location;

      if (!location) {
        return false;
      }

      var protocol = location.protocol;

      // URL is relative in the sence that it points to origin host
      if (!(url.indexOf("//") !== -1)) {
        return false;
      }

      if (protocol.substr(0, protocol.length-1) == result.protocol &&
          location.host === result.host &&
          location.port === result.port) {
        return false;
      }

      return true;
    },

    /**
     * Determine if given HTTP status is considered successful.
     *
     * @param status {Number} HTTP status.
     * @return {Boolean} Whether status is considered successful.
     */
    isSuccessful: function(status) {
      return (status >= 200 && status < 300 || status === 304);
    },

    /**
     * Request body is ignored for HTTP method GET and HEAD.
     *
     * See http://www.w3.org/TR/XMLHttpRequest2/#the-send-method.
     *
     * @param method {String} The HTTP method.
     * @return {Boolean} Whether request may contain body.
     */
    methodAllowsRequestBody: function(method) {
      return !((/^(GET)|(HEAD)$/).test(method));
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
     * Christopher Zuendorf (czuendorf)

************************************************************************ */

/**
 * The page manager decides automatically whether the added pages should be
 * displayed in a master/detail view (for tablet) or as a plain card layout (for
 * smartphones).
 *
 * *Example*
 *
 * Here is a little example of how to use the manager.
 *
 * <pre class='javascript'>
 *  var manager = new qx.ui.mobile.page.Manager();
 *  var page1 = new qx.ui.mobile.page.NavigationPage();
 *  var page2 = new qx.ui.mobile.page.NavigationPage();
 *  var page3 = new qx.ui.mobile.page.NavigationPage();
 *  manager.addMaster(page1);
 *  manager.addDetail([page2,page3]);
 *
 *  page1.show();
 * </pre>
 *
 *
 */
qx.Class.define("qx.ui.mobile.page.Manager",
{
  extend : qx.core.Object,


 /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  /**
   * @param isTablet {Boolean?} flag which triggers the manager to layout for tablet (or big screens/displays) or mobile devices. If parameter is null,
   * qx.core.Environment.get("device.type") is called for decision.
   * @param root {qx.ui.mobile.core.Widget?} widget which should be used as root for this manager.
   */
  construct : function(isTablet, root)
  {
    this.base(arguments);

    root = root || qx.core.Init.getApplication().getRoot();

    if (isTablet != null) {
      this.__isTablet = isTablet;
    } else {
      // If isTablet is undefined, call environment variable "device.type".
      // When "tablet" or "desktop" type >> do tablet layouting.
      this.__isTablet =
      qx.core.Environment.get("device.type") == "desktop" ||
      qx.core.Environment.get("device.type") == "tablet";
    }

    this.__detailContainer = this._createDetailContainer();

    if (this.__isTablet) {
      this.__masterContainer = this._createMasterContainer();
      this.__masterDetailContainer = new this._createMasterDetail();
      this.__masterDetailContainer.addListener("layoutChange", this._onLayoutChange, this);

      this.__masterButton = this._createMasterButton();
      this.__masterButton.addListener("tap", this._onMasterButtonTap, this);

      this.__detailContainer.addListener("update", this._onDetailContainerUpdate, this);

      this.__portraitMasterContainer = this._createPortraitMasterContainer(this.__masterButton);
      this.__masterDetailContainer.setPortraitMasterContainer(this.__portraitMasterContainer);

      root.add(this.__masterDetailContainer, {flex:1});

      this.__masterDetailContainer.getMaster().add(this.__masterContainer, {flex:1});
      this.__masterDetailContainer.getDetail().add(this.__detailContainer, {flex:1});

      // On Tablet Mode, no Animation should be shown by default.
      this.__masterContainer.getLayout().setShowAnimation(false);
      this.__detailContainer.getLayout().setShowAnimation(false);

      this.__toggleMasterButtonVisibility();
    } else {
      root.add(this.__detailContainer, {flex:1});
    }
  },


  properties : {

    /**
     * The caption/label of the Master Button and Popup Title.
     */
    masterTitle : {
      init : "Master",
      check : "String",
      apply : "_applyMasterTitle"
    },


    /**
     * The PortraitMasterContainer will have the height of displayed
     * MasterPage content + MasterPage Title + portraitMasterScrollOffset
     */
    portraitMasterScrollOffset : {
      init : 5,
      check : "Integer"
    }
  },


  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    __isTablet : null,
    __detailContainer : null,
    __masterContainer : null,
    __masterDetailContainer : null,
    __portraitMasterContainer : null,
    __masterButton : null,
    __masterPages : null,


    /**
     * Adds an array of NavigationPages to masterContainer, if __isTablet is true. Otherwise it will be added to detailContainer.
     * @param pages {qx.ui.mobile.page.NavigationPage[]|qx.ui.mobile.page.NavigationPage} Array of NavigationPages or single NavigationPage.
     */
    addMaster : function(pages) {
      if (this.__isTablet) {
        if(pages) {

          if(!qx.lang.Type.isArray(pages)) {
            pages = [pages];
          }

          for(var i=0; i<pages.length; i++) {
            var masterPage = pages[i];
            qx.event.Registration.addListener(masterPage, "appear", this._onMasterPageAppear, this);
            qx.event.Registration.addListener(masterPage, "start", this._onMasterPageStart, this);
            qx.event.Registration.addListener(masterPage, "hidePortraitContainer", this._onHidePortraitContainer, this);
          }

          if(this.__masterPages) {
            this.__masterPages.concat(pages);
          } else {
            this.__masterPages = pages;
          }

          this._add(pages, this.__masterContainer);
        }
      } else {
        this.addDetail(pages);
      }
    },


    /**
     * Called when a masterPage reaches lifecycle state "start". Then property masterTitle will be update with masterPage's title.
     * @param evt {qx.event.type.Event} source event.
     */
    _onMasterPageStart : function(evt) {
      var masterPage = evt.getTarget();
      var masterPageTitle = masterPage.getTitle();
      this.setMasterTitle(masterPageTitle);
    },


    /**
     * Sizes the height of the portraitMasterContainer to the content of the masterPage.
     * @param evt {qx.event.type.Event} source event.
     */
    _onMasterPageAppear : function(evt) {
      var masterPage = evt.getTarget();
      var masterPageContentHeight = qx.bom.element.Dimension.getHeight(masterPage.getContent().getContentElement());
      var portraitMasterTitleHeight = 0;

      if(this.__portraitMasterContainer.getTitleWidget()) {
        portraitMasterTitleHeight = qx.bom.element.Dimension.getHeight(this.__portraitMasterContainer.getTitleWidget().getContentElement());
      }
      var maxHeight = masterPageContentHeight + portraitMasterTitleHeight + this.getPortraitMasterScrollOffset();

      qx.bom.element.Style.set(this.__portraitMasterContainer.getContentElement(), "max-height", maxHeight+"px");
    },


    /**
     * Reacts on MasterPage's tap event.
     */
    _onHidePortraitContainer : function() {
      if(this.__portraitMasterContainer) {
        this.__portraitMasterContainer.hide();
      }
    },


    /**
     * Adds an array of NavigationPage to the detailContainer.
     * @param pages {qx.ui.mobile.page.NavigationPage[]|qx.ui.mobile.page.NavigationPage} Array of NavigationPages or single NavigationPage.
     */
    addDetail : function(pages) {
      this._add(pages, this.__detailContainer);
    },


    /**
     * Returns the masterContainer for the portrait mode.
     * @return {qx.ui.mobile.dialog.Popup}
     */
    getPortraitMasterContainer : function() {
      return this.__portraitMasterContainer;
    },


    /**
     * Returns the button for showing/hiding the masterContainer.
     * @return {qx.ui.mobile.navigationbar.Button}
     */
    getMasterButton : function() {
      return this.__masterButton;
    },
    
    
    /**
     * Returns the masterContainer.
     * @return {qx.ui.mobile.container.Navigation}
     */
    getMasterContainer : function() {
      return this.__masterContainer;
    },
    
    
    /**
     * Returns the detailContainer.
     * @return {qx.ui.mobile.container.Navigation}
     */
    getDetailContainer : function() {
      return this.__detailContainer;
    },


    /**
     * Adds an array of NavigationPage to the target container.
     * @param pages {qx.ui.mobile.page.NavigationPage[]|qx.ui.mobile.page.NavigationPage} Array of NavigationPages, or NavigationPage.
     * @param target {qx.ui.mobile.container.Navigation} target navigation container.
     */
    _add : function(pages, target) {
      if (!qx.lang.Type.isArray(pages)) {
        pages = [pages];
      }

      for (var i = 0; i < pages.length; i++) {
        var page = pages[i];

        if (qx.core.Environment.get("qx.debug"))
        {
          this.assertInstance(page, qx.ui.mobile.page.NavigationPage);
        }

        if(this.__isTablet && !page.getShowBackButtonOnTablet()) {
          page.setShowBackButton(false);
        }

        page.setIsTablet(this.__isTablet);
        target.add(page);
      }
    },


    /**
     * Called when detailContainer is updated.
     * @param evt {qx.event.type.Data} source event.
     */
    _onDetailContainerUpdate : function(evt) {
      var widget = evt.getData();
      widget.getLeftContainer().remove(this.__masterButton);
      widget.getLeftContainer().add(this.__masterButton);
    },


    /**
     * Factory method for the master button, which is responsible for showing/hiding masterContainer.
     * @return {qx.ui.mobile.navigationbar.Button}
     */
    _createMasterButton : function() {
      return new qx.ui.mobile.navigationbar.Button(this.getMasterTitle());
    },


     /**
     * Factory method for detailContainer.
     * @return {qx.ui.mobile.container.Navigation}
     */
    _createDetailContainer : function() {
      return new qx.ui.mobile.container.Navigation();
    },


    /**
    * Factory method for masterContainer.
    * @return {qx.ui.mobile.container.Navigation}
    */
    _createMasterContainer : function() {
      return new qx.ui.mobile.container.Navigation();
    },


    /**
    * Factory method for the masterDetailContainer.
    * @return {qx.ui.mobile.container.MasterDetail}
    */
    _createMasterDetail : function() {
      return new qx.ui.mobile.container.MasterDetail();
    },


    /**
    * Factory method for masterContainer, when browser/device is in portrait mode.
    * @param masterContainerAnchor {qx.ui.mobile.core.Widget} anchor of the portraitMasterContainer, expected: masterButton.
    * @return {qx.ui.mobile.dialog.Popup}
    */
    _createPortraitMasterContainer : function(masterContainerAnchor) {
      var portraitMasterContainer = new qx.ui.mobile.dialog.Popup();
      portraitMasterContainer.setAnchor(masterContainerAnchor);
      portraitMasterContainer.addCssClass("master-popup");
      return portraitMasterContainer;
    },


    /**
    * Called when user taps on masterButton.
    */
    _onMasterButtonTap : function() {
      if (this.__portraitMasterContainer.isVisible()) {
        this.__portraitMasterContainer.hide();
      } else {
        this.__portraitMasterContainer.show();
        qx.event.Registration.addListener(this.__detailContainer.getContent(), "tap", this._onDetailContainerTap, this);
      }
    },


    /**
     * Reacts on tap at __detailContainer.
     * Hides the __portraitMasterContainer and removes the listener.
     */
    _onDetailContainerTap : function(){
      this.__portraitMasterContainer.hide();

      // Listener should only be installed, as long as portraitMasterContainer is shown.
      qx.event.Registration.removeListener(this.__detailContainer.getContent(), "tap", this._onDetailContainerTap, this);
    },


    /**
    * Called when layout of masterDetailContainer changes.
    * @param evt {qx.event.type.Data} source event.
    */
    _onLayoutChange : function(evt) {
      this.__toggleMasterButtonVisibility();
    },


    /**
    * Called on property changes of masterTitle.
    * @param value {String} new title
    * @param old {String} previous title
    */
    _applyMasterTitle : function(value, old) {
      if(this.__isTablet){
        this.__masterButton.setLabel(value);
        this.__portraitMasterContainer.setTitle(value);
      }
    },


    /**
    * Show/hides master button.
    */
    __toggleMasterButtonVisibility : function()
    {
      if (qx.bom.Viewport.isPortrait()) {
        this.__masterButton.show();
      } else {
        this.__masterButton.exclude();
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
    if(this.__masterPages) {
      for(var i=0; i<this.__masterPages.length;i++) {
          var masterPage = this.__masterPages[i];

          qx.event.Registration.removeListener(masterPage, "appear", this._onMasterPageAppear, this);
          qx.event.Registration.removeListener(masterPage, "start", this._onMasterPageStart, this);
      }
    }

    this.__masterPages = null;

    this._disposeObjects("__detailContainer", "__masterContainer", "__masterDetailContainer",
      "__portraitMasterContainer", "__masterButton");
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
     * Martin Wittemann (martinwittemann)

************************************************************************ */

/**
 * The class is responsible for device detection. This is specially usefull
 * if you are on a mobile device.
 *
 * This class is used by {@link qx.core.Environment} and should not be used
 * directly. Please check its class comment for details how to use it.
 *
 * @internal
 */
qx.Bootstrap.define("qx.bom.client.Device",
{
  statics :
  {
    /** Maps user agent names to device IDs */
    __ids : {
      "iPod" : "ipod",
      "iPad" : "ipad",
      "iPhone" : "iPhone",
      "PSP" : "psp",
      "PLAYSTATION 3" : "ps3",
      "Nintendo Wii" : "wii",
      "Nintendo DS" : "ds",
      "XBOX" : "xbox",
      "Xbox" : "xbox"
    },


    /**
     * Returns the name of the current device if detectable. It falls back to
     * <code>pc</code> if the detection for other devices fails.
     *
     * @internal
     * @return {String} The string of the device found.
     */
    getName : function() {
      var str = [];
      for (var key in this.__ids) {
        str.push(key);
      }
      var reg = new RegExp("(" + str.join("|").replace(/\./g, "\.") + ")", "g");
      var match = reg.exec(navigator.userAgent);

      if (match && match[1]) {
        return qx.bom.client.Device.__ids[match[1]];
      }

      return "pc";
    },


    /**
     * Determines on what type of device the application is running.
     * Valid values are: "mobile", "tablet" or "desktop".
     * @return {String} The device type name of determined device.
     */
    getType : function() {
      return qx.bom.client.Device.detectDeviceType(navigator.userAgent);
    },


    /**
     * Detects the device type, based on given userAgentString.
     *
     * @param userAgentString {String} userAgent parameter, needed for decision.
     * @return {String} The device type name of determined device: "mobile","desktop","tablet"
     */
    detectDeviceType : function(userAgentString) {
      if(qx.bom.client.Device.detectTabletDevice(userAgentString)){
        return "tablet";
      } else if (qx.bom.client.Device.detectMobileDevice(userAgentString)){
        return "mobile";
      }

      return "desktop";
    },


    /**
     * Detects if a device is a mobile phone. (Tablets excluded.)
     * @param userAgentString {String} userAgent parameter, needed for decision.
     * @return {Boolean} Flag which indicates whether it is a mobile device.
     */
    detectMobileDevice : function(userAgentString){
        return /android.+mobile|ip(hone|od)|bada\/|blackberry|maemo|opera m(ob|in)i|fennec|NetFront|phone|psp|symbian|IEMobile|windows (ce|phone)|xda/i.test(userAgentString);
    },


    /**
     * Detects if a device is a tablet device.
     * @param userAgentString {String} userAgent parameter, needed for decision.
     * @return {Boolean} Flag which indicates whether it is a tablet device.
     */
    detectTabletDevice : function(userAgentString){
       var isIE10Tablet = (/MSIE 10/i.test(userAgentString)) && (/ARM/i.test(userAgentString)) && !(/windows phone/i.test(userAgentString));
       var isCommonTablet = (!(/Fennec|HTC.Magic|Nexus|android.+mobile|Tablet PC/i.test(userAgentString)) && (/Android|ipad|tablet|playbook|silk|kindle|psp/i.test(userAgentString)));
      
       return  isIE10Tablet || isCommonTablet;
    }

  },


  defer : function(statics) {
      qx.core.Environment.add("device.name", statics.getName);
      qx.core.Environment.add("device.type", statics.getType);
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
 * The navigation controller includes already a {@link qx.ui.mobile.navigationbar.NavigationBar}
 * and a {@link qx.ui.mobile.container.Composite} container with a {@link qx.ui.mobile.layout.Card} layout.
 * All widgets that implement the {@link qx.ui.mobile.container.INavigation}
 * interface can be added to the container. The added widget provide the title
 * widget and the left/right container, which will be automatically merged into
 * navigation bar.
 *
 * *Example*
 *
 * Here is a little example of how to use the widget.
 *
 * <pre class='javascript'>
 *   var container = new qx.ui.mobile.container.Navigation();
 *   this.getRoot(container);
 *   var page = new qx.ui.mobile.page.NavigationPage();
 *   container.add(page);
 *   page.show();
 * </pre>
 */
qx.Class.define("qx.ui.mobile.container.Navigation",
{
  extend : qx.ui.mobile.container.Composite,


  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  construct : function()
  {
    this.base(arguments, new qx.ui.mobile.layout.VBox());

    this.__navigationBar = this._createNavigationBar();
    if (this.__navigationBar) {
      this._add(this.__navigationBar);
    }

    this.__content = this._createContent();
    this._add(this.__content, {flex:1});
  },


  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */
  properties : {
    // overridden
    defaultCssClass : {
      refine : true,
      init : "navigation"
    }
  },


  /*
  *****************************************************************************
     EVENTS
  *****************************************************************************
  */
  events :
  {
    /** Fired when the navigation bar gets updated */
    "update" : "qx.event.type.Data"
  },


  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    __navigationBar : null,
    __content : null,
    __layout : null,


    // overridden
    add : function(widget) {
      if (qx.core.Environment.get("qx.debug"))
      {
        this.assertInterface(widget, qx.ui.mobile.container.INavigation);
      }

      this.getContent().add(widget);
    },


    // overridden
    remove : function(widget) {
      if (qx.core.Environment.get("qx.debug"))
      {
        this.assertInterface(widget, qx.ui.mobile.container.INavigation);
      }
      this.getContent().remove(widget);
    },


    /**
     * Returns the content container. Add all your widgets to this container.
     *
     * @return {qx.ui.mobile.container.Composite} The content container
     */
    getContent : function()
    {
      return this.__content;
    },


    /**
     * Returns the assigned card layout.
     * @return {qx.ui.mobile.layout.Card} assigned Card Layout.
     */
    getLayout : function(){
      return this.__layout;
    },


    /**
     * Returns the navigation bar.
     *
     * @return {qx.ui.mobile.navigationbar.NavigationBar} The navigation bar.
     */
    getNavigationBar : function()
    {
      return this.__navigationBar;
    },


    /**
     * Creates the content container.
     *
     * @return {qx.ui.mobile.container.Composite} The created content container
     */
    _createContent : function()
    {
      this.__layout = new qx.ui.mobile.layout.Card();
      var content = new qx.ui.mobile.container.Composite(this.__layout);
      this.__layout.addListener("updateLayout", this._onUpdateLayout, this);
      return content;
    },


    /**
     * Event handler. Called when the "updateLayout" event occurs.
     *
     * @param evt {qx.event.type.Data} The causing event
     */
    _onUpdateLayout : function(evt) {
      var data = evt.getData();
      var widget = data.widget;
      var action = data.action;
      if (action == "visible") {
        this._update(widget);
      }
    },


    /**
     * Updates the navigation bar depending on the set widget.
     *
     * @param widget {qx.ui.mobile.core.Widget} The widget that should be merged into the navigation bar.
     */
    _update : function(widget) {
      var navigationBar = this.getNavigationBar();

      qx.bom.element.Style.set(this.getContainerElement(), "transitionDuration", widget.getNavigationBarToggleDuration()+"s");

      if(widget.isNavigationBarHidden()){
        this.addCssClass("hidden");
      } else {
        this.removeCssClass("hidden");
      }

      navigationBar.removeAll();

      var leftContainer = widget.getLeftContainer();
      if (leftContainer) {
        navigationBar.add(leftContainer);
      }

      var title = widget.getTitleWidget();
      if (title) {
        navigationBar.add(title, {flex:1});
      }

      var rightContainer = widget.getRightContainer();
      if (rightContainer) {
        navigationBar.add(rightContainer);
      }

      this.fireDataEvent("update", widget);
    },


    /**
     * Creates the navigation bar.
     *
     * @return {qx.ui.mobile.navigationbar.NavigationBar} The created navigation bar
     */
    _createNavigationBar : function()
    {
      return new qx.ui.mobile.navigationbar.NavigationBar();
    }
  },


  destruct : function()
  {
    this._disposeObjects("__navigationBar", "__content","__layout");
    this.__navigationBar = this.__content = this.__layout = null;
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

#use(qx.event.handler.Transition)

************************************************************************ */

/**
 * A card layout.
 *
 * The card layout lays out widgets in a stack. Call show to display a widget.
 * Only the widget which show method is called is displayed. All other widgets are excluded.
 *
 *
 * *Example*
 *
 * Here is a little example of how to use the Card layout.
 *
 * <pre class="javascript">
 * var layout = new qx.ui.mobile.layout.Card());
 * var container = new qx.ui.mobile.container.Composite(layout);
 *
 * var label1 = new qx.ui.mobile.basic.Label("1");
 * container.add(label1);
 * var label2 = new qx.ui.mobile.basic.Label("2");
 * container.add(label2);
 *
 * label2.show();
 * </pre>
 */
qx.Class.define("qx.ui.mobile.layout.Card",
{
  extend : qx.ui.mobile.layout.Abstract,


 /*
  *****************************************************************************
     EVENTS
  *****************************************************************************
  */

  events :
  {
    /** Fired when the animation of a page transition starts */
    animationStart : "qx.event.type.Data",

    /** Fired when the animation of a page transition ends */
    animationEnd : "qx.event.type.Data"
  },


 /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  properties :
  {
    /** The default animation to use for page transition */
    defaultAnimation :
    {
      check : "String",
      init : "slide"
    },


    /** Flag which indicates, whether animation is needed, or widgets should only swap. */
    showAnimation :
    {
      check : "Boolean",
      init : true
    }
  },


 /*
  *****************************************************************************
     STATICS
  *****************************************************************************
  */

  statics :
  {
    /** All supported animations */
    ANIMATIONS :
    {
      "slide" : true,
      "pop" : true,
      "fade" : true,
      "dissolve" : true,
      "slideup" : true,
      "flip" : true,
      "swap" : true,
      "cube" : true
    }
  },


 /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    __nextWidget : null,
    __currentWidget : null,
    __inAnimation : null,
    __animation : null,
    __reverse : null,


    // overridden
    _getCssClasses : function() {
      return ["layout-card","vbox"];
    },


    // overridden
    connectToChildWidget : function(widget)
    {
      this.base(arguments);
      if (widget) {
        widget.addCssClass("layout-card-item");
        widget.addCssClass("boxFlex1");
        widget.exclude();
      }
    },


    // overridden
    disconnectFromChildWidget : function(widget)
    {
      this.base(arguments);
      widget.removeCssClass("layout-card-item");
    },


    // overridden
    updateLayout : function(widget, action, properties)
    {
      if (action == "visible")
      {
        this._showWidget(widget, properties);
      }
      this.base(arguments, widget, action, properties);
    },


    /**
     * Shows the widget with the given properties.
     *
     * @param widget {qx.ui.mobile.core.Widget} The target widget
     * @param properties {Map} The layout properties to set. Key / value pairs.
     */
    _showWidget : function(widget, properties)
    {
      if (this.__nextWidget == widget) {
        return;
      }

      if (this.__inAnimation) {
        this.__stopAnimation();
      }

      this.__nextWidget = widget;
      if (this.__currentWidget && this.getShowAnimation() && qx.core.Environment.get("css.transform.3d")) {
        properties = properties || {};

        this.__animation = properties.animation || this.getDefaultAnimation();

        if (qx.core.Environment.get("qx.debug"))
        {
          this.assertNotUndefined(qx.ui.mobile.layout.Card.ANIMATIONS[this.__animation], "Animation " + this.__animation + " is not defined.");
        }

        properties.reverse = properties.reverse == null ? false : properties.reverse;

        this.__reverse = properties.fromHistory || properties.reverse;


        this.__startAnimation(widget);
      } else {
        this._swapWidget();
      }
    },


    /**
     * Excludes the current widget and sets the next widget to the current widget.
     */
    _swapWidget : function() {
      if (this.__currentWidget) {
        this.__currentWidget.exclude();
      }
      this.__currentWidget = this.__nextWidget;
    },


    /**
     * Fix size, only if widget has mixin MResize set,
     * and nextWidget is set.
     *
     * @param widget {qx.ui.mobile.core.Widget} The target widget which should have a fixed size.
     */
    _fixWidgetSize : function(widget) {
      if(widget) {
        var hasResizeMixin = qx.Class.hasMixin(widget.constructor,qx.ui.mobile.core.MResize)
        if(hasResizeMixin) {
          // Size has to be fixed for animation.
          widget.fixSize();
        }
      }
    },


    /**
     * Releases recently fixed widget size (width/height). This is needed for allowing further
     * flexbox layouting.
     *
     * @param widget {qx.ui.mobile.core.Widget} The target widget which should have a flexible size.
     */
    _releaseWidgetSize : function(widget) {
      if(widget) {
        var hasResizeMixin = qx.Class.hasMixin(widget.constructor,qx.ui.mobile.core.MResize);
        if(hasResizeMixin) {
          // Size has to be released after animation.
          widget.releaseFixedSize();
        }
      }
    },


    /**
     * Starts the animation for the page transition.
     *
     * @param widget {qx.ui.mobile.core.Widget} The target widget
     */
    __startAnimation : function(widget)
    {
      // Fix size of current and next widget, then start animation.
      this._fixWidgetSize(this.__currentWidget);
      this._fixWidgetSize(this.__nextWidget);

      this.__inAnimation = true;

      this.fireDataEvent("animationStart", [this.__currentWidget, widget]);
      var fromElement = this.__currentWidget.getContainerElement();
      var toElement = widget.getContainerElement();

      var onAnimationEnd = qx.lang.Function.bind(this._onAnimationEnd, this);
      
      if(qx.core.Environment.get("event.mspointer")) {
        qx.bom.Event.addNativeListener(fromElement, "MSAnimationEnd", onAnimationEnd, false);
        qx.bom.Event.addNativeListener(toElement, "MSAnimationEnd", onAnimationEnd, false);
      }

      qx.event.Registration.addListener(fromElement, "animationEnd", this._onAnimationEnd, this);
      qx.event.Registration.addListener(toElement, "animationEnd", this._onAnimationEnd, this);

      var fromCssClasses = this.__getAnimationClasses("out");
      var toCssClasses = this.__getAnimationClasses("in");
      
      this._widget.addCssClass("animationParent");
      qx.bom.element.Class.addClasses(toElement, toCssClasses);
      qx.bom.element.Class.addClasses(fromElement, fromCssClasses);
    },


    /**
     * Event handler. Called when the animation of the page transition ends.
     *
     * @param evt {qx.event.type.Event} The causing event
     */
    _onAnimationEnd : function(evt)
    {
      this.__stopAnimation();
      this.fireDataEvent("animationEnd", [this.__currentWidget, this.__nextWidget]);
    },


    /**
     * Stops the animation for the page transition.
     */
    __stopAnimation : function()
    {
      if (this.__inAnimation)
      {
        var fromElement = this.__currentWidget.getContainerElement();
        var toElement = this.__nextWidget.getContainerElement();

        qx.event.Registration.removeListener(fromElement, "animationEnd", this._onAnimationEnd, this);
        qx.event.Registration.removeListener(toElement, "animationEnd", this._onAnimationEnd, this);

        qx.bom.element.Class.removeClasses(fromElement, this.__getAnimationClasses("out"));
        qx.bom.element.Class.removeClasses(toElement, this.__getAnimationClasses("in"));

        // Release fixed widget size, for further layout adaption.
        this._releaseWidgetSize(this.__currentWidget);
        this._releaseWidgetSize(this.__nextWidget);

        this._swapWidget();
        this._widget.removeCssClass("animationParent");
        this.__inAnimation = false;
      }
    },


    /**
     * Returns the animation CSS classes for a given direction. The direction
     * can be <code>in</code> or <code>out</code>.
     *
     * @param direction {String} The direction of the animation. <code>in</code> or <code>out</code>.
     * @return {String[]} The CSS classes for the set animation.
     */
    __getAnimationClasses : function(direction)
    {
      var classes = ["animationChild", this.__animation, direction];
      if (this.__reverse) {
        classes.push("reverse");
      }
      return classes;
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

   ======================================================================

   This class contains code based on the following work:

   * Unify Project

     Homepage:
       http://unify-project.org

     Copyright:
       2009-2010 Deutsche Telekom AG, Germany, http://telekom.com

     License:
       MIT: http://www.opensource.org/licenses/mit-license.php

************************************************************************ */

/**
 * EXPERIMENTAL - NOT READY FOR PRODUCTION
 *
 * This class provides support for HTML5 transition and animation events.
 * Currently only WebKit and Firefox are supported.
 */
qx.Class.define("qx.event.handler.Transition",
{
  extend : qx.core.Object,
  implement : qx.event.IEventHandler,




  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  /**
   * Create a new instance
   *
   * @param manager {qx.event.Manager} Event manager for the window to use
   */
  construct : function(manager)
  {
    this.base(arguments);

    this.__registeredEvents = {};
    this.__onEventWrapper = qx.lang.Function.listener(this._onNative, this);
  },




  /*
  *****************************************************************************
     STATICS
  *****************************************************************************
  */

  statics :
  {
    /** {Integer} Priority of this handler */
    PRIORITY : qx.event.Registration.PRIORITY_NORMAL,

    /** {Map} Supported event types */
    SUPPORTED_TYPES :
    {
      transitionEnd : 1,
      animationEnd : 1,
      animationStart : 1,
      animationIteration : 1
    },

    /** {Integer} Which target check to use */
    TARGET_CHECK : qx.event.IEventHandler.TARGET_DOMNODE,

    /** {Integer} Whether the method "canHandleEvent" must be called */
    IGNORE_CAN_HANDLE : true,

    /** Mapping of supported event types to native event types */
    TYPE_TO_NATIVE : qx.core.Environment.select("engine.name",
    {
      "webkit" :
      {
        transitionEnd : "webkitTransitionEnd",
        animationEnd : "webkitAnimationEnd",
        animationStart : "webkitAnimationStart",
        animationIteration : "webkitAnimationIteration"
      },

      "gecko" :
      {
        transitionEnd : "transitionend",
        animationEnd : "animationend",
        animationStart : "animationstart",
        animationIteration : "animationiteration"
      },

      "default" : null
    }),

    /** Mapping of native event types to supported event types */
    NATIVE_TO_TYPE : qx.core.Environment.select("engine.name",
    {
      "webkit" :
      {
        webkitTransitionEnd : "transitionEnd",
        webkitAnimationEnd : "animationEnd",
        webkitAnimationStart : "animationStart",
        webkitAnimationIteration : "animationIteration"
      },

      "gecko" :
      {
        transitionend : "transitionEnd",
        animationend : "animationEnd",
        animationstart : "animationStart",
        animationiteration : "animationIteration"
      },

      "default" : null
    })
  },





  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members:
  {
    __onEventWrapper : null,
    __registeredEvents : null,


    /*
    ---------------------------------------------------------------------------
      EVENT HANDLER INTERFACE
    ---------------------------------------------------------------------------
    */

    // interface implementation
    canHandleEvent: function(target, type) {
      // Nothing needs to be done here
    },


    // interface implementation
    /**
     * This method is called each time an event listener, for one of the
     * supported events, is added using {@link qx.event.Manager#addListener}.
     *
     * @param target {var} The target to, which the event handler should
     *     be attached
     * @param type {String} event type
     * @param capture {Boolean} Whether to attach the event to the
     *         capturing phase or the bubbling phase of the event.
     * @signature function(target, type, capture)
     */
    registerEvent: qx.core.Environment.select("engine.name",
    {
      "webkit|gecko" : function(target, type, capture)
      {
        var hash = qx.core.ObjectRegistry.toHashCode(target) + type;

        var nativeType = qx.event.handler.Transition.TYPE_TO_NATIVE[type];

        this.__registeredEvents[hash] =
        {
          target:target,
          type : nativeType
        };

        qx.bom.Event.addNativeListener(target, nativeType, this.__onEventWrapper);
      },

      "default" : function() {}
    }),


    // interface implementation
    /**
     * This method is called each time an event listener, for one of the
     * supported events, is removed by using {@link qx.event.Manager#removeListener}
     * and no other event listener is listening on this type.
     *
     * @param target {var} The target from, which the event handler should
     *     be removed
     * @param type {String} event type
     * @param capture {Boolean} Whether to attach the event to the
     *         capturing phase or the bubbling phase of the event.
     * @signature function(target, type, capture)
     */
    unregisterEvent: qx.core.Environment.select("engine.name",
    {
      "webkit|gecko" : function(target, type, capture)
      {
        var events = this.__registeredEvents;

        if (!events) {
          return;
        }

        var hash = qx.core.ObjectRegistry.toHashCode(target) + type;

        if (events[hash]) {
          delete events[hash];
        }

        qx.bom.Event.removeNativeListener(target, qx.event.handler.Transition.TYPE_TO_NATIVE[type], this.__onEventWrapper);
      },

      "default" : function() {}
    }),



    /*
    ---------------------------------------------------------------------------
      EVENT-HANDLER
    ---------------------------------------------------------------------------
    */

    /**
     * Global handler for the transition event.
     *
     * @signature function(domEvent)
     * @param domEvent {Event} DOM event
     */
    _onNative : qx.event.GlobalError.observeMethod(function(nativeEvent) {
      qx.event.Registration.fireEvent(nativeEvent.target, qx.event.handler.Transition.NATIVE_TO_TYPE[nativeEvent.type], qx.event.type.Event);
    })
  },





  /*
  *****************************************************************************
     DESTRUCTOR
  *****************************************************************************
  */

  destruct : function()
  {
    var event;
    var events = this.__registeredEvents;

    for (var id in events)
    {
      event = events[id];
      if (event.target) {
        qx.bom.Event.removeNativeListener(event.target, event.type, this.__onEventWrapper);
      }
    }

    this.__registeredEvents = this.__onEventWrapper = null;
  },





  /*
  *****************************************************************************
     DEFER
  *****************************************************************************
  */

  defer : function(statics) {
    qx.event.Registration.addHandler(statics);
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
     * Tino Butz (tbtz)

************************************************************************ */

/**
 * A navigation bar widget.
 *
 * *Example*
 *
 * Here is a little example of how to use the widget.
 *
 * <pre class='javascript'>
 *   var bar = new qx.ui.mobile.navigationbar.NavigationBar();
 *   var backButton = new qx.ui.mobile.navigationbar.BackButton();
 *   bar.add(backButton);
 *   var title = new qx.ui.mobile.navigationbar.Title();
 *   var.add(title, {flex:1});
 *
 *   this.getRoot.add(bar);
 * </pre>
 *
 * This example creates a navigation bar and adds a back button and a title to it.
 */
qx.Class.define("qx.ui.mobile.navigationbar.NavigationBar",
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
      init : "navigationbar"
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
 * The master/detail container divides an area into two panes, master and detail. The master
 * can be detached when the orientation of the device changes to portrait.
 * This container provides an optimized view for tablet and mobile devices.
 *
 * *Example*
 *
 * Here is a little example of how to use the master/detail container.
 *
 * <pre class="javascript">
 * var container = new qx.ui.mobile.container.MasterDetail();
 *
 * container.getMaster().add(new qx.ui.mobile.container.Navigation());
 * container.getDetail().add(new qx.ui.mobile.container.Navigation());
 *
 * </pre>
 */
qx.Class.define("qx.ui.mobile.container.MasterDetail",
{
  extend : qx.ui.mobile.container.Composite,

  events : {
    /**
     * Fired when the layout of the master detail is changed. This happens
     * when the orientation of the device is changed.
     */
    "layoutChange" : "qx.event.type.Data"
  },


  properties : {
    // overridden
    defaultCssClass : {
      refine : true,
      init : "master-detail"
    }
  },

  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  /**
   * @param layout {qx.ui.mobile.layout.Abstract?null} The layout that should be used for this
   *     container
   */
  construct : function(layout)
  {
    this.base(arguments, layout || new qx.ui.mobile.layout.HBox());
    this.__master = this._createMasterContainer();
    this.__detail = this._createDetailContainer();
    this.add(this.__detail, {flex:4});

    qx.event.Registration.addListener(window, "orientationchange", this._onOrientationChange, this);

    this.__syncLayout();
  },


  members : {
    __master : null,
    __detail : null,
    __portraitMasterContainer : null,


    /**
     * Returns the master container.
     *
     * @return {qx.ui.mobile.container.Composite} The master container
     */
    getMaster : function() {
      return this.__master;
    },


    /**
     * Returns the detail container.
     *
     * @return {qx.ui.mobile.container.Composite} The detail container
     */
    getDetail : function() {
      return this.__detail;
    },


    /**
     * Returns the set container for the portrait mode. The master container will be added and removed
     * automatically to this container when the orientation is changed.
     *
     * @return {qx.ui.mobile.core.Widget} The set master container for the portrait mode.
     */
    getPortraitMasterContainer : function() {
      return this.__portraitMasterContainer;
    },


    /**
     * Set the container for the portrait mode. The master container will be added and removed
     * automatically to this container when the orientation is changed.
     *
     * @param container {qx.ui.mobile.core.Widget} The set master container for the portrait mode.
     */
    setPortraitMasterContainer : function(container)
    {
      this.__portraitMasterContainer = container;
      this.__syncLayout();
    },


    /**
     * Event handler. Called when the orientation of the device is changed.
     *
     * @param evt {qx.event.type.Orientation} The causing event
     */
    _onOrientationChange : function(evt) {
      this.__syncLayout();
    },



    /**
     * Synchronizes the layout.
     */
    __syncLayout  : function() {
      var isPortrait = qx.bom.Viewport.isPortrait();
      if (isPortrait) {
        this.__addMasterToPortraitContainer();
      } else {
        this.__addMasterToOrigin();
      }
      this._applyMasterContainerCss(isPortrait);

      var portraitMasterContainer = this.getPortraitMasterContainer();

      // Initial hiding of container.
      if (portraitMasterContainer) {
        portraitMasterContainer.hide();
      }
      this.fireDataEvent("layoutChange", isPortrait);
    },



    /**
     * Adds the master container to the portrait container.
     */
    __addMasterToPortraitContainer : function()
    {
      var container = this.getPortraitMasterContainer();
      if (container) {
        container.add(this.__master);
      }
    },


    /**
     * Adds the master container to the origin position.
     */
    __addMasterToOrigin : function()
    {
      if (this.__master.getLayoutParent() != this) {
        this.addBefore(this.__master, this.__detail);
      }
    },


    /**
     * Creates the master container.
     *
     * @return {qx.ui.mobile.container.Composite} The created container
     */
    _createMasterContainer : function() {
      return this.__createContainer("master-detail-master");
    },


    /**
     * Applies the master container CSS classes.
     *
     * @param isPortrait {Boolean} Whether the orientation is in portrait mode
     */
    _applyMasterContainerCss : function(isPortrait)
    {
      var container = this.getPortraitMasterContainer();
      if (container && isPortrait) {
        this.__master.removeCssClass("attached");
      } else {
        this.__master.addCssClass("attached");
      }
    },


    /**
     * Creates the detail container.
     *
     * @return {qx.ui.mobile.container.Composite} The created container
     */
    _createDetailContainer : function() {
      return this.__createContainer("master-detail-detail");
    },


    /**
     * Creates a container.
     *
     * @param cssClass {String} The CSS class that should be set to the container.
     *
     * @return {qx.ui.mobile.container.Composite} The created container
     */
    __createContainer : function(cssClass) {
      var container = new qx.ui.mobile.container.Composite(new qx.ui.mobile.layout.VBox());
      container.setDefaultCssClass(cssClass);
      return container;
    }
  },



  destruct : function() {
    qx.event.Registration.removeListener(window, "orientationchange", this._onOrientationChange, this);
    this._disposeObjects("__master", "__detail");
    this.__master = this.__detail = this.__portraitMasterContainer = null;
  }
});
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
     * Martin Wittemann (wittemann)
     * Tino Butz (tbtz)

************************************************************************ */

/**
*
 * Basic application routing manager.
 *
 * Define routes to react on certain GET / POST / DELETE / PUT operations.
 *
 * * GET is triggered when the hash value of the url is changed. Can be called
 *   manually by calling the {@link #executeGet} method.
 * * POST / DELETE / PUT has to be triggered manually right now (will be changed later)
 *    by calling the {@link #executePost}, {@link #executeDelete}, {@link #executePut} method.
 *
 * This manager can also be used to provide browser history.
 *
 * *Example*
 *
 * Here is a little example of how to use the widget.
 *
 * <pre class='javascript'>
 *   var r = new qx.application.Routing();
 *
 *   // show the start page, when no hash is given or the hash is "#/"
 *   r.onGet("/", function(data) {
 *     startPage.show();
 *   }, this);
 *
 *   // whenever the url /address is called show the addressbook page.
 *   r.onGet("/address", function(data) {
 *     addressBookPage.show();
 *   }, this);
 *
 *   // address with the parameter "id"
 *   r.onGet("/address/{id}", function(data) {
 *     addressPage.show();
 *     model.loadAddress(data.params.id);
 *   }, this);
 *
 *   // Alternative you can use regExp for a route
 *   r.onGet(/address\/(.*)/, function(data) {
 *     addressPage.show();
 *     model.loadAddress(data.params.0);
 *   }, this);
 *
 *   // make sure that the data is always loaded
 *   r.onGet("/address.*", function(data) {
 *     if (!model.isLoaded()) {
 *       model.loadAddresses();
 *     }
 *   }, this);
 *
 *   // update the address
 *   r.onPost("/address/{id}", function(data) {
 *     model.updateAddress(data.params.id);
 *   }, this);
 *
 *   // delete the address and navigate back
 *   r.onDelete("/address/{id}", function(data) {
 *     model.deleteAddress(data.params.id);
 *     r.executeGet("/address", {reverse:true});
 *   }, this);
 * </pre>
 *
 * This example defines different routes to handle navigation events.
 */
qx.Bootstrap.define("qx.application.Routing", {

  construct : function()
  {
    this.__messaging = new qx.event.Messaging();

    this.__navigationHandler = qx.bom.History.getInstance();
    this.__navigationHandler.addListener("changeState", this.__onChangeHash, this);
  },


  statics : {
    DEFAULT_PATH : "/",

    __back : [],
    __forward : []
  },


  members :
  {
    __navigationHandler : null,
    __messaging : null,

    __currentGetPath : null,


    /**
     * Initialization method used to execute the get route for the currently set history path.
     * If no path is set, either the given argument named <code>defaultRoute</code>
     * or the {@link #DEFAULT_PATH} will be used for initialization.
     *
     * @param defaultRoute {String?} Optional default route for initialization.
     */
    init : function(defaultRoute)
    {
      if (qx.core.Environment.get("qx.debug")) {
        if (defaultRoute != null) {
          qx.core.Assert.assertString(defaultRoute, "Invalid argument 'defaultRoute'");
        }
      }

      var path = this.getState();
      if (path == "" || path == null){
        path = defaultRoute || qx.application.Routing.DEFAULT_PATH;
      }
      this._executeGet(path, null, true);
    },


    /**
     * Adds a route handler for the "get" operation. The route gets called
     * when the {@link #executeGet} method found a match.
     *
     * @param route {String|RegExp} The route, used for checking if the executed path matches.
     * @param handler {Function} The handler to call, when the route matches with the executed path.
     * @param scope {Object} The scope of the handler.
     * @return {String} Event listener ID
     */
    onGet : function(route, handler, scope) {
      return this.__messaging.on("get", route, handler, scope);
    },


    /**
     * This is a shorthand for {@link #onGet}.
     *
     * @param route {String|RegExp} The route, used for checking if the executed path matches.
     * @param handler {Function} The handler to call, when the route matches with the executed path.
     * @param scope {Object} The scope of the handler.
     * @return {String} Event listener ID
     */
    on : function(route, handler, scope) {
      return this.onGet(route, handler, scope);
    },


    /**
     * Adds a route handler for the "post" operation. The route gets called
     * when the {@link #executePost} method found a match.
     *
     * @param route {String|RegExp} The route, used for checking if the executed path matches.
     * @param handler {Function} The handler to call, when the route matches with the executed path.
     * @param scope {Object} The scope of the handler.
     * @return {String} Event listener ID
     */
    onPost : function(route, handler, scope) {
      return this.__messaging.on("post", route, handler, scope);
    },


    /**
     * Adds a route handler for the "put" operation. The route gets called
     * when the {@link #executePut} method found a match.
     *
     * @param route {String|RegExp} The route, used for checking if the executed path matches
     * @param handler {Function} The handler to call, when the route matches with the executed path
     * @param scope {Object} The scope of the handler
     * @return {String} Event listener ID
     */
    onPut : function(route, handler, scope) {
      return this.__messaging.on("put", route, handler, scope);
    },


    /**
     * Adds a route handler for the "delete" operation. The route gets called
     * when the {@link #executeDelete} method found a match.
     *
     * @param route {String|RegExp} The route, used for checking if the executed path matches
     * @param handler {Function} The handler to call, when the route matches with the executed path
     * @param scope {Object} The scope of the handler
     * @return {String} Event listener ID
     */
    onDelete : function(route, handler, scope) {
      return this.__messaging.on("delete", route, handler, scope);
    },


    /**
     * Adds a route handler for the "any" operation. The "any" operation is called
     * before all other operations.
     *
     * @param route {String|RegExp} The route, used for checking if the executed path matches
     * @param handler {Function} The handler to call, when the route matches with the executed path
     * @param scope {Object} The scope of the handler
     * @return {String} Event listener ID
     */
    onAny : function(route, handler, scope) {
      return this.__messaging.onAny(route, handler, scope);
    },


    /**
     * Removes a registered route by the given id.
     *
     * @param id {String} The id of the registered route
     */
    remove : function(id) {
      this.__messaging.remove(id);
    },


    /**
     * Hash change event handler.
     *
     * @param evt {qx.event.type.Data} The changeHash event.
     */
    __onChangeHash : function(evt)
    {
      var path = evt.getData();
      if (path == "" || path == null){
        path = qx.application.Routing.DEFAULT_PATH;
      }

      if (path != this.__currentGetPath) {
        this._executeGet(path, null, true);
      }
    },


    /**
     * Executes the get operation and informs all matching route handler.
     *
     * @param path {String} The path to execute
     * @param customData {var} The given custom data that should be propagated
     * @param fromEvent {var} Determines whether this method was called from history
     *
     */
    _executeGet : function(path, customData, fromEvent)
    {
      this.__currentGetPath = path;

      var history = this.__getFromHistory(path);
      if (history)
      {
        if (!customData)
        {
          customData = history.data.customData || {};
          customData.fromHistory = true;
          customData.action = history.action;
          customData.fromEvent = fromEvent;
        } else {
          this.__replaceCustomData(path, customData);
        }
      } else {
        this.__addToHistory(path, customData);
        qx.application.Routing.__forward = [];
      }

      this.__navigationHandler.setState(path);
      this.__messaging.emit("get", path, null, customData);
    },


    /**
     * Executes the get operation and informs all matching route handler.
     *
     * @param path {String} The path to execute
     * @param customData {var} The given custom data that should be propagated
     */
    executeGet : function(path, customData) {
      this._executeGet(path, customData);
    },


    /**
     * This is a shorthand for {@link #executeGet}.
     *
     * @param path {String} The path to execute
     * @param customData {var} The given custom data that should be propagated
     */
    execute : function(path, customData) {
      this.executeGet(path, customData);
    },


    /**
     * Executes the post operation and informs all matching route handler.
     *
     * @param path {String} The path to execute
     * @param params {Map} The given parameters that should be propagated
     * @param customData {var} The given custom data that should be propagated
     */
    executePost : function(path, params, customData) {
      this.__messaging.emit("post", path, params, customData);
    },


    /**
     * Executes the put operation and informs all matching route handler.
     *
     * @param path {String} The path to execute
     * @param params {Map} The given parameters that should be propagated
     * @param customData {var} The given custom data that should be propagated
     */
    executePut : function(path, params, customData) {
      this.__messaging.emit("put", path, params, customData);
    },


    /**
     * Executes the delete operation and informs all matching route handler.
     *
     * @param path {String} The path to execute
     * @param params {Map} The given parameters that should be propagated
     * @param customData {var} The given custom data that should be propagated
     */
    executeDelete : function(path, params, customData) {
      this.__messaging.emit("delete", path, params, customData);
    },


    /**
     * Returns state value (history hash) of the navigation handler.
     * @return {String} State of history navigation handler
     */
    getState : function() {
      return this.__navigationHandler.getState();
    },


    /**
     * Adds the custom data of a given path to the history.
     *
     * @param path {String} The path to store.
     * @param customData {var} The custom data to store
     */
    __addToHistory : function(path, customData)
    {
      qx.application.Routing.__back.unshift({
        path : path,
        customData : customData
      });
    },


    /**
     * Replaces the customData in the history objects with the recent custom data.
     * @param path {String} The path to replace.
     * @param customData {var} The custom data to store.
     */
    __replaceCustomData : function(path, customData) {
      var register = [qx.application.Routing.__back, qx.application.Routing.__forward];
      for (var i=0; i < register.length; i++) {
        for (var j=0; j < register[i].length; j++) {
          if (register[i][j].path == path) {
            register[i][j].customData = customData;
          }
        };
      };
    },


    /**
     * Returns a history entry for a certain path.
     *
     * @param path {String} The path of the entry
     * @return {Map|null} The retrieved entry. <code>null</code> when no entry was found.
     */
    __getFromHistory : function(path)
    {
      var back = qx.application.Routing.__back;
      var forward = qx.application.Routing.__forward;
      var found = false;

      var entry = null;
      var length = back.length;
      for (var i = 0; i < length; i++)
      {
        if (back[i].path == path)
        {
          entry = back[i];
          var toForward = back.splice(0,i);
          for (var a=0; a<toForward.length; a++){
            forward.unshift(toForward[a]);
          }
          found = true;
          break;
        }
      }
      if (found){
        return {
          data : entry,
          action : "back"
        }
      }

      var length = forward.length;
      for (var i = 0; i < length; i++)
      {
        if (forward[i].path == path)
        {
          entry = forward[i];
          var toBack = forward.splice(0,i+1);
          for (var a=0; a<toBack.length; a++){
            back.unshift(toBack[a]);
          }
          break;
        }
      }

      if (entry){
        return {
          data : entry,
          action : "forward"
        }
      }
      return entry;
    },


    /**
     * Decouples the Routing from the navigation handler.
     */
    dispose : function() {
      this.__navigationHandler.removeListener("changeState", this.__onChangeHash, this);
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
     * Martin Wittemann (wittemann)

************************************************************************ */

/**
 * Define messages to react on certain channels.
 *
 * The channel names will be used in the {@link #on} method to define handlers which will
 * be called on certain channels and routes. The {@link #emit} method can be used
 * to execute a given route on a channel. {@link #onAny} defines a handler on any channel.
 *
 * *Example*
 *
 * Here is a little example of how to use the messaging.
 *
 * <pre class='javascript'>
 *   var m = new qx.event.Messaging();
 *
 *   m.on("get", "/address/{id}", function(data) {
 *     var id = data.params.id; // 1234
 *     // do something with the id...
 *   },this);
 *
 *   m.emit("get", "/address/1234");
 * </pre>
 */
qx.Bootstrap.define("qx.event.Messaging",
{
  construct : function()
  {
    this._listener = {},
    this.__listenerIdCount = 0;
    this.__channelToIdMapping = {};
  },


  members :
  {
    _listener : null,
    __listenerIdCount : null,
    __channelToIdMapping : null,


    /**
     * Adds a route handler for the given channel. The route is called
     * if the {@link #emit} method finds a match.
     *
     * @param channel {String} The channel of the message.
     * @param type {String|RegExp} The type, used for checking if the executed path matches.
     * @param handler {Function} The handler to call if the route matches the executed path.
     * @param scope {var ? null} The scope of the handler.
     * @return {String} The id of the route used to remove the route.
     */
    on : function(channel, type, handler, scope) {
      return this._addListener(channel, type, handler, scope);
    },



    /**
     * Adds a handler for the "any" channel. The "any" channel is called
     * before all other channels.
     *
     * @param type {String|RegExp} The route, used for checking if the executed path matches
     * @param handler {Function} The handler to call if the route matches the executed path
     * @param scope {var ? null} The scope of the handler.
     * @return {String} The id of the route used to remove the route.
     */
    onAny : function(type, handler, scope) {
      return this._addListener("any", type, handler, scope);
    },


    /**
     * Adds a listener for a certain channel.
     *
     * @param channel {String} The channel the route should be registered for
     * @param type {String|RegExp} The type, used for checking if the executed path matches
     * @param handler {Function} The handler to call if the route matches the executed path
     * @param scope {var ? null} The scope of the handler.
     * @return {String} The id of the route used to remove the route.
     */
    _addListener : function(channel, type, handler, scope) {
      var listeners = this._listener[channel] = this._listener[channel] || {};
      var id = this.__listenerIdCount++;
      var params = [];
      var param = null;

      // Convert the route to a regular expression.
      if (qx.lang.Type.isString(type))
      {
        var paramsRegexp = /\{([\w\d]+)\}/g;

        while ((param = paramsRegexp.exec(type)) !== null) {
          params.push(param[1]);
        }
        type = new RegExp("^" + type.replace(paramsRegexp, "([^\/]+)") + "$");
      }

      listeners[id] = {regExp:type, params:params, handler:handler, scope:scope};
      this.__channelToIdMapping[id] = channel;
      return id;
    },


    /**
     * Removes a registered listener by the given id.
     *
     * @param id {String} The id of the registered listener.
     */
    remove : function(id) {
      var channel = this.__channelToIdMapping[id];
      var listener = this._listener[channel];
      delete listener[id];
      delete this.__channelToIdMapping[id];
    },


    /**
     * Sends a message on the given channel and informs all matching route handlers.
     *
     * @param channel {String} The channel of the message.
     * @param path {String} The path to execute
     * @param params {Map} The given parameters that should be propagated
     * @param customData {var} The given custom data that should be propagated
     */
    emit : function(channel, path, params, customData) {
      this._emit(channel, path, params, customData);
    },


    /**
     * Executes a certain channel with a given path. Informs all
     * route handlers that match with the path.
     *
     * @param channel {String} The channel to execute.
     * @param path {String} The path to check
     * @param params {Map} The given parameters that should be propagated
     * @param customData {var} The given custom data that should be propagated
     */
    _emit : function(channel, path, params, customData)
    {
      var listenerMatchedAny = false;
      var listener = this._listener["any"];
      listenerMatchedAny = this._emitListeners(channel, path, listener, params, customData);

      var listenerMatched = false;
      listener = this._listener[channel];
      listenerMatched = this._emitListeners(channel, path, listener, params, customData);

      if (!listenerMatched && !listenerMatchedAny) {
        qx.Bootstrap.info("No listener found for " + path);
      }
    },


    /**
     * Executes all given listener for a certain channel. Checks all listeners if they match
     * with the given path and executes the stored handler of the matching route.
     *
     * @param channel {String} The channel to execute.
     * @param path {String} The path to check
     * @param listeners {Map[]} All routes to test and execute.
     * @param params {Map} The given parameters that should be propagated
     * @param customData {var} The given custom data that should be propagated
     *
     * @return {Boolean} Whether the route has been executed
     */
    _emitListeners : function(channel, path, listeners, params, customData)
    {
      if (!listeners || qx.lang.Object.isEmpty(listeners)) {
        return false;
      }
      var listenerMatched = false;
      for (var id in listeners)
      {
        var listener = listeners[id];
        listenerMatched |= this._emitRoute(channel, path, listener, params, customData);
      }
      return listenerMatched;
    },


    /**
     * Executes a certain listener. Checks if the listener matches the given path and
     * executes the stored handler of the route.
     *
     * @param channel {String} The channel to execute.
     * @param path {String} The path to check
     * @param listener {Map} The route data.
     * @param params {Map} The given parameters that should be propagated
     * @param customData {var} The given custom data that should be propagated
     *
     * @return {Boolean} Whether the route has been executed
     */
    _emitRoute : function(channel, path, listener, params, customData)
    {
      var match = listener.regExp.exec(path);
      if (match)
      {
        var params = params || {};
        var param = null;
        var value = null;
        match.shift(); // first match is the whole path
        for (var i=0; i < match.length; i++)
        {
          value = match[i];
          param = listener.params[i];
          if (param) {
            params[param] = value;
          } else {
            params[i] = value;
          }
        }
        listener.handler.call(listener.scope, {path:path, params:params, customData:customData});
      }

      return match != undefined;
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
     * Sebastian Werner (wpbasti)
     * Andreas Ecker (ecker)
     * Fabian Jakobs (fjakobs)

   ======================================================================

   This class contains code based on the following work:

   * Yahoo! UI Library
     http://developer.yahoo.com/yui
     Version 2.2.0

     Copyright:
       (c) 2007, Yahoo! Inc.

     License:
       BSD: http://developer.yahoo.com/yui/license.txt

   ----------------------------------------------------------------------

     http://developer.yahoo.com/yui/license.html

     Copyright (c) 2009, Yahoo! Inc.
     All rights reserved.

     Redistribution and use of this software in source and binary forms,
     with or without modification, are permitted provided that the
     following conditions are met:

     * Redistributions of source code must retain the above copyright
       notice, this list of conditions and the following disclaimer.
     * Redistributions in binary form must reproduce the above copyright
       notice, this list of conditions and the following disclaimer in
       the documentation and/or other materials provided with the
       distribution.
     * Neither the name of Yahoo! Inc. nor the names of its contributors
       may be used to endorse or promote products derived from this
       software without specific prior written permission of Yahoo! Inc.

     THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
     "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
     LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
     FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
     COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
     INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
     (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
     SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
     HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
     STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
     ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED
     OF THE POSSIBILITY OF SUCH DAMAGE.

************************************************************************ */

/* ************************************************************************

#asset(qx/static/blank.html)

************************************************************************ */

/**
 * A helper for using the browser history in JavaScript Applications without
 * reloading the main page.
 *
 * Adds entries to the browser history and fires a "request" event when one of
 * the entries was requested by the user (e.g. by clicking on the back button).
 *
 * This class is an abstract template class. Concrete implementations have to
 * provide implementations for the {@link #_readState} and {@link #_writeState}
 * methods.
 *
 * Browser history support is currently available for Internet Explorer 6/7,
 * Firefox, Opera 9 and WebKit. Safari 2 and older are not yet supported.
 *
 * This module is based on the ideas behind the YUI Browser History Manager
 * by Julien Lecomte (Yahoo), which is described at
 * http://yuiblog.com/blog/2007/02/21/browser-history-manager/. The Yahoo
 * implementation can be found at http://developer.yahoo.com/yui/history.
 * The original code is licensed under a BSD license
 * (http://developer.yahoo.com/yui/license.txt).
 */
qx.Class.define("qx.bom.History",
{
  extend : qx.core.Object,
  type : "abstract",




  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  construct : function()
  {
    this.base(arguments);

    this._baseUrl = window.location.href.split('#')[0] + '#';

    this._titles = {};
    this._setInitialState();
  },


  /*
  *****************************************************************************
     EVENTS
  *****************************************************************************
  */

  events: {
    /**
     * Fired when the user moved in the history. The data property of the event
     * holds the state, which was passed to {@link #addToHistory}.
     */
    "request" : "qx.event.type.Data"
  },


  /*
  *****************************************************************************
     STATICS
  *****************************************************************************
  */


  statics :
  {
    /**
     * {Boolean} Whether the browser supports the 'hashchange' event natively.
     */
    SUPPORTS_HASH_CHANGE_EVENT : qx.core.Environment.get("event.hashchange"),


    /**
     * Get the singleton instance of the history manager.
     *
     * @return {History}
     */
    getInstance : function()
    {
      if (!this.$$instance)
      {
        if (!(window == window.top) && qx.core.Environment.get("engine.name") == "mshtml" && qx.core.Environment.get("browser.version") >= 9) {
          this.$$instance = new qx.bom.HashHistory();
        } else if (!(window == window.top) && qx.core.Environment.get("engine.name") == "mshtml") {
          this.$$instance = new qx.bom.IframeHistory();
        } else if (this.SUPPORTS_HASH_CHANGE_EVENT) {
          this.$$instance = new qx.bom.NativeHistory();
        } else if ((qx.core.Environment.get("engine.name") == "mshtml")) {
          this.$$instance = new qx.bom.IframeHistory();
        } else {
          this.$$instance = new qx.bom.NativeHistory();
        }
      }
      return this.$$instance;
    }
  },


  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  properties :
  {
    /**
     * Property holding the current title
     */
    title :
    {
      check : "String",
      event : "changeTitle",
      nullable : true,
      apply    : "_applyTitle"
    },

    /**
     * Property holding the current state of the history.
     */
    state :
    {
      check : "String",
      event : "changeState",
      nullable : true,
      apply: "_applyState"
    }
  },




  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    _titles : null,


    // property apply
    _applyState : function(value, old)
    {
      this._writeState(value);
    },


    /**
     * Populates the 'state' property with the initial state value
     */
    _setInitialState : function() {
      this.setState(this._readState());
    },


    /**
     * Encodes the state value into a format suitable as fragment identifier.
     *
     * @param value {String} The string to encode
     * @return {String} The encoded string
     */
    _encode : function (value)
    {
      if (qx.lang.Type.isString(value)) {
        return encodeURIComponent(value);
      }

      return "";
    },


    /**
     * Decodes a fragment identifier into a string
     *
     * @param value {String} The fragment identifier
     * @return {String} The decoded fragment identifier
     */
    _decode : function (value)
    {
      if (qx.lang.Type.isString(value)) {
        return decodeURIComponent(value);
      }

      return "";
    },


    // property apply
    _applyTitle : function (title)
    {
      if (title != null) {
        document.title = title || "";
      }
    },


    /**
     * Adds an entry to the browser history.
     *
     * @param state {String} a string representing the state of the
     *          application. This command will be delivered in the data property of
     *          the "request" event.
     * @param newTitle {String ? null} the page title to set after the history entry
     *          is done. This title should represent the new state of the application.
     */
    addToHistory : function(state, newTitle)
    {
      if (!qx.lang.Type.isString(state)) {
        state = state + "";
      }

      if (qx.lang.Type.isString(newTitle))
      {
        this.setTitle(newTitle);
        this._titles[state] = newTitle;
      }

      if (this.getState() !== state) {
        this._writeState(state);
      }
    },


    /**
     * Navigates back in the browser history.
     * Simulates a back button click.
     */
     navigateBack : function() {
       qx.event.Timer.once(function() {history.back();}, this, 100);
     },


    /**
     * Navigates forward in the browser history.
     * Simulates a forward button click.
     */
     navigateForward : function() {
       qx.event.Timer.once(function() {history.forward();}, this, 100);
     },


    /**
     * Called on changes to the history using the browser buttons.
     *
     * @param state {String} new state of the history
     */
    _onHistoryLoad : function(state)
    {
      this.setState(state);
      this.fireDataEvent("request", state);
      if (this._titles[state] != null) {
        this.setTitle(this._titles[state]);
      }
    },


    /**
     * Browser dependent function to read the current state of the history
     *
     * @return {String} current state of the browser history
     */
    _readState : function() {
      throw new Error("Abstract method call");
    },


    /**
     * Save a state into the browser history.
     *
     */
    _writeState : function() {
      throw new Error("Abstract method call");
    },


    /**
     * Sets the fragment identifier of the window URL
     *
     * @param value {String} the fragment identifier
     */
    _setHash : function (value)
    {
      var url = this._baseUrl + (value || "");
      var loc = window.location;

      if (url != loc.href) {
        loc.href = url;
      }
    },


    /**
     * Returns the fragment identifier of the top window URL. For gecko browsers we
     * have to use a regular expression to avoid encoding problems.
     *
     * @return {String} the fragment identifier
     */
    _getHash : function()
    {
      var hash = /#(.*)$/.exec(window.location.href);
      return hash && hash[1] ? hash[1] : "";
    }
  },


  destruct : function()
  {
    this._titles = null;
  }
});
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
     * Sebastian Werner (wpbasti)
     * Andreas Ecker (ecker)
     * Fabian Jakobs (fjakobs)
     * Mustafa Sak (msak)

************************************************************************ */

/**
 * History manager implementation for IE greater 7. IE reloads iframe
 * content on history actions even just hash value changed. This
 * implementation forwards history states (hashes) to a helper iframe.
 *
 * @internal
 */
qx.Class.define("qx.bom.HashHistory",
{
  extend : qx.bom.History,

  construct : function()
  {
    this.base(arguments);
    this._baseUrl = null;
    this.__initIframe();
  },


  members :
  {
    __checkOnHashChange : null,
    __iframe : null,
    __iframeReady : false,


    //overridden
    addToHistory : function(state, newTitle)
    {
      if (!qx.lang.Type.isString(state)) {
        state = state + "";
      }

      if (qx.lang.Type.isString(newTitle))
      {
        this.setTitle(newTitle);
        this._titles[state] = newTitle;
      }

      if (this.getState() !== state) {
        this._writeState(state);
      }
    },


    /**
     * Initializes the iframe
     *
     */
    __initIframe : function()
    {
      this.__iframe = this.__createIframe();
      document.body.appendChild(this.__iframe);

      this.__waitForIFrame(function()
      {
        this._baseUrl = this.__iframe.contentWindow.document.location.href;
        this.__attachListeners();
      }, this);
    },


    /**
     * IMPORTANT NOTE FOR IE:
     * Setting the source before adding the iframe to the document.
     * Otherwise IE will bring up a "Unsecure items ..." warning in SSL mode
     *
     * @return {Element}
     */
    __createIframe : function ()
    {
      var iframe = qx.bom.Iframe.create({
        src : qx.util.ResourceManager.getInstance().toUri(qx.core.Environment.get("qx.blankpage")) + "#"
      });

      iframe.style.visibility = "hidden";
      iframe.style.position = "absolute";
      iframe.style.left = "-1000px";
      iframe.style.top = "-1000px";

      return iframe;
    },


    /**
     * Waits for the IFrame being loaded. Once the IFrame is loaded
     * the callback is called with the provided context.
     *
     * @param callback {Function} This function will be called once the iframe is loaded
     * @param context {Object?window} The context for the callback.
     * @param retry {Integer} number of tries to initialize the iframe
     */
    __waitForIFrame : function(callback, context, retry)
    {
      if (typeof retry === "undefined") {
        retry = 0;
      }

      if ( !this.__iframe.contentWindow || !this.__iframe.contentWindow.document )
      {
        if (retry > 20) {
          throw new Error("can't initialize iframe");
        }

        qx.event.Timer.once(function() {
          this.__waitForIFrame(callback, context, ++retry);
        }, this, 10);

        return;
      }

      this.__iframeReady = true;
      callback.call(context || window);
    },


    /**
     * Attach hash change listeners
     */
    __attachListeners : function()
    {
      qx.event.Idle.getInstance().addListener("interval", this.__onHashChange, this);
    },


    /**
     * Remove hash change listeners
     */
    __detatchListeners : function()
    {
      qx.event.Idle.getInstance().removeListener("interval", this.__onHashChange, this);
    },


    /**
     * hash change event handler
     */
    __onHashChange : function()
    {
      var currentState = this._readState();

      if (qx.lang.Type.isString(currentState) && currentState != this.getState()) {
        this._onHistoryLoad(currentState);
      }
    },


    /**
     * Browser dependent function to read the current state of the history
     *
     * @return {String} current state of the browser history
     */
    _readState : function() {
      var hash = !this._getHash() ? "" : this._getHash().substr(1);
      return this._decode(hash);
    },


    /**
     * Returns the fragment identifier of the top window URL. For gecko browsers we
     * have to use a regular expression to avoid encoding problems.
     *
     * @return {String|null} the fragment identifier or <code>null</code> if the
     * iframe isn't ready yet
     */
    _getHash : function()
    {
      if (!this.__iframeReady){
        return null;
      }
      return this.__iframe.contentWindow.document.location.hash;
    },


    /**
     * Save a state into the browser history.
     *
     * @param state {String} state to save
     */
    _writeState : function(state)
    {
      this._setHash(this._encode(state));
    },


    /**
     * Sets the fragment identifier of the window URL
     *
     * @param value {String} the fragment identifier
     */
    _setHash : function (value)
    {
      if (!this.__iframe || !this._baseUrl){
        return;
      }
      var hash = !this.__iframe.contentWindow.document.location.hash ? "" : this.__iframe.contentWindow.document.location.hash.substr(1);
      if (value != hash) {
        this.__iframe.contentWindow.document.location.hash = value;
      }
    }
  },


  destruct : function() {
    this.__detatchListeners();
    this.__iframe = null;
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
     * Fabian Jakobs (fjakobs)

************************************************************************ */

/**
 * This handler provides a "load" event for iframes
 */
qx.Class.define("qx.event.handler.Iframe",
{
  extend : qx.core.Object,
  implement : qx.event.IEventHandler,





  /*
  *****************************************************************************
     STATICS
  *****************************************************************************
  */

  statics :
  {
    /** {Integer} Priority of this handler */
    PRIORITY : qx.event.Registration.PRIORITY_NORMAL,

    /** {Map} Supported event types */
    SUPPORTED_TYPES : {
      load: 1,
      navigate: 1
    },

    /** {Integer} Which target check to use */
    TARGET_CHECK : qx.event.IEventHandler.TARGET_DOMNODE,

    /** {Integer} Whether the method "canHandleEvent" must be called */
    IGNORE_CAN_HANDLE : false,

    /**
     * Internal function called by iframes created using {@link qx.bom.Iframe}.
     *
     * @signature function(target)
     * @internal
     * @param target {Element} DOM element which is the target of this event
     */
    onevent : qx.event.GlobalError.observeMethod(function(target) {

      // Fire navigate event when actual URL diverges from stored URL
      var currentUrl = qx.bom.Iframe.queryCurrentUrl(target);

      if (currentUrl !== target.$$url) {
        qx.event.Registration.fireEvent(target, "navigate", qx.event.type.Data, [currentUrl]);
        target.$$url = currentUrl;
      }

      // Always fire load event
      qx.event.Registration.fireEvent(target, "load");
    })
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
      EVENT HANDLER INTERFACE
    ---------------------------------------------------------------------------
    */

    // interface implementation
    canHandleEvent : function(target, type) {
      return target.tagName.toLowerCase() === "iframe"
    },


    // interface implementation
    registerEvent : function(target, type, capture) {
      // Nothing needs to be done here
    },


    // interface implementation
    unregisterEvent : function(target, type, capture) {
      // Nothing needs to be done here
    }


  },





  /*
  *****************************************************************************
     DEFER
  *****************************************************************************
  */

  defer : function(statics) {
    qx.event.Registration.addHandler(statics);
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
     * Andreas Ecker (ecker)
     * Jonathan Weiß (jonathan_rass)
     * Christian Hagendorn (Chris_schmidt)

************************************************************************ */

/* ************************************************************************

#require(qx.event.handler.Iframe)

************************************************************************ */

/**
 * Cross browser abstractions to work with iframes.
 */
qx.Class.define("qx.bom.Iframe",
{
  /*
  *****************************************************************************
     STATICS
  *****************************************************************************
  */

  statics :
  {
    /**
     * {Map} Default attributes for creation {@link #create}.
     */
    DEFAULT_ATTRIBUTES :
    {
      onload : "qx.event.handler.Iframe.onevent(this)",
      frameBorder: 0,
      frameSpacing: 0,
      marginWidth: 0,
      marginHeight: 0,
      hspace: 0,
      vspace: 0,
      border: 0,
      allowTransparency: true
    },

    /**
     * Creates an DOM element.
     *
     * Attributes may be given directly with this call. This is critical
     * for some attributes e.g. name, type, ... in many clients.
     *
     * @param attributes {Map?null} Map of attributes to apply
     * @param win {Window?null} Window to create the element for
     * @return {Element} The created iframe node
     */
    create : function(attributes, win)
    {
      // Work on a copy to not modify given attributes map
      var attributes = attributes ? qx.lang.Object.clone(attributes) : {};
      var initValues = qx.bom.Iframe.DEFAULT_ATTRIBUTES;

      for (var key in initValues)
      {
        if (attributes[key] == null) {
          attributes[key] = initValues[key];
        }
      }

      return qx.dom.Element.create("iframe", attributes, win);
    },


    /**
     * Get the DOM window object of an iframe.
     *
     * @param iframe {Element} DOM element of the iframe.
     * @return {Window?null} The DOM window object of the iframe or null.
     * @signature function(iframe)
     */
    getWindow : function(iframe)
    {
      try {
        return iframe.contentWindow;
      } catch(ex) {
        return null;
      }
    },


    /**
     * Get the DOM document object of an iframe.
     *
     * @param iframe {Element} DOM element of the iframe.
     * @return {Document} The DOM document object of the iframe.
     */
    getDocument : function(iframe)
    {
      if ("contentDocument" in iframe) {
        try {
          return iframe.contentDocument;
        } catch(ex) {
          return null;
        }
      }

      try {
        var win = this.getWindow(iframe);
        return win ? win.document : null;
      } catch(ex) {
        return null;
      }
    },


    /**
     * Get the HTML body element of the iframe.
     *
     * @param iframe {Element} DOM element of the iframe.
     * @return {Element} The DOM node of the <code>body</code> element of the iframe.
     */
    getBody : function(iframe)
    {
      try
      {
        var doc = this.getDocument(iframe);
        return doc ? doc.getElementsByTagName("body")[0] : null;
      }
      catch(ex)
      {
        return null
      }
    },


    /**
     * Sets iframe's source attribute to given value
     *
     * @param iframe {Element} DOM element of the iframe.
     * @param source {String} URL to be set.
     * @signature function(iframe, source)
     */
    setSource : function(iframe, source)
    {
      try
      {
        // the guru says ...
        // it is better to use 'replace' than 'src'-attribute, since 'replace'
        // does not interfere with the history (which is taken care of by the
        // history manager), but there has to be a loaded document
        if (this.getWindow(iframe) && qx.dom.Hierarchy.isRendered(iframe))
        {
          /*
            Some gecko users might have an exception here:
            Exception... "Component returned failure code: 0x805e000a
            [nsIDOMLocation.replace]"  nsresult: "0x805e000a (<unknown>)"
          */
          try
          {
            // Webkit on Mac can't set the source when the iframe is still
            // loading its current page
            if ((qx.core.Environment.get("engine.name") == "webkit") &&
                qx.core.Environment.get("os.name") == "osx")
            {
              var contentWindow = this.getWindow(iframe);
              if (contentWindow) {
                contentWindow.stop();
              }
            }
            this.getWindow(iframe).location.replace(source);
          }
          catch(ex)
          {
            iframe.src = source;
          }
        }
        else
        {
          iframe.src = source;
        }

      // This is a programmer provided source. Remember URL for this source
      // for later comparison with current URL. The current URL can diverge
      // if the end-user navigates in the Iframe.
      this.__rememberUrl(iframe);

      }
      catch(ex) {
        qx.log.Logger.warn("Iframe source could not be set!");
      }
    },


    /**
     * Returns the current (served) URL inside the iframe
     *
     * @param iframe {Element} DOM element of the iframe.
     * @return {String} Returns the location href or null (if a query is not possible/allowed)
     */
    queryCurrentUrl : function(iframe)
    {
      var doc = this.getDocument(iframe);

      try
      {
        if (doc && doc.location) {
          return doc.location.href;
        }
      }
      catch(ex) {};

      return "";
    },


    /**
    * Remember actual URL of iframe.
    *
    * @param iframe {Element} DOM element of the iframe.
    */
    __rememberUrl: function(iframe)
    {

      // URL can only be detected after load. Retrieve and store URL once.
      var callback = function() {
        qx.bom.Event.removeNativeListener(iframe, "load", callback);
        iframe.$$url = qx.bom.Iframe.queryCurrentUrl(iframe);
      }

      qx.bom.Event.addNativeListener(iframe, "load", callback);
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
     * Jonathan Weiß (jonathan_rass)

************************************************************************ */


/**
 * A generic singleton that fires an "interval" event all 100 miliseconds. It
 * can be used whenever one needs to run code periodically. The main purpose of
 * this class is reduce the number of timers.
 */

qx.Class.define("qx.event.Idle",
{
  extend : qx.core.Object,
  type : "singleton",

  construct : function()
  {
    this.base(arguments);

    var timer = new qx.event.Timer(this.getTimeoutInterval());
    timer.addListener("interval", this._onInterval, this);
    timer.start();

    this.__timer = timer;
  },


  /*
  *****************************************************************************
     EVENTS
  *****************************************************************************
  */

  events :
  {
    /** This event if fired each time the interval time has elapsed */
    "interval" : "qx.event.type.Event"
  },


  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  properties :
  {
    /**
     * Interval for the timer, which periodically fires the "interval" event,
     * in milliseconds.
     */
    timeoutInterval :
    {
      check: "Number",
      init : 100,
      apply : "_applyTimeoutInterval"
    }
  },



  members :
  {

    __timer : null,

    // property apply
    _applyTimeoutInterval : function(value) {
      this.__timer.setInterval(value);
    },

    /**
     * Fires an "interval" event
     */
    _onInterval : function() {
      this.fireEvent("interval");
    }

  },

  /*
  *****************************************************************************
     DESTRUCTOR
  *****************************************************************************
  */

  destruct : function()
  {
    if (this.__timer) {
      this.__timer.stop();
    }

    this.__timer = null;
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
     * Sebastian Werner (wpbasti)
     * Andreas Ecker (ecker)
     * Fabian Jakobs (fjakobs)
     * Mustafa Sak (msak)

************************************************************************ */

/**
 * Implements an iFrame based history manager for IE 6/7/8.
 *
 * Creates a hidden iFrame and uses document.write to store entries in the
 * history browser's stack.
 *
 * @internal
 */
qx.Class.define("qx.bom.IframeHistory",
{
  extend : qx.bom.History,


  construct : function()
  {
    this.base(arguments);
    this.__initTimer();
  },


  members :
  {
    __iframe : null,
    __iframeReady : false,
    __writeStateTimner : null,
    __dontApplyState : null,
    __locationState : null,


    // overridden
    _setInitialState : function()
    {
      this.base(arguments);
      this.__locationState = this._getHash();
    },


    //overridden
    _setHash : function(value)
    {
      this.base(arguments, value);
      this.__locationState = this._encode(value);
    },


    //overridden
    addToHistory : function(state, newTitle)
    {
      if (!qx.lang.Type.isString(state)) {
        state = state + "";
      }

      if (qx.lang.Type.isString(newTitle))
      {
        this.setTitle(newTitle);
        this._titles[state] = newTitle;
      }

      if (this.getState() !== state) {
        this.setState(state);
      }
      this.fireDataEvent("request", state);
    },


    //overridden
    _onHistoryLoad : function(state)
    {
      this._setState(state);
      this.fireDataEvent("request", state);
      if (this._titles[state] != null) {
        this.setTitle(this._titles[state]);
      }
    },


    /**
     * Helper function to set state property. This will only be called
     * by _onHistoryLoad. It determines, that no apply of state will be called.
     * @param state {String} State loaded from history
     */
    _setState : function(state)
    {
      this.__dontApplyState = true;
      this.setState(state);
      this.__dontApplyState = false;
    },


    //overridden
    _applyState : function(value, old)
    {
      if (this.__dontApplyState){
        return;
      }
      this._writeState(value);
    },


    /**
     * Get state from the iframe
     *
     * @return {String} current state of the browser history
     */
    _readState : function()
    {
      if (!this.__iframeReady) {
        return this._decode(this._getHash());
      }

      var doc = this.__iframe.contentWindow.document;
      var elem = doc.getElementById("state");
      return elem ? this._decode(elem.innerText) : "";
    },


    /**
     * Store state to the iframe
     *
     * @param state {String} state to save
     */
    _writeState : function(state)
    {
      if (!this.__iframeReady) {
        this.__clearWriteSateTimer();
        this.__writeStateTimner = qx.event.Timer.once(function(){this._writeState(state);}, this, 50);
        return;
      }
      this.__clearWriteSateTimer();

      var state = this._encode(state);

      // IE8 is sometimes recognizing a hash change as history entry. Cause of sporadic surface of this behavior, we have to prevent setting hash.
      if (qx.core.Environment.get("engine.name") == "mshtml" && qx.core.Environment.get("browser.version") != 8){
        this._setHash(state);
      }

      var doc = this.__iframe.contentWindow.document;
      doc.open();
      doc.write('<html><body><div id="state">' + state + '</div></body></html>');
      doc.close();
    },


    /**
     * Helper function to clear the write state timer.
     */
    __clearWriteSateTimer : function()
    {
      if (this.__writeStateTimner){
        this.__writeStateTimner.stop();
        this.__writeStateTimner.dispose();
      }
    },


    /**
     * Initialize the polling timer
     */
    __initTimer : function()
    {
      this.__initIframe(function () {
        qx.event.Idle.getInstance().addListener("interval", this.__onHashChange, this);
      });
    },


    /**
     * Hash change listener.
     *
     * @param e {qx.event.type.Event} event instance
     */
    __onHashChange : function(e)
    {
      // the location only changes if the user manually changes the fragment
      // identifier.
      var currentState = null;
      var locationState = this._getHash();

      if (!this.__isCurrentLocationState(locationState)) {
        currentState = this.__storeLocationState(locationState);
      } else {
        currentState = this._readState();
      }
      if (qx.lang.Type.isString(currentState) && currentState != this.getState()) {
        this._onHistoryLoad(currentState);
      }
    },


    /**
     * Stores the given location state.
     *
     * @param locationState {String} location state
     * @return {String}
     */
    __storeLocationState : function (locationState)
    {
      locationState = this._decode(locationState);
      this._writeState(locationState);

      return locationState;
    },


    /**
     * Checks whether the given location state is the current one.
     *
     * @param locationState {String} location state to check
     * @return {Boolean}
     */
    __isCurrentLocationState : function (locationState) {
      return qx.lang.Type.isString(locationState) && locationState == this.__locationState;
    },


    /**
     * Initializes the iframe
     *
     * @param handler {Function?null} if given this callback is executed after iframe is ready to use
     */
    __initIframe : function(handler)
    {
      this.__iframe = this.__createIframe();
      document.body.appendChild(this.__iframe);

      this.__waitForIFrame(function()
      {
        this._writeState(this.getState());

        if (handler) {
          handler.call(this);
        }
      }, this);
    },


    /**
     * IMPORTANT NOTE FOR IE:
     * Setting the source before adding the iframe to the document.
     * Otherwise IE will bring up a "Unsecure items ..." warning in SSL mode
     *
     * @return {Iframe}
     */
    __createIframe : function ()
    {
      var iframe = qx.bom.Iframe.create({
        src : qx.util.ResourceManager.getInstance().toUri(qx.core.Environment.get("qx.blankpage"))
      });

      iframe.style.visibility = "hidden";
      iframe.style.position = "absolute";
      iframe.style.left = "-1000px";
      iframe.style.top = "-1000px";

      return iframe;
    },


    /**
     * Waits for the IFrame being loaded. Once the IFrame is loaded
     * the callback is called with the provided context.
     *
     * @param callback {Function} This function will be called once the iframe is loaded
     * @param context {Object?window} The context for the callback.
     * @param retry {Integer} number of tries to initialize the iframe
     */
    __waitForIFrame : function(callback, context, retry)
    {
      if (typeof retry === "undefined") {
        retry = 0;
      }

      if ( !this.__iframe.contentWindow || !this.__iframe.contentWindow.document )
      {
        if (retry > 20) {
          throw new Error("can't initialize iframe");
        }

        qx.event.Timer.once(function() {
          this.__waitForIFrame(callback, context, ++retry);
        }, this, 10);

        return;
      }

      this.__iframeReady = true;
      callback.call(context || window);
    }
  },


  destruct : function()
  {
    this.__iframe = null;
    if (this.__writeStateTimner){
      this.__writeStateTimner.dispose();
      this.__writeStateTimner = null;
    }
    qx.event.Idle.getInstance().removeListener("interval", this.__onHashChange, this);
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
     * Andreas Ecker (ecker)
     * Fabian Jakobs (fjakobs)

************************************************************************ */

/**
 * Default history manager implementation. Either polls for URL fragment
 * identifier (hash) changes or uses the native "hashchange" event.
 *
 * @internal
 */
qx.Class.define("qx.bom.NativeHistory",
{
  extend : qx.bom.History,

  construct : function()
  {
    this.base(arguments);
    this.__attachListeners();
  },


  members :
  {
    __checkOnHashChange : null,


    /**
     * Attach hash change listeners
     */
    __attachListeners : function()
    {
      if (qx.bom.History.SUPPORTS_HASH_CHANGE_EVENT)
      {
        this.__checkOnHashChange = qx.lang.Function.bind(this.__onHashChange, this);
        qx.bom.Event.addNativeListener(window, "hashchange", this.__checkOnHashChange);
      }
      else
      {
        qx.event.Idle.getInstance().addListener("interval", this.__onHashChange, this);
      }
    },


    /**
     * Remove hash change listeners
     */
    __detatchListeners : function()
    {
      if (qx.bom.History.SUPPORTS_HASH_CHANGE_EVENT) {
        qx.bom.Event.removeNativeListener(window, "hashchange", this.__checkOnHashChange);
      } else {
        qx.event.Idle.getInstance().removeListener("interval", this.__onHashChange, this);
      }
    },


    /**
     * hash change event handler
     */
    __onHashChange : function()
    {
      var currentState = this._readState();

      if (qx.lang.Type.isString(currentState) && currentState != this.getState()) {
        this._onHistoryLoad(currentState);
      }
    },


    /**
     * Browser dependent function to read the current state of the history
     *
     * @return {String} current state of the browser history
     */
    _readState : function() {
      return this._decode(this._getHash());
    },


    /**
     * Save a state into the browser history.
     *
     * @param state {String} state to save
     */
    _writeState : qx.core.Environment.select("engine.name",
    {
      "opera" : function(state)
      {
        qx.event.Timer.once(function()
        {
          this._setHash(this._encode(state));
        }, this, 0);
      },

      "default" : function (state) {
        this._setHash(this._encode(state));
      }
    })
  },


  destruct : function() {
    this.__detatchListeners();
  }
});