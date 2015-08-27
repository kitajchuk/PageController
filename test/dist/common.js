/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	var PageController = __webpack_require__( 1 );
	var controller = new PageController();


	console.log( controller );

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	/*!
	 *
	 * Asynchronous webpage transitioning with pushstate management.
	 *
	 * @PageController
	 * @author: kitajchuk
	 *
	 * @module
	 * - init
	 * - isActive
	 * - onload
	 * - unload
	 *
	 *
	 */
	(function ( factory ) {
	    
	    if ( true ) {
	        module.exports = factory();

	    } else if ( typeof window !== "undefined" ) {
	        window.PageController = factory();
	    }
	    
	})(function () {

	    // Useful stuff
	    var Router = __webpack_require__( 2 ),
	        Controller = __webpack_require__( 7 ),
	        
	        _router = null,
	        _config = [],
	        _modules = [],
	        _synced = {
	            active: [],
	            inactive: []
	        },
	        _initialized = false,
	        _timeBefore = null,
	        _timeDelay = 600,
	        _timeStamp = null,
	        _eventPrefix = "page-controller-",
	        _currentRoute = null,
	        _isFirstRoute = true,
	        _currentQuery = null,
	        _currentToString = null,
	        _isSamePage = false,
	    
	        // Singleton
	        _instance = null,
	    
	    
	    // Private functions
	    isFunction = function ( fn ) {
	        return (typeof fn === "function");
	    },
	    
	    
	    isSameObject = function ( o1, o2 ) {
	        return (JSON.stringify( o1 ) === JSON.stringify( o2 ));
	    },
	    
	    
	    execInit = function ( method ) {
	        // One time module initialization
	        for ( var i = _modules.length; i--; ) {
	            if ( _modules[ i ].__registered && !_modules[ i ].__initialized && isFunction( _modules[ i ].init ) ) {
	                _modules[ i ].__initialized = true;
	                _modules[ i ].init();
	            }
	        }
	    },
	    
	    
	    execUnload = function () {
	        // Unload currently active modules only
	        for ( var i = _synced.active.length; i--; ) {
	            if ( _synced.active[ i ].__registered && isFunction( _synced.active[ i ].unload ) ) {
	                _synced.active[ i ].unload();
	            }
	        }
	    },
	    
	    
	    execOnload = function () {
	        // Unload newly active modules only
	        for ( var i = _synced.active.length; i--; ) {
	            if ( _synced.active[ i ].__registered && isFunction( _synced.active[ i ].onload ) ) {
	                _synced.active[ i ].onload();
	            }
	        }
	    },
	    
	    
	    getRouteDataToString = function ( data ) {
	        var ret = data.uri,
	            i;
	    
	        for ( i in data.query ) {
	            ret += "-" + i + "-" + data.query[ i ];
	        }
	    
	        for ( i in data.params ) {
	            ret += "-" + i + "-" + data.params[ i ];
	        }
	    
	        return ret;
	    },
	    
	    
	    /**
	     * @fires page-controller-router-synced-modules
	     */
	    syncModules = function () {
	        _synced.active = [];
	        _synced.inactive = [];
	    
	        for ( var i = _modules.length; i--; ) {
	            var module = _modules[ i ];
	    
	            if ( _modules[ i ].__registered && isFunction( module.isActive ) ) {
	                // isActive method should rebuild module variables
	                if ( module.isActive() ) {
	                    _synced.active.push( module );
	    
	                } else {
	                    _synced.inactive.push( module );
	                }
	            }
	        }
	    
	        _instance.fire( (_eventPrefix + "router-synced-modules"), _synced );
	    },
	    
	    
	    onRouterResponse = function ( data ) {
	        function __route() {
	            if ( (Date.now() - _timeStamp) >= _instance._transitionTime ) {
	                _instance.stop();
	    
	                handleRouterResponse( data );
	            }
	        }
	    
	        _instance.go( __route );
	    },
	    
	    
	    onPopGetRouter = function ( data ) {
	        onPreGetRouter( data.request );
	    
	        setTimeout( function () {
	            handleRouterResponse( data );
	    
	        }, _instance._transitionTime );
	    },
	    
	    
	    /**
	     * @fires page-controller-router-transition-out
	     * @fires page-controller-router-samepage
	     */
	    onPreGetRouter = function ( data ) {
	        var isSameRequest = (_currentToString === getRouteDataToString( data ));
	    
	        if ( isSameRequest ) {
	            _instance.fire( (_eventPrefix + "router-samepage"), data );
	            _isSamePage = true;
	            return;
	        }
	    
	        _timeBefore = Date.now();
	    
	        if ( !_isFirstRoute ) {
	            _instance.fire( (_eventPrefix + "router-transition-out"), data );
	        }
	    },
	    
	    
	    /**
	     * @fires page-controller-router-refresh-document
	     * @fires page-controller-router-transition-in
	     * @fires page-controller-router-idle
	     */
	    handleRouterResponse = function ( res ) {
	        if ( _isSamePage ) {
	            _isSamePage = false;
	            return;
	        }
	    
	        var data = {
	            response: res.response.responseText,
	            request: res.request,
	            status: res.status
	        };
	    
	        _currentRoute = data.request.uri;
	        _currentQuery = data.request.query;
	        _currentToString = getRouteDataToString( data.request );
	    
	        // Think of this as window.onload, happens once
	        if ( _isFirstRoute ) {
	            _isFirstRoute = false;
	            syncModules();
	            execOnload();
	    
	        // All other Router sequences fall here
	        } else {
	            // Allow transition duration to take place
	            setTimeout(function () {
	                // 0.1 Sync modules and unload active ones
	                syncModules();
	                execUnload();
	    
	                // 0.2 Refresh the document content
	                _instance.fire( (_eventPrefix + "router-refresh-document"), data.response );
	    
	                // 0.3 Sync modules and onload newly active ones
	                syncModules();
	                execOnload();
	    
	                // 0.4 Trigger transition of content to come back in
	                _instance.fire( (_eventPrefix + "router-transition-in"), data );
	    
	            }, _instance._transitionTime );
	        }
	    };
	    
	    
	    /**
	     *
	     * Page transition manager
	     * @constructor PageController
	     * @augments Controller
	     * @requires Controller
	     * @requires Router
	     * @memberof! <global>
	     * @param {object} options Settings for control features
	     * <ul>
	     * <li>transitionTime - Number</li>
	     * <li>routerOptions - Object</li>
	     * </ul>
	     *
	     */
	    var PageController = function ( options ) {
	        // Singleton
	        if ( !_instance ) {
	            _instance = this;
	    
	            options = (options || {});
	    
	            /**
	             *
	             * The duration of your transition for page content
	             * @memberof PageController
	             * @member _transitionTime
	             * @private
	             *
	             */
	            this._transitionTime = (options.transitionTime || _timeDelay);
	    
	            /**
	             *
	             * The flag to anchor to top of page on transitions
	             * @memberof PageController
	             * @member _routerOptions
	             * @private
	             *
	             */
	            this._routerOptions = (options.routerOptions || {
	                async: true,
	                caching: true,
	                preventDefault: true
	            });
	        }
	    
	        return _instance;
	    };
	    
	    PageController.prototype = new Controller();
	    
	    /**
	     *
	     * Initialize controller on page
	     * @memberof PageController
	     * @method initPage
	     *
	     */
	    PageController.prototype.initPage = function () {
	        if ( _initialized ) {
	            return;
	        }
	    
	        _initialized = true;
	    
	        /**
	         *
	         * Instance of Router
	         * @private
	         *
	         */
	        _router = new Router( this._routerOptions );
	    
	        if ( _router._matcher.parse( window.location.href, _config ).matched ) {
	            _router.bind();
	            
	            for ( var i = _config.length; i--; ) {
	                _router.get( _config[ i ], onRouterResponse );
	            }
	        
	            _router.on( "preget", onPreGetRouter );
	            _router.on( "popget", onPopGetRouter );
	    
	            execInit();
	    
	        } else {
	            //console.log( "[PageController : page not in routes]" );
	        }
	    };
	    
	    /**
	     *
	     * Set the Router configuration
	     * @memberof PageController
	     * @method setConfig
	     * @param {object} config The config for MatchRoute
	     *
	     */
	    PageController.prototype.setConfig = function ( config ) {
	        _config = config;
	    };
	    
	    /**
	     *
	     * Set the module configuration
	     * @memberof PageController
	     * @method setModules
	     * @param {object} modules The array of module objects
	     *
	     */
	    PageController.prototype.setModules = function ( modules ) {
	        if ( !modules ) {
	            return;
	        }
	    
	        for ( var i = modules.length; i--; ) {
	            this.addModule( modules[ i ] );
	        }
	    };
	    
	    /**
	     *
	     * Add to the module configuration
	     * @memberof PageController
	     * @method addModule
	     * @param {object} module The module object to add
	     *
	     */
	    PageController.prototype.addModule = function ( module ) {
	        if ( _modules.indexOf( module ) === -1 && isFunction( module.isActive ) && isFunction( module.onload ) && isFunction( module.unload ) ) {
	            module.__registered = true;
	    
	            _modules.push( module );
	    
	        } else {
	            throw new Error( "PageController ERROR - All registered modules require isActive, onload and unload methods." );
	        }
	    };
	    
	    /**
	     *
	     * Add to the module configuration
	     * @memberof PageController
	     * @method unregisterModule
	     * @param {object} module The module object to unregister
	     *
	     */
	    PageController.prototype.unregisterModule = function ( module ) {
	        for ( var i = _modules.length; i--; ) {
	            if ( _modules[ i ] === module ) {
	                _modules[ i ].__registered = false;
	            }
	        }
	    };
	    
	    /**
	     *
	     * Returns the array of modules
	     * @memberof PageController
	     * @method getModules
	     * @returns array
	     *
	     */
	    PageController.prototype.getModules = function () {
	        return _modules;
	    };
	    
	    /**
	     *
	     * Returns the MatchRoute config
	     * @memberof PageController
	     * @method getConfig
	     * @returns array
	     *
	     */
	    PageController.prototype.getConfig = function () {
	        return _config;
	    };
	    
	    /**
	     *
	     * Returns the instances Router
	     * @memberof PageController
	     * @method getRouter
	     * @returns Router
	     *
	     */
	    PageController.prototype.getRouter = function () {
	        return _router;
	    };
	    
	    
	    /**
	     *
	     * Returns the instances PushState
	     * @memberof PageController
	     * @method getPusher
	     * @returns PushState
	     *
	     */
	    PageController.prototype.getPusher = function () {
	        return _router._pusher;
	    };
	    
	    
	    /**
	     *
	     * Returns the instances MatchRoute
	     * @memberof PageController
	     * @method getMatcher
	     * @returns MatchRoute
	     *
	     */
	    PageController.prototype.getMatcher = function () {
	        return _router._matcher;
	    };
	    
	    
	    /**
	     *
	     * Returns the current route pathed
	     * @memberof PageController
	     * @method getRoute
	     * @returns string
	     *
	     */
	    PageController.prototype.getRoute = function () {
	        return _currentRoute;
	    };
	    
	    
	    /**
	     *
	     * Returns the current query params object
	     * @memberof PageController
	     * @method getQuery
	     * @returns string
	     *
	     */
	    PageController.prototype.getQuery = function () {
	        return _currentQuery;
	    };
	    
	    
	    /**
	     *
	     * Returns true if current page path equals slug
	     * Loose match if no second parameter is passed
	     * @memberof PageController
	     * @method is
	     * @param {string} slug The page slug to check
	     * @param {boolean} looseMatch Perform a less strict match
	     * @returns boolean
	     *
	     */
	    PageController.prototype.is = function ( slug, looseMatch ) {
	        var ret = false,
	            reg;
	    
	        reg = new RegExp( looseMatch ? ("^" + slug) : ("^" + slug + "$") );
	        ret = reg.test( _currentRoute );
	    
	        return ret;
	    };
	    
	    return PageController;

	});

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	/*!
	 *
	 * Handles basic get routing
	 *
	 * @Router
	 * @author: kitajchuk
	 *
	 */
	(function ( factory ) {
	    
	    if ( true ) {
	        module.exports = factory();

	    } else if ( typeof window !== "undefined" ) {
	        window.Router = factory();
	    }
	    
	})(function () {

	    var PushState = __webpack_require__( 3 ),
	        MatchRoute = __webpack_require__( 4 ),
	        matchElement = __webpack_require__( 6 ),
	        _rSameDomain = new RegExp( document.domain ),
	        _initDelay = 200,
	        _triggerEl;
	    
	    
	    /**
	     *
	     * A simple router Class
	     * @constructor Router
	     * @requires PushState
	     * @requires MatchRoute
	     * @requires matchElement
	     * @memberof! <global>
	     *
	     */
	    var Router = function () {
	        return this.init.apply( this, arguments );
	    };
	    
	    Router.prototype = {
	        constructor: Router,
	        
	        /**
	         *
	         * Router init constructor method
	         * @memberof Router
	         * @method init
	         * @param {object} options Settings for PushState
	         * <ul>
	         * <li>options.async</li>
	         * <li>options.caching</li>
	         * </ul>
	         *
	         * @fires beforeget
	         * @fires afterget
	         * @fires get
	         *
	         */
	        init: function ( options ) {
	            /**
	             *
	             * Internal MatchRoute instance
	             * @memberof Router
	             * @member _matcher
	             * @private
	             *
	             */
	            this._matcher = new MatchRoute();
	            
	            /**
	             *
	             * Internal PushState instance
	             * @memberof Router
	             * @member _pusher
	             * @private
	             *
	             */
	            this._pusher = null;
	            
	            /**
	             *
	             * Event handling callbacks
	             * @memberof Router
	             * @member _callbacks
	             * @private
	             *
	             */
	            this._callbacks = {};
	            
	            /**
	             *
	             * Router Store user options
	             * @memberof Router
	             * @member _options
	             * @private
	             *
	             */
	            this._options = options;
	            
	            /**
	             *
	             * Router unique ID
	             * @memberof Router
	             * @member _uid
	             * @private
	             *
	             */
	            this._uid = 0;
	        },
	        
	        /**
	         *
	         * Create PushState instance and add event listener
	         * @memberof Router
	         * @method bind
	         *
	         */
	        bind: function () {
	            var self = this,
	                isReady = false;
	            
	            // Bind GET requests to links
	            if ( document.addEventListener ) {
	                document.addEventListener( "click", function ( e ) {
	                    self._handler( this, e );
	                    
	                }, false );
	                
	            } else if ( document.attachEvent ) {
	                document.attachEvent( "onclick", function ( e ) {
	                    self._handler( this, e );
	                });
	            }
	            
	            /**
	             *
	             * Instantiate PushState
	             *
	             */
	            this._pusher = new PushState( this._options );
	            
	            /**
	             *
	             * @event popstate
	             *
	             */
	            this._pusher.on( "popstate", function ( url, data, status ) {
	                // Hook around browsers firing popstate on pageload
	                if ( isReady ) {
	                    for ( var i = self._callbacks.get.length; i--; ) {
	                        var dat = self._matcher.parse( url, self._callbacks.get[ i ]._routerRoutes );
	                        
	                        if ( dat.matched ) {
	                            break;
	                        }
	                    }
	                    
	                    data = {
	                        route: self._matcher._cleanRoute( url ),
	                        response: data,
	                        request: dat,
	                        status: status || data.status
	                    };
	                    
	                    self._fire( "popget", url, data, status );
	                    
	                } else {
	                    isReady = true;
	                }
	            });
	            
	            // Manually fire first GET
	            // Async this in order to allow .get() to work after instantiation
	            setTimeout(function () {
	                self._pusher.push( window.location.href, function ( response, status ) {
	                    self._fire( "get", window.location.href, response, status );
	                    
	                    isReady = true;
	                });
	                
	            }, _initDelay );
	        },
	        
	        /**
	         *
	         * Add an event listener
	         * Binding "beforeget" and "afterget" is a wrapper
	         * to hook into the PushState classes "beforestate" and "afterstate".
	         * @memberof Router
	         * @method on
	         * @param {string} event The event to bind to
	         * @param {function} callback The function to call
	         *
	         */
	        on: function ( event, callback ) {
	            this._bind( event, callback );
	        },
	    
	        /**
	         *
	         * Remove an event listener
	         * @memberof Router
	         * @method off
	         * @param {string} event The event to unbind
	         * @param {function} callback The function to reference
	         *
	         */
	        off: function ( event, callback ) {
	            this._unbind( event, callback );
	        },
	    
	        /**
	         *
	         * Support router triggers by url
	         * @memberof Router
	         * @method trigger
	         * @param {string} url The url to route to
	         *
	         */
	        trigger: function ( url ) {
	            if ( !_triggerEl ) {
	                _triggerEl = document.createElement( "a" );
	            }
	    
	            _triggerEl.href = url;
	    
	            this._handler( _triggerEl, {
	                target: _triggerEl
	            });
	        },
	        
	        /**
	         *
	         * Bind a GET request route
	         * @memberof Router
	         * @method get
	         * @param {string} route route to match
	         * @param {function} callback function to call when route is requested
	         *
	         */
	        get: function ( route, callback ) {
	            // Add route to matcher
	            this._matcher.config( [route] );
	            
	            // Bind the route to the callback
	            if ( callback._routerRoutes ) {
	                callback._routerRoutes.push( route );
	                
	            } else {
	                callback._routerRoutes = [route];
	            }
	            
	            // When binding multiple routes to a single
	            // callback, we need to make sure the callbacks
	            // routes array is updated above but the callback
	            // only gets added to the list once.
	            if ( callback._routerRoutes.length === 1 ) {
	                this._bind( "get", callback );
	            }
	        },
	    
	        /**
	         *
	         * Get a sanitized route for a url
	         * @memberof Router
	         * @method getRouteForUrl
	         * @param {string} url The url to use
	         * @returns {string}
	         *
	         */
	        getRouteForUrl: function ( url ) {
	            return this._matcher._cleanRoute( url );
	        },
	    
	        /**
	         *
	         * Get the match data for a url against the routes config
	         * @memberof Router
	         * @method getRouteDataForUrl
	         * @param {string} url The url to use
	         * @returns {object}
	         *
	         */
	        getRouteDataForUrl: function ( url ) {
	            return this._matcher.parse( url, this._matcher.getRoutes() ).params;
	        },
	        
	        /**
	         *
	         * Get a unique ID
	         * @memberof Router
	         * @method getUID
	         * @returns number
	         *
	         */
	        getUID: function () {
	            this._uid = (this._uid + 1);
	            
	            return this._uid;
	        },
	        
	        /**
	         * Compatible event preventDefault
	         * @memberof Router
	         * @method _preventDefault
	         * @param {object} e The event object
	         * @private
	         *
	         */
	        _preventDefault: function ( e ) {
	            if ( !this._options.preventDefault ) {
	                return this;
	            }
	            
	            if ( e.preventDefault ) {
	                e.preventDefault();
	                
	            } else {
	                e.returnValue = false;
	            }
	        },
	        
	        /**
	         * GET click event handler
	         * @memberof Router
	         * @method _handler
	         * @param {object} el The event context element
	         * @param {object} e The event object
	         * @private
	         *
	         * @fires get
	         *
	         */
	        _handler: function ( el, e ) {
	            var self = this,
	                elem = (matchElement( el, "a" ) || matchElement( e.target, "a" ));
	            
	            if ( elem ) {
	                if ( _rSameDomain.test( elem.href ) && elem.href.indexOf( "#" ) === -1 && this._matcher.test( elem.href ) ) {
	                    this._preventDefault( e );
	                    
	                    for ( var i = this._callbacks.get.length; i--; ) {
	                        var data = this._matcher.parse( elem.href, this._callbacks.get[ i ]._routerRoutes );
	                        
	                        if ( data.matched ) {
	                            this._fire( "preget", elem.href, data );
	                            break;
	                        }
	                    }
	                    
	                    this._pusher.push( elem.href, function ( response, status ) {
	                        self._fire( "get", elem.href, response, status );
	                    });
	                }
	            }
	        },
	        
	        /**
	         *
	         * Bind an event to a callback
	         * @memberof Router
	         * @method _bind
	         * @param {string} event what to bind on
	         * @param {function} callback fired on event
	         * @private
	         *
	         */
	        _bind: function ( event, callback ) {
	            if ( typeof callback === "function" ) {
	                if ( !this._callbacks[ event ] ) {
	                    this._callbacks[ event ] = [];
	                }
	                
	                callback._jsRouterID = this.getUID();
	                
	                this._callbacks[ event ].push( callback );
	            }
	        },
	    
	        /**
	         *
	         * Unbind an event to a callback(s)
	         * @memberof Router
	         * @method _bind
	         * @param {string} event what to bind on
	         * @param {function} callback fired on event
	         * @private
	         *
	         */
	        _unbind: function ( event, callback ) {
	            if ( !this._callbacks[ event ] ) {
	                return this;
	            }
	    
	            // Remove a single callback
	            if ( callback ) {
	                for ( var i = 0, len = this._callbacks[ event ].length; i < len; i++ ) {
	                    if ( callback._jsRouterID === this._callbacks[ event ][ i ]._jsRouterID ) {
	                        this._callbacks[ event ].splice( i, 1 );
	        
	                        break;
	                    }
	                }
	    
	            // Remove all callbacks for event
	            } else {
	                for ( var j = this._callbacks[ event ].length; j--; ) {
	                    this._callbacks[ event ][ j ] = null;
	                }
	        
	                delete this._callbacks[ event ];
	            }
	        },
	        
	        /**
	         *
	         * Fire an event to a callback
	         * @memberof Router
	         * @method _fire
	         * @param {string} event what to bind on
	         * @param {string} url fired on event
	         * @param {string} response html from responseText
	         * @param {number} status The request status
	         * @private
	         *
	         */
	        _fire: function ( event, url, response, status ) {
	            var i;
	            
	            // GET events have routes and are special ;-P
	            if ( event === "get" ) {
	                for ( i = this._callbacks[ event ].length; i--; ) {
	                    var data = this._matcher.parse( url, this._callbacks[ event ][ i ]._routerRoutes );
	                    
	                    if ( data.matched ) {
	                        this._callbacks[ event ][ i ].call( this, {
	                            route: this._matcher._cleanRoute( url ),
	                            response: response,
	                            request: data,
	                            status: status
	                        });
	                    }
	                }
	            
	            // Fires basic timing events "beforeget" / "afterget"    
	            } else if ( this._callbacks[ event ] ) {
	                for ( i = this._callbacks[ event ].length; i--; ) {
	                    this._callbacks[ event ][ i ].call( this, response );
	                }
	            }
	        }
	    };
	    
	    
	    return Router;

	});

