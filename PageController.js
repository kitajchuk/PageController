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
 * - isLoaded
 * - onload
 * - unload
 *
 *
 */
(function ( window, Controller, Router, undefined ) {


"use strict";


// Useful stuff
var _router = null,
    _config = [],
    _modules = [],
    _initialized = false,
    _timeBefore = null,
    _timeDelay = 600,
    _timeToIdle = 30000,
    _timeStamp = null,
    _eventPrefix = "page-controller-",
    _currentRoute = null,
    _isFirstRoute = true,
    _currentQuery = null,

    // Singleton
    _instance = null,


// Private functions
isFunction = function ( fn ) {
    return (typeof fn === "function");
},


isSameObject = function ( o1, o2 ) {
    return (JSON.stringify( o1 ) === JSON.stringify( o2 ));
},


exec = function ( method ) {
    for ( var i = _modules.length; i--; ) {
        if ( _modules[ i ].__registered && isFunction( _modules[ i ][ method ] ) ) {
            _modules[ i ][ method ].call( _modules[ i ] );
        }
    }
},


/**
 * @fires page-controller-before-router
 * @fires page-controller-transition-out
 */
onBeforeRouter = function () {
    if ( _instance._anchorTop ) {
        window.scrollTo( 0, 0 );
    }

    _timeBefore = Date.now();

    _instance.fire( (_eventPrefix + "before-router") );

    //console.log( "[PageController : before-router]" );

    // @update: Fire transition out before request cycle begins with Router
    _instance.fire( (_eventPrefix + "router-transition-out"), data );

    //console.log( "[PageController : router-transition-out]" );
},


/**
 * @fires page-controller-after-router
 */
onAfterRouter = function () {
    _instance.fire( (_eventPrefix + "after-router") );

    //console.log( "[PageController : after-router]" );
},


onRouterResponse = function ( data ) {
    function __route() {
        //console.log( "[PageController : routing]" );

        if ( (Date.now() - _timeStamp) >= _instance._transitionTime ) {
            _instance.stop();

            //console.log( "[PageController : routed]" );

            handleRouterResponse( data );
        }
    }

    _instance.go( __route );
},


syncModules = function ( callback ) {
    var synced = [],
        module;

    //console.log( "[PageController : syncing]" );

    function __sync() {
        for ( var i = _modules.length; i--; ) {
            module = _modules[ i ];

            if ( isFunction( module.isActive ) && isFunction( module.isLoaded ) && synced.indexOf( module ) === -1 ) {
                // Must be active AND loaded
                if ( module.isActive() && module.isLoaded() ) {
                    synced.push( module );

                // Inactive modules just push stack to clear the sync process
                } else {
                    synced.push( module );
                }
            }
        }

        // When all modules are resolved, fire the callback
        if ( synced.length === _modules.length ) {
            _instance.stop();

            if ( isFunction( callback ) ) {
                callback();
            }

            //console.log( "[PageController : synced]" );
        }
    }

    _instance.go( __sync );
},


/**
 * @fires page-controller-router-transition-out
 * @fires page-controller-router-transition-in
 * @fires page-controller-router-idle
 */
handleRouterResponse = function ( res ) {
    var data = {
            response: res.response.responseText,
            request: res.request,
            status: res.status
        },
        isSameRoute = (_currentRoute === data.request.uri),
        isQueried = (!isSameObject( data.request.query, {} )),
        isQuerySame = (isSameObject( data.request.query, _currentQuery ));

    if ( isQueried && (isSameRoute && isQuerySame) || !isQueried && isSameRoute ) {
        //console.log( "PageController : same page" );
        _instance.fire( (_eventPrefix + "router-samepage"), data );
        return;
    }

    _currentRoute = data.request.uri;
    _currentQuery = data.request.query;

    if ( _isFirstRoute ) {
        _isFirstRoute = false;
        exec( "unload" );
        exec( "onload" );
        return;
    }

    // Sync all modules - they must all respond to proceed
    syncModules(function () {
        // Stage time before transition back in
        setTimeout(function () {
            if ( _instance._anchorTop ) {
                window.scrollTo( 0, 0 );
            }

            _instance.fire( (_eventPrefix + "router-transition-in"), data );

            //console.log( "[PageController : router-transition-in]" );

            // Perform hooked module updates
            exec( "unload" );
            exec( "onload" );

            setTimeout(function () {
                 //console.log( "[PageController : router-transition-cleanup]" );

                // Idle state
                setTimeout(function () {
                    _instance.fire( (_eventPrefix + "router-idle"), data );

                    //console.log( "[PageController : router-idle]" );

                }, _timeToIdle );

            }, _instance._transitionTime );

        }, _instance._transitionTime );
    });
},


getModulesByState = function ( state ) {
    var modules = [];

    for ( var i = _modules.length; i--; ) {
        if ( isFunction( _modules[ i ][ state ] ) && _modules[ i ][ state ].call( _modules[ i ] ) ) {
            modules.push( _modules[ i ] );
        }
    }

    return modules;
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
 * <li>anchorTop - True / False</li>
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
         * The flag to anchor to top of page on transitions
         * @memberof PageController
         * @member _anchorTop
         * @private
         *
         */
        this._anchorTop = (options.anchorTop !== undefined) ? options.anchorTop : true;

        /**
         *
         * The duration of your transition for page content
         * @memberof PageController
         * @member _transitionTime
         * @private
         *
         */
        this._transitionTime = (options.transitionTime || _timeDelay);
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
    _router = new Router({
        async: true,
        caching: true,
        preventDefault: true
    });

    if ( !_router._matcher.parse( window.location.href, _config ).matched ) {
        //console.log( "[PageController : page not in routes]" );
        
    } else {
        _router.bind();
        
        for ( var i = _config.length; i--; ) {
            _router.get( _config[ i ], onRouterResponse );
        }
    
        _router.on( "beforeget", onBeforeRouter );
        _router.on( "afterget", onAfterRouter );
    
        exec( "init" );
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
    if ( _modules.indexOf( module ) === -1 ) {
        module.__registered = true;

        _modules.push( module );
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
 * Returns the array of active modules
 * @memberof PageController
 * @method getActiveModules
 * @returns array
 *
 */
PageController.prototype.getActiveModules = function () {
    return getModulesByState( "isActive" );
};

/**
 *
 * Returns the array of loaded modules
 * @memberof PageController
 * @method getLoadedModules
 * @returns array
 *
 */
PageController.prototype.getLoadedModules = function () {
    return getModulesByState( "isLoaded" );
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


// Expose
window.PageController = PageController;


})( window, window.Controller, window.Router );