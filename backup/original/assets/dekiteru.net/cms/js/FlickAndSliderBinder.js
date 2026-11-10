var FlickAndSliderBinder = function( jqObject, startCallback, movingCallback, endCallback, vars )
{

    var self = this;

    this.jqObject;
    this.vars;
    this.startCallback;
    this.movingCallback;
    this.endCallback;


    // 汎用変数入れ
    this.vars = {};


    this.__construct = function()
    {

        self.jqObject = jqObject;
        self.vars = vars;
        self.startCallback = startCallback;
        self.movingCallback = movingCallback;
        self.endCallback = endCallback;

        self.ins = new DragAndDropBinder(
            self.jqObject,
            function(e, jqObject, x, y)
            {

                self.startCallback(e, jqObject, x, y)
            },
            function(e, jqObject, x, y)
            {
                self.movingCallback(e, jqObject, x, y)
            },
            function(e, jqObject, x, y)
            {
                self.endCallback(e, jqObject, x, y)
            },
            self.vars
        );

    }()

}


/* 202506.臨時対応（公開・在庫車詳細・スライドの重複表示） */
$(function(){
    if( edit_param === "0" ){
        if( $("#js-slideImage").length > 0 && $("#cgmCapWrapper").length === 0 ){
            var html = `
        <div id="cgmCapWrapper">
            <span id="cgmCap"></span>
            <img id="cgmCapClose" src="img/usedcar/cgmCapWrapperCloseBtn.png" alt="テキストを隠す" />
        </div>
            `;
            $("#js-usedcarInfo").after(html);
            $("#js-usedcarId").prev("a").remove()
        }
    }
});