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
(function ( window, Controller, Router, undefined ) {


"use strict";


// Useful stuff
var _router = null,
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


// Expose
window.PageController = PageController;


})( window, window.Controller, window.Router );