PageController
==============

> Lightweight, async web app management with routing and history.



## Installation

```shell
npm install properjs-pagecontroller --save-dev
```

## About
PageController is a wrapper around [Router](https://github.com/ProperJS/Router) which in turn takes advantage of [PushState](https://github.com/ProperJS/PushState) for simple history management piped back up to the Router.


## Usage

### New PageController
Create a new instance of PageController.
```javascript
var PageController = require( "properjs-pagecontroller" ),
    pageController = new PageController({
        // Transition duration for page animations in milliseconds.
        // The default transition-time is 0 to just handle the request cycle.
        // Why have this? If you want nice transitions you'll use it.
        // Say your request is fast, like 10ms or whatever, this will ensure
        // that your transitionTime is still honored allowing exit/intro animations.
        transitionTime: 200,
    
        // Router options
        // @see: https://github.com/ProperJS/Router
        routerOptions: {}
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
        this.teardown();
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
pageController.on( "page-controller-router-transition-out", function ( data ) {
    // Transition out your page
    // This is a great place for CSS class-hooks to achieve nice page transitions
});


pageController.on( "page-controller-router-refresh-document", function ( data ) {
    // Refresh the document content for the new page
    // You'll need to parse your content from the responseText string
});

pageController.on( "page-controller-router-transition-in", function ( data ) {
    // Transition in your page back in after the content is updated
});
```

### Data model
```javascript
{
    // Request response code
    status: number,

    // Request response text
    response: string,

    // MatchRoute data object
    request: {
        // Query string mapping
        query: object,

        // Match uri mapping
        params: object,

        // Matched uri segment(s)
        uri: string,

        // Config route uri matched
        // When using "*" as route config, this will always be "*"
        route: string,

        // Whether uri was matched to route config
        matched: boolean
    }
}

```

### Initialize
This method must be called last to actually tell PageController to run against your Web App.
```javascript
// Initialize the page controller
pageController.initPage();
```



## Events
- page-controller-router-samepage
- page-controller-router-synced-modules
- page-controller-router-refresh-document
- page-controller-router-transition-out
- page-controller-router-transition-in
- page-controller-initialized-page



## Methods
- on( event, callback )
- initPage()
- [setConfig( array )](https://github.com/ProperJS/MatchRoute)
- setModules( array )
- addModule( object )
- getModules()
- getConfig()
- [getRouter()](https://github.com/ProperJS/Router)
- [getPusher()](https://github.com/ProperJS/PushState)
- [getMatcher()](https://github.com/ProperJS/MatchRoute)
- getRoute()
- getQuery()
- routeSilently( uri, callback )