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

    if ( typeof exports === "object" && typeof module !== "undefined" ) {
        module.exports = factory();

    } else if ( typeof window !== "undefined" ) {
        window.PageController = factory();
    }

})(function () {

    // Useful stuff
    var Router = require( "properjs-router" ),
        Controller = require( "properjs-controller" ),

        _router = null,
        _config = [],
        _modules = [],
        _synced = {
            active: [],
            inactive: []
        },
        _initialized = false,
        _timeBefore = null,
        _timeDelay = 0,
        _eventPrefix = "page-controller-",
        _currentRoute = null,
        _isFirstRoute = true,
        _currentQuery = null,
        _currentToString = null,
        _isSamePage = false,
        _silentMode = false,
        _silentCallback = null,
        _isRoutingActive = false,

        // Singleton
        _instance = null,


    // Private functions
    fire = function ( event, arg ) {
        if ( !_silentMode ) {
            _instance.fire( (_eventPrefix + event), arg );
        }
    },


    isFunction = function ( fn ) {
        return (typeof fn === "function");
    },


    isSameObject = function ( o1, o2 ) {
        return (JSON.stringify( o1 ) === JSON.stringify( o2 ));
    },


    execInit = function ( method ) {
        // One time module initialization
        for ( var i = _modules.length; i--; ) {
            if ( !_modules[ i ].__initialized && isFunction( _modules[ i ].init ) ) {
                _modules[ i ].__initialized = true;
                _modules[ i ].init();
            }
        }
    },


    execUnload = function () {
        if ( _silentMode ) {
            return;
        }

        // Unload currently active modules only
        for ( var i = _synced.active.length; i--; ) {
            if ( isFunction( _synced.active[ i ].unload ) ) {
                _synced.active[ i ].unload();
            }
        }
    },


    execOnload = function () {
        if ( _silentMode ) {
            return;
        }

        // Unload newly active modules only
        for ( var i = _synced.active.length; i--; ) {
            if ( isFunction( _synced.active[ i ].onload ) ) {
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
        if ( _silentMode ) {
            return;
        }

        _synced.active = [];
        _synced.inactive = [];

        for ( var i = _modules.length; i--; ) {
            var module = _modules[ i ];

            if ( isFunction( module.isActive ) ) {
                // isActive method should rebuild module variables
                if ( module.isActive() ) {
                    _synced.active.push( module );

                } else {
                    _synced.inactive.push( module );
                }
            }
        }

        fire( "router-synced-modules", _synced );
    },


    onRouterResponse = function ( data ) {
        if ( _isRoutingActive ) {
            return;
        }

        _isRoutingActive = true;

        function __route() {
            if ( (Date.now() - _timeBefore) >= _instance._options.transitionTime ) {
                _instance.stop();

                handleRouterResponse( data );
            }
        }

        _instance.go( __route );
    },


    onPopGetRouter = function ( data ) {
        if ( _isRoutingActive ) {
            return;
        }

        onPreGetRouter( data.request );
    
        setTimeout( function () {
            handleRouterResponse( data );

        }, _instance._options.transitionTime );
    },


    /**
     * @fires page-controller-router-transition-out
     * @fires page-controller-router-samepage
     */
    onPreGetRouter = function ( data ) {
        if ( _isRoutingActive ) {
            return;
        }

        var isSameRequest = (_currentToString === getRouteDataToString( data ));

        if ( isSameRequest ) {
            fire( "router-samepage", {
                request: data
            });
            _isSamePage = true;
            return;
        }

        _timeBefore = Date.now();

        if ( !_isFirstRoute ) {
            fire( "router-transition-out", {
                request: data
            });
        }
    },


    /**
     * @fires page-controller-router-refresh-document
     * @fires page-controller-router-transition-in
     */
    handleRouterResponse = function ( res ) {
        if ( _isSamePage ) {
            _isSamePage = false;
            _isRoutingActive = false;
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
            _isRoutingActive = false;
            syncModules();
            execOnload();

            fire( "initialized-page", data );

        // All other Router sequences fall here
        } else {
            // Allow transition duration to take place
            setTimeout(function () {
                // 0.1 Sync modules and unload active ones
                syncModules();
                execUnload();

                // 0.2 Refresh the document content
                fire( "router-refresh-document", data );

                // 0.3 Sync modules and onload newly active ones
                syncModules();
                execOnload();

                // 0.4 Trigger transition of content to come back in
                fire( "router-transition-in", data );

                _isRoutingActive = false;

                // 0.5 Check `silent` mode
                if ( _silentMode ) {
                    _silentMode = false;

                    if ( isFunction( _silentCallback ) ) {
                        _silentCallback( data );
                        _silentCallback = null;
                    }
                }

            }, _instance._options.transitionTime );
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
     * <li>transitionTime</li>
     * <li>routerOptions</li>
     * </ul>
     *
     */
    var PageController = function ( options ) {
        // Singleton
        if ( !_instance ) {
            _instance = this;

            /**
             *
             * The default options
             * @memberof _options
             * @member _routerOptions
             * @private
             *
             */
            this._options = {
                transitionTime: _timeDelay,
                routerOptions: {
                    pushStateOptions: {}
                }
            };

            // Normalize usage options passed in
            options = (options || {});

            // Merge usage options with defaults
            if ( options.transitionTime ) {
                this._options.transitionTime = options.transitionTime;
            }

            if ( options.routerOptions ) {
                for ( var i in options.routerOptions ) {
                    this._options.routerOptions[ i ] = options.routerOptions[ i ];
                }
            }
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
        _router = new Router( this._options.routerOptions );

        if ( _router._matcher.parse( window.location.href, _config ).matched ) {
            _router.bind();

            for ( var i = _config.length; i--; ) {
                _router.get( _config[ i ], onRouterResponse );
            }

            _router.on( "preget", onPreGetRouter );
            _router.on( "popget", onPopGetRouter );

            execInit();
        }
    };

    /**
     *
     * Trigger the router on a uri and run PageController `silently`, so no events fire.
     * @memberof PageController
     * @method routeSilently
     * @param {string} uri The route to trigger
     * @param {function} cb The optional callback to fire when done
     *
     */
    PageController.prototype.routeSilently = function ( uri, cb ) {
        _silentMode = true;
        _silentCallback = cb;
        _router.trigger( uri );
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
            _modules.push( module );

        } else {
            throw new Error( "PageController ERROR - All registered modules require isActive, onload and unload methods." );
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

    return PageController;

});