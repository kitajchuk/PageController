var PageController = require( "../PageController" );
var controller = new PageController();

controller.setConfig( ["*"] );
controller.setModules( [] );
controller.on( "page-controller-router-samepage", function () {
    console.log( "samepage" );
});
controller.on( "page-controller-router-transition-out", function () {
    console.log( "out" );
});
controller.on( "page-controller-router-refresh-document", function () {
    console.log( "refresh" );
});
controller.on( "page-controller-router-transition-in", function () {
    console.log( "in" );
});
controller.on( "page-controller-initialized-page", function () {
    console.log( "init" );
});
controller.initPage();
