PageController
==============

> A lightweight, modern javascript router.



## Installation

```shell
npm install properjs-pagecontroller --save-dev
```


## About
PageController is a simple javascript router that utilizes an intelligent module pattern tied to the request lifecycle of pages in your webapp. It uses XHR and History and has support for Hash state as well. PageController is powerful because its a wrapper around [Router](https://github.com/ProperJS/Router) which includes [PushState](https://github.com/ProperJS/PushState), a small History management utility.



## Usage
For the usage example lets assume you have a module called `router` in your webapp that will work with PageController. For a full example of a working `router` module you can check [this one out here](https://github.com/kitajchuk/kitajchuk-template-prismic/blob/master/source/js/router.js).

Assume the `router` module has more going on, but this shows how to initialize PageController. By default, PageController does not do anything. You have to configure it first and then call the `initPage` method to turn it on. Here's the setup process.

### Instantiate
You can view more on `routerOptions` [here](https://github.com/ProperJS/Router).

```javascript
this.controller = new PageController({
    // Transition duration for page animations in milliseconds.
    // The default transition-time is 0 to just handle the request cycle.
    // Why have this? If you want nice transitions you'll use it.
    // Say your request is fast, like 10ms or whatever, this will ensure
    // that your transitionTime is still honored allowing exit/intro animations.
    transitionTime: 400,

    // Router options
    routerOptions: {}
});
```

### Configure routes
You can view more on route configuration [here](https://github.com/ProperJS/MatchRoute).

```javascript
this.controller.setConfig([
    "/",
    ":view",
    ":view/:uid"
]);
```

### Apply modules
You can see a full example of a basic PageController compatible module [here](https://github.com/kitajchuk/kitajchuk-template-prismic/blob/master/source/js/views.js). There are three required methods a module must have in order for PageController to work with it:

- onload
- unload
- isActive

You can optionally give your module and `init` method and it will be called once as part of the `page-controller-initialized-page` event cycle. There are some other module patterns that tend to make sense. I prefer giving my modules a `teardown` method that the `unload` method calls. This allows you to manually unload a module outside of the PageController lifecycle in your webapp if need be. I also like a `setup` method designed to work alongside the `isActive` method.

```javascript
// Assume we have this in our app
import view from "./views";

this.controller.setModules([
    views
]);
```

Here's a high-level look at how a module can use those patterns.

```javascript
const views = {
    // Optional, called once when PageController is initialized
    init () {},

    // Reset variables/properties and query the DOM
    setup () {
        this.views = {};
        this.elements = core.dom.main.find( ".js-view" );
    },

    // Your view is active so you can work with the DOM
    onload () {
        this.elements.forEach(( element, i ) => {
            this.loadView( this.elements.eq( i ) );
        });
    },

    // Your view is inactive so reset variables/properties
    unload () {
        this.teardown();
    },

    // Reset variables/properties
    teardown () {
        this.views = {};
        this.elements = null;
    },

    // Query DOM and determine if this module should load
    isActive () {
        this.setup();

        return (this.elements.length > 0);
    },

    // Any unique methods relevant to your module...

    loadView ( element ) {
        const data = element.data();

        this.views[ data.uid ] = new View({
            id: data.uid,
            el: element,
            url: data.api
        });
    }
};
```

### Handle events
These are the most critical events to work with when using PageController. The router lifecycle has 3 hooks — transition out, refresh document state, transition in. A one-time initialization event is fired after you call `initPage`. You can view examples of using these router events here.

[initPage](https://github.com/kitajchuk/kitajchuk-template-prismic/blob/master/source/js/router.js#L105)
```javascript
this.controller.on( "page-controller-initialized-page", this.initPage.bind( this ) );
```

[changePageOut](https://github.com/kitajchuk/kitajchuk-template-prismic/blob/master/source/js/router.js#L180)
```javascript
this.controller.on( "page-controller-router-transition-out", this.changePageOut.bind( this ) );
```

[changeContent](https://github.com/kitajchuk/kitajchuk-template-prismic/blob/master/source/js/router.js#L197)
```javascript
this.controller.on( "page-controller-router-refresh-document", this.changeContent.bind( this ) );
```

[changePageIn](https://github.com/kitajchuk/kitajchuk-template-prismic/blob/master/source/js/router.js#L217)
```javascript
this.controller.on( "page-controller-router-transition-in", this.changePageIn.bind( this ) );
```

### Start router
You have to manually call the `initPage` method in order for PageController to do anything with your webapp.

```javascript
this.controller.initPage();
```



## Events
These are all the events PageController fires.

- `page-controller-router-samepage`
- `page-controller-router-synced-modules`
- `page-controller-router-refresh-document`
- `page-controller-router-transition-out`
- `page-controller-router-transition-in`
- `page-controller-initialized-page`



## Methods
These are all the available methods your PageController instance has. You can take advantage of access to the core [Router](https://github.com/ProperJS/Router) and [PushState](https://github.com/ProperJS/PushState) instances. Say you want to manually trigger a route? You can do something like this:

```javascript
this.controller.getRouter().trigger( path );
```

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
- routeSilently( url, callback )
