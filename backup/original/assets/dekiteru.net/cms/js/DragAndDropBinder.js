var DragAndDropBinder = function( jqObject, startCallback, movingCallback, endCallback, vars )
{

    var self = this;

    this.moving = false;

    this.jqObject;
    this.vars;
    this.startCallback;
    this.movingCallback;
    this.endCallback;
    this.position;


    // 汎用変数入れ
    this.vars = {};


    this.isSmartPhone = function()
    {

        var ua = navigator.userAgent;

        return (ua.indexOf('iPhone') !== -1 || ua.indexOf('Android') !== -1);

    }

    this.isTablet = function()
    {

        var tablet = window.matchMedia("(hover: none)");
        var isTablet = $(window).width() > 480 && tablet.matches;

        return isTablet;

    }


    this.x = function( event )
    {
        return self.usingBySmartPhone || self.usingByTablet ? event.originalEvent.changedTouches[0].clientX : event.clientX
    }

    this.y = function( event )
    {
        return self.usingBySmartPhone || self.usingByTablet ? event.originalEvent.changedTouches[0].clientY : event.clientY
    }


    this.__construct = function()
    {

        self.jqObject = jqObject;
        self.vars = vars;
        self.startCallback = startCallback;
        self.movingCallback = movingCallback;
        self.endCallback = endCallback;

        self.usingBySmartPhone = self.isSmartPhone();
        self.usingByTablet = self.isTablet();

        self.position = {
            initial : { x : null, y : null },
            current : { x : null, y : null },
            moving  : { x : null, y : null }
        };

        self.triggers = {
            down : self.usingBySmartPhone || self.usingByTablet ? "touchstart" : "mousedown",
            move : self.usingBySmartPhone || self.usingByTablet ? "touchmove" : "mousemove",
            up : self.usingBySmartPhone || self.usingByTablet ? "touchend" : "mouseup",
        };


        jqObject.on( self.triggers.down, function(e){

            if( !( self.vars.guessFull && self.jqObject.closest(".parallaxContent").attr("data-is-full") == "1") ){

                self.moving = true;
                
                self.position.initial = {
                    x : self.x(e),
                    y : self.y(e)
                };

                self.startCallback(e, self.jqObject, self.position.initial.x, self.position.initial.y);

            }

        });

        $(window).on( self.triggers.move, function(e){

            if( self.moving ){

                self.position.current = {
                    x : self.x(e),
                    y : self.y(e)
                };

                self.position.moving = {
                    x : self.position.current.x - self.position.initial.x,
                    y : self.position.current.y - self.position.initial.y,
                }

                var tmp = self.position.current.x - self.position.initial.x;

                self.movingCallback(e, self.jqObject, self.position.moving.x, self.position.moving.y );
            
            }

        });


        $(window).on( self.triggers.up, function(e){
            if( self.moving ){
                self.moving = false;
                self.endCallback(e, self.jqObject, self.position.moving.x, self.position.moving.y );
            }
        });

    }()

}
