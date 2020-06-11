import Router from "properjs-router";
import Controller from "properjs-controller";



const getRouteDataToString = ( data ) => {
    let ret = data.uri,
        i;

    for ( i in data.query ) {
        ret += `-${i}-${data.query[ i ]}`;
    }

    for ( i in data.params ) {
        ret += `-${i}-${data.params[ i ]}`;
    }

    return ret;
};



export default class PageController extends Controller {
    constructor ( options ) {
        super();

        this._options = {
            transitionTime: 0,
            routerOptions: {
                historyOptions: {},
            },
            routes: ["*"],
        };

        // Normalize usage options passed in
        options = (options || {});

        // Merge usage options with defaults
        for ( let i in options ) {
            this._options[ i ] = options[ i ];
        }

        this._silentMode = false;
        this._slientCallback = null;
        this._isRoutingActive = false;
        this._timeBefore = null;
        this._currentRoute = null;
        this._currentQuery = null;
        this._currentToString = "";
        this._isSamePage = false;
        this._isFirstRoute = true;
    }


    bind () {
        if ( this._router ) {
            return this;
        }

        this._router = new Router( this._options.routerOptions );

        if ( this._router._matcher.parse( window.location.href, this._options.routes ).matched ) {
            this._router.bind();

            const onPreGetRouter = this.onPreGetRouter.bind( this );
            const onPopGetRouter = this.onPopGetRouter.bind( this );
            const onRouterResponse = this.onRouterResponse.bind( this );

            this._options.routes.forEach(( route ) => {
                this._router.get( route, onRouterResponse );
            });

            this._router.on( "preget", onPreGetRouter );
            this._router.on( "popget", onPopGetRouter );
        }
    }


    routeSilently ( uri, cb ) {
        this._silentMode = true;
        this._silentCallback = cb;
        this._router.trigger( uri );
    }


    onRouterResponse ( data ) {
        if ( this._isRoutingActive ) {
            return;
        }

        this._isRoutingActive = true;

        this.go(() => {
            if ( (Date.now() - this._timeBefore) >= this._options.transitionTime ) {
                this.stop();
                this.handleRouterResponse( data );
            }
        });
    }


    onPreGetRouter ( data ) {
        if ( this._isRoutingActive ) {
            return;
        }

        if ( this._currentToString === getRouteDataToString( data ) ) {
            this._isSamePage = true;
            this.fire( "samepage", {
                request: data,
            });
            return;
        }

        this._timeBefore = Date.now();

        if ( !this._isFirstRoute ) {
            this.fire( "transition-out", {
                request: data,
            });
        }
    }


    onPopGetRouter ( data ) {
        if ( this._isRoutingActive ) {
            return;
        }

        this.onPreGetRouter( data.request );

        setTimeout(() => {
            this.handleRouterResponse( data );

        }, this._options.transitionTime );
    }


    handleRouterResponse ( res ) {
        if ( this._isSamePage ) {
            this._isSamePage = false;
            this._isRoutingActive = false;
            return;
        }

        const data = {
            response: res.response.responseText,
            request: res.request,
            status: res.status,
        };

        this._currentRoute = data.request.uri;
        this._currentQuery = data.request.query;
        this._currentToString = getRouteDataToString( data.request );

        // Think of this as window.onload, happens once
        if ( this._isFirstRoute ) {
            this._isFirstRoute = false;
            this._isRoutingActive = false;

            this.fire( "initialized", data );

        // All other Router sequences fall here
        } else {
            // Allow transition duration to take place
            setTimeout(() => {
                // 0.1 Refresh the document content
                this.fire( "document", data );

                // 0.2 Trigger transition of content to come back in
                this.fire( "transition-in", data );

                this._isRoutingActive = false;

                // 0.3 Check `silent` mode
                if ( this._silentMode ) {
                    this._silentMode = false;

                    if ( typeof this._silentCallback === "function" ) {
                        this._silentCallback( data );
                        this._silentCallback = null;
                    }
                }

            }, this._options.transitionTime );
        }
    }
}