/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	/*!
	 *
	 * Handles history pushstate/popstate with async option
	 * If history is not supported, falls back to hashbang!
	 *
	 * @PushState
	 * @author: kitajchuk
	 *
	 */
	(function ( factory ) {
	    
	    if ( true ) {
	        module.exports = factory();

	    } else if ( typeof window !== "undefined" ) {
	        window.PushState = factory();
	    }
	    
	})(function () {

	    /**
	     *
	     * A simple pushState Class
	     * Supported events with .on():
	     * <ul>
	     * <li>popstate</li>
	     * <li>beforestate</li>
	     * <li>afterstate</li>
	     * </ul>
	     * @constructor PushState
	     * @memberof! <global>
	     *
	     */
	    var PushState = function () {
	        return this.init.apply( this, arguments );
	    };
	    
	    PushState.prototype = {
	        constructor: PushState,
	        
	        /**
	         *
	         * Expression match #
	         * @memberof PushState
	         * @member _rHash
	         * @private
	         *
	         */
	        _rHash: /#/,
	        
	        /**
	         *
	         * Expression match http/https
	         * @memberof PushState
	         * @member _rHTTPs
	         * @private
	         *
	         */
	        _rHTTPs: /^http[s]?:\/\/.*?\//,
	        
	        /**
	         *
	         * Flag whether pushState is enabled
	         * @memberof PushState
	         * @member _pushable
	         * @private
	         *
	         */
	        _pushable: ("history" in window && "pushState" in window.history),
	        
	        /**
	         *
	         * Fallback to hashchange if needed. Support:
	         * <ul>
	         * <li>Internet Explorer 8</li>
	         * <li>Firefox 3.6</li>
	         * <li>Chrome 5</li>
	         * <li>Safari 5</li>
	         * <li>Opera 10.6</li>
	         * </ul>
	         * @memberof PushState
	         * @member _hashable
	         * @private
	         *
	         */
	        _hashable: ("onhashchange" in window),
	        
	        /**
	         *
	         * PushState init constructor method
	         * @memberof PushState
	         * @method PushState.init
	         * @param {object} options Settings for PushState
	         * <ul>
	         * <li>options.async</li>
	         * <li>options.caching</li>
	         * <li>options.handle404</li>
	         * <li>options.handle500</li>
	         * </ul>
	         *
	         */
	        init: function ( options ) {
	            var url = window.location.href;
	            
	            /**
	             *
	             * Flag whether state is enabled
	             * @memberof PushState
	             * @member _enabled
	             * @private
	             *
	             */
	            this._enabled = false;
	            
	            /**
	             *
	             * Flag when hash is changed by PushState
	             * This allows appropriate replication of popstate
	             * @memberof PushState
	             * @member _ishashpushed
	             * @private
	             *
	             */
	            this._ishashpushed = false;
	            
	            /**
	             *
	             * Unique ID ticker
	             * @memberof PushState
	             * @member _uid
	             * @private
	             *
	             */
	            this._uid = 0;
	            
	            /**
	             *
	             * Stored state objects
	             * @memberof PushState
	             * @member _states
	             * @private
	             *
	             */
	            this._states = {};
	            
	            /**
	             *
	             * Stored response objects
	             * @memberof PushState
	             * @member _responses
	             * @private
	             *
	             */
	            this._responses = {};
	            
	            /**
	             *
	             * Event callbacks
	             * @memberof PushState
	             * @member _callbacks
	             * @private
	             *
	             */
	            this._callbacks = {};
	            
	            /**
	             *
	             * Flag whether to use ajax
	             * @memberof PushState
	             * @member _async
	             * @private
	             *
	             */
	            this._async = ( options && options.async !== undefined ) ? options.async : true;
	            
	            /**
	             *
	             * Flag whether to use cached responses
	             * @memberof PushState
	             * @member _caching
	             * @private
	             *
	             */
	            this._caching = ( options && options.caching !== undefined ) ? options.caching : true;
	            
	            /**
	             *
	             * Flag whether to handle 404 pages
	             * @memberof PushState
	             * @member _handle404
	             * @private
	             *
	             */
	            this._handle404 = ( options && options.handle404 !== undefined ) ? options.handle404 : true;
	            
	            /**
	             *
	             * Flag whether to handle 500 pages
	             * @memberof PushState
	             * @member _handle500
	             * @private
	             *
	             */
	            this._handle500 = ( options && options.handle500 !== undefined ) ? options.handle500 : true;
	            
	            // Set initial state
	            this._states[ url ] = {
	                uid: this.getUID(),
	                cached: false
	            };
	    
	            // Enable the popstate event
	            this._stateEnable();
	        },
	        
	        /**
	         *
	         * Bind a callback to an event
	         * @memberof PushState
	         * @method on
	         * @param {string} event The event to bind to
	         * @param {function} callback The function to call
	         *
	         */
	        on: function ( event, callback ) {
	            if ( typeof callback === "function" ) {
	                if ( !this._callbacks[ event ] ) {
	                    this._callbacks[ event ] = [];
	                }
	                
	                callback._pushstateID = this.getUID();
	                callback._pushstateType = event;
	                
	                this._callbacks[ event ].push( callback );
	            }
	        },
	        
	        /**
	         *
	         * Unbind a callback to an event
	         * @memberof PushState
	         * @method off
	         * @param {string} event The event that was bound
	         * @param {function} callback The function to remove
	         *
	         */
	        off: function ( event, callback ) {
	            if ( this._callbacks[ event ] ) {
	                for ( var i = this._callbacks[ event ].length; i--; ) {
	                    if ( this._callbacks[ event ][ i ]._pushstateID === callback._pushstateID ) {
	                        this._callbacks[ event ].splice( i, 1 );
	                        break;
	                    }
	                }
	            }
	        },
	        
	        /**
	         *
	         * Push onto the History state
	         * @memberof PushState
	         * @method push
	         * @param {string} url address to push to history
	         * @param {function} callback function to call when done
	         *
	         * @fires beforestate
	         * @fires afterstate
	         *
	         */
	        push: function ( url, callback ) {
	            var self = this;
	            
	            // Break on pushing current url
	            if ( url === window.location.href && this._stateCached( url ) ) {
	                callback( this._responses[ url ], 200 );
	                
	                return;
	            }
	            
	            this._fire( "beforestate" );
	            
	            // Break on cached
	            if ( this._stateCached( url ) ) {
	                this._push( url );
	                        
	                callback( this._responses[ url ], 200 );
	            
	            // Push new state    
	            } else {
	                this._states[ url ] = {
	                    uid: this.getUID(),
	                    cached: false
	                };
	                
	                if ( this._async ) {
	                    this._getUrl( url, function ( response, status ) {
	                        self._push( url );
	        
	                        self._fire( "afterstate", response, status );
	                        
	                        if ( typeof callback === "function" ) {
	                            callback( response, status );
	                        }
	                    });
	        
	                } else {
	                    this._push( url );
	    
	                    this._fire( "afterstate" );
	                    
	                    if ( typeof callback === "function" ) {
	                        callback();
	                    }
	                }
	            }
	        },
	        
	        /**
	         *
	         * Manually go back in history state
	         * @memberof PushState
	         * @method goBack
	         *
	         * @fires backstate
	         *
	         */
	        goBack: function () {
	            window.history.back();
	            
	            this._fire( "backstate" );
	        },
	        
	        /**
	         *
	         * Manually go forward in history state
	         * @memberof PushState
	         * @method goForward
	         *
	         * @fires forwardstate
	         *
	         */
	        goForward: function () {
	            window.history.forward();
	            
	            this._fire( "forwardstate" );
	        },
	        
	        /**
	         *
	         * Get a unique ID
	         * @memberof PushState
	         * @method getUID
	         * @returns number
	         *
	         */
	        getUID: function () {
	            this._uid = (this._uid + 1);
	            
	            return this._uid;
	        },
	        
	        /**
	         *
	         * Calls window.history.pushState
	         * @memberof PushState
	         * @method _push
	         * @param {string} url The url to push
	         * @private
	         *
	         */
	        _push: function ( url ) {
	            if ( this._pushable ) {
	                window.history.pushState( this._states[ url ], "", url );
	                
	            } else {
	                this._ishashpushed = true;
	                
	                window.location.hash = url.replace( this._rHTTPs, "" );
	            }
	        },
	        
	        /**
	         *
	         * Check if state has been cached for a url
	         * @memberof PushState
	         * @method _stateCached
	         * @param {string} url The url to check
	         * @private
	         *
	         */
	        _stateCached: function ( url ) {
	            var ret = false;
	            
	            if ( this._caching && this._states[ url ] && this._states[ url ].cached && this._responses[ url ] ) {
	                ret = true;
	            }
	            
	            return ret;
	        },
	        
	        /**
	         *
	         * Cache the response for a url
	         * @memberof PushState
	         * @method _cacheState
	         * @param {string} url The url to cache for
	         * @param {object} response The XMLHttpRequest response object
	         * @private
	         *
	         */
	        _cacheState: function ( url, response ) {
	            if ( this._caching ) {
	                this._states[ url ].cached = true;
	                this._responses[ url ] = response;
	            }
	        },
	        
	        /**
	         *
	         * Request a url with an XMLHttpRequest
	         * @memberof PushState
	         * @method _getUrl
	         * @param {string} url The url to request
	         * @param {function} callback The function to call when done
	         * @private
	         *
	         */
	        _getUrl: function ( url, callback ) {
	            var handler = function ( res, stat ) {
	                    try {
	                        // Cache if option enabled
	                        self._cacheState( url, res );
	                        
	                        if ( typeof callback === "function" ) {
	                            callback( res, (stat ? stat : undefined) );
	                        }
	                        
	                    } catch ( error ) {}
	                },
	                xhr = new XMLHttpRequest(),
	                self = this;
	            
	            xhr.open( "GET", url, true );
	            
	            xhr.onreadystatechange = function ( e ) {
	                if ( this.readyState === 4 ) {
	                    if ( this.status === 200 ) {
	                        handler( this, 200 );
	                        
	                    } else if ( this.status === 404 && self._handle404 ) {
	                        handler( this, 404 );
	                        
	                    } else if ( this.status === 500 && self._handle500 ) {
	                        handler( this, 500 );
	                    }
	                }
	            };
	            
	            xhr.send();
	        },
	        
	        /**
	         *
	         * Fire an events callbacks
	         * @memberof PushState
	         * @method _fire
	         * @param {string} event The event to fire
	         * @param {string} url The current url
	         * @private
	         *
	         */
	        _fire: function ( event, url ) {
	            if ( this._callbacks[ event ] ) {
	                for ( var i = this._callbacks[ event ].length; i--; ) {
	                    this._callbacks[ event ][ i ].apply( this, [].slice.call( arguments, 1 ) );
	                }
	            }
	        },
	        
	        /**
	         *
	         * Bind this instances state handler
	         * @memberof PushState
	         * @method _stateEnabled
	         * @private
	         *
	         * @fires popstate
	         *
	         */
	        _stateEnable: function () {
	            if ( this._enabled ) {
	                return this;
	            }
	    
	            var self = this,
	                handler = function () {
	                    var url = window.location.href.replace( self._rHash, "/" );
	                    
	                    if ( self._stateCached( url ) ) {
	                        self._fire( "popstate", url, self._responses[ url ] );
	                        
	                    } else {
	                        self._getUrl( url, function ( response, status ) {
	                            self._fire( "popstate", url, response, status );
	                        });
	                    }
	                };
	    
	            this._enabled = true;
	            
	            if ( this._pushable ) {
	                window.addEventListener( "popstate", function ( e ) {
	                    handler();
	                    
	                }, false );
	                
	            } else if ( this._hashable ) {
	                window.addEventListener( "hashchange", function ( e ) {
	                    if ( !self._ishashpushed ) {
	                        handler();
	                        
	                    } else {
	                        self._ishashpushed = false;
	                    }
	                    
	                }, false );
	            }
	        }
	    };
	    
	    return PushState;

	});

