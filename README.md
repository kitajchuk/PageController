PageController
==============

> Asynchronous webpage transitioning with pushstate management.



## Installation

```shell
npm install properjs-pagecontroller
```


## Usage
```javascript
var pageController = new PageController({
    // Pull page back to top on changes
    anchorTop: true,

    // How long are your transitions between pages
    transitionTime: 600
});

// Bind route config
pageController.setConfig([
    "/",
    "feed",
    "feed/:slug!slug",
    "about"
]);

// Bind modules to represent
pageController.setModules([
    posts
]);

// Initialize the page controller
pageController.initPage();

// Hook into page controller events
pageController.on( "page-controller-router-transition-out", function () {
    // Transition out your page
});

pageController.on( "page-controller-router-transition-in", function ( data ) {
    // Transition in your page
    // data.status => number
    // data.response => string html
    // data.request => object
    // data.request.query
    // data.request.params
    // data.request.uri
    // data.request.route
    // data.request.matched
});
```



## Events
- page-controller-before-router
- page-controller-after-router
- page-controller-router-samepage
- page-controller-router-teardown
- page-controller-router-transition-out
- page-controller-router-transition-in
- page-controller-router-transition-cleanup
- page-controller-router-idle



## Methods
- on( event, callback )
- is( slug, looseMatch )
- initPage()
- setConfig( array )
- setModules( array )
- addModule( object )
- unregisterModule( object )
- getActiveModules()
- getLoadedModules()
- getModules()
- getConfig()
- getRouter()
- getRoute()
- getQuery()