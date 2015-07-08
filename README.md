PageController
==============

> Asynchronous webpage transitioning with pushstate management.



## Installation

```shell
npm install properjs-pagecontroller
```


## Usage

### New PageController
Create a new instance of PageController.
```javascript
var pageController = new PageController({
    // Pull page back to top on changes
    anchorTop: true,

    // How long are your transitions between pages?
    // If a request happens faster than your beautiful transitions,
    // the page controller will still wait until your duration is up to
    // fire off the transition-in sequence.
    transitionTime: 600
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
Bind the modules you want PageController to sync with. Consider these to be "PageController Modules". They behave a certain way. See the [Midnight Collective](https://github.com/kitajchuk/midnight-collective-squarespace) project as a best in class example of using PageController. This example happens to be a [Grunt Nautilus](https://github.com/kitajchuk/grunt-nautilus) app, but you can roll PageController in any setup you see fit.
```javascript
// Bind modules to represent
pageController.setModules([
    feed
]);
```

### Module Layout
PageController friendly modules look a certain way. By using a normalized api for these modules, PageController can consume them. It then binds and unbinds them as needed as your app functions. This is an example of a module in a theoretical, but practical app atmosphere that would sync with PageController. Using the `onload` method, a module examines the DOM and can determine whether it should load listeners or not. With the `unload` method, a module tears itself down, unbinding all events and allowing variables to be garbage collected when not in use.
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
    _isLoaded = false,


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
        return _isActive;
    },


    isLoaded: function () {
        return _isLoaded;
    },


    onload: function () {
        _isActive = this.getElements();

        if ( _isLoaded ) {
            return;

        } else if ( !_isActive ) {
            return;
        }

        _isLoaded = true;

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
        _isLoaded = false;

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
- getActiveModules()
- getLoadedModules()
- getModules()
- getConfig()
- [getRouter()](https://github.com/ProperJS/Router)
- [getPusher()](https://github.com/ProperJS/PushState)
- [getMatcher()](https://github.com/ProperJS/MatchRoute)
- getRoute()
- getQuery()