/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	/*!
	 *
	 * Handles wildcard route matching against urls with !num and !slug condition testing
	 *
	 * @MatchRoute
	 * @author: kitajchuk
	 *
	 */
	(function ( factory ) {
	    
	    if ( true ) {
	        module.exports = factory();

	    } else if ( typeof window !== "undefined" ) {
	        window.MatchRoute = factory();
	    }
	    
	})(function () {

	    var paramalama = __webpack_require__( 5 ),

	    /**
	     *
	     * Handles wildcard route matching against urls with !num and !slug condition testing
	     * <ul>
	     * <li>route = "/some/random/path/:myvar"</li>
	     * <li>route = "/some/random/path/:myvar!num"</li>
	     * <li>route = "/some/random/path/:myvar!slug"</li>
	     * </ul>
	     * @constructor MatchRoute
	     * @memberof! <global>
	     * @requires paramalama
	     *
	     */
	    MatchRoute = function () {
	        return this.init.apply( this, arguments );
	    };
	    
	    MatchRoute.prototype = {
	        constructor: MatchRoute,
	        
	        /**
	         *
	         * Expression match http/https
	         * @memberof MatchRoute
	         * @member _rHTTPs
	         * @private
	         *
	         */
	        _rHTTPs: /^http[s]?:\/\/.*?\//,
	        
	        /**
	         *
	         * Expression match trail slashes
	         * @memberof MatchRoute
	         * @member _rTrails
	         * @private
	         *
	         */
	        _rTrails: /^\/|\/$/g,
	        
	        /**
	         *
	         * Expression match hashbang/querystring
	         * @memberof MatchRoute
	         * @member _rHashQuery
	         * @private
	         *
	         */
	        _rHashQuery: /#.*$|\?.*$/g,
	        
	        /**
	         *
	         * Expression match wildcards
	         * @memberof MatchRoute
	         * @member _rWild
	         * @private
	         *
	         */
	        _rWild: /^:/,
	        
	        /**
	         *
	         * Expressions to match wildcards with supported conditions
	         * @memberof MatchRoute
	         * @member _wilders
	         * @private
	         *
	         */
	        _wilders: {
	            num: /^[0-9]+$/,
	            slug: /^[A-Za-z]+[A-Za-z0-9-_.]*$/
	        },
	        
	        
	        /**
	         *
	         * MatchRoute init constructor method
	         * @memberof MatchRoute
	         * @method init
	         * @param {array} routes Config routes can be passed on instantiation
	         *
	         */
	        init: function ( routes ) {
	            /**
	             *
	             * The routes config array
	             * @memberof MatchRoute
	             * @member _routes
	             * @private
	             *
	             */
	            this._routes = ( routes ) ? this._cleanRoutes( routes ) : [];
	        },
	    
	        /**
	         *
	         * Get the internal route array
	         * @memberof MatchRoute
	         * @method MatchRoute.getRoutes
	         * @returns {array}
	         *
	         */
	        getRoutes: function () {
	            return this._routes;
	        },
	        
	        /**
	         *
	         * Update routes config array
	         * @memberof MatchRoute
	         * @method config
	         * @param {array} routes to match against
	         *
	         */
	        config: function ( routes ) {
	            // Force array on routes
	            routes = ( typeof routes === "string" ) ? [ routes ] : routes;
	    
	            this._routes = this._routes.concat( this._cleanRoutes( routes ) );
	            
	            return this;
	        },
	        
	        /**
	         *
	         * Test a url against a routes config for match validation
	         * @memberof MatchRoute
	         * @method test
	         * @param {string} url to test against routes
	         * @returns True or False
	         *
	         */
	        test: function ( url ) {
	            return this.parse( url, this._routes ).matched;
	        },
	        
	        /**
	         *
	         * Match a url against a routes config for matches
	         * @memberof MatchRoute
	         * @method params
	         * @param {string} url to test against routes
	         * @returns Array of matching routes
	         *
	         */
	        params: function ( url ) {
	            return this.parse( url, this._routes ).params;
	        },
	        
	        /**
	         *
	         * Compare a url against a specific route
	         * @memberof MatchRoute
	         * @method compare
	         * @param {string} route compare route
	         * @param {string} url compare url
	         * @returns MatchRoute.parse()
	         *
	         */
	        compare: function ( route, url ) {
	            return this.parse( url, [route] );
	        },
	        
	        /**
	         *
	         * Parse a url for matches against config array
	         * @memberof MatchRoute
	         * @method parse
	         * @param {string} url to test against routes
	         * @param {array} routes The routes to test against
	         * @returns Object witch match bool and matches array
	         *
	         */
	        parse: function ( url, routes ) {
	            var segMatches,
	                isStar,
	                params,
	                match,
	                route = this._cleanRoute( url ),
	                ruris,
	                regex,
	                cond,
	                uris = route.split( "/" ),
	                uLen = uris.length,
	                iLen = routes.length,
	                ret;
	            
	            for ( var i = 0; i < iLen; i++ ) {
	                // Flag "*" route
	                isStar = (routes[ i ] === "*");
	                
	                // Start fresh each iteration
	                // Only one matched route allowed
	                ret = {
	                    matched: false,
	                    route: null,
	                    uri: [],
	                    params: {},
	                    query: paramalama( url )
	                };
	                
	                ruris = routes[ i ].split( "/" );
	                
	                // Handle route === "/"
	                if ( route === "/" && routes[ i ] === "/" ) {
	                    ret.matched = true;
	                    ret.route = routes[ i ];
	                    ret.uri = "/";
	                    
	                    break;
	                }
	                
	                // If the actual url doesn't match the route in segment length,
	                // it cannot possibly be considered for matching so just skip it
	                if ( ruris.length !== uris.length && !isStar ) {
	                    continue;
	                }
	                
	                segMatches = 0;
	                
	                for ( var j = 0; j < uLen; j++ ) {
	                    // Matched a variable uri segment
	                    if ( this._rWild.test( ruris[ j ] ) ) {
	                        // Try to split on conditions
	                        params = ruris[ j ].split( "!" );
	                        
	                        // The variable segment
	                        match = params[ 0 ];
	                        
	                        // The match condition
	                        cond = params[ 1 ];
	                        
	                        // With conditions
	                        if ( cond ) {
	                            // We support this condition
	                            if ( this._wilders[ cond ] ) {
	                                regex = this._wilders[ cond ];
	                            }
	                            
	                            // Test against the condition
	                            if ( regex && regex.test( uris[ j ] ) ) {
	                                segMatches++;
	                                
	                                // Add the match to the config data
	                                ret.params[ match.replace( this._rWild, "" ) ] = uris[ j ];
	                                ret.uri.push( uris[ j ] );
	                            }
	                        
	                        // No conditions, anything goes   
	                        } else {
	                            segMatches++;
	                            
	                            // Add the match to the config data
	                            ret.params[ match.replace( this._rWild, "" ) ] = uris[ j ];
	                            ret.uri.push( uris[ j ] );
	                        }
	                    
	                    // Defined segment always goes   
	                    } else {
	                        if ( uris[ j ] === ruris[ j ] ) {
	                            segMatches++;
	                            
	                            ret.uri.push( uris[ j ] );
	                        }
	                    }
	                }
	                
	                // Handle a uri segment match OR "*" wildcard everything
	                if ( segMatches === uris.length || isStar ) {
	                    ret.matched = true;
	                    ret.route = routes[ i ];
	                    ret.uri = ( isStar ) ? route : ret.uri.join( "/" );
	                    
	                    break;
	                }
	            }
	            
	            return ret;
	        },
	        
	        /**
	         *
	         * Clean a route string
	         * If the route === "/" then it is returned as is
	         * @memberof MatchRoute
	         * @method _cleanRoute
	         * @param {string} route the route to clean
	         * @returns cleaned route string
	         * @private
	         *
	         */
	        _cleanRoute: function ( route ) {
	            if ( route !== "/" ) {
	                route = route.replace( this._rHTTPs, "" );
	                route = route.replace( this._rTrails, "" );
	                route = route.replace( this._rHashQuery, "" );
	                route = route.replace( this._rTrails, "" );
	            }
	            
	            if ( route === "" ) {
	                route = "/";
	            }
	            
	            return route;
	        },
	        
	        /**
	         *
	         * Clean an array of route strings
	         * @memberof MatchRoute
	         * @method _cleanRoutes
	         * @param {array} routes the routes to clean
	         * @returns cleaned routes array
	         * @private
	         *
	         */
	        _cleanRoutes: function ( routes ) {
	            for ( var i = routes.length; i--; ) {
	                routes[ i ] = this._cleanRoute( routes[ i ] );
	            }
	            
	            return routes;
	        }
	    };
	    
	    
	    return MatchRoute;


	});

