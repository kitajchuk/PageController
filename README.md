PageController
==============

> Lightweight, async web app management with routing and history.



## Installation

```shell
npm install properjs-pagecontroller --save-dev
```


## Usage

### New PageController
Create a new instance of PageController.
```javascript
var PageController = require( "properjs-pagecontroller" ),
    pageController = new PageController({
        // How long are your transitions between pages?
        // If a request happens faster than your beautiful transitions,
        // the page controller will still wait until your duration is up to
        // fire off the transition-in sequence.
        transitionTime: 600,
    
        // Router options
        // These are the defaults that PageController uses
        routerOptions: {
            async: true,
            caching: true,
            preventDefault: true
        }
    });
```

### Route Configuration
Bind the routes you want PageController to adhere to. See [MatchRoute](https://github.com/ProperJS/MatchRoute) for more on this.
```javascript
// Bind route config to your domain patchs
pageController.setConfig([
    "/",
    "feed",
    "feed/:slug!slug", // Strict slug match
    "feed/:id!num" // Strict numerical match
]);

// OR, bind route config to your domain wildcard
pageController.setConfig([
    "*"
]);
```

### Bind Modules
Bind the modules you want PageController to sync with. Consider these to be registered "PageController Modules".
```javascript
// Bind modules to represent
pageController.setModules([
    feed
]);
```

### Module Layout
PageController friendly modules look a certain way. By using a normalized api for these modules, PageController can consume them. By setting these methods up correctly, PageController can handle activating/deactivating modules as your app performs. This is a breakdown of the base methods for a PageController module:

- init() - optional, use it to perform one-off page load actions
- isActive() - required, use it to determine whether a module should currently be active
- onload() - required, use it to start a module, setting stuff up and binding events
- unload() - required, use it to stop a module, tearing stuff down and unbinding events

```javascript
/*!
 *
 * App Module: feed
 *
 * This module handles feed grids.
 *
 *
 */
import "app/dom";
import "app/resizes";
import { emitter } from "app/util";


var $_jsFeed = null,
    $_jsItems = null,

    _isActive = false,


/**
 *
 * @public
 *
 */
feed = {
    init: function () {
        console.log( "feed initialized" );
    },


    isActive: function () {
        return (_isActive = this.getElements() > 0);
    },


    onload: function () {
        emitter.on( "app--scroll", onScroller );
    },


    unload: function () {
        if ( _isLoaded ) {
            this.teardown();
        }
    },


    getElements: function () {
        $_jsFeed = dom.page.find( ".js-feed" );
        $_jsItems = $_jsFeed.children();

        return ( $_jsFeed.length );
    },


    teardown: function () {
        $_jsFeed = null;
        $_jsItems = null;

        _isActive = false;

        emitter.off( "app--scroll", onScroller );
    }
},


/**
 *
 * @private
 *
 */
onScroller = function () {
    // Do some fancy pants scroll stuff here
};


/******************************************************************************
 * Export
*******************************************************************************/
export default feed;
```

### Event Listeners
```javascript
// Hook into page controller events
pageController.on( "page-controller-router-transition-out", function () {
    // Transition out your page
    // This is a great place for CSS class-hooks to achieve nice page transitions
});


pageController.on( "page-controller-router-transition-out", function ( html ) {
    // Refresh the document content for the new page
    // You'll need to parse your content from the responseText string
});

pageController.on( "page-controller-router-transition-in", function ( data ) {
    // Transition in your page back in after the content is updated
    // data.status          => number
    // data.response        => string html
    // data.request         => object
    // data.request.query   => object
    // data.request.params  => object
    // data.request.uri     => string
    // data.request.route   => string
    // data.request.matched => boolean
});
```

### Initialize
This method must be called last to actually tell PageController to run against your Web App.
```javascript
// Initialize the page controller
pageController.initPage();
```



## Events
- page-controller-router-samepage
- page-controller-router-preget
- page-controller-router-synced-modules
- page-controller-router-refresh-document
- page-controller-router-transition-out
- page-controller-router-transition-in
- page-controller-router-idle



## Methods
- on( event, callback )
- is( slug, looseMatch )
- initPage()
- [setConfig( array )](https://github.com/ProperJS/MatchRoute)
- setModules( array )
- addModule( object )
- unregisterModule( object )
- getModules()
- getConfig()
- [getRouter()](https://github.com/ProperJS/Router)
- [getPusher()](https://github.com/ProperJS/PushState)
- [getMatcher()](https://github.com/ProperJS/MatchRoute)
- getRoute()
- getQuery()