/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	/*!
	 *
	 * Parse query string into object literal representation
	 *
	 * @compat: jQuery, Ender, Zepto
	 * @author: @kitajchuk
	 *
	 *
	 */
	(function ( factory ) {
	    
	    if ( true ) {
	        module.exports = factory();

	    } else if ( typeof window !== "undefined" ) {
	        window.paramalama = factory();
	    }
	    
	})(function () {
	    
	    var paramalama = function ( str ) {
	        var query = decodeURIComponent( str ).match( /[#|?].*$/g ),
	            ret = {};
	        
	        if ( query ) {
	            query = query[ 0 ].replace( /^\?|^#|^\/|\/$|\[|\]/g, "" );
	            query = query.split( "&" );
	            
	            for ( var i = query.length; i--; ) {
	                var pair = query[ i ].split( "=" ),
	                    key = pair[ 0 ],
	                    val = pair[ 1 ];
	                
	                if ( ret[ key ] ) {
	                    // #2 https://github.com/kitajchuk/paramalama/issues/2
	                    // This supposedly will work as of ECMA-262
	                    // This works since we are not passing objects across frame boundaries
	                    // and we are not considering Array-like objects. This WILL be an Array.
	                    if ( {}.toString.call( ret[ key ] ) !== "[object Array]" ) {
	                        ret[ key ] = [ ret[ key ] ];
	                    }
	                    
	                    ret[ key ].push( val );
	                    
	                } else {
	                    ret[ key ] = val;
	                }
	            }
	        }
	        
	        return ret;
	    };
	    
	    if ( typeof $ !== "undefined" ) {
	        $.paramalama = paramalama;
	    }

	    return paramalama;
	    
	});


/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	/*!
	 *
	 * Use native element selector matching
	 *
	 * @matchElement
	 * @author: kitajchuk
	 *
	 */
	(function ( factory ) {
	    
	    if ( true ) {
	        module.exports = factory();

	    } else if ( typeof window !== "undefined" ) {
	        window.matchElement = factory();
	    }
	    
	})(function () {

	    /**
	     *
	     * Use native element selector matching
	     * @memberof! <global>
	     * @method matchElement
	     * @param {object} el the element
	     * @param {string} selector the selector to match
	     * @returns element OR null
	     *
	     */
	    var matchElement = function ( el, selector ) {
	        var method = ( el.matches ) ? "matches" : ( el.webkitMatchesSelector ) ? 
	                                      "webkitMatchesSelector" : ( el.mozMatchesSelector ) ? 
	                                      "mozMatchesSelector" : ( el.msMatchesSelector ) ? 
	                                      "msMatchesSelector" : ( el.oMatchesSelector ) ? 
	                                      "oMatchesSelector" : null;
	        
	        // Try testing the element agains the selector
	        if ( method && el[ method ].call( el, selector ) ) {
	            return el;
	        
	        // Keep walking up the DOM if we can
	        } else if ( el !== document.documentElement && el.parentNode ) {
	            return matchElement( el.parentNode, selector );
	        
	        // Otherwise we should not execute an event
	        } else {
	            return null;
	        }
	    };
	    
	    
	    return matchElement;

	});

/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	/*!
	 *
	 * Event / Animation cycle manager
	 *
	 * @Controller
	 * @author: kitajchuk
	 *
	 *
	 */
	(function ( factory ) {
	    
	    if ( true ) {
	        module.exports = factory();

	    } else if ( typeof window !== "undefined" ) {
	        window.Controller = factory();
	    }
	    
	})(function () {
	    // Private animation functions
	    var raf = window.requestAnimationFrame,
	        caf = window.cancelAnimationFrame,
	    
	    
	    /**
	     *
	     * Event / Animation cycle manager
	     * @constructor Controller
	     * @requires raf
	     * @memberof! <global>
	     *
	     */
	    Controller = function () {
	        return this.init.apply( this, arguments );
	    };
	    
	    Controller.prototype = {
	        constructor: Controller,
	    
	        /**
	         *
	         * Controller constructor method
	         * @memberof Controller
	         * @method Controller.init
	         *
	         */
	        init: function () {
	            /**
	             *
	             * Controller event handlers object
	             * @memberof Controller
	             * @member _handlers
	             * @private
	             *
	             */
	            this._handlers = {};
	    
	            /**
	             *
	             * Controller unique ID
	             * @memberof Controller
	             * @member _uid
	             * @private
	             *
	             */
	            this._uid = 0;
	    
	            /**
	             *
	             * Started iteration flag
	             * @memberof Controller
	             * @member _started
	             * @private
	             *
	             */
	            this._started = false;
	    
	            /**
	             *
	             * Paused flag
	             * @memberof Controller
	             * @member _paused
	             * @private
	             *
	             */
	            this._paused = false;
	    
	            /**
	             *
	             * Timeout reference
	             * @memberof Controller
	             * @member _cycle
	             * @private
	             *
	             */
	            this._cycle = null;
	        },
	    
	        /**
	         *
	         * Controller go method to start frames
	         * @memberof Controller
	         * @method go
	         *
	         */
	        go: function ( fn ) {
	            if ( this._started && this._cycle ) {
	                return this;
	            }
	    
	            this._started = true;
	    
	            var self = this,
	                anim = function () {
	                    self._cycle = raf( anim );
	    
	                    if ( self._started ) {
	                        if ( typeof fn === "function" ) {
	                            fn();
	                        }
	                    }
	                };
	    
	            anim();
	        },
	    
	        /**
	         *
	         * Pause the cycle
	         * @memberof Controller
	         * @method pause
	         *
	         */
	        pause: function () {
	            this._paused = true;
	    
	            return this;
	        },
	    
	        /**
	         *
	         * Play the cycle
	         * @memberof Controller
	         * @method play
	         *
	         */
	        play: function () {
	            this._paused = false;
	    
	            return this;
	        },
	    
	        /**
	         *
	         * Stop the cycle
	         * @memberof Controller
	         * @method stop
	         *
	         */
	        stop: function () {
	            caf( this._cycle );
	    
	            this._paused = false;
	            this._started = false;
	            this._cycle = null;
	    
	            return this;
	        },
	    
	        /**
	         *
	         * Controller add event handler
	         * @memberof Controller
	         * @method on
	         * @param {string} event the event to listen for
	         * @param {function} handler the handler to call
	         *
	         */
	        on: function ( event, handler ) {
	            var events = event.split( " " );
	    
	            // One unique ID per handler
	            handler._jsControllerID = this.getUID();
	    
	            for ( var i = events.length; i--; ) {
	                if ( typeof handler === "function" ) {
	                    if ( !this._handlers[ events[ i ] ] ) {
	                        this._handlers[ events[ i ] ] = [];
	                    }
	    
	                    // Handler can be stored with multiple events
	                    this._handlers[ events[ i ] ].push( handler );
	                }
	            }
	    
	            return this;
	        },
	    
	        /**
	         *
	         * Controller remove event handler
	         * @memberof Controller
	         * @method off
	         * @param {string} event the event to remove handler for
	         * @param {function} handler the handler to remove
	         *
	         */
	        off: function ( event, handler ) {
	            if ( !this._handlers[ event ] ) {
	                return this;
	            }
	    
	            // Remove a single handler
	            if ( handler ) {
	                this._off( event, handler );
	    
	            // Remove all handlers for event
	            } else {
	                this._offed( event );
	            }
	    
	            return this;
	        },
	    
	        /**
	         *
	         * Controller fire an event
	         * @memberof Controller
	         * @method fire
	         * @param {string} event the event to fire
	         *
	         */
	        fire: function ( event ) {
	            if ( !this._handlers[ event ] ) {
	                return this;
	            }
	    
	            var args = [].slice.call( arguments, 1 );
	    
	            for ( var i = this._handlers[ event ].length; i--; ) {
	                this._handlers[ event ][ i ].apply( this, args );
	            }
	    
	            return this;
	        },
	    
	        /**
	         *
	         * Get a unique ID
	         * @memberof Controller
	         * @method getUID
	         * @returns number
	         *
	         */
	        getUID: function () {
	            this._uid = (this._uid + 1);
	    
	            return this._uid;
	        },
	    
	        /**
	         *
	         * Controller internal off method assumes event AND handler are good
	         * @memberof Controller
	         * @method _off
	         * @param {string} event the event to remove handler for
	         * @param {function} handler the handler to remove
	         * @private
	         *
	         */
	        _off: function ( event, handler ) {
	            for ( var i = 0, len = this._handlers[ event ].length; i < len; i++ ) {
	                if ( handler._jsControllerID === this._handlers[ event ][ i ]._jsControllerID ) {
	                    this._handlers[ event ].splice( i, 1 );
	    
	                    break;
	                }
	            }
	        },
	    
	        /**
	         *
	         * Controller completely remove all handlers and an event type
	         * @memberof Controller
	         * @method _offed
	         * @param {string} event the event to remove handler for
	         * @private
	         *
	         */
	        _offed: function ( event ) {
	            for ( var i = this._handlers[ event ].length; i--; ) {
	                this._handlers[ event ][ i ] = null;
	            }
	    
	            delete this._handlers[ event ];
	        }
	    };

	    return Controller;
	});

/***/ }
/******/ ]);