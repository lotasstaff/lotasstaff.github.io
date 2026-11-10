/**
 * 共通処理Javascript
 * 20140624 高橋作成
 */

/**
 * ブラウザ判定 ： 主にIE対応のため
 */
if (typeof UA === 'undefined') {
    var UA = (function(){
        var f = {
            ltIE6:typeof window.addEventListener == "undefined" && typeof document.documentElement.style.maxHeight == "undefined",
            ltIE7:typeof window.addEventListener == "undefined" && typeof document.querySelectorAll == "undefined",
            ltIE8:typeof window.addEventListener == "undefined" && typeof document.getElementsByClassName == "undefined",
            ltIE9:document.uniqueID && typeof window.matchMedia == "undefined",
            gtIE10:document.uniqueID && window.matchMedia,
            Trident:document.uniqueID,
            Gecko:'MozAppearance' in document.documentElement.style,
            Presto:window.opera,
            Blink:window.chrome,
            Webkit:typeof window.chrome == "undefined" && 'WebkitAppearance' in document.documentElement.style,
            Touch:typeof document.ontouchstart != "undefined",
            Mobile:typeof window.orientation != "undefined",
            ltAd4_4:typeof window.orientation != "undefined" && typeof(EventSource) == "undefined",
            Pointer:window.navigator.pointerEnabled,
            MSPoniter:window.navigator.msPointerEnabled
        };

        var result = {
            'browser': null,
            'IEVersion': null
        };

        if (f.ltIE6) {
            result.browser = 'ie';
            result.IEVersion = 6;
        } else if (f.ltIE7) {
            result.browser = 'ie';
            result.IEVersion = 7;
        } else if (f.ltIE8) {
            result.browser = 'ie';
            result.IEVersion = 8;
        } else if (f.ltIE9) {
            result.browser = 'ie';
            result.IEVersion = 9;
        } else if (f.gtIE10) {
            result.browser = 'ie';
            result.IEVersion = document.documentMode;
        } else if (f.Trident) { // ここ若干怪しい
            result.browser = 'ie';
            result.IEVersion = document.documentMode;
        } else if (f.Gecko) {
            result.browser = 'firefox';
        } else if (f.Presto) {
            result.browser = 'opera';
        } else {
            result.browser = 'other';
        }

        return result;
    })();
}

/**
 * スマートフォン判定
 */
function isSmartPhoneAccess()
{
    var ua = navigator.userAgent;
    return (ua.indexOf('iPhone') !== -1 || ua.indexOf('Android') !== -1);
}



var heic2Jpg = function()
{

    var self = this;

    this.main = function( file )
    {
        const deferred = $.Deferred();

        heic2any({ blob: file, toType: "image/jpeg", quality: 0.95 })
        .then((converted) => {
            
            let orientation = 1;
            
            EXIF.getData(file, function() {
                
                orientation = EXIF.getTag(this, "Orientation") || 1;

                const imgURL = URL.createObjectURL(converted);
                
                const img = new Image();

                img.onload = function() {
                    const w = img.naturalWidth;
                    const h = img.naturalHeight;
                    const canvas = document.createElement("canvas");
                    const ctx = canvas.getContext("2d");

                    if ([5, 6, 7, 8].includes(orientation)) {
                        canvas.width = h;
                        canvas.height = w;
                    } else {
                        canvas.width = w;
                        canvas.height = h;
                    }

                    self.drawImageWithOrientation(ctx, img, orientation, w, h);

                    canvas.toBlob(function(blob) {
                        deferred.resolve(blob);
                    }, "image/jpeg", 0.95);
                };

                img.src = imgURL;
            });
        })
        .catch((err) => {
            deferred.reject(err);
        });

        return deferred.promise();
    }


    this.drawImageWithOrientation = function(ctx, img, orientation, w, h) {
        const ops = {
            2: () => { ctx.translate(w, 0); ctx.scale(-1, 1); },
            3: () => { ctx.translate(w, h); ctx.rotate(Math.PI); },
            4: () => { ctx.translate(0, h); ctx.scale(1, -1); },
            5: () => { ctx.rotate(0.5 * Math.PI); ctx.scale(1, -1); },
            6: () => { ctx.rotate(0.5 * Math.PI); ctx.translate(0, -h); },
            7: () => { ctx.rotate(0.5 * Math.PI); ctx.translate(w, -h); ctx.scale(-1, 1); },
            8: () => { ctx.rotate(-0.5 * Math.PI); ctx.translate(-w, 0); },
        };
        ctx.save();
        ops[orientation]?.();
        ctx.drawImage(img, 0, 0, w, h);
        ctx.restore();
    }


    this.extensionSwitcher = function( type )
    {

        const mimeToExt = {
          'image/png': 'png',
          'image/jpeg': 'jpg',
          'image/gif': 'gif',
          'image/bmp': 'bmp',
          'image/webp': 'webp',
          'image/heic': 'jpg',
          'image/heif': 'jpg',
          'application/pdf': 'pdf'
        };

        if ( typeof type !== "undefined" && type !== null ) {
            var extension = mimeToExt[type];
        }else{
            var extension = "jpg";
        }

        return extension;

    }


    this.isHEIC = function( file )
    {
        return file.type === "image/heic" || /\.heic$/i.test(file.name);
    }

    this.__construct = function()
    {
        var sources = [
          "https://unpkg.com/heic2any/dist/heic2any.min.js",
          "https://cdn.jsdelivr.net/npm/exif-js"
        ];

        sources.forEach(function(src) {
          var script = document.createElement("script");
          script.type = "text/javascript";
          script.src = src;
          document.body.appendChild(script);
        });
    }()

}


/**
 * フォーム拡張用プラグイン
 * /cms/js/jquery.js
 * /cms/js/jquery.ui.js
 * /cms/js/validator.js
 * /cms/js/func.js
 * /cms/js/cssjs_open.js と連携
 */


// 有効フラグ
var formExtension = true;


// 各種定数
var FormExtensionConfig = {
    SCROLL_TO_BALLOON_DURATION : 300,   // balloon へのスクロール速度
    BALLOON_HIGHLIGHT_DELAY : 300 + 100,// balloon点滅開始ディレイ
    SCROLL_TO_BALLOON_SPAN : 1000,      // balloonへのスクロールの最低実行間隔
};



/**
 * フォーム入力内容の同期
 * @param {[type]} currentMenuId [description]
 * @param {[type]} nextMenuId    [description]
 */
var SyncForm = function( currentMenuId, nextMenuId )
{

    var self = this;

    this.sync = function()
    {
        var self = this;

        this.obj.form.current.find("input").each(function(){
            self.currentObject = $(this);
            self.action("input");
        });

        this.obj.form.current.find("select").each(function(){
            self.currentObject = $(this);
            self.action("select");
        });

        this.obj.form.current.find("textarea").each(function(){
            self.currentObject = $(this);
            self.action("textarea");
        });

        // radio と file は特殊気味
        this.action("radio");
        this.action("file");
 
    }


    /**
    * 外部処理のエイリアス
    * @type {Object}
    */
    this.action = function( tagName )
    {

        switch( tagName ){
            case "input":
            case "select":
            case "textarea":
                self._act.sync.common( self.currentObject );
            break;

            case "radio":
                self._act.sync.radio( self.obj.form.current, self.obj.form.current, self.nextMenuId );
            break;

            case "file":
                self._act.sync.file( self.obj.form.current, self.obj.form.current, self.nextMenuId );
            break;
        }
    }


    this.__construct = function()
    {

        self.currentMenuId = currentMenuId;
        self.nextMenuId = nextMenuId;
        self.currentObject = null;
        self._act = new SyncFormAction();

        self.obj = {
            form : {
                all : $(".est_table_car"),
                current : $( "#submenu_form_" + currentMenuId )
            }
        }
  }(); // 初期実行

}



/**
 * フォーム同期に関する静的処理群
 */
var SyncFormAction = function()
{

  var self = this;

  // セレクタ生成
  this.buildSelector = function( tagName, type, name, value )
  {
    switch( tagName ){
      case "INPUT":
        switch( type ){
          case "text":
            return "input[type='" + type + "'][name='" + name + "']";
          break;
          case "radio":
            return "input[type='" + type + "'][name='" + name + "'][value='" + value + "']";
          break;
        }
      break;

      case "SELECT":
        return "select[name='" + name + "']";
      break;

      case "TEXTAREA":
        return "textarea[name='" + name + "']";
      break;
    }
  }

  // attr一括取得
  this.getAttr = function( $object )
  {
    if( $object.length > 0 ){
    
      return {
          tagName : $object[0].tagName,
          type : $object.attr("type"),
          name : $object.attr("name"),
          checked : $object.prop("checked"),
          selected : $object.prop("selected"),
          value : $object.val()
      }
    
    } else {

      return { tagName : "", type : "", name : "", checked : "", selected : "", value : "" };
    
    }
  }

  // 同期処理
  this.sync = {

    // input[type!=radio&&type!=file], select, textarea
    common : function( $current )
    {
      var attr = self.getAttr( $current ),
          selector =  self.buildSelector( attr.tagName, attr.type, attr.name, attr.value );
      
      if( attr.type === "file" || attr.type === "radio" ) return;

      $(selector).val( attr.value );
    },

    // input[type=radio]
    radio : function( $currentForm, $allForm, nextMenuId )
    {
      var selectors = [];

      // 現在の input radio について一通り確認 → checked のセレクタだけ抽出
      $currentForm.find("input[type=radio]").each(function(){

        if( $(this).prop("checked") ){
        
          var attr = self.getAttr( $(this) ),
              selector =  self.buildSelector( attr.tagName, attr.type, attr.name, attr.value );
        
          selectors.push( selector );
        
        }
      
      });

      // 一旦全て解除
      $allForm.find("input[type=radio]").each(function(){
        $(this).prop("checked", false).attr("checked",  false);
      });


      // 表示するフォームに関してのみchecked を付ける
      selectors.forEach(function( selector ){
        $("#submenu_form_" + nextMenuId + " " + selector).prop("checked", true).attr("checked",  true);
      })
    
    },

    // input[type=file]
    file : function( $currentForm, $allForm, nextMenuId )
    {

    
    }

  }

}



/**
 * 詳細項目付きフォームの追加処理
 */
var RadioAndDetailFormExtension = function()
{

    var self = this;

    var editTextFlag = false;


    this._bind = function()
    {

        this.obj.editTextBtn.on("click", function(){
            editTextFlag = true;
        });

        this.obj.textDisplayTrigger.on("click", function(){

            var self = $(this),
                chatInputText = self.closest("td").find(".chat_input_text");

            if( self.find(".chat_input_trigger_radio.trigger_off").length > 0 ) {
                if( self.closest("td").find(".chat_input_text.detail_text_none").length === 0 ) {
                    chatInputText.focus();
                    chatInputText.addClass("detail_text_none");
                }
            } else {
                if( self.closest("td").find(".chat_input_text.detail_text_none").length > 0 ) {
                    chatInputText.val("");
                    chatInputText.removeClass("detail_text_none");
                    setTimeout(function(){
                        chatInputText.focus();
                    }, 50);

                }
            }
        });

        this.obj.submitBtn.on("click", function(e){
            //e.preventDefault();
            if( editTextFlag ){
                return;
            }

            $(".trigger_off").each(function(){
                var self = $(this),
                    outer = self.closest("td"),
                    triggerOn = outer.find(".trigger_on"),
                    chatInputText = outer.find(".chat_input_text");

                if( self.prop("checked") ) {

                    // 「なし」にチェック
                    chatInputText.val("なし");

                } else {

                    if( !triggerOn.prop("checked") ) {
                        // 「あり」「なし」どちらもチェックなし
                        chatInputText.val("未選択");
                    } else {
                        // 何もしない
                        // 「あり」にチェックのためバリデート必要
                    }

                }
            });


            $(this).submit();


        });
    
    }

    this.__construct = function()
    {
  
        self.obj = {
            textDisplayTrigger: $(".chat_input_trigger"),
            submitBtn: $(".inputbtn"),
            editTextBtn: $(".inputbtn .formSubmitBtn")
        };

        self._bind();
  
    }();

}




/**
 * お見積りフォームUX改善
 */
var ModifyEstimateForm = {

    toggleMustSelectCheck : function( menuId )
    {

        // 画像必須項目について
        var musts = $("input[type = 'hidden'][name = 'must_" + menuId + "']").val(),
            mustSelectPicture = false;

        if( musts !== "" && typeof musts !== "undefined" ){
            var tmp = musts.split(",");
            mustSelectPicture = $.inArray( "picture", tmp ) !== -1;
        }


        $(".js-inputFileTriggerIcon").removeClass("js-error");

    },


    // カテゴリ種別のスタイル調整
    RefreshCurrentCategory : function( menuId )
    {
        var selector = ".submenu_radio_" + menuId;
        $(".estimateCategory").removeClass("current categoryCheck");
        $(selector).closest(".estimateCategory").addClass("current categoryCheck");

        $(".est_table_car").attr("data-selected", 0);
        $(selector).closest(".est_table_car[data-menu-id='" + menuId + "']").attr("data-selected", 1)

        ModifyEstimateForm.toggleMustSelectCheck( menuId );

    },

    ScrollToBalloon : function( formElement )
    {

        var self = this;

        this.action = function()
        {
            if( $(".baloon").length > 0 ){
                
                var offset = $(formElement).find(".js-validated").eq(0).offset(),
                    windowHeight = $(window).height(),
                    height = $(".baloon").height(),
                    to = offset.top - windowHeight / 2 + height / 2
                $("html, body").animate({scrollTop : to }, FormExtensionConfig.SCROLL_TO_BALLOON_DURATION );
            }
        }
    }

}



/**
 * スマホの時には入力しやすいUAを適用
 */
var ReplaceInputType = function()
{

    var self = this;

    this.cs = {
        FORCE_REPLACE : false   // 強制フラグON
    };

    this.inputs = {
        // "forms[buybacksum]" : "number",      // 買取希望額
        "forms[ruibetsu]"   : "number",    // 類別区分番号（見積り）
        "forms[katashiki]"  : "number",   // 型式指定番号（見積り）
        // "forms[zipcode]"    : "number",     //郵便番号(問合せ、見積り)
        // "zipcode"           : "number",     //郵便番号（求人）
        "age"               : "number",     //年齢（求人）
        "forms[adoresu]"    : "email",           // メールアドレス（問合せ、見積り）
        "adoresu"           : "email",      //メールアドレス（求人）
        "mail"              : "email",      //メールアドレス（カートページ）
        "forms[denwa]"      : "tel",        //電話番号（問合せ、見積り）
        "denwa"             : "tel",        //電話番号（求人）
        "forms[fax]"        : "tel",        //FAX番号（見積り）
        "tel"               : "tel",        //電話番号（カートページ）
        "zip"               : "number",     //郵便番号（カートページ）
        "tel_2"             : "tel",        //電話番号（抱きしメ～ル）
        "tel_3"             : "tel"         //電話番号（抱きしメ～ル）
    };

    this.shouldReplace;


    // public
    // ￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣

    // 実行関数
    this.run = function()
    {
        for( var name in self.inputs ){

            var selector = "input[name='"+ name +"']",
                type = self.inputs[ name ];

            $(selector).attr("type", type)
        }
    }


    // private
    // ￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣


    // サンキューページ？（アンケートフォームへの影響防止）
    this._isThankyouPage = function()
    {

        // 本ファイルが全ページで読み込まれるようになったため、お問合せ・見積り・求人以外のフォームがある場合は個別処理が必要に
        var currentPageUrl = location.href;

        var isEditThankyouPage = false;
        var isOpenThankyouPage = false;

        if( typeof currentPageUrl !== "undefined" ){

            isEditThankyouPage = currentPageUrl.indexOf("pgmid=107") !== -1 || currentPageUrl.indexOf("pid=107") !== -1;
            isOpenThankyouPage = currentPageUrl.indexOf("thankyou") !== -1;

        }

        return isEditThankyouPage || isOpenThankyouPage;

    }


    // 置換を行うべき？
    this._shouldReplace = function()
    {

        // サンキューページは置換させない
        if( self._isThankyouPage() ) return false;

        return  ( typeof UA !== "undefined" && UA !== null && isSmartPhoneAccess() )
                || self.cs.FORCE_REPLACE;
                
    }


    // 初期動作
    this.__construct = function()
    {
        self.shouldReplace = self._shouldReplace();
    }();

};



/**
 * 年月日の選択にDatePickerを導入する。
 * PHP側との連携が必要な作りとした。
 * ※JSで完結するにはかなりキツイんで。
 */
var InsertDatePicker = function()
{
    var self = this;

    this.cs = {
        FORCE_REPLACE : false   // 強制フラグON
    };

    this._bind = function()
    {
        self.obj.trigger.each(function(){
            $( this ).click(function(){
                var datePickerNumber = $(this).attr("data-number");
                $(this).closest("td").find(".js-datePicker[data-number=" + datePickerNumber + "]").fadeToggle();
                return false;
            })
        });
    }

    this._setDatePicker = function()
    {
        $.datepicker.setDefaults( $.datepicker.regional[ "ja" ] );

        self.obj.datePicker.each(function(){
            var dtpo = new DateTimePickerOptions( $(this) ),
                options = dtpo.build();

            $(this).datepicker( options );
        });
    }

    this.run = function()
    {
        this._setDatePicker();
        this._bind();
    }


    this._shouldInsert = function()
    {
        return ( self.obj.trigger.length > 0 && self.obj.datePicker.length )
               || self.cs.FORCE_REPLACE;
    }

    this.__construct = function()
    {
        self.obj = {
            trigger : $(".js-datePickTrigger"),
            datePicker : $(".js-datePicker")
        };

        self.shouldInsert = self._shouldInsert();

    }();

}



/**
 * datepicker のオプション生成。
 * イロイロ難しかったんで分けた。
 * @param {[type]} $datePicker [description]
 */
var DateTimePickerOptions = function( $datePicker )
{
    var self = this;

    this.defaults = {
        dateFormat : "yy-mm-dd",
        yearSuffix : "年",
        showMonthAfterYear : true,
        monthNames: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
        dayNames: ['日', '月', '火', '水', '木', '金', '土'],
        dayNamesMin: ['日', '月', '火', '水', '木', '金', '土'],
        defaultDate : new Date()
    };


    this._callBackSelected = function( date )
    {

        // $(this) => datepickerObjectを指す
        var date = self.action.analyzeDate( date ),
            selectors = self.action.getParentSelectors( self.$datePicker ),
            datePickerNumber = self.$datePicker.attr("data-number"),
            datePickerType = self.$datePicker.attr("data-date-type");

            year = datePickerType === "reserve_date_multiple" ? selectors["year"][datePickerNumber] : selectors["year"],
            month = datePickerType === "reserve_date_multiple" ? selectors["month"][datePickerNumber] : selectors["month"],
            day = datePickerType === "reserve_date_multiple" ? selectors["day"][datePickerNumber] : selectors["day"];

        self.action.setYear( year, date );
        self.action.setMonth( month, date.month )
        self.action.setDay( day, date.day );
        self.$datePicker.fadeOut();

        if ( datePickerType === "reserve_time" ) {
            var date = self.action.analyzeHour(date),
                hour = selectors["hour"],
                min = selectors["min"];
            self.action.setHour( hour, date );
            self.action.setMonth( min, date.month );
            if( !self.action.emptyValue( hour ) && !self.action.emptyValue( min ) ) {
                $(selectors["hour"]).addCheck();
            }
        }

        if( !self.action.emptyValue( year ) && !self.action.emptyValue( month ) && !self.action.emptyValue( day ) ) {
            $(selectors["year"]).addCheck();
        }

    }


    this.build = function()
    {
        var options = this.defaults;
        Object.assign( options, { minDate : new Date( self.action.calcMin( self.$datePicker )+ "/01" + "/01" ) } );
        Object.assign( options, { maxDate : new Date( self.action.calcMax( self.$datePicker ) + "/12" + "/31" ) } );
        Object.assign( options, { onSelect : function( date ){ self._callBackSelected(date); } } ) ;
        return options;
    }

    this._polyfill = function()
    {
        if (typeof Object.assign != 'function') {
        // Must be writable: true, enumerable: false, configurable: true
            Object.defineProperty(Object, "assign", {
                value: function assign(target, varArgs) { // .length of function is 2
                    'use strict';
                    if (target == null) { // TypeError if undefined or null
                        throw new TypeError('Cannot convert undefined or null to object');
                    }

                    var to = Object(target);

                    for (var index = 1; index < arguments.length; index++) {
                        var nextSource = arguments[index];

                        if (nextSource != null) { // Skip over if undefined or null
                            for (var nextKey in nextSource) {
                            // Avoid bugs when hasOwnProperty is shadowed
                                if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                                    to[nextKey] = nextSource[nextKey];
                                }
                            }
                        }
                    }
                    return to;
                },
                writable: true,
                configurable: true
            });
        }
    }

    this.__construct = function()
    {
        self._polyfill();
        self.$datePicker = $datePicker;
        self.dateType = $datePicker.data("dateType");
        self.action = DatePickerOptionBuildAction;
    }();

}



/**
 * DatePicker・オプション用の関数群
 * @type {Object}
 */
var DatePickerOptionBuildAction = {

    analyzeDate : function( dateString )
    {
        var tmp = dateString.split("-");
        return {year : tmp[0], month : tmp[1], day : tmp[2]};
    },

    analyzeHour : function( hourString )
    {
        var tmp = hourString.split(":");
        return {hour : tmp[0], min : tmp[1]};
    },

    getParentSelectors : function( $datePicker )
    {
        var dateType = $datePicker.data("dateType"),
            selectors = DatePickerOptionConfig.selectors;
        return typeof selectors[ dateType ] !== undefined ? selectors[ dateType ] : null
    },

    getParentYearSelector : function( $datePicker )
    {
        var selectors = this.getParentSelectors( $datePicker ),
            datePickerNumber = $datePicker.attr("data-number"),
            datePickerType = $datePicker.attr("data-date-type");

        if( selectors !== null ) {
            if( datePickerType === "reserve_date_multiple" ) {
                return selectors[ "year" ][datePickerNumber];
            } else {
                return selectors[ "year" ];
            }
        }

        return null;
    },

    calcMin : function( $datePicker )
    {
        var yearSelector = this.getParentYearSelector( $datePicker ),
            res = 9999;

        $(yearSelector).find("option").each(function(){
            if( $(this).val().match( /^\d{4}$/g ) ){
                if( res > $(this).val() ) res = $(this).val()
            }
        })

        return res;
    },
    
    calcMax : function( $datePicker )
    {
        var yearSelector = this.getParentYearSelector( $datePicker ),
            res = 0;

        $(yearSelector).find("option").each(function(){
            if( $(this).val().match( /^\d{4}$/g ) ){
                if( res < $(this).val() ) res = $(this).val();
            }
        })

        return res;
    },

    setYear : function( selector, date )
    {
        if( date.year == 2019 ){

            if( date.month > 4 ){
                $(selector).find(".js-era-reiwa").attr("selected", "selected").prop("selected", true);
            } else {
                $(selector).find(".js-era-heisei").attr("selected", "selected").prop("selected", true);
            }

        } else {
            $(selector).val( date.year );
        }
    },

    setMonth : function( selector, value )
    {
        $(selector).val( value );
    },

    setDay : function( selector, value )
    {
        $(selector).val( value );
    },

    setHour : function( selector, value )
    {
        $(selector).val( value );
    },

    setMin : function( selector, value )
    {
        $(selector).val( value );
    },

    emptyValue : function( value )
    {
        return value === "" || value === null || typeof value === "undefined";
    }



}


/**
 * DatePickerの対象になるセレクタたち
 * @type {Object}
 */
var DatePickerOptionConfig = {
    selectors : {
        "expire" : {
            year : "select[name='forms[expire_y]']",
            month : "select[name='forms[expire_m]']",
            day : "select[name='forms[expire_d]']",
        },
        "reserve_date" : {
            year : "select[name='forms[reserve_date_y]']",
            month : "select[name='forms[reserve_date_m]']",
            day : "select[name='forms[reserve_date_d]']",
        },
        "reserve_date_multiple" : {
            year : {
                "1": "select[name='forms[reserve_date_multiple_y_1]']",
                "2": "select[name='forms[reserve_date_multiple_y_2]']",
                "3": "select[name='forms[reserve_date_multiple_y_3]']"
            },
            month : {
                "1": "select[name='forms[reserve_date_multiple_m_1]']",
                "2": "select[name='forms[reserve_date_multiple_m_2]']",
                "3": "select[name='forms[reserve_date_multiple_m_3]']"
            },
            day : {
                "1": "select[name='forms[reserve_date_multiple_d_1]']",
                "2": "select[name='forms[reserve_date_multiple_d_2]']",
                "3": "select[name='forms[reserve_date_multiple_d_3]']"
            },
        },
        "deadline" : {
            year : {
                "1": "select[name='forms[deadline_y_1]']",
                "2": "select[name='forms[deadline_y_2]']",
                "3": "select[name='forms[deadline_y_3]']"
            },
            month : {
                "1": "select[name='forms[deadline_m_1]']",
                "2": "select[name='forms[deadline_m_2]']",
                "3": "select[name='forms[deadline_m_3]']"
            },
            day : {
                "1": "select[name='forms[deadline_d_1]']",
                "2": "select[name='forms[deadline_d_2]']",
                "3": "select[name='forms[deadline_d_3]']"
            },
        },

        "lending_datetime" : {
            year : "select[name='forms[lending_datetime_y]']",
            month : "select[name='forms[lending_datetime_m]']",
            day : "select[name='forms[lending_datetime_d]']",
            time : "select[name='forms[lending_datetime_t]']",
        },
        "return_datetime" : {
            year : "select[name='forms[return_datetime_y]']",
            month : "select[name='forms[return_datetime_m]']",
            day : "select[name='forms[return_datetime_d]']",
            time : "select[name='forms[return_datetime_t]']",
        },
        "deliver_datetime" : {
            year : "select[name='forms[deliver_datetime_y]']",
            month : "select[name='forms[deliver_datetime_m]']",
            day : "select[name='forms[deliver_datetime_d]']",
            time : "select[name='forms[deliver_datetime_t]']",
        },
        "reserve_time" : {
            hour : "select[name='forms[reserve_time_h]']",
            min : "select[name='forms[reserve_time_min]']",
        },
        "career1_period_start" : {
            date : "input[name='career1_period_start']",
        },
        "career1_period_end" : {
            date : "input[name='career1_period_end']",
        },
        "career2_period_start" : {
            date : "input[name='career2_period_start']",
        },
        "career2_period_end" : {
            date : "input[name='career2_period_end']",
        },
    }
};



/**
 * 入力後のフォームへの完了マーク付与
 * 全フォームにonblurイベント付与
 * validation が掛かっている場合はその条件を判定
 * 掛かってない場合は単に選択されてるか否かを判定
 * OKなら隣のthにimgタグ付与する
 * @param {[type]} object [description]
 */

var AddCheck = function( menuId )
{

    var self = this;

    var date = new Date(),
        currentYear = date.getFullYear(),
        currentMonth = ("00" + (date.getMonth()+1)).slice(-2),
        currentDay = ("00" + date.getDate()).slice(-2),
        currentDate = currentYear+"-"+currentMonth+"-"+currentDay;

    this.selectors = {
        text : [
            "input[name='forms[namae]']",
            "input[name='forms[adoresu]']",
            "input[name='forms[denwa]']",
            "input[name='forms[fax]']",
            "input[name='forms[zipcode]']",
            "input[name='forms[jusyo]']",
            "input[name='forms[buybacksum]']",
            "input[name='forms[ruibetsu]']",
            "input[name='forms[katashiki]']",
            "input[name='forms[katashiki_model]']",
            "input[name='forms[hope_car]']",
            "input[name='forms[juryo]']",
            "input[name='forms[grade]']",
            "input[name='forms[shadai]']",
            "input[name='forms[shasyu]']",
            "input[name='forms[nenshiki_month]']",
            "input[name='forms[jyousyateiin]']",
            "input[name='forms[inner_color]']",
            "input[name='forms[sheet]']",
            "input[name='forms[sun_roof]']",
            "input[name='forms[camera]']",
            "input[name='forms[arumi_wheel]']",
            "input[name='forms[navi]']",
            "input[name='forms[air_kit]']",
            "input[name='forms[option_safety]']",
            "input[name='forms[driver]']",
            "input[name='forms[hope_plan]']",
            "input[name='forms[flight_name][goAirlines]']",
            "input[name='forms[flight_name][goFlightNumber]']",
            "input[name='forms[flight_name][returnAirlines]']",
            "input[name='forms[flight_name][returnFlightNumber]']",
            "input[name='forms[product_number]']",
            "input[name='forms[place]']",
            "input[name='namae']",
            "input[name='furigana']",
            "input[name='zipcode']",
            "input[name='jusyo']",
            "input[name='adoresu']",
            "input[name='denwa']",
            "input[name='age']",
            "input[name='gakureki']",
            "input[name='career1']",
            "input[name='career1_period_start']",
            "input[name='career1_period_end']",
            "input[name='career2']",
            "input[name='career2_period_start']",
            "input[name='career2_period_end']",
            "input[name='found_about']",
            "input[name='reason']",
            "textarea[name='forms[comments]']",
            "textarea[name='comments']",
        ],
        radio : [
            // "input[name='type']",
            "input[name='forms[deliver]']",
            "input[name='forms[drive_system]']",
            "input[name='forms[repair_category]']",
            "input[name='forms[loaner_car]']",
            "input[name='forms[contact]']",
            "input[name='forms[loaner_car]']",
            "input[name='gender']",
            "input[name='syokusyu']",
            "input[name='koyo_type']",
        ],
        select : [
            "select[name='forms[body_color]']",
            "select[name='forms[call_time]']",
            "select[name='forms[soukou]']",
            "select[name='forms[custom_type]']",
            "select[name='forms[jyousyateiin]']",
            "select[name='forms[inner_color]']",
            "select[name='forms[use_sheet][baby]']",
            "select[name='forms[use_sheet][child]']",
            "select[name='forms[use_sheet][junior]']"
        ],
        nenshiki : [
            "select[name='forms[nenshiki]']",
            "select[name='forms[nenshiki_month]']"
        ],
        expire : [
            "select[name='forms[expire_y]']",
            "select[name='forms[expire_m]']",
            "select[name='forms[expire_d]']"
        ],
        lending : [
            "select[name='forms[lending_datetime_y]']",
            "select[name='forms[lending_datetime_m]']",
            "select[name='forms[lending_datetime_d]']",
            "select[name='forms[lending_datetime_t]']",
        ],
        lendingReturn : [
            "select[name='forms[return_datetime_y]']",
            "select[name='forms[return_datetime_m]']",
            "select[name='forms[return_datetime_d]']",
            "select[name='forms[return_datetime_t]']",
        ],
        reserve : [
            "select[name='forms[reserve_date_y]']",
            "select[name='forms[reserve_date_m]']",
            "select[name='forms[reserve_date_d]']"
        ],
        reservetime : [
            "select[name='forms[reserve_time_h]']",
            "select[name='forms[reserve_time_min]']"
        ],
        reserveMultiple : [
            "select[name='forms[reserve_date_multiple_y_1]']",
            "select[name='forms[reserve_date_multiple_m_1]']",
            "select[name='forms[reserve_date_multiple_d_1]']",
            "select[name='forms[reserve_date_multiple_h_1]']",
            "select[name='forms[reserve_date_multiple_min_1]']"
        ],
        deadline : [
            "select[name='forms[deadline_y_1]']",
            "select[name='forms[deadline_m_1]']",
            "select[name='forms[deadline_d_1]']",
            "select[name='forms[deadline_h_1]']",
            "select[name='forms[deadline_min_1]']"
        ],
        deliverMultiple : [
            "select[name='forms[deliver_datetime_y]']",
            "select[name='forms[deliver_datetime_m]']",
            "select[name='forms[deliver_datetime_d]']",
            "select[name='forms[deliver_datetime_t]']"
        ],
        textTriggerRadio : [
            "input[name='trigger[text_display_trigger_sheet]']",
            "input[name='trigger[text_display_trigger_sun_roof]']",
            "input[name='trigger[text_display_trigger_camera]']",
            "input[name='trigger[text_display_trigger_rear_entame]']",
            "input[name='trigger[text_display_trigger_arumi_wheel]']",
            "input[name='trigger[text_display_trigger_navi]']",
            "input[name='trigger[text_display_trigger_air_kit]']",
            "input[name='trigger[text_display_trigger_option_safety]']"
        ]
    }


    this.initialize = function( menuId )
    {
        var idPrefix = "#submenu_form_" + menuId,
            prefixSelectors = {};


        // 表示中のフォームに限る
        for( var key in this.selectors ){
            
            prefixSelectors[ key ] = [];

            this.selectors[ key ].forEach(function( selector ){
                var tmp = idPrefix + " " + selector;
                prefixSelectors[ key ].push( tmp );
            });
        
        }

        $( prefixSelectors.text.join(",") ).each(function(){ $(this).checkText(); });
        $( prefixSelectors.radio.join(",") ).each(function(){ $(this).checkRadio(); });
        $( prefixSelectors.select.join(",") ).each(function(){ $(this).checkSelect(); });
        $( prefixSelectors.nenshiki.join(",") ).each(function(){ $(this).checkNenshiki(); });
        $( prefixSelectors.expire.join(",") ).each(function(){ $(this).checkExpire(); });
        $( prefixSelectors.lending.join(",") ).each(function(){ $(this).checkLending(); });
        $( prefixSelectors.lendingReturn.join(",") ).each(function(){ $(this).checkLendingReturn(); });
        $( prefixSelectors.reserve.join(",") ).each(function(){ $(this).checkReserve(); });
        $( prefixSelectors.reservetime.join(",") ).each(function(){ $(this).checkReservetime(); });
        $( prefixSelectors.textTriggerRadio.join(",") ).each(function(){ $(this).checkTrigger(); });
        $( prefixSelectors.reserveMultiple.join(",") ).each(function(){ $(this).checkReserveMultiple(); });
        $( prefixSelectors.deliverMultiple.join(",") ).each(function(){ $(this).checkDeliverMultiple(); });
        $( prefixSelectors.deadline.join(",") ).each(function(){ $(this).checkDeadline(); });
        // 画像に関しては行わない（アップ時に全てのチェックを付けてもらう）

    }


    this._bind = function()
    {

        // text(textarea)
        $(this.selectors.text.join(",")).blur(function(){ $(this).checkText() });

        // radio
        $(this.selectors.radio.join(",")).change(function(){ $(this).checkRadio() });

        // select
        $(this.selectors.select.join(",")).change(function(){ $(this).checkSelect() });

        // nenshiki
        $(this.selectors.nenshiki.join(",")).change(function(){ $(this).checkNenshiki() });

        // expire
        $( this.selectors.expire.join(",") ).change(function(){ $(this).checkExpire(); });

        // lending
        $( this.selectors.lending.join(",") ).change(function(){ $(this).checkLending(); });

        // lending
        $( this.selectors.lendingReturn.join(",") ).change(function(){ $(this).checkLendingReturn(); });

        // reserve
        $( this.selectors.reserve.join(",") ).change(function(){ $(this).checkReserve(); });

        // reservetime
        $( this.selectors.reservetime.join(",") ).change(function(){ $(this).checkReservetime(); });

        // reserveMultiple
        $( this.selectors.reserveMultiple.join(",") ).change(function(){ $(this).checkReserveMultiple(); });

        // reserveMultiple
        $( this.selectors.deliverMultiple.join(",") ).change(function(){ $(this).checkDeliverMultiple(); });

        // textTriggerRadio
        $( this.selectors.textTriggerRadio.join(",") ).change(function(){ $(this).checkTrigger(); });

        $( this.selectors.deadline.join(",") ).change(function(){ $(this).checkDeadline(); });

        // input type = "file"

    }

    this._polyfill = function()
    {
        if (!Array.prototype.includes) {
            Object.defineProperty(Array.prototype, 'includes', {
                value: function(searchElement, fromIndex)
                {
                    if (this == null) {
                        throw new TypeError('"this" is null or not defined');
                    }

                    var o = Object(this);
                    var len = o.length >>> 0;

                    if (len === 0) {
                        return false;
                    }

                    var n = fromIndex | 0;
                    var k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);

                    while (k < len) {
                        if (o[k] === searchElement) {
                            return true;
                        }
                        k++;
                    }

                    return false;
                }
            });
        }
    }

    this._addMethods = function()
    {

        // 要素検索
        $.fn.findTh = function(){
            return $(this).closest("tr").find("th")
        };
        
        $.fn.findTd = function(){
            return $(this).closest("tr").find("td")
        };
        
        $.fn.findIcon = function(){
            return $(this).findTh().find(".js-checkedValidIcon");
        }

        // アイコン操作
        $.fn.addCheck = function(){
            return $(this).findIcon().removeClass("js-removing").addClass("js-checked");
        }
        
        $.fn.removeCheck = function(){
            return $(this).findIcon().addClass("js-removing");
        }
        
        $.fn.toggleCheck = function( bool ){
            return bool ? $(this).addCheck() : $(this).removeCheck()
        };

        // バリデーション
        $.fn.checkText = function(){

            // メールに関しては値のチェックもする
            // 判断基準は validator.js と同期
            if( $(this).attr("name") === "forms[adoresu]" ){

                if( $(this).val() == "" ){

                    $(this).removeCheck();
                
                } else {

                    $(this).toggleCheck( $(this).val().match(/^[\x01-\x7F]+@((([-a-z0-9]+\.)*[a-z]+)|(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}))$/) );

                }

            } else if( $(this).attr("name") === "forms[denwa]" ) {

                if( $(this).val() == "" ){

                    $(this).removeCheck();
                
                } else {

                    var val = $(this).val();

                    val = val.replace(/[０-９]/g,function(s){
                        return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
                    });

                    if ( val.match(/^[0-9-]+$/) ) {

                        val = val.replace(/[^0-9]/g,"");
                        $(this).toggleCheck( val.match(/^0[0-9]{9,11}$/) );

                    }else{

                        $(this).removeCheck();

                    }

                }

            } else {

                if( $(this).hasClass( "flightText" ) ) {

                    var isInput = true;
                    $(".flightText").each(function(){
                        if( $(this).val() === "" ) {
                            isInput = false;
                            return;
                        }
                    });

                    $(this).toggleCheck(isInput);

                } else {

                    $(this).toggleCheck( $(this).val() != "" );

                }


            }
        };

        $.fn.checkRadio = function(){
            if( $(this).prop("checked") ) $(this).addCheck();
        };
        
        $.fn.checkSelect = function(){
            $(this).toggleCheck( $(this).val() != "" );
        };
        
        $.fn.checkNenshiki = function(){
            var year = $(this).findTd().find("select[name='forms[nenshiki]']").val(),
                month = $(this).findTd().find("select[name='forms[nenshiki_month]']").val();

            if( year != "" && month != "" ){
                $(this).addCheck();
            } else {
                $(this).removeCheck()
            }
        };

        $.fn.checkExpire = function(){
            var year = $(this).findTd().find("select[name='forms[expire_y]']").val(),
                month = $(this).findTd().find("select[name='forms[expire_m]']").val(),
                day = $(this).findTd().find("select[name='forms[expire_d]']").val();

            if( year === "10" ){
                $(this).addCheck();
            } else {
                if(month !== "" && day !== ""){
                    $(this).addCheck();
                } else {
                    $(this).removeCheck();
                }
            }
        }

        $.fn.checkLending = function(){
            var year = $(this).findTd().find("select[name='forms[lending_datetime_y]']").val(),
                month = $(this).findTd().find("select[name='forms[lending_datetime_m]']").val(),
                day = $(this).findTd().find("select[name='forms[lending_datetime_d]']").val(),
                time = $(this).findTd().find("select[name='forms[lending_datetime_t]']").val(),
                selectDate = year+"-"+month+"-"+day;

            if(month !== "" && day !== "" && time !== ""){
                if(selectDate < currentDate){
                    $(this).removeCheck();
                } else {
                    $(this).addCheck();
                }
            } else {
                $(this).removeCheck();
            }

        }

        $.fn.checkLendingReturn = function(){
            var year = $(this).findTd().find("select[name='forms[return_datetime_y]']").val(),
                month = $(this).findTd().find("select[name='forms[return_datetime_m]']").val(),
                day = $(this).findTd().find("select[name='forms[return_datetime_d]']").val(),
                time = $(this).findTd().find("select[name='forms[return_datetime_t]']").val(),
                selectDate = year+"-"+month+"-"+day;

            if(month !== "" && day !== "" && time !== ""){
                if(selectDate < currentDate){
                    $(this).removeCheck();
                } else {
                    $(this).addCheck();
                }
            } else {
                $(this).removeCheck();
            }

        }

        $.fn.checkReserve = function(){
            var year = $(this).findTd().find("select[name='forms[reserve_date_y]']").val(),
                month = $(this).findTd().find("select[name='forms[reserve_date_m]']").val(),
                day = $(this).findTd().find("select[name='forms[reserve_date_d]']").val(),
                selectDate = year+"-"+month+"-"+day;

            if(month !== "" && day !== ""){
                if(selectDate < currentDate){
                    $(this).removeCheck();
                } else {
                    $(this).addCheck();
                }
            } else {
                $(this).removeCheck();
            }
        }

        $.fn.checkReservetime = function(){

            var h = $(this).findTd().find("select[name='forms[reserve_time_h]']").val(),
                m = $(this).findTd().find("select[name='forms[reserve_time_min]']").val();

            if( h !== "" && m !== "" ){
                $(this).addCheck();
            } else {
                $(this).removeCheck();
            }

        }

        $.fn.checkReserveMultiple = function(){
            var year = $(this).findTd().find("select[name='forms[reserve_date_multiple_y_1]']").val(),
                month = $(this).findTd().find("select[name='forms[reserve_date_multiple_m_1]']").val(),
                day = $(this).findTd().find("select[name='forms[reserve_date_multiple_d_1]']").val(),
                hour = $(this).findTd().find("select[name='forms[reserve_date_multiple_h_1]']").val(),
                minute = $(this).findTd().find("select[name='forms[reserve_date_multiple_min_1]']").val(),
                selectDate = year+"-"+month+"-"+day;

            if( month !== "" && day !== "" && minute !== "" && hour !== "") {
                if(selectDate < currentDate){
                    $(this).removeCheck();
                } else {
                    $(this).addCheck();
                }
            } else {
                $(this).removeCheck();
            }
        }

        $.fn.checkDeliverMultiple = function(){

            var year = $(this).findTd().find("select[name='forms[deliver_datetime_y]']").val(),
                month = $(this).findTd().find("select[name='forms[deliver_datetime_m]']").val(),
                day = $(this).findTd().find("select[name='forms[deliver_datetime_d]']").val(),
                hour = $(this).findTd().find("select[name='forms[deliver_datetime_t]']").val();
                selectDate = year+"-"+month+"-"+day;

            if( month !== "" && day !== "" && hour !== "") {
                if(selectDate < currentDate){
                    $(this).removeCheck();
                } else {
                    $(this).addCheck();
                }
            } else {
                $(this).removeCheck();
            }
        }

        $.fn.checkDeadline = function(){

            var year = $(this).findTd().find("select[name='forms[deadline_y_1]']").val(),
                month = $(this).findTd().find("select[name='forms[deadline_m_1]']").val(),
                day = $(this).findTd().find("select[name='forms[deadline_d_1]']").val(),
                hour = $(this).findTd().find("select[name='forms[deadline_h_1]']").val(),
                minute = $(this).findTd().find("select[name='forms[deadline_min_1]']").val(),
                selectDate = year+"-"+month+"-"+day;

            if( month !== "" && day !== "" && minute !== "" && hour !== "") {
                if(selectDate < currentDate){
                    $(this).removeCheck();
                } else {
                    $(this).addCheck();
                }
            } else {
                $(this).removeCheck();
            }

        }


        $.fn.checkTrigger = function(){

            if( $(this).hasClass("trigger_off") ) {
                $(this).addCheck();
            } else {
                $(this).findTd().find(".chat_input_text").val() !== "" ? $(this).addCheck() : $(this).removeCheck();
            }
        }
    }


    this.__construct = function()
    {
        self._polyfill();
        self._addMethods();
        self._bind();
    
    }();
}






var EntryFormFileReaderManager = function()
{

  var self = this;

  this.instances = [];
  this.forms = [];
  this.triggerIds = [];

  this.totalSize= 0;

  this.maxSize = 25 * 1000 * 1000;
  this.maxSizeJp = ( this.maxSize / 1000 / 1000 ) + "MB";

  this.extensions = [
        "png",
        "jpeg",
        "gif",
        "jpg",
        "webp",
        "bmp",
        "heic",
        "pdf",
  ];


    this.scrolledImagePosition = false;


  this.init = function()
  {

    var triggerClassName = "js-inputFileTriggerIcon",
        formObject = $("." + triggerClassName).closest("form");

        if ( typeof heicController === "undefined" || !(heicController instanceof heic2Jpg) ) {
            heicController = new heic2Jpg();
        }

    $("." + triggerClassName).each(function(index){
        var id = $(this).data("triggerId"),
            blockIdSelector = "[data-block-id='" + $(this).attr("data-block-id") + "']",
            triggersSelector = "." + triggerClassName + "[data-trigger-id='" + id + "']";
       if( $.inArray( id, self.triggerIds ) === -1 ){

            self.triggerIds.push( id );
            var triggers = $(triggersSelector),
                selectNumber = index % 5,
                viewers = $(triggersSelector).find(".js-inputFileViewer"),
                deleters = $(triggersSelector).find(".js-inputFileDeleter");
                controller = $(".js-inputFileController" + blockIdSelector ).eq(selectNumber);

            var instance = new EntryFormFileReader(
                triggers,
                controller,
                viewers,
                deleters,
                self,
                "js-inputFileTriggerIcon",
                heicController
            );

            instance.bind();

            self.instances.push( instance );

            self.forms.push( controller );

        }


        $(this).closest("form").submit(function(){
            var res = false,
                firstTriggerObject = $(this).find(".js-inputFileTriggerIcon").first(),
                blockId = firstTriggerObject.attr("data-block-id"),
                isOtoiawaseTable = $("#otoiawase_table_box").length > 0,
                isEstimate = $("#mitumori_table_box").length > 0,
                imageLastObject = isOtoiawaseTable ? $("#otoiawase_table_box").find(".js-hasImage:last").find(".js-inputFileViewerOuter") : $(".categoryCheck").closest(".est_table_car").find(".js-hasImage:last").find(".js-inputFileViewerOuter");

            // 見積り以外
            if( !isEstimate ){

                if( $(this).find("input.js-mustSelectPicture[data-block-id = '" + blockId + "']").val() === "1" ){

                    firstTriggerObject.removeClass("js-error");
                    // $(".fileSizeProgressBarInner").removeClass("sizeOver js-error");

                    for( var i = 0; i < self.instances.length; i++ ){

                        var instance = self.instances[ i ];

                        if( instance.hasImage ) res = true;
                    
                    }

                    if( !res ){

                        firstTriggerObject.addClass("js-error");
                        return res;
                        // 消せないので吹き出しなしにしてる
                        // Validator.baloon.open( firstTriggerObject[0], "画像を最低1枚アップロードしてください" );

                    }

                }

                if( imageLastObject.hasClass("sizeOver") ) {

                    imageLastObject.removeClass("sizeOver");

                    if( !$("body").hasClass("formError") ) {
                        self.scrollToImagePosition();
                    }

                    imageLastObject.addClass("sizeOver");

                    return false;

                } else {

                    return true;
                }

            } else {

                // 見積りは画像添付が複数あるので別処理になる
                var submenuId = $('input[type = "hidden"][name = "submenu"]').val(),
                    mustSelectPictureObject = $('.js-mustSelectPicture[data-form-menu-id = "' + submenuId + '"]').val(),
                    parentTableObject = $("#submenu_form_" + submenuId),
                    firstTriggerObject = parentTableObject.find(".js-inputFileTriggerIcon").eq(0);

                // 入力必須？
                if( mustSelectPictureObject === "1" ){

                    var res = false;

                    for( var i = 0; i < self.instances.length; i++ ){

                        var instance = self.instances[ i ];

                        if( instance.hasImage ){
                            res = true;
                        }
                    
                    }

                    if( !res ){
                        firstTriggerObject.addClass("js-error");
                        return false;
                    }

                }


                // 容量チェック
                var imageLastObject = parentTableObject.find(".js-hasImage").last().find(".js-inputFileViewerOuter");

                if( imageLastObject.length > 0 ){

                    if( imageLastObject.hasClass("sizeOver") ){

                        imageLastObject.removeClass("sizeOver");

                        if( !$("body").hasClass("formError") ) {
                            self.scrollToImagePosition();
                        }

                        imageLastObject.addClass("sizeOver");

                        return false;

                    }

                }



            }

        })


        $(".js-deleteFileSizeOver").on("click", function(){
            imageLastObject.find(".js-inputFileDeleter").trigger("click");
        });
    })


  }


  this.selected = function()
  {

    var res = false;

    for( var i = 0; i < self.forms.length; i++ ){

        var form = self.forms[i];

        if( form.val() !== "" ){
            res = true;
        }

    }

    return res;
  }


  this.validateSize = function()
  {

    var size = self.totalFileSize();

    return size <= self.maxSize;

  }

  this.totalFileSize = function()
  {
    var size = 0;

    for( var i = 0; i < self.forms.length; i++ ){

        var form = self.forms[i];

        if( form.val() !== "" ){
            size += form[0].files[0].size
        }

    }

    return size;
  }

  this.fileSizeRate = function()
  {
    var size = self.totalFileSize(),
        rate = size / self.maxSize;
    return size >= self.maxSize ? 100 : rate * 100;
  }

  this.convertFileSize = function( size )
  {
    var size = ( size / 1000 / 1000 ).toFixed(1);
    return size + self.addSizeUnit("MB");
  }

  this.addSizeUnit = function( str )
  {
    return "<span class='sizeUnit'>" + str + "</span>";
  }

  this.remaining = function()
  {
    return self.convertFileSize( self.maxSize - self.totalFileSize() );
  }


  this.validExtension = function( file )
  {

    var name = file.name,
        match = name.match(/(.*)\.(.*)/);

    if( match !== null ){

        if( typeof match[2] === "string" && $.inArray( match[2].toLowerCase(), self.extensions ) > -1 ){
            return true;
        }

    }

    return false;

  }

  this.scrollToImagePosition = function()
  {
    var top = $(".pict_input_block").offset().top,
        fixedMenuHeight = $("#fixed_menu2").outerHeight(true),
        diff = 25,
        position = top - fixedMenuHeight - diff;
    $('html, body').animate({ scrollTop: position });
  }

  this.__construct = function()
  {

  }();


}


var PreventPostedByEnter = function( form )
{

    var self = this;

    this.form;


    this.bind = function(){

        self.form.keydown( function(e){

            if( e.keyCode === 13 ) { // 13 : Enterキー

                if( $(e.target).prop('tagName') !== "TEXTAREA" && $(e.target).attr("type") !== "submit" ) {
                    
                    return false;

                }

            }
    
        });

    }


    this.__construct = function()
    {

        self.form = form;

    }()

}


var ZipCodeActionController = function()
{

    var self = this;

    this.form = null;

    this.running = false;

    this.timer = null;
    this.showTimer = null;

    this.find = function( key, formInput=null )
    {

        var selector = "";

        switch( key ){
            case "zipcode":
                if( PAGE_ID === "111" ){
                    selector = "input[name='zipcode']";
                } else if( PAGE_ID === "22" ) {
                    selector = "input[name='zip']";
                } else {
                    if ( self.form !== null && typeof self.form !== "undefined" ) {
                        var formAttr = self.form.closest("form").attr("action");
                        if ( formAttr === "entry_form.php" ) {
                            selector = "input[name='zipcode']";
                        }else{
                            selector = "input[name='forms[zipcode]']";
                        }
                    }else{
                        selector = "input[name='forms[zipcode]']";
                    }
                }
            break;

            case "jusyo":
                if( PAGE_ID === "111" ){
                    selector = "input[name='jusyo']";
                } else if( PAGE_ID === "22" ){
                    selector = "input[name='jusyo']";
                } else {
                    if ( self.form !== null && typeof self.form !== "undefined" ) {
                        var formAttr = self.form.closest("form").attr("action");
                        if ( formAttr === "entry_form.php" ) {
                            selector = "input[name='jusyo']";
                        }else{
                            selector = "input[name='forms[jusyo]']";
                        }
                    }else{
                        selector = "input[name='forms[jusyo]']";
                    }
                }
            break;
        }

        if ( formInput !== null ) {

            return formInput.closest("form").find(selector);

        }else{

            return $(selector);

        }


    }


    this.shouldBind = function()
    {
        return self.find("zipcode").length > 0 && self.find("jusyo").length > 0;
    }


    this.isEmptyAddress = function(form)
    {
        return self.find("jusyo",form).val().length === 0;
    }

    this.isCorrectZipValue = function(form)
    {
        var zipcode = self.find("zipcode",form).val(),
            zipcodeTextNumOnly = zipcode.replace(/[^0-9０-９]/g,"");
        return zipcodeTextNumOnly.match(/^[\0-9０-９]{7}$/);
    }


    this.run = function( zip )
    {
        var def = $.Deferred();

        $.ajax({
            url : conversionRoot + "getAddressStringByZipCode.php",
            data : { z : zip },
            type : "get",
            dataType : "json",
            success : function( json )
            {
                def.resolve( json );
            },
            error : function()
            {
                def.reject();
            }

        })

        return def.promise();

    }

    this.main = function( form )
    {

        clearTimeout(self.timer);

        clearTimeout(self.showTimer);

        self.form = form;

        if( self.isEmptyAddress(form) && self.isCorrectZipValue(form) ){

            self.run( form.val() ).done(function( json ){

                var noticeText = self.find("jusyo",form).siblings(".auto_input_notice_text");

                if( json.bool ){

                    self.find("zipcode", form).trigger("blur");

                    self.find("jusyo", form).val( json.result.kanji.unioned ).trigger("blur").focus();

                    noticeText.removeClass("falseGetAdd");
                    noticeText.addClass("successGetAdd");
                    noticeText.text("郵便番号から自動取得しました");

                }else{

                    noticeText.removeClass("successGetAdd");
                    noticeText.addClass("falseGetAdd");
                    noticeText.text("郵便番号をご確認ください");

                }

                noticeText.css({
                    "display":"block"
                });

                self.showTimer = setTimeout(function(){
                    noticeText.css({
                        "opacity":"1"
                    });
                },50);

                self.timer = setTimeout(function(){
                    noticeText.css({
                        "opacity":"0",
                        "display":"none"
                    });
                },5050);

            });

        }

    }


    this.bind = function()
    {

        // 郵便番号と住所のフォームが出ている時にのみイベントをバインドする
        if ( self.shouldBind ) {

            $("input[name='zipcode'],input[name='zip'],input[name='forms[zipcode]']").on("blur", function(){

                self.main( $(this) );

            });

        }

    }

    this.__construct = function()
    {
        
    }();

}


var pdfIconUploader = function( file )
{

    var self = this;
    this.isEdit = false;

    this.isEditPage = function()
    {
        var currentPageUrl = location.href;


        if( typeof currentPageUrl !== "undefined" ){

            self.isEdit = currentPageUrl.indexOf("pgmid") !== -1;
            return self.isEdit;

        }

    }

    this.isPDF = function( file )
    {
        return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    }

}

var EntryFormFileReader = function( trigger, controller, viewer, deleter, manager, triggerClassName, heicController=null )
{

  var self = this;

  this.hasImage = false;
  this.isPdf = false;
  this.base64 = "";
  this.ext = "";

  this.trigger;
  this.controller;
  this.viewer;
  this.deleter;

  this.targetTableSelector;

  this.heicController;

  this.pdfController = new pdfIconUploader();

  this.bind = function()
  {

    self.trigger.click(function(e){
      self.targetTableSelector = $(this).closest(".est_table_car");
      if( !$(e.target).hasClass("js-inputFileDeleter") ){
        if ( !self.trigger.hasClass("js-loadImage") ) {
            self.controller.click();
        }else{
            alert("アップロード中です。しばらくお待ちください");
        }
      }

    })


    self.controller.change(function(){

      var $this = $(this);
      var file = $(this)[0].files[0];

      if ( !file ) {
        return false;
      }

      self.data = new FormData();
      self.data.append( "image", file );
      self.trigger.addClass("js-loadImage");

      var reader = new FileReader();

      if( self.manager.validExtension( file ) ){

        if( self.heicController.isHEIC(file) ){

          self.data.append("mode", "base64");

          self.heicController.main(file)
          .then( blob => {

              var res = URL.createObjectURL(blob);

              var convertFile = new File( [blob], `converted_image.${self.heicController.extensionSwitcher(blob.type)}`, { type : blob.type} );

              // input にアップされたHEIC画像と変換後jpeg のバイナリファイルに入れ替える
              var dataTransfer = new DataTransfer();
              dataTransfer.items.add(convertFile);
              $this[0].files = dataTransfer.files;

              self.base64 = res;
              self.hasImage = true;
              self.preview();
              self.progress();
              self.successing();

          },err => {

            var message = "ファイルのサイズが大きすぎます。\nお手数ですが、ファイルをご確認の上、再度お試しください。";
            self.error( message );
            self.successing();

          });

        }else if(self.pdfController.isPDF( file )){
            // 先にサイズ判定

            if( !self.manager.validateSize() ){

            self.showOverAlert();
            var message = "ファイルのサイズが大きすぎます。\nお手数ですが、ファイルをご確認の上、再度お試しください。";
            self.error( message );
            self.successing();

          }else{
            self.progress();

            // 公開かどうかでpath分ける
            var isEdit = self.pdfController.isEditPage()
            if( isEdit ){
                var imagePath = '/cms/img/pdficon.png';
            } else {
                var imagePath = './img/copy2open/pdficon.png';
            }
           self.base64 = imagePath;
           self.hasImage = true;
           self.isPdf = true;
           self.preview();
           self.successing();

          }

        }else{

          reader.readAsDataURL( file );
          reader.addEventListener("load", function(e){
              self.base64 = reader.result;
              self.hasImage = true;
              self.preview();
              self.progress();
              self.successing();

          })
        }

      } else {

          var message = "「" + self.manager.extensions.join("・") + "」ファイルのみ添付いただけます。\nお手数ですが、ファイルをご確認の上、再度お試しください。";
          self.error( message );
          self.successing();

      }

      if( !self.manager.validateSize() ){

        self.showOverAlert();

      }

    });


    self.deleter.click(function(){

      if( self.hasImage ){
            if( !self.isPdf ){
                if( window.confirm( "画像を削除します。よろしいですか？" ) ){
                  self.initialize();
                  self.preview();
                  self.progress();
                  self.removeAllowed();
                  self.removeOverAlert();
                  self.successing();
                }
            }else{
                if( window.confirm( "PDFを削除します。よろしいですか？" ) ){
                  self.initialize();
                  self.preview();
                  self.progress();
                  self.removeAllowed();
                  self.removeOverAlert();
                  self.successing();
                }
            }

      }

    })


  }


  this.error = function( message )
  {
    alert( message );
    self.initialize();
    self.preview();
  }


  this.initialize = function()
  {

    self.base64 = "";
    self.hasImage = false;
    self.ext = null;
    self.controller.val("");
  }


  this.sourceInsert = function()
  {

    var deferred = $.Deferred();

    // PDFアイコンが浮かないように背景白く
    if( self.isPdf ){
        self.viewer.attr( "src", self.base64 ).css({
        "background-color": "#fff",
        "height": "50px",
        "margin": "2px auto"
    });

    } else {
        self.viewer.attr( "src", self.base64 );
    }

    setTimeout(function(){
        deferred.resolve();
    }, 200);

    return deferred.promise();

  }


  this.sourceDelete = function()
  {

    var deferred = $.Deferred();

    self.viewer.attr( "src", "" );

    setTimeout(function(){
        deferred.resolve();
    }, 200);

    return deferred.promise();

  }


  this.preview = function()
  {

    if( self.hasImage ){

      self.sourceInsert()
      .then( () => {

          self.trigger.removeClass("js-loadImage");
          self.trigger.addClass("js-hasImage");

      });

    } else {

      self.sourceDelete()
      .then( () => {

          self.trigger.removeClass("js-loadImage");
          self.trigger.removeClass("js-hasImage");

        });

    }

  }


  this.progress = function()
  {

    var size = manager.totalFileSize(),
        convertSize =  manager.convertFileSize( manager.totalFileSize() ),
        remaining = manager.remaining(),
        rate = manager.fileSizeRate(),
        blockId = self.trigger.attr("data-block-id"),
        blockIdSelecter = '[data-block-id = "' + blockId + '"]',
        isOtoiawaseTable = $("#otoiawase_table_box").length > 0,
        imageLastObject = isOtoiawaseTable ? $("#otoiawase_table_box").find(".js-hasImage:last").find(".js-inputFileViewerOuter") : $(".categoryCheck").closest(".est_table_car").find(".js-hasImage:last").find(".js-inputFileViewerOuter");
    $(".fileSizeProgressBarOuter" + blockIdSelecter).find(".js-progressDetailTotal").html( convertSize );
    $(".fileSizeProgressBarOuter" + blockIdSelecter).find(".js-remainingSize").text( remaining + "MB" );
    $(".fileSizeProgressBarOuter" + blockIdSelecter).find(".js-fileSizeProgressBar").css( {"width": rate + "%"} );
    imageLastObject.removeClass("sizeOver");

    setTimeout(function(){
        if( rate > 0 ) {
            if( rate >= 100 ) {

                $(".fileSizeProgressBarOuter" + blockIdSelecter).find(".progressAppended").addClass("hidden");
                imageLastObject.addClass("sizeOver");
                $(".fileSizeProgressBarOuter" + blockIdSelecter).find(".js-fileSizeOverAppended").addClass("show");

            } else {

                $(".fileSizeProgressBarOuter" + blockIdSelecter).find(".progressAppended").text("添付中");
                $(".fileSizeProgressBarOuter" + blockIdSelecter).find(".progressAppended").removeClass("hidden");
                imageLastObject.removeClass("sizeOver");
                $(".fileSizeProgressBarOuter" + blockIdSelecter).find(".js-fileSizeOverAppended").removeClass("show");

            }

        } else {
            $(".fileSizeProgressBarOuter" + blockIdSelecter).find(".progressAppended").text("添付できます");
        }

        $(".fileSizeProgressBarOuter" + blockIdSelecter).find(".js-fileSizeProgressBar").removeClass("row many over").addClass( self.returnStateClass( rate ) );
    }, 750);

  }


  this.returnStateClass = function( rate )
  {
    var className = "";

    if( rate < 50 ) {
        className = "row";
    } else if( rate >= 100 ) {
        className = "over";
    } else {
        className = "many";
    }

    return className;
  }

  this.showOverAlert = function()
  {
    $(".js-remainingSizeOuter").addClass("hidden");
    $(".overAlert").addClass("show");
    self.preview();
  }

  this.addAllowed = function()
  {
    $(".js-inputFileTriggerIcon").not(".js-hasImage").addClass("allowed");
  }

  this.removeOverAlert = function()
  {
    $(".js-remainingSizeOuter").removeClass("hidden");
    $(".overAlert").removeClass("show");
    self.initialize();
    self.preview();
  }

  this.removeAllowed = function()
  {
    $(".js-inputFileTriggerIcon").removeClass("allowed");
  }

  this.remove = function()
  {
      self.initialize();
      self.preview();
  }

  this.toBase64 = function( file, success, error )
  {
    $.ajax({
      url : "./encodeBase64.php",
      data : file,
      type : "POST",
      dataType : "json",
      contentType : false,
      processData : false,
      success : success,
      error : error
    })
  }

  this.successing = function()
  {
    var blockId = self.trigger.attr("data-block-id"),
        blockIdSelecter = '[data-block-id = "' + blockId + '"]';

    if( self.manager.selected() && self.manager.validateSize() ){

        self.trigger.addCheck();

        if ( isSettingBeforeUnload === "1" ) {

            // フォーム離脱防止の対応
            $(window).on("beforeunload.formNoneSubmitNotice",function(event){
              event.preventDefault();
              event.returnValue = "本当にページを終了しますか？";
            });

            $("a[target='_blank']").off("click.formNoneSubmitNotice");
            $("a[target='_blank']").on("click.formNoneSubmitNotice",function(){
              if ( !confirm('このページから離れますか？\n行った変更が保存されない可能性があります。') ) {
                  event.preventDefault();
              }
            });

        }

        $(".js-inputFileTriggerIcon" + blockIdSelecter ).removeClass("js-error");

    } else {

        self.trigger.removeCheck();

    }

  }


  this.__construct = function()
  {

    self.trigger = trigger;
    self.controller = controller;
    self.viewer = viewer;
    self.deleter = deleter;
    self.manager = manager;

    self.heicController = heicController;

  }()


};



var CallingDateTimePickerBuilder = function( jqObject, pickerNumber, displayType, formItemName )
{

    var self = this;

    this.allowTimes = [
        "00:00",
        "00:30",
        "01:00",
        "01:30",
        "02:00",
        "02:30",
        "03:00",
        "03:30",
        "04:00",
        "04:30",
        "05:00",
        "05:30",
        "06:00",
        "06:30",
        "07:00",
        "07:30",
        "08:00",
        "08:30",
        "09:00",
        "09:30",
        "10:00",
        "10:30",
        "11:00",
        "11:30",
        "12:00",
        "12:30",
        "13:00",
        "13:30",
        "14:00",
        "14:30",
        "15:00",
        "15:30",
        "16:00",
        "16:30",
        "17:00",
        "17:30",
        "18:00",
        "18:30",
        "19:00",
        "19:30",
        "20:00",
        "20:30",
        "21:00",
        "21:30",
        "22:00",
        "22:30",
        "23:00",
        "23:30",
    ];


    this.jqObject = null;

    this.pickerNumber = null;

    this.displayType = null;

    this.formItemName = null;

    this.year = null;
    this.month = null;
    this.day = null;
    this.hour = null;
    this.minute = null;

    this.time = null;


    this.closed = true;


    /**
     * オプションに利用。初期の日付を定義。
     * 存在しない場合は何も返さない => 今日の日付が選択される。
     */
    this.buildDefaultDateString = function()
    {
        // console.log("buildDefaultDate", self.year, self.month, self.day);

        var dateTime = new Date();
        var str;

        if (self.year !== "null" && self.month !== "null" && self.day !== "null") {

            str = self.year + "/" + self.month + "/" + self.day;

        } else {

            str = dateTime.getFullYear() + "/" + (dateTime.getMonth() + 1) + "/" + dateTime.getDate();

        }

        // console.log(str);
        return str;
    }


    /**
     * オプションに利用。初期の時刻を定義。
     * 存在しない場合は何も返さない => 何も選択されない。
     */
    this.buildDefaultTimeString = function()
    {
        var dateTime = new Date();
        var str = "";

        if ( self.hour !== "null" && self.minute !== "null") {

            str = self.hour + ":" + self.minute;

        }

        // console.log("buildDefaultDate", self.hour, self.minute);

        return str;
    }



    // 専用HTMLの追加はこのタイミングで行う。
    this.onShow = function( current, input )
    {

    }


    // おそらくカレンダーのHTMLが準備できたタイミング
    this.onGenerate = function()
    {

    }


    /**
     * オプションに利用。閉じる際のイベント。
     */
    this.onClose = function( current, input )
    {

        // 閉じた経験が無ければ
        if( !self.closed ){

            // 閉じました
            self.closed = true;
            // Ajaxイベント発火
            // イベントの破壊（デストラクタ）
            // console.log("onClose", current, input);

            self.jqObject.datetimepicker( "destroy" );
            // $(".xdsoft_datetimepicker").remove();
            // self.jqObject.off();

            self.onCloseEventExec();

        }

    }

    this.onCloseExpireDate = function()
    {
        self.jqObject.closest(".js-dateWrapper ").find("select[name='forms[expire_y]']").change();
        self.jqObject.closest(".js-dateWrapper ").find("select[name='forms[expire_m]']").change();
        self.jqObject.closest(".js-dateWrapper ").find("select[name='forms[expire_d]']").change();
    }

    this.onCloseReserveDate = function()
    {
        self.jqObject.closest(".js-dateWrapper ").find("select[name='forms[reserve_date_y]']").change();
        self.jqObject.closest(".js-dateWrapper ").find("select[name='forms[reserve_date_m]']").change();
        self.jqObject.closest(".js-dateWrapper ").find("select[name='forms[reserve_date_d]']").change();
    }

    this.onCloseReserveDateTime = function()
    {
        self.jqObject.closest(".reserveDateOuter ").find("select[name='forms[reserve_date_multiple_y_" + self.pickerNumber + "]']").change();
        self.jqObject.closest(".reserveDateOuter ").find("select[name='forms[reserve_date_multiple_m_" + self.pickerNumber + "]']").change();
        self.jqObject.closest(".reserveDateOuter ").find("select[name='forms[reserve_date_multiple_d_" + self.pickerNumber + "]']").change();

        self.jqObject.closest(".reserveDateOuter ").find("select[name='forms[reserve_date_multiple_h_" + self.pickerNumber + "]']").change();
        self.jqObject.closest(".reserveDateOuter ").find("select[name='forms[reserve_date_multiple_min_" + self.pickerNumber + "]']").change();
    }

    this.onCloseLendingDateTime = function()
    {
        self.jqObject.closest(".js-dateWrapper ").find("select[name='forms[lending_datetime_y]']").change();
        self.jqObject.closest(".js-dateWrapper ").find("select[name='forms[lending_datetime_m]']").change();
        self.jqObject.closest(".js-dateWrapper ").find("select[name='forms[lending_datetime_d]']").change();
        self.jqObject.closest(".js-dateWrapper ").find("select[name='forms[lending_datetime_t]']").change();
    }

    this.onCloseReturnOfDateTime = function()
    {
        self.jqObject.closest(".js-dateWrapper ").find("select[name='forms[return_datetime_y]']").change();
        self.jqObject.closest(".js-dateWrapper ").find("select[name='forms[return_datetime_m]']").change();
        self.jqObject.closest(".js-dateWrapper ").find("select[name='forms[return_datetime_d]']").change();
        self.jqObject.closest(".js-dateWrapper ").find("select[name='forms[return_datetime_t]']").change();
    }

    this.onCloseDeliverDateTime = function()
    {
        self.jqObject.closest(".js-dateWrapper ").find("select[name='forms[deliver_datetime_y]']").change();
        self.jqObject.closest(".js-dateWrapper ").find("select[name='forms[deliver_datetime_m]']").change();
        self.jqObject.closest(".js-dateWrapper ").find("select[name='forms[deliver_datetime_d]']").change();
        self.jqObject.closest(".js-dateWrapper ").find("select[name='forms[deliver_datetime_t]']").change();
    }

    this.onCloseDeadlineTime = function()
    {
        self.jqObject.closest(".deadlineOuter ").find("select[name='forms[deadline_y_" + self.pickerNumber + "]']").change();
        self.jqObject.closest(".deadlineOuter ").find("select[name='forms[deadline_m_" + self.pickerNumber + "]']").change();
        self.jqObject.closest(".deadlineOuter ").find("select[name='forms[deadline_d_" + self.pickerNumber + "]']").change();

        self.jqObject.closest(".deadlineOuter ").find("select[name='forms[deadline_h_" + self.pickerNumber + "]']").change();
        self.jqObject.closest(".deadlineOuter ").find("select[name='forms[deadline_min_" + self.pickerNumber + "]']").change();
    }

    this.onCloseReserveTime = function()
    {
        self.jqObject.closest(".js-dateWrapper ").find("select[name='forms[reserve_time_h]']").change();
        self.jqObject.closest(".js-dateWrapper ").find("select[name='forms[reserve_time_min]']").change();
    }

    this.onCloseCareer1PeriodStart = function()
    {
        self.jqObject.closest(".js-dateWrapper ").find("input[name='forms[career1_period_start]']").change();
    }

    this.onCloseCareer1PeriodEnd = function()
    {
        self.jqObject.closest(".js-dateWrapper ").find("input[name='forms[career1_period_end]']").change();
    }

    this.onCloseCareer2PeriodStart = function()
    {
        self.jqObject.closest(".js-dateWrapper ").find("input[name='forms[career2_period_start]']").change();
    }

    this.onCloseCareer2PeriodEnd = function()
    {
        self.jqObject.closest(".js-dateWrapper ").find("input[name='forms[career2_period_end]']").change();
    }

    this.onChangeExpireDate = function( dateTime, jqObject )
    {
        self.setExpireDate( dateTime, jqObject );
    }

    this.onChangeReserveDateTime = function( dateTime, jqObject )
    {
        self.setReserveDateTime( dateTime, jqObject );
    }

    this.onChangeDeadlineTime = function( dateTime, jqObject )
    {
        self.setDeadlineTime( dateTime, jqObject );
    }

    this.onChangeReserveDate = function( dateTime, jqObject )
    {
        self.setReserveDate( dateTime, jqObject );
    }

    this.onChangeLendingDateTime = function( dateTime, jqObject )
    {
        self.setLendingDateTime( dateTime, jqObject );
    }

    this.onChangeReturnOfDateTime = function( dateTime, jqObject )
    {
        self.setReturnOfDateTime( dateTime, jqObject );
    }

    this.onChangeDeliverDateTime = function( dateTime, jqObject )
    {
        self.setDeliverDateTime( dateTime, jqObject );
    }

    this.onChangeReserveTime  = function( dateTime, jqObject )
    {
        self.setReserveTime( dateTime, jqObject );
    }

    this.onChangeCareer1PeriodStart = function( dateTime, jqObject )
    {
        self.setCareer1PeriodStart( dateTime, jqObject );
    }

    this.onChangeCareer1PeriodEnd = function( dateTime, jqObject )
    {
        self.setCareer1PeriodEnd( dateTime, jqObject );
    }

    this.onChangeCareer2PeriodStart = function( dateTime, jqObject )
    {
        self.setCareer2PeriodStart( dateTime, jqObject );
    }

    this.onChangeCareer2PeriodEnd = function( dateTime, jqObject )
    {
        self.setCareer2PeriodEnd( dateTime, jqObject );
    }

    this.setExpireDate = function( dateTime, jQueryObj )
    {
        self.year = dateTime.getFullYear();
        self.month = self.zeroPadding( dateTime.getMonth() + 1 );
        self.day = self.zeroPadding( dateTime.getDate() );

        jqObject.closest(".js-dateWrapper ").find("select[name='forms[expire_y]']").val( self.year ).focus().blur();
        jqObject.closest(".js-dateWrapper ").find("select[name='forms[expire_m]']").val( self.month ).focus().blur();
        jqObject.closest(".js-dateWrapper ").find("select[name='forms[expire_d]']").val( self.day ).focus().blur();
    }

    this.setReserveDateTime = function( dateTime, jqObject )
    {
        self.year = dateTime.getFullYear();
        self.month = self.zeroPadding( dateTime.getMonth() + 1 );
        self.day = self.zeroPadding( dateTime.getDate() );

        self.hour = self.zeroPadding( dateTime.getHours() );
        self.minute = self.zeroPadding( dateTime.getMinutes() );

        self.pickerNumber = jqObject.attr("data-number");

        jqObject.closest(".reserveDateOuter ").find("select[name='forms[reserve_date_multiple_y_" + self.pickerNumber + "]']").val( self.year ).focus().blur();
        jqObject.closest(".reserveDateOuter ").find("select[name='forms[reserve_date_multiple_m_" + self.pickerNumber + "]']").val( self.month ).focus().blur();
        jqObject.closest(".reserveDateOuter ").find("select[name='forms[reserve_date_multiple_d_" + self.pickerNumber + "]']").val( self.day ).focus().blur();

        jqObject.closest(".reserveDateOuter ").find("select[name='forms[reserve_date_multiple_h_" + self.pickerNumber + "]']").val( self.hour ).focus().blur();
        jqObject.closest(".reserveDateOuter ").find("select[name='forms[reserve_date_multiple_min_" + self.pickerNumber + "]']").val( self.minute ).focus().blur();
    }

    this.setDeadlineTime = function( dateTime, jqObject )
    {
        self.year = dateTime.getFullYear();
        self.month = self.zeroPadding( dateTime.getMonth() + 1 );
        self.day = self.zeroPadding( dateTime.getDate() );

        self.hour = self.zeroPadding( dateTime.getHours() );
        self.minute = self.zeroPadding( dateTime.getMinutes() );

        self.pickerNumber = jqObject.attr("data-number");

        jqObject.closest(".deadlineOuter ").find("select[name='forms[deadline_y_" + self.pickerNumber + "]']").val( self.year ).focus().blur();
        jqObject.closest(".deadlineOuter ").find("select[name='forms[deadline_m_" + self.pickerNumber + "]']").val( self.month ).focus().blur();
        jqObject.closest(".deadlineOuter ").find("select[name='forms[deadline_d_" + self.pickerNumber + "]']").val( self.day ).focus().blur();

        jqObject.closest(".deadlineOuter ").find("select[name='forms[deadline_h_" + self.pickerNumber + "]']").val( self.hour ).focus().blur();
        jqObject.closest(".deadlineOuter ").find("select[name='forms[deadline_min_" + self.pickerNumber + "]']").val( self.minute ).focus().blur();
    }

    this.setLendingDateTime = function( dateTime, jqObject )
    {
        self.year = dateTime.getFullYear();
        self.month = self.zeroPadding( dateTime.getMonth() + 1 );
        self.day = self.zeroPadding( dateTime.getDate() );

        self.hour = self.zeroPadding( dateTime.getHours() );
        self.minute = self.zeroPadding( dateTime.getMinutes() );

        self.hour = self.zeroPadding( dateTime.getHours() );
        self.minute = self.zeroPadding( dateTime.getMinutes() );

        self.time = self.hour + ":" + self.minute;

        jqObject.closest(".js-dateWrapper ").find("select[name='forms[lending_datetime_y]']").val( self.year ).focus().blur();
        jqObject.closest(".js-dateWrapper ").find("select[name='forms[lending_datetime_m]']").val( self.month ).focus().blur();
        jqObject.closest(".js-dateWrapper ").find("select[name='forms[lending_datetime_d]']").val( self.day ).focus().blur();
        jqObject.closest(".js-dateWrapper ").find("select[name='forms[lending_datetime_t]']").val( self.time ).focus().blur();
    }

    this.setReturnOfDateTime = function( dateTime, jqObject )
    {
        self.year = dateTime.getFullYear();
        self.month = self.zeroPadding( dateTime.getMonth() + 1 );
        self.day = self.zeroPadding( dateTime.getDate() );

        self.hour = self.zeroPadding( dateTime.getHours() );
        self.minute = self.zeroPadding( dateTime.getMinutes() );

        self.hour = self.zeroPadding( dateTime.getHours() );
        self.minute = self.zeroPadding( dateTime.getMinutes() );

        self.time = self.hour + ":" + self.minute;

        jqObject.closest(".js-dateWrapper ").find("select[name='forms[return_datetime_y]']").val( self.year ).focus().blur();
        jqObject.closest(".js-dateWrapper ").find("select[name='forms[return_datetime_m]']").val( self.month ).focus().blur();
        jqObject.closest(".js-dateWrapper ").find("select[name='forms[return_datetime_d]']").val( self.day ).focus().blur();
        jqObject.closest(".js-dateWrapper ").find("select[name='forms[return_datetime_t]']").val( self.time ).focus().blur();
    }

    this.setDeliverDateTime = function( dateTime, jqObject )
    {
        self.year = dateTime.getFullYear();
        self.month = self.zeroPadding( dateTime.getMonth() + 1 );
        self.day = self.zeroPadding( dateTime.getDate() );

        self.hour = self.zeroPadding( dateTime.getHours() );
        self.minute = self.zeroPadding( dateTime.getMinutes() );

        self.hour = self.zeroPadding( dateTime.getHours() );
        self.minute = self.zeroPadding( dateTime.getMinutes() );

        self.time = self.hour + ":" + self.minute;

        jqObject.closest(".js-dateWrapper ").find("select[name='forms[deliver_datetime_y]']").val( self.year ).focus().blur();
        jqObject.closest(".js-dateWrapper ").find("select[name='forms[deliver_datetime_m]']").val( self.month ).focus().blur();
        jqObject.closest(".js-dateWrapper ").find("select[name='forms[deliver_datetime_d]']").val( self.day ).focus().blur();
        jqObject.closest(".js-dateWrapper ").find("select[name='forms[deliver_datetime_t]']").val( self.time ).focus().blur();
    }

    this.setReserveDate = function( dateTime, jQueryObj )
    {
        self.year = dateTime.getFullYear();
        self.month = self.zeroPadding( dateTime.getMonth() + 1 );
        self.day = self.zeroPadding( dateTime.getDate() );

        jqObject.closest(".js-dateWrapper ").find("select[name='forms[reserve_date_y]']").val( self.year ).focus().blur();
        jqObject.closest(".js-dateWrapper ").find("select[name='forms[reserve_date_m]']").val( self.month ).focus().blur();
        jqObject.closest(".js-dateWrapper ").find("select[name='forms[reserve_date_d]']").val( self.day ).focus().blur();
    }

    this.setReserveTime = function( dateTime, jQueryObj )
    {
        self.hour = self.zeroPadding( dateTime.getHours() );
        self.minute = self.zeroPadding( dateTime.getMinutes() );

        jqObject.closest(".js-dateWrapper ").find("select[name='forms[reserve_time_h]']").val( self.hour ).focus().blur();
        jqObject.closest(".js-dateWrapper ").find("select[name='forms[reserve_time_min]']").val( self.minute ).focus().blur();
    }

    this.setCareer1PeriodStart = function( dateTime, jQueryObj )
    {
        self.year = dateTime.getFullYear();
        self.month = self.zeroPadding( dateTime.getMonth() + 1 );
        self.day = self.zeroPadding( dateTime.getDate() );

        self.datetime = self.year + "-" + self.month + "-" + self.day;

        jqObject.closest(".js-dateWrapper ").find("input[name='career1_period_start']").val( self.datetime ).blur();
    }

    this.setCareer1PeriodEnd = function( dateTime, jQueryObj )
    {
        self.year = dateTime.getFullYear();
        self.month = self.zeroPadding( dateTime.getMonth() + 1 );
        self.day = self.zeroPadding( dateTime.getDate() );

        self.datetime = self.year + "-" + self.month + "-" + self.day;

        jqObject.closest(".js-dateWrapper ").find("input[name='career1_period_end']").val( self.datetime ).blur();
    }

    this.setCareer2PeriodStart = function( dateTime, jQueryObj )
    {
        self.year = dateTime.getFullYear();
        self.month = self.zeroPadding( dateTime.getMonth() + 1 );
        self.day = self.zeroPadding( dateTime.getDate() );

        self.datetime = self.year + "-" + self.month + "-" + self.day;

        jqObject.closest(".js-dateWrapper ").find("input[name='career2_period_start']").val( self.datetime ).blur();
    }

    this.setCareer2PeriodEnd = function( dateTime, jQueryObj )
    {
        self.year = dateTime.getFullYear();
        self.month = self.zeroPadding( dateTime.getMonth() + 1 );
        self.day = self.zeroPadding( dateTime.getDate() );

        self.datetime = self.year + "-" + self.month + "-" + self.day;

        jqObject.closest(".js-dateWrapper ").find("input[name='career2_period_end']").val( self.datetime ).blur();
    }

    // 2桁で統一
    this.zeroPadding = function( number )
    {
        return ( '00' + number ).slice( -2 );
    }

    // オプション群
    this.buildOptions = function()
    {

        var date = new Date();

        if ( self.formItemName === "expire" ){
            var minDateValue = false;
        } else {
            var minDateValue = "-1970/01/01";
        }

        if ( self.formItemName === "reserve_time" ) {
            return {
                format : 'H:i',
                datepicker: false,
                allowTimes : self.allowTimes,
                onShow : self.onShow,
                onClose : self.onClose,
                onChangeDateTime : self.changeDateEventSwicher(),
            };
        }else{
            if ( 
                self.formItemName === "career1_period_start" ||
                self.formItemName === "career1_period_end" ||
                self.formItemName === "career2_period_start" ||
                self.formItemName === "career2_period_end"
            ) {

                return {
                    beforeShowDay : null,
                    onShow : self.onShow,
                    onClose : self.onClose,
                    onChangeDateTime : self.changeDateEventSwicher(),
                    onGenerate : self.onGenerate,
                    closeOnTimeSelect : 0,
                    timepicker: self.displayType === "datetime"
                };

            }else{

                return {
                    allowTimes : self.allowTimes, // 定義済み
                    defaultDate : self.buildDefaultDateString(),
                    // defaultTime : self.buildDefaultTimeString(),
                    onShow : self.onShow,
                    onClose : self.onClose,
                    onChangeDateTime : self.changeDateEventSwicher(),
                    onGenerate : self.onGenerate,
                    closeOnTimeSelect : 0,
                    timepicker: self.displayType === "datetime",
                    yearStart: date.getFullYear(),
                    yearEnd: date.getFullYear() + 3,
                    minDate: minDateValue
                };

            }

        }


    }

    this.changeDateEventSwicher = function()
    {
        switch( self.formItemName ){

            // 車検満了日
            case "expire":
                return self.onChangeExpireDate
            break;

            // 来店希望日
            case "reserve_date":
                return self.onChangeReserveDate
            break;

            // 来店希望日時
            case "reserve_date_time":
                return self.onChangeReserveDateTime
            break;

            // 貸出日時
            case "lending_datetime":
                return self.onChangeLendingDateTime
            break;

            // 返却日時
            case "return_datetime":
                return self.onChangeReturnOfDateTime
            break;

            case "deliver_datetime":
                return self.onChangeDeliverDateTime
            break;

            case "reserve_time":
                return self.onChangeReserveTime
            break;

            case "career1_period_start":
                return self.onChangeCareer1PeriodStart
            break;

            case "career1_period_end":
                return self.onChangeCareer1PeriodEnd
            break;

            case "career2_period_start":
                return self.onChangeCareer2PeriodStart
            break;

            case "career2_period_end":
                return self.onChangeCareer2PeriodEnd
            break;

            case "deadline":
                return self.onChangeDeadlineTime
            break;

        }
    }

    this.onCloseEventExec = function()
    {
        switch( self.formItemName ){

            // 車検満了日
            case "expire":
                self.onCloseExpireDate()
            break;

            // 来店希望日
            case "reserve_date":
                self.onCloseReserveDate()
            break;

            // 来店希望日時
            case "reserve_date_time":
                self.onCloseReserveDateTime()
            break;

            // 貸出日時
            case "lending_datetime":
                self.onCloseLendingDateTime()
            break;

            // 返却日時
            case "return_datetime":
                self.onCloseReturnOfDateTime()
            break;

            case "deliver_datetime":
                self.onCloseDeliverDateTime()
            break;

            case "reserve_time":
                self.onCloseReserveTime()
            break;

            case "career1_period_start":
                self.onCloseCareer1PeriodStart()
            break;

            case "career1_period_end":
                self.onCloseCareer1PeriodEnd()
            break;

            case "career2_period_start":
                self.onCloseCareer2PeriodStart()
            break;

            case "career2_period_end":
                self.onCloseCareer2PeriodEnd()
            break;

            case "deadline":
                self.onCloseDeadlineTime()
            break;

        }
    }

    // datetimepickerをバインド
    this.bind = function()
    {
        self.jqObject.datetimepicker( self.options );
    }


    // datetimepicker表示
    this.show = function()
    {

        if( self.closed ) {
            self.jqObject.datetimepicker( "show" );
            self.jqObject.attr("data-editting", "1").data("editting", "1");
            self.closed = false;
        }

    }


    this.run = function()
    {
        self.bind();
        self.show();
    }


    this.setToday = function()
    {

        var tmp = new Date();
        self.year = tmp.getFullYear();
        self.month = tmp.getMonth() + 1;
        self.day = tmp.getDate();
        self.hour = tmp.getHours();
        self.minute = tmp.getMinutes();
        self.time = self.hour + ":" + self.minute;

    }

    this.__construct = function()
    {
        self.jqObject = jqObject;
        self.pickerNumber = pickerNumber;
        self.displayType = displayType;
        self.formItemName = formItemName;

        self.setToday();

        self.options = self.buildOptions();

    }()

}




$(function () {

    $.datetimepicker.setLocale('ja');

    $(".js-dateTimePickTrigger").on("click", function(){

        var instance = new CallingDateTimePickerBuilder(
            $(this),
            $(this).attr("data-number"),
            $(this).attr("data-display-type"),
            $(this).attr("data-form-item")
        );

        instance.run();

        instance = null;

    });

});


// 昨日以前を選択不可
$(function(){

    var date = new Date(),
        currentYear = date.getFullYear(),
        currentMonth = date.getMonth()+1,
        currentDay = date.getDate(),
        currentDate = currentYear+"-"+currentMonth+"-"+currentDay;

    function dateDisabled (year, month, optionMonth, optionDay, selectDateType){

        if(year === String(currentYear) && selectDateType !== "expire"){
            for(var i = 1; i < currentMonth; i++){
                optionMonth.eq(i).attr("disabled", true);
            }
            if(month === String(currentMonth)){
                for(var i = 1; i < currentDay; i++){
                    optionDay.eq(i).attr("disabled", true);
                }
            } else {
                optionDay.attr("disabled", false);
            }
        } else {
            optionMonth.attr("disabled", false);
            optionDay.attr("disabled", false);
        }
    }

    $(".js-dateWrapper").on("click", function(){
        if($(this).find(".reserveDateOuter").length > 0){

            var outer = $(this).find(".reserveDateOuter");
            var selectDateType = $(this).find(".js-datePicker").data("date-type");

            outer.each(function(){

            var year = $(this).find("select").eq(0).val(),
                month = $(this).find("select").eq(1).val();

            var optionMonth = $(this).find("select").eq(1).find("option");
                optionDay = $(this).find("select").eq(2).find("option");

            dateDisabled(year, month, optionMonth, optionDay, selectDateType);

            })

        }else if($(this).find(".deadlineOuter").length > 0){

            var outer = $(this).find(".deadlineOuter");
            var selectDateType = $(this).find(".js-datePicker").data("date-type");

            outer.each(function(){

                var year = $(this).find("select").eq(0).val(),
                    month = $(this).find("select").eq(1).val();

                var optionMonth = $(this).find("select").eq(1).find("option");
                    optionDay = $(this).find("select").eq(2).find("option");

                dateDisabled(year, month, optionMonth, optionDay, selectDateType);

            })

        } else {

            if ( 
                $(this).find("input[name='career1_period_start']").length > 0 ||
                $(this).find("input[name='career1_period_end']").length > 0 ||
                $(this).find("input[name='career2_period_start']").length > 0 ||
                $(this).find("input[name='career2_period_end']").length > 0
            ) {
                // nothing
            }else{

                var year = $(this).find("select").eq(0).val(),
                    month = $(this).find("select").eq(1).val();


                var optionMonth = $(this).find("select").eq(1).find("option");
                    optionDay = $(this).find("select").eq(2).find("option");

                var selectDateType = $(this).find(".js-datePicker").data("date-type");

                dateDisabled(year, month, optionMonth, optionDay, selectDateType);

            }

        }


    });
});

(function(){

    var DktlCsrf = function()
    {

        var self = this;

        this.const = {
            COOKIE_KEY : "_csrf",
            RANDOM_STRING_BASE : "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
            RANDOM_STRING_LENGTH : 20,
        }


        this.randomString = "";


        this.run = function()
        {
            self.randomString = self.buildRandomString();
            self.triggerObject.prepend( self.buildHiddenContent() );
            self.addCookie();
        }

        this.addCookie = function()
        {
            var key = self.const.COOKIE_KEY,
                value = self.randomString;

            document.cookie = key + "=" + value + ";";
        }


        this.removeCookie = function()
        {
            var key = self.const.COOKIE_KEY,
                value = "tmp";
            document.cookie = key + "=" + value + ";max-age=0;"
        }


        this.buildRandomString = function()
        {

            var res = "";

            for(var i=0; i < self.const.RANDOM_STRING_LENGTH; i++){
                res += self.const.RANDOM_STRING_BASE[ Math.floor(Math.random() * self.const.RANDOM_STRING_BASE.length ) ];
            }

            return res;
        
        }


        this.buildHiddenContent = function()
        {
            return '<input type = "hidden" name = "_csrf" value = "'+self.randomString+'">';
        }


        this.shouldBoot = function()
        {
            return self.triggerObject.length > 0;
        }


        this.__construct = function()
        {
            self.triggerObject = $(".js-bootCsrf");
        }()

    }

    if( typeof $ !== "undeifned" ){

        var instance;

        $(function(){
            
            instance = new DktlCsrf();
            
            if( instance.shouldBoot() ){
                instance.run();
            } else {
                instance.removeCookie();
            }
        
        })

    }

}())



var addEvent = (window.addEventListener) ?
   (function(elm, type, event) {
      elm.addEventListener(type, event, false);
   }) : (window.attachEvent) ?
   (function(elm, type, event) {
      elm.attachEvent('on'+type, event);
   }) :
   (function(elm, type, event) {
      elm['on'+type] = event;
   }) ;

var Position = {
   offset: function(elm) {
      var pos = {};
      pos.x = this.getOffset('Left', elm);
      pos.y = this.getOffset('Top', elm);
      return pos;
   },

   getOffset: function(prop, el) {
      if(!el.offsetParent || el.offsetParent.tagName.toLowerCase() == "body")
         return el['offset'+prop];
      else
         return el['offset'+prop]+ this.getOffset(prop, el.offsetParent);
   }
};


// dktl-extension
// ￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣
var dktlExtension = typeof formExtension === "boolean" && formExtension;
var scrollToBalloon = null;
var actionType = "";
var formElement = null;


var Validator = {
   check: function(field, reg, extra) {
      var response;
      var rule = this.rule;
      rule.field = field;
      rule.value = field.value;
      rule.extra = extra;

      if(!reg || !reg.match(/^!/))
         response = rule.input();

      if(reg && !response && rule.value != '') {
         reg = reg.replace(/^!/, '');

         var mode = reg.split(/\s+/);
         for(var i = 0, m; m = mode[i]; i++) {
            m = m.replace(/([\d\-]+)?$/, '');
            response = rule[m](RegExp.$1);
            if(response) break;
         }
      }

      if(response){
         this.baloon.open(field, response);
      }
   },

   submit: function(form) {
      actionType = "submit";
      formElement = form;
      this.allclose(form);
      var btns = new Array;

      for(var i = 0, f; f = form[i]; i++) {
         if(f.onblur)
            f.onblur();
         if(f.type == 'submit')
            btns.push(f);
      }

      for(var i = 0, f, z; f = form[i]; i++) {
         if(f._validbaloon && f._validbaloon.visible()) {
            while(z = btns.shift())
               this.baloon.open(z, this.rule.submit());
            document.getElementsByTagName("body")[0].classList.add("formError");
            $(".submitting").removeClass("submitting");
            return false;
         }
      }

      document.getElementsByTagName("body")[0].classList.remove("formError");

      $(form).find(".inputbtn").addClass("submitting");

      return true;
   },

   allclose: function(form) {
      for(var i = 0, f; f = form[i]; i++)
         if(f._validbaloon) f._validbaloon.close();
   }
};

Validator.baloon = {
   index: 0,

   open: function(field, msg) {
      if(!field._validbaloon || dktlExtension ) {

         if ( field.closest(".reserveDateOuter.disnon") == null && field.closest(".deadlineOuter.disnon") == null ){

            var obj = new this.element(field);
            obj.create();
            field._validbaloon = obj;

            var useLoop = false,
                bindAction = "";

            switch( field.type ){

               case 'radio':
               case 'checkbox':
                  useLoop = true;
                  bindAction = 'focus';
                  break;

               case 'text':
               case 'password':
                  bindAction = 'input';
                  break;

               default :

                  if ( field.classList.contains("chat_input_textarea") ) {

                        if ( field.value != '' ) {
                           bindAction = 'input';
                        }

                  }else{

                     if ( field.type != 'submit') {
                        bindAction = 'change';
                     }

                  }

            }

            if ( useLoop ) {

               for(var i = 0, e; e = field.form[field.name][i]; i++)
                  addEvent(e, 'focus', function() {
                     obj.close();
                     obj.closeSubmitBaloon();
                  });

            }else{

               addEvent(field, bindAction, function() {
                  obj.close();
                  obj.closeSubmitBaloon();
               });

            }

         }

      }

      if ( field.closest(".reserveDateOuter.disnon") == null && field.closest(".deadlineOuter.disnon") == null ){
         field._validbaloon.show(msg);
      }

   },

   element: function() {
      this.initialize.apply(this, arguments);
   }
};

Validator.baloon.element.prototype = {
   initialize: function(field) {
      this.parent = Validator.baloon;
      this.field = field;
   },

   create: function() {
      var field  = this.field;

      //来店希望日時の非表示の要素にまでjs-validatedがつかないようにする
      if ( field.closest(".reserveDateOuter.disnon") == null && field.closest(".deadlineOuter.disnon") == null ){
         if( dktlExtension ) field.classList.add("js-validated");
      }

      var box = document.createElement('div');
      box.className = 'baloon';

      var offset = Position.offset(field);
      var top  = offset.y - 25;
      
      if(field.type == 'radio') {
          if( field.name === "syokusyu" ) {
              var left = offset.x + 100 + field.offsetWidth;
          } else {
              var left = offset.x + 50 + field.offsetWidth;
          }
      }else{
          if( field.type === "checkbox" && field.name.indexOf("license") !== -1 ) {
              var left = offset.x + 100 + field.offsetWidth;
          } else {
              var left = offset.x - 20 + field.offsetWidth;
          }
      }
      
      box.style.top  = top +'px';
      box.style.left = left+'px';

      var self = this;
      addEvent(box, 'click', function() { self.toTop(); });

      var bindClose = function() { self.close(); };
      var link = document.createElement('a'),
          img = document.createElement('img');
      img.setAttribute('src','img/copy2open/close.png');
      link.appendChild(img);
      link.setAttribute('href', 'javascript:void(0);');
      addEvent(link, 'click', bindClose);
      addEvent(field, 'focus', bindClose);

      var msg = document.createElement('span');
      var div = document.createElement('div');
      div.appendChild(link);
      div.appendChild(msg);
      box.appendChild(div);
      document.body.appendChild(box);

      this.box = box;
      this.msg = msg;
   },

   show: function(msg) {
      var field = this.field;
      this.msg.innerHTML  = msg;

      this.box.style.display = '';
      this.toTop();

      if(field.type != 'radio' && field.type != 'checkbox') {
         var colors = new Array('#FF6666', '#FFAAAA', '#FF6666', '#FFAAAA');
         var delay = dktlExtension && actionType === "submit" ? FormExtensionConfig.BALLOON_HIGHLIGHT_DELAY : 10;
         window.setTimeout(function() {
            if(colors.length > 0) {
               field.style.backgroundColor = colors.shift();
               window.setTimeout(arguments.callee, 70);
            }
         }, delay);
      }

      if( dktlExtension ){

         if( scrollToBalloon === null && actionType === "submit" ){

            actionType = "";
         
            scrollToBalloon = new ModifyEstimateForm.ScrollToBalloon( formElement );
            
            scrollToBalloon.action();

            setTimeout(function(){
               scrollToBalloon = null;
            }, FormExtensionConfig.SCROLL_TO_BALLOON_SPAN);

         }

      }

   },


   close: function() {
      this.box.style.display = 'none';
      this.field.style.backgroundColor = '';

      if( dktlExtension ) this.box.remove();
   },

   closeSubmitBaloon: function() {
      var validForm = document.getElementsByClassName("js-validated");
      for (var i = 0, f; f = validForm[i]; i++) {
         if ( f.type =="submit" ) {
            //submitボタンまで、return falseの分岐に通らなかったら、すべての吹き出しが消えている。
            f._validbaloon.box.style.display = 'none';
            f._validbaloon.field.style.backgroundColor = '';
         }else{
            if ( f._validbaloon.box.style.display === "" ) {
               return false;
            }
         }
      }
   },

   visible: function() {
      return (this.box.style.display == '');
   },

   toTop: function() {
      this.box.style.zIndex = 110;
     //無理やりthickboxの上に出るように加工した。
     //this.box.style.zIndex = ++ this.parent.index;
   },

};

Validator.rule = {
   msg: null,

   submit: function() {
      return this.msg.submit;
   },

   input: function() {
      if(this.field.type == 'radio' || this.field.type == 'checkbox') {
         for(var i = 0, e; e = this.field.form[this.field.name][i]; i++)
            if(e.checked) {
               //一度js-validatedがつくと外れず、同じところにスクロールするため、ここでリムーブ
               this.field.classList.remove("js-validated");
               return;
            }
         return this.msg.noselect;
      } else if(this.value == '') {

         if( this.field.className.indexOf("detail_text") !== -1 ) {
            return this.msg.noDetailInput;
         } else {
            return (this.field.type == 'select-one') ? this.msg.noselect : this.msg.noinput;
         }

      } else {
         if( this.field.type == 'text' || this.field.type == 'number' || this.field.type == 'email' || this.field.type == 'tel' ){
            if ( this.field.value != '' ) {
               this.field.classList.remove("js-validated");
            }
         }else{
            if (this.field.type !='submit' ) {
               if ( this.field.classList.contains("chat_input_textarea") ) {
                  if ( this.field.value != '') {
                     this.field.classList.remove("js-validated");
                  }
               }else{

                  // undefinedなら何もしない
                  if( typeof this.field.selectedIndex !== "undefined" ) return false;

                  // select-oneが渡っていれば処理
                  var selected = this.field.options[this.field.selectedIndex];
                  if ( selected.value != '') {
                     this.field.classList.remove("js-validated");
                  }
               }
            }
         }
      }
   },

   mail: function() {
      if(!this.value.match(/^[\x01-\x7F]+@((([-a-z0-9]+\.)*[a-z]+)|(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}))$/))
         return this.msg.mail;
   },

   equal: function() {
      if(this.field.form[this.extra].value && this.value != this.field.form[this.extra].value)
         return this.msg.unequal;
   },

   alphabet: function() {
      if(!this.value.match(/^[a-zA-Z\-\d]+$/))
         return this.msg.alphabet;
   },

   kana: function() {
      for(var i = 0;i < this.value.length;i++) {
         if(this.value.charAt(i) == ' ' || this.value.charAt(i) == '\u3000') continue;
         if(this.value.charAt(i) < '\u30A1' || this.value.charAt(i) > '\u30F6')
            return this.msg.kana;
      }
   },

   count: function(arg) {
      return this._range(arg, this.value.length, this.msg.count);
   },

   num: function(arg) {
      if(!this.value.match(/^[\d]+$/))
         return this.msg.num.nonumber;

      return this._range(arg, parseInt(this.value), this.msg.num);
   },

   amountNum: function(arg) {

      this.value = this.value.replace( /,/g, "" );

      if(!this.value.match(/^[0-9０-９]+$/))
         return this.msg.num.nonumber;

      return this._range(arg, parseInt(this.value), this.msg.num);

   },

   tel: function(arg) {

      if(this.value == '') {
         return this.msg.noinput;
      }else{

         var val = this.value;

         val = val.replace(/[０-９]/g,function(s){
            return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
         });

         if ( !val.match(/^[0-9-]+$/) ) {
            return this.msg.tel;
         }

         val = val.replace(/[^0-9]/g,"");

         if( !val.match(/^0[0-9]{9,11}$/) ){
            return this.msg.tel;
         }

      }

   },

   check: function(arg) {
      var value = 0;
      for(var i = 0, e; e = this.field.form[this.field.name][i]; i++)
         if(e.checked) value += 1;

      return this._range(arg, value, this.msg.check);
   },

   _range: function(range, value, msg) {
      if(!range) return;

      var result = '';
      var c = (" "+range).split(/\-/);
      var min = parseInt(c[0]) || 0;
      var max = parseInt(c[1]) || 0;

      if(value != min && /^\d+$/.test(range))
         result = msg.unequal;
      else if(min == 0 && value > max)
         result = msg.too_big;
      else if(max == 0 && value < min)
         result = msg.too_small;
      else if(min > 0 && max > 0 && (value < min || value > max))
         result = msg.outofrange;

      return result.replace(/%1/g, min).replace(/%2/g, max);
   },

   ex_kobutushou: function() {
      if(!this.value.match(/^[a-zａ-ｚA-ZＡ-Ｚ0-9０-９]+$/))
         return this.msg.ex_kobutushou;
   }
};

Validator.lang = {
   ja: {
      noselect:   '\u9078\u629E\u304C\u5FC5\u8981\u3067\u3059\u3002',
      noinput:    '\u5165\u529B\u304C\u5FC5\u8981\u3067\u3059\u3002',
      noDetailInput:'\u300c\u3042\u308a\u300d\u3060\u3068\u5fc5\u9808\u3067\u3059\u3002',
      unequal:    '\u5165\u529B\u304C\u63C3\u3063\u3066\u3044\u307E\u305B\u3093\u3002',
   
      submit:     '\u5165\u529B\u30A8\u30E9\u30FC\u304C\u3042\u308A\u307E\u3059\u3002',
      mail:       '\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u306E\u5F62\u5F0F\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093\u3002',
      alphabet:   '\u30A2\u30EB\u30D5\u30A1\u30D9\u30C3\u30C8\u3001\u6570\u5B57\u3001' +
                     '- \u4EE5\u5916\u306F\u5165\u529B\u51FA\u6765\u307E\u305B\u3093\u3002',
      kana:       '\u5168\u89D2\u30AB\u30BF\u30AB\u30CA\u3067\u5165\u529B\u3057\u3066\u4E0B\u3055\u3044\u3002',
   
      count: {
         unequal:    '%1'+'\u6587\u5B57\u3067\u5165\u529B\u3057\u3066\u4E0B\u3055\u3044\u3002',
         too_big:    '%2'+'\u6587\u5B57\u4EE5\u5185\u3067\u5165\u529B\u3057\u3066\u4E0B\u3055\u3044\u3002',
         too_small:  '%1'+'\u6587\u5B57\u4EE5\u4E0A\u5165\u529B\u3057\u3066\u4E0B\u3055\u3044\u3002',
         outofrange: '%1'+'\u304B\u3089'+'%2'+'\u6587\u5B57\u306E\u9593\u3067\u5165\u529B\u3057\u3066\u4E0B\u3055\u3044\u3002'
      },
   
      num: {
         nonumber:   '\u6570\u5024\u3067\u5165\u529B\u3057\u3066\u4E0B\u3055\u3044\u3002',
         unequal:    '%1'+'\u3068\u5165\u529B\u3057\u3066\u4E0B\u3055\u3044\u3002',
         too_big:    '%2'+'\u4EE5\u4E0B\u306E\u5024\u3092\u5165\u529B\u3057\u3066\u4E0B\u3055\u3044\u3002',
         too_small:  '%1'+'\u4EE5\u4E0A\u306E\u5024\u3092\u5165\u529B\u3057\u3066\u4E0B\u3055\u3044\u3002',
         outofrange: '%1'+'\u304B\u3089'+'%2'+'\u306E\u9593\u3067\u5165\u529B\u3057\u3066\u4E0B\u3055\u3044\u3002'
      },

      tel: '\u96fb\u8a71\u756a\u53f7\u306e\u5f62\u5f0f\u304c\u6b63\u3057\u304f\u3042\u308a\u307e\u305b\u3093',
   
      check: {
         unequal:    '\u30C1\u30A7\u30C3\u30AF\u306F'+'%1'+'\u500B\u3057\u3066\u4E0B\u3055\u3044\u3002',
         too_big:    '\u30C1\u30A7\u30C3\u30AF\u306F'+'%2'+'\u500B\u307E\u3067\u3067\u3059\u3002',
         too_small:  '\u30C1\u30A7\u30C3\u30AF\u306F'+'%1'+'\u500B\u4EE5\u4E0A\u3057\u3066\u4E0B\u3055\u3044\u3002',
         outofrange: '\u30C1\u30A7\u30C3\u30AF\u306F'+'%1'+'\u500B\u304B\u3089'+'%2'+'\u500B\u307E\u3067\u3067\u3059\u3002'
      },
      ex_kobutushou : '\u53e4\u7269\u5546\u8a31\u53ef\u756a\u53f7\u306b\u4f7f\u7528\u3067\u304d\u308b\u306e\u306f\u6570\u5b57\u30fb\u30a2\u30eb\u30d5\u30a1\u30d9\u30c3\u30c8\u306e\u307f\u3067\u3059\u3002'
   }
};

Validator.rule.msg = Validator.lang.ja;







var CookieUtil = {

    cookieToArray : function( cookie ){

        var result = [],
            array = cookie.split(";");

        for( var i = 0; i < array.length; i++ ){

            var tmp = array[i].match( /^(.*)=(.*)/ );

            if( tmp !== null ){
        
                var key = tmp[1],
                    val = tmp[2];

                result[ key.trim() ] = val.trim();
          
            }

        }

        return result;
  
    },

    arrayToCookie : function( array )
    {
        var res = [];

        for( var key in array ){

          var value = array[key];

          res.push( key + "=" + encodeURIComponent( value ) );

        }

        return res.join(";"); 
    }

}





/**
 * URL生成
 * 編集・公開 × PC・SP の4パターン存在し得るため、作成
 * @param {[type]}  shopId   [description]
 * @param {Boolean} isOpen   [description]
 * @param {[type]}  smtParam [description]
 */
var CarItemUrl = function( shopId, isOpen, smtParam )
{

    var self = this;

    this.shopId;
    this.isOpen;
    this.isSp;

    this.top = function()
    {
        if( self.isOpen ){

            return "/";

        } else {

            if( self.isSp ){

                return "/cms/em_top.php?id=" + self.shopId;

            } else {

                return "/cms/em_top.php?id=" + self.shopId + "&smt=1";

            }

        }
    }

    this.redirect = function( key, carId )
    {
        var url = "";

        if( self.isEditedBtnText(event) ) return;

        switch( key ){
            case "detail":
                url = self.detail( carId );
            break;
            default:
                url = self[key]();
            break;
        }

        location.href = url;
    
    }


    // 在庫車詳細
    this.detail = function( carId )
    {

        if( self.isOpen ){
            
            return "./carinfo_" + carId + ".html";
        
        } else {

            if( self.isSp ){

                return "./cat_usedcar.php" + "?id=" + self.shopId + "&cid=" + carId + "&smt=1"; 

            } else {

                return "./cat_usedcar.php" + "?id=" + self.shopId + "&cid=" + carId; 

            }

        }
    
    }


    // カートページ
    this.cart = function()
    {

        if( self.isOpen ){

            return "./cart.html";

        } else {

            if( self.isSp ){

                return "./cart.php" + "?id=" + self.shopId + "&smt=1";

            } else {

                return "./cart.php" + "?id=" + self.shopId;

            }

        }
    
    }

    // カートページ
    this.favorite = function()
    {

        if( self.isOpen ){

            return "./cart.html#hash-favorite";

        } else {

            if( self.isSp ){

                return "./cart.php" + "?id=" + self.shopId + "&smt=1#hash-favorite";

            } else {

                return "./cart.php" + "?id=" + self.shopId + "#hash-favorite";

            }

        }
    
    }

    this.cartInfo = function()
    {

        if( self.isOpen ){

            return "./cart_info.html";

        } else {

            if( self.isSp ){

                return "./cart_info.php" + "?id=" + self.shopId + "&smt=1";

            } else {

                return "./cart_info.php" + "?id=" + self.shopId;

            }

        }

    }


    this.cartCheck = function()
    {
        if( self.isEditedBtnText(event) ) return;

        if( self.isOpen ){

            return "./cart_check.html";

        } else {

            if( self.isSp ){

                return "./cart_check.php" + "?id=" + self.shopId + "&smt=1";

            } else {

                return "./cart_check.php" + "?id=" + self.shopId;

            }

        }

    }


    this.cartPurchase = function()
    {

        if( self.isOpen ){

            return "./cart_purchase.php";

        } else {

            if( self.isSp ){

                return "./cart_purchase.php" + "?id=" + self.shopId + "&smt=1";

            } else {

                return "./cart_purchase.php" + "?id=" + self.shopId;

            }

        }

    }


    this.cartThankyou = function()
    {
        if( self.isOpen ){

            return "./cart_thankyou.html";

        } else {

            if( self.isSp ){

                return "./cart_thankyou.php" + "?id=" + self.shopId + "&smt=1";

            } else {

                return "./cart_thankyou.php" + "?id=" + self.shopId;

            }

        }
    }

    this.isEditedBtnText = function(event)
    {
        return $(event.target).hasClass("inplace_normal");
    }


    this.__construct = function()
    {

        self.shopId = shopId;
        self.isOpen = isOpen;
        self.isSp = smtParam == "1";

    }();

}


/**
 * 在庫車データモデル
 * @param {[type]} carListJsonPublic [description]
 * @param {[type]} carListJsonHidden [description]
 */
var ShoppingModel = function( carListJsonPublic, carListJsonHidden )
{

    var self = this;

    this.refresh = function( carListJsonPublic, carListJsonHidden )
    {
        self.carListJsonPublic = carListJsonPublic;
        self.carListJsonHidden = carListJsonHidden;
    }

    // 販売可能？（個別設定的に）
    this.available = function( itemId )
    {
        var tmp = self.find( itemId );
        return typeof tmp.sale_flag !== "undefined" && tmp.sale_flag == 1;
    }

    // 存在する？
    this.exists = function( itemId )
    {
        return Object.keys(self.find( itemId )).length > 0;
    }

    // データ検索
    this.find = function( itemId )
    {

        var res = {},
            exists = false;

        if( self.carListJsonPublic !== null ){

            if( self.carListJsonPublic.length > 0 ){
                for( var i = 0; i < self.carListJsonPublic.length; i++ ){
                    if( String( itemId ) === String( self.carListJsonPublic[i].id ) ){
                        res = self.carListJsonPublic[i];
                        exists = true;
                    }
                }
            }

        }

        if( !exists && self.carListJsonHidden !== null ){

            if( self.carListJsonHidden.length > 0 ){
                for( var i = 0; i < self.carListJsonHidden.length; i++ ){
                    if( String( itemId ) === String( self.carListJsonHidden[i].id ) ){
                        res = self.carListJsonHidden[i];
                    }
                }
            }

        }

        return res;

    }


    this.__construct = function()
    {
        self.carListJsonPublic = carListJsonPublic;
        self.carListJsonHidden = carListJsonHidden;
    }()

}



/**
 * 買い物かごに入れる・気になるリストに入れる
 * @param {[type]}  shopId [description]
 * @param {Boolean} isOpen [description]
 */
var ShoppingAction = function( shopId, isOpen, smtParam, isEcSite, model )
{

    var self = this;

    this.delimiter = "--";

    this.stars = [];

    this.carts = [];


    this.has = function( key, itemId )
    {

        switch( key ){

            case "cart":
                return $.inArray( itemId, self.carts ) !== -1;
            break;

            case "star":
                return $.inArray( itemId, self.stars ) !== -1;
              break;

            default:
                return false;
            break;
        }
      
    }


    this.findTotalCost = function()
    {
        var tmp = CookieUtil.cookieToArray( document.cookie );
        return {
            total : typeof tmp["purchase-total"] !== "undefined" ? tmp["purchase-total"] : "-",
            sumable : typeof tmp["purchase-sumable"] !== "undefined" ? tmp["purchase-sumable"] : 0 
        };
    }

    this.setTotalCost = function()
    {
        var info = self.calcTotalCost();
        document.cookie = "purchase-total=" + info.sum;
        document.cookie = "purchase-sumable=" + Number( info.sumable );
    }


    this.calcTotalCost = function()
    {

        var datas = self.carts,
            sumable = true,
            sum = "-";


        for( var i = 0; i < datas.length; i++ ){

            var data = self.model.find( datas[i] ),
                costInfo = CostUtil.analyTotalCost( data, "totalCost" );

            if( !costInfo.sumable ){
            
                sumable = false;
            
            } else {

                if( sum == "-" ) sum = 0;

                sum += Number( costInfo.value );

            }

        }

        return { sum : sum, sumable : sumable };
        
    }


    this.bind = function()
    {

        $(document).on("click", ".js-dropCartButton", function(e){

            e.preventDefault();

            var itemId = String( $(this).data("itemId") ),
                from = $(this).data("fromName"),
                selfObject = $(this);

            if( !self.has( "cart", itemId ) ){

                self.addCookie( "cart", itemId );
                self.deleteCookie( "star", itemId);

                // リストをクリックした場合はリストの中身を変更
                if( from !== "detail" ){
                    self.appendToCartButtonList( selfObject.closest(".js-buyButtonOuter") );
                }

                cartBarManager.refresh();

            }

            return false;

        });


        $(document).on("click", ".js-favoriteButton", function(e){

            e.preventDefault();

            var itemId = String( $(this).data("itemId") ),
                from = $(this).data("fromName"),
                selfObject = $(this);

            if( !self.has( "star", itemId ) && !self.has( "cart", itemId ) ){

                self.addCookie( "star", itemId );

                // リストをクリックした場合はリストの中身を変更
                if( from !== "detail" ){
                    selfObject.addClass("disable");
                }

                cartBarManager.refresh();

                return false;

            }

        });

        $(document).on("click", ".js-linkButton", function(e){

            if( !$( e.target ).hasClass("js-linkButton") ){
                return false;
            }

            var href = $(e.target).data("href"),
                target = $(e.target).data("target");

            if( typeof target !== "undefined" ){
                window.open( href, target );
                return false;
            } else {
                location.href = href;
                return false;
            }

        });

      
    }

    this.appendToCartButtonList = function( outer )
    {
        var object = $(self.buildToShoppingPageButton());
        outer.find(".js-dropCartButton, .js-favoriteButton").remove();
        outer.prepend( object );
    }


    this.buildToShoppingPageButton = function()
    {
        var url = CarItemUrl.cart( self.shopId );
        return html = '<span class = "js-linkButton toCartButtonMini" data-href = "' + url + '" title = "カートの中身を確認します">カートを見る</span>';
    }


    this.addCookie = function( key, value )
    {

        self.deleteCookie(key, value);

        if( key === "star" ){
            self.stars.push( value );
            document.cookie = "star=" + self.stars.join( self.delimiter );
        }

        if( key === "cart" ){
            self.carts.push( value );
            document.cookie = "cart=" + self.carts.join( self.delimiter );
        }

    }


    this.deleteCookie = function( key, value )
    {
        
        if( key === "star" ){

            for( var i = 0; i < self.stars.length; i++ ){
                if( self.stars[ i ] === String( value ) ) self.stars.splice( i, 1 );
            }

            document.cookie = "star=" + self.stars.join( self.delimiter );

        }

        if( key === "cart" ){

            for( var i = 0; i < self.carts.length; i++ ){
                if( self.carts[ i ] === String( value ) ) self.carts.splice( i, 1 );
            }

            document.cookie = "cart=" + self.carts.join( self.delimiter );
        }
        
    }


    this.setAvailableIcon = function()
    {
        
        var bodyIds = ["body_top", "body_sub", "body_free"],
            res = false;

        if( !$("body").hasClass("js-unavailableCartIcon") ){

            for( var i = 0; i < bodyIds.length; i++ ){

                if( $("body").attr("id") === bodyIds[i] ){
                    var res = true;
                }
        
            }

        }

        self.availableIcon = res;

    }


    this.cleanShoppingCookie = function()
    {
        var should = true,
            targets = ["purchase-ids", "purchase-paymentWay"],
            pathname = location.pathname,
            availablePath = [
                "cart.html",
                "cart_info.html",
                "cart_check.html",
                "cart_thankyou.html",
                "cart.php",
                "cart_info.php",
                "cart_check.php",
                "cart_thankyou.php"
            ];

        for( var i = 0; i < availablePath.length; i++ ){

            if( pathname.indexOf( availablePath[i] ) != -1 ){
                should = false;
            }

        }

        if( should ){
            document.cookie = "purchase-ids=; max-age=0";
            document.cookie = "purchase-paymentWay=; max-age=0";
            document.cookie = "purchase-total=; max-age=0";
            document.cookie = "purchase-sumable=; max-age=0";
            document.cookie = "purchase-way=; max-age=0";
            document.cookie = "purchase-invoice-id=; max-age=0";
        }

    }


    this.onSale = function( itemId )
    {
        return self.isEcSite && self.model.available( itemId );
    }


    this.cleanAllCookie = function()
    {
        document.cookie = "cart=";
        document.cookie = "star=";
    }


    this.guessCart = function( callback )
    {
        if( self.carts.length < 1 ){
            callback();        }
    }


    this.existsCart = function()
    {
        return self.carts.length > 0;
    }

    this.existsFavorite = function()
    {
        return self.stars.length > 0;
    }


    this.__construct = function()
    { 
       
        self.isOpen = isOpen;
        
        self.shopId = shopId;

        self.smtParam = smtParam;

        self.isEcSite = isEcSite;

        self.model = model;


        // 違う店舗でのログインがあった => 他店舗のデータは消す
        self.cleanShoppingCookie();

        var tmp = CookieUtil.cookieToArray( document.cookie );

        if( tmp[ "currentShopId"] ){

            if( tmp["currentShopId"] !== self.shopId ){

                self.cleanAllCookie();

            }
            
        }

        // 現店舗IDをセット
        document.cookie = "currentShopId=" + self.shopId;

        if( tmp[ "star" ] ){
            self.stars = tmp["star"].split( self.delimiter );
        }

        if( tmp[ "cart" ] ){
            self.carts = tmp["cart"].split( self.delimiter );
        }

        // console.log(self.stars);

    }()

}






var CostUtil = function()
{

    var self = this;

    this._sum = function( datas )
    {

        var res = { cost : 0, totalCost : 0 };

        if( datas.length > 0 ){

            for( var i = 0; i < datas.length; i++ ){

                var data = datas[i],
                    cost = data.cost,
                    costStr = data.cost_str,
                    totalCost = data.totalcost,
                    totalCostStr = data.totalcost_str;

                var costStrParsed = CostUtil.parseIntCostString( costStr ),
                    totalCostStrParsed = CostUtil.parseIntCostString( totalCostStr );

                if( CostUtil.isCostString( costStrParsed ) ){
                    res.cost += Number( costStrParsed );
                }

                if( CostUtil.isCostString( totalCostStrParsed ) ){
                    res.totalCost += Number( totalCostStrParsed );
                }

            }
        
        }

        if( res.cost > 0 ) res.cost = CostUtil.fixCostUnit( res.cost );
        if( res.totalCost > 0 ) res.totalCost = CostUtil.fixCostUnit( res.totalCost );

        return res;

    }


    this.analyTotalCost = function( json, key )
    {

        var value  = key == "cost" ? json.cost : json.totalcost,
            string = key == "cost" ? json.cost_str : json.totalcost_str;

        var res = {
            input : value,
            inputStr : string,
            display : "",       // 表示用文字列
            displayUnit : "",   // 表示用文字列（単位換算）
            sumable : false,    // 合算可能？
            isString : false,
            value : 0
        }

        var totalCostStr = self.parseIntCostString( res.inputStr );


        // totalcost_str が数値
        if( self.isCostString( totalCostStr ) ){

            totalCostStr = self.removeComma( totalCostStr );

            res.display     = totalCostStr;
            res.displayUnit = self.fixCostUnit( totalCostStr ) + "円";
            res.sumable     = true;
            res.isString    = false;
            res.value       = totalCostStr;

        } else {

            totalCostStr = String( totalCostStr ).trim();

            // 数値じゃないけど、文字列が入ってる
            if( totalCostStr !== "" && totalCostStr !== "null" ){

                res.display     = totalCostStr;
                res.displayUnit = totalCostStr;
                res.sumable     = false;
                res.isString    = true;
                res.value       = 0;

            // 数値じゃなく、しかも空 => totalCost を確認
            } else {

                var totalCost = self.parseIntCostString( res.input );

                if( self.isCostString( totalCost ) ){

                    res.display     = totalCost;
                    res.displayUnit = self.fixCostUnit( totalCost ) + "円";
                    res.sumable     = true;
                    res.isString    = false;
                    res.value       = totalCost;

                // こっちも数値ちゃう
                } else {

                    totalCost = String( totalCost ).trim();

                    // 数値じゃないけど、文字列が入ってる
                    if( totalCost !== "" && totalCost !== "null" ){

                        res.display     = totalCost;
                        res.displayUnit = totalCost;
                        res.sumable     = false;
                        res.isString    = true;
                        res.value       = 0;

                    } else {

                        res.display     = "-";
                        res.displayUnit = "-";
                        res.sumable     = false;
                        res.isString    = true;
                        res.value       = 0;

                    }

                }

            }

        }

        return res;

    }


    this.fixCostUnit = function( rawCostString )
    {

        var cost = rawCostString * 10000;
        return Number( cost ).toLocaleString();
    }


    this.removeComma = function( string )
    {

        string = String(string); // 念のためキャスト

        return string.replace( ",", "" );

    }


    this.parseIntCostString = function( string )
    {

        if( string !== "" && string !== null ){
            
            var tmp = string.match(/支払総額\s\s(.*)/);

            if( tmp !== null ){
            
                // 単位万円    
                if (tmp[1].match(/万円\)$/)) {
                    return tmp[1].replace(/<("[^"]*"|'[^']*'|[^'">])*>/g,'').replace('万円', '').replace('(', '').replace(')', '');
                }

                // 単位円
                if (tmp[1].match(/円\)$/)) {
                    var reg = new RegExp(",","g");
                    var tmpNum = tmp[1].replace(/<("[^"]*"|'[^']*'|[^'">])*>/g,'').replace(reg,'').replace('円', '').replace('(', '').replace(')', '');
                    if(!CostUtil.isCostString(tmpNum)) return 0;
                    return tmpNum / 10000;
                }
                return tmp[1].replace(/<("[^"]*"|'[^']*'|[^'">])*>/g,'').replace('万円', '').replace('(', '').replace(')', '');
           
            } else {
            
                // 単位万円
                if (string.match(/万円$/)) {
                    return string.replace(/<("[^"]*"|'[^']*'|[^'">])*>/g,'').replace('万円', '');
                }

                // 単位円
                if (string.match(/円$/)) {
                    var reg = new RegExp(",","g");
                    var tmpNum = string.replace(/<("[^"]*"|'[^']*'|[^'">])*>/g,'').replace(reg,'').replace('円', '');
                    if(!CostUtil.isCostString(tmpNum)) return 0;
                    return tmpNum / 10000;
                }

                return string.replace(/<("[^"]*"|'[^']*'|[^'">])*>/g,'').replace('万円', '');

            }
        
        } else {

            return string;

        }

        return 0;

    }


    this._buildCostString = function( json, key, unit )
    {


        switch( key ){

            case "cost":
                var value = Number( json.cost ),
                    string = json.cost_str.trim();
            break;

            case "totalCost":
                var value = Number( json.totalcost ),
                    string = json.totalcost_str.trim();
            break;

        }


        if( value === 0 ){

            if( string !== "" ){

                var tmp = string.match(/\(支払総額\s\s(.*)/);

                if( tmp !== null ){
                    return tmp[1].replace(/<("[^"]*"|'[^']*'|[^'">])*>/g,'');
                }
                    
                return string.replace(/<("[^"]*"|'[^']*'|[^'">])*>/g,'');
                    
            } else {

                return "-";
                    
            }

        } else {

            return String( self.fixCostUnit( value ) ) + unit;

        }

    }


    this.isCostString = function( string )
    {

        string = self.removeComma( string );

        var pattern = /^[0-9０-９\.]+$/;
        return String( string ).match( pattern ) !== null;
    }


    this.__construct = function(){}();

}


/**
 * カートの中身ページ
 * @param {[type]} shoppingActionInstance [description]
 * @param {[type]} carListJsonPublic      [description]
 */
var ShowCartAction = function( shoppingActionInstance, carListJsonPublic )
{

    var self = this;

    this.isOpen;
    this.shopId;

    this.buildComment = function( data )
    {

        if( data.comments === null ){

            if( data.comments_body === null ){
                
                return "コメントはまだありません";

            } else {

                return String( data.comments_body );

            }

        } else {

            if( data.comments_body === null ){

                return String( data.comments );

            } else {

                return String( data.comments ) + "\n" + String( data.comments_body );
            }

        }

    }


    this.buildItemName = function( data )
    {
        return typeof data.item_id == "undefined" || data.item_id === "1" ? data.name : data.item_name;
    }

    this.findPictSrc = function( data )
    {

        if( typeof data.thumbFullPath.none !== "undefined" ){
            
            return data.thumbFullPath.none;
        
        } else {

            return self.isOpen ? data.thumbFullPath.open : data.thumbFullPath.edit;

        }
    }

    this.buildCartListHtml = function ( data, useActionButton )
    {

        var itemId = data.id,
            name = data.name,
            comment = self.buildComment( data ),
            cost = data.cost,
            costString = data.cost_str,
            totalCost = data.totalcost,
            totalCostString = data.totalcost_str,
            pictsrc = self.findPictSrc(data);

        var costInfo = CostUtil.analyTotalCost(data, "cost"),
            totalCostInfo = CostUtil.analyTotalCost(data, "totalCost");

        comment = htmlspecialchars_decode(comment, "ENT_QUOTES").replace(/<("[^"]*"|'[^']*'|[^'">])*>/g,'');
        
        var html = '<div class = "cartList clearfix" data-item-id = "' + itemId + '">';
            html += '<a href = "'+ CarItemUrl.detail( itemId ) +'" target = "_blank" title = "この商品の詳細を確認します（別ウインドウ）">';
            html += '<img src = "' + pictsrc + '">';
            html += '</a>';
            html += '<div class = "about">';
            html += '<p class = "itemName">';
            html += '<a href = "'+ CarItemUrl.detail( itemId ) +'" target = "_blank" title = "この商品の詳細を確認します（別ウインドウ）">';
            html += self.buildItemName( data );
            html += '</a>';
            html += '</p>';
            html += '<p class = "itemCost"><span class = "key">価格</span><span>' + costInfo.displayUnit + '</span></p>';
            html += '<p class = "itemTotalCost"><span class = "key">お支払い総額</span><span>' + totalCostInfo.displayUnit + '</span></p>';
            html += '<p class = "itemComments"><span class = "key">コメント</span>' + comment.replace(/<("[^"]*"|'[^']*'|[^'">])*>/g,'') + '</p>';
            html += '</div>';

            html += '<div class = "clearfix"></div>';

            if( useActionButton ){
                html += '<div class = "actionButtonOuter tar"><div class = "js-deleteCartButton deleteCartButton" data-item-id = "'+ itemId+'">削除</div></div>';
            }

            html += '</div>';
        return html;

    }


    this.buildFavoriteListHtml = function(data, useActionButton)
    {
        var itemId = data.id,
            name = data.name,
            comment = self.buildComment( data ),
            cost = data.cost,
            totalCost = data.totalCost,
            pictsrc = self.findPictSrc( data );

        var isInCart = self.shoppingActionInstance.has( "cart", itemId );


        var costInfo = CostUtil.analyTotalCost(data, "cost"),
            totalCostInfo = CostUtil.analyTotalCost(data, "totalCost");

        comment = htmlspecialchars_decode(comment, "ENT_QUOTES").replace(/<("[^"]*"|'[^']*'|[^'">])*>/g,'');
        
        var html = '<div class = "cartList clearfix">';
            html += '<a href = "'+ CarItemUrl.detail( itemId ) +'" target = "_blank" title = "この商品の詳細を確認します（別ウインドウ）">';
            html += '<img src = "' + pictsrc + '">';
            html += '</a>';
            html+= '<div class = "about">';
            html+= '<p class = "itemName">';
            html += '<a href = "'+ CarItemUrl.detail( itemId ) +'" target = "_blank" title = "この商品の詳細を確認します（別ウインドウ）">';
            html += self.buildItemName( data );
            html += '</a>';
            html += '</p>';
            html += '<p class = "itemCost"><span class = "key">価格</span><span>' + costInfo.displayUnit + '</span></p>';
            html += '<p class = "itemTotalCost"><span class = "key">お支払い総額</span><span>' + totalCostInfo.displayUnit + '</span></p>';
            html+= '<p class = "itemComments"><span class = "key">コメント</span>' + comment.replace(/<("[^"]*"|'[^']*'|[^'">])*>/g,'') + '</p>';
            html+= '</div>';

            html += '<div class = "clearfix"></div>';

            if( useActionButton ){

                html += '<div class = "actionButtonOuter tar">';

                if( !isInCart ){
                    html += '<div class = "js-moveCartButton moveCartButton" data-item-id = "'+ itemId+'">カートに移動する</div>';
                }

                html += '<div class = "js-deleteStarButton deleteCartButton" data-item-id = "'+ itemId+'">削除</div>';

                html += "</div>";

            }

            html += '</div>';

        return html;

    }


    this.renderTitles = function()
    {
        var carts = self.shoppingActionInstance.carts,
            stars = self.shoppingActionInstance.stars;

        cartTitle = "カートの中に入っている商品";
        favoriteTitle = "気になるリストに入っている商品";

        if( carts.length > 0 ) cartTitle += "（" + carts.length + "）";
        if( stars.length > 0 ) favoriteTitle += "（" + stars.length + "）";

        $(".js-cartListTitleInner").text( cartTitle );

        $(".js-favoriteListTitleInner").text( favoriteTitle );

    }


    this.renderCart = function( useActionButton, callback )
    {
        var carts = self.shoppingActionInstance.carts,
            html = "";

        
        for( var i = carts.length - 1; i >= 0; i-- ){

            var id = carts[i];

            html += self.buildCartListHtml( self.shoppingActionInstance.model.find( id ), useActionButton );
        
        }

        // ガクガクして見えるんであえてdelayさせる。
        setTimeout(function(){

            $(".js-cartListOuter").addClass("js-loaded").empty().append(html);
        
        }, 500);

    }

    this.renderFavorite = function( useActionButton )
    {
        var stars = self.shoppingActionInstance.stars,
            html = "";


        for( var i = stars.length - 1; i >= 0; i-- ){
            var id = stars[i];
            html += self.buildFavoriteListHtml( self.shoppingActionInstance.model.find( id ), useActionButton );
        }

        // ガクガクして見えるんであえてdelayさせる。
        setTimeout(function(){
            $(".js-favoriteListOuter").addClass("js-loaded").empty().append(html);
        }, 1000);
        

    }


    this.buildListHtml = function( ids )
    {

        var html = "";

        for( var i = 0; i < ids.length; i++ ){
            
            var id = ids[i];

            html += self.buildCartListHtml( self.shoppingActionInstance.model.find( id ), false );

        }

        return html;
    }



    this.bind = function( isThankyouPage )
    {

        $(document).on("click", ".js-deleteCartButton", function(){

            if( window.confirm( "この商品をカートから削除してよろしいですか？" ) ){

                var itemId = String( $(this).data("itemId") ),
                    thisObject = $(this);

                self.shoppingActionInstance.deleteCookie("cart", itemId);

                thisObject.closest(".cartList").remove();
                
                self.renderTitles();
                
                self.renderCart( true, null );

                if( self.shoppingActionInstance.carts.length === 0 ){
                    $("#js-toCartInfoButton").hide();
                }
            }

        });


        $(document).on("click", ".js-moveCartButton", function(){

            if( window.confirm( "この商品をカートに移動させてよろしいですか？" ) ){

                var itemId = String( $(this).data("itemId") ),
                    thisObject = $(this);

                self.shoppingActionInstance.deleteCookie("star", itemId);
                self.shoppingActionInstance.addCookie("cart", itemId);

                if( !isThankyouPage ){

                    $("html, body").animate({"scrollTop" : 0}, 500);

                    self.renderTitles();

                    if( self.shoppingActionInstance.carts.length > 0 ){
                        $("#js-toCartInfoButton").show();
                    }

                    self.renderCart( true, function(){
                    } );

                }

                self.renderFavorite( true );

                if( isThankyouPage ){
                    shoppingActionInstance.renderCartIcon( self.shoppingActionInstance.carts.length );
                }

            }

        });


        $(document).on("click", ".js-deleteStarButton", function(){

            if( window.confirm( "この商品を「気になる」リストから削除してよろしいですか？" ) ){

                var itemId = String( $(this).data("itemId") ),
                    thisObject = $(this);

                self.shoppingActionInstance.deleteCookie("star", itemId);

                self.renderTitles();
                self.renderFavorite( true );

            }
        });

    }


    this.checkrun = function()
    {
        self.renderCart( false, null );
    }



    this.run = function()
    {

        self.bind(false);
        self.renderTitles();
        self.renderCart( true, null );
        self.renderFavorite( true );
        self.shoppingActionInstance.setTotalCost();
    }


    this.construct = function()
    {
        self.shoppingActionInstance = shoppingActionInstance;
        self.isOpen = self.shoppingActionInstance.isOpen;
        self.shopId = self.shoppingActionInstance.shopId;
    }()

}


var ValidatePurchaseInfo = function()
{

    this.isValid = function()
    {
        var res = true;
        
        $(".baloon").each(function(){

            if( $(this).css("display") !== "none" ){
                res = false;
            }    
        })

        return res;
    }

    this.construct = function()
    {
        $(".js-purchaseInput.js-must").trigger("blur");
    }()

}


var CheckPurchaseInfoAction = function()
{

    var self = this;

    this.delimiter = "--";

    this.setPurchaseInfo = function()
    {

        var def = $.Deferred();

        var array = [];

        $(".js-purchaseInput").each(function( index ){

            var key = $(this).attr("name"),
                val = $(this).val(),
                type = $(this).attr("type");

            val = escape(val);

            if( type === "radio" ){

                if( $(this).prop("checked") ) array.push( key + ":" + val );

            } else if( type === "select" ){

                array.push( key + ":" + val );

            } else {

                if( val != "" ) array.push( key + ":" + val );

            }

            if( index == $(".js-purchaseInput").length - 1 ){
                var value = array.join(self.delimiter);
                document.cookie = "purchase=" + value;
                def.resolve();
            }
        
        });

        return def.promise();

        // フラグ
        
    
    }

    this.getBalloonOffset = function()
    {
        var offset = 0;

        $(".baloon").each(function(){

            if( $(this).css("display") !== "none" ){
                
                if( $(this).offset().top < offset ) offset = $(this).offset().top
            }

        });

        return offset;

    }

    this.getSelectedPaymentWay = function()
    {

        return $("input[name = 'paymentWay']:checked").val();

    }

    this.bind = function()
    {

        $("input[name='paymentWay']").change(function(){

            var value = $(this).attr("value");

            $(".aboutPaymentOuter[data-about-id !='"+value+"']").slideUp(150);
            $(".aboutPaymentOuter[data-about-id='"+value+"']").slideDown(150);

        })

        $("#js-completeEnterPurchaseInfo").click(function(e){

            e.preventDefault();

            if( $(e.target).hasClass("inplace_normal") ) return;

            var validator = new ValidatePurchaseInfo();

            if( validator.isValid() ){

                self.setPurchaseInfo().done(function(){
                    console.log("resolve");
                    CarItemUrl.redirect("cartCheck");
                });

            } else {

                $("html, body").animate({"scrollTop" : 0}, 500);

            }

        });

        $("#amazonPayButton").click(function(e){

            e.preventDefault();

            var validator = new ValidatePurchaseInfo();

            if( validator.isValid() ){

                self.setPurchaseInfo().done(function(){
                    console.log("resolve");
                });

            } else {

                $("html, body").animate({"scrollTop" : 0}, 500);

            }

        });

        $("#js-purchaseForm").submit(function(e){
            self.setPurchaseCookie();
        })

    }

    this.setPurchaseCookie = function()
    {

        var idString = $("input[name=cart]").val();

        if( idString !== "" ){

            var ids = idString.split( self.delimiter );
            var paymentWay = $("input[name=_paymentWay]").val();

            document.cookie = "purchase-way=" + paymentWay;
            document.cookie = "purchase-ids=" + idString;

        }

    }


    this.run = function()
    {
        self.bind();
    }


    this.getCookieValue = function()
    {

        var array = CookieUtil.cookieToArray( document.cookie ),
            objects = [];

        if( array["purchase"] ){

            var tmp = array["purchase"].split( self.delimiter );

            for( var i = 0; i < tmp.length; i++ ){

                var tmp2 = tmp[i].split(":"),
                    key  = tmp2[0],
                    value= unescape( tmp2[1] );

                objects[ key ] = value;
            
            }

        }

        if( array["cart"] ){
            objects["cart"] = array["cart"];
        }

        return objects;
    
    }

    this.set = function( readonly )
    {
        
        var objects = self.getCookieValue();

        if( objects ){

            if( typeof objects["comments"] === "undefined" && readonly ){
                // $(".js-purchaseInput[name='comments']").closest(".block_outer").remove();
            }

            for( var key in objects ){

                if( key !== "cart" ){

                    var value = objects[ key ];

                    var target = $(".js-purchaseInput[name='" + key + "']");

                    if( target.attr("name") === "paymentWay" ){

                        $(".aboutPaymentOuter[data-about-id='"+ value +"']").css({"display" : "block"});
                        
                        target.each(function(){

                            if( $(this).val() === value ){
                                $(this).attr("checked", "checked");
                            }
                        });

                        $("input[name='_paymentWay']").val( value );

                    } else if( target.attr("name") === "deliveryTimes" ){

                        target.val( value );

                        $("input[name='_deliveryTimes']").val( value );

                    } else {

                        target.val( value );

                    }

                } else {

                    $("input[name='cart']").val( objects[key] );

                }
            
            }

        }

    }

    this.isSingleItem = function( cookieValue )
    {

        return cookieValue.indexOf('--') === -1;

    }


    this.construct = function()
    {
        //alert(document.cookie);
    }()

}



var ShoppingThankyouAction = function( shoppingActionInstance, showCartActionInstance )
{

    var self = this;

    this.cost = "";
    this.totalCost = "";
    this.paymentWay = "";

    this.delimiter = "--";


    this.showPaymentWay = function()
    {
        // 支払い方法の確定
        $(".js-aboutPayment").each(function(){
            if( self.paymentWay === $(this).data("paymentWay") ){
                $(this).css("display", "block");
            }
        });
    }

    this.findPaymentWay = function()
    {

        return self.paymentWay;

    }


    this.findCost = function()
    {

        return shoppingActionInstance.findTotalCost();

    }


    this.showCost = function()
    {

        var total = self.findCost();

        if( total.total == "-" ){

            $("#js-totalCost").text( "-" );

        } else {

            $("#js-totalCost").text( CostUtil.fixCostUnit( total.total ) );

        }

        if( total.sumable === "0" ){
            $("#js-totalCostAbout").addClass("show");
        }

    }


    this.showPurchasedItem = function()
    {
        if( typeof self.idString !== "undefined" ){
            var ids = self.idString.split( self.delimiter );
            var html = self.showCartActionInstance.buildListHtml( ids );
            $(".js-cartListOuter").append(html);
        } else {

            $(".js-cartListOuter ").addClass("js-loaded");
        }
    }


    this.showFavoriteItem = function()
    {

        if( typeof self.favorite !== "undefined" && self.favorite !== "" ){

            var ids = self.favorite.split( self.delimiter ),
                html = "";
            
            if( ids.length > 0 ){

                for( var i = 0; i < ids.length; i++ ){

                    id = ids[i];

                    html += self.showCartActionInstance.buildFavoriteListHtml( self.shoppingActionInstance.model.find( id ), 1 );

                }

                var html = $(html);

                html.find(".js-deleteStarButton").remove();

                $(".js-favoriteListOuter").append(html);

                self.showCartActionInstance.bind( true );

            } else {

                $(".js-favoriteListOuter").closest(".block_outer").remove();

            }

        } else {

            $(".js-favoriteListOuter").closest(".block_outer").remove();

        }

    }

    this.clearCart = function()
    {
        shoppingActionInstance.carts = [];
        document.cookie = "cart=";
    }


    this.showInvoice = function()
    {
        var url = self.invoiceController.buildUrl();
    }

    this.toggleInvoice = function( status )
    {
        $("#js-invoiceContentOuter").attr("data-invoice-status", status);
    }

    this.setInvoice = function()
    {

        if( isOpen ){

            var href = "./files/" + self.invoiceId + ".pdf";

        } else {

            var href = "../__tmp/" + self.invoiceId + ".pdf";

        }

        $("#js-invoiceLink").attr("href", href);

    }


    this.run = function()
    {

        // 支払い方法表示
        self.showPaymentWay();

        // 金額表示
        self.showCost();

        // 購入物品表示
        self.showPurchasedItem();

        // 気になるリスト表示
        self.showFavoriteItem();

        // カートの中身を空にする
        self.clearCart();

        if( self.invoiceController.useable() ){

            if( self.invoiceController.created() ){

                self.setInvoice();

                self.toggleInvoice("loaded");

            } else {

                self.toggleInvoice("loading");

                self.invoiceController.create().done(function(dataSet){

                    self.invoiceId = dataSet.invoiceId;

                    document.cookie = "purchase-invoice-id=" + dataSet.invoiceId;

                    self.setInvoice();

                    self.toggleInvoice("loaded");

                });

            }

        } else {

            self.toggleInvoice("noneed");

        }


    }


    this.__construct = function()
    {

        self.shoppingActionInstance = shoppingActionInstance;
        self.showCartActionInstance = showCartActionInstance;

        document.cookie = "purchase=";
    
        var cookies = CookieUtil.cookieToArray( document.cookie );
        
        self.idString = cookies["purchase-ids"];
        
        self.paymentWay = cookies["purchase-way"];

        self.favorite = cookies["star"];

        self.sumable = cookies["purchase-sumable"];

        self.total = cookies["purchase-total"];

        self.shopId = cookies["currentShopId"];

        self.invoiceId = cookies["purchase-invoice-id"];

        self.invoiceController = new CartInvoiceController(
            self.shopId,
            self.invoiceId,
            self.sumable,
            self.total,
            self.idString
        );

    }();


}




var CartInvoiceController = function( shopId, invoiceId, sumable, total, idString )
{

   var self = this;


    this.useable = function()
    {
        return String( self.sumable ) === "1";
    }


    this.buildRequestUrl = function()
    {
        if( typeof conversionRoot !== "undefined" ){
            return conversionRoot + 'create_cart_invoice.php';
        } else {
            return "../__conv/create_cart_invoice.php";
        }
    }


    this.create = function()
    {

        var def = $.Deferred();

        $.ajax({
            url : self.buildRequestUrl(),
            data : {
                sid : self.shopId,
                total : total,
                idstring : self.idString,
                isOpen : Number( isOpen )
            },
            type : "post",
            dataType : "json",
            success : function( dataSet ){
                self.invoiceId = dataSet.invoiceId;
                def.resolve( dataSet )
            },
            error : function( jqXHR, errorThrown, textStatus ){
                def.reject( jqXHR, errorThrown, textStatus )
            }
        });

        return def.promise();

   }


   this.created = function()
   {
        return typeof self.invoiceId !== "undefined" && self.invoiceId !== null;
   }


   this.__construct = function()
   {
        self.shopId = shopId;
        self.invoiceId = invoiceId;
        self.sumable = sumable;
        self.total = total;
        self.idString = idString;
   }()

}




var CartBarManager = function( shopId, isOpen, smtParam, onSale, isItemPage, itemId )
{

    var self = this;

    this.shopId;
    this.isOpen;
    this.smtParam;
    this.onSale;
    this.isItemPage;
    this.itemId;

    this.isEmpty = false;
    this.startedSale = false;

    this.objects = {
        outer : null,
        aboutText : null,
        cartButton : null,
        favoriteButton : null,
        cartIcon : null,
        favoriteIcon : null
    }

    this.exists = {
        outer : false,
        aboutText : false,
        cartButton : false,
        favoriteButton : false,
        cartIcon : false,
        favoriteIcon : false,
    }


    this.setObject = function()
    {
        this.objects.outer = $("#js-cartActionOuter");
        this.objects.aboutText = $("#js-aboutCartIcon");
        this.objects.cartButton = $("#js-cartButton");
        this.objects.favoriteButton = $("#js-favoriteButton");
        this.objects.cartIcon = $("#js-cartIcon");
        this.objects.favoriteIcon = $("#js-favoriteIcon");
        this.objects.cartCounter = $("#js-cartCounter");
        this.objects.favoriteCounter = $("#js-favoriteCounter");
    }


    this.refreshCartCounter = function()
    {
        self.objects.cartCounter.text( shoppingActionInstance.carts.length );
    }

    this.refreshFavoriteCounter = function()
    {
        self.objects.favoriteCounter.text( shoppingActionInstance.stars.length );
    }


    this.showCartButton = function()
    {
        return self.isItemPage && self.onSale && ( shoppingActionInstance.model.available( self.itemId ) || self.startedSale  );
    }

    this.showFavoriteButton = function()
    {
        return self.isItemPage && 
               self.onSale &&
               ( shoppingActionInstance.model.available( self.itemId ) || self.startedSale ) &&
               !shoppingActionInstance.has( "cart", self.itemId );
    }

    this.showCartIcon = function()
    {
        return shoppingActionInstance.existsCart();
    }

    this.showFavoriteIcon = function()
    {
        return shoppingActionInstance.existsFavorite();
    }


    this.resetClasses = function()
    {
        self.objects.outer.removeClass("js-hidden");
        self.objects.cartButton.removeClass("js-hidden");
        self.objects.favoriteButton.removeClass("js-hidden");
        self.objects.cartIcon.removeClass("js-hidden");
        self.objects.favoriteIcon.removeClass("js-hidden");
        self.objects.outer.removeClass("js-empty");
        self.objects.cartButton.removeClass("js-carted");
        self.objects.favoriteButton.removeClass("js-disabled");
        self.objects.cartIcon.removeClass("hi-icon_inifite");
        self.objects.favoriteButton.removeClass("js-favorited");
    }


    this.fixString = function()
    {

        if( self.exists.cartButton && shoppingActionInstance.has( "cart", itemId ) ){
            self.objects.cartButton.text("登録済").attr("title", "この商品は既にカートに登録済です")
        }

        if( self.exists.favoriteButton && shoppingActionInstance.has( "star", itemId ) ){
            self.objects.favoriteButton.text("登録済").attr("title", "この商品は「気になるリスト」に登録済です");
        }

    }


    this.setClasses = function()
    {

        $(".triggerItem").removeClass("js-lastTriggerItem");

        if( !self.onSale ){
            self.objects.outer.addClass("js-hidden");
        }

        if( !self.exists.cartButton ){
            self.objects.cartButton.addClass("js-hidden");
        }

        if( !self.exists.favoriteButton ){
            self.objects.favoriteButton.addClass("js-hidden");
        }

        if( !self.exists.cartIcon ){
            self.objects.cartIcon.addClass("js-hidden");
        }

        if( !self.exists.favoriteIcon ){
            self.objects.favoriteIcon.addClass("js-hidden");
        }

        if( self.isEmpty ){
            self.objects.outer.addClass("js-empty");
        }


        if( self.onSale ){

            var added = false;

            if( self.exists.cartButton ){

                var itemId = String( $("#js-cartButton").data("itemId") );

                if( shoppingActionInstance.has( "cart", itemId ) ){

                    added = true;

                    self.objects.cartButton.addClass("js-carted");

                    self.objects.favoriteButton.addClass("js-disabled");

                    self.objects.cartIcon.addClass("hi-icon_inifite")

                }

            }

            if( !added && self.exists.favoriteIcon ){

                var itemId = String( $("#js-cartButton").data("itemId") );

                if( shoppingActionInstance.has( "star", itemId ) ){

                    self.objects.favoriteButton.addClass("js-favorited");

                }

            }

        }

        self.objects.outer.find(".triggerItem").not(".js-hidden").last().addClass("js-lastTriggerItem");

    }


    this.setExists = function()
    {

        self.exists.outer = self.onSale;

        self.exists.aboutText = true;

        self.exists.cartButton = self.showCartButton();
        
        self.exists.favoriteButton = self.showFavoriteButton();
        
        self.exists.cartIcon = self.showCartIcon();
        
        self.exists.favoriteIcon = self.showFavoriteIcon();

        self.isEmpty =  self.exists.outer &&
                        !self.exists.cartButton &&
                        !self.exists.favoriteButton &&
                        !self.exists.cartIcon &&
                        !self.exists.favoriteIcon;

    }


    this.refresh = function( initialize )
    {

        if( !initialize ) self.resetClasses();

        self.setExists();

        self.setObject();

        self.setClasses();

        self.fixString();


        if( self.exists.cartIcon ) self.refreshCartCounter();

        if( self.exists.favoriteIcon ) self.refreshFavoriteCounter();


        if( initialize ){
            self.objects.outer.addClass("js-ready");
        }

        if( self.exists.cartIcon || 
            self.exists.favoriteIcon || 
            self.exists.cartButton || 
            self.exists.favoriteButton ){
            $("body").attr("data-shopping", "1");
        }

        if( !self.isEmpty ){

            setTimeout(function(){
                self.objects.outer.addClass("js-animated");
            }, 1000);
        
        }

    }


    this.bind = function()
    {

        $(document).on("click", "#js-saleStartButton", function(){

            var data = shoppingActionInstance.model.find( self.itemId ),
                url = "";

            url += "/cms/usedcar/ajax_change_status.php?";
            url += data.paramsStr;
            url += "&mode=sale_on";

            // 販売開始
            self.startedSale = true;

            self.refresh()

            $.ajax({
                async : false,
                tyoe : "GET",
                url : url,
                dataType : "json",
                success : function(res)
                {

                }

            })

        })
    }


    this.__construct = function()
    {
        self.shopId = shopId;
        self.isOpen = isOpen;
        self.smtParam = smtParam;
        self.onSale = onSale;
        self.isItemPage = isItemPage;
        self.itemId = itemId;
    }()

}



var CreditCardController = function( shoppingActionInstance, dataSetString )
{


    var self = this;

    this.paymentableCost = {
        min : 0.1, // 1000円
        max : 100　// 100,000円
    };

    this.__construct = function()
    {

        self.shoppingActionInstance = shoppingActionInstance;

        self.dataSetString = dataSetString;

        if( self.dataSetString !== "" ){
            self.dataSet = JSON.parse( self.dataSetString );
        }

    }()


    this.isRangedPaymantableCost = function( cost )
    {
        return cost >= self.paymentableCost.min && cost <= self.paymentableCost.max;
    }


    this.usePayment = function( cookieDataSet )
    {
        return cookieDataSet.paymentWay === "card";
    }


    this.replaceFormHtml = function( submitObject, useCreditCardFormObject )
    {
        submitObject.attr("value", "決済ページへ進む");
        useCreditCardFormObject.attr("value", "1");
    }


    this.useable = function()
    {

        if( self.dataSet.useCreditCardPayment ){

            var tmp = self.shoppingActionInstance.calcTotalCost();

            if( tmp.sumable && self.isRangedPaymantableCost( tmp.sum ) ){

                return true;

            }

        }

        return false;

    }


}



var AmazonPayController = function( shoppingActionInstance, dataSetString )
{


    var self = this;

    this.paymentableCost = {
        min : 0.1, // 1000円
        max : 100　// 100,000円
    };

    this.__construct = function()
    {

        self.shoppingActionInstance = shoppingActionInstance;

        self.dataSetString = dataSetString;

        if( self.dataSetString !== "" ){
            self.dataSet = JSON.parse( self.dataSetString );
        }

    }()


    this.isRangedPaymantableCost = function( cost )
    {
        return cost >= self.paymentableCost.min && cost <= self.paymentableCost.max;
    }


    this.totalCost = function()
    {

        return self.shoppingActionInstance.calcTotalCost();

    }


    this.usePayment = function( cookieDataSet )
    {
        console.log(cookieDataSet);
        return cookieDataSet.paymentWay === "amazonPay";
    }

    this.selectAmazonPay = function( selectValue )
    {
        return selectValue === "amazonPay";
    }

    this.replaceButtonHtml = function( showObject, hiddenObject )
    {

        showObject.show();
        hiddenObject.hide();

    }


    this.replaceFormHtml = function( submitObject, useAmazonPayFormObject )
    {
        submitObject.attr("value", "購入する");
        useAmazonPayFormObject.attr("value", "1");
    }


    this.useable = function()
    {

        if( self.dataSet.useAmazonPay ){

            var tmp = self.shoppingActionInstance.calcTotalCost();

            if( tmp.sumable && self.isRangedPaymantableCost( tmp.sum ) ){

                return true;

            }

        }

        return false;

    }


}


var PaypayController = function( shoppingActionInstance, dataSetString )
{


    var self = this;

    this.paymentableCost = {
        min : 0.0001, // 1円
        max : 10 // 100,000円
    };

    this.__construct = function()
    {

        self.shoppingActionInstance = shoppingActionInstance;

        self.dataSetString = dataSetString;

        if( self.dataSetString !== "" ){
            self.dataSet = JSON.parse( self.dataSetString );
        }

    }()


    this.isRangedPaymantableCost = function( cost )
    {
        return cost >= self.paymentableCost.min && cost <= self.paymentableCost.max;
    }

    this.totalCost = function()
    {
        return self.shoppingActionInstance.calcTotalCost();
    }

    this.usePayment = function( cookieDataSet )
    {
        console.log(cookieDataSet);
        return cookieDataSet.paymentWay === "paypay";
    }

    this.selectPaypay = function( selectValue )
    {
        return selectValue === "paypay";
    }


    this.useable = function()
    {

        if( self.dataSet.usePaypay ){

            var tmp = self.shoppingActionInstance.calcTotalCost();

            if( tmp.sumable && self.isRangedPaymantableCost( tmp.sum ) ){

                return true;

            }

        }

        return false;

    }


}


var OricoController = function()
{

    var self = this;


    this.replaceThankyouText = function()
    {

        var finishShoppingComment = $(".finishShoppingComment");
        var cartListTitle = $(".js-cartListTitle");
        var aboutPaymentWayOuter = $(".aboutPaymentWayOuter");

        finishShoppingComment.text("仮審査お申込みが完了しました。");
        cartListTitle.text("お申込みの車両");
        aboutPaymentWayOuter.hide();

    }


    this.usePayment = function( cookieDataSet )
    {
        return cookieDataSet.paymentWay === "orico";
    }


    this.__construct = function()
    {
    }()

}


function htmlspecialchars_decode(string, quote_style) {
  //       discuss at: http://phpjs.org/functions/htmlspecialchars_decode/
  //      original by: Mirek Slugen
  //      improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  //      bugfixed by: Mateusz "loonquawl" Zalega
  //      bugfixed by: Onno Marsman
  //      bugfixed by: Brett Zamir (http://brett-zamir.me)
  //      bugfixed by: Brett Zamir (http://brett-zamir.me)
  //         input by: ReverseSyntax
  //         input by: Slawomir Kaniecki
  //         input by: Scott Cariss
  //         input by: Francois
  //         input by: Ratheous
  //         input by: Mailfaker (http://www.weedem.fr/)
  //       revised by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // reimplemented by: Brett Zamir (http://brett-zamir.me)
  //        example 1: htmlspecialchars_decode("<p>this -&gt; &quot;</p>", 'ENT_NOQUOTES');
  //        returns 1: '<p>this -> &quot;</p>'
  //        example 2: htmlspecialchars_decode("&amp;quot;");
  //        returns 2: '&quot;'

  var optTemp = 0,
    i = 0,
    noquotes = false;
  if (typeof quote_style === 'undefined') {
    quote_style = 2;
  }

  if( typeof string === "undefined" ) return "";
  
  string = string.toString()
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
  var OPTS = {
    'ENT_NOQUOTES': 0,
    'ENT_HTML_QUOTE_SINGLE': 1,
    'ENT_HTML_QUOTE_DOUBLE': 2,
    'ENT_COMPAT': 2,
    'ENT_QUOTES': 3,
    'ENT_IGNORE': 4
  };
  if (quote_style === 0) {
    noquotes = true;
  }
  if (typeof quote_style !== 'number') {
    // Allow for a single string or an array of string flags
    quote_style = [].concat(quote_style);
    for (i = 0; i < quote_style.length; i++) {
      // Resolve string input to bitwise e.g. 'PATHINFO_EXTENSION' becomes 4
      if (OPTS[quote_style[i]] === 0) {
        noquotes = true;
      } else if (OPTS[quote_style[i]]) {
        optTemp = optTemp | OPTS[quote_style[i]];
      }
    }
    quote_style = optTemp;
  }
  if (quote_style & OPTS.ENT_HTML_QUOTE_SINGLE) {
    string = string.replace(/&#0*39;/g, "'"); // PHP doesn't currently escape if more than one 0, but it should
    // string = string.replace(/&apos;|&#x0*27;/g, "'"); // This would also be useful here, but not a part of PHP
  }
  if (!noquotes) {
    string = string.replace(/&quot;/g, '"');
  }
  // Put this in last place to avoid escape being double-decoded
  string = string.replace(/&amp;/g, '&');

  return string;
}

/**
* 2022-06-08 kitagawa
*
* 営業日カレンダー改修 JSで生成する形に
*/


var EigyoubiCalender = function( closeDateJson )
{

  var self = this;

  this.openPageFlag = edit_param === "0";
  this.closeDateJson = closeDateJson;

  // イベントバインド
  this.bind = function()
  {

    // 前月クリック
    $(document).on("click", ".js-prevMonth", function(){

      var updateYearStr = false;

      if( self.month === 1 ){

        self.year = self.year - 1;
        self.month = 12;
        updateYearStr = true;


      } else {

        self.month = self.month - 1;

      }

      self.view( self.year, self.month );
      self.updateDataAttr();
      self.checkDisable();

      if( updateYearStr ) self.updateYearStr();

    });

    // 翌月クリック
    $(document).on("click", ".js-nextMonth", function(){

      var updateYearStr = false;

      if( self.month === 12 ){

        self.year = self.year + 1;
        self.month = 1;
        updateYearStr = true;

      } else {

        self.month = self.month + 1;

      }

      self.view( self.year, self.month );
      self.updateDataAttr();
      self.checkDisable();

      if( updateYearStr ) self.updateYearStr();

    });

    // ホバー時装飾
    $(document).on("mouseenter", "#edittable01 .validDateStr, #edittable02 .validDateStr, #edittable01 .weekTh, #edittable02 .weekTh", function(){

      $(this).addClass('calender_onmouse');

    });

    $(document).on("mouseleave", "#edittable01 .validDateStr, #edittable02 .validDateStr, #edittable01 .weekTh, #edittable02 .weekTh", function(){

      $(this).removeClass('calender_onmouse');

    });

  }

  this.checkDisable = function()
  {

    // 基本はremoveClass
    $(".js-prevMonth").removeClass("disabled");
    $(".js-nextMonth").removeClass("disabled");


    // 必要ならaddClass
    if( self.year === self.startYear ){

      if( self.month === 1 ){

        $(".js-prevMonth").addClass("disabled");

      } else {

        // 何もしない

      }

    } else {

      // 何もしない

    }

    if( self.year === self.endYear ){

      if( self.month === (12 - self.calenderNum + 1) ){

        $(".js-nextMonth").addClass("disabled");

      } else {

        // 何もしない

      }

    } else {

      // 何もしない

    }

  }


  this.updateYearStr = function()
  {

    self.monthlyCalenderHead.find(".js-currentYearStr").text( self.year );

  }


  this.updateDataAttr = function()
  {

    self.monthlyCalenderHead.attr("data-year", self.year);
    self.monthlyCalenderHead.data("year", self.year);
    self.monthlyCalenderHead.attr("data-month", self.month);
    self.monthlyCalenderHead.data("month", self.month);

  } 


  // 描画
  this.view = function( year, month )
  {

    // カレンダー本体
    self.calenderHtmlBuilder = new CalenderHtmlBuilder( year, month, self.closeDateJson );
    self.calenderHtmlBuilder.build();
    
    if( !self.openPageFlag ){
      // tb_init('.js-monthlyCalendarBody .thickbox'); // 動的に追加した要素なので、再度init
    }

  }


  this.__construct = function()
  {

    self.bind();

    self.monthlyCalenderHead = $(".js-monthlyCalendarHead");

    self.year  = Number( self.monthlyCalenderHead.attr("data-year") );
    self.month = Number( self.monthlyCalenderHead.attr("data-month") );

    self.startYear = Number( self.monthlyCalenderHead.attr("data-start-year") );
    self.endYear   = Number( self.monthlyCalenderHead.attr("data-end-year") );

    self.calenderNum = Number( self.monthlyCalenderHead.attr("data-calender-num") );


  }()


}


var CalenderHtmlBuilder = function( year, month, closeDateJson )
{

  var self = this;

  this.shopId = pm_shop_id;
  this.openPageFlag = edit_param === "0";

  this.week = ["日", "月", "火", "水", "木", "金", "土"];

  this.year = year;
  this.month = month;

  this.closeDateDataSet = JSON.parse( closeDateJson );
 
  this.holidays         = this.closeDateDataSet.holiday;
  this.closeDate        = this.closeDateDataSet.closeDate;
  this.regularCloseDate = this.closeDateDataSet.regularCloseDate;
  this.exOpenDate       = this.closeDateDataSet.exOpenDate;
  this.exCloseDate      = this.closeDateDataSet.exCloseDate;


  // 日ごとの変数群
  this.dateVariable = function( week, day, year, month, dayCount, holidayFlag )
  {

    // 初期値
    var isHoliday          = false;
    var isCloseDate        = false;
    var isRegularCloseDate = false;
    var isExOpenDate       = false;
    var isExCloseDate      = false;

    var vars = [];

    // フラグ更新

    if( typeof self.holidays[year] !== "undefined" ){

      if( typeof self.holidays[year][month] !== "undefined" ){ // 祝日のない月がある

        if( typeof self.holidays[year][month][dayCount] !== "undefined" ){

          isHoliday = self.holidays[year][month][dayCount];

        } else {

          // 何もしない falseのまま

        }

      } else {

        // 何もしない falseのまま

      }

    } else {

      // 何もしない falseのまま

    }

    if( typeof self.closeDate[year] !== "undefined" ){

      if( typeof self.closeDate[year][month] !== "undefined" ){

        if( typeof self.closeDate[year][month][dayCount] !== "undefined" ){

          isCloseDate = self.closeDate[year][month][dayCount];

        } else {

          // 何もしない falseのまま

        }

      } else {

        // 何もしない falseのまま

      }

    } else {

      // 何もしない falseのまま
   
    }

    if( typeof self.regularCloseDate[day] !== "undefined" ){

      if( dayCount <= week * 7 ) {

        // ここに入る条件：2週目を1週目、3週目を2週目、4週目を3週目、5週目を4週目として判定しないといけない日
        // 1日が何曜日であれ、そこから７日までは上記条件で判断しないといけない

        if( typeof self.regularCloseDate[day][week] !== "undefined" ){

          isRegularCloseDate = self.regularCloseDate[day][week];

        } else {

          // 何もしない falseのまま

        }

      } else {
 
        if( typeof self.regularCloseDate[day][week + 1] !== "undefined" ){

          isRegularCloseDate = self.regularCloseDate[day][week + 1];

        } else {

          // 何もしない falseのまま

        }

      }


    } else {

      // 何もしない falseのまま

    }            

    if( typeof self.exOpenDate[year] !== "undefined" ){

      if( typeof self.exOpenDate[year][month] !== "undefined" ){

        if( typeof self.exOpenDate[year][month][dayCount] !== "undefined" ){

          isExOpenDate = self.exOpenDate[year][month][dayCount];

        } else {

          // 何もしない falseのまま

        }

      } else {

        // 何もしない falseのまま

      }

    } else {

      // 何もしない falseのまま
   
    }


    if( typeof self.exCloseDate[year] !== "undefined" ){

      if( typeof self.exCloseDate[year][month] !== "undefined" ){

        if( typeof self.exCloseDate[year][month][dayCount] !== "undefined" ){

          isExCloseDate = self.exCloseDate[year][month][dayCount];

        } else {

          // 何もしない falseのまま

        }

      } else {

        // 何もしない falseのまま

      }

    } else {

      // 何もしない falseのまま
   
    }

    if( day === 0 ){ // 日曜

      if( isHoliday ){ // 祝日

        vars["dayClassName"] = "hsun";

      } else {

        vars["dayClassName"] = "sun";

      }

    } else {

      if( day === 6 ){ // 土曜

        if( isHoliday ){ // 祝日

          vars["dayClassName"] = "hsat";

        } else {

          vars["dayClassName"] = "sat";

        }

      } else { // 平日

        if( isHoliday ){ // 祝日

          vars["dayClassName"] = "hday";

        } else {

          vars["dayClassName"] = "day";

        }

      }

    }


    if( !isExOpenDate ){ // 0:強制営業日
 
      if( isHoliday && holidayFlag ){ // 1:祝日

 
        if( isRegularCloseDate ){ // 2:定休日

          if( isCloseDate ){ // 3:個別の休み

            if( isExCloseDate ){ // 4:例外の休み

              vars["tdClassName"] = 'closed';
              vars["isClose"] = true;

            } else {

              vars["tdClassName"] = 'closed';
              vars["isClose"] = true;

            }

          } else {

            if( isExCloseDate ){

              vars["tdClassName"] = 'closed';
              vars["isClose"] = true;

            } else {

              vars["tdClassName"] = 'regularClosed';
              vars["isClose"] = true;

            }

          }

        } else {

          if( isCloseDate ){

            if( isExCloseDate ){

              vars["tdClassName"] = 'closed';
              vars["isClose"] = true;

            } else {

              vars["tdClassName"] = 'closed';
              vars["isClose"] = true;

            }

          } else {

            if( isExCloseDate ){

              vars["tdClassName"] = 'closed';
              vars["isClose"] = true;

            } else {

              vars["tdClassName"] = 'allholclosed';
              vars["isClose"] = true;

            }

          }

        }

      } else {

        if( isRegularCloseDate ){

          if( isCloseDate ){

            if( isExCloseDate ){ // 4:例外の休み

              vars["tdClassName"] = 'closed';
              vars["isClose"] = true;

            } else {

              vars["tdClassName"] = 'closed';
              vars["isClose"] = true;

            }

          } else {

            if( isExCloseDate ){

              vars["tdClassName"] = 'closed';
              vars["isClose"] = true;

            } else {

              vars["tdClassName"] = 'regularClosed';
              vars["isClose"] = true;

            }

          }

        } else {

          if( isCloseDate ){

            if( isExCloseDate ){ // 4:例外の休み

              vars["tdClassName"] = 'closed';
              vars["isClose"] = true;

            } else {

              vars["tdClassName"] = 'closed';
              vars["isClose"] = true;

            }

          } else {

            if( isExCloseDate ){ // 4:例外の休み

              vars["tdClassName"] = 'closed';
              vars["isClose"] = true;

            } else {

              vars["tdClassName"] = '';

            }

          }

        }

      }

    } else {

      vars["tdClassName"] = 'exOpen';

    }


    return vars;


  }


  // カレンダー自体の変数群
  this.calenderVariable = function( count )
  {


    var vars = [];

    switch( count ){

      case 1:
 
        vars["idName"] = "now";
        vars["monthIdName"] = "date01";
        vars["tableIdName"] = "edittable01";

        break;

      case 2:

        vars["idName"] = "next";
        vars["monthIdName"] = "date02";
        vars["tableIdName"] = "edittable02";

        break;

      default:

        vars["idName"] = "";
        vars["monthIdName"] = "";
        vars["tableIdName"] = "";

    }

    return vars;


  }

  this.buildSingleMonth = function( year, month, count )
  {

    var holidayFlag = Boolean( $(".js-monthlyCalendarHead").attr("data-holiday-flag") === "1" );

    // monthチェック
    if( month === 13 ){

      year = year + 1;
      month = 1;

    } else if( month === 0 ){

      year = year - 1;
      month = 12;

    }

    var startDate = new Date( year, month - 1, 1);
    var endDate = new Date( year, month, 0);

    var dateNum = endDate.getDate();
    var startDay = startDate.getDay();

    var dayCount = 1;

    var forcedEnd = false;

    var calenderVars = self.calenderVariable( count );



    var html = "";

    html += '<div id = "' + calenderVars.idName + '">' + 
              '<p id = "' + calenderVars.monthIdName + '">' + month + '月</p>' + 
              '<table id = "' + calenderVars.tableIdName + '"><tbody>' + 
              '<tr>';

    // 月～日の文字
    for (var d = 0; d < self.week.length; d++) {

      if( self.openPageFlag ){ // 公開

        html += '<th>' + self.week[d] + '</th>'

      } else {

        html += '<th class = "weekTh" title = "曜日をクリックすると一括で設定・解除ができます"><a href = "edit/edit_calender.php?shop_id=' + self.shopId + '&TB_iframe=true&height=530&width=700" class = "thickbox">' + self.week[d] + '</a></th>'

      }

    }

    html += '</tr>';

    // 日付
    for( var w = 0; w < 6; w++ ){

      if( !forcedEnd ){

        html += '<tr>';

        for (var d = 0; d < 7; d++) {

          if( w === 0 && d < startDay ){ // 1日より前

            html += '<td></td>';

          } else if( dayCount > dateNum ){ // 末日より後

            html += '<td></td>';
            forcedEnd = true; // この週で強制的に終わらせる

          } else {

            var dateVars = self.dateVariable( w, d, year, month, dayCount, holidayFlag );

            if(dateVars.isClose){

              html += '<td id = "day_' + year + '-' + month + '-' + dayCount + '" class = "validDate ' + dateVars.tdClassName + '" data-day = "' + dayCount + '" >' + 
                        '<span class = "validDateStr ' + dateVars.dayClassName + '">' + "休" + '</span>' + 
                      '</td>';

            } else {

              html += '<td id = "day_' + year + '-' + month + '-' + dayCount + '" class = "validDate ' + dateVars.tdClassName + '" data-day = "' + dayCount + '" >' + 
                        '<span class = "validDateStr ' + dateVars.dayClassName + '">' + dayCount + '</span>' + 
                      '</td>';

            }

            dayCount++;

          }

        }

        html += '</tr>';

      }

    }

    html += "</tbody></table>"

    html += '</div>';

    return html;

  }


  this.build = function()
  {

    var html = "";

    html += self.buildSingleMonth( self.year, self.month, 1 );
    html += self.buildSingleMonth( self.year, self.month + 1, 2 );

    $(".js-monthlyCalendarBody").html(html);

  }

  this.__construct = function()
  {

  }()

}


/**
 * 公開用JS（cssjs_open_sub.jsと統合）
 */


// =======================================================
// 以下、 編集画面・公開画面 共通処理
// ※この上にもあるが、順次整理
// =======================================================



/* jQuery拡張 */
$.fn.extend({

  // backgroundPositionのx, y値を取得
  // IEのみ挙動が違うためfix
  backgroundPosition : function( format )
  {

    var tmp = $(this).css("backgroundPosition");


    // calc( ... ) calc( ... )
    var m1 = tmp.match( /(calc\(.+\))\s(calc\(.+\))/ );
        
    if( m1 !== null ){

      var x = m1[1],
          y = m1[2];

    } else {

      // 50% 200px, 50px -120%...
      var m2 = tmp.match( /(.+)\s(.+)/ );

      if( m2 !== null ){

        var x = m2[1],
            y = m2[2];
            
      } else {

        // 50%(IE)
        var m3 = tmp.match(/^(.+\%)$/ );

        if( m3 !== null ){
          var x = m3[1],
              y = m3[1];
        }

      }

    }
    switch( format ){
      case "axis":
        return { x: x, y: y };
      break;

      case "text":
        return x + " " + y;
      break;
    }
  },

  nextBackgroundSize : function( percentage, originalImageObject, format )
  {
    var original = $(this).backgroundSize( originalImageObject ),
        m,
        nextx,
        nexty;

    if( m = original.match( /(.*)\% auto/ ) ){

      var current = Number( m[1] ),
          next = current + percentage;

      nextx = next + "%";
      nexty = "auto";


    } else if( m = original.match( /auto (.*)\%/ ) ){

      var current = Number( m[1] ),
          next = current + percentage;

      nextx = "auto";
      nexty = next + "%";
      

    } else if( m = original.match( /(.*)\% (.*)\%/ ) ){

      var current = Number( m[1] ),
          next = current + percentage;

      nextx = next + "%";
      nexty = next + "%";
      

    } else if( m = original.match( /(.*)px (.*)px/ ) ){

      var x = m[1],
          y = m[2],
          add = 1 + ( percentage * 0.01 );

      var nextx = Math.round( x * add ) + "px",
          nexty = Math.round( y * add ) + "px";


    } else if( m = original.match( /auto (.*)px/ ) ){

      var y = m[1],
          add = 1 + ( percentage * 0.01);

      var nextx = "auto",
          nexty = Math.round( y * add ) + "px";

    }


    switch( format ){
      case "axis":
        return { x : nextx, y : nexty };
      break;
      case "text":
        return nextx + " " + nexty;
      break;
    }


  },

  // background-sizeのx,yを取得
  // IE呑み挙動が違うのでfix
  // 画像のimgタグが必須。visibilitty:hidden等で隠すのはOK
  backgroundSize : function( originalImageObject )
  {

    var bgValue = $(this).css("backgroundSize"),
        bgAreaXY = {
          x : $(this).width(),
          y : $(this).height()
        },
        imageXY = null;

    if( typeof originalImageObject !== "undefined" && originalImageObject.length > 0){
        imageXY = {
          x : originalImageObject.width(),
          y : originalImageObject.height()
        };
    }


    switch( bgValue ){
      
      case "cover":

        if( imageXY !== null ){
          return imageXY.x >= imageXY.y ? "auto 100%" : "100% auto";
        }

        // return bgAreaXY.x >= bgAreaXY.y ? "100% auto" : "auto 100%";
      break;

      case "contain":
        return bgAreaXY.x >= bgAreaXY.y ? "100% auto" : "auto 100%";
      break;

      case "auto":

        if( originalImageObject.length > 0 ){
          return originalImageObject.width() + "px" + " " + originalImageObject.height() + "px";
        } else {
          return "100% 100%";
        }
      break;

      default:

        if( typeof bgValue === "undefined" || bgValue.length < 1) return;

        // 数値のみ
        if( m = bgValue.match(/^([\d|\.]*)\%$/) ){

          return bgAreaXY.x >= bgAreaXY.y ? m[1] + "% auto" : "auto " + m[1] + "%";

        } else if( m = bgValue.match( /^(.*)\% (.*)\%$/ ) ){

            return m[1] + "%" + " " + m[2] + "%";

        } else if( m = bgValue.match( /^(.*)\% auto$/ ) ){

            return bgValue;

        } else if( m = bgValue.match( /^auto (.*)\%$/ ) ){

            return bgValue;

        } else if( m = bgValue.match( /^(.*)\% (.*)\%$/ ) ){

            return bgValue;
        
        } else if( m = bgValue.match( /^(.*px) (.*px)$/ ) ){

            return m[1] + " " + m[2];

        } else if( m = bgValue.match( /^(.*px) auto$/) ){

            return m[1] + " " + "auto";

        } else if( m = bgValue.match( /^auto (.*px)$/) ){

            return "auto" + " " + m[1];

        // IEのみ % を px に変換するんで % に戻す
        } else if( m = bgValue.match( /^(.*)px$/ ) ){

            var backgroundWidth = m[1];

            var value = Math.round( ( backgroundWidth / bgAreaXY.x ) * 100 ); 

            return bgAreaXY.x >= bgAreaXY.y ? value + "% auto" : "auto " + value + "%";

        }

    break;
    
    }

  }

});


if( typeof useHamburgerMenu === "undefined" ){

  var useHamburgerMenu = "0";

}


var dktlExtension = typeof formExtension === "boolean" && formExtension;

var entryFormFileReaderManager;

var blockManagerInstance;

var hasLocationHash = location.hash !== "";

var sliderLinkButtonOpened = false;

var sky5ExController = null;



/**
 * グローバルメニュー イベント関連オブジェクト
 */
var GlobalMenuEvent = {


  MEGA_MENU_ELEMENT_NUM: useHamburgerMenu === "1" ? 1 : 7,

  params: {
      arrowWidth : 0
    , arrowHeight: 0
    , arrowImageId: null
    , arrowDirection: null
    , menuTitleList: [] // .menu > ul のリスト
    , menuBodyList : [] // #mega_menu > div のリスト
    , menuWidth : 0 // .menuのwidth
    , wrapWidth : 0 // .mega_menuのwidth
    , wrapPosX : 0  //.mega_menuのleft
  },

  initialFixFlag: false,

  useAnimationFlag: $(".menu_wrapper").hasClass("use_megamenu_animation"),

  fixedFlag: $(".menu_container").css("position") === "fixed",

  menuTitles : [],
  menuTitlesEn : [],

  showArrow: function( menuDiv )
  {

    var menuId = menuDiv.attr("data-menu-id");
    var menuLi = menuDiv.closest(".menu_container").find(".js-subPageWrapper[data-menu-id = " + menuId + "]");

    var arrowW = 16;

    var gMenuX = menuLi.offset().left;
    var gMenuY = menuLi.offset().top;

    var mMenuX = menuDiv.offset().left;
    var mMenuY = menuDiv.offset().top;

    var gMenuW = menuLi.outerWidth();
    var gMenuH = menuLi.outerHeight();

    var position = menuDiv.attr("data-arrow-direction");

    menuDiv.find(".megaMenuArrow").css({
      left : "",
      right : "",
      top : ""
    });

    if( position === "top" || position === "middle" ){

      var arrowX = gMenuX - mMenuX + (gMenuW / 2) - (arrowW / 2);

      menuDiv.find(".megaMenuArrow--top").css("left", arrowX + "px");

    }else if( position === "bottom" ) {

      var arrowX = gMenuX - mMenuX + (gMenuW / 2) - (arrowW / 2);

      menuDiv.find(".megaMenuArrow--bottom").css("left", arrowX + "px");

    } else if( position === "left" ) {

      var arrowY = gMenuY - mMenuY + (gMenuH / 2) - (arrowW / 2); 

      menuDiv.find(".megaMenuArrow--left").css("top", arrowY + "px");

    } else { // 右

      var arrowY = gMenuY - mMenuY + (gMenuH / 2) - (arrowW / 2); 

      menuDiv.find(".megaMenuArrow--right").css("top", arrowY + "px");

    }
  },

  buildDummyLi: function( megaMenuDiv )
  {

    // まずダミーを削除
    megaMenuDiv.find(".dummyLi").remove();

    // 公開 と 非公開の li の間

    var openLiNum = megaMenuDiv.find('.js-sub--top, li[data-included-middle-menu = "0"][data-is-private = "0"], li[data-roop-name="openLoop"]').length;

    var buildNum = 3 - ( openLiNum % 3 );

    if( buildNum < 3 ){

      for( i = 0; i < buildNum; i++){

        megaMenuDiv.find('li[data-roop-name="openLoop"]').before("<li class = 'dummyLi'></li>");

      }

    }

  },

  init: function(design_number, side_bar)
  {


    if(SPJSFLAG == 1 && sp_param == "1"){
      return;
    }

    $(document).on("click", ".js-pageListToggle", function(){

      var megaMenuDiv = $(this).closest(".mega_menu");

      // タブを切り替えたときに 3n が崩れないようダミーのliを挿入
      GlobalMenuEvent.buildDummyLi( megaMenuDiv );

      var state = $(this).attr("data-state");
      $(this).closest(".mega_menu").attr("data-active-tab", state);

    });

    var menuOpenProcess = null;
    var menuCloseProcess = null;
    var menuOpenProcessFloat = null;
    var menuCloseProcessFloat = null;

    var hoverTimer;

    // straight デザイン用 左・右メニュー（下にメニュー表示）
    if(design_number == "straight" && (side_bar =="right" ||side_bar =="left" )){
      menuOpenProcess = function(){
        var menu_cld_height = $("ul:not(:animated)",this).height();

        $("ul:not(:animated)",this).hide().css({top:-menu_cld_height}).fadeIn("fast");

        $('.mega_menu').each( function(index,e){ //メガメニューは即閉じる

          $(e).slideUp(0);
          $(e).css({'backgroundImage': null});

          // 「閉じる」タイマークリア
          if ($(e).data('close_timer')) {

            clearTimeout($(e).data('close_timer'));
            $(e).data('close_timer', null);

          }

        });

      };
      menuCloseProcess = function(){
        $("ul",this).fadeOut("fast");
      };
      // 通常用
    } else {
      menuOpenProcess = function(){
        $("ul:not(:animated)",this).show("fast");

        $('.mega_menu').each( function(index,e){ //メガメニューは即閉じる

          $(e).slideUp(0);
          $(e).css({'backgroundImage': null});

          // 「閉じる」タイマークリア
          if ($(e).data('close_timer')) {

            clearTimeout($(e).data('close_timer'));
            $(e).data('close_timer', null);

          }

        });

      };
      menuCloseProcess = function(){
        $("ul",this).slideUp("fast");
      };
    }

    // メガメニュー適用デザインかどうか
    var megaMenuAvailable = true;
    // 除外設定 ※メガメニューを使わないデザイン・メニュー位置
    $([
      //   { design: 'paper2'    , menu: 'left' }
      // , { design: 'paper2'    , menu: 'right' }
    ]).each(function(i, ele){
        if (design_number == ele.design && side_bar == ele.menu) {
          megaMenuAvailable = false;
        }
      });

    if (megaMenuAvailable === true) {

      // メガメニューアニメーション系デザイン
      menuOpenProcessAnim = function()
      {


        var menuDiv;

        clearTimeout(hoverTimer);

        // 表示するメニューdivの特定
        if ($(this).hasClass('mega_menu')) { // div.mega_menu

          menuDiv = $(this);

          if( shouldOpenMegaMenu ) {

            menuDiv.closest(".menu_wrapper").addClass("js-hover");
            menuDiv.addClass("active");

            setTimeout( function(){

              menuDiv.closest(".menu_wrapper").addClass("is-hovering");

            }, 500);

          }

        } else { // .menu ul li

          var divIndex = $.inArray(this, GlobalMenuEvent.params.menuTitleList);
          menuDiv = $(GlobalMenuEvent.params.menuBodyList[divIndex]);

          var position = $("#wrapper").attr("data-menu-position");

          if( shouldOpenMegaMenu ) menuDiv.addClass("active");

          // アローの表示
          GlobalMenuEvent.showArrow(menuDiv);

          $(this).closest(".menu_wrapper").addClass("js-hover");

          setTimeout( function(){

            menuDiv.closest(".menu_wrapper").addClass("is-hovering");

          }, 500);

        }

        menuDiv.siblings('.mega_menu').each( function(index,e){
          if( shouldOpenMegaMenu ) $(e).removeClass("active");
        });

      }

      menuCloseProcessAnim = function()
      {

        if( $("#js-newMiddleMenuModal").length > 0 ){

          // フォルダ名編集途中の場合は、閉じない

        } else {

          var menuDiv;

          // div.mega_menu
          if ($(this).hasClass('mega_menu')) {
            menuDiv = $(this);
            // .menu ul li
          } else {
            var divIndex = $.inArray(this, GlobalMenuEvent.params.menuTitleList);
            menuDiv = $(GlobalMenuEvent.params.menuBodyList[divIndex]);
          }

          // メガメニューアニメーション系デザイン

          hoverTimer = setTimeout( function(){

            if( shouldOpenMegaMenu ) {
              menuDiv.removeClass("active");
              menuDiv.closest(".menu_wrapper").removeClass("js-hover");
              menuDiv.closest(".menu_wrapper").removeClass("is-hovering");
            }

          }, 500);

        }

      }


      menuOpenProcessFloat = function() {

        var menuDiv;

        // 表示するメニューdivの特定
        if ($(this).hasClass('mega_menu')) { // div.mega_menu
          menuDiv = $(this);

        } else { // .menu ul li

          var divIndex = $.inArray(this, GlobalMenuEvent.params.menuTitleList);
          menuDiv = $(GlobalMenuEvent.params.menuBodyList[divIndex]);

        }


        menuDiv.siblings('.mega_menu').each( function(index,e){ //自分以外のメガメニューは即閉じる

          $(e).slideUp(0);
          $(e).css({'backgroundImage': null});

          // 「閉じる」タイマークリア
          if ($(e).data('close_timer')) {

            clearTimeout($(e).data('close_timer'));
            $(e).data('close_timer', null);

          }

        });



        // 「閉じる」タイマークリア
        if (menuDiv.data('close_timer')) {
          clearTimeout(menuDiv.data('close_timer'));
          menuDiv.data('close_timer', null);
        }

        // メニューブロック(div)の方ならタイマークリアのみ
        if ($(this).hasClass('mega_menu')) {
          return;
        }

        var self = this;

        // メニューを開く(callback でポインタ位置設定)
        // 自分をベースにメニューの位置を取得するために、表示状態になるfadeInのcallbackで計算処理
        menuDiv.not(':animated').fadeIn(300, function(){

          // メニューポインタ位置の取得・設定
          // ※メニュー左・右の場合、他のメニューの開閉でずれるため毎回設定する。
          var arrowTop = null;
          var arrowLeft = null;
          if (GlobalMenuEvent.params.arrowDirection === 'left' || GlobalMenuEvent.params.arrowDirection === 'right') {

            // 矢印画像： 親は '.menu ul li'
            arrowTop  = $(self).offset().top - menuDiv.offset().top + (($(self).height() - GlobalMenuEvent.params.arrowHeight) / 2);

            // メニューブロック最低height (右・左メニューの場合)
            var menuMinHeight;
            menuMinHeight = $(self).offset().top - $('.menu ul li').eq(0).offset().top + $(self).height();
            menuMinHeight = menuMinHeight >= (GlobalMenuEvent.params.paddingV) ? menuMinHeight - (GlobalMenuEvent.params.paddingV): menuMinHeight;
            menuDiv.find('.ul_sub').css({'minHeight': menuMinHeight}); // メニューブロック最小高さ

            // 上・中メニュー
          } else {
            arrowLeft = $(self).offset().left - menuDiv.offset().left + (($(self).outerWidth() - GlobalMenuEvent.params.arrowWidth) / 2);
          }

          // 以下は、設定済みなら省略
          if (menuDiv.data('initialized')) {
            return;
          }

          menuDiv.find('.ul_sub').show();

          menuDiv.data('initialized', true);

        });

        GlobalMenuEvent.showArrow(menuDiv);

      };

      // メニュークローズ（float）
      menuCloseProcessFloat = function() {

        // 表示するメニューdivの特定
        var menuDiv;

        // div.mega_menu
        if ($(this).hasClass('mega_menu')) {
          menuDiv = $(this);
          // .menu ul li
        } else {
          var divIndex = $.inArray(this, GlobalMenuEvent.params.menuTitleList);
          menuDiv = $(GlobalMenuEvent.params.menuBodyList[divIndex]);
        }

        if( !$("body").hasClass("menu-edit-mode") ){ // 編集モードでは自動で閉じないように

          // 「閉じる」タイマー （一瞬マウスが離れた場合に閉じてしまわないように、猶予時間をおいて閉じる）
          var timer = setTimeout(function(){
            // メニューを閉じる
            menuDiv.slideUp(0);
            menuDiv.css({'backgroundImage': null}); // ポインタ再設定が必要なため、一度隠す

            menuDiv.data('close_timer', null);
          }, 800);

          menuDiv.data('close_timer', timer);

        }

      };
    }

    // メニューを消す
    $(".menu li .ul_sub").hide();

    // イベント設定 (hover)
    GlobalMenuEvent.initParams();

    $(".menu > ul > li").each(function(i, ele) {

      var middleMenuCount = 0;

      $(this).find('ul > li').each(function(i, ele){

        if( $(this).hasClass("middle-menu__trigger") ){

          middleMenuCount++;

        }

      });

      if( $(this).find('ul li').size() > 0){

        var $div = GlobalMenuEvent.buildMenuData(this);

        GlobalMenuEvent.menuTitles[i] = $(this).find(".js-menuTitle").text();
        GlobalMenuEvent.menuTitlesEn[i] = GlobalMenuEvent.setMenuTitleEn( $(this).find(".js-menuTitle").data("menu-id") );

        $([this, $div.get(0)]).unbind();

        if ( $([this, $div.get(0)]).css("display") !== "none" && $([this, $div.get(0)]).closest(".menu_wrapper").css("display") !== "none" && $($div.get(0)).length > 0 ) {
          $([this, $div.get(0)]).hover(
              menuOpenProcessAnim
            , menuCloseProcessAnim
          );
        }

      } else {

        if ( (($(this).find('ul li').size() >= GlobalMenuEvent.MEGA_MENU_ELEMENT_NUM) || middleMenuCount > 0)
          && menuOpenProcessFloat !== null ){ // フォルダがあるメニューはメガメニュー表示

          var $div = GlobalMenuEvent.addMegaMenu(this);

          $([this, $div.get(0)]).unbind();

          if ( $([this, $div.get(0)]).css("display") !== "none" && $([this, $div.get(0)]).closest(".menu_wrapper").css("display") !== "none" && $($div.get(0)).length > 0 ) {
            $([this, $div.get(0)]).hover(
                menuOpenProcessFloat
              , menuCloseProcessFloat
            );
          }

        }

      }

    });
  },

  initParams: function()
  {
    GlobalMenuEvent.params.menuTitleList = [];
    GlobalMenuEvent.params.menuBodyList  = [];

    GlobalMenuEvent.initialFixFlag = false;

  },

  buildMenuData: function(li)
  {

    var menuId = $(li).attr("data-menu-id"),
        $div = $(li).closest(".menu_container").find(".mega_menu[data-menu-id='" + menuId + "']");

    // これは、JS側でつけるしかない。
    if( GlobalMenuEvent.fixedFlag ){
      $div.addClass("fixed_mega_menu");
    }else{
      $div.removeClass("fixed_mega_menu");
    }

    var ul   = $(li).find('ul')[0];
    // $(ul).addClass('clearfix');


    // デザインによるそれぞれのメニューの出し方分岐
    switch (design_number) {
      case 'sky2':  // skye2は 上・中・左・右 共通
      case 'kenou':
        GlobalMenuEvent.params.arrowDirection = 'top';
        break;
      case 'straight': // straightは 左・右 共通（下メニュー）
        if (side_bar == 'top' || side_bar == 'middle') {
          GlobalMenuEvent.params.arrowDirection = 'top';
        } else {
          GlobalMenuEvent.params.arrowDirection = 'bottom';
        }
        break;
      case 'straight2': // straight2は 左・右 共通
        if (side_bar == 'top' || side_bar == 'middle') {
          GlobalMenuEvent.params.arrowDirection = 'top';
        } else {
          GlobalMenuEvent.params.arrowDirection = 'left';
        }
        break;
      case 'photo2': // photo2は 左・右 共通
        if (side_bar == 'top' || side_bar == 'middle') {
          GlobalMenuEvent.params.arrowDirection = 'top';
        } else {
          GlobalMenuEvent.params.arrowDirection = 'left';
        }
        break;
      case 'animation': // animationは 左・右 共通
        if (side_bar == 'top' || side_bar == 'middle') {
          GlobalMenuEvent.params.arrowDirection = 'top';
        } else {
          GlobalMenuEvent.params.arrowDirection = 'left';
        }
        break;
      case 'cafe': // cafeは 右でメニューが左に出てくる
            if (side_bar === 'right') {
              GlobalMenuEvent.params.arrowDirection = 'left';
            }else if( side_bar === 'top' || side_bar === 'middle' ) {
              GlobalMenuEvent.params.arrowDirection = 'top';
            } else if (side_bar === 'left') {
              GlobalMenuEvent.params.arrowDirection = 'left';
            } else {
              GlobalMenuEvent.params.arrowDirection = 'middle';
            }
            break;
      case 'seibi': // seibiは 中でメニューが下に出てくる
        if (side_bar === 'middle') {
          GlobalMenuEvent.params.arrowDirection = 'bottom';
        }else if(side_bar === 'top'){
          GlobalMenuEvent.params.arrowDirection = 'top';
        } else if (side_bar === 'left') {
          GlobalMenuEvent.params.arrowDirection = 'left';
        } else {
          GlobalMenuEvent.params.arrowDirection = 'right';
        }
        break;
      case 'two_block': // two_block 上・中・左・共通
      case 'colorful2':
      case 'colorful6':
        if (side_bar == 'top' || side_bar == 'middle' || side_bar == 'left') {
          GlobalMenuEvent.params.arrowDirection = 'left';
        } else {
          GlobalMenuEvent.params.arrowDirection = 'right';
        }
        break;
      case 'duo_tone':
        if (side_bar == 'top' || side_bar == 'middle' || side_bar == 'right') {
          GlobalMenuEvent.params.arrowDirection = 'right';
        } else {
          GlobalMenuEvent.params.arrowDirection = 'left';
        }
          break;
      case 'pastel3': // パステル3 上と左、中と右 共通
        if (side_bar == 'middle' || side_bar == 'right') {
          GlobalMenuEvent.params.arrowDirection = 'right';
        } else {
          GlobalMenuEvent.params.arrowDirection = 'left';
        }
        break;
      case 'washi':
      case 'multi_slide':
      case 'game':
      case 'wide4':
      case 'sdgs':
      case 'retro':
      case 'verticalbar2':
      case 'mobile_first2':
      case 'mobile_first4':
      case 'black5':
      case 'dekamoji2':
          GlobalMenuEvent.params.arrowDirection = 'right';
        break;
      case 'craft2':
      case 'mobile_first3':
          GlobalMenuEvent.params.arrowDirection = 'left';
        break;
      case 'dekamoji':
        if (side_bar == 'top' || side_bar == 'middle' || side_bar == 'right') {
          GlobalMenuEvent.params.arrowDirection = 'right';
        } else {
          GlobalMenuEvent.params.arrowDirection = 'left';
        }
        break;
      // その他デザイン
      default:
        if (side_bar == 'top' || side_bar == 'middle') {
          GlobalMenuEvent.params.arrowDirection = 'top';
        } else if (side_bar == 'left') {
          GlobalMenuEvent.params.arrowDirection = 'left';
        } else {
          GlobalMenuEvent.params.arrowDirection = 'right';
        }
        break;
    }

    // メニューサイズの取得・設定（大枠、内部要素、マージンその他）
    GlobalMenuEvent.params.paddingH = 60; // メニューブロック左右パディング
    GlobalMenuEvent.params.paddingV = 60; // メニューブロック上下パディング
    GlobalMenuEvent.params.itemPaddingWidthTotal = 30; // メニュー項目内パディング 幅合計(左 20, 右10)

    GlobalMenuEvent.params.menuTitleList.push(li);
    GlobalMenuEvent.params.menuBodyList.push($div);

    return $div;

  },

  //メニューのイベント削除
  removeEvents: function(){
    if(SPJSFLAG == 1 && sp_param == "1"){
      $(".menu ul li").off("mouseenter").off("mouseleave");
    }
  },

  setMenuTitleEn: function( menuId ){

    var res = "";
    var menuTitleEnArray = [
      { menuId : 11, string: "free1" },
      { menuId : 12, string: "free2" },
      { menuId : 13, string: "free3" },
      { menuId : 14, string: "free4" },
      { menuId : 15, string: "free5" },
      { menuId : 16, string: "free6" },
      { menuId : 20, string: "shaken" },
      { menuId : 21, string: "syuri" },
      { menuId : 22, string: "cars" },
      { menuId : 23, string: "bankin" },
      { menuId : 24, string: "hoken" },
      { menuId : 25, string: "coating" },
      { menuId : 26, string: "check" },
      { menuId : 27, string: "newcars" },
      { menuId : 28, string: "custom" },
      { menuId : 29, string: "rentacar" },
      { menuId : 30, string: "buyback" },
      { menuId : 31, string: "replacement" },
      { menuId : 32, string: "sale" },
      { menuId : 33, string: "carlease" },
      { menuId : 102, string: "access" },
      { menuId : 103, string: "company" },
      { menuId : 104, string: "contact" },
      { menuId : 105, string: "estimate" },
      { menuId : 110, string: "other" },
    ];

    menuTitleEnArray.forEach( function(menuTitleEn, index) {

      if( menuTitleEn.menuId === menuId ) res = menuTitleEn.string;

     });

    return res;

  }

};




/* 在庫車検索・ロギング */

var buildDataSet4SearchingUsedcar = function( exparam = null )
{

    if( $("#carSearchSubmit_public").length === 0 ){
      return null;
    }

    var dataSet = {
        keyword : $("#car_free_search").val(),
        maker :  $("#carMaker_public").val(),
        name : $("#carName_public").val(),
        nenshiki :  {
          min : $("#carAge_lowerLimit_public").val(),
          max : $("#carAge_upperLimit_public").val()
        },
        kyori : {
          min : $("#carDistance_lowerLimit_public").val(),
          max : $("#carDistance_upperLimit_public").val()
        },
        kakaku:  {
          min : $("#carCost_lowerLimit_public").val(),
          max : $("#carCost_upperLimit_public").val(),
        },
        order :  {
          key : $(".sort_type").val(),
          dest : $(".sort_order_type").val()
        },
        shopId : pm_shop_id,
        isOpen : Number( isOpen ),
        url : location.href
    };

    if( exparam !== null ){
      Object.assign( dataSet, exparam );
    }

    return dataSet;

}


var loggingSearchUsedcar = function( exparam )
{
  
    var def = $.Deferred(),
        dataSet = buildDataSet4SearchingUsedcar( exparam ),
        endpoint = `${conversionRoot}search_usedcar_log.php`;

    if( dataSet === false ){
        def.reject();
    }

    $.ajax({
        url: endpoint,
        data: dataSet,
        type: "POST",
        dataType: "json",
        success : function( data )
        {
            def.resolve()
        },
        error : function(){}
    });

    return def.promise();

}



// ------------------------------------------------------------
// 中古車詳細 画像スライドショー （編集・公開サイト 共通処理） ここから
// ------------------------------------------------------------



var UsedCarDetailSlideShowEvent = {

  eventType : "click",

  resizeTimer : null,

  resizeSpan : 200,

  animationSpeed : 100,

  const : {
    width : { icon : 80, slide : 640 },
    count : { image : 0 },
    usedcar : { id : null }
  },

  is : {
    start : false,
    visible : {
      arrow : {
        left : false,
        right : false
      }
    },
    sp : false,
  },

  data : null,

  design_number : design_number,

  var : {
    order : 0,
    x : {
      click : 0,
      margin : { slide : 0 }
    },
    editHref : {
      insert : { original : "", prefix : "", suffix : "", mode : "" },
      update : { original : "", prefix : "", suffix : "", mode : "" },
      delete : { original : "", prefix : "", suffix : "", mode : "" }
    }
  },

  obj : {
    window : null,
    iconWrapped : null,
    icon : null,
    image : null,
    imageLink : null,
    deleteLink : null,
    hiddenWrapped : null,
    slideWrapped : null,
    arrow : {
      left : null,
      thumbLeft : null,
      right : null,
      thumbRight : null,
      mask : {
        all : null,
        left : null,
        thumbLeft : null,
        thumbRight : null
      }
    },
    caption : null
  },

  alreadyBinded : false,

  /// 初期化処理
  init: function() {

    if( $("#js-usedcarInfo").val() != "" && $("#js-usedcarInfo").length !== 0 ){

      var self = this;

      var obj = self.obj;
          x = self.var.x;

      if ( $("#js-usedcarInfo").length < self.var.order ) {
        self.var.order = $("#js-usedcarInfo").length - 1;
      }

      // イベント開始
      self.is.start = true;

      self.data = JSON.parse( $("#js-usedcarInfo").val() );

      self.const.count.image = self.data.length;

      self.var.editHref.update.prefix = $("#js-ImageLink").data("originalHrefPrefix");

      self.var.editHref.update.suffix = $("#js-ImageLink").data("originalHrefSuffix");

      self.var.editHref.update.mode = $("#js-ImageLink").data("originalHrefMode");


      self.var.editHref.delete.prefix = $("#js-deleteTrigger").data("originalHrefPrefix");

      self.var.editHref.delete.suffix = $("#js-deleteTrigger").data("originalHrefSuffix");

      self.var.editHref.delete.mode = $("#js-deleteTrigger").data("originalHrefMode");


      self.var.editHref.insert.prefix = $("#js-insertLink").data("originalHrefPrefix");

      self.var.editHref.insert.suffix = $("#js-insertLink").data("originalHrefSuffix");

      self.var.editHref.insert.mode = $("#js-insertLink").data("originalHrefMode");

      self.var.imageId = self.data[ self.var.order ].imageId;

      self.const.usedcar.id = $("#js-usedcarId").val();

      obj.iconWrapped = $("#js-slideIconWrapped");

      obj.icon = $("#js-slideIcon");

      obj.image = $("#js-slideImage"),

      obj.hiddenWrapped = $("#js-UsedCarInfoWrapped");

      obj.arrow.right = $("#cgmRArrow");

      obj.arrow.left = $("#cgmLArrow");

      obj.arrow.thumbRight = $("#carGallMask .cgmRArrow");

      obj.arrow.thumbLeft = $("#carGallMask .cgmLArrow");

      obj.arrow.mask.all = $(".js-cgm");

      obj.arrow.mask.left = $(".js-cgm.cgmLeft");

      obj.arrow.mask.right = $(".js-cgm.cgmRight");

      obj.arrow.mask.thumbLeft = $("#carGallMask .cgmLeft");

      obj.arrow.mask.thumbRight = $("#carGallMask .cgmRight");

      obj.caption = $("#cgmCap");

      obj.imageLink = $("#js-ImageLink");

      obj.deleteLink = $("#js-deleteTrigger");

      obj.insertLink = $("#js-insertLink");

      obj.slideWrapped = $("#car_gall");

      obj.capWrapper = $("#cgmCapWrapper");

      obj.cgmCapClose = $("#cgmCapClose");

      obj.window = $(window);

      self.refresh.html();

      self.refresh.editHref();
      
      self.refresh.visibleArrow();
      
      self.refresh.arrow();
      
      self.refresh.arrowMask();
      
      self.refresh.windowSize();

      if( sp_param === "1" && edit_param === "1" ){
        $(".tltp").removeClass("tltp");
      }

      if ( !self.alreadyBinded ) {

        // アイコンクリック
        // 行うのは、何枚目かを更新し、scrollAction()を叩くだけ。
        $(document).on(self.eventType, "#js-slideIconWrapped", function(e){

          x.click = e.offsetX;

          x.margin.slide = obj.icon.css("margin-left").replace("px", "");

          var tmp = Math.floor( ( x.click - x.margin.slide ) / self.const.width.icon );

          if( tmp < self.data.length ){

            // 何枚目をクリックしたか
            self.var.order = tmp;
            self.var.imageId = self.data[ self.var.order ].imageId;
            $(".car_gall_main").attr("data-slide-order" , parseInt(self.var.order) + 1 );
            self.scrollAction();

          }

        });

        // 矢印クリック
        // 行うのは、何枚目かを更新し、scrollAction()を叩くだけ。
        $(document).on( self.eventType, ".js-cgm", function(){

          var self = UsedCarDetailSlideShowEvent,
              slideOrder = $(".car_gall_main").attr("data-slide-order");

          if( self.is.visible.arrow.right && $(this).hasClass("cgmRight") ){
              self.var.order++;
              $(".car_gall_main").attr("data-slide-order" , parseInt(slideOrder) + 1 );
          };

          if( self.is.visible.arrow.left && $(this).hasClass("cgmLeft") ){
              self.var.order--;
              $(".car_gall_main").attr("data-slide-order" , parseInt(slideOrder) -1 );
          };

          self.var.imageId = self.data[ self.var.order ].imageId;

          self.scrollAction();

        });

        $(window).resize(function(e){

          if( self.resizeTimer !== false ) clearTimeout( self.resizeTimer );

          self.resizeTimer = setTimeout(function(){

            self.refresh.windowSize();

          }, self.resizeSpan)

        })

        $(window).keydown(function(e){

          switch( e.keyCode ){

            case 37:
              if( self.is.visible.arrow.left && self.obj.arrow.mask.all.hasClass("cgmLeft") ) self.var.order--;
              self.scrollAction();
              self.var.imageId = self.data[ self.var.order ].imageId;
            break;

            case 39:
              if( self.is.visible.arrow.right && self.obj.arrow.mask.all.hasClass("cgmRight") ) self.var.order++;
              self.scrollAction();
              self.var.imageId = self.data[ self.var.order ].imageId;
            break;

          }

        })

        $(document).on('click', "#cgmCapClose", function() {
          obj.capWrapper.slideUp(100);
        });

      }


      var slideOrder = $(".car_gall_main").attr("data-slide-order");
      if( slideOrder !== "" ) {
        if( slideOrder !== undefined ) {
            if ( Number(slideOrder) !== 0 ) {
              self.var.order = slideOrder - 1;
            }else{
              self.var.order = slideOrder;
            }
            self.var.imageId = self.data[ self.var.order ].imageId;
            self.scrollAction();
        }
      }

    self.alreadyBinded = true;

    }

  },


  // 状態を更新する関数群
  refresh : {

    editHref : function()
    {

      var self = UsedCarDetailSlideShowEvent;

      var slideOrder = $(".car_gall_main").attr("data-slide-order");

      self.var.editHref.update.original =
      self.var.editHref.update.prefix + 
      "&smt=" + sp_param + 
      "&u=" + self.const.usedcar.id +
      "&i=" + self.data[ self.var.order ].imageId + 
      "&order=" + slideOrder + 
      "&" + self.var.editHref.update.mode + 
      "&" + self.var.editHref.update.suffix;

      self.var.editHref.delete.original =
      self.var.editHref.delete.prefix + 
      "&smt=" + sp_param + 
      "&u=" + self.const.usedcar.id +
      "&i=" + self.data[ self.var.order ].imageId + 
      "&" + self.var.editHref.delete.mode + 
      "&" + self.var.editHref.delete.suffix;

      self.var.editHref.insert.original =
      self.var.editHref.insert.prefix + 
      "&smt=" + sp_param + 
      "&u=" + self.const.usedcar.id +
      "&order=" + slideOrder +
      "&i=" + self.data[ self.var.order ].imageId + 
      "&" + self.var.editHref.insert.mode +
      "&" + self.var.editHref.insert.suffix;

      self.obj.imageLink.attr("href", self.var.editHref.update.original);

      self.obj.deleteLink.attr("href", self.var.editHref.delete.original);

      self.obj.insertLink.attr("href", self.var.editHref.insert.original);

    },

    // キャプションのHTML更新
    html : function()
    {

      var self = UsedCarDetailSlideShowEvent,
          // caption = $.trim( self.data[self.var.order].caption ),
          caption = self.data[self.var.order].caption,
          imageId = self.data[self.var.order].imageId;

      self.obj.caption.attr("data-inplace-element-id", "carDetail_imageCaption_"+imageId).html(caption);

      if( edit_param === "0" && caption.length === 0) {

        self.obj.capWrapper.slideUp();

      } else {

        self.obj.capWrapper.slideDown();

      }
    },

    // キャッシュとして持ってるキャプションデータの更新。
    cache : function( imageIdString, text )
    {

      var self = UsedCarDetailSlideShowEvent,
          imageId = imageIdString.replace("carDetail_imageCaption_", "");

      self.data.forEach( function( value, index, original ){

        if( value.imageId === imageId ) self.data[index].caption = text;

      })

    },


    // 矢印の表示非表示
    arrow : function()
    {

      var self = UsedCarDetailSlideShowEvent;

      self.obj.arrow.left.stop( true, false ).animate({"opacity": Number(self.is.visible.arrow.left) }, 0);

      self.obj.arrow.right.stop( true, false ).animate({"opacity": Number(self.is.visible.arrow.right) }, 0);

      self.obj.arrow.thumbLeft.stop( true, false ).animate({"opacity": Number(self.is.visible.arrow.thumbLeft) }, 0);

      self.obj.arrow.thumbRight.stop( true, false ).animate({"opacity": Number(self.is.visible.arrow.thumbRight) }, 0);

    },

    // 矢印の表示非表示設定の更新
    visibleArrow : function()
    {

      var self = UsedCarDetailSlideShowEvent;

      if( self.data.length > 1 ){

        if( self.var.order === 0 ){

          self.is.visible.arrow.left = false;

          self.is.visible.arrow.right = true;

          self.is.visible.arrow.thumbLeft = false;

          self.is.visible.arrow.thumbRight = true;


        } else if( self.var.order === self.const.count.image - 1 ){
        
          self.is.visible.arrow.left = true;

          self.is.visible.arrow.right = false;

          self.is.visible.arrow.thumbLeft = true;

          self.is.visible.arrow.thumbRight = false;
        
        } else {

          self.is.visible.arrow.left = true;

          self.is.visible.arrow.right = true;

          self.is.visible.arrow.thumbLeft = true;

          self.is.visible.arrow.thumbRight = true;
        
        }

      }

    },

    // 矢印の上にあるマスクの表示更新
    arrowMask : function(){

      var self = UsedCarDetailSlideShowEvent;

      if( self.is.visible.arrow.left ){

        self.obj.arrow.mask.left.addClass("hover");
        self.obj.arrow.mask.thumbLeft.addClass("hover");

      } else {

        self.obj.arrow.mask.left.removeClass("hover");
        self.obj.arrow.mask.thumbLeft.removeClass("hover");

      }

      if( self.is.visible.arrow.right ){

        self.obj.arrow.mask.right.addClass("hover");
        self.obj.arrow.mask.thumbRight.addClass("hover");

      } else {

        self.obj.arrow.mask.right.removeClass("hover");
        self.obj.arrow.mask.thumbRight.removeClass("hover");

      }

    },

    // ウインドウサイズ変更時
    windowSize : function()
    {

      var self = UsedCarDetailSlideShowEvent;

      if( $(window).width() <= 480 || self.design_number === "mobile_first2" || self.design_number === "mobile_first3" ){

        $(parent.document).find("#js-slideImage").css({"width": self.const.count.image * 100 + "%"});

        self.obj.arrow.right.css({"top" : $(parent.document).find("#js-slideImage").height() / 2});

        self.obj.arrow.left.css({"top" : $(parent.document).find("#js-slideImage").height() / 2 });

        self.const.width.slide = self.obj.slideWrapped.width();

      } else {

        $(parent.document).find("#js-slideImage").css({"width":"auto"});

        self.obj.arrow.right.css({"top" : "50%"});

        self.obj.arrow.left.css({"top" : "50%" });

        self.const.width.slide = 640;

      }

        self.var.x.margin.slide = self.var.order * self.const.width.slide * (-1);
        
        self.scrollAction( false );

    },

    editCarData : function()
    {
      var self = UsedCarDetailSlideShowEvent;

      $(".car_gall_main").attr("data-image-id", self.data[ self.var.order ].imageId);
    }

  },

  /**
   * スクロールイベント時の処理をひとまとめにしてる。
   * @param  {Boolean} isAnimation [アニメーションするかどうか]
   */
  scrollAction : function( isAnimation )
  {

    this.refresh.visibleArrow();

    this.scrollThumbnail( isAnimation );

    this.scrollImage( isAnimation );

    this.refresh.html();

    this.refresh.editHref();

    this.refresh.editCarData();

    this.refresh.arrow();

    this.refresh.arrowMask();

  },

  // イメージのスクロール処理
  scrollImage : function( isAnimation )
  {

    var self = UsedCarDetailSlideShowEvent;

    isAnimation = isAnimation === undefined ? true : false;

    if( self.obj.window.width() > 480 ){

      self.var.x.margin.slide = self.var.order * self.const.width.slide * (-1);
    
    } else {

      self.var.x.margin.slide = -1 * ( self.var.order ) * 100 + "%";

    }

    $(parent.document).find("#js-slideImage").stop( false, true ).animate({"margin-left" : self.var.x.margin.slide}, isAnimation ? self.animationSpeed : 0);

  },

  /// サムネイル スクロール処理
  scrollThumbnail: function(isAnimation) {

    var self = UsedCarDetailSlideShowEvent,
        position = self.var.order,
        itemWidth = self.const.width.icon,
        imageNum = self.const.count.image;

    isAnimation = isAnimation === undefined ? true : false;


    var centerPosition = Math.ceil($('#carGallMask').outerWidth() / 2); // 左端から真中までのpixel

    var centerMaskPosition = centerPosition - 40; 

    var minMargin = $('#carGallMask').outerWidth() - (itemWidth * imageNum);
    if (minMargin > 0) {
      minMargin = 0; // マージン最小値（マイナスの値で最小。絶対値では最大）
    }

    var positionCenterPixel = Math.ceil((itemWidth * position) + (itemWidth / 2));

    var thumbLeftMargin = centerPosition - positionCenterPixel;


    // 左から何個か
    if (thumbLeftMargin > 0) {

      thumbLeftMargin = 0;

      mp = position * itemWidth;

    // 右から何個か
    } else if (thumbLeftMargin < minMargin) {
    
      thumbLeftMargin = minMargin;
    
      mp = position * itemWidth + thumbLeftMargin;
    
    } else {

      mp = centerMaskPosition;
    
    }
    
      
    $("#js-slideIcon").stop( false, true ).animate({"margin-left":thumbLeftMargin}, isAnimation ? self.animationSpeed : 0);
      
    $("#js-currentMask").stop( false, true ).animate({"left":mp}, isAnimation ? self.animationSpeed : 0);

    if( $(".delete_checkbox_outer").length > 0 ) {
        $("#deleteCheckBoxArea").stop( false, true ).animate({"margin-left":thumbLeftMargin}, isAnimation ? self.animationSpeed : 0)
    }


  },

  /// キャプション文字列入れ替え処理
  // ※編集内容を保持する
  switchCaption: function($oldLi, $newLi) {
    var cgmCapHtml =  $newLi.find("span").html();
    $oldLi.find("span").html($("#cgmCap").html());


    // 公開画面ではキャプション文字列がない場合は表示しない
    if ($.trim(cgmCapHtml).length == 0) {
      // 編集画面
      if ($("#cgmCap").hasClass('inplace') || $("#cgmCap").hasClass('inplace_now')) {
        cgmCapHtml = $("#cgmCap").data('inplaceEmptyText') ? $("#cgmCap").data('inplaceEmptyText') : 'クリックして文字を入力できます。';
        $('#cgmCapWrapper').show();
      // 公開画面
      } else {
        $('#cgmCapWrapper').hide();
      }
    // キャプションがある場合は常に表示
    } else {
      $('#cgmCapWrapper').show(); // 隠すボタンで消されていた場合にも復活
    }

    $("#cgmCap").html(cgmCapHtml);
  },

  // 選択中の中古車画像IDをメニューURLへ補完
  // ※内容は編集画面でのみ必要な処理だが、公開再度でも叩く
  replaceUsedCarEditLinkImageId: function(id) {
    // 削除ボタン
    var $target = $('.pict_edit_btn_usedcar a');
    $target.each(function() {
      // thickboxのパラメータより前に追加する必要がある模様。ひとまず先頭へ追加。
      $(this).attr('href', $(this).attr('href').replace(/[&\?]image_id=\d*&?/g, '').replace(/\.php\??/, '.php?image_id=' + id.toString() + '&'));
    });

    // 編集リンク（thickbox）
    $target = $('.car_gall_main a.thickbox');
    $target.each(function() {
      // thickboxのパラメータより前に追加する必要がある模様。ひとまず先頭へ追加。
      $(this).attr('href', $(this).attr('href').replace(/[&\?]image_id=\d*&?/g, '').replace(/\.php\??/, '.php?image_id=' + id.toString() + '&'));
    });

    // 画像キャプション直感編集用 ID
    $('#cgmCap').attr('data-inplace-element-id', 'carDetail_imageCaption_' + id.toString());
  }

};

function searchMenuTextPcEvent( self )
{
    if( self.val() === "" ) {
      shouldOpenMegaMenu = true;
      resetSearchResult( self );
      return false;
    }

    shouldOpenMegaMenu = false;

    self.closest(".searchMenuOuter").find(".js-searchMenuSubmit").trigger("click");
}


function resetSearchResultSp()
{
  $(".js-subPageWrapper").each(function(){
    $(this).attr("data-show", 1);
    $(this).find(".js-middleMenuOpenTrigger").each(function(){
      $(this).attr("data-show", 1).attr("data-middle-menu-state", "open").css({"display": "none"}).find(".middle-menu__wrap").css({"  display": "none"});
    })

    $(this).find(".js-searchTargetList").each(function(){
      $(this).attr("data-show", 1).css({"display": "none"});
    })

    $(this).find(".js-menuOpenTrigger").text("+");

  });

  $(".js-searchMenuTextSp").val("");
  $(".menu_wrapper").attr("data-searched-empty-show", 0);
  $(".searchedEmpty").attr("data-show", 0);
  $(".searchedResultStringOuter").attr("data-show", 0);
}

function searchMenuTextSpEvent( self )
{
      if( self.val() === "" ) {

        resetSearchResultSp();
        return false;

      }

      $(".js-searchMenuSubmitSp").trigger("click");
}


// ------------------------------------------------------------
// フォーム ファイルアップロードのサイズ限界を超えた時のアラート
// 4sale から移植
// ------------------------------------------------------------

//--画像アップ----------------------------//


    /**
     * スマホモード時の3連メニューの高さを合わせる処理
     * 3つの高さをおしなべて最も高いものに合わせる
     */
  function adjustH2boxHeightBySp(){
      var targetDom = [];
      var maxHeight = 0;

      for(var i = 1; i < 4; i++ ){
      if( $("#h2_box_" + i + ' a').length != 0 ){
          targetDom.push('#h2_box_' + i + ' a');
        }
      }

      for( var i = 0; i < targetDom.length; i++ ){

        $(targetDom[i]).removeAttr("style");

        var tmpHeight = $(targetDom[i]).height();

        if( tmpHeight > maxHeight ){
          maxHeight = tmpHeight;
        }

      }

      for( var i = 0; i < targetDom.length; i++ ){
        $(targetDom[i]).css({"height":maxHeight});
      }
  }




/**************************************************************************/
//スマホ用（公開画面）のみに利用する処理を関数にひとまとめ
/**************************************************************************/
function smtOnlyFunction(){

  /**************************************************************************/
  //メニューのオンオフ
  /**************************************************************************/
  var tgl_cnt = 0;
  var menu_wrapper = $(".menu_wrapper");
  var smt_menu_btn = $("#smt_menu_btn");


  $("body").prepend($('<div id="body_overlay"></div>'));

  var eventType = 'click';
  if (isSmartPhoneAccess()) {
    eventType = 'touchend';
  }

  var overLay = $("#body_overlay");
  smt_menu_btn.on(eventType,function(){
    menu_wrapper.toggle('fast',function(){
      if(tgl_cnt%2 == 0){
        smt_menu_btn.attr("class","smt_menu_btn_on");
      }else{
        smt_menu_btn.attr("class","smt_menu_btn_off");
      }
      tgl_cnt++;

    });
    overLay.toggle(0);
  });

  overLay.on(eventType,function(){
    menu_wrapper.hide("fast");
    overLay.fadeOut("fast");
    if(tgl_cnt%2 == 0){
      smt_menu_btn.attr("class","smt_menu_btn_on");
    }else{
      smt_menu_btn.attr("class","smt_menu_btn_off");
    }
    tgl_cnt++;
  });

  /**************************************************************************/
  //スマホ用（公開画面）　3連メニューの画像を削除し、代わりにテキストを入れる
  /**************************************************************************/
  // 
  for(var i=1;i<4;i++){

    var altText = $("#h2_box_" + i).find("img").eq(0).attr("alt");

    if ( $("#h2_box_" + i).find("img").eq(0).attr("alt") && !$("#h2_box_" + i +" .nav_link").hasClass("hasEditedText") ) {
      $("#h2_box_" + i +" .nav_link").text($("#h2_box_" + i).find("img").eq(0).attr("alt").replace(/画像$/,''));
    }

  }

  /**************************************************************************/
  //スマホ用（公開画面）　サイドバーアコーディオン
  /**************************************************************************/

  // 店舗情報はデフォルトで表示させる
  $(".sidebar_shopinfo_detail").find(".map_box, #sidebar_shp_inf, #sidebar_shp_inf_googlemap").css({ "display": "block" });

  // サイドバー全部展開した状態にする
  $(".side_div_box_common h4").addClass("activate");

  sidebarFunction();

  /**************************************************************************/
  //スマホ用（公開画面）　ヘッダにょんっと縮める やっていることはクラスの付け外し
  /**************************************************************************/

  $(function(){


    var ScrollingHeaderController = function()
    {

      var self = this;

      this.beforePosY = 0;
      this.posY = 0;
      this.forceFixedPosY = 200;

      this.scrollSpeedThreshold = 15;
      this.interval = 50;

      this.scrollingTimer;

      this.throttle = function( fn, interval )
      {

        var time = Date.now();

        return function(){

          if( (time + interval - Date.now()) < 0 ){

            fn();
            time = Date.now();

          }         

        }

      }

      this.bind = function()
      {

        $(window).scroll( self.throttle(function(){

          self.posY = self.getPositionY();

          if( self.body.hasClass("js-menuOpened") ){ // ハンバーガーメニュー展開時は強制表示

            if( self.container.hasClass( self.minimizeClassName ) ){

              self.container.removeClass( self.minimizeClassName );

            }

          } else {

            if( self.beforePosY > self.forceFixedPosY ){

              var abs = Math.abs( self.beforePosY - self.posY );

              if( abs > self.scrollSpeedThreshold ){ // 震えレベルの微妙なスクロールに反応させないため

                if( self.beforePosY < self.posY ){

                  // 下スクロール
                  if( !self.container.hasClass( self.minimizeClassName ) ){

                    self.container.addClass( self.minimizeClassName );

                  }

                } else {

                  // 上スクロール
                  if( self.container.hasClass( self.minimizeClassName ) ){

                    self.container.removeClass( self.minimizeClassName );

                  }
                
                }

              }

            } else {

              if( self.container.hasClass( self.minimizeClassName ) ){

                self.container.removeClass( self.minimizeClassName );

              }

            }

          }

          self.beforePosY = self.getPositionY();

        }, self.interval) );

      }

      this.getPositionY = function()
      {

        return $(window).scrollTop();

      }

      this.run = function()
      {

        self.bind();

      }


      this.__constructor = function()
      {

        self.body      = $("body");
        self.container = $('#conteiner');
        self.header    = $("#smt_head_base")

        self.minimizeClassName  = "js-header_minimize";

      }()


    }

    var scrollingHeaderController = new ScrollingHeaderController();
    scrollingHeaderController.run();

  });

  /**************************************************************************/
  //スライダーのスパンの高さを揃える。
  /**************************************************************************/
  var slideSpans = $('#sliderContent').find('.sliderImage').find('span');
  var mostHighHeight = 0;
  var len = slideSpans.length;
  for ( var i = 0 ; i < len ; i++ ) {
      var span = slideSpans.eq(i);
      var spanHeight = span.height();
      if ( spanHeight > mostHighHeight ) {
          mostHighHeight = spanHeight;
      }
  }
  slideSpans.css({'height': mostHighHeight + 'px'});

}

/**************************************************************************/
//mobile_first3専用処理  PC時編集側でサイドバーのアコーディオンを可能にする
/**************************************************************************/
function onlyMobileFirst3SidebarFunction(){

  //以下ふたつは、スマホの時の表示に合わせるための対応。
  // 店舗情報、カレンダーはデフォルトで表示させる
  $(".sidebar_shopinfo_detail").find(".map_box, #sidebar_shp_inf, .sidebar_ad_banner, #sidebar_shp_inf_googlemap").css({ "display": "block" });
  $(".sidebar_shopinfo_detail h4").addClass("activate");
  $("#eigyoubi_cal h4").addClass("activate");

  // 店舗情報、カレンダー以外はあらかじめ閉じておく
  $("#side_lead_block_01").find(".box_side_topics").css({ "display": "none" });
  $("#side_lead_block_02").find(".box_side_topics").css({ "display": "none" });
  $("#sidetopics01").find(".box_side_topics").css({ "display": "none" });
  $("#sidetopics02").find(".box_side_topics").css({ "display": "none" });
  $("#side_link_block").find(".link").css({ "display": "none" });
  $("#side_link_block").find(".link_banner").css({ "display": "none" });

  sidebarFunction();

}

/**************************************************************************/
//サイドバーのアコーディオン共通処理群
/**************************************************************************/
function sidebarFunction(){

  $("#shop_info_title").off("click.designEvent").on("click.designEvent",function(){
    $(".sidebar_shopinfo_detail").find(".map_box, #sidebar_shp_inf, .sidebar_ad_banner, #sidebar_shp_inf_googlemap").slideToggle();
    $(this).toggleClass("activate");
  });


  $("#side_lead_block_01 h4").off("click.designEvent").on("click.designEvent",function(){
    $("#side_lead_block_01").find(".box_side_topics").slideToggle();
    $(this).toggleClass("activate");
  });


  $("#side_lead_block_02 h4").off("click.designEvent").on("click.designEvent",function(){
    $("#side_lead_block_02").find(".box_side_topics").slideToggle();
    $(this).toggleClass("activate");
  });


  $("#sidetopics01 h4").off("click.designEvent").on("click.designEvent",function(){
    $("#sidetopics01").find(".box_side_topics").slideToggle();
    $(this).toggleClass("activate");
  });


  $("#sidetopics02 h4").off("click.designEvent").on("click.designEvent", function() {
    $("#sidetopics02").find(".box_side_topics").slideToggle();
    $(this).toggleClass("activate");
  });


  $("#side_link_block h4").off("click.designEvent").on("click.designEvent",function(){
    $("#side_link_block").find(".link").slideToggle();
    $("#side_link_block").find(".link_banner").slideToggle();
    $(this).toggleClass("activate");
  });

  $("#eigyoubi_cal h4").off("click.designEvent").on("click.designEvent", function(e) {
    $(".monthlyCalendarWrapper").slideToggle();
    $(this).toggleClass("activate");
  })

  $("#mobile_QR_info h4").off("click.designEvent").on("click.designEvent", function(e) {
    $(".QR_innerBlock").slideToggle();
    $(this).toggleClass("activate");
  });

}

/**************************************************************************/
//スマホ公開画面  動画の幅をメインコンテンツの幅いっぱいにそろえる
/**************************************************************************/
function moviefitting(){

  var cnt_width = $("#main_contents").width();
  var videoFrame = $("div.img_box_left iframe,div.img_box_right iframe");
  cnt_width = cnt_width * 0.9;
  videoFrame.attr("width",cnt_width);
  videoFrame.attr("height",cnt_width * 0.5625);
}

/**************************************************************************/
//スマホ公開画面  マップの幅をコンテンツの幅いっぱいに広げる
/**************************************************************************/
function googleMapFitting(){
  var mapWiz = $(".map_big").width(); // map_bigクラスはスマホ時には95%
  var mapFrame = $(".map_big iframe");
  mapFrame.attr("width",mapWiz);
  mapFrame.attr("height",mapWiz);
}


/**************************************************************************/
// フォームの切り替え処理
/**************************************************************************/
function changeEstimateForm ( index ) {

  $slctr = "#submenu_form_" + index;

  if ( $($slctr).length == 0  ) {
    return;
  }

  // 選択されたフォーム以外のフォームのセレクタ
  $slctr2 = $(".est_table_car:not(" + $slctr + ")");

  // 非表示でも同じFORMのスコープのため、disabledにしないとポストされてしまう。
  $slctr2.find("input").attr("disabled" , "disabled" );
  $slctr2.find("textarea").attr("disabled" , "disabled" );
  $slctr2.find("select").attr("disabled" , "disabled" );

  // 非選択フォームについてあるJSバリデートを取り除く。
  $slctr2.find("input").removeAttr("onblur");
  $slctr2.find("textarea").removeAttr("onblur");
  $slctr2.find("select").removeAttr("onblur");
  
  // 選択されたフォームにdisabledが点いていることを想定して属性を削除しておく。
  $($slctr).find("input").removeAttr("disabled");
  $($slctr).find("textarea").removeAttr("disabled");
  $($slctr).find("select").removeAttr("disabled");
  

  /*$($slctr + ' input:not(.submenu_radio_' + index + ')' ).removeAttr("checked");
  $($slctr + ' input:not(.submenu_radio_'+ index + ')' ).removeAttr("checked");*/


  // attr()ではcheckbox、radioボタンの値の付け替えがうまく行かないため、prop()を利用する。
  $($slctr + ' input.submenu_radio_' + index ).prop("checked",true);

  // 選択されたフォームでJSバリデートが効くように属性を追加する
  var valid_eles = ['input','textarea','select'];

  for ( var i = 0 , len = valid_eles.length; i < len ; i++ ) {

    var input_ele = $($slctr).find(valid_eles[i]);

    for ( var j = 0 , inp_len = input_ele.length ; j < inp_len ; j++ ) {
      if ( input_ele.eq(j).hasClass('valid_form') ) {
        input_ele.eq(j).attr("onblur" , "Validator.check(this)" );
      }
    }
  }


  
  if( dktlExtension ){

    // .js-inputFileTrigger だけ別で  
    $($slctr).find(".js-shouldValidate").attr("onblur" , "Validator.check(this)" )


    // 背景色アラートも消す
    $(".js-validated").each(function(){
      $(this).css("backgroundColor", "");
    });

  }


  $('#submenu_id').val(index);
  $(".est_table_car:not(" + $slctr + ")").animate({opacity : 0}, 500).css("display", "none");
  $($slctr).css("display", "block").animate({opacity : 1}, 500)

}




/**************************************************************************/
//スマホ用（公開画面）　レスポンシブでJSを切り替える処理　2014-07-04　高橋追加
/**************************************************************************/

var SPJSFLAG = 0;//スマホJS適用フラグ 0:適用しない 1:適用する
var smt_count = 0;//PCサイズからスマホサイズにリサイズされたときカウント
var pc_count  = 1;//スマホサイズからPCサイズにリサイズされたときディスカウント

  $(window).resize(function(){

      // レスポンシブに対応していないIE7,8の時には処理を行わない。
    if (UA.browser == 'ie' && (UA.IEVersion == 7 || UA.IEVersion == 8)) {
      return;
    }

    // ウインドウサイズが480以下の時はSP用JS適用フラグを立てる
    // 編集モードかつ、スマホ編集モード
    if( $(window).width() < 480 ||
      ( edit_param === "1" && sp_param === "1")){
      SPJSFLAG = 1;
    }else{
      SPJSFLAG = 0;
      pc_count++;
    }

    // 画面が480px（スマホサイズ）以下で、
    // スマホ適用フラグが立っている場合の処理
    if(SPJSFLAG == 1 && smt_count < 1 && sp_param == 1){//一回のみの処理

      $(".side_bar_sub").css({"position":"static","marginLeft":"0"});
      // $(".nav_link").css({height:"auto"});
      //メガメニューの挙動を切る
      GlobalMenuEvent.removeEvents();

      // アコーディオンULの表示
      $(".menu li ul").css({"display":"block"});
      $(".menu li ul li").css({"display":"none"});

      sidebarResize( SPJSFLAG );

      if (PAGE_ID === "20") {
        $(function() {
          if ($("#middle_top_price01").length > 0) {
            globalCarPriceList.carPriceList(SPJSFLAG);
          }
        });
      }

      smtOnlyFunction();
      smt_count++;
      pc_count = 0;//スマホサイズにリサイズされたときに初期化

    }else if(SPJSFLAG == 0 && pc_count == 1 && sp_param == 1){//一回のみの処理
        // スマホサイズからPCサイズに変わった場合の処理

      $(".side_bar_sub").css({"marginLeft":"0"});

      //smtOnlyFunction()で設定したイベントの削除
      $("#smt_menu_btn").off("click").off("touchend");
      $("#shop_info_title").off("click");
      $("#sidetopics01 h4").off("click");
      $("#sidetopics02 h4").off("click");
      $("#side_link_block h4").off("click");
      $("#sv_title").off("click");
      
      // documentにbindしたため。
      $(document).off("click", "#eigyoubi_cal h4");

      // モバイルファースト３の時のみ、再度イベントをバインドしなおす。
      if( design_number === "mobile_first3" || design_number === "mobile_first4" ){
        onlyMobileFirst3SidebarFunction();
      }

      //smtOnlyFunction()で追加した要素などを削除・非表示
      $("#body_overlay").remove();
      $(".mega_menu ul li").css({"display":"block"});
      $(".menu li ul li").css({"display":"block"});
      GlobalMenuEvent.init(design_number, side_bar);

      sidebarResize( SPJSFLAG );

      if (PAGE_ID === "20") {
        $(function() {
          if ($("#middle_top_price01").length > 0) {
            globalCarPriceList.carPriceList(SPJSFLAG);
          }
        });
      }

      smt_count = 0;//PCサイズにリサイズされたときに初期化
    }

    // スマホサイズ（480ｐｘ）以上のウインドウサイズ
    // 且つスマホサイズからPCサイズにリサイズした時（1回のみ）
    // 且つスマホ適用フラグは立っている
    // 且つ編集画面ではない場合、
    // 非表示になっているPC用のメニューブロックを再表示する。
    if(SPJSFLAG == 0 && pc_count == 1 && sp_param == 1 && edit_param==0){
      $(".menu_wrapper").css({"display":"block"});
    }


    var mvTimer = false;  // 動画リサイズ処理クリア用timer変数
    var mapTimer = false; // googleMapリサイズ処理クリア用timer変数
    var menuTimer = false;  // 三連メニュー高さ調整処理クリア様timer変数
    // リサイズごとに処理が必要なもの
    // 動画の横幅、地図の横幅、スライダーの横幅、3連メニューの高さ
        // セットタイムアウトを使うのは、リサイズイベントごとに処理が発火すると重くなるため
    if(SPJSFLAG == 1 && sp_param == 1){
      if(mvTimer!==false){
        clearTimeout(mvTimer);
      }else if(mapTimer!==false){
        clearTimeout(mapTimer);
      } else if(menuTimer !== false){
        clearTimeout(menuTimer);
      }

      mvTimer = setTimeout("moviefitting()",200);
      mapTimer = setTimeout("googleMapFitting()",200);
      menuTimer = setTimeout("adjustH2boxHeightBySp()",200);
    }

    if( design_number == 'sky2' ) {
        if( window.innerWidth > 480 ) {
           $('#carSearch_public').css({padding: '30px', background: '#FFF', width: '730px'});
        } else {
           $('#carSearch_public').removeAttr('style');
        }
    }

  });

// サイドバーを画面サイズによって表示非表示にする
function sidebarResize( SpJsFlag ) {

  if( SpJsFlag === 1 ) {
    var noneOrBlock = "none";
  } else {
    var noneOrBlock = "block";
  }

  var shop_info_children = $(".sidebar_shopinfo_detail").children();
  var shop_info_len = shop_info_children.length;
  for(var i=1; i<shop_info_len;i++){
    shop_info_children.eq(i).css({"display": noneOrBlock});
  }

  var topic_chldren = $("#sidetopics01").children();
  var topic_len = topic_chldren.length;
  for(var i=1; i<topic_len;i++){
    topic_chldren.eq(i).css({"display": noneOrBlock});
  }

    var topic02_children = $("#sidetopics02").children().not(":first");
    topic02_children.each(function() {
        $(this).css({"display": noneOrBlock});
    });

  var link_chldren = $("#side_link_block").children();
  var link_len = link_chldren.length;
  for(var i=1; i<link_len;i++){
    link_chldren.eq(i).css({"display": noneOrBlock});
  }

  var sv_children = $(".sv_block").children();
  var shop_info_len = sv_children.length;
  for(var i=1; i<shop_info_len;i++){
    sv_children.eq(i).css({"display": noneOrBlock});
  }

  var eigyoubi_chldren = $("#eigyoubi_cal").children();
  var eigyou_len = eigyoubi_chldren.length;
  for(var i=1; i<eigyou_len;i++){
    eigyoubi_chldren.eq(i).css({"display": noneOrBlock});
  }

}

/**
 * スマホ用ヘッダー（店舗名、メニューなどのブロック）をピンチイン・アウトした時に、
 * Androidのfixedの要素のバグのため、スケールと幅をCSSで明示
 * @param event
 */
function FixedMenuFitted (event) {

  // scaleの算出
  var scale  = window.innerWidth / document.body.clientWidth ;
  // 拡大率の算出
  var fitSize = ( 1 / scale ) * 100 + '%';

  var touches = event.touches;
  var head = $('#smt_head_base');
  var foot = $('#smt_foot_base');


  if ( touches.length >= 1 ) {

    head.css({
      'transform' : 'scale(1)',
      'width'     : fitSize,
      'top'       : '0',
      'left'       : '0'
    });

    foot.css({
      'transform' : 'scale(1)',
      'width'     : fitSize,
      'bottom'    : '0',
      'left'       : '0'
    });
  }

}



/**
 * スマホ用メニュー動作
 */
var SPMenuAction = function()
{

  var self = this;

  // jQueryオブジェクト
  this.obj = {};

  // メニューの状態
  this.state = {
    openMenu : false, // メニューを開いているか否か
    openPage : false, // ページリストを展開しているか
    openPageId : null // 展開しているページID
  };

  // 定数
  this.cs = {
    text : {
      plus : "+",
      minus : "-",
      none : ""
    }
  };

  // アニメーション速度
  this.duration = {
    menu : 300,     // メニュー開閉
    list : 300,     // リスト開閉
  };

  // 遅延
  this.delay = {
    list : 300,
    expand : 0    // リスト拡大アニメーション
  };

  this.clickCount = 0;

  this.menuClicked = false;

  this.processed = false;

  // 背景スクロール制御用
  this.scrollY;


  // メニューの開閉
  this._openMenu = function(){
    self.state.openMenu = true;
    self.obj.body.addClass("js-menuOpened");
  }

  this._closeMenu = function(){
    self.state.openMenu = false;
    self.obj.body.removeClass("js-menuOpened");
    $("#smt_3menu").find(".js-menuArrow").removeClass("open");
    setTimeout( self.expandDown, self.delay.expand );
  }


  // アニメーション
  this.expandUp = function()
  {
    self.obj.wrapper.addClass("expandUp");
  }

  this.expandDown = function()
  {
    self.obj.wrapper.removeClass("expandUp");
  }

  // スクロールの制御
  this.notScroll = function()
  {
    self.scrollY = window.scrollY; // メニューを開いたときのスクロール位置
    window.scrollBy(0,1); // アドレスバーを隠すため、1px 下にスクロール

    self.obj.body.css({
        position: "fixed",
        width: "100%",
        top: "-"+scrollY+"px",
        overflow: "hidden"
    });
  }

  this.scrollable = function()
  {
    self.obj.body.css({
        position: "",
        width: "",
        top: "",
        overflow: ""
    });

    window.scrollTo(0, self.scrollY);
  }



  // ページリストの開閉
  this._openList = function( menuId )
  {

    // 状態操作
    self.state.openPageId = menuId;
    self.state.openPage = true;


    // 色々と太字にする
    self.obj.boldable.filter(function(){
      return $(this).data("menuId") === self.state.openPageId;
    }).addClass("js-bold");


    // ボタンのテキスト変更
    self.obj.trigger.pageOpenerButton.filter(function(){
      return $(this).data("menuId") === self.state.openPageId 
    }).text( self.cs.text.minus );


    // リストをスライドダウン表示
    self.obj.list.filter(function(){
      return $(this).data("menuId") === self.state.openPageId;
    }).addClass("js-pageOpened").find("li.sub--top, li.sub--child").slice(0, 8).slideDown( self.duration.list );

    setTimeout( function(){

      self.obj.list.filter(function(){
        return $(this).data("menuId") === self.state.openPageId;
      }).addClass("js-pageOpened").find("li.sub--top, li.sub--child").slice(8).css("display","block");

    }, self.duration.list + 30 );


  }

  this._isSubMenuOnlyTop = function( menuId )
  {

    var list = self.obj.wrapper.filter(function(){
      return $(this).data("menuId") === menuId;
    }).find("li");

    return list.length === 1;
  }

  this._getSubTopPage = function( menuId )
  {
    return self.obj.wrapper.filter(function(){
      return $(this).data("menuId") === menuId;
    }).find("a").attr("href");
  }

  this._closeList = function()
  {

    // 状態操作
    self.state.openPageId = null;
    self.state.openPage = false;

    // 色々と太字にしたものを通常に
    self.obj.boldable.removeClass("js-bold");

    // ボタンのテキストをデフォルトに
    self.obj.list.each(function(){

      var accodionBtn = $(this).siblings(".sp_freepage_accordion_btn"),
          menuOpenerBtn = accodionBtn.find(".js-menuOpenTrigger");

      if($(this).find("li").length === 1 ) {
        menuOpenerBtn.text(self.cs.text.none);
      }else{
        menuOpenerBtn.text(self.cs.text.plus);
      }
    });

    // リストを元に戻す
    $(".js-pageOpened").find("li.sub--top, li.sub--child").slice(8).css("display","none");
    $(".js-pageOpened").find("li.sub--top, li.sub--child").slice(0, 8).slideUp( self.duration.list );

    $(".js-pageOpened").removeClass("js-pageOpened");

  }


  // イベントバインド
  this._bind = function()
  {

    // メニューの開閉
    this.obj.trigger.menuOpener.click(function(){

      if( !self.state.openMenu ){

        self._openMenu();
        setTimeout( self.expandUp, self.delay.expand );

        self.notScroll();

      } else {

        self._closeMenu();
        setTimeout( self._closeList, self.delay.list );

        self.scrollable();

      }

    });


    // ページの開閉
    this.obj.trigger.pageOpener.click(function(){

      var pageOpener = $(this);

      if( pageOpener.hasClass("js-headerMenu") ) {
        var href = pageOpener.attr("data-href");

        location.href = href;
        return false;
      }

      // ３連メニューのクリックじゃなければtrue
      if( !pageOpener.hasClass( "js-headerMenu" ) ) {
        self.menuOpener( pageOpener );
        return false;
      }

    })

    this.obj.trigger.menuArrow.click(function(){

      var headerMenu = $(this).closest("li").find(".js-headerMenu");

      self.menuOpener( headerMenu );

    });

  }

  this.menuOpener = function( selector )
  {
      var tmp = selector.data("menuId");

      self.closeArrow();

      if(  self._isSubMenuOnlyTop(tmp) ){
        var href = self._getSubTopPage(tmp);

        if ( typeof href !== "undefined"){
          window.location.href = href;  
        }
        
        return false;
      }


      // 開いていない
      if( !self.state.openMenu ){

        self._openMenu();

        self.openArrow( tmp );

        setTimeout(function(){
          self._openList( tmp )
        }, self.delay.list );

        self.notScroll();

      // メニュー開いている
      } else {

        // ページが展開されている
        if( self.state.openPage ){

          // 同じページだ
          if( self.state.openPageId === tmp ){

            // メニューボタンが押下さている => 閉じるだけ
            if( selector.data("openerType") === "button" ){

              self._closeList();

            // その他 => メニューごと閉じる
            } else {

              self._closeMenu();
              $("#smt_3menu").find(".js-headerMenu[data-menu-id=" + tmp + "]").closest("li").find(".js-menuArrow").removeClass("open");

              setTimeout( self._closeList, self.delay.list );

              self.scrollable();
            
            }
            

          // 違うページだ => ページ展開を閉じた後開く
          } else {

              self._closeList();
              setTimeout(function(){
                  self._openList( tmp )
                  self.openArrow( tmp );

              }, self.delay.list );
            }

        } else {
          self.openArrow( tmp );
          self._openList( tmp );
        
        }

      }
  }

  this.openArrow = function( menuId )
  {
    $("#smt_3menu").find(".js-headerMenu[data-menu-id=" + menuId + "]").closest("li").find(".js-menuArrow").addClass("open");
  }

  this.closeArrow = function( menuId )
  {
    $("#smt_3menu").find(".js-menuArrow").removeClass("open");
  }

  this._set = function()
  {
    this.obj = {
      body : $("body"),
      wrapper : $(".js-subPageWrapper"),
      list : $(".js-subPageList"),
      trigger : {
        pageOpener : $(".js-menuOpenTrigger"),
        menuOpener : $("#menu_trigger"),
        pageOpenerButton : $(".js-menuOpenTrigger").filter(function(){ return $(this).data("openerType") === "button" }),
        menuArrow : $(".js-menuArrow")
      },
      boldable : $(".js-boldable")
    }
  }


  // 「トップページ」という接尾辞の追加
  // メガメニューか否かでHTMLの構成が変わってるんで、JSで補正
  this._fixListContents = function()
  {

    this.obj.list.each(function(){

      // mega
      if( $(this).find("li").length > 6 ){

        var top = $(this).find("li").eq(0).find("a");

        top.html( top.html() + "<span class = 'js-addListContents'>&nbsp;トップ</span>" );

      // normal
      } else {

        if($(this).find("li").length === 0 ) {
          if($(window).width() > 480){
            // PC
            return;
          }else{
            // mobile
            var accodionBtn = $(this).siblings(".sp_freepage_accordion_btn"),
                menuOpenerBtn = accodionBtn.find(".js-menuOpenTrigger");
            
            menuOpenerBtn.text("");
          }
        }

        var top = $(this).closest(".js-subPageWrapper").find("a").eq(0).clone();
        top.html( top.html() + "<span class = 'js-addListContents'>&nbsp;トップ</span>" );

        $(this).prepend( $("<li class = 'js-addListContents sub'>").html( top ) );
      }

    })

  }

  this.__construct = function()
  {
    self._set();
    // self._fixListContents();
    self._bind();
  }();
  
}



/**
 * フォルダに関する機能
 */
var OpenMiddleMenu = function( trigger )
{

    var self = this;

    this.duration = 200; // ms

    this.object = {
        trigger        : null,
        megaMenuWrap   : null,
        middleMenuWrap : null
    }

    this.start = function()
    {

        self.openMiddleMenu();

    }


    this.shouldResize = function()
    {

      var height      = self.object.megaMenuWrap.outerHeight();
      var savedHeight = self.object.megaMenuWrap.attr("data-saved-height");

      return savedHeight >= height;

    }

    this.openMiddleMenu = function()
    {

        if( !self.object.middleMenuWrap.is(':animated') ){

            self.object.trigger.data("middle-menu-state","open");
            self.object.trigger.attr("data-middle-menu-state","open");

            self.object.middleMenuWrap.slideDown(self.duration);

            if( $(window).width() > 480 ){ // PCのみ

                // 展開後にメニューの高さを計測
                setTimeout(function(){

                    var height      = self.object.megaMenuWrap.outerHeight();
                    var savedHeight = self.object.megaMenuWrap.attr("data-saved-height");
                    var maxHeight   = self.object.megaMenuWrap.css("max-height");

                    if( typeof maxHeight !== "undefined" ) maxHeight = parseInt(maxHeight); // int値に変換

                    if( maxHeight < height ) height = maxHeight // CSSで指定している max-height以上にはならないように

                    // savedHeightが未定義、または いま開いた状態の方が大きい場合
                    if( typeof savedHeight === "undefined" || savedHeight < height ){

                      self.object.megaMenuWrap.attr( "data-saved-height", height );
                      self.fixMinHeight( height );

                    }

                }, self.duration );

            }

        }

    }


    this.fixMinHeight = function( height )
    {

        self.object.megaMenuWrap.css("min-height", height);

    }

    this.clearHeight = function()
    {

        var tmpHeight = self.object.middleMenuWrap.outerHeight();

        self.object.megaMenuWrap.css("min-height", tmpHeight + "px");
        self.object.megaMenuWrap.attr("data-saved-height", "");

    }

    this.existOpenedMiddleMenu = function()
    {

        var exist = false;

        return exist;

    }


    this.hideOtherMiddleMenu = function()
    {

        self.object.middleMenuWrap.closest("li").siblings().each( function(index, e){

            $(e).data("middle-menu-state","close");
            $(e).attr("data-middle-menu-state","close");

            $(e).find(".middle-menu__wrap").slideUp(self.duration);

        });

    }


    this.closeMiddleMenu = function()
    {

        if( !self.object.middleMenuWrap.is(':animated') ){

            self.object.trigger.data("middle-menu-state","close");
            self.object.trigger.attr("data-middle-menu-state","close");

            self.object.middleMenuWrap.slideUp(self.duration);

        }

    }


    this.ready = function()
    {

        self.object = {
            megaMenuWrap : trigger.closest(".ul_sub"),
            trigger : trigger,
            middleMenuWrap : trigger.find(".middle-menu__wrap"),
        }

    }

    this.immediatelyCloseMenu = function()
    {

        self.ready();
        self.hideOtherMiddleMenu();

    }

    this.close = function()
    {

        self.ready();
        self.closeMiddleMenu();

    }

    this.run = function()
    {

        self.ready();
        self.start();

    }

}



$(function(){

  // 営業日カレンダーAjax処理
  var calendar = {

    callBackTime : 3000,
    maxCallBackCount : 5,
    currentCallBackCount : 0,

    obj : {
      wrapped : $("#js-calendarWrapped"),
    },

    run : function()
    {
      if( this.obj.wrapped.length !== 0 ) this.getHtml(); 
    },

    returnRoot : function()
    {
      // 参考 : https://okinawa.razona.jp/1533
      return location.origin + location.pathname.replace(new RegExp("(?:\\\/+[^\\\/]*){0,1}$"), "/");
    },

    returnRequestUrl : function()
    {
      return this.returnRoot() + "calendar.html";
    },

    getHtml : function()
    {
      $.ajax({
        async : true,
        type : "GET",
        url : calendar.returnRequestUrl(),
        dataType : "html",
        success : function(data)
        {
          calendar.obj.wrapped.empty().append(data);
        },

        error : function( XMLHttpRequest, textStatus, errorThrown )
        {

          calendar.currentCallBackCount++;

          if( calendar.maxCallBackCount > calendar.currentCallBackCount ){

            // エラーの際は再帰する。ファイルは必ずある、という前提。
            setTimeout(function(){
                
              calendar.getHtml();

            }, calendar.callBackTime);

          }
          
        }

      })

    },

  }


  // 実行

  // json形式で読み込むようになったので、こちらの処理は実行しなくていい
  // 現時点でhtmlのカレンダーを参照していても、次回公開以降はjsonに切り替わる
  // calendar.run();

  // IEバージョン判定　８、９、１０はストリートビューを表示させない
  var version = window.navigator.appVersion.toLowerCase();
  if ( (version.indexOf("msie 8.") !== -1 || UA.IEVersion == 8) || 
       (version.indexOf("msie 9.") !== -1 || UA.IEVersion == 9) || 
       (version.indexOf("msie 10.") !== -1 || UA.IEVersion == 10) 
     )
  {
      // アクセスページのストリートビューを非表示
      if( $(".sv_big").length > 0 ) {
        $(".sv_big").remove();
        $("#plusBlock_sv_big").remove();
      }
      // 要素を入れ替えページのストリートビューを非表示
      if( $("#sv_big").length > 0 ) {
        $("#sv_big").hide();
      }
      // サイドバーのストリートビューを非表示
      if( $(".sv_block").length > 0 ) {
        $(".sv_block").remove();
      }
      // サイドバー要素を入れ替えページのストリートビューを非表示
      if( $("#street_view").length > 0 ) {
        $("#street_view").hide();
      }
  }

  //読み込み時にwindowサイズが480以下ならSPFLAGを1
  if($(window).width() < 480){
    if (UA.browser == 'ie' && (UA.IEVersion == 7 || UA.IEVersion == 8)) {
      SPJSFLAG = 0;
      smt_count = 0;
    }else{
      SPJSFLAG = 1;
      smt_count = 1;
      pc_count = 0;

    }

  } else {

    if( edit_param === "1" && sp_param === "1"){

      SPJSFLAG = 1;
      smt_count = 1;
      pc_count = 0;

    }
  }

  if(SPJSFLAG == 1 && sp_param == 1){
    smtOnlyFunction();
    moviefitting();
    googleMapFitting();

    var ua = navigator.userAgent;
    if ( ua.indexOf('Android') !== -1 ) {
      // ピンチインイベント発火
      document.addEventListener('touchmove',FixedMenuFitted,false);
    }

  }

  if( ( design_number === "mobile_first3" || design_number === "mobile_first4" ) && SPJSFLAG !== 1 && sp_param !== 1){
    onlyMobileFirst3SidebarFunction();
  }

  // グローバルメニュー イベント初期設定
   GlobalMenuEvent.init(design_number, side_bar);

   // 中古車詳細 画像スライドショー イベント初期設定
   UsedCarDetailSlideShowEvent.init();

   // 中古車画像 複数削除イベント
   if( !isOpen ) {

     new selectDeleteEvent( UsedCarDetailSlideShowEvent ).eventBind();

   }



   /**************************************************************************/
   //スマホ用（公開画面）　追加ページアコーディオン
   /**************************************************************************/


   new SPMenuAction();



/***************************************************************************************/
//高さを揃える　トップページのメニュー部分
/***************************************************************************************/

   // $(window).load(function(){

   //  // PC or SP で挙動を変えてます
   //  if(SPJSFLAG !=1){
   //    $.fn.sameHeight = function(){
   //      var h = 0;
   //      return this.each(function(){
   //      h = Math.max(h, $(this).outerHeight());
   //    }).height(h);
   //  };

   //  $('.sameheight').sameHeight();
   //  $('.sameheight_img').sameHeight();

   //  $.fn.sameHeight2 = function(){
   //    var h2 = 0;
   //    return this.each(function(){
   //      h2 = Math.max(h2, $(this).outerHeight());
   //    }).height(h2);
   //  };
   //  $('.sameheight2').sameHeight2();

   //  $.fn.sameHeight3 = function(){
   //    var h3 = 0;
   //    return this.each(function(){
   //      h3 = Math.max(h3, $(this).outerHeight());
   //    }).height(h3);
   //  };
   //  $('.sameheight3').sameHeight2();

   //  } else {
   //    adjustH2boxHeightBySp();
   //  }

   // });


  $(function(){

    var AdjustSpFooterMenu = function()
    {

      var self = this;

      this.rowNum = 3;
      this.columnNum = 3;

      this.minHeight = 0;
      this.maxHeight = 0;

      this.heightByRow = [];


      this.calcRowNum = function()
      {

        var ulWidth = self.footerUl.width();
        var liWidth = self.footerLi.outerWidth();

        self.rowNum = Math.ceil( ulWidth / liWidth );

      }


      this.setHeightByColumn = function()
      {

        var tmpColumnIndex = 0;
        var tmpRowIndex = 0;

        self.footerLi.each( function(i){

          if( tmpColumnIndex >= self.columnNum ){

            tmpRowIndex++;

            self.maxHeight = 0; // リセット
            tmpColumnIndex = 0;

          }

          var itemHeight = $(this).outerHeight();

          if( self.maxHeight < itemHeight ) self.maxHeight = itemHeight;
          if( self.minHeight > itemHeight ) self.minHeight = itemHeight;

          self.heightByRow[tmpRowIndex] = self.maxHeight;

          tmpColumnIndex++;

        });

      }


      this.updateHeight = function()
      {

        var tmpColumnIndex = 0;
        var tmpRowIndex = 0;

        self.footerLi.each( function(i){

          if( tmpColumnIndex >= self.columnNum ){

            tmpRowIndex++;

            self.maxHeight = 0; // リセット
            tmpColumnIndex = 0;

          }

          $(this).height( self.heightByRow[tmpRowIndex] );
          $(this).find('a').height( self.heightByRow[tmpRowIndex] );

          tmpColumnIndex++;

        });

      }


      this.run = function()
      {

        self.calcRowNum();
        self.setHeightByColumn();
        self.updateHeight();

      }


      this.__construct = function()
      {

        self.footerUl = $('#footer ul');
        self.footerLi = $('#footer li');

      }();

    }

    var adjustSpFooterMenu = new AdjustSpFooterMenu();

    if( typeof sp_param !== "undefined" && typeof SPJSFLAG !== "undefined"){

      if( SPJSFLAG === 1 && sp_param === "1" ){

        $(window).load(function(){

          adjustSpFooterMenu.run();

        });

        // スマホのリサイズはレアケースだが念のため
        $(window).resize(function(){

          adjustSpFooterMenu.run();

        });

      }

    }


  });


   $(window).load(function(){

     $('.ul_sub li[data-is-middle-menu = "1"]').each(function(index, e){ // フォルダ

      // 新着フラグが立っている子ページがあればデータ属性を更新
      $(e).has('[data-is-new = "1"]').attr("data-is-new","1");
      $(e).has('[data-is-new = "1"]').data("is-new","1");

     });

   });



/***************************************************************************************/
//文字サイズの変更
/***************************************************************************************/

   $("#font_size_larger").click(function(){
   $("body").css("font-size","120%");
   });

   $("#font_size_smaller").click(function(){
   $("body").css("font-size","100%");
   });


/***************************************************************************************/
//アニメーションして上に戻るように
/***************************************************************************************/

   function scrlTo(obj,time,mrgn,cn) {
     var offset = $(obj).eq(cn).offset();
     $("body,html").animate({scrollTop:offset.top - mrgn},time);
   }

   $('.backtop, .editContentsInner .editContent #page-top').click(function(){
   //var obj = "#header"; //移動先のID名
     var obj = "body"; //移動先のID名
     var time = 600; //移動時間（÷1000秒）
     var mrgn = 50; //上の余白　（トップに移動するときはゼロに）
     var cn = 0; //何番目のオブジェクトか　最初はゼロ

     // bodyのmargin分、加算する
     var bodyMarginTop = $(obj).css("margin-top").replace("px","");
     bodyMarginTop = parseInt(bodyMarginTop);
     bodyMarginTop = isNaN(bodyMarginTop) ? 0 : bodyMarginTop;

     mrgn = mrgn + bodyMarginTop;

     scrlTo(obj,time,mrgn,cn);
   });



 /***************************************************************************************/
 //アニメーションして求人エントリーフォームトップへ
 /***************************************************************************************/
   $(".rec_scrl_btn").click(function(e){
    if( $(e.target).hasClass("inplace_normal") ){// 直感編集の場合、スクロールはさせない
      return;
    }

    var obj = "#middle_top_entry"; //移動先のID名
    var time = 600; //移動時間（÷1000秒）
    var mrgn = 0; //上の余白　（トップに移動するときはゼロに）
    var cn = 0; //何番目のオブジェクトか　最初はゼロ
    scrlTo(obj,time,mrgn,cn);

    setTimeout(function(){// 600ミリ秒のスクロール後にフォーカス
      $("#block_outer_entry_form").find("#otoiawase_table_box input:visible").eq(0).focus();
    }, 700);
   });


/***************************************************************************************/
//SNSボタン表示用
/***************************************************************************************/
     $("#ShereBtnBox").hover(
     function(){
       $("#sns_btn_block:not(:animated)").show("fast");
     },
     function(){
       $("#sns_btn_block").slideUp("fast");
     }
   );

/***************************************************************/

/***************************************************************************************/
//スマートフォンアクセス： 電話番号をリンク表示に差し替える
/***************************************************************************************/
   if (isSmartPhoneAccess()) {
     $('#sidebar_tel01,#sidebar_tel02,#sidebar_tel01_googlemap,#sidebar_tel02_googlemap').each(function(i, element) {
       var telNo = $(element).text();
       if (telNo.length > 0 && telNo.match(/^[\d-]+$/)) {
         $(element).html($('<a>').attr('href', 'tel:' + telNo).text(telNo));
       }
     });
   }
/***************************************************************************************/
 // 見積り（問合せ）フォーム画像アップロードフォーム増減
/***************************************************************************************/
   var radioAndDetailFormExtension = dktlExtension ? new RadioAndDetailFormExtension() : null;

   var pict_form_count = 1;

   $('.pict_form_plus').on('click',function(){
     if(pict_form_count < 5){
       pict_form_count++;
       $('.pict_file0' + pict_form_count).fadeIn(300);
       if(pict_form_count == 2){
         $('.pict_form_minus img').attr('src','img/copy2open/pm_btn_m.gif');
       }
     }

     if(pict_form_count == 5){
       $('.pict_form_plus img').attr('src','img/copy2open/spacer_alpha.png');
     }
   });

   $('.pict_form_minus').on('click',function(){
     if(pict_form_count > 1){
       $('.pict_file0' + pict_form_count).fadeOut(300);
       if(pict_form_count == 5){
         $('.pict_form_plus img').attr('src','img/copy2open/pm_btn_p.gif');
       }
       pict_form_count--;
     }
     if(pict_form_count == 1){
       $('.pict_form_minus img').attr('src','img/copy2open/spacer_alpha.png');
     }
   });


   //2014-7-2 奥野追記 中古車機能用
   //$("#cgmL,#cgmR").css({opacity:0});

   // 高橋追記 求人ページ募集職種タイプ取得
   var job_types = [];
   for(var i = 1 ; i <= 5 ; i++){
     if($("#requirements0" + i + "_01_title").length > 0){
       job_types.push( $("#requirements0" + i + "_01_title").text() );
     }
   }
   var radio_btn_html = "";

   if(job_types.length > 0){
     for(var i=0 , len = job_types.length ; i < len ; i++){
       var varidate = "";
       if(i == (len-1)){
         if(i == 0){
           varidate = ' checked="checked"';
         }else{
           varidate = ' onblur="Validator.check(this)"';
         }

       }

       var job_type_str = job_types[i];

       radio_btn_html += '<label class="select_point"><input type="radio" value="' + job_type_str.replace("募集要項", "") + '" name="syokusyu" ' + varidate + ' />' + job_type_str.replace("募集要項", "") + '</label><br />';
     }
   }else{
     $("#select_job_type_row").css("display","none");
   }


   var job_type_select = $("#job_type_select");
   if(job_type_select.length > 0){
     job_type_select.append(radio_btn_html);
   }


   /***************************************************************************************/
   // 【暫定】フォルダクリック時動作
   /***************************************************************************************/
    var openMiddleMenuTimer;
    var closeMiddleMenuTimer;

    var isDragging;

    $('.menu_wrapper').on('dragstart', '.draggable', function() {
        clearTimeout(openMiddleMenuTimer);
        isDragging = true;
    });

    $('.menu_wrapper').on('dragend', '.draggable', function() {
        isDragging = false;
    });

    $('.menu_wrapper').on('mouseenter', '.middle-menu__wrap', function(){ // ホバー

      $(this).closest(".js-middleMenuOpenTrigger").removeClass("js-openStrictly");
    
    });

    $('.menu_wrapper').on('mouseenter', '.js-middleMenuLink', function(){ // ホバー

      var grabbingNode = $("body").attr("data-grabbing-node");

      if( typeof grabbingNode === "undefined" || grabbingNode === "" ){

        if( $(this).closest(".js-subPageList").find(".js-openStrictly").length <= 0 ){

          clearTimeout(openMiddleMenuTimer);

          var self = $(this);
          var wrap = self.closest("li");
          var openMiddleMenu = new OpenMiddleMenu(wrap);

          openMiddleMenuTimer = setTimeout( function(){

            openMiddleMenu.immediatelyCloseMenu();

            setTimeout( function(){

              openMiddleMenu.run();

            }, 270);

          }, 400);

        } else {

        }

      } else {

      }

    });

    $('.menu_wrapper').on('mouseenter', '.middle-menu__wrap', function(){ // ホバー


        var self = $(this);
        var wrap = self.closest("li");
        var openMiddleMenu = new OpenMiddleMenu(wrap);


        openMiddleMenu.run(); // init

        if( openMiddleMenu.shouldResize() ){

          openMiddleMenu.clearHeight();

        }

    });

    $('.menu_wrapper').on('mousedown', '.js-middleMenuLink, .middle-menu__trigger--sp', function(e){

        // フォルダ名変更ボタンを押した場合は処理しない( hasClass的にやりたかったがthisが指すオブジェクトがちがう )
        if( $(e).get(0).target.className.indexOf("js-openmiddleMenuTitleEditor") === -1 ){

            // 左クリック以外禁止
            if( e.which !== 1 ) return false;

            if(!isDragging){

                clearTimeout(openMiddleMenuTimer);

                var self = $(this);
                var wrap = self.closest("li");
                var openMiddleMenu = new OpenMiddleMenu(wrap);

                if( wrap.data("middle-menu-state") === "close" ){

                  openMiddleMenu.immediatelyCloseMenu();

                  openMiddleMenuTimer = setTimeout( function(){

                    openMiddleMenu.run();

                  }, 270);

                } else {

                  openMiddleMenu.close();

                }

            }
        
        }

    });


    $('.menu_wrapper').on('mouseleave', '.js-middleMenuOpenTrigger', function(){

        clearTimeout(openMiddleMenuTimer);

    });


    // フォルダを開くリンクはhref無効にする
    $('.js-middleMenuLink').on('click', function(event){

        event.preventDefault();

    });



    // メニュー内の要素クリック時はイベント飛ばないように
    $('.middle-menu__list, .middle-menu__list a').on('click', function(event){

        event.stopPropagation();

    });



    $(".subpageLink").on('click', '.side-middle-menu__head', function(){

        var self = $(this);
        var target = $(this).next('.side-middle-menu__list');

        if( !target.is(':animated') ){

            target.slideToggle(300);
            updateMenuOpenState( self, self.data('menu-open-state') );

        }

    });


    $(".lead__wrap").on('click', '.foot-middle-menu__head', function(){

        var self = $(this);
        var target = $(this).next('.foot-middle-menu__list-wrap');

        if( !target.is(':animated') ){

            target.slideToggle(300);
            updateMenuOpenState( self, self.data('menu-open-state') );

        }

    });


    var updateMenuOpenState = function( target, currentState )
    {

        if( currentState === 'close' ){

            target.attr('data-menu-open-state','open');
            target.data('menu-open-state','open');

        } else {

            target.attr('data-menu-open-state','close');
            target.data('menu-open-state','close');

        }

    }


  if( typeof RECORD_ID !== "undefined" && RECORD_ID !== null ){ //RECORD_IDが入っていれば

    /**
     * グローバルメニュー内フォルダのカレント処理
     */
    $(".sub--child a").each( function(index, e){

      var current = null;

      if( $(e).data('record-id') == RECORD_ID ) current = $(e);

      if( current !== null ){

        current.closest('.middle-menu__wrap').slideDown(0);
        current.closest('.js-middleMenuOpenTrigger').attr('data-middle-menu-state', 'open');
        current.closest('.js-middleMenuOpenTrigger').data('middle-menu-state', 'open');

        current.addClass('current-record');

      }

    });


    /**
     * サイドバー内フォルダのカレント処理
     */
    $(".side-middle-menu__list p").each( function(index, e){

      var current = null;

      if( $(e).data('record-id') == RECORD_ID ) current = $(e);

      if( current !== null ){

        current.closest('.side-middle-menu__list').slideDown(0);
        current.closest('.side-middle-menu__list').prev('.side-middle-menu__head').attr('data-menu-open-state', 'open');
        current.closest('.side-middle-menu__list').prev('.side-middle-menu__head').data('menu-open-state', 'open');

        current.addClass('current-record');

      }

    });


    /**
     * フッター内フォルダのカレント処理
     */
    $(".foot-middle-menu__list li").each( function(index, e){

      var current = null;

      if( $(e).data('record-id') == RECORD_ID ) current = $(e);

      if( current !== null ){

        current.closest('.foot-middle-menu__list').slideDown(0);
        current.closest('.foot-middle-menu__list').prev('.foot-middle-menu__head').attr('data-menu-open-state', 'open');
        current.closest('.foot-middle-menu__list').prev('.foot-middle-menu__head').data('menu-open-state', 'open');

        current.addClass('current-record');

      }

    });

  }


   /***************************************************************************************/
   // フォーム送信後アンケート　「その他」選択でテキストエリア表示
   /***************************************************************************************/

   $('#hp_other_good_reason,#hp_other_bad_reason').on('click',function(){
     var target_id = $(this).attr('id');
     if ( target_id == 'hp_other_good_reason' ) {
       $('#other_good_reason_text_block').fadeIn(300);
     } else {
       $('#other_bad_reason_text_block').fadeIn(300);
     }
   });


  /***************************************************************************************/
  // フォーム誤操作防止関連
  // 2秒以内の連打を無効とする。
  /***************************************************************************************/

   // 特定のクラスが付く要素が存在しているならイベントバインド
  if ( $("#otoiawase_table_box .inputbtn, #mitumori_table_box .inputbtn, #user_enquete_form .inputbtn, .dksm_regist .inputbtn").length > 0 ) {

    window.onpageshow = function(e){
      $(".submitting").removeClass("submitting");
    }

  }

  if( dktlExtension ) {

    var submitBtn = $("#otoiawase_table_box .inputbtn, #mitumori_table_box .inputbtn, #user_enquete_form .inputbtn");
    var checkBoxObj = $(".checkbox__wrap");

    var postable = true;
    var clickIntervalTime  = 2000; // 2秒間は受け付けない

    var clickTimeStamp;
    var secondClickTimeStamp;

    checkBoxObj.on("click", function(e){

      e.stopPropagation();
      clickTimeStamp = null; // リセット

    });

    submitBtn.on("click", function(){    

      secondClickTimeStamp = Date.now();

      if( typeof clickTimeStamp === "undefined" || clickTimeStamp === null ){

        postable = true; // 初回は問答無用でOK

      } else {

        if( secondClickTimeStamp - clickTimeStamp < clickIntervalTime ){

          postable = false;

        } else {

          postable = true;

        }

      }

      clickTimeStamp = secondClickTimeStamp;

      if( !postable ) {
        return false;
      }

    });

  }


  /***************************************************************************************/
  // フォーム切り替え処理
  /***************************************************************************************/

   var currentMenuId;

   if( dktlExtension ){

      var ac = new AddCheck();

   }

   if( dktlExtension ){

    entryFormFileReaderManager = new EntryFormFileReaderManager(
      $(".js-inputFileTriggerIcon"),
      $(".js-inputFileController")
    );

    entryFormFileReaderManager.init();

  }



   $(".est_table_car input[name='type']").click(function(){

    
    
    var cssName = $(this).attr("class");
    var nameArray = cssName.split("_");

    var array_length = nameArray.length;
    var index = nameArray[array_length - 1];
  
    
    currentMenuId = index;


    //切り替え前のアラート表示

    //現在表示しているテーブルのid取得
    var targetTableIdName = $(this).parent().parent().parent().parent().parent().attr("id");

    //#submenu_form_20 → "_"で区切る
    var targetTableNameArray = targetTableIdName.split("_");
    var targetTableIndex = targetTableNameArray[2];


    if( dktlExtension ){
      ModifyEstimateForm.RefreshCurrentCategory(index);
      $(".baloon").remove();
    }

    if(ac){
      ac.initialize(index);
      
    }
    changeEstimateForm( index );

   })


   // 見積りページデフォルトチェック
   // 処理の流れ的にココに書く必要有

   if( typeof initCheckEstimateTypeController !== "undefined" ){
    if( initCheckEstimateTypeController.queued() ){
      initCheckEstimateTypeController.check()
    }
  }

    var hashStr = location.hash;

    if ( hashStr !== "" || hashStr.match(/^f_[0-9-]+$/) ) {

      var hashAry = hashStr.split("_");
      var menu_id = hashAry[1];
      currentMenuId = menu_id;
      changeEstimateForm( menu_id );

      if( dktlExtension ){
        ModifyEstimateForm.RefreshCurrentCategory(menu_id);
        ac.initialize( menu_id );
      }
   
    } else {

      // 表示こそしないものの、実質1番目のメニューを選んでいる状態 => $currentMenuId だけ作っておかないといけない
      (function(){

        if( $(".est_table_car").length > 0 ){

          var classString = $(".est_table_car").find("input[name=type]").eq(0).attr("class"),
              classList = classString.split(" ");
          
          if( classList.length > 0 ){

            classList.forEach(function(v,i,a){
              if( i === 0 ){
                className = v;
              }
            })
          
            var menuId = className.replace("submenu_radio_", "");

            currentMenuId = menuId;

            // 初期の画像必須化を解除
            ModifyEstimateForm.toggleMustSelectCheck(currentMenuId);

        }

      }
    
    }());

   }



  (function(){

    // 見積りフォーム拡張有
    if( dktlExtension ){

      // input type のリプレイス
      var rit = new ReplaceInputType();
      if( rit.shouldReplace ) rit.run();

      // datepicker導入
      var itp = new InsertDatePicker();
      if( itp.shouldInsert ) itp.run();

    
      var ins = new ZipCodeActionController();
      if( ins.shouldBind() ) ins.bind();
    


    }

  }());


   /****************************************************************************************/
   // レスポンシブでPCの時にはクリックさせない
   /****************************************************************************************/
   $('#smt_tel_btn').find('a').click(function(event){

     // スマホじゃない時は処理を止める
     if ( !isSmartPhoneAccess() ) {
       event.preventDefault();
       event.stopPropagation();
       return false;
     }
   

   });


//2017-6-12 okuno


//2017-1-25 okuno コメント
var wndwWidth   = $(window).width();
var wndwHeight  = $(window).height();

//モーダル

$("body").prepend('<div id="modal_wrapper"><div id="modal"><div id="modal_contents"></div><div id="modal_wrapper_close_btn">×</div></div></div>');

function openModal( msg, mode ) {

    if( mode === "bottom-fixed" ){

        $("#modal_wrapper").addClass("bottom-fixed")

        $("#pagetop, #tltpFlg").css({"transition":"0.3s", "bottom":"64px"});

    }

    $("#modal_wrapper").fadeIn(300);

    $("#modal").addClass('tmr_active');
    $("#modal_contents").html(msg);
    $(".trial_name").focus();
}


function closeModal(){
    $("#modal_wrapper").fadeOut(300);
    $("#modal").html();
}

$("#modal_wrapper_close_btn,#modal_wrapper").click(function(){
  closeModal();
});






// http://note.chiebukuro.yahoo.co.jp/detail/n172878
// 配列や連想配列、オブジェクトなどの中身を視覚的に表示する関数
function var_dump(arr,lv,key) {
    var dumptxt = "",
        lv_idt = "",
        type = Object.prototype.toString.call(arr).slice(8, -1);
    if(!lv) lv = 0;
    for(var i=0;i<lv;i++) lv_idt += "    ";
    if(key) dumptxt += lv_idt + "[" + key + "] => ";

    if(arr == null || arr == undefined){
        dumptxt += arr + '\n';
    } else if(type == "Array" || type == "Object"){
        dumptxt += type + "...{\n";
        for(var item in arr) dumptxt += var_dump(arr[item],lv+1,item);
        dumptxt += lv_idt + "}\n";
    } else if(type == "String"){
        dumptxt += '"' + arr + '" ('+ type +')\n';
    }  else if(type == "Number"){
        dumptxt += arr + " (" + type + ")\n";
    } else {
        dumptxt += arr + " (" + type + ")\n";
    }
    return dumptxt;

}
//
//

//http://stackoverflow.com/questions/1187518/javascript-array-difference
//a2にa1が含まれているかを確認し、あれば削除する関数関数
//両方とも配列である必要がある
function arr_diff (a1, a2) {
    var a = []
    var diff = [];

    for (var i = 0; i < a1.length; i++) {
        a[a1[i]] = true;
    }

    for (var i = 0; i < a2.length; i++) {
        if (a[a2[i]]) {
            delete a[a2[i]];
        } else {
            a[a2[i]] = true;
        }
    }

    for (var k in a) {
        diff.push(k);
    }

    return diff;
};



/**
//2017-2-2 okuno 作成
//配列Arrayに検索文字needleがあるかを確認、
//あれば配列内の順番を返す
//
//注
// true falseではない　if文と使う場合は　>-1で利用
//数字では確認しているが型の指定等はしていないので問題が発生する可能性がある
//連想配列のキーには対応していない
 *
 * @param needle 検索文字
　* @param Array 検索される配列

 * @return 配列のに含まれる場合順番を、含まれない場合は-1を返す
 */

function inArrayByFor(needle,Array) {
    var s = -1;
    for (var ia = 0; ia < Array.length; ia++) {
        if(Array[ia] == needle ){
            s = ia;
        }
    }
    return s;
}

/**
//2017-2-2 okuno 作成
 * @return 文字をアラートで表示する　5つまで
 */
//2017-2-1 okuno 作成
function a(str1,str2,str3,str4,str5){
    rtn = [];
    aArr = [str1,str2,str3,str4,str5];
    for(var aaa = 0;aaa < 5 ; aaa++){
        if( aArr[aaa]){
            rtn[aaa] = aArr[aaa] +"|";
        } else {
            rtn[aaa] = "";
        }
    }
    alert(rtn[0]+rtn[1]+rtn[2]+rtn[3]+rtn[4]);
}

/**
//2017-2-2 okuno 作成
 * @return 文字をアラートで表示する　5つまで
 */
//2017-2-1 okuno 作成
function v(arr1,arr2,arr3,arr4,arr5){
    rtn = [];
    aArr = [arr1,arr2,arr3,arr4,arr5];
    for(var aaa = 0;aaa < 5 ; aaa++){
        if( aArr[aaa]){
            rtn[aaa] = var_dump(aArr[aaa]);
        } else {
            rtn[aaa] = "";
        }
    }
    alert(rtn[0]+rtn[1]+rtn[2]+rtn[3]+rtn[4]);
}

//2017-2-1 okuno 作成
function vm(arr1,arr2,arr3,arr4,arr5){
    rtn = [];
    aArr = [arr1,arr2,arr3,arr4,arr5];
    for(var aaa = 0;aaa < 5 ; aaa++){
        if( aArr[aaa]){
            rtn[aaa] = var_dump(aArr[aaa]);
        } else {
            rtn[aaa] = "";
        }
    }
    openModal(rtn[0]+rtn[1]+rtn[2]+rtn[3]+rtn[4]);
}

//2017-2-2 okuno 作成
//多分このままだと使わない
// @return マウスのどちらのボタンがクリックされたか
function mouseWhichBtn(obj){
    obj.mouseup(function(e){
        switch(e.which){
            case 1:
                a("left");
                break;
            case 2:
                a("middle");
                break;
            case 3:
                a("right");
                break;
            default:
                a("you have a unexpexed mouse");
        }
    });
}


/**
 * 可視領域に入る・外れた場合に実行するメソッド
 * @param  {Array} targets [対象要素]
 * @param  {function} callbackVisible [可視領域に入ったら実行する処理]
 * @param  {function} callbackHidden [可視領域から外れたら実行する処理]
 */
var visibleVerticalExecute = function( targets, callbackVisible, callbackHidden )
{
  if( targets.length === 0 ) return false;

  var position = {
    start : "0%",
    end : "100%"
  };


  $.each( targets, function(i, target){

    //監視開始
    observeVisibleVertical(
      target,
      {
        start : position.start,
        end   : position.end
      },
      {
        visible : callbackVisible,
        hidden  : callbackHidden
      }
    );

  });

}


/*
 *マルチスライダーブロック
 *可視領域IN、OUT登録
 */
$(function(){

  $(".js-imageBoxMultiSlider").removeClass("slideActive");

  visibleVerticalExecute(
    [".js-imageBoxMultiSlider"],
    function( jqObject, entry ){

      jqObject.addClass("slideActive");

      imageBoxMultiSliders.forEach(function(instance){

          if( instance.objects.imageBox.hasClass("slideActive") ) {
            instance.autoplay();
          }

      });

    },
    function( jqObject, entry ){

      jqObject.removeClass("slideActive");

      imageBoxMultiSliders.forEach(function(instance){

          if( !instance.objects.imageBox.hasClass("slideActive") ) {
            instance.clear();
          }

      });

    }
  );

});

$(function(){

  $(".js-imageBoxSlider").removeClass("sliderPassive");

  visibleVerticalExecute(
    [".js-imageBoxSlider"],
    function( jqObject, entry ){

      jqObject.addClass("sliderPassive");

      imageBoxSliders.forEach(function(instance){

          if( instance.objects.imageBox.hasClass("sliderPassive") ) {
            instance.autoplay();
          }

      });

    },
    function( jqObject, entry ){

      jqObject.removeClass("sliderPassive");

      imageBoxSliders.forEach(function(instance){

          if( !instance.objects.imageBox.hasClass("sliderPassive") ) {
            instance.clear();
          }

      });

    }
  );

});

$(function(){

  visibleVerticalExecute(
    ["iframe.js-imageBlockImage"],
    function( jqObject, entry ){

      var ytAuto = jqObject.attr("data-yt-autoplay"),
          ytUrl = jqObject.attr("src");
      if( ytAuto === "1" && ytUrl.indexOf("autoplay=0") !== -1 ){
        var newYtUrl = ytUrl.replace("autoplay=0", "autoplay="+ytAuto);
        jqObject.attr("src", newYtUrl);
      }
    },
    function( jqObject, entry ){
      // autoplay=0にすると最初からになるため、何もしない
    }
  );

});

////////////////////////////////////////////////////

 $(document).on("click", ".js-carTag", function(){
    var self = $(this),
        clicked = $(this).attr("data-clicked"),
        tmp = [];

    // $(".js-carTag").attr("data-clicked", 0);
    if( clicked === "1" ) {
      self.attr("data-clicked", 0);
    } else {
      self.attr("data-clicked", 1);
    }


    $("#carSearchSubmit_public").click();
    carTagsCount();

 });

 $(document).on("click", "#carTagMoreSearch", function(){

    var self = $(this),
        isShow = self.attr("data-show");

    var cookieOperation = new CookieOperation();

    if( isShow === "0" ) {

      cookieOperation.setCookie( "keepOpenStateTagForm", "open", 604800 );

      $("#carTagSearchWrapped").slideDown(250);
      self.attr("data-show", 1);

      $("#closeBorder").attr("data-show", 1);
      self.find(".tagMoreLink").text("タグを閉じる");
    } else {

      $("#carTagSearchWrapped").slideUp(250);
      self.attr("data-show", 0);

      cookieOperation.setCookie( "keepOpenStateTagForm", "close", 604800 )

      self.find(".tagMoreLink").text("タグで詳しく絞り込む");
      setTimeout(function(){
        $("#closeBorder").attr("data-show", 0);
      }, 250);

    }
 });


 $('#carMaker_public').on('change', function() {
    var makerName = $(this).val();
    var carName = $('#carName_public');

    if( $('#car_list_base0').hasClass('car_list_hidden') ) {
        // 非表示リストなら
        var hiddenOrPublicName = carNameHidden;
    } else {
        // 表示リストなら
        var hiddenOrPublicName = carNamePublic;
    }
    carName.html('');
    var nameHtml = '<option value="">すべて</option>';
    
    var hiddenOrPublicNameObj = JSON.parse(hiddenOrPublicName);
    if( makerName == '' ) {
        for( var maker in hiddenOrPublicNameObj ) {
            for( var name in hiddenOrPublicNameObj[maker] ) {
                nameHtml += '<option value="' + name + '" data-makername="' + maker + '">' + hiddenOrPublicNameObj[maker][name] + '</option>';
            }
        }
    } else {
        for( var maker in hiddenOrPublicNameObj ) {
            if( maker == makerName ) {
                for( var name in hiddenOrPublicNameObj[maker] ) {
                    nameHtml += '<option value="' + name + '" data-makername="' + maker + '">' + hiddenOrPublicNameObj[maker][name] + '</option>';
                }
            }
        }
    }
    $('#carName_public').html(nameHtml);
    carTagsCount();
 });


$(document).on("change", "#carName_public, #carAge_lowerLimit_public, #carAge_upperLimit_public, #carDistance_lowerLimit_public, #carDistance_upperLimit_public, #carCost_lowerLimit_public, #carCost_upperLimit_public", function(){
  carTagsCount();
});


$(document).on("blur", "#car_free_search", function(){
  carTagsCount();
});


 // 検索ボタンをクリック時の処理
$(document).on("click", "#carSearchSubmit_public, .carListPager", function(e){
    carSearchClick(e, $(this));
});



function getClickAction( selector )
{
  if( selector.hasClass( "btn_open" ) ) return "btn_open";
  if( selector.hasClass( "btn_hide" ) ) return "btn_hide";
  if( selector.hasClass( "dialog_delete_button" ) ) return "delete_button";
  if( selector.hasClass( "dialog_all_delete_button" ) ) return "all_delete_button";
  if( selector.hasClass( "clOpen" ) ) return "clOpen";
  if( selector.hasClass( "clClose" ) ) return "clClose";
}

function getCarCount( clickAction )
{

  var carCountStr = "",
      isOnlyOneDelete = false;

  switch( clickAction ){

    case "btn_open":
    case "btn_hide":

      carCountStr = $(".carlist_pager_box:nth-of-type(1)").find(".pager_str b").text();

      break;

    case "delete_button":

      carCountStr = $(".carlist_pager_box:nth-of-type(1)").find(".pager_str b").text();
      isOnlyOneDelete = true;

      break;

    case "all_delete_button":

      carCountStr = "0";

      break;

    case "clOpen":

      carCountStr = $("#carListOpenOrCloseCountOpen").text();

      break;

    case "clClose":

      carCountStr = $("#carListOpenOrCloseCountClose").text();

      break;

    default:

      // ページロード時
      carCountStr = $(".carlist_pager_box:nth-of-type(1)").find(".pager_str b").text();

      break;

  }

  var regex = /([0-9]+)/g,
      carCount = isOnlyOneDelete ? Number( carCountStr.match(regex) ) - 1 : Number( carCountStr.match(regex) );

  return carCount;

}



///////////////////////////
// 車検価格表レイアウトを、レスポンシブに変更 //
///////////////////////////
if (PAGE_ID === "20" && $("#middle_top_price01").length > 0) {
    globalCarPriceList.carPriceList();
}


  if( parseInt(PAGE_ID) === 22 ) {
    if( parseInt(sp_param) === 1 ) {
      $("#recommend_config_area").remove();
    }

  }

  $("#asc_label").on("click", function() {
    var self = $(this);
    if( self.hasClass("order_label_unchecked") ) {
      self.removeClass("order_label_unchecked").addClass("order_label_checked");
      $("#desc_label").removeClass("order_label_checked").addClass("order_label_unchecked");
    }
  });

  $("#desc_label").on("click", function() {
    var self = $(this);
    if( self.hasClass("order_label_unchecked") ) {
      self.removeClass("order_label_unchecked").addClass("order_label_checked");
      $("#asc_label").removeClass("order_label_checked").addClass("order_label_unchecked");
    }
   
  });


  // スマホの会社名の幅を取得し、ロゴを右に配置
  logoEditOpenFunctions.setSpLogoPositonRight();

  blockManagerInstance =  new slideShowBlockManager();

  blockManagerInstance.exec();

  $(document).on("click", ".sliderBlockNextBtn", function(){
    blockManagerInstance.blockInstance.next( $(this) );
    blockManagerInstance.setBlockScrollTop()
  });

  $(document).on("click", ".sliderBlockPrevBtn", function(){
      blockManagerInstance.blockInstance.prev( $(this) );
      blockManagerInstance.setBlockScrollTop()
  });

  $(document).on("click", ".js-blockSliderProgressItem", function(){
      blockManagerInstance.blockInstance.bar( $(this) );
      blockManagerInstance.setBlockScrollTop()
  });



  $(document).on("click", ".free_search_hit_str", function(e){

      if( !$( e.target ).hasClass("free_search_hit_str") ){
          return false;
      }

      var href = $(e.target).data("href"),
          target = $(e.target).data("target");

      if( typeof target !== "undefined" ){
          window.open( href, target );
      } else {
          location.href = href;
      }

      return false;

  });

  var freeSearchString = returnFreeSearchQuery();

  // 在庫車詳細ページ特典・ポイント文をハイライトするか
  if( freeSearchString !== "" ) {

      carDetailPageHighLight( freeSearchString );

  }



$(document).on({

  "mouseenter": function(){
    $(this).closest(".usedcar_edit_btn").find(".statusChangeOuter").not(":animated").slideDown(150);
  },
  "mouseleave": function(){
    $(this).closest(".usedcar_edit_btn").find(".statusChangeOuter").not(":animated").slideUp(150);
  }

}, ".btn_status_change");






if( $(window).width() <= 480 ) {

  $(document).on("click", ".js-searchMenuSubmitSp", function( e ) {

    var self = $(this),
        searchedText = self.closest(".searchMenuOuter").find(".js-searchMenuTextSp");

    if( searchedText.val() === "" ) return false;

    if( typeof middlePageJson === "string" ) {
      middlePageJson = JSON.parse(middlePageJson);
    }
    if( typeof middlePageJson.pageData === "undefined" || middlePageJson.pageData === null ) return false;

    var recordIds = searchResultRecordIds( $(this) );

    showSearchResultSp( recordIds, $(this) );


  });


/*  $(document).on("click", ".resetMegaMenuSearch", function(){
    var searchText = $(this).closest(".js-subPageWrapper").find(".js-searchMenuTextSp");

    $(".js-subPageWrapper").each(function(){
      $(this).attr("data-show", 1);
      $(this).find(".js-middleMenuOpenTrigger").each(function(){
        $(this).attr("data-show", 1);
      })

      $(this).find(".js-searchTargetList").each(function(){
        $(this).attr("data-show", 1);
      })

    });

    $(".js-searchMenuTextSp").val("");
    $(".searchedEmpty").attr("data-show", 0);
    $(".searchedResultStringOuter").attr("data-show", 0);

  });
*/

} else {

  $(document).on("focus", ".js-searchMenuText", function () {
    keepOpenStateMegaMenu = true;
    shouldOpenMegaMenu = false;
  });

  $(document).on("blur", ".js-searchMenuText", function () {
    var menuWrapper = $(this).closest(".menu_wrapper");

    if(menuWrapper.hasClass("use_hamburger_menu")){
      $(this).closest(".mega_menu").css({ display: "block" });
    }

    keepOpenStateMegaMenu = false;
    shouldOpenMegaMenu = true;

    if(!$(":hover").hasClass("mega_menu")){
      $(".mega_menu").removeClass("active");
    }
  });

  $(document).on("click", ".js-searchMenuSubmit", function( e ) {

    var self = $(this),
        searchedText = self.closest(".searchMenuOuter").find(".js-searchMenuText");

    if( searchedText.val() === "" ) return false;

    if( typeof middlePageJson === "string" ) {
      middlePageJson = JSON.parse(middlePageJson);
    }
    if( typeof middlePageJson.pageData === "undefined" || middlePageJson.pageData === null ) return false;

    var recordIds = searchResultRecordIds( $(this) );

    showSearchResult( recordIds, $(this) );

  });

  $(".js-subPageWrapper").on("mouseenter", function(){

      shouldOpenMegaMenu = true;
      resetSearchResult( $(".js-searchTargetList") );
      return false;

  });


}

$(document).on("click", ".js-addHopeDate", function(){

    var self = $(this);

    $(".reserveDateOuter").each(function(){

      if( $(this).hasClass("disnon") ) {
        $(this).removeClass("disnon");
        $(this).find(".isSelection").val(1);
        return false;
      }
    });

    if( self.closest(".js-dateWrapper").find(".disnon").length === 0 ) {
      self.remove();
    }
});

$(document).on("click", ".js-addHopeDeadlineDate", function(){

    var self = $(this);

    $(".deadlineOuter").each(function(){

      if( $(this).hasClass("disnon") ) {
        $(this).removeClass("disnon");
        $(this).find(".isSelection").val(1);
        return false;
      }
    });

    if( self.closest(".js-dateWrapper").find(".disnon").length === 0 ) {
      self.remove();
    }
});

  // 公開側の場合
  if( edit_param === "0" ) {
    // コンバージョンボタン群　一時的に閉じる
    $(".js-deletefixedConversionButton").on("click", function(){

      $("body").attr("data-use-conversion-button-pc", 0).attr("data-use-conversion-button-sp", 0);

    });
  }

  if( sp_param === "1" ) {
      var logoBackgroundImage = $("#smt_head_base").find(".editLogoOuter").css("background-image");
  } else {
      var logoBackgroundImage = $(".editLogoOuter").css("background-image");
  }

  if( logoBackgroundImage !== "none" && logoBackgroundImage !== null && logoBackgroundImage !== undefined ) {

      var logoBackgroundImageUrl = logoBackgroundImage.replace(/^url\(["']?/, '').replace(/["']?\)$/, ''),
          now = Date.now(),
          buildLogoBackgroundImageUrl = logoBackgroundImageUrl + "?rad=" + Date.now();

      $(".editLogoOuter").css("background-image", "url(" + buildLogoBackgroundImageUrl + ")");

  }

////////////////////////////////////////////////////
});//jquery

$(function(){
  $("body").attr("data-main-color", main_color);
});

$(window).on("load", function(){

  var currentDate = new Date();
  var currentDay = currentDate.getDate();
  var currentMonth = currentDate.getMonth() +1;
  var currentYear = currentDate.getFullYear();

  var calendarDate = "day_"+currentYear+"-"+currentMonth+"-"+currentDay;

  $(".js-monthlyCalendarBody #now tbody").find("td").each(function(){

    var date = $(this).attr("id");

    if(date === calendarDate){

      $(this).addClass("currentDay");

    } else {
      //何もしない
    }

  });

});


// picture_main 独自処理
$(function(){
  if (sp_param != 1){// スマホは対象外
    if(design_number == "picture_main"){
      $('<p class="clear"></p>').insertAfter(".thumbnail_box_last");
    }
  }
});


var PictureMainModal = function()
{

  var self = this;
  this.modal;
  this.modalInner;
  this.modalOpenBlock;

  this.isEdit = edit_param === "1";
  this.isModalOpen = false;

  this.MODAL_OPEN_TIME = 250;


  this._initialize = function()
  {
    this._createModal();
    this._createElemet();

    if(isOpen){
      rtEditing  = false;
    }
  };

  // モーダル追加
  this._createModal = function()
  {
    var modal =
    '<div class="pictureMainModal">'
    +'<div>'
    +'<span class="js-pictureMainModalCloseButton" title="閉じる">'
    +'<img src="./img/copy2open/close.png" alt="閉じます">'
    +'</span>'
    +'</div>'
    +'<div class="pictureMainModalInner">'
    +'</div>'
    +'</div>';
    var overLay = "<div class='js-pictureMainOverlay'></div>";
    $("body").append( modal );
    $("body").append( overLay );

    this.overLay = $(".js-pictureMainOverlay");
    this.modal = $(".pictureMainModal");
    this.modalInner = $(".pictureMainModalInner");
  }

  this._createElemet = function()
  {
    imageOverlay = "<div class='js-pictureMainImageOverlay'></div>";
    faqOverlay = "<div class='js-pictureMainFaqOverlay'></div>"
    $(".div_box_faq").append(faqOverlay);
    $(".box_flow").append(faqOverlay);
    $(".box_free, .side_img_box, .box_feature, .box_jirei, .box_coupon, .box_promise, .box_tokuten, .box_voice, .box_setsubi, .box_staff, .campaign_content").append(imageOverlay);

    //画像ブロック
    $(".js-pictureMainImageOverlay").each(function(){
      var editText = $(this).siblings(".editTextOuter").children("h3").children("span");

      if($(this).parent().hasClass("box_voice")){
        var editText = $(this).siblings(".editTextOuter").children("b");
      }

      if($(this).parent().hasClass("side_img_box")){
        var editText = $(this).parent().siblings("h5").children("span");
      }

      editText.clone().removeClass().appendTo($(this));
    })

  }

  this._bind = function()
  {
    // クリック時の処理
    $(document).on("click", ".js-pictureMainModalCloseButton", function(){
      self._closeModal();
    });

    $(document).on("click", ".js-pictureMainOverlay", function(){
      self._closeModal();
      rtEditing = false;
    });

    $(document).on("click", ".js-pictureMainImageOverlay", function(){
      self._openModal( $(this).parent() );
    });
  }


  this._setModalOpenBlock = function( self ){
    this.modalOpenBlock = self;
  }


  this._openModal = function( self )
  {

    if( this.isModalOpen ){
      this._closeModal();
    }


    this.isModalOpen = true;
    $("body").addClass("js-PictureMainModalOpen");
    this._setModalOpenBlock( self );
    this.overLay.fadeIn(this.MODAL_OPEN_TIME);
    this._setModalImage( self );
    this._setModalText();
    this.modal.fadeIn(this.MODAL_OPEN_TIME);
  }


  this._closeModal = function()
  {
    if( !rtEditing ){

      this.isModalOpen = false;
      $("body").removeClass("js-PictureMainModalOpen");

      this.overLay.fadeOut();
      this.modal.fadeOut(this.MODAL_OPEN_TIME);
      $(".js-pictureMainbackgroundImageOuter").fadeOut(this.MODAL_OPEN_TIME);

      setTimeout(function(){
        self._removeModalText();
        $(".js-pictureMainbackgroundImageOuter").remove();
      },this.MODAL_OPEN_TIME);

    }

  }

  // モーダルに文字を表示する
  this._setModalText = function()
  {
    if(this.modalOpenBlock.hasClass("side_img_box")){
      this.modalOpenBlock.siblings().appendTo(this.modalInner);
    }else{
      this.modalOpenBlock.children(".editTextOuter").appendTo(this.modalInner);
    }
  }

  this._setModalImage = function( self )
  {

    var bg = "<div class='js-pictureMainbackgroundImageOuter'></div>";
    $("body").append( $(bg) );

    // youtube
    if( self.find("iframe").length ){

      self.find("iframe").clone().appendTo( $(".js-pictureMainbackgroundImageOuter") );
       $(".js-pictureMainbackgroundImageOuter").fadeIn(this.MODAL_OPEN_TIME);
    }else{

      //画像
      if(this.modalOpenBlock.hasClass("side_img_box")){
        var imageSrc = "url('" +self.find(".side_pict").eq(0).attr("src") + "')";
      }else{
        var imageSrc = "url('" +self.find(".js-imageBlockImage").eq(0).attr("src") + "')";
      }

      $(".js-pictureMainbackgroundImageOuter").css('backgroundImage', imageSrc );
      $(".js-pictureMainbackgroundImageOuter").fadeIn(this.MODAL_OPEN_TIME);
    }
  }

  // モーダルの中身を空にする
  this._removeModalText = function()
  {

    this._returnModalText();
    this.modalInner.empty();
  }

   //モーダルのテキストを元の場所に戻す
  this._returnModalText = function()
  {

    if(this.modalOpenBlock.hasClass("side_img_box")){
      var caption = this.modalInner.find("h5").text();
      this.modalOpenBlock.find(".js-pictureMainImageOverlay").text( caption );

      this.modalOpenBlock.parent().append( this.modalInner.children(":not(.side_img_box)") );
    }else if(this.modalOpenBlock.hasClass("box_voice")){
      var editText = this.modalInner.find(".editTextOuter");
      var caption = editText.find(".b_voice").text();

      this.modalOpenBlock.find(".js-pictureMainImageOverlay").text( caption );
      this.modalOpenBlock.append( editText );

    }else{

      var editText = this.modalInner.find(".editTextOuter").find("h3").find("span").text();

      this.modalOpenBlock.find(".js-pictureMainImageOverlay").text( editText );
      this.modalOpenBlock.append( this.modalInner.children(".editTextOuter") );
    }
  }


  this.run = function()
  {
    this._initialize();
    this._bind();
  }

}

$(function(){

  if(design_number === "picture_main"){
    var modal = new PictureMainModal().run();

    //在庫車
    $(document).on("click", ".thumbnail_box", function(e){
      $(".carthumb_info").removeClass("js-showCarInfo");
      $(this).find(".carthumb_info").removeClass("js-showCarInfo").addClass("js-showCarInfo");
    })

    $(document).on("click", ".js-pictureMainCarImageOverlay",function(){
      $(".carthumb_info").removeClass("js-showCarInfo");
      $(this).parent().siblings(".carthumb_info").removeClass("js-showCarInfo").addClass("js-showCarInfo");

      $(".carlist_info").removeClass("js-showCarInfo");
      $(this).parent().siblings(".carlist_info").removeClass("js-showCarInfo").addClass("js-showCarInfo");
    });

    $(document).on("click", ".js-pictureMainFaqOverlay",function(){

      if(isOpen){
        $(this).siblings(".editTextOuter").find("p").slideDown();
        $(this).siblings(".editTextOuter").slideDown();
        $(this).remove();
      }else{
        $(this).siblings("p").slideDown();
        $(this).siblings(".editTextOuter").slideDown();
        $(this).remove();
      }
    });


    /**
     * 専用3連メニュー動作
     * 100ms毎に高さを取得し、全て揃った時点でイベントをバインドする
     * @return {[type]} [description]
     */
    (function(){

      if( $(window).width() > 480 ){

        var midBoxOuters = $("#h2_box_1, #h2_box_2, #h2_box_3"),
            midBoxTextOuters = midBoxOuters.find(".text_left");
            
        var interval = setInterval(function(){

          var setOriginalHeight = true;

          midBoxTextOuters.each(function(){

            var height = $(this).height();

            if( height > 0 ){
            
              $(this).data("originalHeight", height).attr("data-original-height", height);
            
            } else {

              setOriginalHeight = false;
            
            }

          });

          if( setOriginalHeight ){

            clearInterval( interval );

            midBoxOuters.addClass("js-ready");

            midBoxTextOuters.css({"height" : 0});

            midBoxOuters.each(function(){

              var textOuter = $(this).find(".text_left"),
                  originalHeight = textOuter.data("originalHeight");

              $(this).hover(
                function()
                {
                  textOuter.css({"height" : originalHeight});
                },
                function()
                {
                  textOuter.css({"height" : 0});
                }
              );

            })
         
          }

        }, 100);

      }
      
    }())

  }

});


//h2内のテキストをspanで囲う
$(function(){
  if (design_number == "miniature" || design_number == "ryusenkei" || design_number == "neumorphism" || design_number == "sanwa") {
    $('#body_free .block_outer_free01_01 h2.midashi_long').wrapInner('<span>');
    $('#body_sub h2#middle_top_cardetail').wrapInner('<span>');
    $('#body_sub h2#recommend_h2').wrapInner('<span>');
  }

  // colorful4の時、h2の子要素のspanにあしらいをつけないと成立しないので、ここで公開側のみ動的につける。
  if ( design_number === "colorful4" && isOpen ) {
    $("#body_free").find(".h2_common").wrapInner('<span class="tempSpan4Style">');
  }

});


$(function(){
  if (design_number == "miniature" || design_number == "sanwa") {
    // HTML変更（CSSだけではどうしようもないもの）
      htmlCompulsionMove('h1', 'insertAfter', '#smt_head_base');
    // メインイメージのパララックス
    if($('#floatImage01').length){
      mainimgParallax('#floatImage01','#floatImage02');
    }
    // セクションのパララックス
    $('.block_outer').each(function(){
      const targetSection = $(this);
      const sectionTop = $(this).offset().top;
      $(window).scroll(function() {
        const scrollTop = $(window).scrollTop();
        if( scrollTop > (sectionTop - 300) ){
            targetSection.css('background-position-y', 0 + (sectionTop - scrollTop) / 8);
        }
      });
    });
  }
});

//neon2デザイン セクション内をスクロール中はh2を固定
$(function(){
  if (design_number == "neon2") {
    $('h2:not(#carlist_midashi):not(#middle_top_cardetail):not(#recommend_h2):not(.toppage_h2):not(.cart_h2)').each(function(){
      const fix = $(this);
      const fixWrapper = $(this).closest('.block_outer');
      // 要素がある場合のみ処理
      if($(this).closest("#js_dksmSliderContents").length == 0){
        $(window).scroll(function() {
          if(fixWrapper.length && fix.length) {
            var fixTop = fixWrapper.offset().top;
            var fixEnd = fixWrapper.offset().top + fixWrapper.height() + 50;
            var fixHeight = fix.height();
            var winScroll = $(window).scrollTop();
            var winheight = $(window).height();
            // 対象位置を通過している場合
            // 開始位置を通過する前
            if(winScroll < fixTop) {
              fix.removeClass('is-fixed');
            // 終了位置を通過した後
            } else if(winScroll > fixEnd - fixHeight) {
              fix.removeClass('is-fixed');
            // 対象範囲内の場合
            } else {
              fix.addClass('is-fixed');
            }
          }
        });
      }
    });
  }
});

function htmlCompulsionMove(target, method, dest){
  switch(method){
    case "prependTo":
      $(target).prependTo(dest);
      break;
    case "appendTo":
      $(target).appendTo(dest);
      break;
    case "insertBefore":
      $(target).insertBefore(dest);
      break;
    case "insertAfter":
      $(target).insertAfter(dest);
      break;
  }
}// htmlCompulsionMove



function mainimgParallax(item1, item2){
  var top = $(item1).offset().top;
  var top2 = $(item2).offset().top;

  $(window).scroll(function() {
    var value = $(this).scrollTop();

    if(value <= 900){
      $(item1).removeClass('disnone');
      $(item2).removeClass('disnone');
    }else{
      $(item1).addClass('disnone');
      $(item2).addClass('disnone');
    }
    //取得したスクロール値を矩形のY座標値に指定
    //スクロール値を除算して移動距離に変化をつける
      $(item1).css('bottom', 0 - value / 0.8);
      $(item2).css('bottom', 0 - value / 2);
      $('.slideshow-fadein').css('background-position-y', 0 + value / 2);
  });

}//mainimgParallax





var q_and_a_icon_html = 
    '<img src="/cms/img/common/q_and_a_icon.png.webp" class="q_and_a_btn no_style"  data-large_category="4" data-medium_category="66" style="vertical-align: top;" title="在庫車リストのQ&Aを見る">';


function selectingHilight( selects, freeSearch )
{
  selects.each(function(){
    var self = $(this);

    self.removeClass("searchHilight");

    if( self.val() !== "" ) self.addClass("searchHilight");

  });

  freeSearch.removeClass("searchHilight");
  if( freeSearch.val() !== "" ) freeSearch.addClass("searchHilight");

}

function buildCarlist( selector ) {

    var url = edit_param === "1" ? "/open/carListBuilder.php" : "./carListBuilder.php",
        carSortType = displaySort,
        carSortOrder = displayOrder,
        carFreeSearch = $("#car_free_search").val(),
        carMaker = $("#carMaker_public").val(),
        carName = $("#carName_public").val(),
        carStatus = $("#car_status_public").val(),
        carAgeLower = $("#carAge_lowerLimit_public").val(),
        carAgeUpper = $("#carAge_upperLimit_public").val(),
        carDistanceLower = $("#carDistance_lowerLimit_public").val(),
        carDistanceUpper = $("#carDistance_upperLimit_public").val(),
        carCostLower = $("#carCost_lowerLimit_public").val(),
        carAgeUpper = $("#carAge_upperLimit_public").val(),
        carCostUpper = $("#carCost_upperLimit_public").val(),
        page = 1,
        tags = [],
        tagString = "";

    $(".js-carTag[data-clicked='1']").each(function(){
      var self = $(this);
      tags.push( $(this).attr("data-cartag-id") );
    });

    var tagString = tags.join(",");

    // 変数を定義
    var countFlag = false;

    if( typeof selector !== "undefined" ) {

      if( selector.hasClass( "submit_btn" ) ) {

        countFlag = true;

        var selectElements = $("#carSearchForm_public").find("select"),
            freeSearchElement = $("#car_free_search");

        selectingHilight( selectElements, freeSearchElement );

        $("#isSearch").val("1");
        carSortType = $("input[name='sort_type']:checked").val();
        carSortOrder = $("input[name='sort_order_type']:checked").val();

      } else {

        // ページャークリックの時は差分なしとして、検索回数のカウントをしない
        countFlag = false;

        carSortType = $("input[name='sort_type']:checked").val();
        carSortOrder = $("input[name='sort_order_type']:checked").val();

        if( selector.hasClass( "carListPager" ) ) {
          page = typeof selector.data("page") !== "undefined" ? selector.data("page") : 1;
        } else {
          $("#isSearch").val("0");
        }


      }

      var searchCountLocalstorage = window.localStorage.getItem( "LOCAL_STRAGE_CAR_SERACH_COUNT" );
      if ( searchCountLocalstorage === null || searchCountLocalstorage === "undefined" ) {
        searchCountLocalstorage = 0;
      }

    }


    $.ajax({
      type : "GET",
      url : url,
      dataType : "json",
      data: {
          shopId : pm_shop_id,
          designNumber : design_number,
          pageId : PAGE_ID,
          displayMode : listOrThumbMode,
          smtParam : sp_param,
          editParam : edit_param,
          openFlag : 0,
          carListCount : carListCount,
          cpNumber : cpNumber,
          carListAllCount : carListAllCount,
          maxPage : maxPage,
          loopCntHidden : loopCntHidden,
          isEcSite : isEcSite,
          carInfoRegiDateFlag : carinfo_regi_date_flag,
          carFreeSearch : $("#car_free_search").val(),
          carMaker : $("#carMaker_public").val(),
          carName : $("#carName_public").val(),
          carStatus : $("#car_status_public").val(),
          carAgeLower : $("#carAge_lowerLimit_public").val(),
          carAgeUpper : $("#carAge_upperLimit_public").val(),
          carDistanceLower : $("#carDistance_lowerLimit_public").val(),
          carDistanceUpper : $("#carDistance_upperLimit_public").val(),
          carCostLower : $("#carCost_lowerLimit_public").val(),
          carCostUpper : $("#carCost_upperLimit_public").val(),
          carSafety : $("#car_safety").prop("checked"),
          carMaintenance : $("#car_maintenance").prop("checked"),
          carSortType : carSortType,
          carSortOrder : carSortOrder,
          deleteFlag : $("#delete_flag").val(),
          page : page,
          isSearch : $("#isSearch").val(),
          isAjax : 1,
          usedCarTags: usedCarTags,
          tagString : tagString,
          soldoutFilterShow : soldoutFilterShow,
          shouldShowRecommendOrderTop: shouldShowRecommendOrderTop,
          countFlag : countFlag,
          searchCount : searchCountLocalstorage
      },
      success : function(data)
      {

        window.localStorage.setItem( "LOCAL_STRAGE_CAR_SERACH_COUNT", data.searchCount );

        if( data.matchedCount === 0 ){

          var href = "/contact.html";

          if( !isOpen ){
            href = `/cms/em_sub.php?id=${pm_shop_id}&pgmid=104`;
          }

          var tmp = $(data.html);

          tmp.find("#js-carSearchLeadItem").attr("onclick", `location.href = '${href}';`)

          data.html = tmp.prop("outerHTML");

        }

        if( listOrThumbMode === "thumb" ) {
          $("#carListThumNail_wrapper").html( data.html );
        } else if( listOrThumbMode === "list" ) {
          $("#carlist_main_box").html( data.html );
        } else {
          $("#carListSlideShow_wrapper").html( data.html );
          car_list_slider = new CarlistSlider( $('#carListSlideShow_wrapper') );
          car_list_slider.add_current(0);
          car_list_slider.run();
        }

        if ( data.matchedCount !== 0 && data.displayLink ) {

          var href = "/contact.html";

          if( !isOpen ){
            href = `/cms/em_sub.php?id=${pm_shop_id}&pgmid=104`;
          }

          var tmp = $(data.linkBUttonHtml);

          tmp.find("#js-carSearchLeadItem").attr("onclick", `location.href = '${href}';`)

          data.html = tmp.prop("outerHTML");

          $(".car-search-empty__outer").remove();

          $("#car_list_base").append(data.html);

        }

        $(".carlist_pager_box").html(data.pager);

        // 検索ログ
        loggingSearchUsedcar( { count: data.matchedCount, error: 0 } );

      },

      error : function( XMLHttpRequest, textStatus, errorThrown )
      {

        // 検索ログ
        // loggingSearchUsedcar( { count: data.matchedCount, error: 1 } );
        console.log(XMLHttpRequest, textStatus, errorThrown);
      },
      complete: function(){
          $("#rteditor_loader").remove();
          var mainBoxTopPosition = $("#carlist_main_box").offset().top,
              diff = 150;
          $("html, body").animate({ "scrollTop": mainBoxTopPosition - diff }, 500);
      }

    });


}

function carTagsCount()
{
    var url = edit_param === "1" ? "/open/carListBuilder.php" : "./carListBuilder.php",
        carSortType = displaySort,
        carSortOrder = displayOrder,
        carFreeSearch = $("#car_free_search").val(),
        carMaker = $("#carMaker_public").val(),
        carName = $("#carName_public").val(),
        carStatus = $("#car_status_public").val(),
        carAgeLower = $("#carAge_lowerLimit_public").val(),
        carAgeUpper = $("#carAge_upperLimit_public").val(),
        carDistanceLower = $("#carDistance_lowerLimit_public").val(),
        carDistanceUpper = $("#carDistance_upperLimit_public").val(),
        carCostLower = $("#carCost_lowerLimit_public").val(),
        carAgeUpper = $("#carAge_upperLimit_public").val(),
        carCostUpper = $("#carCost_upperLimit_public").val(),
        page = 1,
        tags = [],
        tagString = "",
        tagsObj = {};

    $(".js-carTag[data-clicked='1']").each(function(){
      var self = $(this);
      tags.push( $(this).attr("data-cartag-id") );
      tagsObj[$(this).attr("data-cartag-id")] = $(this).find(".carTagCount").attr("data-count");
    });

    var tagString = tags.join(",");

    $.ajax({
      type : "GET",
      url : url,
      dataType : "json",
      data: {
          shopId : pm_shop_id,
          designNumber : design_number,
          pageId : PAGE_ID,
          displayMode : listOrThumbMode,
          smtParam : sp_param,
          editParam : edit_param,
          openFlag : 0,
          carListCount : carListCount,
          cpNumber : cpNumber,
          carListAllCount : carListAllCount,
          maxPage : maxPage,
          loopCntHidden : loopCntHidden,
          isEcSite : isEcSite,
          carInfoRegiDateFlag : carinfo_regi_date_flag,
          carFreeSearch : $("#car_free_search").val(),
          carMaker : $("#carMaker_public").val(),
          carName : $("#carName_public").val(),
          carStatus : $("#car_status_public").val(),
          carAgeLower : $("#carAge_lowerLimit_public").val(),
          carAgeUpper : $("#carAge_upperLimit_public").val(),
          carDistanceLower : $("#carDistance_lowerLimit_public").val(),
          carDistanceUpper : $("#carDistance_upperLimit_public").val(),
          carCostLower : $("#carCost_lowerLimit_public").val(),
          carCostUpper : $("#carCost_upperLimit_public").val(),
          carSafety : $("#car_safety").prop("checked"),
          carMaintenance : $("#car_maintenance").prop("checked"),
          carSortType : carSortType,
          carSortOrder : carSortOrder,
          deleteFlag : $("#delete_flag").val(),
          page : page,
          isSearch : 1,
          isAjax : 1,
          usedCarTags: usedCarTags,
          tagString : tagString,
          soldoutFilterShow : soldoutFilterShow,
          shouldShowRecommendOrderTop: shouldShowRecommendOrderTop
      },
      success : function(data)
      {
        if( data.success ) {

          $(".js-carTag").find(".carTagCount").attr("data-count", 0).text( 0 );

          if( Object.keys( tagsObj ).length > 0 ) {

            for( var tagId in tagsObj ) {
              $(".js-carTag[data-cartag-id=" + tagId + "]").find(".carTagCount").attr("data-count", tagsObj[tagId]).text( tagsObj[tagId] );
            }

          }

          if( Object.keys( data.matchedTags ).length > 0 ) {

            for( var tagId in data.matchedTags ) {

                var matchedCount = data.matchedTags[tagId].length;
                $(".js-carTag[data-cartag-id=" + tagId + "]").find(".carTagCount").attr("data-count", matchedCount).text( matchedCount );

            }
          }
        }
      },

      error : function( XMLHttpRequest, textStatus, errorThrown )
      {
        console.log(XMLHttpRequest, textStatus, errorThrown);
      }

    });

}



// 年式の検索で次の年のデータがあるかどうかをbooleanで返す
function isNextAgeExists( array, index ) {
  return typeof array[index+1] === "undefined" || array[index].age !== array[index+1].age;
}



// 区切り文字で分割した結果の配列を返す
function getSearchNameArray( car_free_search )
{
  // 半角 全角どちらでも可
  var separator = /\s+/g;
  return htmlspecialchars(car_free_search).split(separator);
}

// エスケープ処理
function htmlspecialchars( str )
{
  return (str + '')
    .replace(/&/g,'&amp;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/\\/g,'')
    .replace(/\//g,'');
}




function denyMatch( present, present_body, comments, comments_body, search_name )
{
    return present.indexOf( search_name ) === -1 &&
           present_body.indexOf( search_name ) === -1 &&
           comments.indexOf( search_name ) === -1 &&
           comments_body.indexOf( search_name ) === -1;
}

function returnCarlistHighLighted( carlists, search_array )
{

    var ajax = $.ajax({
      async:false,
      type : "POST",
      url : "parts/returnCarlistHighLighted.php",
      dataType : "json",
      data: {
          lists : carlists,
          search_name_array : search_array
      }
    });

    return result = ajax.responseJSON;


}

// 在庫車詳細の特典・ポイントにヒットしたか否か
function freeWordDetailMatch( carlistJson )
{
    return carlistJson.present_highLighted ||
           carlistJson.present_body_highLighted ||
           carlistJson.comments_highLighted ||
           carlistJson.comments_body_highLighted;
}

function buildFreeWordHitHtml( pm_shop_id, carId, searchWord, edit_param, sp_param )
{
  var dataAtt = buildCarDetailDataAtt( pm_shop_id, carId, searchWord, edit_param, sp_param );

  return '<span class="free_search_hit_str" ' + dataAtt + '>詳細ページの本文にヒット</span>';
}


function buildCarDetailDataAtt( pm_shop_id, carId, searchWord, edit_param, sp_param )
{
    var isSp = sp_param === "1",
        isOpen = edit_param === "0",
        href = "",
        encodeWord = encodeURIComponent(searchWord);

    if( isOpen ){

        href = "./carinfo_" + carId + ".html?search_word=" + encodeWord;

    } else {

        if( isSp ){

            href = "./cat_usedcar.php" + "?id=" + pm_shop_id + "&cid=" + carId + "&smt=1&search_word=" + encodeWord;

        } else {

            href = "./cat_usedcar.php" + "?id=" + pm_shop_id + "&cid=" + carId + "&search_word=" + encodeWord;

        }

    }

    return ' data-href="' + href + '"';

}


function returnFreeSearchQuery()
{
    var query = location.search,
        regex = /(\?|&)search_word=(.*?)(&|$)/,
        match = query.match(regex),
        search_word = match !== null && match[2] !== null ? match[2] : "";

        return search_word !== "" ? decodeURIComponent( search_word ) : "";
}

function carDetailPageHighLight( freeSearchString )
{
      var lists = [],
          tmpObj = {},
          present = $(".tokuten_come"),
          present_body = $(".tokuten_body"),
          comments = $(".pr_come"),
          comments_body = $(".pr_body"),
          searchArray = getSearchNameArray( freeSearchString );

      tmpObj["present"] = present.html();
      tmpObj["present_body"] = present_body.html();
      tmpObj["comments"] = comments.html();
      tmpObj["comments_body"] = comments_body.html();

      lists.push(tmpObj);

      var highLightLists = returnCarlistHighLighted( lists, searchArray );

      for( var i in highLightLists ) {
        present.html( highLightLists[i]["present"] );
        present_body.html( highLightLists[i]["present_body"] );
        comments.html( highLightLists[i]["comments"] );
        comments_body.html( highLightLists[i]["comments_body"] );
      }
}





// 在庫車リストの検索ボタンクリック
function carSearchClick(e, selector) {

    if( e !== null ) e.preventDefault();

    carTagsCount();
    buildCarlist( selector );


}

var logoEditOpenFunctions = {
    setSpLogoPositonRight: function()
    {

      if( !logoEditOpenFunctions.isDiffDesign( design_number ) || sp_param === "1" ) {
        var width = $("#smt_head_base .editLogoOuter .smtCompanyName").width(),
            position = width + 20,
            positionStr = position + "px center";

        if( $("#smt_head_base .logoPositionRight").length !== 0 ) {
            $("#smt_head_base .editLogoOuter").css({ "background-position": positionStr });
        } else {
            $("#smt_head_base .editLogoOuter").css({ "background-position": "10px center" });
        }
      }else{
        $("#smt_head_base .editLogoOuter").css({ "background-position": "" });
      }
    },

    isDiffDesign: function( designName )
    {
      return designName === "newspaper" || designName === "denim" || designName === "forest2";
    }
}




/*window.onload=function(){
  if(sp_param != 1 && SPJSFLAG != 1){
    $('.sameheight_img').sameHeight();
  }
}*/


// 在庫車リストスライダー操作クラス（#carListSlideShow_wrapper）
var CarlistSlider = function( carlist_Obj )
{

  var self = this;

  this.class_name = {
    prev_btn: ".prev_btn",
    next_btn: ".next_btn",
    thumbnail_box: ".thumbnail_box"
  };

  this.obj = {};

  this.data = {};

  this.current = 0;



  this.fix_adjust = function()
  {
    self.data.diff = self.data.tmp_current - self.current;
    self.data.adjust = self.data.adjust - (self.data.box_width * self.move_num);
  }

  this.action = function()
  {
    self.remove_current();
    self.add_current(self.current);
    self.slide();
    self.count_area_show();
    //self.obj.carlist.animate( { "margin-left": self.data.adjust + "px" }, 200 );
    //if( !self.data.is_loop_slider ) self.obj.carlist.css( { "transform": "translateX(" + self.data.adjust + "px)" } );
  }


  this.slide = function()
  {

      if( self.current === self.data.carlist_all_count - 1 ) {
        // 最後の在庫車を選んだ時
        self.obj.carlist.animate( { "margin-left": self.data.adjust + "px" }, 200, function(){
          self.obj.carlist.css({ "margin-left": self.data.car_position[self.data.carlist_all_count - 1] + "px" });
          self.data.adjust = self.data.car_position[self.data.carlist_all_count - 1];
        } );
      } else if( self.current === 0 ) {
        // 最初の在庫車を選んだとき
        self.obj.carlist.animate( { "margin-left": self.data.adjust + "px" }, 200, function(){
          self.obj.carlist.css({ "margin-left": self.data.car_position[0] + "px" });
          self.data.adjust = self.data.car_position[0];
        } );
      } else {
        // 最初と最後以外の在庫車を選んだとき
        self.obj.carlist.animate( { "margin-left": self.data.adjust + "px" }, 200, function(){
          self.obj.carlist.css({ "margin-left": self.data.car_position[self.current] + "px" });
          self.data.adjust = self.data.car_position[self.current];
        } );
      }

      /*
      var diff = Math.abs( self.data.diff ),
          is_stay = self.data.diff === 0,
          is_left = self.data.diff < 0,
          is_right = !is_left;


      for( var i = 0; i < diff; i++ ) {

        if( !is_stay ) {
          if( is_left ) {
            //self.left();
          } else if( is_right ) {
            //self.right();
          }
        }

      }
*/

  }

  this.refresh = function( current_num, move_num )
  {

    if( current_num === self.data.carlist_all_count ) {
      self.current = 0;
    } else if( current_num === -1 ){
      self.current = self.data.carlist_all_count - 1;
    } else if( current_num > 0 ){
      self.current = current_num;
    } else {
      // 通ることはないが、絶対値に変換
      self.current = Math.abs(current_num);
    }
    self.move_num = move_num;

    self.fix_adjust();

  }

  this.set_tmp_current = function()
  {
    self.data.tmp_current = self.current;
  }


  // 次へ
  this.next = function()
  {
     self.set_tmp_current();
     self.refresh( ++self.current, 1 );
     self.action();
     self.set_count();
  };

  // 前へ
  this.prev = function()
  {
    self.set_tmp_current();
    self.refresh( --self.current, -1 );
    self.action();
    self.set_count();
  };

  // 在庫車クリック
  this.any_click = function( click_index, car_index, thumb_current )
  {
    self.set_tmp_current();
    self.data.diff = thumb_current - click_index;
    car_index = parseInt(car_index);
    self.refresh( car_index, click_index - thumb_current );
    self.action();
    self.set_count();
  }

  this.left = function()
  {
    self.car_move_right();
    self.car_remove_left();
  }

  this.right = function()
  {
    self.car_move_left();
    self.car_remove_right();
  }


  this.set_count = function()
  {

    var count = self.current + 1;

    if( count === 1 && self.data.diff !== 1 ) {

       self.obj.count_outer.addClass("loop_first");

       setTimeout(function(){
        self.obj.count_outer.removeClass("loop_first");
       }, 200);

       setTimeout(function(){
        self.obj.count_outer.addClass("loop_first");
       }, 400);

       setTimeout(function(){
        self.obj.count_outer.removeClass("loop_first");
       }, 600);

    } else {
        self.obj.carlist_slider_count.find(".current_count").text( count );
    }

  }


  // 在庫車総数
  this.carlist_all_count = function()
  {
    return $(self.class_name.thumbnail_box).length > 0 ? $(self.class_name.thumbnail_box).length : 0;
  };

  // 現在何番目か
  this.carlist_current = function()
  {
    return self.current;
  };

  // ページエリア表示
  this.count_area_show = function()
  {

    if( self.data.carlist_all_count === 0 ){
      self.obj.carlist_slider_count.addClass("slide_btn_none");
    } else {
      self.obj.carlist_slider_count.removeClass("slide_btn_none");
    }

    self.reset_btn_mask();

    if( !self.data.is_loop_slider ) self.carlist_btn_mask();

    $(".carlist_slider_count").find(".current_count").html( self.current + 1 );
    $(".carlist_slider_count").find(".max_count").html( self.data.carlist_all_count );

    $('.carlist_pager_box').css({display: 'none'});

  }

  this.reset_btn_mask = function()
  {
      $(".prev_img_outer, .next_img_outer").removeClass("carlist_btn_mask_shadow").find(".carlist_btn_mask").addClass("carlist_btn_mask_none");
  }

  this.carlist_btn_mask = function()
  {

      if( self.current === 0 && self.current + 1 === self.data.carlist_all_count ) {
        self.obj.prev_img_outer.addClass("carlist_btn_mask_shadow").find(".carlist_btn_mask").removeClass("carlist_btn_mask_none");
        self.obj.next_img_outer.addClass("carlist_btn_mask_shadow").find(".carlist_btn_mask").removeClass("carlist_btn_mask_none");

        return;
      }

      if( self.current === 0 ) {
        self.obj.prev_img_outer.addClass("carlist_btn_mask_shadow").find(".carlist_btn_mask").removeClass("carlist_btn_mask_none");
      } else if( self.current + 1 === self.data.carlist_all_count ) {
        self.obj.next_img_outer.addClass("carlist_btn_mask_shadow").find(".carlist_btn_mask").removeClass("carlist_btn_mask_none");
      } else {
        $(".prev_img_outer, .next_img_outer").removeClass("carlist_btn_mask_shadow").find(".carlist_btn_mask").addClass("carlist_btn_mask_none");
      }
  }


  // 前、または後ろに何台必要か（可視領域 / 2 / 在庫車の幅）
  this.carlist_count_one_side = function()
  {
    return Math.round( self.data.carlist_outer_width / 2 / self.data.box_width);
  }

  // 前と後ろ、合計何台必要か（可視領域 / 2 / 在庫車の幅） * 2
  this.carlist_count_both = function()
  {
    return self.carlist_count_one_side() * 2;
  }

  // 可視領域に何台表示できるか（可視領域 / 2 / 在庫車の幅） * 2 + 中心の在庫車
  this.display_max = function()
  {
    return self.carlist_count_both + 1 ;
  }

  // 表示できる数より在庫車のほうが少ないか否か（可視領域に在庫車が収まるか否か）
  this.is_low = function()
  {
    return self.carlist_all_count - self.display_max() < 0;
  }

  // 最低でも出す数
  this.under_count = function()
  {
    return self.display_max + this.carlist_count_both();
  }

  // current付与
  this.add_current = function( num )
  {
    self.obj.carlist.find(".thumbnail_box[data-car-index=" + num + "]").addClass("js-current").addClass("carPurun");
  }

  this.remove_current = function( num )
  {
   self.obj.carlist.find(".thumbnail_box").removeClass("js-current").removeClass("carPurun");
  }

  this.set_element = function()
  {
    self.obj.carlist = carlist_Obj; // スライダーHTMLオブジェクト
    self.obj.carlist_outer = $("#carlist_main_box");
    self.obj.carlist_box = carlist_Obj.find(self.class_name.thumbnail_box);
    self.obj.slider_count_outer = $("#car_list_base").find(".carlist_slider_count");
    self.obj.current_count = self.obj.slider_count_outer.find(".current_count");
    self.obj.max_count = self.obj.slider_count_outer.find(".max_count");
    self.obj.carlist_slider_count = $(".carlist_slider_count");
    self.obj.count_outer = self.obj.carlist_slider_count.find(".count_outer");
    self.obj.prev_img_outer = $(".prev_img_outer");
    self.obj.next_img_outer = $(".next_img_outer");
  }


  this.set_data = function()
  {
    self.data.carlist_all_count = self.carlist_all_count();
    self.data.box_width = self.obj.carlist_box.outerWidth(true);
    self.data.box_outer_width = self.data.box_width * self.data.carlist_all_count;
    self.data.carlist_outer_width = self.obj.carlist_outer.outerWidth();
    self.data.car_index = 0;
    //self.data.adjust = ((self.data.carlist_outer_width - self.data.box_width) / 2) - (self.data.box_width * 3);
    self.data.adjust = ((self.data.carlist_outer_width - self.data.box_width) / 2);
    self.data.is_loop_slider =self.data.carlist_all_count > self.carlist_count_one_side() + 2;

  }


  this.set_car_click_index = function( num )
  {
    self.data.car_index = num;
  }

  this.return_center_position = function()
  {
    return (self.data.carlist_outer_width - self.data.box_width) / 2;
  }

  this.set_adjust = function()
  {
    if( self.data.is_loop_slider ) {
      // ループ表示に
      self.data.adjust = (self.return_center_position()) - (self.data.box_width * (self.carlist_count_one_side() + 1));
    } else {
      self.data.adjust = self.return_center_position();
    }

    // 先頭の最初の位置
    self.data.first_adjust = self.data.adjust;
    // 最後の位置
    self.data.last_adjust = self.data.first_adjust - (self.data.box_width * (self.data.carlist_all_count - 1));

    // 車種の位置の配列
    self.data.car_position = [];
    for( var i = 0; i < self.data.carlist_all_count; i++ ) {
      var position = self.data.first_adjust - (self.data.box_width * i);;
      self.data.car_position.push(position);
    }

  }

  // 包括領域
  this.set_wrap_area = function( width )
  {
    self.data.box_outer_width = width + (self.data.box_outer_width * 2);
  }

  this.stylable_css = function()
  {

    if( self.data.carlist_all_count === 0 ) {
      self.data.box_outer_width = "auto";
      self.data.adjust = 0;
    }

    self.obj.carlist.css( { "width": self.data.box_outer_width, "margin-left": self.data.adjust +  "px" } );

    setTimeout(function(){
      self.obj.carlist.css({"opacity": 1});
      self.obj.carlist_slider_count.css({"opacity": 1});
    }, 170);

  }

  this.event_bind = function()
  {

    self.event_off();

    $(self.class_name.prev_btn).on("click", self.prev);

    $(self.class_name.next_btn).on("click", self.next );

    $(document).on("click", ".thumbnail_box:not('.js-current')", function( e ){
      e.preventDefault();
      var click_target = $(this),
          click_index = click_target.index(),
          car_index = click_target.attr("data-car-index");
      self.any_click( click_index, car_index, $(".thumbnail_box.center_element.js-current").index() );
    });

  }

  this.event_off = function()
  {
    $(self.class_name.prev_btn).off();
    $(self.class_name.next_btn).off();
    $(document).find(".thumbnail_box:not('.js-current')").off();
  }

  this.clone = function()
  {
    if( self.data.carlist_all_count > 0 ) {

      self.obj.carlist.find(".clear").remove();

      if( self.data.is_loop_slider ) {

        for( var i=0; i < self.data.carlist_all_count; i++ ) {
          self.obj.carlist.append(self.obj.carlist_box.clone(true).removeClass("center_element").eq(i));
        }

        for( var i=self.data.carlist_all_count; i > self.data.carlist_all_count - self.carlist_count_one_side() - 1; i-- ) {

          self.obj.carlist.prepend(self.obj.carlist_box.clone(true).removeClass("center_element").eq(i-1));

        }

      }
    }
  }


  // 前へスライドしたときに後ろの在庫車を消す
  this.car_remove_right = function()
  {
    var last_thumbnail_box = self.obj.carlist.find(".thumbnail_box").length - 1;
    self.obj.carlist.find(".thumbnail_box").eq(last_thumbnail_box).remove();
  }

  // 後ろにスライドしたときに前の在庫車を消す
  this.car_remove_left = function()
  {
      self.obj.carlist.find(".thumbnail_box").eq(0).remove();
  }

  // 後ろの在庫車をクローン
  this.car_clone_right = function()
  {
    var last_thumbnail_box = self.obj.carlist.find(".thumbnail_box").length - 1;
    return self.obj.carlist.find(".thumbnail_box").eq(last_thumbnail_box).clone(true);
  }

  // 前の在庫車をクローン
  this.car_clone_left = function()
  {
    return self.obj.carlist.find(".thumbnail_box").eq(0).clone(true);
  }

  // 前に在庫車を配置
  this.car_move_left = function()
  {
    var clone_obj = self.car_clone_right();
    clone_obj.prependTo("#carListSlideShow_wrapper");
  }

  // 後ろに在庫車を配置
  this.car_move_right = function()
  {
    var clone_obj = self.car_clone_left();
    clone_obj.appendTo("#carListSlideShow_wrapper");
  }

  this.return_carlist_count_html = function()
  {
    return '<div class="carlist_slider_count">' +
              '<p class="prev_img_outer">' +
                  '<span class="carlist_btn_mask carlist_btn_mask_none"></span>' +
                  '<span class="prev_btn">' +
                      '<img src="./img/usedcar/carslider_prev.png" class="prev_img" alt = "前へ">' +
                  '</span>' +
              '</p>' +
              '<p class="count_outer">' +
                  '<span class="current_count"></span>' +
                  '/' +
                  '<span class="max_count"></span>' +
              '</p>' +
              '<p class="next_img_outer">' +
                  '<span class="carlist_btn_mask carlist_btn_mask_none"></span>' +
                  '<span class="next_btn">' +
                      '<img src="./img/usedcar/carslider_next.png" class="next_img" alt = "次へ">' +
                  '</span>' +
              '</p>' +
            '</div>';

  }

  this.reset = function()
  {

    self.obj = {};
    self.data = {};

  }


  this.run = function()
  {
    self.clone();
    self.set_wrap_area( self.carlist_count_both() * self.data.box_width );
    self.set_adjust();
    self.stylable_css();
    self.count_area_show();
    self.event_bind();
  }

  this.__construct = function()
  {
    self.reset();
    self.set_element();
    self.set_data();
  }();

};




$(window).on("load",function(){

   /**************************************************************/
   /* sky2で追加したjs */
   /**************************************************************/


    $("#smt_conversion_btn").addClass("activeCbn").fadeIn(300);

/* 20170619 スマートフォンレイアウト改修 ここまで*/

  /***************************************************************************************/
  // 抱きしめーるブロック・「車検なし」を選んだとき
  /***************************************************************************************/
  if( $('.dksm_regist select[name="shaken_expired_year"]').length !== 0 ){

    var shakenExpiredYearOption = $('.dksm_regist select[name="shaken_expired_year"]');
    var shakenExpiredMonthAndDayOption = $(".dksm_regist .toggle");

    $(shakenExpiredYearOption).change(function(){

      if( shakenExpiredYearOption.val() === "-1" ){

        shakenExpiredMonthAndDayOption.stop().fadeOut(300);

      } else {

        shakenExpiredMonthAndDayOption.stop().fadeIn(300);

      }

    })

  }


  if( UsedCarDetailSlideShowEvent.is.start ){

    // スマホ時
    if( UsedCarDetailSlideShowEvent.obj.window.width() <= 480 ){
      
      // 画像読み込み後に、サムネイル上のマスクの幅を調整。
      UsedCarDetailSlideShowEvent.obj.iconWrapped.css({"width" : UsedCarDetailSlideShowEvent.obj.icon.width() });

      UsedCarDetailSlideShowEvent.obj.arrow.right.css({"top" : UsedCarDetailSlideShowEvent.obj.image.height() / 2});
    
      UsedCarDetailSlideShowEvent.obj.arrow.left.css({"top" : UsedCarDetailSlideShowEvent.obj.image.height() / 2 });

    } else {

      // 画像読み込み後に、サムネイル上のマスクの幅を調整。
      UsedCarDetailSlideShowEvent.obj.iconWrapped.css({"width" : "100%" });

    }

  }

  var recruitBannerLink = $("#recruit_banner_block").find(".recruit_banner_page_link");

  if( recruitBannerLink.length > 0 ) {
    var recruitBannerLinkWidth = recruitBannerLink.width();
    if( recruitBannerLinkWidth > 200 ) {
      recruitBannerLink.addClass("linkBanner-large");
    } else {
      recruitBannerLink.addClass("linkBanner-small");
    }
  }


   /***ここまで ロード浚えたあとにする処理**********************************************************/

});


// 画像ブロック関連
// スムースな描画のため、document.ready, window.loadを厳密に使い分ける。
// ￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣￣

// imageBoxに関する処理の親玉

// imageBoxに関する処理の親玉
var imageBoxManager,
    imageBoxSliders = [];
    imageBoxMultiSliders = [];


$(function(){

    // imageBox関連処理管理開始
    if( !isOpen ){
      imageBoxManager = new ImageBoxManager( $(".js-changeableBoxImageLayoutBox") );
      imageBoxManager.documentReady();
    }

    var callback = !isOpen ? imageBoxManager.toggleImageControllerAtSliderBox : function(){};


    // スライダー初期化
    $(".js-imageBoxSlider").each(function(){

        var self = $(this);
        var imageBoxSize = self.closest(".js-imageBox").attr("data-size");

        if( imageBoxSize === "max" ){

          sliderWrapWidth = "100%";

        } else if( imageBoxSize === "halfmax" ){

          sliderWrapWidth = "50%";

        } else if( isUseFullWidthImage(self) ){

          sliderWrapWidth = "50%";

        } else {

          // js-imageBlockImageに画像が入っていない時に、幅が狭くなるので、img指定を追加。
          sliderWrapWidth = self.find("img.js-imageBlockImage").outerWidth();

        }

        var sliderInstance = new ImageBoxSlider( $(this), callback, sliderWrapWidth );
        
        sliderInstance.documentReady();

        imageBoxSliders.push( sliderInstance );

    });

    if( !isOpen ) imageBoxManager.bindDragUploadEvent( $(".js-imageBlockImage") );

    $(".js-imageBoxMultiSlider").each(function(){

        var self = $(this);

        var multiSliderInstance = new ImageBoxMultiSlider( $(this), callback );
        
        multiSliderInstance.documentReady();

        imageBoxMultiSliders.push( multiSliderInstance );


    });

});


function isUseFullWidthImage( obj )
{

    var offset = 2; // 100%とjqueryのwidthを組み合わせている関係か小数点以下の扱いにばらつきが、他に方法はないか…

    var isFullWidth = obj.find(".js-imageBlockImage").attr("width") === "100%";
    
    var sliderWrapWidth = Math.floor( obj.find(".js-imageBlockImage").outerWidth(true) );
    var divBoxWidth = Math.floor( obj.width() );

    // if( $(window).width() < 480 ) return true;

    if( isFullWidth ){ // width属性ついてるならそちらで判定

        return true;

    }

    if( !divBoxWidth ){

        return false;

    } else if ( Math.abs(sliderWrapWidth - divBoxWidth) <= offset ){

        return true;

    } else {

        return false;

    }

}


var cssjstimer = setInterval(function(){


    if( !isOpen ){

      if ( !imageBoxManager ) {
          imageBoxManager = new ImageBoxManager( $(".js-changeableBoxImageLayoutBox") );
      }
      if( typeof imageBoxManager.windowLoad !== "undefined" ){
        imageBoxManager.windowLoad();
      }
    }


    if( $(window).width() > 480 ){

        // 画像の高さ均一化
        var imageLoader = new ImageLoad( $(".js-imageBlockImage") );

        imageLoader.run().done(function(){

            $(".js-imageBoxContentsWrapper").each(function(){

                // 画像の高さ均一化しない
                if( !$(this).data("noHeightAdjusterInitial") ){
                
                    var imageBoxContents = $(this).find(".js-imageBoxOuter"),
                        adjuster = new ImageBoxHeightAdjuster( imageBoxContents, ".js-adjustHeightImage" );

                    adjuster.windowLoad();

                }

            });

        });

    }

    // スライダーに関してのみ、別途画像の高さを均一化。
    // 対象セレクタが違うため同スコープで取り扱いづらいため。
    imageBoxSliders.forEach(function(instance){

        instance.windowLoad(); 

    });

    imageBoxMultiSliders.forEach(function(instance){

        instance.windowLoad(); 

    });


    if( isBlockScrollDesign ) {
        new BlockScroll( $(".block_outer") ).exec();
    }

    if( !blockManagerInstance ){
      blockManagerInstance = new slideShowBlockManager()
    }
    blockManagerInstance.setBlockScrollTop();

    clearInterval(cssjstimer)

}, 1000);




// スライドショー化するクラス
var SlideShowBlock = function( slideOuterObj )
{

    var self = this;

    this.slideOuterObj;

    this.isScrollFinish = false;

    this.layoutBox = ".js-slideTarget";

    this.nextBtn = ".sliderBlockNextBtn";

    this.prevBtn = ".sliderBlockPrevBtn";

    this.countBar = ".js-blockSliderProgressItem";

    this.blockPosition = 0;

    this.obj = {};

    this.data = {};

    this.set = function()
    {
        self.obj.slideShowBoxOuter = self.slideOuterObj.closest( ".js-slideShowBoxOuter" );
        self.targetAddClass();
        self.elementCount = self.returnElementCount( self.slideOuterObj );
        self.childrenWidth = self.returnChildrenWidth( self.slideOuterObj );

    }

    this.setPosition = function()
    {
      self.blockPosition = self.slideOuterObj.offset().top;
    }

    this.targetAddClass = function()
    {
        self.slideOuterObj.addClass("js-slideTargetOuterElement");
        self.slideOuterObj.find(".slideTarget").each(function(){
          $(this).addClass("js-slideTarget");
        });
    }

    this.boxWrap = function()
    {
       self.slideOuterObj.wrapAll('<div class="js-slideShowBoxOuter slideShowBoxOuter">');
    };

    this.buildProgressHtml = function( sliderContentLength )
    {
      
      var tmp = '<div class = "js-blockSliderProgressOuter blockSliderProgressOuter">';

      if(self.elementCount < 4){
        tmp = '<div class = "js-blockSliderProgressOuter blockSliderProgressOuter" style="text-align : center">';
      }

      for( var i = 0; i < self.elementCount; i++ ){
        tmp += '<span class = "js-blockSliderProgressItem blockSliderProgressItem"></span>'
      }

      tmp += "</div>";

      return tmp;
      
    }


    this.buildSliderControllerHtml = function( sliderContentLength )
    {
      if(self.elementCount > 1){ // 2つ以上ブロックがある場合のみ出す
        var tmp =  '<div class="sliderBlockBtnOuter">';
            tmp += '<p id="" class="sliderBlockPrevBtn"></p>';
            tmp += self.buildProgressHtml( sliderContentLength );
            tmp += '<p id="" class="sliderBlockNextBtn"></p>';
            tmp += '</div>';

            return tmp;
      }

    }


    this.addCurrent = function( visibleAreaObject, index )
    {
      visibleAreaObject.find(".js-blockSliderProgressOuter").find(".js-blockSliderProgressItem").removeClass("js-current").eq( index ).addClass("js-current");
    }

    this.addPagingBtn = function( html )
    {
      self.slideOuterObj.closest(".slideShowBoxOuter").append( html );
    }

    this.returnElementCount = function( slideOuterObj )
    {
      return slideOuterObj.find(self.layoutBox).length;
    }

    this.returnChildrenWidth = function( slideOuterObj )
    {
      return slideOuterObj.find(self.layoutBox).outerWidth(true);
    }

    this.cssStylable = function()
    {
      return self.elementCount !== 0 && self.childrenWidth !== null;
    }

    this.cssApply = function()
    {
      if( self.cssStylable() ) {
        self.obj.slideShowBoxOuter.css( { "width": self.childrenWidth } );
        self.slideOuterObj.css({ "width": self.elementCount * self.childrenWidth });
        self.slideOuterObj.find(self.layoutBox).css({ "width": self.childrenWidth });
        self.slideOuterObj.find(self.layoutBox).eq(0).addClass("current");
      }
    }





    this.prev = function( obj )
    {

        self.setSlideTargetData(obj);
        self.prevMove();

    };


    this.next = function( obj )
    {

        self.setSlideTargetData(obj);
        self.nextMove();

    };

    this.bar = function( obj )
    {
        self.setSlideTargetData(obj);
        self.barMove();

    };

    this.setSlideTargetData = function( obj )
    {

        self.data.slideTargetOuterElement = obj.closest(".js-slideShowBoxOuter").find(".js-slideTargetOuterElement");
        self.data.BoxOuter = self.data.slideTargetOuterElement.closest(".js-slideShowBoxOuter");
        self.data.ProgressItem = self.data.BoxOuter.find(".js-blockSliderProgressItem");
        self.data.ProgressItemIndex = self.data.ProgressItem.index( obj );
        self.data.count = self.data.slideTargetOuterElement.find(self.layoutBox).length;
        self.data.box = self.data.slideTargetOuterElement.find(self.layoutBox);
        self.data.target = self.data.slideTargetOuterElement.find(self.layoutBox + ".current");
        self.data.index = self.data.target.index();
        self.data.targetWidth = self.returnChildrenWidth( self.data.slideTargetOuterElement );

    }

    this.nextMove = function()
    {

        if( self.data.index + 1 >= self.data.count ) {

          var move = 0;
          self.data.slideTargetOuterElement.css({ "transform": "translateX(" + move + "px)" });
          self.data.target.removeClass("current");
          self.data.box.eq(0).addClass("current");
          self.addCurrent( self.data.BoxOuter, 0 );
        } else {

          var move = -(self.data.targetWidth * (self.data.index + 1));

          self.data.slideTargetOuterElement.css({ "transform": "translateX(" + move + "px)" });

          self.data.target.removeClass("current").next(self.layoutBox).addClass("current"); // next()の引数ありなので誤動作はない

          self.addCurrent( self.data.BoxOuter, self.data.index + 1 );

        }

        self.adjustHeight();

    }


    this.prevMove = function()
    {

        self.addCurrent( self.data.slideTargetOuterElement.closest(".js-slideShowBoxOuter"), self.data.index - 1 );

        if( self.data.index <= 0 ) {
          //$(".sliderBlockPrevBtn").addClass("sliderPrevBtnNone");
          var move = -(self.data.targetWidth * (self.data.count - 1));
          self.data.slideTargetOuterElement.css({ "transform": "translateX(" + move + "px)" });
          self.data.target.removeClass("current");
          self.data.box.eq( self.data.index - 1 ).addClass("current");

        } else {
          //$(".sliderBlockPrevBtn").removeClass("sliderNextBtnNone");
          var move = -(self.data.targetWidth * (self.data.index - 1));

          self.data.slideTargetOuterElement.css({ "transform": "translateX(" + move + "px)" });

          self.data.target.removeClass("current").prev(self.layoutBox).addClass("current"); // prev()の引数ありなので誤動作はない
        }

        self.adjustHeight();

    }

    this.barMove = function()
    {

        if( self.data.ProgressItemIndex === 0 ) {
          var move = 0;
          self.data.slideTargetOuterElement.css({ "transform": "translateX(" + move + "px)" });
          self.data.target.removeClass("current");
          self.data.box.eq(0).addClass("current");
          self.addCurrent( self.data.BoxOuter, 0 );
        } else {

          var move = -(self.data.targetWidth * (self.data.ProgressItemIndex));

          self.data.slideTargetOuterElement.css({ "transform": "translateX(" + move + "px)" });

          self.data.target.removeClass("current");
          self.data.box.eq(self.data.ProgressItemIndex).addClass("current");

          self.addCurrent( self.data.BoxOuter, self.data.ProgressItemIndex );

        }

        self.adjustHeight();

    };

    this.adjustHeight = function()
    {
      var currentIndex = self.data.slideTargetOuterElement.find(".js-slideTarget.current").index();
          blockHeight = self.data.slideTargetOuterElement.find(".js-slideTarget").eq(currentIndex).outerHeight(true);
      self.data.target.closest(".js-slideTargetOuterElement").css({ "height": blockHeight + "px" });
    };

    this.shouldRemove = function()
    {
        if( isOpen ){

          var blockOuter = slideOuterObj.closest(".block_outer");

          return blockOuter.find("img").length === 0 && blockOuter.text().trim().length === 0;
        
        } else {

          return false;
        
        }
        
    }

    this.init = function()
    {

      if( slideOuterObj === null || typeof slideOuterObj === "undefined" || slideOuterObj === "" ) return false;

      if( self.shouldRemove() ) slideOuterObj.closest(".block_outer").remove();

      self.boxWrap();
      self.set();
      self.setPosition();
      self.addPagingBtn( self.buildSliderControllerHtml( self.elementCount ) );
      self.cssApply();

      // 初期表示は最後
      self.addCurrent( self.obj.slideShowBoxOuter, hasLocationHash ? 0 : 1 );
      if( !hasLocationHash ) self.next(self.slideOuterObj);
      // 現在表示されてる内包ブロックの高さが包括ブロックの高さとする
      //self.adjustHeight();
    }


    this.__construct = function()
    {

        self.slideOuterObj = slideOuterObj;
        self.init();

    }();

}


var slideShowBlockManager = function()
{
    var self = this;

    this.blockInstance;

    this.blockInstanceArray = [];

    this.targetOuterBlock = ".block_outer";

    this.blockName = [
        ".div_box_flow",
        ".div_box_feature",
        ".div_box_jirei",
        ".div_box_coupon",
        ".div_box_promise",
        ".div_box_tokuten",
        ".div_box_voice",
        ".div_box_campaign",
        ".div_box_setsubi",
        ".div_box_staff",
        ".div_box_free",
        ".div_box_appeal",
        ".div_box_price"
    ];


    this.isSlideShow = function( slideOuterObj )
    {
      return self.isSlideShowBlockDesign() && self.isSlideShowBlock( slideOuterObj );

    }
    this.isSlideShowBlockDesign = function()
    {
      return isSlideShowDesign === 1;
    }

    this.isSlideShowBlock = function( slideOuterObj )
    {
      var res = false;

      for( var i in self.blockName ) {
        if( self.isTargetBlock( slideOuterObj, self.blockName[i] ) ) {
          res =  true;
          break;
        }
      }

      return res;
    }

    this.isTargetBlock = function( slideOuterObj, blockName )
    {
      var block = slideOuterObj.find(blockName);
      return block.length >= 1 && !self.isCarlistBlock(block) && !self.isLeadBlock(block);
    }


    this.isCarlistBlock = function( slideOuterObj )
    {
      return slideOuterObj.closest(".block_outer_carlist").length > 0;
    }


    this.isLeadBlock = function( slideOuterObj )
    {
      return slideOuterObj.closest(".block_outer_lead").length > 0;
    }


    this.returnTargetBlock = function( slideOuterObj )
    {
      var res = "";
      for( var i in self.blockName ) {
        var tmpObj = slideOuterObj.find( self.blockName[i] );
        if( tmpObj.length >= 1 ) {
          res =  slideOuterObj.find( self.blockName[i] );
          break;
        }
      }

      return res;
    }

    this.exec = function()
    {

      var blockOuter = $(self.targetOuterBlock);

      if( blockOuter.length > 0 ) {

        blockOuter.each(function(){
          if( self.isSlideShow( $(this) ) ) {
            self.blockInstanceArray.push(new SlideShowBlock( self.returnTargetBlock( $(this) ) ));
          }
        });

      }

    }

    this.setBlockScrollTop = function()
    {
      if( self.blockInstanceArray.length > 0 ) {
          for( var i in self.blockInstanceArray ) {
              var instance = self.blockInstanceArray[i];
              instance.setPosition();
          }
      }
    }

    this.addHighLightEvent = function( scrollTop )
    {
      for( var i in self.blockInstanceArray ){

          if( self.blockInstanceArray[i].blockPosition < scrollTop && !self.blockInstanceArray[i].isScrollFinish ) {
              self.blockInstanceArray[i].prev( self.blockInstanceArray[i].slideOuterObj );
              self.blockInstanceArray[i].isScrollFinish = true;
              setTimeout(function(){
                $(self.blockInstanceArray[i].nextBtn).addClass("hi-icon_side_scroll");
                self.setBlockScrollTop();
              }, 400);
              break;
          }
      }
    }

    this.__construct = function()
    {
        self.blockInstance = new SlideShowBlock();
    }();
}




// ブロックごとのスクロール処理
var BlockScroll = function( targetElements )
{
  var self = this;

  this.const = {
    "scrollLimit": 200
  }

  this.data = {};

  this.position = {};

  this.obj = {};

  this.className = {
    "up": ".js-blockScrollUp",
    "down": ".js-blockScrollDown",
    "btn": ".js-blockScrollBtn",
  }

  this.notTargetBlock = ["pankuzu01", "pagetitle"];

  this.isPc = sp_param === "0";

  this.html = "";

  this.animateTime = 350;

  this.spScrollFix =150;

  // 縦スクロール時に横スクロール発火タイミング微調整
  this.adjustScrollApply = 250;

  this.scrollTimer;

  this.set = function()
  {
    self.obj.targetElements = targetElements;
    self.data.windowHeight = $(window).height();
    self.setPositionData();
  }

  this.setPositionData = function()
  {
    if( !self.empty() ) {
      self.obj.targetElements.each(function(){
        var className = $(this).attr("class"),
            selector = self.returnSelector(className),
            position = $(selector).offset().top;
        self.position[className] = position;
      });
    }
  }

  // スクロール対象のブロックがあるか否か
  this.empty = function()
  {
    return self.obj.targetElements.length === 0;
  }

  this.up = function()
  {
    var target = $(".js-blockScrollBtn.js-current").prev(".js-blockScrollBtn");
        targetData = target.attr("data-target"),
        targetTop = self.isPc ? self.position[targetData] : self.position[targetData] - self.spScrollFix;
    if( targetData === "first" ) {
      $("html, body").animate({ "scrollTop": 0 }, self.animateTime);
    } else {
      $("html, body").animate({ "scrollTop": targetTop }, self.animateTime);
    }
  };

  this.down = function()
  {
    var target = $(".js-blockScrollBtn.js-current").next(".js-blockScrollBtn");
        targetData = target.attr("data-target"),
        targetTop = self.isPc ? self.position[targetData] : self.position[targetData] - self.spScrollFix;

    if( targetData === "first" ) {
      $("html, body").animate({ "scrollTop": 0 }, self.animateTime);
    } else {
      $("html, body").animate({ "scrollTop": targetTop }, self.animateTime);
    }

  };

  this.btn = function( target )
  {

    var selectorName = self.returnSelector(target);

    if( selectorName === "first" ) {
      var targetTop = 0;
      $(self.className.up).addClass("disable");
    } else {
      var selector = $(selectorName),
          targetTop = self.isPc ? selector.offset().top : selector.offset().top - self.spScrollFix;
      $(self.className.up).removeClass("disable");
    }

    $("html, body").animate({ "scrollTop": targetTop }, self.animateTime);

  };

  this.scroll = function( scrollTop )
  {
    var posDataLength = Object.keys(self.position).length;

    $(self.className.up).removeClass("disable");
    $(self.className.down).removeClass("disable");

    if( scrollTop === 0 ) {
      self.removeCurrent();
      $(".js-blockScrollBtn[data-target='first']").addClass("js-current");
      $(self.className.up).addClass("disable");
      return;
    }

    var loopCount = 0;
    for( var i in self.position ){
      loopCount++;
      var elemPosition = self.position[i];
      if( scrollTop > elemPosition - 200 ) {
          self.removeCurrent();
          $(".js-blockScrollBtn[data-target='" + i + "']").addClass("js-current");

          if( loopCount === posDataLength ) {
            $(self.className.down).addClass("disable");
          }
      }
    }
  }

  this.returnSelector = function( target )
  {
    if( target === "first" ) {
      selector = "first";
    } else {
      var splitStr = target.split(" ");
      var selector = "";
      for( var i in splitStr ) {
        selector += "." + splitStr[i];
        if( parseInt(i) + 1 === splitStr.length ) break;
      }
    }

    return selector

  }

  this.stylableCss = function()
  {
    self.data.scrollBarHeight = $("#blockScrollBar").height();
    self.data.scrollBarTop = (self.data.windowHeight - self.data.scrollBarHeight) / 2;
    $("#blockScrollBar").css({ "top": self.data.scrollBarTop + "px" });
  }

  this.returnBtnHtml = function( className )
  {
    return '<li class="blockScrollBtn js-blockScrollBtn" data-target="' + className + '"></li>';
  };

  this.buildHtml = function()
  {

    if( !self.empty() ){
      $("body").append(self.outerHtml);

      var blockScroll = $(".blockScroll"),
          topStr = '<li class="blockScrollBtn js-blockScrollBtn js-current" data-target="first"></li>';

      blockScroll.append(topStr);

      self.obj.targetElements.each(function(){
        var className = $(this).attr("class"),
            btnHtml = self.returnBtnHtml( className );
            flag = true;

        for( var i in self.notTargetBlock ){
          if( className.indexOf( self.notTargetBlock[i] ) !== -1 ) {
            flag = false;
          }
        }

        if( flag ) blockScroll.append(btnHtml);

      });
    }

  };

  this.outerHtml = function()
  {
    var outerHtml = 
    '<div id="blockScrollBar">' +
      '<p class="blockScrollUp js-blockScrollUp disable">' +
        '<img src="./img/cmscss/all_scroll/common/vartical_scroll_btn_prev.png" title="上のブロックに移動します">' +
      '</p>' +
      '<div class="blockScrollOuter">' +
      '<ul class="blockScroll">' +
      '</ul>' +
      '</div>' +
      '<p class="blockScrollDown js-blockScrollDown">' +
        '<img src="./img/cmscss/all_scroll/common/vartical_scroll_btn_next.png" title="下のブロックに移動します">' +
      '</p>' +
    '</div>';

    return outerHtml;
  };

  this.removeCurrent = function()
  {
    $(".js-blockScrollBtn").removeClass("js-current");
  }

  this.addCurrent = function( target )
  {
    target.addClass("js-current");
  }

  this.eventBind = function()
  {
    $(document).on("click", self.className.btn, function(){
        var target = $(this),
            targetData = target.attr("data-target");
        self.removeCurrent();
        self.addCurrent( target );
        self.btn( targetData );
    });

    $(document).on("click", self.className.up, function(){
      if( !$(this).hasClass("disable") ) self.up();
    });

    $(document).on("click", self.className.down, function(){
      if( !$(this).hasClass("disable") ) self.down();
    });

    $(window).scroll(function(e){

      if( self.scrollTimer ){
        clearTimeout(self.scrollTimer);
      }

      self.scrollTimer = setTimeout(function(){
        var scrollTop = $(this).scrollTop(),
            sideScrollLimitPosition = scrollTop + ($(window).height() / 2 + self.adjustScrollApply);
        self.scroll( scrollTop );
        if( !hasLocationHash ) blockManagerInstance.addHighLightEvent( sideScrollLimitPosition );
      }, 10);

    });
    

    $(window).keydown(function( e ){
      var keyCode = e.keyCode;
      if( keyCode === 38 ) {
        self.up();
      } else if( keyCode === 40 ) {
        self.down();
      }
    });

/*
    var mousewheelevent = 'onwheel' in document ? 'wheel' : 'onmousewheel' in document ? 'mousewheel' : 'DOMMouseScroll';

    $(document).on(mousewheelevent, function( e ){
      var startPos = self.wheelValue;
      var delta = e.originalEvent.deltaY ? -(e.originalEvent.deltaY) : e.originalEvent.wheelDelta ? e.originalEvent.wheelDelta : -(e.originalEvent.detail);

      if (delta < 0){
          e.preventDefault();
          self.wheelValue += delta;
          var isDown = true;
        } else if (delta > 0){
          e.preventDefault();
          //上にスクロールした場合の処理
          console.log(delta);
          self.wheelValue += delta;
          var isDown = false;
        }


        if( (Math.abs(self.wheelValue) - Math.abs(startPos)) > 100 ) {
          if( isDown ) {
            self.down();
          } else {
            self.up();
          }
        }

        console.log(self.wheelValue , startPos);

    });
*/

  }

  this.exec = function()
  {
    self.buildHtml();
    self.stylableCss();
    self.eventBind();
  };

  this.__construct = (function()
  {
    self.set();
  })();

}


var returnUsedcarIdFromQuery = function( query )
{
    var regex = /usedcar_id=([0-9]*?)$/i,
        match = query.match(regex),
        usedcar_id = match !== null && match[1] !== null ? match[1] : "";

    return usedcar_id !== "" ? usedcar_id : "";
}

var usedcarIdToHiddenValue = function()
{
    if( $(".js-usedcar_id_value").length === 0 ) return false;

    var usedcar_id = returnUsedcarIdFromQuery( location.search );
    $(".js-usedcar_id_value").val(usedcar_id);
}

var usedcarUrlToHiddenValue = function()
{
    if( $(".js-usedcar_url_value").length === 0 ) return false;
    $(".js-usedcar_url_value").val(document.referrer);
}






CarItemUrl = new CarItemUrl( pm_shop_id, isOpen, sp_param );
CostUtil = new CostUtil();


var shoppingActionInstance,
    shoppingModel,
    cartBarManager;


// URL生成


$(function(){

  // JSONデータ読み込み後
  shoppingModel = new ShoppingModel(
    typeof carListJsonPublic !== "undefined" ? carListJsonPublic : null,
    typeof carListJsonHidden !== "undefined" ? carListJsonHidden : null
  );

  shoppingActionInstance = new ShoppingAction(
    pm_shop_id,
    isOpen,
    sp_param,
    isEcSite,
    shoppingModel
  );

  shoppingActionInstance.bind();

  cartBarManager = new CartBarManager(
    pm_shop_id,
    isOpen,
    sp_param,
    isEcSite,
    typeof isItemPage !== "undefined" && isItemPage,
    typeof currentItemId !== "undefined" ? currentItemId : null
  );


  cartBarManager.refresh(true);
  cartBarManager.bind();


 /**
 * facebookIfram関連処理
 */

  var resizeTimer = null;
  var resizeSpan = 200;
  var facebookIframe = null;
  // ロードイベントはしらない時があるため、一定時間ロードイベントが実行されなければローダ外す
  var isFacebookInit = false; 
  var initWaitTime = 3000;

  $("#js-facebookFrame").on("load",function(){

    if( facebookIframe === null ){
      isFacebookInit = true;
      facebookIframe = new FacebookIframe($("#js-facebookFrame"));
      facebookIframe.reload();
    }

    $("#js-facebookLoader").fadeOut(250);
    $("#js-facebookFrame").addClass("Loaded");
  });

  setTimeout(function(){
    if(!isFacebookInit && $('#js-facebookFrame').length){
      facebookIframe = new FacebookIframe($("#js-facebookFrame"));
      facebookIframe.reload();
      $("#js-facebookLoader").fadeOut(250);
      $("#js-facebookFrame").addClass("Loaded");      
    }
  },initWaitTime);

  // 要素有でリサイズイベント張っておく
  if($('#js-facebookFrame').length){
    $(window).resize(function(e){
       if( resizeTimer !== false ) clearTimeout( resizeTimer );
       resizeTimer = setTimeout(function(){
         if(facebookIframe !== null){
          facebookIframe.reload();
         }
      }, resizeSpan);

    });
  }

  /**
   * facebookIframe
   * @return {[type]} [description]
   */
  var FacebookIframe = function($iframe){

    var self = this;
    var FACEBOOK_IFRAME_MAX_WIDTH = 500;
    var FACEBOOK_IFRAME_PARENT_SEL = "#facebook_wrapper";
    var FACEBOOK_IFRAME_SRC = "https://www.facebook.com/plugins/page.php";
    var FACEBOOK_DATA_KEY_WIDTH = "width";
    var FACEBOOK_PARAM_KEY_WIDTH = "width";

    // リサイズ前幅
    this.beforeWidth = FACEBOOK_IFRAME_MAX_WIDTH;
    this.afterWidth = 0;

    this.IframeSrc = "";

    this.obj = {
      iframe:$iframe,
    };

    // iframをいい幅にしてリロード
    this.reload = function(){

      // ローダー表示
      $("#js-facebookLoader").fadeIn(300);

      self.afterWidth = self.getParentWidth();
      if(!self.shouldReload()) {
        self.beforeWidth = self.afterWidth;
        return;
      };

      // iframe内の要素の幅変更
      self.createFacebookUrl();

      self.obj.iframe.removeClass("Loaded");
      self.obj.iframe.attr("src",self.facebookUrl);
      self.obj.iframe.attr(FACEBOOK_DATA_KEY_WIDTH,self.afterWidth);
      self.beforeWidth = self.afterWidth;
    }

    this.shouldReload = function()
    {

      var isDiff = self.beforeWidth !== self.afterWidth;
      if(!isDiff) return false;

      if(self.afterWidth < 500){
        return true;
      }else{
        if (self.beforeWidth < FACEBOOK_IFRAME_MAX_WIDTH){
          self.afterWidth = FACEBOOK_IFRAME_MAX_WIDTH;
          return true;
        };
      };
    }
  
    // iframeの親要素の幅取得
    this.getParentWidth = function()
    {
      return $(FACEBOOK_IFRAME_PARENT_SEL).width();
    }
  
    this.getIframeSrc = function(){
      return this.obj.iframe.attr("src");
    }

    this.getURLParams = function()
    {
      var src = self.getIframeSrc();
      var param = src.match(/\?([^?]*)$/);
      
      if (!param || param[1] === '') return false;
      
      var tmpParams = param[1].split('&');
      var keyValue  = [];
      var params    = {};

      for (var i = 0; i < tmpParams.length; i++){
          keyValue = tmpParams[i].split('=');
          params[keyValue[0]] = keyValue[1];
      }
      
      return params;
    }

    this.createFacebookUrl = function()
    {
      var tmpUrl = FACEBOOK_IFRAME_SRC;
      var isFastParam = true;

      for (var key in self.iframeParams){
        
        var value = "";

        switch(key){
          case "width":
            value = self.afterWidth;
            break;

          default:
            value = self.iframeParams[key];
            break;
        }

        if(typeof value === "undefined"){
          continue;
        }

        if(isFastParam){
          tmpUrl +="?" + key + "=" + value;
          isFastParam = false;
        }else{
          tmpUrl +="&" + key + "=" + value;
        }

      }

      self.facebookUrl = tmpUrl;
      return;
    }

    // iframe内要素もゲット
    this.__construct = function()
    {
      self.iframeParams = self.getURLParams();
    }();

  }

});

function buildZaikoStatusChangerHtml( itemId, soldOutFlag, usedcarId, shopId, pageId, recordId )
{

  if( itemId == 2 ){
      return '<span class="statusChangeOuter">' +
          '<span class="statusChange" data-sold-out-flag="' + soldOutFlag + '" data-usedcar-id="' + usedcarId + '" data-shop-id="' + shopId + '" data-page-id="' + pageId + '" data-record-id="' + recordId + '" data-update-value = "0" data-status="zaiko_ari">在庫有り</span>' +
          '<span class="statusChange" data-sold-out-flag="' + soldOutFlag + '" data-usedcar-id="' + usedcarId + '" data-shop-id="' + shopId + '" data-page-id="' + pageId + '" data-record-id="' + recordId + '" data-update-value = "1" data-status="zaiko_baikyaku">売却済み</span>' +
          '<span class="statusChange" data-sold-out-flag="' + soldOutFlag + '" data-usedcar-id="' + usedcarId + '" data-shop-id="' + shopId + '" data-page-id="' + pageId + '" data-record-id="' + recordId + '" data-update-value = "8" data-status="zaiko_daiko">代行販売</span>' +
      '</span>';
  } else{
      return '<span class="statusChangeOuter">' +
          '<span class="statusChange" data-sold-out-flag="' + soldOutFlag + '" data-usedcar-id="' + usedcarId + '" data-shop-id="' + shopId + '" data-page-id="' + pageId + '" data-record-id="' + recordId + '" data-update-value = "0" data-status="zaiko_ari">在庫有り</span>' +
          '<span class="statusChange" data-sold-out-flag="' + soldOutFlag + '" data-usedcar-id="' + usedcarId + '" data-shop-id="' + shopId + '" data-page-id="' + pageId + '" data-record-id="' + recordId + '" data-update-value = "1" data-status="zaiko_baikyaku">売却済み</span>' +
          '<span class="statusChange" data-sold-out-flag="' + soldOutFlag + '" data-usedcar-id="' + usedcarId + '" data-shop-id="' + shopId + '" data-page-id="' + pageId + '" data-record-id="' + recordId + '" data-update-value = "8" data-status="zaiko_daiko">代行販売</span>' +
          '<span class="statusChange" data-sold-out-flag="' + soldOutFlag + '" data-usedcar-id="' + usedcarId + '" data-shop-id="' + shopId + '" data-page-id="' + pageId + '" data-record-id="' + recordId + '" data-update-value = "10" data-status="zaiko_newcar">新車</span>' +
          '<span class="statusChange" data-sold-out-flag="' + soldOutFlag + '" data-usedcar-id="' + usedcarId + '" data-shop-id="' + shopId + '" data-page-id="' + pageId + '" data-record-id="' + recordId + '" data-update-value = "11" data-status="zaiko_unused">未使用車</span>' +
          '<span class="statusChange" data-sold-out-flag="' + soldOutFlag + '" data-usedcar-id="' + usedcarId + '" data-shop-id="' + shopId + '" data-page-id="' + pageId + '" data-record-id="' + recordId + '" data-update-value = "9" data-status="zaiko_syodan">商談中</span>' +
      '</span>';
  }
}

$(function(){
    usedcarIdToHiddenValue();
    usedcarUrlToHiddenValue();
})


$(window).load(function(){

  shoppingActionInstance.setAvailableIcon();

})


// 各種フォーム認証チェック機能
$(function(){
    if( $('.checkbox__no-robot').length > 0 ){ // もし認証チェックボックスが有れば

        $('.checkbox__no-robot').each(function() {
            var blockName = $(this).attr("data-block"),
                checkBoxId = $(this).attr("id"),
                errorMessageCheckBox = $('.label__no-robot[for =  "' + checkBoxId + '"').find('.js-errorMessageCheckBox'),
                checkBox = $(this);
            $('button[type = "submit"][data-block-name = "' + blockName + '"').on('click', function(e){
                if( checkBox.prop('checked') || $(e.target).hasClass("inplace_normal") ) {
                } else {
                    errorMessageCheckBox.fadeIn(400);
                    $(".inputbtn.submitting").removeClass("submitting");
                    return false;
                }
            });
            checkBox.on('click', function(){
                errorMessageCheckBox.fadeOut(400);
            });
        });

    }

});



var PopUpSlideShowController = function()
{

  var self = this;

  this.jqObjectCurrentTrigger;

  this.showed = false;


  this.shouldShowCaption = function( string )
  {
    var emptyText = EMPTY_TEXT_OF_INPLACE;
    return typeof string !== "undefined" && string !== null && string !== emptyText;
  }




  this.refreshLeadIcon = function()
  {

    var indexes = $(".js-imageBoxPopUpTrigger").length,
        prevable = indexes > 1 && self.currentIndex !== 0,
        nextable = indexes > 1 && self.currentIndex !== indexes - 1;

    $(".popup-wrapper").attr(
      {
        "data-prevable" : Number( prevable ),
        "data-nextable" : Number( nextable ),
        "data-zoom" : 0
      }
    );

  }

  this.zoomObserver = function()
  {

    if ('visualViewport' in window) {
      window.visualViewport.addEventListener('resize', self.resizeEvent);
    }else{
      window.addEventListener('resize', self.resizeEvent);
    }

  }

  this.resizeEvent = function()
  {

      var cvButtonDisplayZoomigData = $(".conversionButtonFixedOuter").attr("data-zooming-hide");

      var zoom = 0;

      if ('visualViewport' in window) {
        zoom = window.visualViewport.scale;
      } else {
        zoom = document.body.clientWidth / window.innerWidth;
      }

      if ( zoom > 1.2 ) {
        $(".popup-wrapper").attr("data-zoom","1");
        if ( cvButtonDisplayZoomigData === "0" ) {
          $(".conversionButtonFixedOuter").attr("data-zooming-hide","1");
        }
      }else{
        $(".popup-wrapper").attr("data-zoom","0");
        $(".conversionButtonFixedOuter").attr("data-zooming-hide","0");
      }

  }

  this.scroll = function( jqObjectTrigger )
  {

    var dest = jqObjectTrigger.offset().top - $(window).height() / 2;

    $("html, body").animate({scrollTop : dest}, 300);

    // window.scrollTo( 0, dest )

  }


  this.countInfo = function( jqObjectTrigger )
  {

    return {
      current : self.getIndex( jqObjectTrigger ) + 1,
      all : $(".js-imageBoxPopUpTrigger").length
    };
    
  }


  this.show = function( jqObjectTrigger )
  {

    var mode = jqObjectTrigger.attr("data-popup-mode"); //画像 or PDF
    var src = jqObjectTrigger.attr("data-popup-src");

    var captionHeadObj = jqObjectTrigger.closest(".imageBoxContents").find(".captionHead");
    var captionBodyObj = jqObjectTrigger.closest(".imageBoxContents").find(".captionBody");

    var countInfo = self.countInfo( jqObjectTrigger );


    if( mode === "image" ){

      $("meta[name='viewport']").attr("content","width=device-width,initial-scale=1.0,minimum-scale=1.0,maximum-scale=2.0,user-scalable=yes");

        var popUpHtml = `
        <div class = "popup-wrapper show" data-popup-mode = "image">
          <div class="popup-container">
            <figure class = "popup-figure">`;

        popUpHtml += `
              <p class = "popup-counter-outer">
                <span class = "popup-counter-item popup-counter-item__current">${countInfo.current}</span>
                <span class = "popup-counter-item popup-counter-item__slash">/</span>
                <span class = "popup-counter-item popup-counter-item__all">${countInfo.all}</span>
              </p>
        `;

        var h2Text = jqObjectTrigger.closest(".block_outer").find("h2").text();

        if( self.shouldShowCaption(h2Text) ){
          popUpHtml += `<p class = "head-background">${h2Text}</p>`;
        }

        popUpHtml += `
              <span class = "js-popupController popup-controll-item" data-key = "prev" title = "前の画像に戻ります"></span>
              <img src = "${src}" alt="" class = "popup-figure__image">
              <figcaption class = "popup-figure__caption">`;

        // もしキャプションを表示する設定になっているならポップアップ内に表示
        if( captionHeadObj.hasClass("captionHead--block") ) {

            var figcaptionHeadText = captionHeadObj.find("span").html();

            if( self.shouldShowCaption(figcaptionHeadText) ){
              popUpHtml += `<p class = "popup-figure__caption-head">${figcaptionHeadText}</p>`;
            }

        }

        // もしキャプションを表示する設定になっているならポップアップ内に表示
        if( captionBodyObj.hasClass("captionBody--block") ) {

            var figcaptionBodyText = captionHeadObj.find("span").html();

            if( self.shouldShowCaption(figcaptionBodyText) ){
              popUpHtml += `<p class = "popup-figure__caption-body">${figcaptionBodyText}</p>`;
            }

        }
        
        popUpHtml += `</figcaption>
              <span class="popup-figure__button"></span>
              <span class = "js-popupController popup-controll-item" data-key = "next" title = "次の画像に進みます"></span>
              <p class = "popup-figure__about">※ポップアップ設定済みの${countInfo.all}枚の画像をスライドショーで表示しています</p>
            </figure>
          </div>
        </div>`;

    } else {

        var popUpHtml = ` 
        <div class = "popup-wrapper show" data-popup-mode = "pdf">
          <div class="popup-container">
              <figure class = "popup-figure">`;

        popUpHtml += `
              <p class = "popup-counter-outer">
                <span class = "popup-counter-item popup-counter-item__current">${countInfo.current}</span>
                <span class = "popup-counter-item popup-counter-item__slash">/</span>
                <span class = "popup-counter-item popup-counter-item__all">${countInfo.all}</span>
              </p>
        `;

        var h2Text = jqObjectTrigger.closest(".block_outer").find("h2").text();

        if( self.shouldShowCaption(h2Text) ){
          popUpHtml += `<p class = "head-background">${h2Text}</p>`;
        }

        popUpHtml += `
                  <span class = "js-popupController popup-controll-item" data-key = "prev" title = "前の画像に戻ります"></span>
                  <iframe src = "${src}" alt="" class = "popup-figure__iframe" height = "100%" width = "100%" marginwidth = "0" marginheight = "0" scrolling = "auto"></iframe>
                  <span class="popup-figure__button"></span>
                  <span class = "js-popupController popup-controll-item" data-key = "next" title = "次の画像に進みます"></span>
                  <p class = "popup-figure__about">※ポップアップ設定済みの${countInfo.all}枚の画像をスライドショーで表示しています</p>
              </figure>
          </div>
        </div>`;

    }


    if( self.showed ){

      self.scroll( jqObjectTrigger );

      $(".popup-wrapper").replaceWith( popUpHtml );

    } else {

      self.showed = true;

      $("body").append(popUpHtml);

      setTimeout(function(){

        $("body").attr("data-animated-popup", "1");

      }, 1050);
    
    }

    self.zoomObserver();
    self.refreshLeadIcon();

  }




  this.getIndex = function( jqObjectTrigger )
  {
    return jqObjectTrigger.index( ".js-imageBoxPopUpTrigger" );
  }




  this.bind = function()
  {

    $(document).on('click','.js-imageBoxPopUpTrigger', function(){

      self.currentIndex = self.getIndex( $(this) );

      self.jqObjectCurrentTrigger = $(this);
  
      self.show( $(this) );

    });


    $(document).on('click','.popup-figure__button, .popup-wrapper', function(){

      self.showed = false;

      $("body").attr("data-animated-popup", "0");

      var popUpWrapper = $(".popup-wrapper");

      popUpWrapper.removeClass("show").addClass("hide");

      window.visualViewport.removeEventListener('resize', self.resizeEvent);
      window.removeEventListener('resize', self.resizeEvent);

      $("meta[name='viewport']").attr("content","width=device-width,initial-scale=1.0,minimum-scale=1.0,maximum-scale=1.0,user-scalable=yes");

      setTimeout(function(){ // アニメーションさせてから消すために遅延実行

        popUpWrapper.remove();

      },600);

    });


    $(document).on("click", ".js-popupController", function(){

      switch( $(this).attr("data-key") ){

        case "next":

          if( $(".popup-wrapper").attr("data-nextable") === "1" ){
            self.currentIndex++;
            self.show( $(".js-imageBoxPopUpTrigger").eq( self.currentIndex ) );
          }

        break;

        case "prev":

          if( $(".popup-wrapper").attr("data-prevable") === "1" ){
            self.currentIndex--;
            self.show( $(".js-imageBoxPopUpTrigger").eq( self.currentIndex ) );
          }
        break;

      }

      

    })


    $(document).on('click','.js-linkTriggerEdit, .js-popUpTriggerEdit, .popup-figure', function(event){

        event.stopPropagation();

    });
  }



  self.__construct = function()
  {

  }()



}




var popupSlideShowController = new PopUpSlideShowController();


// ポップアップ機能
$(function(){

  popupSlideShowController.bind();

});



// スマホ時 お問合せ、お見積りボタンを上に持ってくる

$(function(){

  if( typeof sp_param !== "undefined" && typeof SPJSFLAG !== "undefined"){

    if( SPJSFLAG === 1 && sp_param === "1" ){
  
      var forcedMoveCvButtonnew = new ForcedMoveCvButton();

      forcedMoveCvButtonnew.run();

    }

  }

});


var ForcedMoveCvButton = function()
{

  var self = this;

  this.def = null;

  this.gmenuObj = {
    ul          : null,
    gmenuTop    : null
  }

  this.baseObj = {
    contact     : null,
    estimate    : null
  }

  this.cloneObj = {
    contact     : null,
    estimate    : null
  }


  this.set = function()
  {

    var menuPosition = $("#wrapper").attr("data-menu-position");

    if ( menuPosition === "top" ) {

      self.gmenuObj.ul = $('#menu_top > ul');
      self.gmenuObj.gmenuTop = $('#gmenu_top_top');
      self.baseObj.contact  = $('#gmenu_contact_top');
      self.baseObj.estimate = $('#gmenu_estimate_top');

    }else if( menuPosition === "middle" ){

      self.gmenuObj.ul = $('#menu_middle > ul');
      self.gmenuObj.gmenuTop = $('#gmenu_top_middle');
      self.baseObj.contact  = $('#gmenu_contact_middle');
      self.baseObj.estimate = $('#gmenu_estimate_middle');

    }else if( menuPosition === "right" || menuPosition === "left" ){

      self.gmenuObj.ul = $('#menu_left_right > ul');
      self.gmenuObj.gmenuTop = $('#gmenu_top_left_right');
      self.baseObj.contact  = $('#gmenu_contact_left_right');
      self.baseObj.estimate = $('#gmenu_estimate_left_right');

    }

  }


  this.cloneCvButton = function()
  {

    self.def = $.Deferred();

    var menuPosition = $("#wrapper").attr("data-menu-position");

    if ( menuPosition === "top" ) {

      self.cloneObj.contact  = $('#gmenu_contact_top').clone();
      self.cloneObj.estimate = $('#gmenu_estimate_top').clone();

    }else if( menuPosition === "middle" ){

      self.cloneObj.contact  = $('#gmenu_contact_middle').clone();
      self.cloneObj.estimate = $('#gmenu_estimate_middle').clone();

    }else if( menuPosition === "right" || menuPosition === "left" ){

      self.cloneObj.contact  = $('#gmenu_contact_left_right').clone();
      self.cloneObj.estimate = $('#gmenu_estimate_left_right').clone();

    }

    self.def.resolve();

  }


  this.moveCvButton = function()
  {

    self.def.promise().then(function(){ // cloneされてから

      self.baseObj.contact.remove();
      self.baseObj.estimate.remove();

    })
    .then( function(){ //元の要素消してから

      self.gmenuObj.ul.prepend( self.cloneObj.estimate );
      self.gmenuObj.ul.prepend( self.cloneObj.contact );

      self.gmenuObj.ul.addClass('MovedCvButton');
      self.gmenuObj.gmenuTop.addClass('clear');

    });

  }

  this.run = function()
  {

    self.set();
    self.cloneCvButton();
    self.moveCvButton();

  }


}


/**
 * 2021-08-04 北川
 * スマホグローバルメニュー
 * メニュー展開時下から上へスクロールする効果を付与
 */

$(window).load(function() {

  if( typeof sp_param !== "undefined" && typeof SPJSFLAG !== "undefined"){

    if( SPJSFLAG === 1 && sp_param === "1" ){
  
      var preScrollGlobalMenu = new PreScrollGlobalMenu();

      preScrollGlobalMenu.initialize();

      $(document).on('click', '#menu_trigger', function(){

          preScrollGlobalMenu.run();

      });

    }

  }

});


var PreScrollGlobalMenu  = function()
{


  var self = this;

  this.menuWrapperObj = null;

  this.set = function()
  {

    self.menuWrapperObj = $(".menu_wrapper");

  }


  this.mobileMenuSetPrePosition = function()
  {

    self.menuWrapperObj.scrollTop(100);

  }


  this.mobileMenuScrollToTop = function()
  {

    self.menuWrapperObj.animate({
      scrollTop: 0
    });

  }


  this.initialize = function()
  {

    self.set();
    self.mobileMenuSetPrePosition();

  }


  this.run = function()
  {

    self.mobileMenuScrollToTop();

  }

}


var ParallaxStylier = function( dataSet )
{


  var self = this;


  this.dataSet = {
    main : [],
    free : []
  };


  this.buildSelector = function( fieldId, pageId, recordId )
  {

    var attributes = [];

    attributes.push( "[data-field-id = '" + fieldId + "']" );
    attributes.push( "[data-page-id = '" + pageId + "']" );

    if( recordId !== null ){
      attributes.push( "[data-record-id='" + recordId + "']" );
    }

    return ".parallaxContent" + attributes.join("");

  }


  this.styling = function()
  {

    if( navigator.userAgent.indexOf('iPhone') !== -1 ){
      $(".js-parallaxContentOuter").addClass("ios");
    }

    if( !$.isEmptyObject( self.dataSet.main ) ){

      for( var pageId in self.dataSet.main ){

        for( var fieldId in self.dataSet.main[pageId] ){

          var styles = self.dataSet.main[pageId][fieldId],
              selector = self.buildSelector( fieldId, pageId, null );

          if( !$.isEmptyObject( styles ) ){

            for( var property in styles ){

              var value = styles[property];

              if( property === "texture" ){

                $(selector).attr( "data-texture", value );

              } else if( property === "color" ) {

                $(selector).attr( "data-color", value );

              } else if( property === "display_caption_head" ) {

                $(selector).find(".parallaxCaptionHead").attr( "data-display", value );

              } else if( property === "display_caption_body" ) {

                $(selector).find(".parallaxCaptionBody").attr( "data-display", value );

              } else if( property === "caption_position" ) {

                $(selector).attr( "data-position", value );
                $(selector).find(".parallaxCaptionWrapper").attr( "data-position", value );

              } else {

                $(selector).css(property, value);

              }

              $(selector).closest(".js-parallaxContentOuter").attr("data-loading", "0");

            }

          } else {
            $(selector).closest(".js-parallaxContentOuter").attr("data-loading", "0");
          }

        }

      }

    } else {

      $(".js-parallaxContentOuter").attr("data-loading", "0");

    }


    if( !$.isEmptyObject( self.dataSet.free ) ){

      for( var pageId in self.dataSet.free ){

        for( var recordId in self.dataSet.free[pageId] ){

          for( var fieldId in self.dataSet.free[pageId][recordId] ){

            var styles = self.dataSet.free[pageId][recordId][fieldId],
                selector = self.buildSelector( fieldId, pageId, recordId );

            if( !$.isEmptyObject( styles ) ){

              for( var property in styles ){

                var value = styles[property];

                if( property === "texture" ){

                  $(selector).attr( "data-texture", value );

                } else if( property === "color" ) {

                  $(selector).attr( "data-color", value );

                } else if( property === "display_caption_head" ) {

                  $(selector).find(".parallaxCaptionHead").attr( "data-display", value );

                } else if( property === "display_caption_body" ) {

                  $(selector).find(".parallaxCaptionBody").attr( "data-display", value );

                } else if( property === "caption_position" ) {

                  $(selector).find(".parallaxCaptionWrapper").attr( "data-position", value );

                } else {

                  $(selector).css(property, value);

                }

                $(selector).closest(".js-parallaxContentOuter").attr("data-loading", "0");

              }

            } else {
              $(selector).closest(".js-parallaxContentOuter").attr("data-loading", "0");
            }

          }

        }

      }

    } else {

      $(".js-parallaxContentOuter").attr("data-loading", "0");

    }

  }


  this.buildDeviceString = function()
  {
    return isSmartPhoneAccess() || $(window).width() <= 480 ? "sp" : "pc";
  }


  this.__construct = function()
  {
    self.device = self.buildDeviceString();
    self.dataSet.main = dataSet[ self.device ].main;
    self.dataSet.free = dataSet[ self.device ].free;
  }()

}



$(function(){
  if( useParallax ){
    var parallaxStyler = new ParallaxStylier( parallaxDataSet );
    parallaxStyler.styling();
  }
})


// 見出し装飾コントローラー
var h2Animator;

if( typeof h2AnimationName !== "undefined" ){

  $(function(){

    h2Animator = new H2Animator(design_number, h2AnimationName);

    if( h2Animator.shouldAnimate() ){

      // 各要素に手配
      $("#main_contents h2:not(.toppage_h2)").each(function(){
        h2Animator.ready( $(this) );
      });


      // h2全体のopacityは解除
      $("body").attr("data-h2-animate-ready", "1");


      // 監視開始
      observeVisibleVertical(
        "#main_contents h2",
        h2Animator.getRange(),
        {
          visible : function(jqH2Object, entry){
            h2Animator.fire( jqH2Object );
          },
          hidden : function(jqH2Object, entry){}
        }
      );

    } else {

      $("body").attr("data-h2-animate-ready", "1");

    }

  })

}


// 1.delayつける
// 2.可視範囲に入ったらfired
$( function(){

  $("h2,h3,h4,h5,td,p,.b_campaign,#sideCalendar_01_1").each( function(){

    var count = 0;
    var singleStrings = $(this).find(".splited");

    singleStrings.each( function(){

      delay = count * 0.05;

      $(this).css("animation-delay", delay + "s");

      count++;

    });

  });

  observeVisibleVertical(
    "h2,h3,h4,h5,td,p,.b_campaign,#sideCalendar_01_1",
    { start : "12.5%", end : "87.5%" },
    {
      visible : function( animationObj ){
        animationObj.find(".splited").addClass("fired");
      },
      hidden : function(){}
    }

  );



  $(".common-animation__label").each(function(){
    $(this).addClass("common-animation__label--ready");
  });

  observeVisibleVertical(
    "h2,h3,h4,h5,td,p,.b_campaign,#sideCalendar_01_1",
    { start : "12.5%", end : "87.5%" },
    {
      visible : function( animationObj ){

        animationObj.find(".common-animation__label").each(function( index ){

          var obj = $(this);

          setTimeout(function(){
            obj.addClass("common-animation__label--animating");
          }, ( index + 1 ) * 125 + 500 );

          setTimeout(function(){
            obj.removeClass("common-animation__label common-animation__label--animating");
          }, ( index + 1 ) * 125 + 1750 );

        });

      },
      hidden : function(){}
    }

  );

});


/**
 * メインイメージ
 * @param {[type]} dataSet [description]
 */

var MainImageStyler = function( dataSet )
{

  var self = this;

  this.dataSet = null;

  this.originalStyleDataSet = {};

  this.slidePatternClasses = {
    "fadein" : "slideshow-fadein",
    "slidedown" : "slideshow-slidedownn",
    "zoomin" : "slideshow-zoomin",
    "zoomout" : "slideshow-zoomout"
  };


  this.styleable = function()
  {
    return self.dataSet !== null;
  }


  this.styleString2Object = function( string )
  {

    var res = {};

    if ( string !== null ) {

      var tmp = string.split(";");

      if( tmp ){

        tmp.forEach(function( value ){

          var tmp2 = value.split(":"),
              property = tmp2[0],
              value = tmp2[1];

          if( tmp2[0] !== "" && tmp2[1] !== "" ){

            var trimedValue = value.trim();

            // background-positionの指定がついているクラスが無くて、0% 0%になることがあったので対応
            if ( property.trim() === "background-position" ) {
              if ( trimedValue === "0% 0%" ) {
                  trimedValue = "50% 50%";
              }
            }

            res[ property.trim() ] = trimedValue;

          }

        });
      
      }

    }


    return res;

  }




  this.prevnextWithDefault = function()
  {

    for( var imageType in self.dataSet ){
      var styles = self.dataSet[ imageType ];
      for( var imageIndex in styles ){
        var style = styles[ imageIndex ],
            selector = "#bgSlider_" + imageIndex;

        if ( !$(selector).hasClass(self.slidePatternClasses[ slideShowName ]) ) {
          self.addTmpSliderPatternClass( $(selector) );
        }

        self.saveOriginalStyle( $(selector) );

        $(selector).css( self.styleString2Object( style ) );

      }
    }
  }


  this.oldMainImage = function()
  {
    for ( var imageType in self.dataSet ){

      var styles = self.dataSet[ imageType ];

      for( var imageIndex in styles ){

        var style = styles[ imageIndex ],
            selector = ".sliderImage[data-main-image-index = '"+imageIndex+"'] .js-mainImage";

        self.saveOriginalStyle( $(selector) );

        $(selector).css( self.styleString2Object( style ) );

      }

    }
  }


  this.prevnextWithZoomout = function()
  {

    for( var imageType in self.dataSet ){
      var styles = self.dataSet[ imageType ];
      for( var imageIndex in styles ){
        var style = styles[ imageIndex ],
            selector = "#bgSlider_" + imageIndex;

        self.saveOriginalStyle( $(selector).find(".slider_img") );

        $(selector).find(".slider_img").css( self.styleString2Object( style ) );
      }
    }
 
  }





  this.styling = function()
  {
      if( self.dataSet !== null ){

        // prevnext系
        if( sliderPattern === "prevnext" ){

          switch( slideShowName ){
            case "fadein":
            case "zoomin":
              self.prevnextWithDefault();
            break;

            // ココでやらない => 動的要素が絡むため、s3Slider でやる
            case "zoomout":
              // self.prevnextWithZoomout();
            break;

            // background-position を操作するスライドのため、非対応
            case "slidedown":
            break;

          }

        // 旧スライダー
        } else {
          self.oldMainImage();
        }

      }
  }


  this.saveOriginalStyle = function( jqObject )
  {

    var ts = Date.now();
    jqObject.attr("data-object-id", ts);
    self.originalStyleDataSet[ ts ] = {
      "backgroundSize" : jqObject.css("backgroundSize"),
      "backgroundPosition" : jqObject.css("backgroundPosition"),
      "transform" : jqObject.css("transform"),
    };

  }


  this.addTmpSliderPatternClass = function( jqObject )
  {
    jqObject.addClass( self.slidePatternClasses[ slideShowName ] );
  }

  this.existsOriginalStyle = function( jqObjectId )
  {
    return typeof self.originalStyleDataSet[ jqObjectId ] !== "undefined";
  }


  this.getOriginalStyle = function( jqObjectId )
  {
    return self.originalStyleDataSet[ jqObjectId ];
  }


  this.__construct = function()
  {

    var device = isSmartPhoneAccess() || location.href.indexOf("smt=1") !== -1 ? "sp" : "pc";

    if( !$.isEmptyObject( dataSet ) &&
        !$.isEmptyObject( dataSet[ device ] ) &&
        !$.isEmptyObject( dataSet[ device ][ design_number ] ) ){
      self.dataSet = dataSet[ device ][ design_number ];
    }

  }()

}


if( stylableMainImage ){

  var mainImageStyler;
  var ZoomoutMainImageCallback;

}



$(function(){

    // スライドショーの場合実行
    if( listOrThumbMode === "slideshow" ) {
        car_list_slider = new CarlistSlider( $('#carListSlideShow_wrapper') );
        car_list_slider.add_current(0);
        car_list_slider.run();
    }

});




/**
 * スタイル値の計算や、抽出など
 * 
 */

var StyleCalculator = function()
{

  var self = this;

  this.fn = { transform: null, margin: null };

  // jQueryオブジェクト => 現在移動させられているXY
  this.jqObject2XY = function( jqObject )
  {
    var x = 0,
        y = 0,
        transform = jqObject.css("transform"),
        margin = jqObject.css("margin"),
        margins = {
            top : jqObject.css("marginTop"),
            right : jqObject.css("marginRight"),
            bottom : jqObject.css("marginBottom"),
            left : jqObject.css("marginLeft")
        };

    if( transform !== "none" ){

      var matrix = transform;

      var tmp = self.fn.transform.matrix2Object( matrix );

      x += tmp.translate.x;
      y += tmp.translate.y;

    }

    if( margin !== "0px" ){

      var tmp = self.fn.margin.margins2XY( margins );

      x += tmp.x;
      y += tmp.y;

    }

    return { x : x, y : y };
  }



  // px表記を消す
  this.px2Value = function( px )
  {
      return Number( px.replace("px", "") );
  }




  this.__construct = function()
  {

    self.fn.transform = new TransformCalculator( self );
    self.fn.margin = new MarginCalculator( self );

  }()
}




/**
 * jQueryオブジェクト => transform のスタイル値
 * transformのスタイル値 => オブジェクトへの変換　等
 */
var TransformCalculator = function( parent )
{


  var self = this;
  this.parent;


  // matrix値 => transform 値
  this.matrix2Transform = function( matrix )
  {

    var object = self.matrix2Object( matrix ),
        values = [];

    values.push( "scale(" + object.scale + ")" );
    values.push( "translateX( " + object.translate.x + "px )" );
    values.push( "translateY( " + object.translate.y + "px )" );

    return values.join(" ");

  }




  // matrix値 => transformオブジェクト
  this.matrix2Object = function( matrix )
  {

    var ret = { scale : 1, translate : { x : 0, y : 0 } }, 
        tmp = matrix.replace(/(matrix)|(\()|\)|\s/g, "");

    if( tmp !== matrix ){
          
        tmp = tmp.split(",");

        ret.scale = Number( tmp[0] );
        ret.translate.x = Number( tmp[4] ) / ret.scale;
        ret.translate.y = Number( tmp[5] ) / ret.scale;
          
    }

    return ret;

  }




  // matrix値 => scale値
  this.matrix2Scale = function( matrix )
  {
    var tmp = self.matrix2Object( matrix );
    return tmp.scale;
  }




  // jqObject => scale値
  this.jqObject2Scale = function( jqObject )
  {

    var scale = 1,
        matrix = jqObject.css("transform");

    if( matrix !== "none" ){
      scale = self.matrix2Scale( matrix );
    }

    return scale;
  
  }




  // オブジェクト値 => transform値
  this.object2Transform = function( object )
  {
    var tmp = [];

    tmp.push( "scale(" + object.scale + ")" );
    tmp.push( "translateX(" + object.translate.x + "px)" );
    tmp.push( "translateY(" + object.translate.y + "px)" );

    return tmp.join(" ");
  }



  // transformオブジェクト => matrix値 への変換
  this.object2Matrix = function( object )
  {

    var template = "matrix(placeholder)",
        tmp = [
        object.scale,
        0,
        0,
        object.scale,
        object.scale * object.translate.x,
        object.scale * object.translate.y
    ];

    return template.replace( "placeholder", tmp.join(",") );

  }



  this.xy2Transform = function( x, y )
  {

      x = String(x);
      y = String(y);

      var ret = [];
      ret.push( "translateX(" + x.replace("px", "") + "px )" );
      ret.push( "translateY(" + y.replace("px", "") + "px )" );
      return ret.join(" ");

  }




  this.__construct = function(){
    self.parent = parent;
  }()
}




var MarginCalculator = function( parent )
{

  var self = this;
  this.parent;


  this.margins2XY = function( margins )
  {
    var x = 0,
        y = 0,
        m;

    x = x + self.parent.px2Value( margins.right );
    x = x - self.parent.px2Value( margins.left );

    y = y - self.parent.px2Value( margins.bottom );
    y = y + self.parent.px2Value( margins.top );

    return { x : x, y : y };

    // if( m = marginValue.match(//) )
  }

  this.margins2Matrix = function( margins )
  {

    var xy = self.margins2XY( margins ),
        object = {
            scale : 1.0,
            translate : {
                x : xy.x,
                y : xy.y
            }
        };

    return self.parent.fn.transform.object2Matrix( object );

  }


  this.jqObject2Margins = function( jqObject )
  {
    return {
      top : jqObject.css("marginTop"),
      right : jqObject.css("marginRight"),
      bottom : jqObject.css("marginBottom"),
      left : jqObject.css("marginLeft")
    };
  }


  this.__construct = function()
  {
    self.parent = parent;
  }()
}



function CookieOperation()
{

  var self = this;

  this.setCookie = function( name, value, seconds )
  {
      document.cookie = name + "=" + value + "; path=/; max-age=" + seconds;
  }

  this.getCookie = function( name )
  {
      var cookies = document.cookie.split(';'),
          result = "";

      for(var i in cookies){

          var splits = cookies[i].split('=');
          if( splits[0].trim() === name){
              result = splits[1];
          }

      }

      return result;
  }

  this.resetCookie = function( name )
  {
      document.cookie = name + "=; max-age=0; path=/";
  }

  this.__construct = function()
  {

  }();

}


function searchResultRecordIds( obj )
{

  if( $(window).width() <= 480 ) {
    var menuWrapper = obj.closest(".menu_wrapper"),
        megaMenu = menuWrapper.find(".js-subPageWrapper"),
        currentMegaMenu = obj.closest(".js-subPageWrapper"),
        currentMenuId = megaMenu.attr("data-menu-id"),
        searchKeyword = currentMegaMenu.find(".js-searchMenuTextSp").val(),
        resultRecordIds = [];
  } else {
    var menuWrapper = obj.closest(".menu_wrapper"),
        megaMenu = menuWrapper.find(".mega_menu"),
        currentMegaMenu = obj.closest(".mega_menu"),
        currentMenuId = currentMegaMenu.attr("data-menu-id"),
        searchKeyword = currentMegaMenu.find(".js-searchMenuText").val(),
        resultRecordIds = [];
  }

  if( typeof middlePageJson === "string" ) {
    middlePageJson = JSON.parse(middlePageJson);
  }

  for( var menuId in middlePageJson.pageData ) {

    // if( menuId !== currentMenuId ) continue;

    if( typeof middlePageJson.pageData[menuId] === "undefined" || middlePageJson.pageData[menuId] === null ) break;

    for( var recordId in middlePageJson.pageData[menuId]["freePage"] ) {

      if( isEmptyTarget(middlePageJson.pageData[menuId]["freePage"][recordId]) || middlePageJson.pageData[menuId]["freePage"][recordId].is_middle_menu === "1" ) continue;
      if (middlePageJson.pageData[menuId]["freePage"][recordId].pageTitle === undefined ) continue;

      var targetString = hankakuToZenkaku( middlePageJson.pageData[menuId]["freePage"][recordId].pageTitle.toUpperCase() ),
          searchString = hankakuToZenkaku( searchKeyword.toUpperCase() );

      if( !isEmptyTarget(targetString) && targetString.indexOf( searchString ) !== -1  ) {

        var replaceString = menuSearchedReplacer( middlePageJson.pageData[menuId]["freePage"][recordId].pageTitle, searchKeyword );

        megaMenu.find(".js-subPageList").find(".js-searchTargetList[data-record-id=" + recordId + "]").find(".pageTitle").addClass("searched").find(".pageTitleStr").html( replaceString )
        resultRecordIds.push(recordId);

      }

    }

  }

  return resultRecordIds;

}

function isEmptyTarget( target )
{
  return target === null || typeof target === "undefined" || target === undefined;
}

function setSearchedEmptyKeyword( target, searchKeyword )
{
  var keyword = String(searchKeyword || ""),
      maxKeywordLength = 10,
      keywordCharacters = Array.from(keyword);

  if( keywordCharacters.length > maxKeywordLength ) {
    keyword = keywordCharacters.slice(0, maxKeywordLength).join("") + "...";
  }

  target.find(".js-searchedEmptyKeyword").text(keyword);
}

function showSubTopTitle( obj )
{
  var megaMenu = obj.closest(".mega_menu"),
      currentMenuId = megaMenu.attr("data-menu-id"),
      subTopTitle = megaMenu.find(".js-sub--top a b").text(),
      searchKeyword = megaMenu.find(".js-searchMenuText").val();

  var targetString = hankakuToZenkaku( subTopTitle.toUpperCase() ),
      searchString = hankakuToZenkaku( searchKeyword.toUpperCase() );

  if( targetString.indexOf( searchString ) !== -1 ) {
    megaMenu.find(".js-sub--top").attr("data-show", 1);
  } else {
    megaMenu.find(".js-sub--top").attr("data-show", 0);
  }

}

function stopPageAnimation( obj )
{
  var menuWrapper = obj.closest(".menu_wrapper"),
      megaMenu = menuWrapper.find(".mega_menu");
      targetList = megaMenu.find(".js-searchTargetList"),
      targetOuterList = megaMenu.find(".js-searchTargetOuter");

  if( !targetList.hasClass("stopAnimation") && !targetOuterList.hasClass("stopAnimation") ) {
      targetList.addClass("stopAnimation");
      targetOuterList.addClass("stopAnimation");
  }
}

function insertSearchedMenuLog( searchKeyword, menuId )
{
  $.ajax({
    type     : "GET",
    url      : "//" + editDomain + "/cms/searchedPageLog.php",
    dataType : "json",
    data     : {
      shopId: pm_shop_id,
      searchKeyword: searchKeyword,
      menuId: menuId,
      searchedUrl: location.href
    },
    success : function( data ){
    },
    error : function( XMLHttpRequest, textStatus, errorThrown ){
      console.log( XMLHttpRequest, textStatus, errorThrown );
    }
  });
}


var searchMenuKey = null;
var insertedSearchMenu = false;
function showSearchResult( recordIds, obj )
{

  showSubTopTitle( obj );

  stopPageAnimation( obj );

  var menuWrapper = obj.closest(".menu_wrapper"),
      megaMenu = menuWrapper.find(".mega_menu"),
      currentMegaMenu = obj.closest(".mega_menu"),
      currentMenuId = currentMegaMenu.attr("data-menu-id"),
      currentMenuTitle = $(".js-menuTitle[data-menu-id=" + currentMenuId + "]").text(),
      searchKeyword = currentMegaMenu.find(".js-searchMenuText").val(),
      subPageCloneLists = [];



  //公開側ならログ格納
  if( edit_param === "0" ) {

    clearTimeout( searchMenuKey );
    insertedSearchMenu = false;

    searchMenuKey = setTimeout(function(){

      insertKeyword = $(window).width() <= 480 ? megaMenu.find(".js-searchMenuTextSp").val() : megaMenu.find(".js-searchMenuText").val();

      if( insertKeyword !== "" ) {
        insertSearchedMenuLog( insertKeyword, currentMenuId );
        insertedSearchMenu = true;
      }

    }, 5000);

  }


  if( recordIds.length === 0 ) {
    megaMenu.find(".js-subPageList").attr("data-show", 0);
    megaMenu.find(".js-searchedResultListOuter").attr("data-show",0);
    megaMenu.find(".searchedResultStringOuter").attr("data-show",0);
    setSearchedEmptyKeyword( megaMenu, searchKeyword );
    megaMenu.find(".searchedEmpty").attr("data-show", 1);
    return false;
  }


  megaMenu.find(".js-subPageList").attr("data-show", 0);
  megaMenu.find(".searchedEmpty").attr("data-show", 0);


  megaMenu.find(".js-searchTargetList").each(function(){

    if( $(this).hasClass( "js-sub--top" ) ) {
      $(this).attr("data-show", 0);
      return true;
    }

    if( $(this).closest(".js-searchedResultListOuter").length > 0 ) {
      return true;
    }

    var recordId = $(this).attr("data-record-id");

    if( recordIds.indexOf( recordId ) === -1 ) {
      $(this).attr("data-show", 0);
    } else {
      $(this).attr("data-show", 1);
      if( $(this).closest(".js-searchTargetOuter").length > 0 ) {
        $(this).closest(".js-searchTargetOuter").attr("data-show", 1);
      }
    }

    $(this).find("a").attr("data-is-draggable", 0).attr("draggable", false);

  });


  // 全メニューを抽出
  megaMenu.each(function(){

    var self = $(this);

    var subPageList = self.find(".js-subPageList").find(".sub");

    if( subPageList.length > 0 ) {

      subPageList.each(function(){

        var self = $(this);

        if( self.hasClass( "js-middleMenuOpenTrigger" ) ) {

          // フォルダの中身のページを抽出
          if( self.find(".middle-menu__list").find(".js-searchTargetList[data-show=1]").length > 0 ) {

            self.find(".middle-menu__list").find(".js-searchTargetList[data-show=1]").each(function(){

              subPageCloneLists.push( $(this).clone(true) );

            });

          }

        } else {

          // ページのみの場合
          subPageCloneLists.push( $(this).clone(true) );

        }

      });

    }

  });


  megaMenu.each(function(){

    if( subPageCloneLists.length > 0 ) {
      var self = $(this),
          subPageList = $(".js-subPageList"),
          useCustomFontSize = subPageList.attr("data-use-custom-font-size"),
          resultListOuter = self.find(".searchedResultListOuter");

      resultListOuter.attr("data-use-custom-font-size", useCustomFontSize);

      resultListOuter.html("");

      for( var i in subPageCloneLists ) {

          var menuTitle = subPageCloneLists[i].attr("data-menu-string"),
              middleMenuTitle = subPageCloneLists[i].attr("data-middle-menu-string"),
              pageTitleTag = subPageCloneLists[i].find(".pageTitle");

          if( typeof middleMenuTitle !== "undefined" && middleMenuTitle !== "" ) {

            var buildMenuTitleHtml = "<span class='menuTitleLabel'>(" + menuTitle + " → " + middleMenuTitle + ")</span>";

          } else {

            var buildMenuTitleHtml = "<span class='menuTitleLabel'>(" + menuTitle + ")</span>";

          }
          var pageTitle = pageTitleTag.html();

          if( subPageCloneLists[i].find(".menuTitleLabel").length > 0 ) {
            var buildPageTitle = pageTitle;
          } else {
            var buildPageTitle = pageTitle + buildMenuTitleHtml;
          }


          subPageCloneLists[i].find(".pageTitle").html(buildPageTitle);
          var html = subPageCloneLists[i].prop("outerHTML");

        resultListOuter.append( html );
      }

      subPageList.attr("data-show", 0);
      resultListOuter.attr("data-show", 1);
    }

  });

  megaMenu.each(function(){

    var positionCount = 0;

    if( $(this).find(".js-searchedResultListOuter").find(".sub").length > 0 ) {
      $(this).find(".js-searchedResultListOuter").find(".sub").each(function(){


        if( $(this).attr("data-show") === "0" ) {
          return true;
        }


        if( $(this).hasClass("js-searchTargetOuter") ) {
          var surplus = positionCount % 3;

          if( surplus === 0 ) {
            // 1番目
            $(this).addClass("columnsFirst")
          } else if( surplus === 1 ) {
            // 2番目
            $(this).addClass("columnsSecond");
          } else if( surplus === 2 ) {
            // 3番目
            $(this).addClass("columnsThird");
          }
        }

        positionCount++;

      });
    }


  });


  megaMenu.find(".js-searchTargetOuter").each(function(){
    var existsCount = 0,
        outer = $(this);

    if( outer.find(".js-searchTargetList").length > 0 ) {
      outer.find(".js-searchTargetList").each(function(){
        if( $(this).attr("data-show") === "1" ) {
          existsCount++;
        }
      });

    }
    if( existsCount === 0 ) outer.attr("data-show", 0);

    if( existsCount > 0 ) {

      switchChildCount( outer, existsCount, "show" );

    }

  });

  megaMenu.find(".js-searchMenuText").each(function() {
    $(this).val(searchKeyword);
  });

  var resultCount = currentMegaMenu.find(".js-searchedResultListOuter").find(".js-searchTargetList[data-show=1]").length;

  if( resultCount > 0 ) {
    megaMenu.find(".searchedResultStringOuter").find(".searchedKeyword").text(searchKeyword);
    megaMenu.find(".searchedResultStringOuter").attr("data-show", 1).find(".searchedCount").text(resultCount);
  }


}

function showSearchResultSp( recordIds, obj )
{
    var menuWrapper = obj.closest(".menu_wrapper"),
        megaMenu = menuWrapper.find(".js-subPageWrapper"),
        currentMenuId = menuWrapper.attr("data-menu-id"),
        searchKeyword = menuWrapper.find(".js-searchMenuTextSp").val(),
        subPageCloneLists = [];

    //公開側ならログ格納
    if( edit_param === "0" ) {

      clearTimeout( searchMenuKey );
      insertedSearchMenu = false;

      searchMenuKey = setTimeout(function(){

        insertKeyword = megaMenu.find(".js-searchMenuTextSp").val();
        if( insertKeyword !== "" ) {
          insertSearchedMenuLog( insertKeyword, currentMenuId );
          insertedSearchMenu = true;
        }

      }, 5000);

    }


    if( recordIds.length === 0 ) {

      megaMenu.each(function(){
        if( $(this).hasClass("gmenu_contact") || $(this).hasClass("gmenu_estimate") || $(this).hasClass("gmenu_search") ) {
          return true;
        }
        $(this).attr("data-show", 0);
      })
      menuWrapper.attr("data-searched-empty-show", 1);
      setSearchedEmptyKeyword( menuWrapper, searchKeyword );
      menuWrapper.find(".searchedEmpty").attr("data-show", 1);
      menuWrapper.find(".searchedResultStringOuter").attr("data-show",0);
      return false;
    }

    megaMenu.attr("data-show", 1);

    megaMenu.find(".js-subPageList").attr("data-show", 1);
    menuWrapper.attr("data-searched-empty-show", 0);
    menuWrapper.find(".searchedEmpty").attr("data-show", 0);

    megaMenu.find(".js-searchTargetList").each(function(){

       $(this).attr("data-show", 1);

      // if( $(this).hasClass( "js-sub--top" ) ) return true;

      var recordId = $(this).attr("data-record-id");

      if( recordIds.indexOf( recordId ) === -1 ) {
        $(this).attr("data-show", 0)
      } else {
        $(this).attr("data-show", 1)
      }

      $(this).find("a").attr("data-is-draggable", 0).attr("draggable", false);

    });

    megaMenu.find(".js-searchTargetOuter").each(function(){
      var existsCount = 0,
          outer = $(this);

      outer.attr("data-show", 1);

      if( outer.find(".js-searchTargetList").length > 0 ) {
        outer.find(".js-searchTargetList").each(function(){
          if( $(this).attr("data-show") === "1" ) {
            existsCount++;
          }
        });

      }
      if( existsCount === 0 ) outer.attr("data-show", 0);

      if( existsCount > 0 ) {

        switchChildCount( outer, existsCount, "show" );

      }

    });

    megaMenu.each(function(){

      if( $(this).hasClass("gmenu_contact") || $(this).hasClass("gmenu_estimate") || $(this).hasClass("gmenu_search") ) return true;
      if( $(this).find(".js-searchTargetList[data-show=1]").length === 0 ) {

        $(this).attr("data-show", 0);

      } else {

        $(this).find(".js-middleMenuOpenTrigger").attr("data-middle-menu-state", "open").css({"display": "list-item"}).find(".middle-menu__wrap").css({"display": "block"});
        // $(this).find(".js-middleMenuOpenTrigger").attr("data-middle-menu-state", "close").css({"display": "list-item"});
        $(this).find(".js-searchTargetList[data-show=1]").css({"display": "list-item"});
        $(this).find(".js-menuOpenTrigger").text("-");

      }
    });


    var resultCount = megaMenu.find(".js-searchTargetList[data-show=1]").length;

    if( resultCount > 0 ) {
      megaMenu.find(".searchedResultStringOuter").find(".searchedKeyword").text(searchKeyword);
      megaMenu.find(".searchedResultStringOuter").attr("data-show", 1).find(".searchedCount").text(resultCount);
    }


}

function resetSearchResult( obj )
{

  var menuWrapper = obj.closest(".menu_wrapper"),
      megaMenu = menuWrapper.find(".mega_menu"),
      currentMegaMenu = obj.closest(".mega_menu"),
      currentMenuId = currentMegaMenu.attr("data-menu-id"),
      targetList = megaMenu.find(".js-searchTargetList"),
      targetOuterList = megaMenu.find(".js-searchTargetOuter");

  megaMenu.find(".js-subPageList").attr("data-show", 1);
  megaMenu.find(".searchedEmpty").attr("data-show", 0);

  megaMenu.find(".js-searchMenuText").each(function() {
    $(this).val("");
  });

  megaMenu.find(".js-searchTargetOuter").each(function(){

    $(this).attr("data-show", 1).removeClass("columnsFirst columnsSecond columnsThird");

    if( $(this).find(".child-count__wrap").length > 0 ) {
      switchChildCount( $(this), 0, "hide" );
    }

  });

  megaMenu.find(".js-searchTargetList").each(function(){

      $(this).attr("data-show", 1);
      $(this).find("a").attr("data-is-draggable", 1).attr("draggable", true);

      $(this).find(".pageTitle").removeClass("searched").find(".stringHighlight").contents().unwrap();

  });

  megaMenu.find(".js-searchedResultListOuter").attr("data-show", 0).html("");

  if( targetList.hasClass("stopAnimation") && targetOuterList.hasClass("stopAnimation") ) {
      targetList.removeClass("stopAnimation");
      targetOuterList.removeClass("stopAnimation");
  }

  megaMenu.find(".searchedResultStringOuter").attr("data-show", 0);


}


function switchChildCount( outer, count, type )
{
  if( type === "show" ) {
    outer.find(".js-searchResultCount").attr("data-show", 1).text( count );
    outer.find(".js-childCount").attr("data-show", 0);
  } else {
    outer.find(".js-searchResultCount").attr("data-show", 0).text( count );
    outer.find(".js-childCount").attr("data-show", 1);
  }

}

function menuSearchedReplacer( targetString, searchedString )
{

  var zenkakuSearchedString = hankakuToZenkaku(searchedString),
      zenkakuTargetString = hankakuToZenkaku(targetString),
      regex = new RegExp( zenkakuSearchedString, "ig" ),
      res = targetString;

  const matches = [...zenkakuTargetString.matchAll(regex)];
  for (let i = matches.length -1; i >= 0; i--) {
    let start = matches[i].index;
    let end = start + matches[i][0].length;
    res = res.slice(0, start) + '<span class="stringHighlight">' + res.slice(start, end) + '</span>' + res.slice(end);
  }

  return res;

}


function hankakuToZenkaku( string )
{

  if ( isEmptyTarget(string) ) {
    return string;
  }

  return string.replace(/[Ａ-Ｚａ-ｚ０-９]/g, function(s) {
      return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
  });
}



/**
 * SPアカウントのみ、その他（emptylink.html）のみクリック不可に
 * 2024-0624 久保 SPのその他ページ作成に伴い、emptylink.html の記述をなくす
 * @param  {[type]} ){} [description]
 * @return {[type]}       [description]
 */
$(function(){

  // $("a[href='/emptylink.html']").attr("href", "javascript:void(0);");

});


/**
 * SPアカウントのみ、
 * @param  {[type]} ){} [description]
 * @return {[type]}       [description]
 */
$(function(){

  if( typeof isDekiteruSalesPage !== "undefined" && isDekiteruSalesPage ){ // SPアカウントのみ

    if( edit_param === "0" ){ // 公開のみ

      // ヘッダ、フッタの文字列 お問合せ を ログイン に
      $(".gmenu_contact a").text("ログイン");
      $("#fmenu_contact a").text("ログイン");

    } else {

    }

  } else {
    
  }

});

// ページ内検索のログ取得
$(function(){

  // フォーカスが外れたらログ取得
  $(".js-searchMenuText").blur(function(){
    var searchMenuText = $(".js-searchMenuText").val(),
        shopId = pm_shop_id,
        searchKey = "searchMenu";

    freeWordLog(shopId, searchMenuText, searchKey);

  });

  // Enterキーが押されたらログ取得
  $(".js-searchMenuText").on("keydown", function(){
    if(event.keyCode === 13){
      var searchMenuText = $(".js-searchMenuText").val(),
          shopId = pm_shop_id,
          searchKey = "searchMenu";

      freeWordLog(shopId, searchMenuText, searchKey);
    } else {
      // 何もしない
    }

  });

});

$(window).on("load", function(){

  setTimeout( function(){

    if( typeof isDekiteruSalesPage !== "undefined" && isDekiteruSalesPage ){ // SPアカウントのみ

      if( edit_param === "0" ){ // 公開のみ

        // 無トラのfixedコンテンツを呼び出す
        var cookies = document.cookie;
        var cookiesArray = cookies.split(';');
        var closeBottonClick = false;

        for( var i in cookiesArray ){

          var c = cookiesArray[i]; 

          c = c.trim();

          var cookie = c.split( '=' );

          var cookieName  = cookie[0];
          var cookieValue = cookie[1];

          if( cookieName === 'closeBottonClick' ){

            closeBottonClick = true;

          }

        }

        if( !closeBottonClick ){

          $.ajax({
            type     : "POST",
            url      : "/ap/findFixedConversionHtml.php",
            dataType : "json",
            data     : {
              key : "head"
            },
            success : function( data ){

              $('head').append(data.html);

            },
            error : function( XMLHttpRequest, textStatus, errorThrown ){
            }
          });

          $.ajax({
            type     : "POST",
            url      : "/ap/findFixedConversionHtml.php",
            dataType : "json",
            data     : {
              key : "body"
            },
            success : function( data ){

              $('body').append(data.html);

            },
            error : function( XMLHttpRequest, textStatus, errorThrown ){
            }
          });

        }

      }

    }
  
  }, 5000);

});


$(function(){

  var w3cCheckLink = $("#js-w3cCheckLink");

  if( w3cCheckLink.length > 0 ){ // W3Cアイコンを表示していれば

    var tmp = w3cCheckLink.attr("href");

    var newHref = tmp + "?url=" + location.protocol + "//" + location.hostname + location.pathname;

    w3cCheckLink.attr("href", newHref);

  }

});


/**
 * 営業日カレンダーのインスタンス
 */
$(function(){

  var def = $.Deferred();

  var isOpen = edit_param === "0";

  var closeDateJson;

  var ajax = $.ajax({
    type  : "GET",
    url   : returnRequestUrl(),
    dataType : "json",
    success : function(data)
    {

      closeDateJson = data;
      def.resolve();

    },
    error : function( XMLHttpRequest, textStatus, errorThrown )
    {

    }

  });

  def.promise().done( function(){

    var eigyoubiCalender = new EigyoubiCalender( closeDateJson );

    var date = new Date(); 

    //年・月・日・曜日を取得する
    var year  = Number( date.getFullYear() );
    var month = Number( date.getMonth() + 1 );

    eigyoubiCalender.view( year, month );

  });


  function returnRootOpen()
  {

    return location.origin + location.pathname.replace(new RegExp("(?:\\\/+[^\\\/]*){0,1}$"), "/");

  }

  function returnRootEdit()
  {

    return location.origin;

  }


  function returnRequestUrl()
  {

    if( isOpen ){

      return returnRootOpen() + "calendar.json";

    } else {

      var rad = $.now();
      return returnRootEdit() + "/cms/userJson/" + pm_shop_id + "/calendar.json?rad="+ rad;      

    }

  }

});

var scrollAble = function(e) {
    e.preventDefault();
}

$(function(){

    $(document).on({
        "mouseenter" : function(e){
            $(this).find("#bgSlider, .multiSlideContent").addClass("prepareFlick");
        },
        "mouseleave" : function(){
            $("#bgSlider.prepareFlick, .multiSlideContent.prepareFlick").removeClass("prepareFlick");
        }
    }, "#main_img_wrapper");

    $(document).on({
        "mouseover" : function(e){
            $(this).find(".imageBoxImage").addClass("prepareFlick");
        },
        "mouseout" : function(){
            $(".imageBoxImage.prepareFlick").removeClass("prepareFlick");
        }
    }, ".imageBoxContentsSubWrapper");

    $(document).on({
        "mouseover" : function(e){
            $(this).find(".imageBoxImage").addClass("prepareFlick");
        },
        "mouseout" : function(){
            $(".imageBoxImage.prepareFlick").removeClass("prepareFlick");
        }
    }, ".imageBoxContents");

    $(document).on({
        "mouseenter" : function(e){
            $(this).find("#js-slideImage").addClass("prepareFlick");
        },
        "mouseleave" : function(){
            $("#js-slideImage").removeClass("prepareFlick");
        }
    }, "#js-ImageLink");

    $(document).on({
        "mouseenter" : function(e){
            $(this).find("#sliderContent").addClass("prepareFlick");
        },
        "mouseleave" : function(){
            $("#sliderContent").removeClass("prepareFlick");
        }
    }, "#slider");

});

$(function(){


    var carlistSliderJqObject = $("#carlist_main_box");

    var ins = new FlickAndSliderBinder(
        carlistSliderJqObject,
        function(e, jqObject, x, y){

            this.vars.flick = false;
            this.vars.carlistClick = true;
            this.vars.scrollAble = false;


        },
        function(e, jqObject, x, y){

            var cosine = x / Math.sqrt(x*x + y*y),
                radian = Math.acos(cosine) / (Math.PI / 180);

            if( ( radian >= 20 && radian <= 160 ) ) {
                this.vars.scrollAble = true;
                this.vars.flick = false;
                window.removeEventListener("touchmove", scrollAble, {passive: false});
            } else {
              if( !this.vars.scrollAble ) {
                  if( ( radian >= 160 && radian <= 180 ) || ( radian >= 0 && radian <= 20 ) ) {
                      this.vars.flick = true;
                      window.addEventListener("touchmove", scrollAble, {passive:false});
                  }
              }

            }

        },
        function(e, jqObject, x, y){


            var flickablePrevPx = 30,
                flickableNextPx = -30;

            if( this.vars.flick && this.vars.carlistClick ) {


                if( x <= flickableNextPx ){

                     $(".next_btn").trigger("click");

                } else {
                    if( x >= flickablePrevPx ) {
                      $(".prev_btn").trigger("click");
                    }
                }
            }

            window.removeEventListener("touchmove", scrollAble, {passive: false});
            this.vars.scrollAble = true;
            this.vars.flick = false;
            this.vars.carlistClick = false;
        },
        {
            flick : false,
            carlistClick : false,
            scrollAble : false
        }

    );
});


$(function(){

  var carInfoImageJqObject = $(".car_gall_main");

  var ins = new FlickAndSliderBinder(
    carInfoImageJqObject,
    function(e, jqObject, x, y){

      this.vars.flick = false;
      this.vars.carImageClick = true;
      this.vars.scrollAble = false;

    },
    function(e, jqObject, x, y){

      if ( x >= 30 || x <= -30 ) {

        jqObject.closest(".car_gall_main").addClass("flickingSlide");

      }

      var cosine = x / Math.sqrt(x*x + y*y),
          radian = Math.acos(cosine) / (Math.PI / 180);

      if ( !this.vars.scrollAble ) {
        if ( ( radian > 20 && radian < 160 ) ) {
            this.vars.scrollAble = true;
            this.vars.flick = false;
            window.removeEventListener("touchmove", scrollAble, {passive: false});

        } else {

          if ( !this.vars.scrollAble ) {
              if( ( radian >= 160 && radian <= 180 ) || ( radian >= 0 && radian <= 20) ){
                  this.vars.flick = true;
                  window.addEventListener("touchmove", scrollAble, {passive: false});
              }
          }
        }
      } else {
        //何もしない
      }
    },
    function(e, jqObject, x, y){

        jqObject.closest(".car_gall_main").removeClass("flickingSlide");

        var flickablePrevPx = 30,
            flickableNextPx = -30;

        if( this.vars.flick && this.vars.carImageClick) {

            if( x <= flickableNextPx ){

                $(".car_gall_main .cgmRight").trigger("click");

            } else {

              if( x >= flickablePrevPx ) {

                $(".car_gall_main .cgmLeft").trigger("click");

              }
            }
        }

        if( !this.vars.scrollAble ){
          window.removeEventListener("touchmove", scrollAble, {passive: false});
          this.vars.scrollAble = true;
        }

        this.vars.flick = false;
        this.vars.carImageClick = false;
    },
    {
        flick : false,
        carImageClick : false,
        scrollAble : false
    }
    );


  var carGallMaskJqObject = $("#carGallMask");

  var ins = new FlickAndSliderBinder(
    carGallMaskJqObject,
    function(e, jqObject, x, y){

      this.vars.flick = false;
      this.vars.carImageClick = true;
      this.vars.scrollAble = false;

    },
    function(e, jqObject, x, y){

      if ( x >= 30 || x <= -30 ) {

        jqObject.closest("#carGallMask").addClass("flickingSlide");

      }

      var cosine = x / Math.sqrt(x*x + y*y),
          radian = Math.acos(cosine) / (Math.PI / 180);

      if ( !this.vars.scrollAble ) {
        if ( ( radian >= 20 && radian <= 160 ) ) {
            this.vars.scrollAble = true;
            this.vars.flick = false;
            window.removeEventListener("touchmove", scrollAble, {passive: false});

        } else {

          if ( !this.vars.scrollAble ) {
              if( ( radian >= 160 && radian <= 180 ) || ( radian >= 0 && radian <= 20) ){
                  this.vars.flick = true;
                  window.addEventListener("touchmove", scrollAble, {passive: false});
              }
          }
        }
      } else {
        //何もしない
      }
    },
    function(e, jqObject, x, y){

        jqObject.closest("#carGallMask").removeClass("flickingSlide");

        var flickablePrevPx = 30,
            flickableNextPx = -30;

        if( this.vars.flick && this.vars.carImageClick) {

            if( x <= flickableNextPx ){

                $("#carGallMask .cgmRight").trigger("click");

            } else {

              if( x >= flickablePrevPx ) {

                $("#carGallMask .cgmLeft").trigger("click");

              }
            }
        }

        if( !this.vars.scrollAble ){
          window.removeEventListener("touchmove", scrollAble, {passive: false});
          this.vars.scrollAble = true;
        }

        this.vars.flick = false;
        this.vars.carImageClick = false;
    },
    {
        flick : false,
        carImageClick : false,
        scrollAble : false
    }
    );

});


$(function(){


    // Movieの再生・停止
    $(document).on("click", ".multisliderIframePlayTrigger", function(){
      var requireMute = navigator.userAgent.indexOf("Android") !== -1,
          self = $(this),
          iframe = $(this).closest(".js-imageBoxOuter").find(".js-imageBlockImage");

      requireMute = true;


      if( self.hasClass( "js-playedMovie" ) ) {

        iframe[0].contentWindow.postMessage('{"event":"command", "func":"pauseVideo","args":""}', "*");
        self.removeClass("js-playedMovie").addClass("js-pouseMovie");

      } else {

        if( self.hasClass("js-pouseMovie") ) {

            iframe[0].contentWindow.postMessage('{"event":"command", "func":"mute","args":""}', "*");

            iframe[0].contentWindow.postMessage('{"event":"command", "func":"playVideo","args":""}', "*");

            setTimeout(function(){
              iframe[0].contentWindow.postMessage('{"event":"command", "func":"unMute","args":""}', "*");
            }, 500);
            self.removeClass("js-pouseMovie").addClass("js-playedMovie");

        } else {

          iframe.attr("src", iframe.attr("src") + "&enablejsapi=1").on("load", function(){

            $(this)[0].contentWindow.postMessage('{"event":"command", "func":"mute","args":""}', "*");

            setTimeout(function(){
              iframe[0].contentWindow.postMessage('{"event":"command", "func":"playVideo","args":""}', "*");
            }, 500);

            setTimeout(function(){
              iframe[0].contentWindow.postMessage('{"event":"command", "func":"unMute","args":""}', "*");
              self.addClass("js-playedMovie");
            }, 1000);

            

          });

        }

      }

    });



    $(".box_common").each(function(){
        var imageBoxMultiSlider          = $(this);

        var ins = new FlickAndSliderBinder(
            imageBoxMultiSlider,
            function(e, jqObject, x, y){
                this.vars.flick = false;
                this.vars.targetClick = true;
                this.vars.scrollAble = false;

            },
            function(e, jqObject, x, y){

              //xの値が-39から39の間はクリックとする
              if ( x >= 40 || x <= -40 ) {

                var ua = navigator.userAgent;
                if (ua.indexOf('iPhone') === -1 || ua.indexOf('Android') === -1) {

                  //PCの時はテキストの選択をできるように、マウスで選択したものが文字ならクラスをリムーブする
                  if( document.getSelection().toString() !== "" ){

                    jqObject.find(".js-imageBoxContentsWrapper").removeClass("flickingSlide");

                  }else{

                    jqObject.find(".js-imageBoxContentsWrapper").addClass("flickingSlide");

                  }

                }else{

                  //スマホはマウスでの選択を考慮しなくていい
                  jqObject.find(".js-imageBoxContentsWrapper").addClass("flickingSlide");

                }

              }

              var cosine = x / Math.sqrt(x*x + y*y),
                  radian = Math.acos(cosine) / (Math.PI / 180);

              if( ( radian > 20 && radian < 160 ) ) {
                  this.vars.scrollAble = true;
                  this.vars.flick = false;
                  window.removeEventListener("touchmove", scrollAble, {passive: false});
              } else {
                if( !this.vars.scrollAble ) {
                    if( ( radian >= 160 && radian <= 180 ) || ( radian >= 0 && radian <= 20 ) ) {
                        this.vars.flick = true;
                        window.addEventListener("touchmove", scrollAble, {passive:false});
                    }
                }
              }
            },
            function(e, jqObject, x, y){

              var flickablePrevPx = 40,
                  flickableNextPx = -40;

              if( this.vars.flick && this.vars.targetClick ) {

                //PCでかつ、マウスでテキストを選択しているなら、フリック操作でのスライドをしない
                var ua = navigator.userAgent;
                if (ua.indexOf('iPhone') === -1 || ua.indexOf('Android') === -1) {

                  if( document.getSelection().toString() !== "" ){

                    jqObject.find(".js-imageBoxContentsWrapper").removeClass("flickingSlide");
                    return false;

                  }

                }

                var sliderCotroller = jqObject.find(".js-controllerOuter");

                if( x <= flickableNextPx ){
                     sliderCotroller.find(".js-boxImageMultiSliderController[data-controller-id='next']").trigger("click");

                } else {
                    if( x >= flickablePrevPx ) {
                      sliderCotroller.find(".js-boxImageMultiSliderController[data-controller-id='prev']").trigger("click");
                    }
                }

              }

              jqObject.find(".js-imageBoxContentsWrapper").removeClass("flickingSlide");

              window.removeEventListener("touchmove", scrollAble, {passive: false});
              this.vars.scrollAble = true;
              this.vars.targetClick = false;
              this.vars.flick = false;
            },
            {
                flick : false,
                targetClick : false,
                scrollAble : false
            }

        );

    });
});

$(function(){

    var oldSliderJqObject = $("#sliderContent");

    var ins = new FlickAndSliderBinder(
        oldSliderJqObject,
        function(e, jqObject, x, y){

            this.vars.flick = false;
            this.vars.carlistClick = true;
            this.vars.scrollAble = false;

            jqObject.removeClass("flickOut");

        },
        function(e, jqObject, x, y){

            jqObject.addClass("flickingSlide");

            var cosine = x / Math.sqrt(x*x + y*y),
                radian = Math.acos(cosine) / (Math.PI / 180);

            if( ( radian >= 20 && radian <= 160 ) ) {
                this.vars.scrollAble = true;
                this.vars.flick = false;
                window.removeEventListener("touchmove", scrollAble, {passive: false});
            } else {
              if( !this.vars.scrollAble ) {
                  if( ( radian >= 160 && radian <= 180 ) || ( radian >= 0 && radian <= 20 ) ) {
                      this.vars.flick = true;
                      window.addEventListener("touchmove", scrollAble, {passive:false});
                  }
              }

            }

        },
        function(e, jqObject, x, y){


            var flickablePrevPx = 30,
                flickableNextPx = -30;

            if( this.vars.flick && this.vars.carlistClick ) {


                if( x <= flickableNextPx ){

                  if ( sliderPattern === "default" ) {

                    clearInterval(fadeInImageSlideTimer);
                    fadeInImage(1,true);

                  }else{

                    if ( sliderPattern === "wideslider" ) {
                      clearInterval(wideSlideTimer);
                      // widesliderのみスライドの方向が逆なので。
                      wideSlider(-1,true);
                    }

                  }

                  jqObject.addClass("flickOut");
                  setTimeout( function(){
                    jqObject.removeClass("flickOut");
                  },300);

                } else {

                    if( x >= flickablePrevPx ) {

                      if ( sliderPattern === "default" ) {

                        clearInterval(fadeInImageSlideTimer);
                        fadeInImage(-1,true);

                      }else{

                        if ( sliderPattern === "wideslider" ) {
                          clearInterval(wideSlideTimer);
                          // widesliderのみスライドの方向が逆なので。
                          wideSlider(1,true);
                        }

                      }

                      jqObject.addClass("flickOut");
                      setTimeout( function(){
                        jqObject.removeClass("flickOut");
                      },300);

                    }

                }


            }

            window.removeEventListener("touchmove", scrollAble, {passive: false});
            this.vars.scrollAble = true;
            this.vars.flick = false;
            this.vars.carlistClick = false;
            jqObject.removeClass("flickingSlide");
        },
        {
            flick : false,
            carlistClick : false,
            scrollAble : false
        }

    );

});

$(function(){

  $(".box_common").each(function(){
    //jqObjectの対象をthisの中から定義
    var imageBoxSlider = $(this);

    var ins = new FlickAndSliderBinder(
      // jqObjectの値
      imageBoxSlider, 
      
      // startCallbackの値、タップされた時
      function( e, jqObject, x, y ){ 

        // jqObjectをタップ≠フリックのため、flickの値はfalse
        this.vars.flick       = false;
        // jqObjectをタップ＝クリックのため、targetClickの値はtrue
        this.vars.targetClick = true;
        // jqObjectをタップ≠スクロールのため、scrollAbleの値はfalse
        this.vars.scrollAble  = false;

      },
      // movingCallbackの値、タップされた位置からフリックされた角度を定義
      function( e, jqObject, x, y){

        if ( x >= 40 || x <= -40 ) {

          var ua = navigator.userAgent;
          if (ua.indexOf('iPhone') === -1 || ua.indexOf('Android') === -1) {

            //テキストの選択をできるように、マウスで選択したものが文字ならクラスをリムーブする
            if( document.getSelection().toString() !== "" ){

              jqObject.find(".js-imageBoxContentsWrapper").removeClass("flickingSlide");

            }else{

              jqObject.find(".js-imageBoxContentsWrapper").addClass("flickingSlide");

            }

          }else{

            //スマホはマウスでの選択を考慮しなくていい
            jqObject.find(".js-imageBoxContentsWrapper").addClass("flickingSlide");

          }

        }

        // cosθの算出
        var cosine = x / Math.sqrt(x*x / y*y),
            // cosθのうち、θの値
            radian = Math.acos(cosine) / (Math.PI / 180);
        // フリックされた角度が20°以上160°未満の場合
        if ( ( radian > 20 && radian < 160 ) ){

            // フリックをfalseにし、画像の遷移を行わない
          this.vars.flick = false;
            // scrollAbleをtrueにすることでスクロールを行う準備をする
          this.vars.scrollAble = true;
            // event listnerのtouchmoveイベントからscrollAbleを解除し、画面のスクロールを行うする
          window.removeEventListener("touchmove", scrollAble, {passive: false});

        } else {
            // scrollAbleがfalseの場合
          if( !this.vars.scrollAble ){
            // フリックされた角度が0°以上20°以下かつ160°以上180°以下の場合
            if( ( radian >= 0 && radian <= 20 ) || ( radian >= 160 && radian <= 180 ) ){

              // 画像遷移のためのフリックとしてtrueを返す
              this.vars.flick = true;
              // フリックのためのtouchmoveイベントをevent listnerに加える
              window.addEventListener("touchmove", scrollAble, {passive: false});
            }
          }
        }
      },
      // endCallback の値、タップされた位置から移動距離を定義
      function( e, jqObject, x, y){

            // 前の画像に遷移する距離を定義
        var flickablePrevPx = 40,
            // 次の画像に遷移する距離を定義
            flickableNextPx = -40;

              // 画像遷移のためのフリックがtrue かつjqObjectのタップ=クリックがtrue の場合
            if( this.vars.flick && this.vars.targetClick ){

              //PCでかつ、マウスでテキストを選択しているなら、フリック操作でのスライドをしない
              var ua = navigator.userAgent;
              if (ua.indexOf('iPhone') === -1 || ua.indexOf('Android') === -1) {

                if( document.getSelection().toString() !== "" ){

                  jqObject.find(".js-imageBoxContentsWrapper").removeClass("flickingSlide");
                  return false;

                }

              }

              // prev,next のボタンがあるクラスを定義
              var sliderController = jqObject.find(".js-controllerOuter");
                // フリックされたｘの距離が20以上の場合
              if( x >= flickablePrevPx ){
                // prev のボタンをクリック処理
                sliderController.find(".js-boxImageSliderController[data-controller-id='prev']").trigger("click");

              } else {
                // フリックされたｘの距離が-20以下の場合
                if( x <= flickableNextPx ){
                // next のボタンをクリック処理
                sliderController.find(".js-boxImageSliderController[data-controller-id='next']").trigger("click");

                }
              }

            }

            jqObject.find(".js-imageBoxContentsWrapper").removeClass("flickingSlide");

            // 画像遷移のフリック入力の処理が終わったら、event listner のtouchmoveイベントからscrollAbleを解除する
            window.removeEventListener("touchmove", scrollAble, {passive: false});
            this.vars.scrollAble = true;
            this.vars.targetClick = false;
            this.vars.flick = false;
      },
      {
        //指定のjqObjectが返されなければ、すべてfalse で画像遷移はしない
        scrollAble : false,
        targetClick : false,
        flick : false
      }
      );
  });

});


// ハッピーカーズ様暫定対応

$(function(){

  if( pm_shop_id === "12642" && design_number === "photo" ){

    $("body").addClass("body_12642");

  }

});



// 特定のclassを持つメインイメージスライダは画像クリック、タップでリンク
// 特定のクラスをつけるか否かは。phpとs3slider.jsで制御

$(function(){

    $(document).on("click", ".js-slideLink", function(){

        var linkUrl     = $(this).attr("data-link-url");
        var targetBlank = $(this).attr("data-target-blank");

        if ( $(this).closest("#main_img_wrapper").hasClass("flickOut") ) {

        }else{

          if( linkUrl !== "" ){

              if( targetBlank === "1" ){

                  window.open( linkUrl );

              } else {

                  window.location.href = linkUrl;

              }

          } else {
            //リンク先がないので何もしない
          }

        }


    });

    //PC時フリック操作
    //jqObjectの対象をthisの中から定義
    var pcSliderWrapper = $(".sliderDiv");
    var ins = new FlickAndSliderBinder(
      // jqObjectの値
      pcSliderWrapper, 
      
      // startCallbackの値、タップされた時
      function( e, jqObject, x, y ){ 

        // jqObjectをタップ≠フリックのため、flickの値はfalse
        this.vars.flick       = false;
        // jqObjectをタップ＝クリックのため、targetClickの値はtrue
        this.vars.targetClick = true;
        // jqObjectをタップ≠スクロールのため、scrollAbleの値はfalse
        this.vars.scrollAble  = false;

        jqObject.closest("#main_img_wrapper").removeClass("flickOut");

      },
      // movingCallbackの値、タップされた位置からフリックされた角度を定義
      function( e, jqObject, x, y){

        if ( x >= 45 || x <= -45 ) {

          jqObject.closest("#main_img_wrapper").addClass("flickingSlide");

        }

        // cosθの算出
        var cosine = x / Math.sqrt(x*x / y*y),
            // cosθのうち、θの値
            radian = Math.acos(cosine) / (Math.PI / 180);

        // フリックされた角度が45°以上135°未満の場合
        if ( ( radian > 45 && radian < 135 ) ){

            // フリックをfalseにし、画像の遷移を行わない
          this.vars.flick = false;
            // scrollAbleをtrueにすることでスクロールを行う準備をする
          this.vars.scrollAble = true;
            // event listnerのtouchmoveイベントからscrollAbleを解除し、画面のスクロールを行うする
          window.removeEventListener("touchmove", scrollAble, {passive: false});

        } else {
            // scrollAbleがfalseの場合
          if( !this.vars.scrollAble ){
            // フリックされた角度が0°以上45°以下かつ135°以上180°以下の場合
            if( ( radian >= 0 && radian <= 45 ) || ( radian >= 135 && radian <= 180 ) ){

              // 画像遷移のためのフリックとしてtrueを返す
              this.vars.flick = true;
              // フリックのためのtouchmoveイベントをevent listnerに加える
              window.addEventListener("touchmove", scrollAble, {passive: false});

            }
          }
        }
      },
      // endCallback の値、タップされた位置から移動距離を定義
      function( e, jqObject, x, y){

            // 前の画像に遷移する距離を定義
        var flickablePrevPx = 45,
            // 次の画像に遷移する距離を定義
            flickableNextPx = -45;

              // 画像遷移のためのフリックがtrue かつjqObjectのタップ=クリックがtrue の場合
            if( this.vars.flick && this.vars.targetClick ){

                // フリックされたｘの距離が20以上の場合
              if( x >= flickablePrevPx ){
                // prev のボタンをクリック処理
                jqObject.closest("#main_img_wrapper").find("#decrement").trigger("click");

                jqObject.addClass("flickOut");
                setTimeout( function(){
                  jqObject.closest("#main_img_wrapper").removeClass("flickOut");
                },300);

              } else {
                // フリックされたｘの距離が-20以下の場合
                if( x <= flickableNextPx ){

                  // next のボタンをクリック処理
                  jqObject.closest("#main_img_wrapper").find("#increment").trigger("click");

                  jqObject.closest("#main_img_wrapper").addClass("flickOut");
                  setTimeout( function(){
                    jqObject.closest("#main_img_wrapper").removeClass("flickOut");
                  },300);

                }

              }

            }

            // 画像遷移のフリック入力の処理が終わったら、event listner のtouchmoveイベントからscrollAbleを解除する
            window.removeEventListener("touchmove", scrollAble, {passive: false});
            this.vars.scrollAble = true;
            this.vars.targetClick = false;
            this.vars.flick = false;
            jqObject.closest("#main_img_wrapper").removeClass("flickingSlide");
      },
      {
        //指定のjqObjectが返されなければ、すべてfalse で画像遷移はしない
        scrollAble : false,
        targetClick : false,
        flick : false
      }

    );


    //PC時マルチスライド系デザインのフリック操作
    //jqObjectの対象をthisの中から定義
    var multiSlide = $("#main_img_wrapper");
    var ins = new FlickAndSliderBinder(
      // jqObjectの値
      multiSlide, 
      
      // startCallbackの値、タップされた時
      function( e, jqObject, x, y ){ 

        // jqObjectをタップ≠フリックのため、flickの値はfalse
        this.vars.flick       = false;
        // jqObjectをタップ＝クリックのため、targetClickの値はtrue
        this.vars.targetClick = true;
        // jqObjectをタップ≠スクロールのため、scrollAbleの値はfalse
        this.vars.scrollAble  = false;

        jqObject.removeClass("flickOut");

      },
      // movingCallbackの値、タップされた位置からフリックされた角度を定義
      function( e, jqObject, x, y){

        if ( design_number === "multi_slide" || design_number==="colorful3" ) {

          if ( x >= 45 || x <= -45 ) {

            jqObject.addClass("flickingSlide");

          }

          // cosθの算出
          var cosine = x / Math.sqrt(x*x / y*y),
              // cosθのうち、θの値
              radian = Math.acos(cosine) / (Math.PI / 180);

          // フリックされた角度が45°以上135°未満の場合
          if ( ( radian > 45 && radian < 135 ) ){

              // フリックをfalseにし、画像の遷移を行わない
            this.vars.flick = false;
              // scrollAbleをtrueにすることでスクロールを行う準備をする
            this.vars.scrollAble = true;
              // event listnerのtouchmoveイベントからscrollAbleを解除し、画面のスクロールを行うする
            window.removeEventListener("touchmove", scrollAble, {passive: false});

          } else {
              // scrollAbleがfalseの場合
            if( !this.vars.scrollAble ){
              // フリックされた角度が0°以上45°以下かつ135°以上180°以下の場合
              if( ( radian >= 0 && radian <= 45 ) || ( radian >= 135 && radian <= 180 ) ){

                // 画像遷移のためのフリックとしてtrueを返す
                this.vars.flick = true;
                // フリックのためのtouchmoveイベントをevent listnerに加える
                window.addEventListener("touchmove", scrollAble, {passive: false});

              }
            }
          }

        }

      },
      // endCallback の値、タップされた位置から移動距離を定義
      function( e, jqObject, x, y){

        if ( design_number === "multi_slide" || design_number==="colorful3" ) {

          // 前の画像に遷移する距離を定義
          var flickablePrevPx = 45,
              // 次の画像に遷移する距離を定義
              flickableNextPx = -45;

              // 画像遷移のためのフリックがtrue かつjqObjectのタップ=クリックがtrue の場合
            if( this.vars.flick && this.vars.targetClick ){

                // フリックされたｘの距離が20以上の場合
              if( x >= flickablePrevPx ){
                // prev のボタンをクリック処理
                jqObject.find(".multiSlideOuter").find(".js-multiSlideController[data-trigger='prev']").trigger("click");

                jqObject.addClass("flickOut");
                setTimeout( function(){
                  jqObject.removeClass("flickOut");
                },300);

              } else {
                // フリックされたｘの距離が-20以下の場合
                if( x <= flickableNextPx ){

                  // next のボタンをクリック処理
                  jqObject.find(".multiSlideOuter").find(".js-multiSlideController[data-trigger='next']").trigger("click");

                  jqObject.addClass("flickOut");
                  setTimeout( function(){
                    jqObject.removeClass("flickOut");
                  },300);

                }
              }
            }
          }

            // 画像遷移のフリック入力の処理が終わったら、event listner のtouchmoveイベントからscrollAbleを解除する
            window.removeEventListener("touchmove", scrollAble, {passive: false});
            this.vars.scrollAble = true;
            this.vars.targetClick = false;
            this.vars.flick = false;
            jqObject.removeClass("flickingSlide");
      },
      {
        //指定のjqObjectが返されなければ、すべてfalse で画像遷移はしない
        scrollAble : false,
        targetClick : false,
        flick : false
      }

    );


    //2024/02/09 公開かつスマホ時のみフリックでスライドする処理が多重発火しているため削除。フリックの動きは編集と合わせる

});


/**
 * スマホ判定
 * 要整理
 * @return {Boolean} [description]
 */
var isSmartPhoneAccessStrictly = function()
{

  var flag1 = $(window).width() <= 480,
      flag2 = isSmartPhoneAccess(),
      flag3 = location.href.indexOf("smt=1") !== -1;

  return flag1 || flag2 || flag3;

}


var logCalling = function( s, e, t, self )
{

  if( $(self).attr("data-logged") !== "1" ){

    $(self).attr("data-logged", "1");

    var url = conversionRoot;

    url += "tel_click_log.php";
    url += "?s=" + s;
    url += "&e=" + e;
    url += "&t=" + t;
    url += "&v=2";

    $.ajax( url );

  }


}


/**
 * ヤンキーデザイン用 スクロールに合わせたアニメーション
 */

var yankeeAnimationModel = function()
{

  var self = this;

  this.designNumber = design_number;

  // アニメーションの可不可を制御
  this.animatable = false;

  // jQueryオブジェクト
  this.obj = {};

  // アニメーションに必要な情報をまとめている
  this.coord = {};

  // ウィンドウサイズ
  this.win = {
    w : 0,
    h : 0
  };

  this.scrollTop = 0;

  self.findAnimationTarget = function()
  {

    var returnIndex = null;

    Object.keys(self.coord).forEach( function(i){

      if( returnIndex === null ){

        if( self.scrollTop < self.coord[i].top + self.coord[i].h ){

          returnIndex = i;

        }

      }

    });

    return returnIndex;

  }

  this.styling = function( index )
  {

    var targetObj = self.coord[index].obj;

    var progress = (self.scrollTop - self.coord[index].top) / self.coord[index].h * 100;

    if( progress < 0 ) progress = 0;

    var nth = index % 4;

    switch( nth ){

      case 0: // 4n-3

        // セクションの最下部が画面内に入ったら発火
        if( self.coord[index].top + self.coord[index].h < self.scrollTop + self.win.h ){

          var val = (self.scrollTop + self.win.h) - (self.coord[index].top + self.coord[index].h);

          if(SPJSFLAG == 1 && sp_param == "1"){

            if( val <= 212.5 ){

              targetObj.find(".sectionFloatImage").css("bottom", val - 212.5 + "px");

            }

          } else {

            if( val <= 425 ){

              targetObj.find(".sectionFloatImage").css("bottom", val - 425 + "px");

            }

          }


        }

        if(SPJSFLAG == 1 && sp_param == "1"){

        } else {

          if( progress <= 50 ){
          
            targetObj.find(".sectionFloatBackground")
              .css("opacity", (1.5 * progress + 25) / 100 )
              .css("background-size", 19.2 * (125 - (progress / 2)) + "px auto");

          } else {

            targetObj.find(".sectionFloatBackground").css("background-size", "1920px auto");

          }

        }


        break;

      case 1: // 4n-2

        // セクションの最下部が画面内に入ったら発火
        if( self.coord[index].top + self.coord[index].h < self.scrollTop + self.win.h ){

          var val = (self.scrollTop + self.win.h) - (self.coord[index].top + self.coord[index].h);

          if(SPJSFLAG == 1 && sp_param == "1"){

            if( val <= 196.5 ){

              targetObj.find(".sectionFloatImage")
                .css("opacity", "1")
                .css("top", "auto")
                .css("transform", "none")
                .css("right", "-30px")
                .css("bottom", val - 196.5 + "px");

            }

          } else {

            if( val <= 393 ){

              targetObj.find(".sectionFloatImage")
                .css("opacity", "1")
                .css("top", "auto")
                .css("transform", "none")
                .css("right", "calc( 50vw - 840px )")
                .css("bottom", val - 393 + "px");

            }

          }

        } else {

          if(SPJSFLAG == 1 && sp_param == "1"){

            targetObj.find(".sectionFloatImage")
              .css("opacity", (100 - (2 * progress)) / 100)
              .css("top", 2 * progress + "%")
              .css("right", "calc( 50% - 93.25px )")
              .css("transform", "rotate(" + progress * 7.2 + "deg) scale(" + (100 - (2 * progress)) / 100 + ")");

          } else {

            targetObj.find(".sectionFloatImage")
              .css("opacity", (100 - (2 * progress)) / 100)
              .css("top", 2 * progress + "%")
              .css("right", "calc( 50% - 196.5px )")
              .css("transform", "rotate(" + progress * 7.2 + "deg) scale(" + (100 - (2 * progress)) / 100 + ")");

          }

        }

        break;

      case 2: // 4n-1

        // セクションの最下部が画面内に入ったら発火
        if( self.coord[index].top + self.coord[index].h < self.scrollTop + self.win.h ){

          var val = (self.scrollTop + self.win.h) - (self.coord[index].top + self.coord[index].h);

          if(SPJSFLAG == 1 && sp_param == "1"){

            if( val <= 212.5 ){

              targetObj.find(".sectionFloatImage").css("bottom", val - 212.5 + "px");

            }

          } else {

            if( val <= 425 ){

              targetObj.find(".sectionFloatImage").css("bottom", val - 425 + "px");

            }

          }

        }

        if(SPJSFLAG == 1 && sp_param == "1"){

        } else {

          if( progress <= 50 ){
          
            targetObj.find(".sectionFloatBackground")
              .css("opacity", (1.5 * progress + 25) / 100 )
              .css("background-size", 19.2 * (125 - (progress / 2)) + "px auto");

          } else {

            targetObj.find(".sectionFloatBackground").css("background-size", "1920px auto");

          }

        }

        break;

      case 3: // 4n

        // セクションの最下部が画面内に入ったら発火
        if( self.coord[index].top + self.coord[index].h < self.scrollTop + self.win.h ){

          var val = (self.scrollTop + self.win.h) - (self.coord[index].top + self.coord[index].h);

          if(SPJSFLAG == 1 && sp_param == "1"){

            if( val <= 216.5 ){

              targetObj.find(".sectionFloatImage")
                .css("opacity", "1")
                .css("top", "auto")
                .css("transform", "none")
                .css("right", "-30px")
                .css("bottom", val - 216.5 + "px");

            }

          } else {

            if( val <= 433 ){

              targetObj.find(".sectionFloatImage")
                .css("opacity", "1")
                .css("top", "auto")
                .css("transform", "none")
                .css("right", "calc( 50vw - 840px )")
                .css("bottom", val - 433 + "px");

            }

          }


        } else {

          if(SPJSFLAG == 1 && sp_param == "1"){

            targetObj.find(".sectionFloatImage")
              .css("opacity", (100 - (2 * progress)) / 100)
              .css("top", 2 * progress + "%")
              .css("right", "calc( 50% - 108.25px )")
              .css("transform", "rotate(" + progress * 7.2 + "deg) scale(" + (100 - (2 * progress)) / 100 + ")");

          } else {

            targetObj.find(".sectionFloatImage")
              .css("opacity", (100 - (2 * progress)) / 100)
              .css("top", 2 * progress + "%")
              .css("right", "calc( 50% - 216.5px )")
              .css("transform", "rotate(" + progress * 7.2 + "deg) scale(" + (100 - (2 * progress)) / 100 + ")");

          }


        }

        break;

      default:

        break;

    }

  }


  this.runAnimation = function()
  {

    if( self.animatable ){

      // アニメーションすべきはどの要素？
      var index = self.findAnimationTarget();

      // インラインスタイルの更新
      if( index !== null ){

        self.styling( index );

      }

    }

  }

  this.setScrollTop = function()
  {

    if( self.animatable ){
      
      self.scrollTop = $(window).scrollTop();

    }

  }

  this.setValues = function()
  {

    self.setWindowSize();
    self.setCoordinate();

  }

  this.setWindowSize = function()
  {

    self.win.w = $(window).width();
    self.win.h = $(window).height();

  }

  this.setCoordinate = function()
  {

    // 空に
    self.coord = {};

    self.obj.each( function(i, e){

      var tmp = {

        obj : $(e),
        top : $(e).offset().top,
        h   : $(e).innerHeight(),

      };

      self.coord[i] = tmp;

    });

  }

  this.addAnimationHtml = function()
  {

    var animationHtml = '<div class = "sectionFloatBackground"></div><div class = "sectionFloatImage"></div>';

    self.obj.append( animationHtml );

  }

  this.ready = function()
  {

    self.animatable = true;

  }

  this.__construct = function()
  {

    self.obj = $(".parallaxContentOuter .block_outer, .usedcar_info_body .blog_item");

  }();

}

var yankeeAnimation = null;


/**
 * 在庫車ページ前に戻るボタンの動的な変更
 */
$(function(){

    var ref = document.referrer;

    if( typeof ref !== "undefined" && ref !== "" ){
        
        var hostname = location.hostname;

        if( ref.indexOf(hostname) > -1){

            // 何もしない

        } else {

            resetHref( $("#js-historyBackLink"), $("#js-historyBackLink").attr("data-default-link"), "トップページへ" );

        }

    } else {

        resetHref( $("#js-historyBackLink"), $("#js-historyBackLink").attr("data-default-link"), "トップページへ" );

    }

    function resetHref( obj, href, string )
    {

        return obj.attr("href", href).text(string);

    }

});

function setOriginalImageForSp()
{
  
  var parseOriginalSlideImgPaths = JSON.parse(originalSlideImgPaths);

  if( parseOriginalSlideImgPaths !== null ){

    if( typeof parseOriginalSlideImgPaths["sp"][0] !== "undefined" ) {
      $(".sliderImage1").find(".js-otherPict").attr("src", parseOriginalSlideImgPaths["sp"][0]);
    }

    if( typeof parseOriginalSlideImgPaths["sp"][1] !== "undefined" ) {
      $(".sliderImage2").find(".js-otherPict").attr("src", parseOriginalSlideImgPaths["sp"][1]);
    }

    if( typeof parseOriginalSlideImgPaths["sp"][2] !== "undefined" ) {
      $(".sliderImage3").find(".js-otherPict").attr("src", parseOriginalSlideImgPaths["sp"][2]);
    }


    var parseBgSlideImgPaths = JSON.parse( bgSlideImgPaths )

    if( typeof parseBgSlideImgPaths["sp"][0] !== "undefined" ) {
      $("#bgSlider").find(".sliderDiv[data-slide-number=1]").css("background-image", "url(" + parseBgSlideImgPaths["sp"][0] + ")");
    }

    if( typeof parseBgSlideImgPaths["sp"][1] !== "undefined" ) {
      $("#bgSlider").find(".sliderDiv[data-slide-number=2]").css("background-image", "url(" + parseBgSlideImgPaths["sp"][1] + ")");
    }

    if( typeof parseBgSlideImgPaths["sp"][2] !== "undefined" ) {
      $("#bgSlider").find(".sliderDiv[data-slide-number=3]").css("background-image", "url(" + parseBgSlideImgPaths["sp"][2] + ")");
    }

  }

}


function setOriginalImageForPc()
{

  var parseOriginalSlideImgPaths = JSON.parse(originalSlideImgPaths);

  if( parseOriginalSlideImgPaths !== null ){

    if( typeof parseOriginalSlideImgPaths["pc"][0] !== "undefined" ) {
      $(".sliderImage1").find(".js-otherPict").attr("src", parseOriginalSlideImgPaths["pc"][0]);
    }

    if( typeof parseOriginalSlideImgPaths["pc"][1] !== "undefined" ) {
      $(".sliderImage2").find(".js-otherPict").attr("src", parseOriginalSlideImgPaths["pc"][1]);
    }

    if( typeof parseOriginalSlideImgPaths["pc"][2] !== "undefined" ) {
      $(".sliderImage3").find(".js-otherPict").attr("src", parseOriginalSlideImgPaths["pc"][2]);
    }


    var parseBgSlideImgPaths = JSON.parse( bgSlideImgPaths )

    if( typeof parseBgSlideImgPaths["pc"][0] !== "undefined" ) {
      $("#bgSlider").find(".sliderDiv[data-slide-number=1]").css("background-image", "url(" + parseBgSlideImgPaths["pc"][0] + ")");
    }

    if( typeof parseBgSlideImgPaths["pc"][1] !== "undefined" ) {
      $("#bgSlider").find(".sliderDiv[data-slide-number=2]").css("background-image", "url(" + parseBgSlideImgPaths["pc"][1] + ")");
    }

    if( typeof parseBgSlideImgPaths["pc"][2] !== "undefined" ) {
      $("#bgSlider").find(".sliderDiv[data-slide-number=3]").css("background-image", "url(" + parseBgSlideImgPaths["pc"][2] + ")");
    }

  }

}


$(function(){

  if( $(window).width() <= 480 ) {
    setOriginalImageForSp();
  }

  $(window).on("resize", function(){

    if( $(window).width() <= 480 ) {

      setOriginalImageForSp();

    } else {

      setOriginalImageForPc();

    }

  });



});







/**
 * 初回チェック
 * @param {[type]} pagesMap [description]
 */
var InitCheckEstimateTypeController = function( map, existsFormItem, pageId, isOpen )
{


    var self = this;

    this.url;

    this.LOCAL_STORAGE_KEY = "INIT_CHECK_ESTIMATE_TYPE";

    this.queueItem = null;


    this.setLocalStorage = function( value )
    {
        window.localStorage.setItem( self.LOCAL_STORAGE_KEY, value );
    }


    this.getLocalStorage = function()
    {
        return window.localStorage.getItem( self.LOCAL_STORAGE_KEY );
    }


    this.existsLocalStorage = function()
    {
        return self.getLocalStorage() !== null;
    }



    this.findRIdOpen = function( url )
    {

        var pathname = url.pathname,
            exp = pathname.match( /[a-z]+_(\d+).html/ );

        return exp !== null ? exp[1] : null;

    }


    this.findPGMIdOpen = function( url )
    {
        var res = null,
            pathname = url.pathname,
            exp = pathname.match( /\/([a-z0-9]+)\.html/ );

        if( exp !== null ){

            var en = exp[1];

            self.map.pn.forEach(function( tmp ){

                if( tmp.en === en ){
                    res = tmp.pgmid;
                }

            });

        }

        return res;

    }


    this.findParentMenuId = function( rid )
    {

        var res = null;

        self.map.rp.forEach(function( tmp ){

            if( tmp.rid === rid ){
                res = tmp.pgmid;
            }

        })

        return res;
    }


    this.findRId = function( url )
    {
        var query = url.search,
            exp = query.match(/rid=(\d+)/);

        return exp !== null ? exp[1] : null;
    }


    this.findPGMId = function( url )
    {

        var query = url.search,
            exp = query.match(/pgmid=(\d+)/);

        return exp !== null ? exp[1] : null;

    }


    // pgmid の local storage への保存
    this.getPageId = function( url )
    {

      var urlMap = new URL( url ),
          rid = null,
          pgmid = null;

      if( self.isOpen ){

        var rid = self.findRIdOpen( urlMap ),
            pgmid = self.findPGMIdOpen( urlMap );

        if( rid !== null ){
          pgmid = self.findParentMenuId( rid );
        }

      } else {

        rid = self.findRId( urlMap );
        
        pgmid = self.findPGMId( urlMap );

        // 自由追加の場合はridから取得
        if( rid !== null ){
          pgmid = self.findParentMenuId( rid );
        }

      }

      return pgmid;

    }


    this.save = function( id )
    {
      return self.setLocalStorage( id );
    }


    // pgmid は local storage に存在する？
    this.saved = function()
    {
      return self.existsLocalStorage();
    }

    // local storage からの pgmid の取得
    this.load = function()
    {
      return self.getLocalStorage();
    }

    // 処理の予約
    this.queue = function( targetPageId )
    {

      if( targetPageId !== null ){

        self.queueItem = targetPageId;

      }
  
    }


    // 処理は予約済？
    this.queued = function()
    {
      return self.queueItem !== null;
    }


    // 処理そのもの
    this.check = function()
    {

      var selector = ".submenu_radio_" + self.queueItem;

      if( $(selector).length !== 0 ){

        $(selector).click();

      } else {

        // 出来ない場合 => 一番左のメニューをクリック
        $("input[type='radio'][name='type']").eq(0).click();

      }

    }


    // リファラ―は利用可能？
    this.referrerable = function()
    {
      return document.referrer !== "";
    }


    // 見積りメニュー利用可能ページ？
    this.estimatableMenuPage = function( pageId )
    {
      return $.inArray( pageId, self.map.ep ) !== -1;
    }


    this.isEstimatePage = function()
    {
      return self.pageId === "105";
    }


    // メイン処理
    this.main = function()
    {

      // フォームが存在
      if( self.existsFormItem ){

        // フォームが存在 && 見積りページ
        if( self.isEstimatePage() ){

          if( self.saved() ){

            // フォームが存在 && 見積りページ && local storage に格納済み => ローカルストレージ値を使う
            self.queue( self.load() );

          // フォームが存在 && 見積りページ && 未保存
          } else {

            // フォームが存在 && 見積りページ && 未保存 && リファラ利用可能？
            if( self.referrerable() ){

              // リファラ―
              var id = self.getPageId( document.referrer );

              self.save( id );

              self.queue( id );

            // フォームが存在 && 見積りページ && 未保存 && リファラ利用不可
            } else {

              self.queue( null );

            }

          }

        // フォームが存在 && 非見積りページ => save 出来ない
        } else {

          var id = self.getPageId( location.href );

          // 見積り可能ページ => 現ページIDでOK
          if( self.estimatableMenuPage( id ) ){
            
            self.save( id );
            
            self.queue( id );

          } else {

            // TOPページは問答無用で一番左のメニューを選択しているようにする。
            if ( self.pageId === "101" ) {

              self.queue( "101" );

            }else{

              // 非見積り可能ページ => ls or ref

              if( self.saved() ){

                self.queue( self.load() );

              } else {

                if( self.referrerable() ){
                    
                    var id = self.getPageId( document.referrer );
                    
                    self.queue( id );

                } else {

                  self.queue( null );

                }

              }

            }

          }

        }

      // フォーム存在しない
      } else {

        // 現URLからページIDを取得
        var id = self.getPageId( location.href );

        // 見積りメニューとして利用可能なページ？
        if( self.estimatableMenuPage( id ) ){

          // ページIDを取得して local Storage へ
          self.save( id );

        } else {

          // その他　等 => 何もしない

        }

      }

    }


    this.__construct = function()
    {

        self.map = map;

        self.existsFormItem = existsFormItem === "1";

        self.pageId = pageId;

        self.isOpen = isOpen;

    }();

}



// 見積りページデフォルト対策

if( typeof PAGES_MAP !== "undefined" ){

  var initCheckEstimateTypeController = new InitCheckEstimateTypeController(
    PAGES_MAP,
    EXISTS_FORM_ITEM,
    PAGE_ID,
    isOpen
  );


  initCheckEstimateTypeController.main();

}


$(function(){

  function urlHashForm ( focus ){

    if(focus === "#block_outer_contact_form"){
      $("#block_outer_contact_form").find(".contact_table input:visible").eq(0).focus();

    } else {

      if(focus === "#block_outer_estimate_form"){
        $("#block_outer_estimate_form").find(".est_table_car input:visible").eq(0).focus();

      } else {

        if(focus === "#block_outer_entry_form"){
          $("#block_outer_entry_form").find("#otoiawase_table_box input:visible").eq(0).focus();

        } else {

          if(focus === "#block_outer_carlist"){
            $("#block_outer_carlist").find("#car_free_search").focus();
          } else {

          }
        }
      }
    }
  }

  var urlHash = $(location).attr('hash');

  $(window).on("load", function(){

    urlHashForm(urlHash);

  });

  $(window).on("hashchange", function(){
    urlHash = $(location).attr('hash');

    urlHashForm(urlHash);
    
  });

  $(".basicInfo").on("click", function(){
    setTimeout(function(){
      $(".TB_iframeContent").contents().find("#onload_focus").focus();
    }, 900);
  });

  $(".privateInfo").on("click", function(){
    setTimeout(function(){
      $(".TB_iframeContent").contents().find("input:visible").eq(0).focus();
    }, 900);
  });

  // 指定のselectタグをクリック時、中央にスクロールした状態で表示する
  var date = new Date;
  var currentYear = date.getFullYear();
  var targetYear = currentYear - 5;

  var selectTag = $("select[name='forms\\[nenshiki\\]']");
  var targetOption = selectTag.find('option[value="'+targetYear+'"]'); // フォーカスするオプションタグ
  var isNoSeleced = true;
  var isNoPreventDefault = true;

  if( selectTag.val() !== "" ){
    // セレクトタグが選択済みかどうか
    isNoSeleced = false;
  }


  // セレクトボックスをクリックしたとき
  if( SPJSFLAG == 1 && sp_param == "1" ){
    selectTag.on('touchstart', function(e) {
      targetOption.prop("selected", true);
    });
  } else {
    selectTag.on('focus', function(e) {

      if( isNoPreventDefault && isNoSeleced ){
        e.preventDefault();
        e.stopPropagation();

        isNoPreventDefault = false;
        targetOption.prop("selected", true);
        selectTag.val( targetOption.val() ).trigger("click");
      }
    });
  }

});

//20231005　下部コンバージョンボタンクリックログ取得（編集・公開共通なのでここに記載）
$(document).on( "click", ".js-fixedConversionButtonInner", function(e){

  if ( $(e.target).hasClass("js-fixedConversionButtonButtonItem") ){

    var href = $(e.target).attr("href"),
        index = $(e.target).closest(".js-fixedConversionButtonInner").attr("data-button-index"),
        type = $(e.target).closest(".js-fixedConversionButtonInner").attr("data-text-tab-key"),
        displayPc = $(e.target).closest(".js-fixedConversionButtonInner").attr("data-display-pc"),
        displaySp = $(e.target).closest(".js-fixedConversionButtonInner").attr("data-display-sp"),
        url = conversionRoot + "conversion_button_click_log.php",
        text = "";

    if ( type === "text") {
      text = $(e.target).text();
    }

    $.ajax({
      type : "POST",
      url : url,
      data : {
        shop_id : pm_shop_id,
        is_edit_page : edit_param,
        index : index,
        type : type,
        text : text,
        href : href,
        display_pc : displayPc,
        display_sp : displaySp
      }
    });

  }

});



// スマホのバックトップ、途中から出現
$(function(){

  // 変数にjqueryオブジェクトを入れる
  var btn = $(".backtop");

  $(window).on('load scroll', function(){

    if( window.innerWidth <= 480 ){ // スマホ処理

      // スクロールしてページトップから850pxに達したらボタンを表示
      if( $(this).scrollTop() > 850 ){
   
        btn.removeClass('hiddenButton');

      } else {
      
        btn.addClass('hiddenButton');
      
      }

    } else { // PC処理
      
      //スクロールしてページトップから650pxに達したらボタンを表示
      if( $(this).scrollTop() > 650 ){

        btn.removeClass('hiddenButton');

      } else {

        btn.addClass('hiddenButton');

      }

    } 

  });

}); 


$(function(){

  $("[data-leaved-titlestr]").each(function(){ // removeAttrTitle()から逃れたtitleをもつものを取得

    var title = $(this).attr("data-leaved-titlestr");
    
    if( typeof title !== "undefined" && title !== "" ){
    
      $(this).attr("title", title);

    } else {

      // 何もしない

    }

  });

});


// 上部パレットデザインの検索ログ取得
// ログ取得の関数は公開側でも使うので、パレットのログ取得も記載
$(function(){

    // フォーカスが外れたらログ取得
    $(document).on("blur", "#js-designPaletteSearchInput", function(){
        var searchDesignText = $(this).val(),
            shopId = pm_shop_id,
            searchKey = "searchDesign";

        freeWordLog(shopId, searchDesignText, searchKey);

    });

    // Enterキーが押されたらログ取得
    $(document).on("keydown", "#js-designPaletteSearchInput", function(){
        if(event.keyCode === 13){
            var searchDesignText = $(this).val(),
                shopId = pm_shop_id,
                searchKey = "searchDesign";

            freeWordLog(shopId, searchDesignText, searchKey);

        } else {
            // 何もしない
        }
    })

});

function freeWordLog(shopId, searchWord, searchKey){
  if (edit_param === "1") {
    var isOpen = "0";
  } else {
    var isOpen = "1";
  }

  if( searchWord !== ""){

    $.ajax({
      type : "POST",
      url : conversionRoot + "free_search_word_log.php",
      data : {
        shop_id : shopId,
        search_word : searchWord,
        search_key : searchKey,
        is_open : isOpen
      }
    }).done(function(res){
      // console.log(res);
    }).fail(function(res){
      // console.log(res);
    })

  } else {
    // フリーワードが未入力なら取得しない
  }
}


//編集・公開で参照できるべきなので、ここに記載。
$(function(){

  //tabキー押下で直感編集ができる要素にフォーカスする
  var EipFormFocusController = function()
  {

    var self = this;

    this.canFocusElements = {};

    this.indexNumber = "";

    this.tabFocusingEipElement = false;

    this.focusingFormElement = false;

    this.next = function( focusingElement )
    {

      //何にもフォーカスしていない状態、最後の要素にフォーカスをした時はオブジェクトの一番初めの要素にフォーカスを当てる必要がある。
      if ( self.indexNumber === "" || self.indexNumber >= Object.keys(self.canFocusElements).length - 1 ) {

        self.indexNumber = 0;
        focusingElement = self.canFocusElements[0].element;

      }else{

        self.indexNumber = self.indexNumber + 1;

      }

      self.action( focusingElement );

    }

    this.prev = function( focusingElement )
    {

      //何にもフォーカスしていない状態はオブジェクトの一番最後の要素にフォーカスを当てる必要がある。
      if ( self.indexNumber === "" || self.indexNumber === 0 ) {

        self.indexNumber = Object.keys(self.canFocusElements).length - 1;
        focusingElement = self.canFocusElements[0].element;

      }else{

        self.indexNumber = self.indexNumber - 1;

        if ( self.indexNumber < 0 ) {

          self.indexNumber = Object.keys(self.canFocusElements).length - 1;

        }

      }

      self.action( focusingElement );

    }

    this.action = function( focusingElement )
    {

      var nextElement = self.canFocusElements[self.indexNumber].element,
          nextElementId = self.canFocusElements[self.indexNumber].id,
          matchedSliderCaption = nextElementId.match(/slider\_/),
          matchedBoxImageLayoutCaption = nextElementId.match(/ibc\-/);

        //メインイメージの要素の時は特別な処理
        if ( matchedSliderCaption !== null && matchedSliderCaption.length > 0 ) {

          self.mainImageSlide( focusingElement, nextElement );

        }else{

          //10枚スライドの要素の時は特別な処理
          if ( matchedBoxImageLayoutCaption !== null && matchedBoxImageLayoutCaption.length > 0 ) {

            self.boxImageLayoutSlide( focusingElement, nextElement );

          }else{

            self.scroll( focusingElement, nextElement );

          }

        }

      $(focusingElement).removeClass("tabFocusing");

      $(nextElement).addClass("tabFocusing");

    }

    //メインイメージのスライドを対象とするメソッド
    this.mainImageSlide = function( element, nextElement )
    {

      var closestBgSliderElement = $(element).closest(".sliderDiv"),
          closestBgSliderElementId = $(closestBgSliderElement).attr("id"),
          closestBgSliderNextElement = $(nextElement).closest(".sliderDiv"),
          closestBgSliderNextElementId = $(closestBgSliderNextElement).attr("id");

      if ( closestBgSliderNextElement.length > 0 ) {

        if ( $(closestBgSliderNextElement).attr("data-disp-flag") === "1" ) {

          //prevnext
          self.tabFocusingEipElement = true;

          //0の時、強制的に該当のスライドまで移動する
          if(self.indexNumber === 0 ){

            self.displayPrevnextTargetSlide(closestBgSliderElement);

          }

          if ( closestBgSliderElementId !== closestBgSliderNextElementId ) {

            self.displayPrevnextTargetSlide(closestBgSliderNextElement);

          }

          self.scroll( element, nextElement );

        }else{

          if ( $(closestBgSliderNextElement).attr("data-show-slide") === "1") {

            //multi_slide
            self.tabFocusingEipElement = true;

            //0の時、強制的に該当のスライドまで移動する
            if(self.indexNumber === 0 ){

              self.displayMultiSlideTargetSlide(closestBgSliderElement);

            }

            if ( closestBgSliderElementId !== closestBgSliderNextElementId ) {

              self.displayMultiSlideTargetSlide(closestBgSliderNextElement);

            }

            self.scroll( element, nextElement );

          }else{

            //考えにくいけど、スライドのカレントの次が非表示の場合のために一応
            self.boxImageLayoutSlide( element, nextElement );

          }

        }

      }else{

        //メインイメージ（prevnext, multi_slide）以外の要素
        self.tabFocusingEipElement = false;
        self.boxImageLayoutSlide( element, nextElement );

      }

    }

    this.displayPrevnextTargetSlide = function( element )
    {

      var num = $(element).index(".sliderDiv"),
          nextButton = $("#sliderStepsContainer span[data-disp-flag='1']").eq(num);

      $(nextButton).click();

    }

    this.displayMultiSlideTargetSlide = function( element )
    {

      //不具合ありのため後でなおす
      var elementOrder = $(element).closest(".multiSlideContent").attr("data-order"),
          currentOrder = $(".multiSlideContent[data-center='1']").attr("data-order"),
          orderClacResult = Number(elementOrder) - Number(currentOrder),
          num = parseInt(orderClacResult);

      //css_and_js.phpで定義されている
      specialSlideInstance.play(num);

    }

    //10枚スライドを対象とするメソッド
    this.boxImageLayoutSlide = function( element, nextElement )
    {

      var closestImageBoxMultiSlideOuter = $(nextElement).closest(".imageBoxMultiSlider");

      if ( closestImageBoxMultiSlideOuter.length > 0 ) {

        //imageBoxMultiSlider.jsの処理を参照
        var slideNum = $(nextElement).closest(".imageBoxContents").attr("data-slider-order"),
            slideNum = Number(slideNum) + 1,
            imageBoxContentsWrapper = $(closestImageBoxMultiSlideOuter).find(".imageBoxContentsWrapper"),
            imageBoxContentsSubWrapper = $(closestImageBoxMultiSlideOuter).find(".imageBoxContentsSubWrapper"),
            contentsDiplayNum = "";

        if ( imageBoxContentsWrapper.outerWidth() < 480 ) {

          contentsDiplayNum = "1";

        }else{

          contentsDiplayNum = "3";

        }

        //真ん中に来るように-1している
        var imageOuterWidth = imageBoxContentsWrapper.outerWidth() / contentsDiplayNum,
            moveRange = -1 * ( Number(slideNum) - 1 ) * imageOuterWidth;

        self.scroll( element, nextElement );

        $(imageBoxContentsSubWrapper).css({left : moveRange + "px"});

      }else{

        self.scroll( element, nextElement );

      }

    }

    //上記以外の場合はすべてこちら
    this.scroll = function( element, nextElement )
    {

      var scrollToElement = $(nextElement).offset().top,
          elementHeight = $(nextElement).innerHeight(),
          windowHeight = window.innerHeight,
          calcScrollRange = scrollToElement - windowHeight / 2 + elementHeight / 2;

      if ( calcScrollRange < 0 ) {

        calcScrollRange = 0;

      }

      $("html, body").animate({scrollTop : calcScrollRange }, 1 );

    }

    //メンバ変数の値の更新を行う。直感編集ウィンドウを開いた時に発火する
    this.rewriteIndexNumber = function( element )
    {

      var elementId = $(element).attr("id");

      Object.keys(self.canFocusElements).forEach( function(key) {

        var elementCharacter = self.canFocusElements[key],
            id = elementCharacter.id;

        if ( elementId === id ) {

          self.indexNumber = Number(key);

        }else{
          //何もしない
        }

      });

    }

    this.omitHiddenElement = function( id )
    {

      var shouldOmit = "";

      //あまりelseifは使いたくないけど仕方なく、こうする
      if ( id.match(/slider\_title/) ) {

        var selector = "#" + id,
            shouldOmit = self.isStyledHidden( "title", selector );

      }else if( id.match(/slider\_caption/) ){

        var selector = "#" + id,
            shouldOmit = self.isStyledHidden( "caption", selector );

      }else if( id.match(/slider\_button/) ){

        var selector = "#" + id,
            shouldOmit = self.isStyledHidden( "button", selector );

      }else{
        //何もしない
      }

      return shouldOmit;

    }

    this.isStyledHidden = function( type, selector )
    {

      var shouldOmit = false,
          multiSlideClass = "",
          prevnextClass = "";

      switch(type){

        case "title":

          multiSlideClass = ".multiSlideTitle";
          prevnextClass = ".slider_strong";

        break;

        case "caption":

          multiSlideClass = ".multiSlideCaption";
          prevnextClass = ".slider_caption";

        break;

        case "button":

          multiSlideClass = ".multiSlideLink";
          prevnextClass = ".slider_btn";

        break;

        default :
          break;

      }

      if ( design_number === "multi_slide" || design_number === "colorful3" ) {

        var style = $(selector).closest(multiSlideClass).attr("style");

      }else{

        var style = $(selector).closest(prevnextClass).attr("style");

      }

      if ( style !== undefined ) {

        if ( style.trim() === "visibility:hidden;" ) {

          shouldOmit = true;

        }

      }

      return shouldOmit;

    }

    this.build = function()
    {

      var tmp = {};

      //直感編集可能な要素と、お問合せ・お見積りフォームのinput要素
      var elements = $("body").find(".inplace:visible, .inplace_normal:visible");

      var skipCount = 0;

      for (var i = 0; i < elements.length; i++) {

          var element = elements[i],
              id = $(element).attr("id");

          if ( typeof id === "undefined" || id === "" ) {

            skipCount++;
          
          }else{

            if ( self.omitHiddenElement(id) ) {

              skipCount++;

            }else{

              var key = i - skipCount;

              //念のため
              if ( key < 0 ) {

                key = 0;

              }

              tmp[key] = {
                "element" : element,
                "id" : id
              };

            }

          }

      }

      return tmp;

    }

    this.switchaTabKeydownEvent = function( downKey, e, focusedEipElement, targetElement )
    {

      e.preventDefault();

      if ( focusedEipElement ) {

        var focusingElement = targetElement;

      }else{

        if ( focusController.indexNumber !== "" ) {

          var focusingElement = focusController.canFocusElements[focusController.indexNumber];

        }

      }

      self.tabFocusingEipElement = false;

      if ( downKey === "onlyTab" ) {

        focusController.next(focusingElement);

      }else{

        focusController.prev(focusingElement);

      }


    }

    this.enterKeydownEvent = function( e, focusedEipElement, targetElement )
    {

      if ( focusedEipElement ) {

        e.preventDefault();
        targetElement.click();

      }

    }

    this.bind = function()
    {

      $("body").on("keydown",function(e){

        var iframe = $("body").find("#js-smtInner"),
            openedEipEditArea = "",
            focusedEipElement = "",
            targetElement = "",
            focusingElement = "";

        if ( iframe.length > 0 ) {

          openedEipEditArea = iframe[0].contentWindow.find("#edit_frame").length > 0;
          focusedEipElement = iframe[0].contentWindow.find(".tabFocusing").length > 0;
          targetElement = iframe[0].contentWindow.find(".tabFocusing");

        }else{

          openedEipEditArea = $("body").find("#edit_frame").length > 0;
          focusedEipElement = $("body").find(".tabFocusing").length > 0;
          targetElement = $("body").find(".tabFocusing");

        }

        if ( !openedEipEditArea ) {

          if ( e.shiftKey ) {

            //Shift + Tabキーを押下したとき
            if ( e.keyCode === 9 ) {

              if ( !self.focusingFormElement ) {

                self.switchaTabKeydownEvent( "shiftAndTab", e, focusedEipElement, targetElement );

              }

            }

          }else{

            //tabキーを押下したとき
            if ( e.keyCode === 9 ) {

              if ( !self.focusingFormElement ) {

                self.switchaTabKeydownEvent( "onlyTab", e, focusedEipElement, targetElement );

              }

            }else{

              //enterキーを押下したとき
              if ( e.keyCode === 13 ) {

                self.enterKeydownEvent( e, focusedEipElement, targetElement );

              }

            }

          }

        }

      });

      $("body").on("click", function(){

        if( $("body").find(".tabFocusing").length > 0 ){

          self.tabFocusingEipElement = false;
          $("body").find(".tabFocusing").removeClass("tabFocusing");

        }

      });

      $(document).on("focus", "input, select, textarea, a[title='車検証']",function(){

        self.focusingFormElement = true;

      });

      $(document).on("blur", "input, select, textarea, a[title='車検証']",function(){

        self.focusingFormElement = false;

      });

    }

    this.__constructor = function()
    {
        self.canFocusElements = self.build();
    }()

  }

  focusController = new EipFormFocusController();
  focusController.bind();


  // メニューのページ数を表示
  $(".js-subPageWrapper").each( function(){

    if( $(window).width() <= 480 ){

      if( $(this).attr("data-menu-id") === "104" || $(this).attr("data-menu-id") === "105" ){

        // 問合せ・見積りページは表示しない

      } else {

        var num = pageNumCounter( $(this) );

        if( num > 0 ){

          appendPageNumHtml( $(this).find(".js-menuTitle"), num );
        
        } else {

          // 0ページなら出さない

        }

      }

    } else {

      // PC幅なので実行しない

    }

  });

  function pageNumCounter( obj )
  {

    if( typeof obj !== "undefined" && obj !== "" ){

      var allPageNum = obj.find(".js-searchTargetList").length;

      var hiddenPageNum = obj.find(".js-searchTargetList[data-is-private='1']").length;
      var openPageNum   = allPageNum - hiddenPageNum;
    
      return openPageNum; // ページカウント対象の要素数を返す

    } else {

      return null;

    }

  }

  function appendPageNumHtml( targetObj, num )
  {

    if( typeof targetObj !== "undefined" && targetObj !== "" ){

      if( num > 0 ){

        var html = "<span class = 'pageNumByPageWrapper'><span class = 'pageNumByPage'>" + num + "</span>ページ</span>";

        targetObj.append( html );

      } else {

          // 0ページならappendしない

      }

    } else {

      // targetObjがきちんとわたっていない、何もしない

    }

  }

  // 404対応
  (function(){

    var is404 = $("body").hasClass("notFoundPage");

    if( is404 ){

        var href = location.href;

        if( href.match(/carinfo_(.*)\.html/) !== null ){
            $(".block_outer_recommend--404").addClass("block_outer_recommend--404-visible");
        }

    }

  }());

});


var AnimationExPastel3 = function()
{

  var self = this;

  this.interval = 10;

  this.viewport = {
    top : 0,
    bottom : 0
  };


  this.createClassString = function( ...suffixes )
  {

    var classes = ["extra__p3-item"];

    suffixes[0].forEach(function( suffix ){
      classes.push(`extra__p3-item--${suffix}`);
    });

    return classes.join(" ");

  }




  this.createJqObject = function( ...suffixes )
  {
    return $('<span></span>').addClass( self.createClassString( suffixes ) );
  }




  this.assign = function( selectors, animationName, type )
  {

    var jqObject = $(selectors.join(","));

    if( type === "before" ){

      jqObject.children( ".extra__p3-item--before" ).remove();

    } else if( type === "after" ){

      jqObject.children( ".extra__p3-item--after" ).remove();

    } else if( type === "self" ){

      jqObject.removeClass(function(index, className) {
        return (className.match(/\bextra__p3-\S+/g) || []).join(' ');
      });

    }

    switch( type ){

      case "before":
        jqObject.prepend( self.createJqObject( "before", animationName ) );
      break;

      case "after":
        jqObject.append( self.createJqObject( "after", animationName ) );
      break;

      case "self":
        jqObject.addClass( self.createClassString( ["self", animationName] ) );
      break;

    }

  }


  this.calc = function( jqObject )
  {

    if( !self.initialized ){
        return 0;
    } else {

        var top = jqObject.offset().top;

        if( top >= self.viewport.top && top <= self.viewport.bottom ){

            var per = 1 - ( top - self.viewport.top ) / ( self.viewport.bottom - self.viewport.top );

            var tmp = parseFloat(per).toFixed(2);

            if( !self.isPC ){

              // スマホ操作の場合、100に行き切らない場合がある
              if( tmp >= 80 ){

                return 100;

              }

            }

            return tmp;

        } else {

            return false;

        }
    }

  }


  this.rgb2Array = function( rgb )
  {
    var reg = rgb.match(/rgb\((\d+),\s(\d+),\s(\d+)\)/);
    return reg !== null ? { r : reg[1], g : reg[2], b : reg[3] } : null;
  }



  this.main = function(  )
  {

    self.isPC = $(window).width() >= 480;

    $(".extra__p3-item").each(function(){

        // h2下ライン
        if( $(this).hasClass("extra__p3-item--scroll-h2-bar") ){

            var parent = $(this).closest("h2"),
                per = self.calc( parent );

            if( per !== false ){

                $(this).css("width", per * 60);

            }

        // 背景円
        } else if( $(this).hasClass("extra__p3-item--scroll-round-scale-up") ){

            if( !self.isPC && $("body").attr("id") === "top" && $(".js-parallaxContentOuter").index() === 0 ){

              // 例外中の例外
              // スマホ・トップ・メインイメージ直後に背景円　→　大きいサイズじゃないと、見出しが見えなくなる

              $(this).css("transform", `scale(1)`);

            } else {

              var parent = $(this).closest(".block_outer"),
                  per = self.calc( parent );

              if( per !== false ){

                  $(this).css("transform", `scale(${per})`);

              }

            }

        // 見出し横の大きな円
        } else if( $(this).hasClass("extra__p3-item--scroll-h2-left") ){

            var parent = $(this).closest("h2"),
                per = self.calc( parent );

            if( per !== false ){

                if( self.isPC ){

                  $(this).css({
                      top :  -40 + 40 * per,
                      left : -110 + 40 * per
                  });

                } else {

                  // -10vw ~ 0vw

                  $(this).css({
                      top :  -40 + 40 * per,
                      left : -80 + 40 * per
                  });

                }

            }

        // 左から右に動く背景
        } else if( $(this).hasClass("extra__p3-item--scroll-slide-right") ){

            var parent = $(this).closest(".block_outer"),
                per = self.calc( parent );

            if( per !== false ){

                var value = ( 1 - per / 2 ) * 100 + "%";

                $(this).css("width", value);

            }

        // 左から右に動く背景２
        } else if( $(this).hasClass("extra__p3-item--scroll-slide-left") ){

            var parent = $(this).closest(".block_outer"),
                per = self.calc( parent );

            if( per !== false ){

              if( self.isPC ){

                var value = ( per ) * 60 + "%";

              } else {

                var value = per * 100 + "%";

              }

              $(this).css("width", value);

            }

        // 左から右に動く背景３
        } else if( $(this).hasClass("extra__p3-item--scroll-block-slide") ){

            var parent = $(this).closest("div"),
                per = self.calc( parent );

            if( per !== false ){

                var value = ( per ) * 100 + "%";

                $(this).css("width", value);

            }


        // 背景色変更１
        } else if( $(this).hasClass("extra__p3-item--scroll-change-color-1") ){

            var parent = $(this),
                per = self.calc( parent );

            if( self.initialized && per !== false ){

                if( $(this).attr("data-original-rgb") === undefined ){

                    $(this).attr("data-original-rgb", $(this).css("backgroundColor"));
                    return;

                } else {

                    var tmp = $(this).attr("data-original-rgb"),
                        rgb = self.rgb2Array( tmp );

                    var base = { r : 252, g : 252, b : 252 };

                    if( rgb !== null ){

                        var next = {
                            r : base.r - ( ( base.r - rgb.r ) * per ),
                            g : base.g - ( ( base.g - rgb.g ) * per ),
                            b : base.b - ( ( base.b - rgb.b ) * per )
                        };

                        var value = `rgb( ${next.r}, ${next.g}, ${next.b} )`;

                        $(this).css("backgroundColor", value );

                    }

                }

            }


        // 背景色変更１
        } else if( $(this).hasClass("extra__p3-item--scroll-change-color-2") ){

            var parent = $(this),
                per = self.calc( parent );

            if( self.initialized && per !== false ){

                if( $(this).attr("data-original-rgb") === undefined ){
                    
                    $(this).attr("data-original-rgb", $(this).css("backgroundColor"));
                    return;

                } else {

                    var tmp = $(this).attr("data-original-rgb"),
                        rgb = self.rgb2Array( tmp );

                    var to = { r : 252, g : 252, b : 252 };

                    if( rgb !== null ){

                        var next = {
                            r : to.r + ( ( rgb.r - to.r ) * ( 1 - per ) ),
                            g : to.g + ( ( rgb.g - to.g ) * ( 1 - per ) ),
                            b : to.b + ( ( rgb.b - to.b ) * ( 1 - per ) )
                        };

                        var value = `rgb( ${next.r}, ${next.g}, ${next.b} )`;

                        $(this).css("backgroundColor", value );

                    }
                }

            }

        // スクロール・fadeIn
        } else if( $(this).hasClass("extra__p3-item--scroll-fadeIn") ){

            var parent = $(this),
                per = self.calc( parent );

            if( per !== false ){

                per = per * 3;

                if( per >= 1 ){
                    per = 1;
                } else if( per <= 0.9 ){
                    per = 0.9;
                }

                // var scale = 1 - per ;
                var scale = per;

                $(this).css({
                    opacity : per,
                    transform: `translateY( -60px ) translateY( calc( 60px * ${per} ) ) scale( ${scale} )`
                });

            }

        }

    });

  }



  this.bind = function()
  {

    $(window).on("scroll.designEvent", function(e){

      clearTimeout(self.timer);

      self.timer = setTimeout(function(){

        self.viewport.top = $(window).scrollTop();
        
        self.viewport.bottom = self.viewport.top + $(window).height();

        self.main();

      }, self.interval);

    })

  }


  this.__construct = function()
  {

  }();

}
var animationExPastel3 = null;


var AnimationBlack5 = function()
{

  var self = this;

  this.animationTargetElements = [
      ".parallaxContentOuter:nth-of-type(3n-2) h2#recommend_h2",
      ".parallaxContentOuter:nth-of-type(3n-2) h2.midashi_long",
      ".parallaxContentOuter:nth-of-type(3n-2) #middle_top_price01 h2",
      ".parallaxContentOuter:nth-of-type(3n-2) h2.cart_h2",
      ".blog_item:nth-of-type(3n-2) h2#recommend_h2",
      ".blog_item:nth-of-type(3n-2) h2.midashi_long",
      ".blog_item:nth-of-type(3n-2) h2.cart_h2",
      "#main_contents_container .ec-cart .blog_item:nth-of-type(3n-2) h2.cart_h2",
      "#main_contents_container .ec-cart .blog_item:nth-of-type(3n-2) h2.h2_title",
      ".parallaxContentOuter:nth-of-type(3n-1) h2#recommend_h2",
      ".parallaxContentOuter:nth-of-type(3n-1) h2.midashi_long",
      ".parallaxContentOuter:nth-of-type(3n-1) #middle_top_price01 h2",
      ".parallaxContentOuter:nth-of-type(3n-1) h2.cart_h2",
      ".blog_item:nth-of-type(3n-1) h2#recommend_h2",
      ".blog_item:nth-of-type(3n-1) h2.midashi_long",
      ".blog_item:nth-of-type(3n-1) h2.cart_h2",
      "#main_contents_container .ec-cart .blog_item:nth-of-type(3n-1) h2.cart_h2",
      "#main_contents_container .ec-cart .blog_item:nth-of-type(3n-1) h2.h2_title",
  ];

  this.main = function()
  {

    var position = {
      start : "0%",
      end : "50%"
    };

    observeVisibleVertical(
      "h2.animation__h2--black5--passive",
      {
        start : position.start,
        end   : position.end
      },
      {
        visible : function( jqObject ){
          $(jqObject).removeClass("animation__h2--black5--passive");
          $(jqObject).addClass("animation__h2--black5--active");
        },
        hidden  : function( jqObject ){
        }
      }
    );

  }

  this.isExceptionElement = function( jqObject )
  {

    // 「サンキュー」「レビュー」「FAQ」「導線」はh2を左右に振っていないので例外とする。
    var thankyouBlock = jqObject.closest(".block_outer_thankyou"),
        isThankyou = thankyouBlock.length > 0,
        reviewBlock = jqObject.closest(".block_outer_review_main"),
        isReview = reviewBlock.length > 0,
        faqBlock = jqObject.closest("#block_outer_faq"),
        isFaq = faqBlock.length > 0,
        leadBlock = jqObject.closest(".block_outer_lead"),
        isLead = leadBlock.length > 0;

    return isThankyou || isReview || isFaq || isLead;

  }

  this.prepare = function()
  {

      var targetCount = self.animationTargetElements.length;

      for (var i = 0; i < targetCount; i++) {

        var targetElements = $(self.animationTargetElements[i]);

        if ( targetElements !== null && targetElements.length > 0 ) {

          for (var j = 0; j < targetElements.length; j++) {

            if ( !self.isExceptionElement( $(targetElements[j]) ) ) {

              $(targetElements[j]).addClass("animation__h2--black5--passive");

            }else{
              // 例外パターンなので、クラスをつけない。
            }

          }

        }else{
          // 現在のHTML上に要素が存在しない。
        }

      }

  }

  this.__cocnstructor = function()
  {

      self.prepare();

  }()

}

var animationBlack5 = null;


var AnimationPhoto7 = function()
{

  var self = this;

  this.animationTargetElements = [
      ".parallaxContentOuter:nth-of-type(4n-2)",
      ".blog_item:nth-of-type(4n-2)",
      ".parallaxContentOuter:nth-of-type(4n)",
      ".blog_item:nth-of-type(4n)",
      "h2.midashi_long",
      ".h2_common",
      ".parallaxContentOuter[data-field-id='carlist'] h2.midashi_long",
      ".parallaxContentOuter[data-field-id='faq'] h2.midashi_long",
      "#block_outer_recommend #recommend_h2",
      ".ec-cart .parallaxContentOuter h2.midashi_long",
  ];

  this.main = function()
  {

    var position = {
      start : "0%",
      end : "50%"
    };

    observeVisibleVertical(
      ".animation__h2--photo7--passive",
      {
        start : position.start,
        end   : position.end
      },
      {
        visible : function( jqObject ){
          $(jqObject).removeClass("animation__h2--photo7--passive");
          $(jqObject).addClass("animation__h2--photo7--active");
        },
        hidden  : function( jqObject ){
        }
      }
    );

  }

  this.isExceptionElement = function( jqObject )
  {

    // 「導線」はh2を左右に振っていないので例外とする。
    var leadBlock = jqObject.closest(".block_outer_lead"),
        isLead = leadBlock.length > 0;

    return isLead;

  }

  this.prepare = function()
  {

      var targetCount = self.animationTargetElements.length;

      for (var i = 0; i < targetCount; i++) {

        var targetElements = $(self.animationTargetElements[i]);

        if ( targetElements !== null && targetElements.length > 0 ) {

          for (var j = 0; j < targetElements.length; j++) {

            if ( !self.isExceptionElement( $(targetElements[j]) ) ) {

              $(targetElements[j]).addClass("animation__h2--photo7--passive");

            }else{
              // 例外パターンなので、クラスをつけない。
            }

          }

        }else{
          // 現在のHTML上に要素が存在しない。
        }

      }

  }

  this.__cocnstructor = function()
  {

      self.prepare();

  }()

}

var animationPhoto7 = null;

var BezierCurveController = function(pt1, pt2, pt3, pt4, step = 60, targetEl = null) {

  var self = this;

  this.waveLineWidth = 1258;
  this.waveLineHeight = 2375;

  this.waveLineWidthSP = 384;
  this.waveLineHeightSP = 997;

  this.pt1 = pt1;
  this.pt2 = pt2;
  this.pt3 = pt3;
  this.pt4 = pt4;
  this.step = step;
  this.targetEl = targetEl;

  this.outer = null;
  this.section = null;
  this.svg = null;
  this.path = null;
  this.pathLength = 0;
  this.rotateWithPath = true;
  this.lastProgress = null;
  this.lastDirection = 1;
  this.reverseHeadingOnBackScroll = true;
  this.baseAngle = 0;

  this.mainColors = {
    "cc0000":"#dd3737",
    "ff9900":"#d76521",
    "ffcc00":"#ebd34a",
    "99cc00":"#99b645",
    "006600":"#005f35",
    "3399ff":"#4cc6c7",
    "0066ff":"#3c7bd7",
    "6633cc":"#2d1f37",
    "ff6699":"#f6cfe4",
    "333333":"#474747",
    "000000":"#121212",
    "ffffff":"#aaaaaa"
  };

  this.__clamp = function(value, min, max) {
    return Math.max(min, Math.min(max, value));
  };

  this.__createSvgEl = function(tagName) {
    return document.createElementNS('http://www.w3.org/2000/svg', tagName);
  };

  this.__getPathD = function() {

    if ( $(window).width() > 480 ) {
      var curveCount = $("#main_contents_wrapper").height() / self.waveLineHeight;
    }else{
      var curveCount = $("#main_contents_wrapper").height() / self.waveLineHeightSP;
    }


    var d = `M ${self.pt1.x} ${self.pt1.y}`;

    for (var i = 0; i <= curveCount; i++) {

      if ( $(window).width() > 480 ) {
        var offset = self.waveLineHeight * i;
      }else{
        var offset = self.waveLineHeightSP * i;
      }

      d += ` C ${self.pt2.x} ${self.pt2.y + offset}
               ${self.pt3.x} ${self.pt3.y + offset}
               ${self.pt4.x} ${self.pt4.y + offset}`;
    }

    return d;

  };

  this.setPoints = function(pt1, pt2, pt3, pt4) {

    self.pt1 = pt1;
    self.pt2 = pt2;
    self.pt3 = pt3;
    self.pt4 = pt4;

    self.redraw();

  };

  this.setSection = function(section) {

    self.section = section;

  };

  this.getViewportProgress = function() {

    if (!self.svg) return 0;

    var rect = self.svg.getBoundingClientRect();
    var vh = window.innerHeight || document.documentElement.clientHeight;

    if ( edit_param === "1" ) {
      var center = vh / 2 + 50;
    }else{
      var center = vh / 2;
    }

    var progress = (center - rect.top) / rect.height;

    return self.__clamp(progress, 0, 1);

  };

  this.drawLine = function(outer) {

    self.outer = outer;

    if (self.svg && self.svg.parentNode) {
      self.svg.parentNode.removeChild(self.svg);
    }

    var lineColor = self.mainColors[main_color];

     if ( $(window).width() > 480 ) {
      var curveCount = $("#main_contents_wrapper").height() / self.waveLineHeight;
      var maxY = self.pt4.y + self.waveLineHeight * Math.floor(curveCount);
    }else{
      var curveCount = $("#main_contents_wrapper").height() / self.waveLineHeightSP;
      var maxY = self.pt4.y + self.waveLineHeightSP * Math.floor(curveCount);
    }

    $("#plane").attr("src",`img/cmscss/simple11/car/${main_color}.png`);

    var svg = self.__createSvgEl('svg');
    svg.setAttribute('class', 'curve-svg');
    svg.setAttribute('viewBox', '0 0 ' + outer.clientWidth + ' ' + maxY);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    var path = self.__createSvgEl('path');
    path.setAttribute('d', self.__getPathD());
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', lineColor);
    path.setAttribute('stroke-width', '4');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    path.setAttribute('stroke-dasharray', '0 15');
    path.setAttribute('opacity', '0.95');
    path.setAttribute('shape-rendering', 'geometricPrecision');

    svg.appendChild(path);
    outer.appendChild(svg);

    self.svg = svg;
    self.path = path;
    self.pathLength = path.getTotalLength();

  };

  this.redraw = function() {

    if (!self.outer) {
      return;
    }

    self.drawLine(self.outer);

  };

  this.getPointByProgress = function(progress) {

    if (!self.path) {
      return null;
    }

    progress = self.__clamp(progress, 0, 1);

    var speed = 1;

    var currentLength = self.pathLength * progress * speed;

    var point = self.path.getPointAtLength(currentLength);

    var svgRect = self.svg.getBoundingClientRect();
    var stageRect = self.outer.getBoundingClientRect();

    var vb = self.svg.viewBox.baseVal;

    var scale = Math.min(
      svgRect.width / vb.width,
      svgRect.height / vb.height
    );

    var offsetX = (svgRect.width - vb.width * scale) / 2;
    var offsetY = (svgRect.height - vb.height * scale) / 2;

    var x = point.x * scale + (svgRect.left - stageRect.left) + offsetX;
    var y = point.y * scale + (svgRect.top - stageRect.top) + offsetY;

    var prevPoint = self.path.getPointAtLength(Math.max(0, currentLength - 1));
    var nextPoint = self.path.getPointAtLength(Math.min(self.pathLength, currentLength + 1));

    var angle = Math.atan2(
      nextPoint.y - prevPoint.y,
      nextPoint.x - prevPoint.x
    ) * 180 / Math.PI;

    return {
      x: x,
      y: y,
      angle: angle
    };

  };

  this.scroll = function() {

    if (!self.path || !self.targetEl) {
      return null;
    }

    var progress = self.getViewportProgress();

    if (self.lastProgress !== null) {
      var delta = progress - self.lastProgress;
      if (Math.abs(delta) > 0.0005) {
        self.lastDirection = delta > 0 ? 1 : -1;
      }
    }
    self.lastProgress = progress;

    var point = self.getPointByProgress(progress);
    if (!point) {
      return null;
    }

    var angle = point.angle + self.baseAngle;
    if (self.reverseHeadingOnBackScroll && self.lastDirection < 0) {
      angle += 180;
    }

    var transform = 'translate(' + point.x + 'px, ' + point.y + 'px) translate(-50%, -50%)';
    if (self.rotateWithPath) {
      transform += ' rotate(' + angle + 'deg)';
    }
    self.targetEl.style.transform = transform;

    if ( progress >= 0.9 ) {
      var fadeInProgress = ( progress - 0.9 ) / 0.05;
      self.targetEl.style.opacity = 1 - fadeInProgress;
    }else{
      self.targetEl.style.opacity = 1;
    }

    return {
      progress: progress,
      x: point.x,
      y: point.y,
      angle: angle,
      direction: self.lastDirection
    };

  };

};

var IllustDesignAnimationController = function()
{

    var self = this;

    this.isPc = false;
    this.isTopPage = false;

    this.progress = 0;

    this.skyAnimationInterval = null;
    this.shipSwayInterval = null;
    this.carSwayInterval = null;

    this.skyPosition = 0;

    // left -237...2vwのアニメーションを、300sで行う。setIntervalで16msごとに動かす。
    this.skyMovingSpeed = 237.2983870967742 / ( 300000 / 16 );

    this.shipPosition = 0;

    // 8pxぶんの移動アニメーションを2.5sで行う。setIntervalで16msごとに動かす。
    this.shipSwaySpeed = 8 / ( 2500 / 16 );

    this.isShipReverse = false;

    this.objSky = null;
    this.objOcean = null;
    this.objShip = null;
    this.objGarage = null;

    this.scrollTarget = 0;
    this.scrollCurrent = 0;
    this.scrollEase = 0.08;
    this.scrollTimer = null;

    this.animateScroll = function()
    {

      // scroll の度にself.scrollTargetに値が入る
        self.scrollCurrent += (self.scrollTarget - self.scrollCurrent) * self.scrollEase;

        self.main(self.scrollCurrent);

        if (Math.abs(self.scrollTarget - self.scrollCurrent) > 0.1) {

            self.scrollTimer = setTimeout(function(){
                self.animateScroll();
            },16);

        } else {

            self.scrollCurrent = self.scrollTarget;
            self.scrollTimer = null;

        }

    }

    this.main = function(scroll)
    {

        if ( self.isPc ) {

            self.skyVertical(scroll);
            self.garageVertical(scroll);
            self.garageHorizontal(scroll);
            if ( self.isTopPage ) {
                self.shipVoyage(scroll);
                self.oceanVertical(scroll);
                self.oceanHorizontal(scroll);
            }else{
                self.carVoyage(scroll);
                self.cityVertical(scroll);
                self.cityHorizontal(scroll);
            }

        }else{

            self.skyVerticalSp(scroll);
            self.garageVerticalSp(scroll);
            self.garageHorizontalSp(scroll);

            if ( self.isTopPage ) {
                self.shipVoyageSp(scroll);
                self.oceanVerticalSp(scroll);
                self.oceanHorizontalSp(scroll);
            }else{
                self.carVoyageSp(scroll);
                self.cityVerticalSp(scroll);
                self.cityHorizontalSp(scroll);
            }

        }

    }

    this.skyVertical = function(scroll)
    {

        var maxRange = 800,
            progress = self.calcProgress(scroll,maxRange);

        var top = self.lerp(0,-10,progress);

        if ( self.isTopPage ) {
          top = self.lerp(-25,-33,progress);
        }

        self.objSky.css({
            top : top + "vh"
        });

    }

    this.skyVerticalSp = function(scroll)
    {

        var maxRange = 800,
            progress = self.calcProgress(scroll,maxRange);

        var top = self.lerp(-25,-35,progress);

        self.objSky.css({
            top : top + "vh"
        });

    }

    this.skyHorizontal = function(scroll)
    {

        if ( self.skyAnimationInterval ) {
          return;
        }

        self.skyAnimationInterval = setInterval(function(){

            self.skyPosition += self.skyMovingSpeed*-1;

            self.objSky.css({
                backgroundPosition : "left " + self.skyPosition + "vh top"
            });

        }, 16);

    }

    this.oceanVertical = function(scroll)
    {

        var maxRange = 800,
            progress = self.calcProgress(scroll,maxRange);

        var top = self.lerp(80,75,progress);

        self.objOcean.css({
            top : top + "vh"
        });

    }

    this.oceanVerticalSp = function(scroll)
    {

        var maxRange = 800,
            progress = self.calcProgress(scroll,maxRange);

        var top = self.lerp(80,75,progress);

        self.objOcean.css({
            top : top + "vh"
        });

    }

    this.cityVertical = function(scroll)
    {

        var maxRange = 800,
            progress = self.calcProgress(scroll,maxRange);

        var top = self.lerp(70,65,progress);

        self.objCity.css({
            top : top + "vh"
        });

    }

    this.cityVerticalSp = function(scroll)
    {

        var maxRange = 800,
            progress = self.calcProgress(scroll,maxRange);

        var top = self.lerp(70,65,progress);

        self.objCity.css({
            top : top + "vh"
        });

    }

    this.oceanHorizontal = function(scroll)
    {

        var maxRange = $("#wrapper").height(),
            progress = self.calcProgress(scroll,maxRange);

        var left = self.lerp(0,-35,progress);

        self.objOcean.css({
            left : left + "vw"
        });

    }

    this.oceanHorizontalSp = function(scroll)
    {

        var maxRange = $("#wrapper").height(),
            progress = self.calcProgress(scroll,maxRange);

        var left = self.lerp(0,-35,progress);

        self.objOcean.css({
            left : left + "vw"
        });

    }

    this.cityHorizontal = function(scroll)
    {

        var maxRange = $("#wrapper").height(),
            progress = self.calcProgress(scroll,maxRange);

        var left = self.lerp(0,-35,progress);

        self.objCity.css({
            left : left + "vw"
        });

    }

    this.cityHorizontalSp = function(scroll)
    {

        var maxRange = $("#wrapper").height(),
            progress = self.calcProgress(scroll,maxRange);

        var left = self.lerp(0,-35,progress);

        self.objCity.css({
            left : left + "vw"
        });

    }

    this.shipVoyage = function(scroll)
    {

        var maxRangeHorizon = $("#wrapper").height(),
            progressHorizon = self.calcProgress(scroll,maxRangeHorizon);
        var right = self.lerp(0,-5,progressHorizon);

        var maxRangeVertical = 800,
            progressVertical = self.calcProgress(scroll,maxRangeVertical);
        var top = self.lerp(80,75,progressVertical);

        self.objShip.css({
            right: right + 'vw',
            top: top + 'vh'
        });

    }

    this.shipVoyageSp = function(scroll)
    {

      if ( self.overVerticalThreshold(scroll) ) {

        var maxRangeHorizon = $("#wrapper").height(),
            progressHorizon = self.calcProgress(scroll,maxRangeHorizon);
        var right = self.lerp(0,-5,progressHorizon);

        self.objShip.css({
            right: right + 'vw'
        });

      }

    }

    this.shipSway = function()
    {

        if ( self.shipSwayInterval ) {
          return;
        }

        self.shipSwayInterval = setInterval(function(){

            if ( self.isShipReverse ) {
                self.shipPosition += self.shipSwaySpeed*-1;
            }else{
                self.shipPosition += self.shipSwaySpeed;
            }

            self.objShip.css({
                transform : "translateX(" + self.shipPosition + "px)"
            });

            if ( self.shipPosition >= 8 ) {
                self.isShipReverse = true;
            }else{
                if ( self.shipPosition <= 0 ) {
                    self.isShipReverse = false;
                }
            }

        }, 16);

    }

    this.carVoyage = function(scroll)
    {

        var maxRangeHorizon = $("#wrapper").height(),
            progressHorizon = self.calcProgress(scroll,maxRangeHorizon);
        var right = self.lerp(40,65,progressHorizon);

        var maxRangeVertical = 800,
            progressVertical = self.calcProgress(scroll,maxRangeVertical);
        var top = self.lerp(95,90,progressVertical);

        self.objCar.css({
            right: right + 'vw'
        });

    }

    this.carVoyageSp = function(scroll)
    {

      if ( self.overVerticalThreshold(scroll) ) {

        var maxRangeHorizon = $("#wrapper").height(),
            progressHorizon = self.calcProgress(scroll,maxRangeHorizon);
        var right = self.lerp(40,65,progressHorizon);

        var maxRangeVertical = 800,
            progressVertical = self.calcProgress(scroll,maxRangeVertical);
        var top = self.lerp(90,85,progressVertical);

        self.objCar.css({
            right: right + 'vw',
            top: top + 'vh'
        });

      }

    }

    this.carSway = function()
    {

        if ( self.carSwayInterval ) {
          return;
        }

        self.carSwayInterval = setInterval(function(){

            if ( self.isShipReverse ) {
                self.shipPosition += self.shipSwaySpeed*-1;
            }else{
                self.shipPosition += self.shipSwaySpeed;
            }

            self.objCar.css({
                transform : "translateX(" + self.shipPosition + "px)"
            });

            if ( self.shipPosition >= 8 ) {
                self.isShipReverse = true;
            }else{
                if ( self.shipPosition <= 0 ) {
                    self.isShipReverse = false;
                }
            }

        }, 16);

    }

    this.garageVertical = function(scroll)
    {

        var maxRange = 800,
            progress = self.calcProgress(scroll,maxRange);

        var top = self.lerp(27.5,20,progress);

        self.objGarage.css({
            top : top + "vh"
        });

    }

    this.garageVerticalSp = function(scroll)
    {

        var maxRange = 800,
            progress = self.calcProgress(scroll,maxRange);

        var top = self.lerp(62.5,55,progress);

        self.objGarage.css({
            top : top + "vh"
        });

    }

    this.garageHorizontal = function(scroll)
    {

        var maxRange = $("#wrapper").height(),
            progress = self.calcProgress(scroll,maxRange);

        var right = self.lerp(-15,5,progress);

        self.objGarage.css({
            right : right + "vw"
        });

    }

    this.garageHorizontalSp = function(scroll)
    {

      if ( self.overVerticalThreshold(scroll) ) {

        var maxRange = $("#wrapper").height(),
            progress = self.calcProgress(scroll,maxRange);

        var right = self.lerp(-15,5,progress);

        self.objGarage.css({
            right : right + "vw"
        });

      }

    }

    this.overVerticalThreshold = function( scroll )
    {
        return scroll >= 800;
    }

    this.calcProgress = function( scroll, animationRange )
    {

        var progress = scroll / animationRange;
        return Math.max(0, Math.min(1, progress));

    }

    this.lerp = function( a, b, t )
    {
        return a + ( b - a ) * t;
    }

    this.calcDistance = function( range, scroll, start, end )
    {

        var progress = self.calcProgress(scroll,range);

        return self.lerp(start,end,progress);

    }

    this.styling = function( object, propaty, value )
    {

        object.css({
            propaty : value
        });

    }

    this.isPc = function()
    {
        return $(window).width() > 480;
    }

    this.isTopPage = function()
    {
        return PAGE_ID === "101";
    }

    this.bind = function()
    {

        $(window).on("scroll.designEvent",function(){
            self.scrollTarget = $(window).scrollTop();

            // if (!self.scrollTimer) {
            //     self.animateScroll();
            // }
        });

    }

    this.animationLoop = function()
    {

        // スクロール慣性
        self.scrollCurrent += (self.scrollTarget - self.scrollCurrent) * self.scrollEase;

        // メイン描画
        self.main(self.scrollCurrent);

    }

    this.firedIntervalAnimation = function()
    {

        // スクロールイベント関係ないので、ここで発火させてしまう
        if ( self.isTopPage ) {
          self.shipSway();
        }else{
          self.carSway();
        }

        self.skyHorizontal();

        if ( self.animationTimer ) {
          return;
        }

        self.animationTimer = setInterval(function(){
            self.animationLoop();
        },16);

    }

    this.init = function()
    {

      clearInterval(self.animationTimer);
      self.animationTimer = null;
      clearInterval(self.skyAnimationInterval);
      self.skyAnimationInterval = null;
      clearInterval(self.shipSwayInterval);
      self.shipSwayInterval = null;
      clearInterval(self.carSwayInterval);
      self.carSwayInterval = null;

    }


    this.__construct = function()
    {

        self.objSky = $(".animation-obj--sky");
        self.objOcean = $(".animation-obj--ocean");
        self.objShip = $(".animation-obj--ship");
        self.objGarage = $(".animation-obj--garage");
        self.objCity = $(".animation-obj--city");
        self.objCar = $(".animation-obj--car");

        self.isPc = self.isPc();
        self.isTopPage = self.isTopPage();

        self.bind();

        self.init();

        self.firedIntervalAnimation();

    }();

}

var illustDesignAnimation = null;

$(function(){

  if ( isSettingBeforeUnload === "1" ) {

    $("#mitumori_table_box form, #otoiawase_table_box form, #edit_page_index form").on("submit",function(){
      $(window).off("beforeunload.formNoneSubmitNotice");
      $("a[target='_blank']").off("click.formNoneSubmitNotice");

    });

    $("#mitumori_table_box input, #mitumori_table_box textarea, #mitumori_table_box select, #otoiawase_table_box input, #otoiawase_table_box textarea, #otoiawase_table_box select ").on("focus",function(){

      $(window).on("beforeunload.formNoneSubmitNotice",function(event){
          event.preventDefault();
          event.returnValue = "本当にページを終了しますか？";
      });

      $("a[target='_blank']").off("click.formNoneSubmitNotice");
      $("a[target='_blank']").on("click.formNoneSubmitNotice",function(event){
          console.log(event.target);
          if ( !confirm('このページから離れますか？\n行った変更が保存されない可能性があります。') ) {
              event.preventDefault();
          }
      });

    });

  }

});


// $(function(){

// // デザイン専用JS
//   if( design_number === "sky5" ){

var Sky5ExController = function()
{


  var self = this;

  this.status = {
    initStepHtml : false,
    fadedInContent : false
  };

  // ステップ必要？
  this.requiringStep = false;


  this.steps = {
    max : 0,
    min : 0,
    current : 0,
    orders : {
      0 : null,
      1 : null,
      2 : null
    }
  }




  /**
   * スライドの順番 => スライドindexの変換
   * @param  {[type]} order [description]
   * @return {[type]}       [description]
   */
  this.order2Index = function( order )
  {

    var object = $(".sliderDiv").eq( order - 1 );
    return object.attr("data-main-image-index");

  }




  /**
   * 背景ソースの取得。PC/SP専用のデータセットから取得
   * @param  {[type]} order [description]
   * @return {[type]}       [description]
   */
  this.getSource = function( order )
  {

/*
    var tmp = JSON.parse( mainImageSwitchDeviceDataSet ),
        index = self.order2Index( order ),
        device = "pc",
        source = null;
    if( $(window).width() <= 480 ){
      device = "sp";
      source = tmp[ index ][ device ];
    }
    if( source === null ){
      source = tmp[ index ][ "pc" ];
    }
*/

    // window.load 後なので、難しい事考えない
    var source = $(".sliderDiv[data-disp-flag = '1']").eq( order ).css("backgroundImage");

    return source;

  }




  /**
   * ステップの属性値の変更
   * @return {[type]} [description]
   */
  this.refreshStepHtmlAttribute = function()
  {

    if( self.steps.orders[0] !== null && 
        self.steps.orders[1] !== null && 
        self.steps.orders[2] !== null ){

      for( var key in self.steps.orders ){

        var order = self.steps.orders[key],
            source = self.getSource( order );

        var stepItem = $(".js-sky5MainImageStepItem").eq(key);

        stepItem.css("backgroundImage", source);

        stepItem.attr("data-order", order);

      }

      self.status.initStepHtml = true;

    }

  }




  /**
   * ステップHTMLの作成
   * @return {[type]} [description]
   */
  this.buildStepHtml = function()
  {

    var parent = $("#bgSlider");
    parent.find(".js-sky5MainImageStepOuter").remove();

    var object = null;

    if( self.steps.orders[0] !== null && 
        self.steps.orders[1] !== null && 
        self.steps.orders[2] !== null ){

      object = $(`<div class = "js-sky5MainImageStepOuter sky5__main-image-step-outer"></div>`);

      for( var key in self.steps.orders ){

        var tmp = $(`<div class = "js-sky5MainImageStepItem sky5__main-image-step-item"></div>`);

        object.append( tmp );

      }

    }

    parent.prepend( object.prop("outerHTML") );

  }



  this.calcStepOrder0 = function( current, max )
  {

    // １始まりに換算 - ２つ前
    var tmp = ( current ) - 2;

    // ex) -1 ? 8 + (-1) => 7, : any
    return tmp < 0 ? max + tmp : tmp;

  }


  this.calcStepOrder1 = function( current, max )
  {

    // １始まりに換算 - １つ前
    var tmp = ( current ) - 1;

    // ex) -1 ? 8 + (-1) => 7 : any
    return tmp < 0 ? max + tmp : tmp;

  }


  this.calcStepOrder2 = function( current, max )
  {

    // １始まりに換算 + 1つ後
    var tmp = current + 1;

    // ex) 9 ? 0 : any
    return tmp >= max ? 0 : tmp;

  }




  /**
   * ステップが利用するスライドの順番を取得
   * @return {[type]} [description]
   */
  this.calcStepOrder = function()
  {

    var sliderDiv = $(".sliderDiv");

    self.steps.max = 0;

    self.steps.orders = { 0: null, 1: null, 2: null };

    sliderDiv.each(function(){
      if( $(this).attr("data-disp-flag") === "1" ){
        self.steps.max++;
      }
    });

    // 4枚以上 => カンプ通り ( 7, 8, x, 2 )
    if( self.steps.max >= 4 ){

      self.steps.orders[0] = self.calcStepOrder0( self.steps.current, self.steps.max );
      self.steps.orders[1] = self.calcStepOrder1( self.steps.current, self.steps.max );
      self.steps.orders[2] = self.calcStepOrder2( self.steps.current, self.steps.max );

      self.requiringStep = true;

    // 3枚 => カンプ通り（ 2, 3, x, 2 ）
    } else if( self.steps.max === 3 ){

      self.steps.orders[0] = self.calcStepOrder0( self.steps.current, self.steps.max );
      self.steps.orders[1] = self.calcStepOrder1( self.steps.current, self.steps.max );
      self.steps.orders[2] = self.calcStepOrder2( self.steps.current, self.steps.max );

      self.requiringStep = true;


    // 2枚 => 既定路線・繰り返し（ 1, 2, x, 2）
    } else if( self.steps.max === 2 ){

      self.steps.orders[0] = self.calcStepOrder0( self.steps.current, self.steps.max );
      self.steps.orders[1] = self.calcStepOrder1( self.steps.current, self.steps.max );
      self.steps.orders[2] = self.calcStepOrder2( self.steps.current, self.steps.max );

      self.requiringStep = true;


    // 1枚 => 例外（ 1 ）
    } else if( self.steps.max === 1 ){

    // 0枚 => 発生しない
    } else if( self.steps.max === 0 ){

    }

  }




  this.auto = function( currentOrder )
  {

    self.steps.current = currentOrder;

    $(".js-sky5MainImageStepItem").addClass("sky5__main-image-step-item--refreshing");

    setTimeout(function(){

        self.calcStepOrder();

        self.refreshStepHtmlAttribute();

    }, 150);

    setTimeout(function(){
        $(".js-sky5MainImageStepItem").removeClass("sky5__main-image-step-item--refreshing");
    }, 300);

  }




  this.main = function()
  {

    var isTop = $("#bgSlider").length > 0;

    // exit();

    // スライドショーイベント
    // 他要素イベント設置

    if( isTop ){

      self.calcStepOrder();

      if( self.requiringStep ){

        self.buildStepHtml();

        self.refreshStepHtmlAttribute();

      } else {

        self.status.initStepHtml = true;

      }


      $(window).on("load.designEvent",function(){

        var timer = setInterval(function(){

          if( self.status.initStepHtml ){

            clearInterval( timer );

            // 初動の汚さを隠すために、一時delayを書けてある => s3Slider
            self.status.fadedInContent = true;

            $(".sky5__body-item").addClass("sky5__body-item--loaded");

            setTimeout(function(){

              // 他コンテンツフェードイン
              setTimeout(function(){
              $(".sky5__body-item").addClass("sky5__body-item--fade-out");   
              }, 1500);

              // 不要クラス除去
              setTimeout(function(){
                $(".sky5__body-item").removeClass("sky5__body-item sky5__body-item--ready sky5__body-item--fade-out sky5__body-item--loaded");
              }, 2000);

            }, 500);

          }

        }, 250);

      })

    } else {

      $(".sky5__body-item").addClass("sky5__body-item--fade-out"); 

      // 不要クラス除去
      setTimeout(function(){
        $(".sky5__body-item").removeClass("sky5__body-item sky5__body-item--ready sky5__body-item--fade-out sky5__body-item--loaded");
      }, 2000);

    }

  }



  this.bind = function()
  {

    $(".js-parallaxContentOuter").each(function(){

        var outerIndex = $(this).attr("data-outer-index"),
            uniqueSelector = `.js-parallaxContentOuter[data-outer-index = "${outerIndex}"]`;


        observeVisibleVertical(
            uniqueSelector,
            {
                start : "25%",
                stop : "25%"
            },
            {
                visible : function()
                {
                    $(uniqueSelector).addClass("parallaxContentOuter--action");
                },
                hidden : function()
                {
                    $(uniqueSelector).removeClass("parallaxContentOuter--action");
                }
            }

        );
    });


    $(document).on("click.designEvent", ".js-sky5MainImageStepItem", function(){

        var order = $(this).attr("data-order");

        self.steps.current = order;

        $(".js-sky5MainImageStepItem").addClass("sky5__main-image-step-item--refreshing");

        $("#sliderStepsContainer").find("span").eq( order ).click();

        setTimeout(function(){

            self.calcStepOrder();

            self.refreshStepHtmlAttribute();

        }, 150);

        setTimeout(function(){
            $(".js-sky5MainImageStepItem").removeClass("sky5__main-image-step-item--refreshing");
        }, 300);

    });

  }


  this.__construct = function()
  {

  }();

}

//     sky5ExController = new Sky5ExController();

//     sky5ExController.main();

//     sky5ExController.bind();

//   }

// }); // document ready




  var MobileFirst4ExController = function()
  {

      var self = this;

      this.images = [];

      this.presetIndexes = [];

      this.presetLength = 10;

      this.timer = null;


      this.bodymain = function()
      {

          $(window).on("scroll.designEvent",function(e){

              var scrollTop = $(window).scrollTop();

              if( scrollTop > 0 ){

                  $("body").addClass("mobile_first4__body-item--scrolled");

              } else {

                  $("body").removeClass("mobile_first4__body-item--scrolled");

              }

          });

      }




      this.presubmain = function()
      {

          var tmp = [];

          $(".js-parallaxContentOuter, .blog_item, .lead__wrap").each(function(){

              var outer = $(this),
                  h2 = $(this).find("h2"),
                  images = $(this).find(".js-imageBlockImage"),
                  fieldId = $(this).attr("data-field-id"),
                  data = {};

              data.outer = outer;

              data.fieldId = fieldId;

              data.h2 = h2.length > 0 ? h2.text() : null;

              data.source = null;

              data.isUsedCarDetail = false;

              var usedCarDetailBlockId = $(this).attr("id");
              if ( usedCarDetailBlockId === "block_outer_detail" ) {
                data.isUsedCarDetail = true;
              }

              images.each(function(){

                if( data.source === null && $(this).attr("src") !== undefined ){
                  data.source = $(this).attr("src");
                }

              });

              tmp.push( data );

          });

          tmp.forEach(function( data ){
              data.h2 = self.fixH2( data.h2 );
              if ( data.isUsedCarDetail ) {
                data.source = self.usedcarImageSource();
              }else{
                data.source = self.fixSource( data.source );
              }
          });

          self.images = tmp;

          $("body").prepend("<div class = 'mobile_first4__caption-item'></div>");

          $("body").prepend("<div class = 'mobile_first4__bg-item'></div>");

      }




      this.usedcarImageSource = function()
      {

        var conbinedCarImageSource = $("#js-slideIcon").attr("src");

        if ( conbinedCarImageSource !== null && typeof conbinedCarImageSource !== "undefined" ) {
          // 何もしない
        }else{
          // 画像の登録なしなので変わりの画像を入れる
          conbinedCarImageSource = "./img/cmscss/mobile_first4/ex_bg/_uc_sample.webp";
        }

        return conbinedCarImageSource;

      }




      this.submain = function()
      {

          $(window).scroll(function(e){

              if( self.timer !== null ){
                  clearTimeout(self.timer);
              }

              self.timer = setTimeout(self.refresh, 75);

          });

      }



      this.refresh = function()
      {

          var scroll = $(window).scrollTop(),
              windowHeight = $(window).height();

          var line = scroll + windowHeight / 2;

          var effected = false;

          for( var key in self.images ){

              var data = self.images[key];

              var outer = data.outer,
                  min = outer.offset().top,
                  max = min + outer.height();

              if( line >= min && line <= max ){

                  effected = true;

                  var text = data.h2 === null ? "" : data.h2;

                  $(".mobile_first4__caption-item").text( text );

                  if ( data.isUsedCarDetail ) {

                    var device = $(window).width() > 480 ? "pc" : "sp",
                        value = "";

                    if ( device === "pc" ) {
                      value = "auto clamp( 100vh, calc( 100vw * (3/4) ), 100vw )";
                    }else{
                      value = "auto 100vh";
                    }

                    $(".mobile_first4__bg-item").css({
                      "background-image" : `url(${data.source})`,
                      "background-position" : "left center",
                      "background-size" : value
                    });

                  }else{

                    $(".mobile_first4__bg-item").css({
                      "backgroundImage": `url( ${data.source} )`,
                      "background-position" : "",
                      "background-size" : ""
                    });

                  }

                  break;

              }

          }
      }




      this.buildPresetSource = function( index, device )
      {

          if( device === "pc" ){

              return `./img/cmscss/mobile_first4/ex_bg/ex_bg_${index}.jpg.webp`;

          } else {

              return `./img/cmscss/mobile_first4/ex_bg/ex_bg_${index}.mobile.jpg.webp`;

          }

      }




      this.random = function()
      {
          return Math.floor( Math.random() * self.presetLength ) + 1;
      }




      this.fixSource = function( source )
      {

          if( source === null ){

              var index = null;

              for( var key in self.presetIndexes ) {

                  var value = self.presetIndexes[ key ];

                  if( value !== null ){

                      index = value;

                      self.presetIndexes[ key ] = null;

                      break;

                  }

              }

              source =  self.buildPresetSource( index, $(window).width() > 480 ? "pc" : "sp" );

          }

          return source;

      }




      this.fixH2 = function( text )
      {

          if( text !== null ){
              text = text.replace(/\n|\r|\n\r/g, "");
              text = text.replace(/\s{1,}/g, " ");
          }

          return text;

      }




      this.main = function()
      {

          if( $("body").attr("id") === "body_top" ){

              self.bodymain();

          } else {

            self.presubmain();

            self.submain();

            self.refresh();

          }

      }




      this.__construct = function()
      {

          for( var i = 1; i <= self.presetLength; i++ ){
              self.presetIndexes.push( i );
          }

          for(var i = self.presetIndexes.length - 1; i > 0; i--){
              var r = Math.floor(Math.random() * (i + 1));
              var tmp = self.presetIndexes[i];
              self.presetIndexes[i] = self.presetIndexes[r];
              self.presetIndexes[r] = tmp;
          }

      }();

  }

  var mobileFirst4ExController = null;




$(document).on("input", ".js-searchMenuText, .js-searchMenuTextSp", function() {
  var self = $(this);

  if( self.val() !== "" ) return;

  if( self.hasClass("js-searchMenuText") ) {
    shouldOpenMegaMenu = true;
    resetSearchResult( self );
  } else {
    resetSearchResultSp();
  }
});

$(document).on("keydown", ".js-searchMenuText, .js-searchMenuTextSp", function(e) {
  var nativeEvent = e.originalEvent || e;
  var self = $(this);

  if (nativeEvent.key !== "Enter") return;

  //変換終了（確定）時
  if (nativeEvent.isComposing) return;

  e.preventDefault();

  if(self.hasClass("js-searchMenuText")){
    searchMenuTextPcEvent(self);
  }else{
    searchMenuTextSpEvent(self);
  }
});

$(window).on("load",function(){

  if ( $(window).width() > 480 ) {

    sidebarFixedControllerIns.main();
    sidebarFixedControllerIns.bind();

  }

});

var scrollAnimation = null;
var documentReadyEventUseDesignNumberOpenJs = function()
{


    if ( design_number == "photo2" ) {
        $('#carListThumNail_wrapper a').removeClass('thumbnail_box_lastlast');
    }


    if ( 
        design_number == "cool" ||
        design_number == "duo_tone" ||
        design_number == "moriyama" ||
        design_number == "miniature" ||
        design_number == "paper4" ||
        design_number == "pastel2" ||
        design_number == "lace" ||
        design_number == "washi" ||
        design_number == "neumorphism" ||
        design_number == "movie2" ||
        design_number == "horinouchi" ||
        design_number == "sdgs" ||
        design_number == "sankaku" ||
        design_number == "game" ||
        design_number == "comic2" ||
        design_number == "kenou" ||
        design_number == "metallic" ||
        design_number == "flat7" ||
        design_number == "colorful" ||
        design_number == "all_scroll" ||
        design_number == "sanwa" ||
        design_number == "s2_racing" ||
        design_number == "glassmorphism" ||
        design_number == "saikyou" ||
        design_number == "ryusenkei"
    ) {
        $('body').addClass('noClearImage');
    }


    (function( useHamburgerMenu, sp_param ){

        if( String(useHamburgerMenu) === "1" ){

            if( edit_param === "0" ) $("body").removeClass("edit");

            if( $(window).width() < 480 && design_number !== "mobile_first2" ) {

                var cloneMenuTrigger = $("#menu_trigger").clone(true);
                $("body").find("#menu_trigger").remove();
                $("body").append(cloneMenuTrigger);
                $("#header").find("#menu_trigger").remove();

                if( edit_param === "0" ) {
                    $("#body_top").addClass("body_reset");
                    $("#body_sub").addClass("body_reset");
                    $("#body_free").addClass("body_reset");
                    $(".slider_content_wrap").addClass("slider_content_wrap_reset");
                    $(".menu_wrapper").addClass("menu_opened_reset");
                    $("#menu_trigger").addClass("menu_trigger_reset");
                }

            }

            // メニュー開く
            var menuOpener = function( menu )
            {
                menu.addClass("open");
                $("body").addClass("js-menuOpened");
            }

            // メニュー閉じる
            var menuCloser = function( menu, megaMenu )
            {
                menu.removeClass("open");
                megaMenu.removeClass("active");
                $("body").removeClass("js-menuOpened");
            }

            // 会社電話番号を整形し、append
            var appendCompanyTel = function( menu )
            {
                var tel = $("#sidebar_tel01").text();
                var telNumberHtml = 
                '<li class="gmenu_company_tel">' +
                  '<span class="tel_str"></span>' +
                  '<span class="tel_number">' + tel + '</span>' +
                '</li>';
                menu.append( telNumberHtml );
            }

            // 会社電話番号をremove
            var removeCompanyTel = function( menu )
            {
                menu.find(".gmenu_company_tel").remove();
            }

            // メニューアイコンクリック
            $(document).on("click.designEvent", ".pc_menu_trigger, #menu_trigger, .pc_menu_overlay", function(){

                var self = $(this),
                    menu = $(".menu").find("ul").not(".js-subPageList"),
                    megaMenu = $(".mega_menu");

                if( menu.hasClass("open") ) {
                    menuCloser( menu, megaMenu );
                    removeCompanyTel( menu );
                    $("#chat_open_btn_pc, #chat_open_btn_sp").removeClass("chat_bot_hide");
                } else {
                    menuOpener( menu );
                    appendCompanyTel( menu );
                    $("#chat_open_btn_pc, #chat_open_btn_sp").addClass("chat_bot_hide");
                }

                // var menuWrapper = $(this).closest(".menu_wrapper");

                // if( menuWrapper.hasClass("use_hamburger_menu") ) {

                //     $(".mega_menu").css({"display": "none"});

                // }

            });

        }

    })( useHamburgerMenu, sp_param );


    //[アニメーションのターゲット,付加するクラス名]
    //　#と.を間違わないように
    //HTML内に出現する順番は関係ない

    var ds_target_arr = [];
    var firePosition = {
      start : "0%",
      end : "75%"
    };

    if( design_number == "animation" ){

        ds_target_arr = [
            [".campaign_content","fromRight"],
            [".midashi_long","purunForAnimationDesign"],
            ["#middle_top_price01 h2","purunForAnimationDesign"],
            [".blog_item h2","purunForAnimationDesign"],
            ["#wrapper h3.h3_lead","purunForAnimationDesign"],
            [".midashi_long","purunForAnimationDesign"],
            [".soubishiyou","fromBottom"],
            [".kihon_tale2","fromBottom"],
            [".even_block","fromLeft"],//セカンドページの奇数ブロック
            [".odd_block","fromRight"],//セカンドページの偶数ブロック
            [".slider_text","expandUp"],
            ["#h2_box_1","fromBottom"],
            ["#h2_box_2","fromBottom"],
            ["#h2_box_3","fromBottom"],
            [".pricetable_content","fromRight"],
            ["#ucConpane","purunForAnimationDesign"] //　重要　最後はカンマを付けない！！
        ];

    }else if(design_number == "animation2"){

        ds_target_arr = [
            [".campaign_content","fromBottom"],
            ["#image_letter_block ","fromBottom"],
            [".pricetable_content","fromBottom"],
            [".soubishiyou","fromBottom"],
            [".box_staff","fromBottom"],
            [".box_setsubi","fromBottom"],
            [".div_box_company_pict","fromBottom"],
            [".div_box_history","fromBottom"],
            [".div_box_gaiyo","fromBottom"],
            [".kihon_tale2","fromBottom"],
            [".even_block","fromBottom"],//セカンドページの奇数ブロック
            [".odd_block","fromBottom"],//セカンドページの偶数ブロック
            ["#h2_box_1","fromBottom"],
            ["#h2_box_2","fromBottom"],
            ["#h2_box_3","fromBottom"],
            ["#middle_top_price01 h2","toRight"],
            [".midashi_long","toRight"],
            [".blog_item h2","toRight"]
        ];

    }else if(design_number == "prevnext2"){

        ds_target_arr = [
            ["#middle_top_price01 h2","left_to_right"],
            [".midashi_long","left_to_right"],
            [".blog_item h2","left_to_right"]
        ];

    }else if(design_number == "newstandard"){

        ds_target_arr = [
            [".right_box","fadeinScale"],
            [".company_pict","fadeinBottom"],
            [".pricetable","fadeinLeft"],
            [".js-editTextOuter","fadeinScale"],
            ["#main_contents .parallaxContentOuter:nth-of-type(3n-2) .img_box_right","fadeinRight"],
            ["#main_contents .parallaxContentOuter:nth-of-type(3n-2) .img_box_right+.js-editTextOuter","fadeinRight"],
            ["#main_contents .parallaxContentOuter:nth-of-type(3n-2) .img_box_right~b","fadeinRight"],
            ["#main_contents .parallaxContentOuter:nth-of-type(3n-2) .img_box_right~p","fadeinRight"],
            ["#main_contents .parallaxContentOuter:nth-of-type(3n-2) .img_box_left","fadeinLeft"],
            ["#main_contents .parallaxContentOuter:nth-of-type(3n-2) .img_box_left+.js-editTextOuter","fadeinLeft"],
            ["#main_contents .parallaxContentOuter:nth-of-type(3n-2) .img_box_left~b","fadeinLeft"],
            ["#main_contents .parallaxContentOuter:nth-of-type(3n-2) .img_box_left~p","fadeinLeft"],
            ["#main_contents .parallaxContentOuter:nth-of-type(3n-1) .img_box_left","fadeinBottom"],
            ["#main_contents .parallaxContentOuter:nth-of-type(3n-1) .img_box_left+.js-editTextOuter","fadeinBottom"],
            ["#main_contents .parallaxContentOuter:nth-of-type(3n-1) .img_box_left~p","fadeinBottom"],
            ["#main_contents .parallaxContentOuter:nth-of-type(3n-1) .img_box_right","fadeinBottom"],
            ["#main_contents .parallaxContentOuter:nth-of-type(3n-1) .img_box_right+.js-editTextOuter","fadeinBottom"],
            ["#main_contents .parallaxContentOuter:nth-of-type(3n-1) .img_box_right~p","fadeinBottom"],
            ["#main_contents .parallaxContentOuter:nth-of-type(3n) .img_box_left","fadeinScale"],
            ["#main_contents .parallaxContentOuter:nth-of-type(3n) .img_box_left+.js-editTextOuter","fadeinScale"],
            ["#main_contents .parallaxContentOuter:nth-of-type(3n) .img_box_left~p","fadeinScale"],
            ["#main_contents .parallaxContentOuter:nth-of-type(3n) .img_box_right","fadeinScale"],
            ["#main_contents .parallaxContentOuter:nth-of-type(3n) .img_box_right+.js-editTextOuter","fadeinScale"],
            ["#main_contents .parallaxContentOuter:nth-of-type(3n) .img_box_right~p","fadeinScale"],
            [".imageBoxContents[data-layout='LAYOUT_2COLUMN']","slideinLeft"],
            [".imageBoxContents[data-layout='LAYOUT_3COLUMN']","slideinLeft"],
            [".imageBoxContents[data-layout='LAYOUT_4COLUMN']","slideinLeft"],
            [".js-imageBoxBackground","fadeinScale"],
            [".js-imageBoxBackground .js-editTextOuter","fadeinScale"],
            ["#h2_box_1","fadeinBottom"],
            ["#h2_box_2","fadeinBottom"],
            ["#h2_box_3","fadeinBottom"]
        ];

    }else if(design_number == "wide_space"){

        ds_target_arr = [
            ["#body_top .headtel","fadeinScale"],
            [".right_box","fadeinScale"],
            [".n_table","fadeinLeft"],
            [".company_pict","fadeinBottom"],
            [".pricetable_block","fadeinScale"],
            [".company_pict","fadeinBottom"],
            [".div_box_faq","fadeinBottom"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-3) .img_box_right","fadeinRight"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-3) .img_box_right+.js-editTextOuter","fadeinRight"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-3) .img_box_right~b","fadeinRight"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-3) .img_box_right~p","fadeinRight"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-3) .img_box_left","fadeinLeft"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-3) .img_box_left+.js-editTextOuter","fadeinLeft"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-3) .img_box_left~b","fadeinLeft"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-3) .img_box_left~p","fadeinLeft"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-2) .img_box_left","fadeinBottom"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-2) .img_box_left+.js-editTextOuter","fadeinBottom"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-2) .img_box_left~p","fadeinBottom"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-2) .img_box_right","fadeinBottom"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-2) .img_box_right+.js-editTextOuter","fadeinBottom"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-2) .img_box_right~p","fadeinBottom"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-1) .img_box_left","fadeinScale"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-1) .img_box_left+.js-editTextOuter","fadeinScale"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-1) .img_box_left~p","fadeinScale"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-1) .img_box_right","fadeinScale"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-1) .img_box_right+.js-editTextOuter","fadeinScale"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-1) .img_box_right~p","fadeinScale"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n) .img_box_left","crossin"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n) .img_box_right","crossinRight"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n) .img_box_left+.js-editTextOuter","fadeinLeft"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n) .img_box_right+.js-editTextOuter","fadeinRight"],
            [".imageBoxContents[data-layout='LAYOUT_2COLUMN']","slideinLeft"],
            [".imageBoxContents[data-layout='LAYOUT_3COLUMN']","slideinLeft"],
            [".imageBoxContents[data-layout='LAYOUT_4COLUMN']","slideinLeft"],
            [".js-imageBoxBackground","fadeinScale"],
            [".js-imageBoxBackground .js-editTextOuter","fadeinScale"],
            ["#h2_box_1","fadeinBottom"],
            ["#h2_box_2","fadeinBottom"],
            ["#h2_box_3","fadeinBottom"]
        ];

    }else if(design_number == "mobile_first"){

        if ($(window).width() < 480) {

            ds_target_arr = [
                ["#main_contents h2.midashi_long","midashiSlideInRight"],
                [".div_box_campaign","translateRight"],
                [".div_box_feature","translateRight"],
                [".div_box_coupon","translateRight"],
                [".div_box_promise","translateRight"],
                [".div_box_tokuten","translateRight"],
                [".div_box_flow","translateRight"],
                [".div_box_voice","translateRight"],
                [".div_box_jirei","translateRight"],
                [".div_box_setsubi","translateRight"],
                [".div_box_staff","translateRight"],
                [".div_box_campaign","translateRight"],
                [".div_box_free","translateRight"],
                [".div_box_faq0","translateRight"],
                [".access_info","translateRight"],
                [".map_big","translateRight"],
                [".div_box_requirements01","translateRight"],
                [".div_box_requirements02","translateRight"],
                [".div_box_requirements03","translateRight"],
                [".div_box_requirements04","translateRight"],
                [".div_box_requirements05","translateRight"],
                [".recruit_section","translateRight"],
                [".div_box_company_pict","translateRight"],
                [".div_box_reco_car","translateRight"],
                [".h2_box_1","translateRight"],
                [".h2_box_2","translateRight"],
                [".h2_box_3","translateRight"]
            ];

        }

    }else if(design_number == "sanwa"){

        ds_target_arr = [
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-3) .block_outer h2.midashi_long","carinLeft"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-2) .block_outer h2.midashi_long","carinRight"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-1) .block_outer h2.midashi_long","carinLeft_b"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n) .block_outer h2.midashi_long","carinRight_b"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-3) .block_outer #middle_top_price01 h2","carinLeft"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-2) .block_outer #middle_top_price01 h2","carinRight"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-1) .block_outer #middle_top_price01 h2","carinLeft_b"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n) .block_outer #middle_top_price01 h2","carinRight_b"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-3) .block_outer.blog_item h2","carinLeft"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-2) .block_outer.blog_item h2","carinRight"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-1) .block_outer.blog_item h2","carinLeft_b"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n) .block_outer.blog_item h2","carinRight_b"]
        ];

    }else if(design_number == "miniature"){

        ds_target_arr = [
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-3) .block_outer h2.midashi_long","carinLeft"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-2) .block_outer h2.midashi_long","carinRight"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-1) .block_outer h2.midashi_long","carinLeft_b"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n) .block_outer h2.midashi_long","carinRight_b"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-3) .block_outer #middle_top_price01 h2","carinLeft"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-2) .block_outer #middle_top_price01 h2","carinRight"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-1) .block_outer #middle_top_price01 h2","carinLeft_b"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n) .block_outer #middle_top_price01 h2","carinRight_b"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-3) .block_outer.blog_item h2","carinLeft"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-2) .block_outer.blog_item h2","carinRight"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-1) .block_outer.blog_item h2","carinLeft_b"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n) .block_outer.blog_item h2","carinRight_b"]
        ];

    }else if(design_number == "paper4"){

        ds_target_arr = [
            ['.img_box_left img.imageBlock',"rotateIn"],
            ['.img_box_right img.imageBlock',"rotateIn"],
            ['.imageBoxContents[data-layout="LAYOUT_2COLUMN"] .js-imageBlockImage',"rotateIn"],
            ['.imageBoxContents[data-layout="LAYOUT_3COLUMN"] .js-imageBlockImage',"rotateIn"],
            ['.imageBoxContents[data-layout="LAYOUT_4COLUMN"] .js-imageBlockImage',"rotateIn"],
            ['.imageBoxSlider',"rotateIn"]
        ];

    }else if(design_number == "movie2"){

        ds_target_arr = [
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-3) h2.midashi_long","teloptoRight"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-2) h2.midashi_long","teloptoLeft"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-1) h2.midashi_long","teloptoRight"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n) h2.midashi_long","teloptoLeft"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-3) #middle_top_price01 h2","teloptoRight"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-2) #middle_top_price01 h2","teloptoLeft"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-1) #middle_top_price01 h2","teloptoRight"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n) #middle_top_price01 h2","teloptoLeft"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-3).blog_item h2","teloptoRight"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-2).blog_item h2","teloptoLeft"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-1).blog_item h2","teloptoRight"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n).blog_item h2","teloptoLeft"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-3) h2.midashi_long > span","telopTexttoRight"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-2) h2.midashi_long > span","telopTexttoLeft"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-1) h2.midashi_long > span","telopTexttoRight"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n) h2.midashi_long > span","telopTexttoLeft"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-3) #middle_top_price01 h2 > span","telopTexttoRight"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-2) #middle_top_price01 h2 > span","telopTexttoLeft"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-1) #middle_top_price01 h2 > span","telopTexttoRight"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n) #middle_top_price01 h2 > span","telopTexttoLeft"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-3).blog_item h2 > span","telopTexttoRight"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-2).blog_item h2 > span","telopTexttoLeft"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n-1).blog_item h2 > span","telopTexttoRight"],
            ["#main_contents .parallaxContentOuter:nth-of-type(4n).blog_item h2 > span","telopTexttoLeft"],
            [".usedcar_info_body #middle_top_cardetail","teloptoRight"],
            [".usedcar_info_body #recommend_h2","teloptoLeft"],
            [".usedcar_info_body #recommend_h2 span","telopTexttoLeft"],
            [".usedcar_info_body #recommend_h2 em","telopTexttoLeft"],
            [".usedcar_info_body #middle_top_cardetail a","telopTexttoRight"],
            [".usedcar_info_body #middle_top_cardetail em","telopTexttoRight"],
            [".usedcar_info_body #middle_top_cardetail b","telopTexttoRight"],
            [".usedcar_info_body #middle_top_cardetail span","telopTexttoRight"],
            [".usedcar_info_body #main_contents .parallaxContentOuter:nth-of-type(2n-1) .cart_h2:not(.paymentWayTitle)","teloptoRight"],
            [".usedcar_info_body #main_contents .parallaxContentOuter:nth-of-type(2n) .cart_h2:not(.favoriteListTitle)","teloptoLeft"],
            [".usedcar_info_body #main_contents .parallaxContentOuter:nth-of-type(2n-1) .cart_h2 > span","telopTexttoRight"],
            [".usedcar_info_body #main_contents .parallaxContentOuter:nth-of-type(2n) .cart_h2 > span","telopTexttoLeft"],
            [".usedcar_info_body #main_contents .parallaxContentOuter:nth-of-type(2n-1) .cart_h2:not(.paymentWayTitle) > em","telopTexttoRight"],
            [".usedcar_info_body #main_contents .parallaxContentOuter:nth-of-type(2n) .cart_h2:not(.favoriteListTitle) > em","telopTexttoLeft"],
            [".usedcar_info_body #recommend_title","telopTexttoLeft"]
        ];

    }else if(design_number == "horinouchi"){

        ds_target_arr = [
            ["#main_contents .block_outer:nth-of-type(4n-3) h2.midashi_long","teloptoRight"],
            ["#main_contents .block_outer:nth-of-type(4n-2) h2.midashi_long","teloptoLeft"],
            ["#main_contents .block_outer:nth-of-type(4n-1) h2.midashi_long","teloptoRight"],
            ["#main_contents .block_outer:nth-of-type(4n) h2.midashi_long","teloptoLeft"],
            ["#main_contents .block_outer:nth-of-type(4n-3) #middle_top_price01 h2","teloptoRight"],
            ["#main_contents .block_outer:nth-of-type(4n-2) #middle_top_price01 h2","teloptoLeft"],
            ["#main_contents .block_outer:nth-of-type(4n-1) #middle_top_price01 h2","teloptoRight"],
            ["#main_contents .block_outer:nth-of-type(4n) #middle_top_price01 h2","teloptoLeft"],
            ["#main_contents .block_outer:nth-of-type(4n-3).blog_item h2","teloptoRight"],
            ["#main_contents .block_outer:nth-of-type(4n-2).blog_item h2","teloptoLeft"],
            ["#main_contents .block_outer:nth-of-type(4n-1).blog_item h2","teloptoRight"],
            ["#main_contents .block_outer:nth-of-type(4n).blog_item h2","teloptoLeft"],
            ["#main_contents .block_outer:nth-of-type(4n-3) h2.midashi_long > span","telopTexttoRight"],
            ["#main_contents .block_outer:nth-of-type(4n-2) h2.midashi_long > span","telopTexttoLeft"],
            ["#main_contents .block_outer:nth-of-type(4n-1) h2.midashi_long > span","telopTexttoRight"],
            ["#main_contents .block_outer:nth-of-type(4n) h2.midashi_long > span","telopTexttoLeft"],
            ["#main_contents .block_outer:nth-of-type(4n-3) #middle_top_price01 h2 > span","telopTexttoRight"],
            ["#main_contents .block_outer:nth-of-type(4n-2) #middle_top_price01 h2 > span","telopTexttoLeft"],
            ["#main_contents .block_outer:nth-of-type(4n-1) #middle_top_price01 h2 > span","telopTexttoRight"],
            ["#main_contents .block_outer:nth-of-type(4n) #middle_top_price01 h2 > span","telopTexttoLeft"],
            ["#main_contents .block_outer:nth-of-type(4n-3).blog_item h2 > span","telopTexttoRight"],
            ["#main_contents .block_outer:nth-of-type(4n-2).blog_item h2 > span","telopTexttoLeft"],
            ["#main_contents .block_outer:nth-of-type(4n-1).blog_item h2 > span","telopTexttoRight"],
            ["#main_contents .block_outer:nth-of-type(4n).blog_item h2 > span","telopTexttoLeft"]
        ];

    }else if(design_number == "pastel2"){

        ds_target_arr = [
            ["#middle_top_price01 h2 > span","midashiIn"],
            ["h2.midashi_long > span","midashiIn"]
        ];

    } else if( design_number === "neumorphism"){

        ds_target_arr = [
            [".block_outer div[class^='box']","concave"],
            [".block_outer div[class^='box'] .imageBoxContents:not(.imageBoxContents[data-layout='LAYOUT_MULTI_SLIDESHOW']) .js-imageBlockImage","concave"],
            [".block_outer .campaign_content","concave"],
            [".block_outer .campaign_content .imageBoxContents:not(.imageBoxContents[data-layout='LAYOUT_MULTI_SLIDESHOW']) .js-imageBlockImage","concave"],
            [".block_outer .div_box_faq","concave"],
            [".block_outer .div_box_faq .imageBoxContents:not(.imageBoxContents[data-layout='LAYOUT_MULTI_SLIDESHOW']) .js-imageBlockImage","concave"],
            [".block_outer_page_link","concave"],
            ["#h2_box_1","concave"],
            ["#h2_box_1 .img_left","convexH2box"],
            ["#h2_box_2","concave"],
            ["#h2_box_2 .img_left","convexH2box"],
            ["#h2_box_3","concave"],
            ["#h2_box_3 .img_left","convexH2box"],
            [".pricetable_content","concave"],
            [".pricetable","convex"]
        ];

    } else if( design_number === "simple7"){

        ds_target_arr = [
            ["#main_contents .parallaxContentOuter:nth-of-type(2n-1) .block_outer:not(.block_outer_pankuzu01) h2.midashi_long","slideIn"],
            ["#main_contents .parallaxContentOuter:nth-of-type(2n) .block_outer:not(.block_outer_pankuzu01) h2.midashi_long","slideInRight"],
            ["#main_contents .parallaxContentOuter:nth-of-type(2n-1) .block_outer:not(.block_outer_pankuzu01)", "fadeInRight"],
            ["#main_contents .parallaxContentOuter:nth-of-type(2n) .block_outer:not(.block_outer_pankuzu01)", "fadeIn"]
        ];

    } else if( design_number === "colorful"){

        ds_target_arr = [
            ["#h2_box_1", "rollIn"],
            ["#h2_box_2", "rollIn"],
            ["#h2_box_3", "rollIn"],
            [".block_outer .box_dksm:nth-of-type(2n-1)","rotateX"],
            [".block_outer .campaign_content:nth-of-type(2n-1)","rotateX"],
            [".block_outer .box_promise:nth-of-type(2n-1)","rotateX"],
            [".block_outer .box_setsubi:nth-of-type(2n-1)","rotateX"],
            [".block_outer .box_tokuten:nth-of-type(2n-1)","rotateX"],
            [".block_outer .box_staff:nth-of-type(2n-1)","rotateX"],
            [".block_outer .box_setsubi:nth-of-type(2n-1)","rotateX"],
            [".block_outer .box_coupon:nth-of-type(2n-1)","rotateX"],
            [".block_outer .div_box_faq:nth-of-type(2n-1)","rotateX"],
            [".block_outer .box_voice:nth-of-type(2n-1)","rotateX"],
            [".block_outer .box_feature:nth-of-type(2n-1)","rotateX"],
            [".block_outer .box_jirei:nth-of-type(2n-1)","rotateX"],
            [".block_outer .box_flow:nth-of-type(2n-1)","rotateX"],
            [".block_outer .box_free:nth-of-type(2n-1)","rotateX"],
            [".block_outer .box_dksm:nth-of-type(2n)","rotateY"],
            [".block_outer .campaign_content:nth-of-type(2n)","rotateY"],
            [".block_outer .box_promise:nth-of-type(2n)","rotateY"],
            [".block_outer .box_setsubi:nth-of-type(2n)","rotateY"],
            [".block_outer .box_tokuten:nth-of-type(2n)","rotateY"],
            [".block_outer .box_staff:nth-of-type(2n)","rotateY"],
            [".block_outer .box_setsubi:nth-of-type(2n)","rotateY"],
            [".block_outer .box_coupon:nth-of-type(2n)","rotateY"],
            [".block_outer .div_box_faq:nth-of-type(2n)","rotateY"],
            [".block_outer .box_voice:nth-of-type(2n)","rotateY"],
            [".block_outer .box_feature:nth-of-type(2n)","rotateY"],
            [".block_outer .box_jirei:nth-of-type(2n)","rotateY"],
            [".block_outer .box_flow:nth-of-type(2n)","rotateX"],
            [".block_outer .box_free:nth-of-type(2n)","rotateY"],
            [".side_bar_sub > div:not(.plusBlockBtn_side)", "rollIn"]
        ];

        if ($(window).width() < 480) {

            ds_target_arr = [
                ["#h2_box_1", "rollIn"],
                ["#h2_box_2", "rollIn"],
                ["#h2_box_3", "rollIn"],
                [".block_outer .box_dksm:nth-of-type(2n-1)","rotateX"],
                [".block_outer .campaign_content:nth-of-type(2n-1)","rotateX"],
                [".block_outer .box_promise:nth-of-type(2n-1)","rotateX"],
                [".block_outer .box_setsubi:nth-of-type(2n-1)","rotateX"],
                [".block_outer .box_tokuten:nth-of-type(2n-1)","rotateX"],
                [".block_outer .box_staff:nth-of-type(2n-1)","rotateX"],
                [".block_outer .box_setsubi:nth-of-type(2n-1)","rotateX"],
                [".block_outer .box_coupon:nth-of-type(2n-1)","rotateX"],
                [".block_outer .div_box_faq:nth-of-type(2n-1)","rotateX"],
                [".block_outer .box_voice:nth-of-type(2n-1)","rotateX"],
                [".block_outer .box_feature:nth-of-type(2n-1)","rotateX"],
                [".block_outer .box_jirei:nth-of-type(2n-1)","rotateX"],
                [".block_outer .box_flow:nth-of-type(2n-1)","rotateX"],
                [".block_outer .box_free:nth-of-type(2n-1)","rotateX"],
                [".block_outer .box_dksm:nth-of-type(2n)","rotateY"],
                [".block_outer .campaign_content:nth-of-type(2n)","rotateY"],
                [".block_outer .box_promise:nth-of-type(2n)","rotateY"],
                [".block_outer .box_setsubi:nth-of-type(2n)","rotateY"],
                [".block_outer .box_tokuten:nth-of-type(2n)","rotateY"],
                [".block_outer .box_staff:nth-of-type(2n)","rotateY"],
                [".block_outer .box_setsubi:nth-of-type(2n)","rotateY"],
                [".block_outer .box_coupon:nth-of-type(2n)","rotateY"],
                [".block_outer .div_box_faq:nth-of-type(2n)","rotateY"],
                [".block_outer .box_voice:nth-of-type(2n)","rotateY"],
                [".block_outer .box_feature:nth-of-type(2n)","rotateY"],
                [".block_outer .box_jirei:nth-of-type(2n)","rotateY"],
                [".block_outer .box_flow:nth-of-type(2n)","rotateX"],
                [".block_outer .box_free:nth-of-type(2n)","rotateY"]
            ];

        }

    } else if( design_number === "simple8"){

        if ($(window).width() < 480) {

            firePosition = {
              start : "0%",
              end : "90%"
            };

        }

        ds_target_arr = [
            [".block_outer div[class^='box']","animation-lib--blur-in"],
            [".block_outer .campaign_content","animation-lib--blur-in"],
            [".block_outer .div_box_faq","animation-lib--blur-in"],
            [".usercar_list","animation-lib--blur-in"],
            [".thumbnail_box","animation-lib--blur-in"],
            ["#image_letter_block","animation-lib--blur-in"],
            ["#midbox_wrapper div[class^='h2_box']","animation-lib--blur-in"],
            [".pricetable_content","animation-lib--blur-in"]
        ];

    } else if( design_number === "duo_tone" || design_number === "kenou" ){

        ds_target_arr = [
            ["#midbox_wrapper div[class^='h2_box']","animation-lib--fade-in-right-big"],
            ["#body_top .block_outer:nth-of-type(3n-2) div[class^='box']","animation-lib--fade-in-right-big"],
            ["#body_top .block_outer:nth-of-type(3n-2) .campaign_content","animation-lib--fade-in-right-big"],
            ["#body_top .block_outer:nth-of-type(3n-2) .div_box_faq","animation-lib--fade-in-right-big"],
            ["#body_top .block_outer:nth-of-type(3n-1) div[class^='box']","animation-lib--fade-in-left-big"],
            ["#body_top .block_outer:nth-of-type(3n-1) .campaign_content","animation-lib--fade-in-left-big"],
            ["#body_top .block_outer:nth-of-type(3n-1) .div_box_faq","animation-lib--fade-in-left-big"],
            ["#body_top .block_outer:nth-of-type(3n) div[class^='box']","animation-lib--fade-in-top"],
            ["#body_top .block_outer:nth-of-type(3n) .campaign_content","animation-lib--fade-in-top"],
            ["#body_top .block_outer:nth-of-type(3n) .div_box_faq","animation-lib--fade-in-top"],
            ["#body_sub .block_outer:nth-of-type(3n-2) div[class^='box']","animation-lib--fade-in-left-big"],
            ["#body_sub .block_outer:nth-of-type(3n-2) .campaign_content","animation-lib--fade-in-left-big"],
            ["#body_sub .block_outer:nth-of-type(3n-2) .div_box_faq","animation-lib--fade-in-left-big"],
            ["#body_sub .block_outer:nth-of-type(3n-1) div[class^='box']","animation-lib--fade-in-top"],
            ["#body_sub .block_outer:nth-of-type(3n-1) .campaign_content","animation-lib--fade-in-top"],
            ["#body_sub .block_outer:nth-of-type(3n-1) .div_box_faq","animation-lib--fade-in-top"],
            ["#body_sub .block_outer:nth-of-type(3n) div[class^='box']","animation-lib--fade-in-right-big"],
            ["#body_sub .block_outer:nth-of-type(3n) .campaign_content","animation-lib--fade-in-right-big"],
            ["#body_sub .block_outer:nth-of-type(3n) .div_box_faq","animation-lib--fade-in-right-big"],
            ["#body_free .block_outer:nth-of-type(3n-2) div[class^='box']","animation-lib--fade-in-left-big"],
            ["#body_free .block_outer:nth-of-type(3n-2) .campaign_content","animation-lib--fade-in-left-big"],
            ["#body_free .block_outer:nth-of-type(3n-2) .div_box_faq","animation-lib--fade-in-left-big"],
            ["#body_free .block_outer:nth-of-type(3n-1) div[class^='box']","animation-lib--fade-in-top"],
            ["#body_free .block_outer:nth-of-type(3n-1) .campaign_content","animation-lib--fade-in-top"],
            ["#body_free .block_outer:nth-of-type(3n-1) .div_box_faq","animation-lib--fade-in-top"],
            ["#body_free .block_outer:nth-of-type(3n) div[class^='box']","animation-lib--fade-in-right-big"],
            ["#body_free .block_outer:nth-of-type(3n) .campaign_content","animation-lib--fade-in-right-big"],
            ["#body_free .block_outer:nth-of-type(3n) .div_box_faq","animation-lib--fade-in-right-big"],
            ["#image_letter_block","animation-lib--fade-in-top"],
            ["#midbox_wrapper div[class^='h2_box']","animation-lib--fade-in-top"],
            [".pricetable_content","animation-lib--fade-in-top"]
        ];

    } else if( design_number === "simple9"){

        ds_target_arr = [
            [".block_outer div[class^='box']:nth-of-type(2n-1)","animation-lib--fade-in-right-big"],
            [".block_outer div[class^='box']:nth-of-type(2n-1) .imageBoxContents:not(.imageBoxContents[data-layout='LAYOUT_MULTI_SLIDESHOW'])","animation-lib--fade-in-right"],
            [".block_outer .campaign_content:nth-of-type(2n-1)","animation-lib--fade-in-right-big"],
            [".block_outer .campaign_content:nth-of-type(2n-1) .imageBoxContents:not(.imageBoxContents[data-layout='LAYOUT_MULTI_SLIDESHOW'])","animation-lib--fade-in-right"],
            [".block_outer .div_box_faq:nth-of-type(2n-1)","animation-lib--fade-in-right-big"],
            [".block_outer div[class^='box']:nth-of-type(2n)","animation-lib--fade-in-left-big"],
            [".block_outer div[class^='box']:nth-of-type(2n) .imageBoxContents:not(.imageBoxContents[data-layout='LAYOUT_MULTI_SLIDESHOW'])","animation-lib--fade-in-left"],
            [".block_outer .campaign_content:nth-of-type(2n)","animation-lib--fade-in-left-big"],
            [".block_outer .campaign_content:nth-of-type(2n) .imageBoxContents:not(.imageBoxContents[data-layout='LAYOUT_MULTI_SLIDESHOW'])","animation-lib--fade-in-left"],
            [".block_outer .div_box_faq:nth-of-type(2n)","animation-lib--fade-in-left-big"],
            ["#midbox_wrapper div[class^='h2_box']","animation-lib--fade-in-bottom"],
            ["#image_letter_block","animation-lib--fade-in-bottom"],
            [".pricetable_content","animation-lib--fade-in-bottom"]
        ];

    } else if( design_number === "comic2"){

        ds_target_arr = [
            [".block_outer div[class^='box']:nth-of-type(4n-3)","animation-lib--scale-in-tl"],
            [".block_outer .campaign_content:nth-of-type(4n-3)","animation-lib--scale-in-tl"],
            [".block_outer .div_box_faq:nth-of-type(4n-3)","animation-lib--scale-in-tl"],
            [".block_outer div[class^='box']:nth-of-type(4n-2)","animation-lib--scale-in-tr"],
            [".block_outer .campaign_content:nth-of-type(4n-2)","animation-lib--scale-in-tr"],
            [".block_outer .div_box_faq:nth-of-type(4n-2)","animation-lib--scale-in-tr"],
            [".block_outer div[class^='box']:nth-of-type(4n-1)","animation-lib--scale-in-bl"],
            [".block_outer .campaign_content:nth-of-type(4n-1)","animation-lib--scale-in-bl"],
            [".block_outer .div_box_faq:nth-of-type(4n-1)","animation-lib--scale-in-bl"],
            [".block_outer div[class^='box']:nth-of-type(4n)","animation-lib--scale-in-br"],
            [".block_outer .campaign_content:nth-of-type(4n)","animation-lib--scale-in-br"],
            [".block_outer .div_box_faq:nth-of-type(4n)","animation-lib--scale-in-br"],
            ["#midbox_wrapper div[class^='h2_box']","animation-lib--scale-in-tl"],
            [".pricetable_content","animation-lib--scale-in-tl"]
        ];

    } else if( design_number === "crayon"){

        firePosition = {
            start : "0%",
            end : "50%"
        };

        if ($(window).width() < 480) {

            firePosition = {
                start : "0%",
                end : "80%"
            };

        }

        ds_target_arr = [
            [".block_outer div[class^='box']","animation-lib--tilt-in-tr"],
            ["#midbox_wrapper div[class^='h2_box']","animation-lib--tilt-in-tr"],
            [".block_outer .campaign_content","animation-lib--tilt-in-tr"],
            ["#image_letter_block","animation-lib--tilt-in-tr"]
        ];

    }


    if( typeof ds_target_arr === "object" && ds_target_arr.length > 0 ){

        /**
         * アニメーションの必要なデザインのアクション
         * スクロールイベントを間引き、軽量化
         * 2021-12-16 observeVisibleVertical使うように変更
         * @param {[type]} targetArray [description]
         */
        var ScrollAnimation = function( targetArray, firePosition )
        {

            var self = this;

            this.observers = [];

            this.initialize = function()
            {

              $.each( targetArray, function(i, val){

                $(val[0]).css("opacity", "0");

                // 監視開始
                self.observers.push(
                  observeVisibleVertical(
                    val[0],
                    {
                      start : firePosition.start, // ウインドウ上辺から、監視領域上端までのpadding（%, px指定対応）
                      end   : firePosition.end    // ウインドウ上辺から、監視領域下端までのpadding（%, px指定対応）
                    },
                    { 
                      visible : function( jqObject, entry ){
                        $(jqObject).addClass(val[1]);
                      },
                      hidden  : function( jqObject, entry ){
                      }
                    }
                  )
                );

              });

            }

            this.destroy = function()
            {
              self.observers.forEach(function(observe) {
                observe.destroy();
              });
              self.observer = [];
            }

            this.__construct = function()
            {
            
              self.targetArray = targetArray;
              self.initialize();

            }()

        }

        scrollAnimation = new ScrollAnimation( ds_target_arr, firePosition );

    }


    if( design_number === "sankaku" ){

        svgTargetArr = [
          [".block_outer", "svg--started"],
        ];

        svgFirePosition = {
          start : "0%",
          end : "100%"
        };

    }


    if( typeof svgTargetArr === "object" && svgTargetArr.length > 0 ){

        var SvgAnimation = function( targetArray, firePosition )
        {

            var self = this;

            this.initialize = function()
            {

                $.each( targetArray, function(i, val){

                    // 監視開始
                    observeVisibleVertical(
                        val[0],
                        {
                            start : firePosition.start, // ウインドウ上辺から、監視領域上端までのpadding（%, px指定対応）
                            end   : firePosition.end    // ウインドウ上辺から、監視領域下端までのpadding（%, px指定対応）
                        },
                        { 
                            visible : function( jqObject, entry ){
                                $(jqObject).find(".js-svg__wrapper").addClass(val[1]);
                            },
                            hidden  : function( jqObject, entry ){
                                $(jqObject).find(".js-svg__wrapper").removeClass(val[1]);
                            }
                        }
                    );

                });

            }

            this.__construct = function()
            {
            
                self.targetArray = targetArray;
                self.initialize();

            }()

        }

        var svgAnimation = new SvgAnimation( svgTargetArr, svgFirePosition );

    }


    if( design_number === "sankaku" ) {

        $(function(){

          $(".block_outer .js-svg__wrapper").remove();

          var svgObject = $(".js-svg__wrapper");

          $(".block_outer:nth-of-type(3n-2)").each( function( index ){

              svgObject.clone(true).appendTo($(this));

          });

        });

    }


    if( design_number === "game" && $(window).width() > 480 ) {

        var startPos = 0
        var winScrollTop = 0;
        var mainContentsWrapper = $('#main_contents_wrapper');

        $(window).on('scroll.designEvent',function(){
            winScrollTop = $(this).scrollTop();
            if (winScrollTop < startPos) {
                mainContentsWrapper.addClass('scrollUp');
            } else {
                mainContentsWrapper.removeClass('scrollUp');
            }
            startPos = winScrollTop;
        });

        $(window).on("scroll.designEvent",function () {
            if ($(this).scrollTop() + ( $(window).height() / 2 ) > $("#main_contents_container").offset().top + 120  && $(this).scrollTop() + ( $(window).height() / 2 ) < $("#main_contents_container").height()) {
                mainContentsWrapper.addClass('animationStart');
            } else {
                mainContentsWrapper.removeClass('animationStart');
            }
        });

        $(window).on("scroll.designEvent",function () {
            if ($(this).scrollTop() > 100 && $(this).scrollTop() < $("#main_contents_container").height()) {
                mainContentsWrapper.addClass('subAnimationStart');
            } else {
                mainContentsWrapper.removeClass('subAnimationStart');
            }
        });

    }


    if(design_number == "tategaki"){// デザイン名を指定

        if ($(window).width() > 480){// スマホは対象外

            $(".box_feature .img_box_right").closest(".js-changeableBoxImageLayoutBox").removeClass("js-marginControllLeft").addClass("js-marginControllRight");
            $(".box_feature .img_box_left").closest(".js-changeableBoxImageLayoutBox").removeClass("js-marginControllRight").addClass("js-marginControllLeft");
            $(".box_jirei .img_box_right").closest(".js-changeableBoxImageLayoutBox").removeClass("js-marginControllLeft").addClass("js-marginControllRight");
            $(".box_jirei .img_box_left").closest(".js-changeableBoxImageLayoutBox").removeClass("js-marginControllRight").addClass("js-marginControllLeft");
            $(".box_coupon .img_box_right").closest(".js-changeableBoxImageLayoutBox").removeClass("js-marginControllLeft").addClass("js-marginControllRight");
            $(".box_coupon .img_box_left").closest(".js-changeableBoxImageLayoutBox").removeClass("js-marginControllRight").addClass("js-marginControllLeft");
            $(".box_promise .img_box_right").closest(".js-changeableBoxImageLayoutBox").removeClass("js-marginControllLeft").addClass("js-marginControllRight");
            $(".box_promise .img_box_left").closest(".js-changeableBoxImageLayoutBox").removeClass("js-marginControllRight").addClass("js-marginControllLeft");
            $(".box_tokuten .img_box_right").closest(".js-changeableBoxImageLayoutBox").removeClass("js-marginControllLeft").addClass("js-marginControllRight");
            $(".box_tokuten .img_box_left").closest(".js-changeableBoxImageLayoutBox").removeClass("js-marginControllRight").addClass("js-marginControllLeft");
            $(".box_voice .img_box_right").closest(".js-changeableBoxImageLayoutBox").removeClass("js-marginControllLeft").addClass("js-marginControllRight");
            $(".box_voice .img_box_left").closest(".js-changeableBoxImageLayoutBox").removeClass("js-marginControllRight").addClass("js-marginControllLeft");
            $(".box_setsubi .img_box_right").closest(".js-changeableBoxImageLayoutBox").removeClass("js-marginControllLeft").addClass("js-marginControllRight");
            $(".box_setsubi .img_box_left").closest(".js-changeableBoxImageLayoutBox").removeClass("js-marginControllRight").addClass("js-marginControllLeft");
            $(".box_staff .img_box_right").closest(".js-changeableBoxImageLayoutBox").removeClass("js-marginControllLeft").addClass("js-marginControllRight");
            $(".box_staff .img_box_left").closest(".js-changeableBoxImageLayoutBox").removeClass("js-marginControllRight").addClass("js-marginControllLeft");
            $(".box_free .img_box_right").closest(".js-changeableBoxImageLayoutBox").removeClass("js-marginControllLeft").addClass("js-marginControllRight");
            $(".box_free .img_box_left").closest(".js-changeableBoxImageLayoutBox").removeClass("js-marginControllRight").addClass("js-marginControllLeft");

            $(".js-changeableBoxImageLayoutBox").each(function(e, v) {

                // 横幅変更対象のブロックか判別
                if(
                    $(this).hasClass("box_feature") ||
                    $(this).hasClass("box_coupon") ||
                    $(this).hasClass("box_promise") ||
                    $(this).hasClass("box_tokuten") ||
                    $(this).hasClass("box_lead") ||
                    $(this).hasClass("box_setsubi") ||
                    $(this).hasClass("box_staff") ||
                    $(this).hasClass("box_voice") ||
                    $(this).hasClass("box_jirei") ||
                    $(this).hasClass("box_recocar") ||
                    $(this).hasClass("box_dksm") ||
                    $(this).hasClass("box_free")
                ){

                    if (!$(this).hasClass("js-imageBoxBackground")) { // 背景画像ブロックなら対象外

                        var blankFlag = 0;

                        var target = $(v);

                        var targetImg = target.find(".js-imageBlockImage");

                        if( targetImg.length > 0 ){ // 2025-06-03 エラー対応

                            var targetImgWidth = targetImg.css("width");

                            var layout = targetImg.closest(".js-imageBoxContents").data("layout");

                            if (targetImg.hasClass("imageBoxBlankOuter")) { blankFlag = 1; } //画像がblankの場合はflagを立てる

                                if (layout !== "LAYOUT_2COLUMN" && layout !== "LAYOUT_3COLUMN" && layout !== "LAYOUT_4COLUMN") { // 2連,3連,4連なら対象外

                                    targetImgWidth = targetImgWidth.replace("px", "");
                                    targetImgWidth = parseInt(targetImgWidth, 10); // 文字列から数値に変換

                                    if (!blankFlag) {

                                        if (targetImgWidth < 480 && targetImgWidth >= 1) {

                                            targetImgWidth = 480; //画像の横幅が小さいコンテンツは下限(480px)を設定

                                            target.css({
                                              'width' : targetImgWidth + "px"
                                            });

                                        } else if (targetImgWidth >= 480) {

                                            target.css({
                                              'width' : targetImgWidth + "px"
                                            });

                                        } else {
                                            // 何もしない
                                        }

                                    }

                                }

                        } else {
                            // 対象となるオブジェクトが無いので、処理を飛ばす
                        }

                    }

                }

            });

        }

    }


    if(design_number == "mobile_first"){// デザイン名を指定

        if ($(window).width() < 480){// スマホは対象外

            $(".div_box_faq h3").off("click.designEvent").on("click.designEvent", function() {
                $(this).next().slideToggle();
                $(this).toggleClass("activate");
            });
            $("h3.edit_table_title").off("click.designEvent").on("click.designEvent", function() {
                $(this).siblings('.pricetable_block').slideToggle();
                $(this).siblings('.pricetabel_memo').slideToggle();
                $(this).toggleClass("activate");
            });
        }

    }


    if (design_number == "miniature" || design_number == "ryusenkei" || design_number == "neumorphism" || design_number == "sanwa") {
        $('#body_free .block_outer_free01_01 h2.midashi_long').wrapInner('<span>');
        $('#body_sub h2#middle_top_cardetail').wrapInner('<span>');
        $('#body_sub h2#recommend_h2').wrapInner('<span>');
    }


    if (design_number == "miniature" || design_number == "sanwa") {
        // HTML変更（CSSだけではどうしようもないもの）
        htmlCompulsionMove('h1', 'insertAfter', '#smt_head_base');
        // メインイメージのパララックス
        if($('#floatImage01').length > 0 && $('#floatImage01').css("display") !== "none"){
            mainimgParallax('#floatImage01','#floatImage02');
        }
        // セクションのパララックス
        $('.block_outer').each(function(){
            const targetSection = $(this);
            const sectionTop = $(this).offset().top;
            $(window).on("scroll.designEvent",function() {
                const scrollTop = $(window).scrollTop();
                if( scrollTop > (sectionTop - 300) ){
                    targetSection.css('background-position-y', 0 + (sectionTop - scrollTop) / 8);
                }
            });
        });
    }


    if (design_number == "neon2") {
        $('h2:not(#carlist_midashi):not(#middle_top_cardetail):not(#recommend_h2):not(.toppage_h2):not(.cart_h2)').each(function(){
            const fix = $(this);
            const fixWrapper = $(this).closest('.block_outer');
            // 要素がある場合のみ処理
            if($(this).closest("#js_dksmSliderContents").length == 0){
                $(window).on("scroll.designEvent",function() {
                    if(fixWrapper.length && fix.length) {
                        var fixTop = fixWrapper.offset().top;
                        var fixEnd = fixWrapper.offset().top + fixWrapper.height() + 50;
                        var fixHeight = fix.height();
                        var winScroll = $(window).scrollTop();
                        var winheight = $(window).height();
                        // 対象位置を通過している場合
                        // 開始位置を通過する前
                        if(winScroll < fixTop) {
                            fix.removeClass('is-fixed');
                            // 終了位置を通過した後
                        } else if(winScroll > fixEnd - fixHeight) {
                            fix.removeClass('is-fixed');
                            // 対象範囲内の場合
                        } else {
                            fix.addClass('is-fixed');
                        }
                    }
                });
            }
        });
    }


    if(design_number == "sky2"){

        //グローバルメニューの固定処理
        //----------------------------------------------------------
        var f_menu = $(".menu_container");
        var m_menu = $(".mega_menu");
        var menuY = f_menu.offset().top;
        var debugStr ="menuY=" + menuY;
        var contentsTopPosi = $('#wrapper').offset().top;

        var windowTop = $(window).scrollTop()+contentsTopPosi;
        var debugStr ="menuY=" + menuY + " windowTop=" +windowTop;
        // $("h1").text(debugStr);
        if(menuY <= windowTop) {
            f_menu.css({
                'position':'fixed',
                 'top':contentsTopPosi+'px',
                 'left':'0px',
                 'right':'0px',
                 'z-index':'100'
            });
            m_menu.css({
                'top':(f_menu.height())+'px',
                'z-index':'100'
            });

            $(".backtop").fadeIn(500);//「topへ戻る」を表示させる

        } else if(menuY > windowTop){
            f_menu.css({
                'position':'static',
                'top': 'inherit',
                'left': 'inherit',
                'right': 'inherit',
                'z-index': 'inherit'
            });
            m_menu.css({
                'top':(120)+'px',
                'z-index': '10'
            });
            $(".backtop").fadeOut(500);//「topへ戻る」を消す
        }
        //$("h1").text(debugStr);

        //「topへ戻る」は消しておく
        $(".backtop").hide();

        $(window).on("scroll.designEvent", function(){

            var windowTop = $(window).scrollTop()+contentsTopPosi;
            var debugStr ="menuY=" + menuY + " windowTop=" +windowTop;
            // $("h1").text(debugStr);
            if(menuY <= windowTop) {
                f_menu.css({
                    'position':'fixed',
                    'top':contentsTopPosi+'px',
                    'left':'0px',
                    'right':'0px',
                    'z-index':'100'
                });
                m_menu.css({
                    'top':(f_menu.height())+'px',
                    'z-index':'100'
                });

                $(".backtop").fadeIn(500);//「topへ戻る」を表示させる

            } else if(menuY > windowTop){
                f_menu.css({
                    'position':'static',
                    'top': 'inherit',
                    'left': 'inherit',
                    'right': 'inherit',
                    'z-index': 'inherit'
                });
                m_menu.css({
                  'top':(120)+'px',
                  'z-index': '10'
                });
                $(".backtop").fadeOut(500);//「topへ戻る」を消す
            }
        });

    }


    // 公開側のPC、スマホ、デザインによって変更
    if( window.innerWidth > 480 ) { // PCサイズ
        if( design_number == "sky2" ) {
            $('#carSearch_public').css({padding: '30px', background: '#FFF', width: '730px'});
        } else if( design_number == "b_japan" || design_number == "wheel" || design_number == "neon" || design_number == "curtain" ) {
            $('#car_search_area').css({color: '#FFF'});
        } else if( design_number == "classical" ) {
            $('.pager li span').css({'background': '#000'});
        }
    } else {　// SPサイズ
        if( design_number == "sky2" ) {
            $('#carSearch_public').removeAttr('style');
        } else if( design_number == "photo4" || design_number == "neon" ) {
            $('#carSearch_public, #car_search_area').css({color: '#FFF'});
        } else if( design_number == "b_japan" || design_number == "wheel" || design_number == "curtain" ) {
            $('#car_search_area').css({color: '#FFF'});
        }
    }


    if( stylableMainImage ){
        mainImageStyler = new MainImageStyler( mainImageStyleDataSet );
        mainImageStyler.styling();
    }


    switch( design_number ){
        case "pict":
            $("#main_contents").find("h2").each(function(){
                if( !$(this).hasClass("toppage_h2") ){
                    $(this).append("<span class = 'floatImageH2'></span>");
                }
            });
            $("#footer_wrapper").append("<span class = 'floatImage'></span>");
        break;
    }


    if( design_number === "mobile_first2" ){

        if(SPJSFLAG == 1 && sp_param == "1"){
            // スマホは何もしない
        } else {

            var $h2      = $("#main_contents h2.midashi_long");
            var $wrapper = $("#wrapper");
            var $slide   = $(".sliderDiv[data-disp-flag='1']");
            var $imageBlockImage = $("img.js-imageBlockImage");

            var slideSrc   = [];
            var h2TopArray = [];

            var timer;
            var changeable = true;
            var duration = 1000; // ms

            // スライドのpathを取得
            $slide.each( function(i){

                slideSrc[i] = $(this).css("background-image");

            });

            $h2.each( function(i){

                h2TopArray[i] = $(this).offset().top;

            });

            // 画像が1枚もない場合->コンテンツ画像->デフォルト画像

            if( slideSrc.length <= 0 ){

                if( $imageBlockImage.length <= 0){

                    slideSrc[0] = "url(/cms/img/cmscss/mobile_first2/sbgimg/sbgimg01.jpg)";

                } else {

                    $imageBlockImage.each( function(i){

                        if( i < 8 ){ // 8枚まで

                            slideSrc[i] = "url(" + $(this).attr("src") + ")";

                        } else {

                            // なにもしない

                        }

                    });

                }

            } else {

                // なにもしない

            }

            //初回
            $wrapper.css("background-image", slideSrc[0]);

            $(window).on( "scroll.designEvent", function(){

                var y = $(window).scrollTop();

                if( y < 200 ){

                    $("#conteiner").removeClass("scrolled");

                } else {

                    $("#conteiner").addClass("scrolled");

                }

                for (var i = h2TopArray.length; i >= 0; i-- ){

                    if ( y > h2TopArray[i] - 100) {

                        var slideIndex = i % slideSrc.length;

                        if( changeable ){

                            $wrapper.css("background-image", slideSrc[slideIndex]);

                            changeable = false;

                            timer = setTimeout( function(){

                                changeable = true;

                            }, duration);

                            break;

                        } else {

                            // 何もしない

                        }

                    }

                }

            });

        }

    }


    if( design_number === "mobile_first3" || design_number === "mobile_first4" ){
        onlyMobileFirst3SidebarFunction();
    }


    if( design_number === "verticalbar2" ){

      if( SPJSFLAG == 1 && sp_param == "1" ){

      } else {

        // 対象のh2を定義

        var target = $("h2.cart_h2, h2#recommend_h2, h2#middle_top_cardetail, #middle_top_price01 h2, h2.midashi_long");

        target.each( function(){

          const fix = $(this);
          const fixWrapper = $(this).closest('.block_outer');

          // 要素がある場合のみ処理
          $(window).on("scroll.designEvent",function() {

            var fixTop = fixWrapper.offset().top;
            var fixEnd = fixWrapper.offset().top + fixWrapper.height();
            var fixWrapperHeight = fixWrapper.height();
            var fixHeight = fix.height();
            var winScroll = $(window).scrollTop();
            var winheight = $(window).height();

            // 対象位置を通過している場合
            // 開始位置を通過する前
            if( winScroll < fixTop ) {
              fix.removeClass('sticky');
            // 終了位置を通過した後
            } else if( winScroll > fixEnd ){
              fix.removeClass('sticky');
            // 対象範囲内の場合
            } else {

              if( fixWrapperHeight < winheight ){ // fixする必要が無い

                fix.removeClass('sticky');

              } else {

                fix.addClass('sticky');

              }

            }

          });

        });

      }

    }

    if( design_number === "yankee" ){

      var timer;

      if ( typeof yankeeAnimation !== "undefined" && yankeeAnimation !== null ) {
        yankeeAnimation = null;
      }

      yankeeAnimation = new yankeeAnimationModel();

      // アニメーション用のhtmlを追加
      yankeeAnimation.addAnimationHtml();

      // 再インスタンス化したときのことを考えて、スクロール関係の数値をセットする処理を入れる
      yankeeAnimation.setScrollTop();

      // スクロール毎に発火
      $(window).on('scroll.designEvent', function(){

        yankeeAnimation.setScrollTop();
        yankeeAnimation.runAnimation();
      
      });

      // リサイズしたら、座標を更新
      $(window).on("resize.designEvent", function() {

        // リサイズを終えてから発火するように調整
        if( timer > 0 ){
          clearTimeout( timer );
        }

        timer = setTimeout( function(){
          yankeeAnimation.setValues();
        }, 200 );

      });

    }

    if( design_number === "animation4" ){

        var $wrapper = $("#wrapper");
        var $header  = $("#header");
        var $container  = $("#conteiner");

        var roopObj = "";

        for( var i = 0; i < 20; i++) { // 20回ループ

          roopObj +=
                '<div class="rotate_ball">' +
                    '<div class="inner"></div>' +
                '</div>';

        }

        var animationHtmlWrapper =
            '<div id="animation2_obj_ui">' +
                '<div class="rotate">' +
                    roopObj +
                '</div>' +
            '</div>';

        var animationHtmlHeader =
            '<div id="animation1_obj_ui">' +
                '<div class="spin">' +
                    '<div class="spin_ball"></div>' +
                    '<div class="spin_ball"></div>' +
                    '<div class="spin_ball"></div>' +
                    '<div class="spin_ball"></div>' +
                    '<div class="spin_ball"></div>' +
                '</div>' +
            '</div>';

        /**
         * 実行
         */
        $wrapper.append( animationHtmlWrapper );

        if( SPJSFLAG == 1 && sp_param == "1" ){

            $container.append( animationHtmlHeader );

        } else {

            $header.prepend( animationHtmlHeader );

        }


    }

    if( design_number === "pastel3" ){

      if ( typeof animationExPastel3 !== "undefined" && animationExPastel3 !== null ) {
        animationExPastel3 = null;
      }

      animationExPastel3 = new AnimationExPastel3();


      $(function(){

        animationExPastel3.assign(
          [
            "h2.h2_common"
          ],
          "scroll-h2-left",
          "before"
        );

        animationExPastel3.assign(
          [
              "#wrapper #conteiner #main_contents .block_outer.block_outer_lead .h2_common"
          ],
          "nothing",
          "before"
        );

        animationExPastel3.assign(
          [
            ".js-parallaxContentOuter .block_outer h2#recommend_h2.h2_common",
            ".js-parallaxContentOuter .block_outer_flow h2.h2_common",
            "#main_contents > .block_outer:nth-of-type(5n-3) h2.h2_common",
            "#main_contents .parallaxContentOuter:nth-of-type(5n-3) .block_outer h2.h2_common",
            "#main_contents > .block_outer:nth-of-type(5n) h2.h2_common",
            "#main_contents .parallaxContentOuter:nth-of-type(5n) .block_outer h2.h2_common",
          ],
          "scroll-h2-bar",
          "before"
        );

        animationExPastel3.assign(
          [
            ".js-parallaxContentOuter .block_outer h2#recommend_h2.h2_common",
            ".js-parallaxContentOuter .block_outer_flow h2.h2_common",
            "#main_contents > .block_outer:nth-of-type(5n-3) h2.h2_common",
            "#main_contents .parallaxContentOuter:nth-of-type(5n-3) .block_outer h2.h2_common",
            "#main_contents > .block_outer:nth-of-type(5n) h2.h2_common",
            "#main_contents .parallaxContentOuter:nth-of-type(5n) .block_outer h2.h2_common"
          ],
          "scroll-h2-bar",
          "after"
        );

        animationExPastel3.assign(
          [
            "#wrapper #conteiner #main_contents .block_outer.block_outer_requirements01 h2.h2_common",
            "#wrapper #conteiner #main_contents .block_outer.block_outer_requirements02 h2.h2_common",
            "#wrapper #conteiner #main_contents .block_outer.block_outer_requirements03 h2.h2_common",
            "#wrapper #conteiner #main_contents .block_outer.block_outer_requirements04 h2.h2_common",
            "#wrapper #conteiner #main_contents .block_outer.block_outer_requirements05 h2.h2_common"
          ],
          "scroll-h2-left",
          "before"
        );
        
        animationExPastel3.assign(
          [
            ".js-imageBox",
            ".block_outer .editTextOuter",
            ".h2_box_1, .h2_box_2, .h2_box_3",
            ".usercar_list",
            "#main_contents_wrapper .js-imageBoxBackground"
          ],
          "scroll-fadeIn",
          "self"
        );

        animationExPastel3.assign(
          [
            "#main_contents > .block_outer:nth-of-type(5n-4)",
            "#main_contents .parallaxContentOuter:nth-of-type(5n-4) .block_outer",
          ],
          "scroll-slide-left",
          "before"
        );

        animationExPastel3.assign(
          [
            "#main_contents > .block_outer:nth-of-type(5n-3) .box_common:not(.js-imageBoxBackground):not(.div_box_faq):not(.box_flow)",
            "#main_contents .parallaxContentOuter:nth-of-type(5n-3) .block_outer .box_common:not(.js-imageBoxBackground):not(.div_box_faq):not(.box_flow)"
          ],
          "scroll-block-slide",
          "before"
        );


        animationExPastel3.assign(
          [
            "#main_contents > .block_outer:nth-of-type(5n-2)",
            "#main_contents .parallaxContentOuter:nth-of-type(5n-2) .block_outer"
          ],
          "scroll-slide-right",
          "before"
        );

        animationExPastel3.assign(
          [
            "#main_contents > .block_outer:nth-of-type(5n-1)",
            "#main_contents .parallaxContentOuter:nth-of-type(5n-1) .block_outer"
          ],
          "scroll-change-color-1",
          "self"
        );

        animationExPastel3.assign(
          [
            "#main_contents > .block_outer:nth-of-type(5n)",
            "#main_contents .parallaxContentOuter:nth-of-type(5n) .block_outer"
          ],
          "scroll-change-color-2",
          "self"
        );


        animationExPastel3.assign(
          [
            "#wrapper #conteiner #main_contents_wrapper #main_contents .block_outer.block_outer_lead"
          ],
          "scroll-round-scale-up",
          "before"
        );


        animationExPastel3.assign(
          [
            "#wrapper #conteiner #main_contents_wrapper #main_contents .block_outer.block_outer_lead .box_common"
          ],
          "nothing",
          "before"
        );


        animationExPastel3.bind();

        // 致し方なし
        animationExPastel3.viewport.top = $(window).scrollTop();
        animationExPastel3.viewport.bottom = animationExPastel3.viewport.top + $(window).height();

        animationExPastel3.main();

        animationExPastel3.initialized = true;

      });

    }

    if ( design_number === "black5" ) {
        if ( typeof animationBlack5 !== "undefined" && animationBlack5 !== null ) {
          animationBlack5 = null;
        }
        animationBlack5 = new AnimationBlack5();
        animationBlack5.main();
    }

    if ( design_number === "photo7" ) {
        if ( typeof animationPhoto7 !== "undefined" && animationPhoto7 !== null ) {
          animationPhoto7 = null;
        }
        var animationPhoto7 = new AnimationPhoto7();
        animationPhoto7.main();
    }

    if( design_number === "sky5" ){
        sky5ExController = new Sky5ExController();

        sky5ExController.main();

        sky5ExController.bind();
    }

    if( design_number === "mobile_first4" ){
        if ( typeof mobileFirst4ExController !== "undefined" && mobileFirst4ExController !== null ) {
          mobileFirst4ExController = null;
        }
        mobileFirst4ExController = new MobileFirst4ExController();
        mobileFirst4ExController.main();
    }

    if( design_number === "illust" ){

      if ( typeof illustDesignAnimation !== "undefined" && illustDesignAnimation !== null ) {
        illustDesignAnimation.init();
      }
        illustDesignAnimation = new IllustDesignAnimationController();
        illustDesignAnimation.main();

    }

    if( design_number === "simple11" ){

        (function() {

          var instances = [];

          function createInstance(sectionId, stageInnerId, planeId, pointFactory) {

            var section = document.getElementById(sectionId);
            var stageInner = document.getElementById(stageInnerId);
            var plane = document.getElementById(planeId);

            if ( $(window).width() > 480 ) {
              var w = 1258;
              var h = 2375;
            }else{
              var w = 384;
              var h = 997;
            }
            var points = pointFactory(w, h);

            if( typeof controller !== "undefined" && controller !== null ){
              controller = null;
            }

            var controller = new BezierCurveController(
              points.pt1,
              points.pt2,
              points.pt3,
              points.pt4,
              90,
              plane
            );

            controller.setSection(section);
            controller.drawLine(stageInner);

            // instance生成時に、以前に作られた要素を削除する
            if ( $(".curve-svg").length > 1 ) {
              $(".curve-svg").eq(0).remove();
            }

            return { controller: controller };

          }

          function buildAll() {
            var stageInner = document.getElementById("stageInner");
            var centerX = stageInner.clientWidth / 2;
            instances = [
              createInstance('curveSection', 'stageInner', 'plane', function(w, h) {
                return {
                  pt1: { x: centerX, y: 0 },
                  pt2: { x: centerX - stageInner.clientWidth * 1.5, y: h * 0.65 },
                  pt3: { x: centerX + stageInner.clientWidth * 1.5, y: h * 0.35 },
                  pt4: { x: centerX, y: h }
                };
              })
            ];

            updateAll();
          }

          function updateAll() {
            instances.forEach(function(instance) {
              instance.controller.scroll();
            });
          }

          var debounceTimeout = null;
          var debounceTime = 200;

          function debounce() {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(buildAll,debounceTime);
          }

          window.addEventListener('scroll', updateAll, { passive: true });
          window.addEventListener('resize', debounce);
          window.addEventListener('load', buildAll);

          if ( !instances || instances.length === 0 ) {
            buildAll();
          }

        })();

    }

    if (PAGE_ID === "101") {

        if( sliderPattern === "prevnext" ){

            if ( design_number === "mono" ) {

                maxPrevnextSliderNum = 7;

            }else if( design_number === "cafe" || design_number === "kids" || design_number === "wide3" || design_number === "60s" ){

                maxPrevnextSliderNum = 5;

            }else if( design_number === "typography" ) {

              maxPrevnextSliderNum = 1;

            }else{

                maxPrevnextSliderNum = 8;

            }

            $("#sliderStepsContainer").find("span").attr("data-disp-flag","0");

            $('.sliderDiv').each(function(i,e){

                var slideDisplayFlag = "0";

                if( Number(i) >= Number(displaySlideCount) || Number(i) >= Number(maxPrevnextSliderNum) ){
                  slideDisplayFlag = "0";
                }else{
                  slideDisplayFlag = "1";
                }

                $(e).attr("data-disp-flag",slideDisplayFlag);
                $("#sliderStepsContainer").find("span").eq(i).attr("data-disp-flag",slideDisplayFlag);

            });

            if( design_number === "typography" ) {
              $("#sliderStepsContainer").find("span").attr("data-disp-flag","0");
            }

        }

    }

}

/**
 * 独立させるかも
 */
var AbsoluteCarObjectController = function( obj, directionReverse )
{


    var self = this;

    this.obj;
    this.animationTimer;

    this.directionReverse = false;

    this.fixPositionRatio = 0.5;

    this.scrollPos = 0;
    this.maxScrollPos = 0;
    this.objectPos = 0;

    this.objectHiddenPoint = 0;

    this.objectActivated = false;
    this.objectRemoved = false;

    this.objectSize = {
        width : 0,
        height : 0
    }

    this.mainContentsY = {
        start : 0,
        end : 0
    }

    this.windowHeight = 0;

    this.bind = function()
    {

        $(document).on("scroll", function(){

            // 可視範囲？
            if( self.shouldObjectActivate() ){

                self.objectActivated = true;

            }

            if( self.directionReverse ){

                if( $(this).scrollTop() > self.scrollPos ){ // 下向きのスクロール

                } else {

                    if( self.shouldRemoveObject() ){

                        self.removeObject();

                    }

                    if( self.objectMoveable() ){

                        self.setObjectPosition();

                    }

                }

            } else {

                if( self.objectRemoved ){
                    
                    self.maxScrollPos = 0;

                }

                if( $(this).scrollTop() < self.scrollPos ){ // 上向きのスクロール

                } else {

                    if( self.shouldRemoveObject() ){

                        self.removeObject();

                    }

                    //下スクロールの時の処理
                    if( self.objectMoveable() ){
                        
                        self.setObjectPosition();

                    }

                }

            }

            self.scrollPos = $(this).scrollTop();

            if( self.maxScrollPos < self.scrollPos ){

                self.maxScrollPos = self.scrollPos;
            }

        });

    }


    this.shouldObjectActivate = function()
    {

        return self.scrollPos > self.objectPos - self.windowHeight + (self.windowHeight / 5); // オブジェクトが可視範囲に入った 

    }


    this.shouldRemoveObject = function()
    {

        if( self.directionReverse ){

            return self.scrollPos < self.objectHiddenPoint && self.objectActivated && !self.objectRemoved

        } else {

            return self.scrollPos > self.objectHiddenPoint && self.objectActivated && !self.objectRemoved

        }

    }


    this.removeObject = function()
    {

        clearTimeout( self.animationTimer );

        self.carObj.removeClass("driveIn");
        self.carObj.addClass("driveOut");

        self.animationTimer = setTimeout( function(){
          
            self.carObj.fadeOut();

            setTimeout( function(){

                if( self.directionReverse ){
                    
                    self.setStartPosition();

                }

            }, 1000);

        }, 700);

        self.objectRemoved = true;

    }


    this.objectMoveable = function()
    {

        if( self.directionReverse ){

            return self.scrollPos < self.mainContentsY.end && self.scrollPos > self.mainContentsY.start && (self.scrollPos < self.objectPos);

        } else {

            return self.scrollPos > self.mainContentsY.start && self.scrollPos < self.mainContentsY.end && (self.scrollPos >= self.maxScrollPos);

        }        

    }


    this.setStartPosition = function()
    {

        if( self.directionReverse ){

            var Y = self.mainContentsY.end - ( self.windowHeight * self.fixPositionRatio ) - (self.objectSize.height / 2 );

        } else {

            var Y = self.mainContentsY.start + ( self.windowHeight * self.fixPositionRatio ) - (self.objectSize.height / 2 );
            self.objectActivated = true; // 下移動の場合は、最初からアクティブ

        }

        self.carObj.css("top", Y);

        self.objectPos = Y;

        self.carObj.css("opacity", "1");

    }


    this.setObjectPosition = function()
    {

        if( !self.objectActivated ) return false; // 動いて良い状態で無ければ動かさない

        if( self.carObj.css('display') === 'none' ){

            self.carObj.fadeIn();
            self.carObj.removeClass("driveOut");
            self.carObj.addClass("driveIn");

            self.objectRemoved = false;

        }

        var Y = self.scrollPos + ( self.windowHeight * self.fixPositionRatio ) - (self.objectSize.height / 2 );

        self.carObj.css("top", Y);

        self.objectPos = Y;

    }


    this.setObjectSize = function()
    {

        self.objectSize.width  = self.carObj.outerWidth(true);
        self.objectSize.height = self.carObj.outerHeight(true);

    }

    this.setObjectHiddenPoint = function()
    {

        if( self.directionReverse ){

            self.objectHiddenPoint = self.mainContentsY.end - (( self.mainContentsY.end - self.mainContentsY.start ) * (1 - 0.05));

        } else {

            self.objectHiddenPoint = self.mainContentsY.end - (( self.mainContentsY.end - self.mainContentsY.start ) * 0.05);

        }
        
    }

    this.setWindowHeight = function()
    {

        self.windowHeight = $(window).height();

    }

    this.setMainContentsY = function()
    {

        var mainContentsObj = $("#main_contents");

        if( mainContentsObj.length > 0 ){

            var tmp = mainContentsObj.offset();
            var height = mainContentsObj.outerHeight(true);

            self.mainContentsY.start = tmp.top;
            self.mainContentsY.end   = tmp.top + height;
        }

    }


    this.initialize = function()
    {

        self.calc();

        self.setStartPosition();
        self.bind();

    }


    this.calc = function()
    {

        self.setObjectSize(); 
        self.setWindowHeight(); 
        self.setMainContentsY();
        self.setObjectHiddenPoint();

    }


    this.__construct = function()
    {

        self.carObj = obj;
        self.directionReverse = directionReverse;

    }();


}

/**
* SelectorClickLogger
*
* 公開HTML要素のクリックログを送信する
* 使い方:
* analytics などから指定セレクタを渡して起動する
<script>
  $(function(){
    initClickLogger([
       "#id",
       ".class"
    ]);
  });
</script>
*
* 指定のクリックログが `dktl_selector_click_log` に保存されます
*/

var SELECTOR_CLICK_LOGGER_INSTANCE;


var initClickLogger = function( selectors, options )
{
    if( typeof SELECTOR_CLICK_LOGGER_INSTANCE === "undefined" ){
        SELECTOR_CLICK_LOGGER_INSTANCE = new SelectorClickLogger();
    }

    return SELECTOR_CLICK_LOGGER_INSTANCE.init( selectors, options );
};



var SelectorClickLogger = function()
{
    var self = this;

    this.selectors = [];

    this.cooldown = 2000;

    this.lastClicked = {};


    this.canUse = function()
    {
        return (
            typeof conversionRoot !== "undefined" &&
            typeof pm_shop_id !== "undefined" &&
            typeof edit_param !== "undefined" //&&
            // edit_param === "0"
        );
    };


    this.isValidSelector = function( selector )
    {
        return typeof selector === "string" && /^[#.][A-Za-z0-9_-]+$/.test( $.trim(selector) );
    };


    this.normalizeOptionalId = function( value )
    {
        if( typeof value === "undefined" || value === null ){
            return "";
        }

        value = $.trim( String(value) );

        return /^[0-9]+$/.test( value ) ? value : "";
    };


    this.findClosestDataId = function( $target, $element, dataName )
    {
        var selector = "[data-" + dataName + "]",
            attrName = "data-" + dataName,
            value = $.trim( $target.closest(selector).attr(attrName) || "" );

        if( value !== "" ){
            return value;
        }

        return $.trim( $element.closest(selector).attr(attrName) || "" );
    };


    this.buildPageId = function( $target, $element )
    {
        var pageId = self.normalizeOptionalId( typeof PAGE_ID !== "undefined" ? PAGE_ID : "" );

        if( pageId !== "" ){
            return pageId;
        }

        return self.normalizeOptionalId( self.findClosestDataId( $target, $element, "page-id" ) );
    };


    this.buildRecordId = function( $target, $element )
    {
        var recordId = self.normalizeOptionalId( typeof RECORD_ID !== "undefined" ? RECORD_ID : "" );

        if( recordId !== "" ){
            return recordId;
        }

        return self.normalizeOptionalId( self.findClosestDataId( $target, $element, "record-id" ) );
    };


    this.buildUsedcarId = function( $target, $element )
    {
        var usedcarId = self.normalizeOptionalId( typeof usedCarId !== "undefined" ? usedCarId : "" );

        if( usedcarId !== "" ){
            return usedcarId;
        }

        usedcarId = self.normalizeOptionalId( self.findClosestDataId( $target, $element, "usedcar-id" ) );

        if( usedcarId !== "" ){
            return usedcarId;
        }

        return self.normalizeOptionalId( $("#js-usedcarId").val() );
    };


    this.buildContextIds = function( $target, $element )
    {
        return {
            pageId : self.buildPageId( $target, $element ),
            recordId : self.buildRecordId( $target, $element ),
            usedcarId : self.buildUsedcarId( $target, $element )
        };
    };


    this.mergeSelectors = function( currentSelectors, newSelectors )
    {
        var merged = currentSelectors.slice(0);

        $.each(newSelectors, function( i, selector ){
            if( $.inArray(selector, merged) === -1 ){
                merged.push( selector );
            }
        });

        return merged;
    };


    this.buildText = function( $element )
    {
        var text = $.trim( $element.text() );

        if( text.length > 1000 ){
            text = text.substring( 0, 1000 );
        }

        return text;
    };


    this.buildHref = function( $element, $target )
    {
        var href = $.trim( $element.attr("href") || "" );

        if( href !== "" ){
            return href;
        }

        return $.trim( $target.closest("a").attr("href") || "" );
    };


    this.buildClickedElement = function( $element )
    {
        var tagName = String( $element.prop("tagName") || "" ).toLowerCase(),
            id = $.trim( $element.attr("id") || "" ),
            className = $.trim( $element.attr("class") || "" ),
            firstClass = "";

        if( className !== "" ){
            firstClass = className.split(/\s+/)[0];
        }

        if( id !== "" ){
            return tagName + "#" + id;
        }

        if( firstClass !== "" ){
            return tagName + "." + firstClass;
        }

        return tagName;
    };


    this.findMatchedElement = function( $target )
    {
        var i = 0,
            selector = "",
            $matchedElement = $();

        for( i = 0; i < self.selectors.length; i++ ){
            selector = self.selectors[i];
            $matchedElement = $target.closest( selector );

            if( $matchedElement.length > 0 ){
                return {
                    selector : selector,
                    $element : $matchedElement.eq(0)
                };
            }
        }

        return null;
    };


    this.buildDedupeSeed = function( selector, href, pageUrl, contextIds )
    {
        return [
            String( pm_shop_id ),
            selector,
            href,
            pageUrl,
            contextIds.pageId,
            contextIds.recordId,
            contextIds.usedcarId
        ].join("||");
    };


    this.send = function( matched, href, pageUrl, contextIds )
    {
        var selectorType = matched.selector.charAt(0) === "#" ? "id" : "class";

        $.ajax({
            type : "POST",
            url : conversionRoot + "selector_click_log.php",
            data : {
                shop_id : pm_shop_id,
                page_id : contextIds.pageId,
                record_id : contextIds.recordId,
                usedcar_id : contextIds.usedcarId,
                selector : matched.selector,
                selector_type : selectorType,
                clicked_element : self.buildClickedElement( matched.$element ),
                element_text : self.buildText( matched.$element ),
                href : href,
                page_url : pageUrl,
                is_edit_page : edit_param
            }
        });
    };


    this.handleClick = function( e )
    {
        var $target = $( e.target ),
            matched = null,
            href = "",
            pageUrl = "",
            contextIds = null,
            dedupeSeed = "",
            now = 0;

        if( self.selectors.length === 0 || !self.canUse() ){
            return;
        }

        matched = self.findMatchedElement( $target );

        if( matched === null ){
            return;
        }

        href = self.buildHref( matched.$element, $target );
        pageUrl = location.href;
        contextIds = self.buildContextIds( $target, matched.$element );
        dedupeSeed = self.buildDedupeSeed( matched.selector, href, pageUrl, contextIds );
        now = new Date().getTime();

        if(
            typeof self.lastClicked[ dedupeSeed ] !== "undefined" &&
            ( now - self.lastClicked[ dedupeSeed ] ) < self.cooldown
        ){
            return;
        }

        self.lastClicked[ dedupeSeed ] = now;

        self.send( matched, href, pageUrl, contextIds );
    };


    this.bind = function()
    {
        $(document).on("click", function( e ){
            self.handleClick( e );
        });
    };


    this.init = function( selectors, options )
    {
        var normalizedSelectors = [],
            cooldown = 2000;

        if( !$.isArray(selectors) ){
            return false;
        }

        $.each(selectors, function( i, selector ){
            selector = $.trim( selector );

            if( self.isValidSelector( selector ) ){
                normalizedSelectors.push( selector );
            }
        });

        if( normalizedSelectors.length === 0 ){
            return false;
        }

        if(
            typeof options !== "undefined" &&
            options !== null &&
            typeof options.cooldown !== "undefined"
        ){
            cooldown = parseInt( options.cooldown, 10 );

            if( isNaN(cooldown) || cooldown < 0 ){
                cooldown = 2000;
            }
        }

        self.selectors = self.mergeSelectors( self.selectors, normalizedSelectors );
        self.cooldown = cooldown;

        return true;
    };


    this.__construct = function()
    {
        self.bind();
    }();

};

$(function(){
    documentReadyEventUseDesignNumberOpenJs();
});

var windowOnLoadEventUseDesignNumberOpenJs = function(){

  if( design_number === "yankee" ){
      // ロードが完了したら値を取得
      yankeeAnimation.ready();
      yankeeAnimation.setValues();
  }

  if( design_number === "sankaku" ) {

      $(".js-svg__wrapper").addClass("loaded");

  }

}

$(window).on("load",function(){
  windowOnLoadEventUseDesignNumberOpenJs();
});

var useDesignEventOff = function(){
  $(document).off("click.designEvent");
  $(window).off("load.designEvent");
  $(window).off("scroll.designEvent");
}


if( $("#absolute-car-object--1").length > 0 ){ // 要素があれば

    var absoluteCarObjectController = new AbsoluteCarObjectController( $("#absolute-car-object--1"), false );

    absoluteCarObjectController.initialize();

}


if( $("#absolute-car-object--2").length > 0 ){ // 要素があれば

    var absoluteCarObjectController2 = new AbsoluteCarObjectController( $("#absolute-car-object--2"), true );

    absoluteCarObjectController2.initialize();

}

$(function(){
  heicController = new heic2Jpg();
});


/**
 * スクロールサマリーロガー
 *
 * 1閲覧1行で、スクロール率と離脱時の block_outer を送信する
 * 
 ** 使い方 **
 * ログ取得したいアカウントの Google Analitycs に下記スクリプトタグを記載する
 * 
<script>
    $(function(){
        startScrollSummaryLogger();
    });
</script>
 * 
 * スクロールのログが `dktl_scroll_summary_log` に保存される。ページ表示1回につき1レコード。
 * ページ更新・遷移ごとに1レコード追加されます
 * 
 ** 注意 **
 * 公開画面のみ有効。編集ページでは動作しません
 * 追加・削除した場合は全公開してください（analytics 編集時に全公開フラグが立つはずですが）
 * 
 */
var ScrollSummaryLogger = function( options )
{
    var self = this;

    this.endpoint = conversionRoot + "/scrollSummaryLogger.php";
    this.initialStateFinalizeDelayMs = 300;
    this.restoredScrollFinalizeDelayMs = 800;
    this.minSendScrollRateDiff = 5;
    this.lateHeightGrowthThreshold = 200;
    this.initialStateMaxWaitMs = 3000;
    this.initialStateFinalizeTimer = null;
    this.initialStateMaxWaitTimer = null;
    this.ticking = false;
    this.isStarted = false;
    this.isSending = false;
    this.initialStateFinalized = false;
    this.options = options || {};
    this.blocks = $();
    this.sessionKey = "";
    this.startedAtMs = 0;
    this.shopId = null;
    this.pageId = null;
    this.recordId = null;
    this.usedcarId = null;
    this.lastSentMaxScrollRate = null;
    this.lastSentExitScrollRate = null;
    this.lastSentDocumentHeight = null;
    this.hasUnsentChanges = false;
    this.state = {
        initialScrollTop : 0,
        initialScrollRate : 0,
        initialDocumentHeight : 0,
        finalDocumentHeight : 0,
        maxScrollRate : 0,
        exitScrollRate : 0,
        lastClickHref : "",
        isRestoredScroll : 0,
        isHashScroll : 0,
        hasLateHeightGrowth : 0
    };

    this.start = function()
    {
        if( self.isStarted ){
            return self;
        }

        $(function(){
            if( self.isStarted ){
                return;
            }

            self.setupContext();

            if( self.shopId === null ){
                return;
            }

            self.blocks = $(".block_outer[id]");
            self.sessionKey = self.buildSessionKey();
            self.startedAtMs = self.getNowMs();
            self.initializeState();
            self.bind();
            self.isStarted = true;

            if( document.readyState === "complete" ){
                self.scheduleInitialStateFinalize();
            } else {
                self.scheduleInitialStateMaxWait();
            }
        });

        return self;
    }

    this.setupContext = function()
    {
        self.shopId = self.resolveNumberValue([
            self.options.shopId,
            self.options.shop_id,
            window.shop_id,
            window.shopId
        ]);

        self.pageId = self.resolveNumberValue([
            self.options.pageId,
            self.options.page_id,
            window.page_id,
            window.pageId
        ]);

        self.recordId = self.resolveNumberValue([
            self.options.recordId,
            self.options.record_id,
            window.record_id,
            window.recordId
        ]);

        self.usedcarId = self.resolveNumberValue([
            self.options.usedcarId,
            self.options.usedcar_id,
            window.usedcar_id,
            window.usedcarId
        ]);
    }

    this.resolveNumberValue = function( values )
    {
        var ret = null;

        $.each(values, function( index, value ){
            if( value === null || typeof value === "undefined" || value === "" ){
                return true;
            }

            if( $.isNumeric( value ) ){
                ret = parseInt( value, 10 );
                return false;
            }

            return true;
        });

        return ret;
    }

    this.initializeState = function()
    {
        self.state.initialScrollTop = self.getScrollTop();
        self.state.initialDocumentHeight = self.getDocumentHeight();
        self.state.finalDocumentHeight = self.state.initialDocumentHeight;
        self.state.initialScrollRate = self.calculateScrollRate(
            self.state.initialScrollTop,
            self.state.initialDocumentHeight,
            self.getWindowHeight()
        );
        self.state.exitScrollRate = self.state.initialScrollRate;
        self.state.maxScrollRate = self.state.initialScrollRate;
        self.state.isRestoredScroll = 0;
        self.state.isHashScroll = self.detectHashScroll();
        self.hasUnsentChanges = true;
    }

    this.bind = function()
    {
        $(window).on("scroll.ScrollSummaryLogger resize.ScrollSummaryLogger", function(){
            self.requestMeasure();

            if( !self.initialStateFinalized ){
                self.scheduleInitialStateFinalize();
            }
        });

        $(document).on("click.ScrollSummaryLogger", function( e ){
            self.captureLastClickHref( e );
        });

        $(window).on("load.ScrollSummaryLogger pageshow.ScrollSummaryLogger hashchange.ScrollSummaryLogger", function(){
            self.scheduleInitialStateFinalize();
        });

        $(window).on("pagehide.ScrollSummaryLogger beforeunload.ScrollSummaryLogger", function(){
            self.send(true);
        });

        $(document).on("visibilitychange.ScrollSummaryLogger", function(){
            if( document.visibilityState === "hidden" ){
                self.send(true);
            }
        });
    }

    this.scheduleInitialStateFinalize = function( delay )
    {
        var wait = typeof delay === "number" ? delay : self.getInitialStateFinalizeDelay();

        if( self.initialStateFinalized ){
            return;
        }

        if( self.initialStateFinalizeTimer !== null ){
            window.clearTimeout( self.initialStateFinalizeTimer );
        }

        self.initialStateFinalizeTimer = window.setTimeout(function(){
            self.finalizeInitialState();
        }, wait );
    }

    this.scheduleInitialStateMaxWait = function()
    {
        if( self.initialStateFinalized || self.initialStateMaxWaitTimer !== null ){
            return;
        }

        self.initialStateMaxWaitTimer = window.setTimeout(function(){
            self.finalizeInitialState();
        }, self.initialStateMaxWaitMs );
    }

    this.finalizeInitialState = function()
    {
        var scrollTop = 0,
            documentHeight = 0,
            initialScrollRate = 0,
            isHashScroll = 0;

        if( self.initialStateFinalized ){
            return;
        }

        if( self.initialStateFinalizeTimer !== null ){
            window.clearTimeout( self.initialStateFinalizeTimer );
            self.initialStateFinalizeTimer = null;
        }

        if( self.initialStateMaxWaitTimer !== null ){
            window.clearTimeout( self.initialStateMaxWaitTimer );
            self.initialStateMaxWaitTimer = null;
        }

        scrollTop = self.getScrollTop();
        documentHeight = self.getDocumentHeight();
        initialScrollRate = self.calculateScrollRate(
            scrollTop,
            documentHeight,
            self.getWindowHeight()
        );
        isHashScroll = self.detectHashScroll();

        self.state.initialScrollTop = scrollTop;
        self.state.initialDocumentHeight = documentHeight;
        self.state.initialScrollRate = initialScrollRate;
        self.state.finalDocumentHeight = documentHeight;
        self.state.exitScrollRate = initialScrollRate;
        self.state.maxScrollRate = Math.max( self.state.maxScrollRate, initialScrollRate );
        self.state.isHashScroll = isHashScroll;
        self.state.isRestoredScroll = self.detectRestoredScroll( scrollTop, isHashScroll );
        self.state.hasLateHeightGrowth = 0;
        self.initialStateFinalized = true;
        self.hasUnsentChanges = true;

        self.send();
    }

    this.requestMeasure = function()
    {
        if( self.ticking ){
            return;
        }

        self.ticking = true;

        if( window.requestAnimationFrame ){
            window.requestAnimationFrame(function(){
                self.measure();
                self.sendIfNeeded();
                self.ticking = false;
            });
        } else {
            window.setTimeout(function(){
                self.measure();
                self.sendIfNeeded();
                self.ticking = false;
            }, 16 );
        }
    }

    this.measure = function()
    {
        var scrollTop = self.getScrollTop(),
            documentHeight = self.getDocumentHeight(),
            windowHeight = self.getWindowHeight(),
            exitScrollRate = self.calculateScrollRate( scrollTop, documentHeight, windowHeight ),
            isChanged = false;

        if( self.state.exitScrollRate !== exitScrollRate ){
            self.state.exitScrollRate = exitScrollRate;
            isChanged = true;
        }

        if( exitScrollRate > self.state.maxScrollRate ){
            self.state.maxScrollRate = exitScrollRate;
            isChanged = true;
        }

        if( self.state.finalDocumentHeight !== documentHeight ){
            self.state.finalDocumentHeight = documentHeight;
            isChanged = true;
        }

        if(
            self.state.hasLateHeightGrowth === 0 &&
            ( documentHeight - self.state.initialDocumentHeight ) >= self.lateHeightGrowthThreshold
        ){
            self.state.hasLateHeightGrowth = 1;
            isChanged = true;
        }

        if( isChanged ){
            self.hasUnsentChanges = true;
        }
    }

    this.shouldSend = function()
    {
        if( !self.hasUnsentChanges ){
            return false;
        }

        if(
            self.lastSentMaxScrollRate === null ||
            self.lastSentExitScrollRate === null ||
            self.lastSentDocumentHeight === null
        ){
            return true;
        }

        if(
            self.state.maxScrollRate >= 100 &&
            self.lastSentMaxScrollRate < 100
        ){
            return true;
        }

        if( Math.abs( self.state.maxScrollRate - self.lastSentMaxScrollRate ) >= self.minSendScrollRateDiff ){
            return true;
        }

        if( Math.abs( self.state.exitScrollRate - self.lastSentExitScrollRate ) >= self.minSendScrollRateDiff ){
            return true;
        }

        if( self.state.finalDocumentHeight !== self.lastSentDocumentHeight ){
            return true;
        }

        return false;
    }

    this.sendIfNeeded = function()
    {
        if( !self.initialStateFinalized ){
            return;
        }

        if( self.shouldSend() ){
            self.send();
        }
    }

    this.send = function( isFinal )
    {
        var payload = null;

        if( !self.isStarted || self.shopId === null ){
            return;
        }

        if( !self.initialStateFinalized ){
            if( isFinal ){
                self.finalizeInitialState();
                return;
            }

            self.scheduleInitialStateFinalize();
            return;
        }

        self.measure();
        payload = self.buildPayload();

        if( isFinal && self.canUseBeacon() ){
            if( self.sendByBeacon( payload ) ){
                self.markSent( payload );
                return;
            }
        }

        if( self.isSending ){
            return;
        }

        self.isSending = true;

        $.ajax({
            url : self.endpoint,
            type : "POST",
            dataType : "json",
            data : payload,
            success : function(){
                self.markSent( payload );
            },
            error : function( jqXHR, errorThrown, textStatus ){
                if( window.console && console.log ){
                    console.log( jqXHR, errorThrown, textStatus );
                }
            },
            complete : function(){
                self.isSending = false;
            }
        });
    }

    this.buildPayload = function()
    {
        return {
            session_key : self.sessionKey,
            shop_id : self.shopId,
            page_id : self.nullableValue( self.pageId ),
            record_id : self.nullableValue( self.recordId ),
            usedcar_id : self.nullableValue( self.usedcarId ),
            url : location.href,
            max_scroll_rate : self.formatRate( self.state.maxScrollRate ),
            exit_scroll_rate : self.formatRate( self.state.exitScrollRate ),
            exit_block_outer_id : self.getCurrentBlockOuterId(),
            last_click_href : self.state.lastClickHref,
            stay_seconds : self.getStaySeconds(),
            initial_scroll_y : self.state.initialScrollTop,
            initial_scroll_rate : self.formatRate( self.state.initialScrollRate ),
            is_restored_scroll : self.state.isRestoredScroll,
            is_hash_scroll : self.state.isHashScroll,
            has_late_height_growth : self.state.hasLateHeightGrowth
        };
    }

    this.markSent = function( payload )
    {
        self.lastSentMaxScrollRate = parseFloat( payload.max_scroll_rate );
        self.lastSentExitScrollRate = parseFloat( payload.exit_scroll_rate );
        self.lastSentDocumentHeight = self.state.finalDocumentHeight;
        self.hasUnsentChanges = false;
    }

    this.canUseBeacon = function()
    {
        return typeof navigator.sendBeacon === "function" && typeof FormData !== "undefined";
    }

    this.sendByBeacon = function( payload )
    {
        var formData = new FormData(),
            accepted = false;

        $.each(payload, function( key, value ){
            formData.append( key, value );
        });

        accepted = navigator.sendBeacon( self.endpoint, formData );

        return accepted === true;
    }

    this.getCurrentBlockOuterId = function()
    {
        var centerX = Math.floor( $(window).width() / 2 ),
            centerY = Math.floor( self.getWindowHeight() / 2 ),
            currentElement = null,
            currentBlock = $(),
            fallbackBlockId = "",
            maxVisibleHeight = 0;

        if( document.elementFromPoint ){
            currentElement = document.elementFromPoint( centerX, centerY );

            if( currentElement !== null ){
                currentBlock = $( currentElement ).closest(".block_outer[id]");
            }
        }

        if( currentBlock.length > 0 ){
            return currentBlock.attr("id");
        }

        if( self.blocks.length === 0 ){
            self.blocks = $(".block_outer[id]");
        }

        self.blocks.each(function(){
            var rect = null,
                visibleTop = 0,
                visibleBottom = 0,
                visibleHeight = 0;

            if( !this.getBoundingClientRect ){
                return true;
            }

            rect = this.getBoundingClientRect();
            visibleTop = Math.max( rect.top, 0 );
            visibleBottom = Math.min( rect.bottom, self.getWindowHeight() );
            visibleHeight = visibleBottom - visibleTop;

            if( visibleHeight > maxVisibleHeight ){
                maxVisibleHeight = visibleHeight;
                fallbackBlockId = this.id;
            }

            return true;
        });

        return fallbackBlockId;
    }

    this.captureLastClickHref = function( e )
    {
        var link = $( e.target ).closest("a[href]");

        if( link.length === 0 ){
            return;
        }

        self.state.lastClickHref = $.trim( link.attr("href") || "" );
        self.hasUnsentChanges = true;
    }

    this.getScrollTop = function()
    {
        return Math.max( $(window).scrollTop(), 0 );
    }

    this.getNowMs = function()
    {
        return ( new Date() ).getTime();
    }

    this.getStaySeconds = function()
    {
        if( self.startedAtMs <= 0 ){
            return 0;
        }

        return Math.max( Math.round( ( self.getNowMs() - self.startedAtMs ) / 1000 ), 0 );
    }

    this.getDocumentHeight = function()
    {
        return Math.max(
            $(document).height(),
            document.documentElement ? document.documentElement.scrollHeight : 0,
            document.body ? document.body.scrollHeight : 0
        );
    }

    this.getWindowHeight = function()
    {
        return Math.max( $(window).height(), window.innerHeight || 0 );
    }

    this.calculateScrollRate = function( scrollTop, documentHeight, windowHeight )
    {
        var maxScrollableHeight = documentHeight - windowHeight,
            rate = 0;

        if( maxScrollableHeight <= 0 ){
            return 100;
        }

        rate = ( scrollTop / maxScrollableHeight ) * 100;
        rate = Math.min( Math.max( rate, 0 ), 100 );

        return parseFloat( rate.toFixed(2) );
    }

    this.detectHashScroll = function()
    {
        var hash = location.hash,
            hashKey = "",
            target = null,
            namedTargets = [];

        if( hash === "" ){
            return 0;
        }

        try {
            hashKey = decodeURIComponent( hash.replace( /^#/, "" ) );
        } catch( e ) {
            return 0;
        }

        if( hashKey === "" ){
            return 0;
        }

        if( document.getElementById ){
            target = document.getElementById( hashKey );

            if( target !== null ){
                return 1;
            }
        }

        if( document.getElementsByName ){
            namedTargets = document.getElementsByName( hashKey );

            if( namedTargets.length > 0 ){
                return 1;
            }
        }

        return 0;
    }

    this.detectRestoredScroll = function( scrollTop, isHashScroll )
    {
        var navigationType = self.getNavigationType();

        if( scrollTop <= 0 ){
            return 0;
        }

        if( isHashScroll === 1 ){
            return 0;
        }

        if( navigationType === "reload" || navigationType === "back_forward" ){
            return 1;
        }

        return 0;
    }

    this.getInitialStateFinalizeDelay = function()
    {
        var navigationType = self.getNavigationType();

        if( navigationType === "reload" || navigationType === "back_forward" ){
            return self.restoredScrollFinalizeDelayMs;
        }

        return self.initialStateFinalizeDelayMs;
    }

    this.getNavigationType = function()
    {
        var entries = [];

        if(
            window.performance &&
            typeof window.performance.getEntriesByType === "function"
        ){
            entries = window.performance.getEntriesByType("navigation");

            if(
                entries.length > 0 &&
                typeof entries[0].type !== "undefined"
            ){
                return entries[0].type;
            }
        }

        if( window.performance && window.performance.navigation ){
            switch( window.performance.navigation.type ){
            case 1:
                return "reload";
            case 2:
                return "back_forward";
            default:
                return "navigate";
            }
        }

        return "";
    }

    this.buildSessionKey = function()
    {
        return [
            "scroll",
            self.shopId,
            self.pageId === null ? "null" : self.pageId,
            self.recordId === null ? "null" : self.recordId,
            self.usedcarId === null ? "null" : self.usedcarId,
            ( new Date() ).getTime(),
            Math.floor( Math.random() * 1000000 )
        ].join("_");
    }

    this.formatRate = function( rate )
    {
        return parseFloat( rate ).toFixed(2);
    }

    this.nullableValue = function( value )
    {
        return value === null ? "" : value;
    }
}


window.startScrollSummaryLogger = function()
{
    if( typeof isOpen !== "undefined" && !isOpen ){
        return;
    }

    if(
        typeof window.__scrollSummaryLoggerInstance !== "undefined" &&
        window.__scrollSummaryLoggerInstance !== null &&
        window.__scrollSummaryLoggerInstance.isStarted
    ){
        return window.__scrollSummaryLoggerInstance;
    }

    var options = {
        shopId : typeof pm_shop_id !== "undefined" && pm_shop_id !== "" ? pm_shop_id : null,
        pageId : typeof PAGE_ID !== "undefined" && PAGE_ID !== "" ? PAGE_ID : null,
        recordId : typeof RECORD_ID !== "undefined" && RECORD_ID !== "" ? RECORD_ID : null,
        usedcarId : typeof usedCarId !== "undefined" && usedCarId !== "" ? usedCarId : null
    };

    window.__scrollSummaryLoggerInstance = new ScrollSummaryLogger( options );

    return window.__scrollSummaryLoggerInstance.start();
}



var ImageBoxSlider = function( imageBoxObject, callback, sliderWrapWidth )
{


    var self = this;
    var width = sliderWrapWidth;

    this.objects = {};

    this.imageOuterWidth = 0;

    this.current = 0;

    this.autoPlayable = false;

    this.autoplayduration = 5000;


    this.documentReady = function()
    {

        self.objects.visibleFrame = self.objects.imageBox.find(".imageBoxContentsWrapper");
        self.objects.imageOuter = self.objects.imageBox.find(".js-imageBoxContents");
        self.objects.imageBoxOuter = self.objects.imageOuter.find(".js-imageBoxOuter");
        self.objects.nextButton = self.objects.imageBox.find(".js-boxImageSliderController[data-controller-id=next]");
        self.objects.prevButton = self.objects.imageBox.find(".js-boxImageSliderController[data-controller-id=prev]");
        self.objects.progressItem = self.objects.imageBox.find(".boxImageSliderProgress");

        self.objects.controllerOuter = self.objects.imageBox.find(".js-controllerOuter")
        self.objects.progressOuter = self.objects.imageBox.find(".js-boxImageSliderProgressOuter");


        this.imageOuterLength = self.objects.imageOuter.length;
        this.imageOuterWidth = self.objects.imageOuter.outerWidth();
        var imageBoxSize = self.objects.imageBox.attr("data-size");

        // if( typeof fading === "undefined" ) self.objects.visibleFrame.attr("data-transparent", "1");
        if( typeof width === "undefined" ) width = this.imageOuterWidth;
        if( imageBoxSize === "max" ) width = "100%";
        if( imageBoxSize === "halfmax" ) width = "50%";

        imageBoxObject.css({"width" : width});

        self.objects.imageOuter.css({ "width" : self.model.calcOuterWidth(self.imageOuterLength) });

        if( self.objects.imageBox.attr("data-size") === "halfmax" ){

            self.objects.imageOuter.closest(".js-imageBox").css("width", "50%"); 
            self.objects.controllerOuter.css({"width" : "100%"});
            self.objects.progressOuter.css({"width" : "100%"});

        } else {

            self.objects.controllerOuter.css({"width" : width});
            self.objects.progressOuter.css({"width" : width});

        }


        if( $(window).width() < this.imageOuterWidth || design_number === "picture_main"){

            if( self.objects.imageBox.attr("data-size") !== "halfmax" ){

                self.objects.imageOuter.closest(".js-imageBox").css("width", "100%"); 
                self.objects.controllerOuter.css({"width" : "100%"});
                self.objects.progressOuter.css({"width" : "100%"});

            }

        }


        self.model.adjustVisibleFrame(
            self.objects.visibleFrame,
            self.imageOuterWidth,
            self.imageOuterLength
        );

    }


    this.windowLoad = function()
    {
        self.activateController();
        self.play(); 
        self.bind();

        setTimeout(function(){
            new ImageBoxHeightAdjuster( self.objects.imageBoxOuter, ".js-adjustHeightImage" ).windowLoad();
            self.autoPlayable = true;
            self.autoplay();
        }, 1000);
    }

    this.designChange = function()
    {
        self.activateController();
        setTimeout(function(){
            new ImageBoxHeightAdjuster( self.objects.imageBoxOuter, ".js-adjustHeightImage" ).windowLoad();
            self.autoPlayable = true;
            self.autoplay();
        }, 1000);
    }

    this.activateController = function()
    {
        self.model.addClassActive(
            self.objects.nextButton,
            self.objects.prevButton,
            self.objects.progressItem,
            self.imageOuterLength
        );
    }

    this.refreshCurrent = function( val )
    {
        self.current = self.current + val;
        if( self.current >= self.imageOuterLength ) self.current = 0;
        if( self.current < 0 ) self.current = self.imageOuterLength - 1;
    }

    this.play = function()
    {
        this.model.play( self.current, self.objects.visibleFrame, self.imageOuterWidth, self.imageOuterLength );
        this.model.refreshProgress( self.current, self.objects.progressItem );
    }

    this.clear = function()
    {
        clearTimeout( self.timer );
    }

    this.autoplay = function()
    {

        if ( self.autoPlayable && self.objects.imageBox.hasClass("sliderPassive")  ) {

            self.clear();
            self.timer = setTimeout( function(){

                if( self.objects.imageBox.hasClass("sliderPassive") ){

                    if ( self.objects.visibleFrame.hasClass("flickingSlide") ) {
                        self.objects.visibleFrame.removeClass("flickingSlide")
                    }

                    if ( !self.isOpenedImageController() ) {

                        self.refreshCurrent(1);
                        self.play();

                    }

                    self.autoplay();
                    self.callback( self );

                }

            }, self.autoplayduration);

        }

    }

    this.isOpenedImageController = function()
    {

        var isOpened = false;

        //スマホの時のみ分岐内に通る
        if( $(window).width() < 480 ){

            var currentSlideImageController = self.objects.imageBox.siblings(".boxImageImageControllerOuter");

            isOpened = currentSlideImageController.hasClass("js-activeBoxImageImageController");

        }

        return isOpened;

    }


    this.bind = function()
    {
        self.objects.nextButton.click(function(){
            if ( self.objects.visibleFrame.hasClass("flickingSlide") ) {
                self.objects.visibleFrame.removeClass("flickingSlide")
            }
            self.refreshCurrent(1);
            self.play();
            self.callback( self );
        });

        self.objects.prevButton.click(function(){
            if ( self.objects.visibleFrame.hasClass("flickingSlide") ) {
                self.objects.visibleFrame.removeClass("flickingSlide")
            }
           self.refreshCurrent( -1 );
           self.play();
           self.callback( self );
        });

        self.objects.progressItem.click(function(){
            if ( self.objects.visibleFrame.hasClass("flickingSlide") ) {
                self.objects.visibleFrame.removeClass("flickingSlide")
            }
            self.current = $(this).index();
            self.play();
            self.callback( self );
        });

        self.objects.imageOuter.hover(
            function(){
                self.autoPlayable = false;
                self.clear();
            },
            function(){
                self.autoPlayable = true;
                self.autoplay();
            }
        );

        // フリック操作中はスライドのautoplayを止める、離したら再開
        //スマホだけではなくPCでも出来るようにしたので、分岐させる
        if( $(window).width() <= 480 || isTablet ){
            downEventType = "touchstart";
            upEventType = "touchend";
        }else{
            downEventType = "mousedown";
            upEventType = "mouseup";
        }
        self.objects.imageBoxOuter.on( downEventType, function(){
            self.clear();
        });

        self.objects.imageBoxOuter.on( upEventType, function(){
            self.autoplay();
        });
    }


    this.__construct = function()
    {

        self.model = new ImageBoxSliderModel( self );
        self.objects.imageBox = imageBoxObject;

        if( typeof callback === "function" ){
            self.callback = callback;
        } else {
            self.callback = function(){}
        }

    }();

}

var ImageBoxSliderModel = function( controller )
{

    this.play = function(current, frame, width, length)
    {
        // var px = -1 * current * width;
        var percent = -1 * current * (100 / length);
        frame.css({
            "transform" : "translateX(" + percent + "%)",
            "webkitTransform" : "translateX(" + percent + "%)",
        });
    }

    this.refreshProgress = function( current, progressItem )
    {
        progressItem.removeClass("js-current").eq( current ).addClass("js-current");
    }


    this.addClassActive = function( next, prev, progress, length )
    {
        next.attr("data-active", 1);
        prev.attr("data-active", 1);

        progress.each(function( index ){
            if( index <= length - 1 ){
                $(this).attr("data-active", 1);
            }
        });
    }

    this.adjustVisibleFrame = function( frame, width, length )
    {
        frame.css("width", 100 * length + "%");
    }

    this.calcOuterWidth = function( length )
    {
        return (100 / length) + "%";
    }

    this.calcMaxHeight = function( imageOuter )
    {
        
        var maxHeight = 0;

        imageOuter.each(function(){
            var tmp = $(this).find("img").outerHeight();
            maxHeight = tmp > maxHeight ? tmp : maxHeight;
        });

        return maxHeight;

    }
}



var ImageBoxMultiSlider = function( imageBoxObject, callback )
{


    var self = this;
    var width = 0;

    this.objects = {};

    this.imageOuterWidth = 0;

    this.contentsDisplayNum;

    this.DesktopContentsDisplayNum = 3;
    this.MobilecontentsDisplayNum = 1;

    this.cloneSlideNum = this.DesktopContentsDisplayNum + 2; // はみ出すことを想定して、表示数 + 前後1つずつ 必要

    this.current = 0;

    this.buttonClickable = true;
 
    this.animationDuration = 300; // ms

    this.autoplayable = false;
    this.autoplayduration = 5000;


    this.documentReady = function()
    {

        self.objects.imageBoxContentsWrapper    = self.objects.imageBox.find(".imageBoxContentsWrapper");
        self.objects.imageBoxContentsSubWrapper = self.objects.imageBox.find(".imageBoxContentsSubWrapper");
        self.objects.imageBoxContents           = self.objects.imageBox.find(".js-imageBoxContents");
        self.objects.imageBoxOuter              = self.objects.imageBoxContents.find(".js-imageBoxOuter");
        self.objects.unUsedImageBox             = self.objects.imageBoxContents.find(".imageBlankOuter");
        self.objects.imageBoxNumberingOuter     = self.objects.imageBox.find(".js-numberingOuter");
        self.objects.imageBoxCurrentNumber      = self.objects.imageBox.find('.js-boxImageMultiSliderNumber[data-numbering = "current"]');
        self.objects.nextButton                 = self.objects.imageBox.find('.js-boxImageMultiSliderController[data-controller-id = "next"]');
        self.objects.prevButton                 = self.objects.imageBox.find('.js-boxImageMultiSliderController[data-controller-id = "prev"]');
        self.objects.hiddenNextButton           = self.objects.imageBox.find('.js-hiddenController[data-controller-id = "next"]');
        self.objects.hiddenPrevButton           = self.objects.imageBox.find('.js-hiddenController[data-controller-id = "prev"]');
        self.objects.progressItem               = self.objects.imageBox.find(".boxImageSliderProgress");

        self.objects.imageBoxCaptionHead        = self.objects.imageBoxContents.find(".captionHead");
        self.objects.imageBoxCaptionBody        = self.objects.imageBoxContents.find(".captionBody");

        self.objects.controllerOuter            = self.objects.imageBox.find(".js-controllerOuter")
        self.objects.progressOuter              = self.objects.imageBox.find(".js-boxImageSliderProgressOuter");


        self.objects.visibleFrame = self.objects.imageBoxContentsWrapper;
        

        if( self.objects.imageBoxContentsWrapper.outerWidth() < 480 )
        {
            // スマホ幅に3枚表示はさすがにキツイ
            this.contentsDisplayNum = this.MobilecontentsDisplayNum;

        } else {

            this.contentsDisplayNum = this.DesktopContentsDisplayNum; 

        }

        this.imageOuterLength = self.objects.imageBoxContents.length;
        this.usedImageOuterLength = this.imageOuterLength - self.objects.unUsedImageBox.length;

        self.setPositions();

        self.objects.imageBox.attr( "data-loading", "0" );
        self.objects.imageBox.data( "loading", "0" );

    }


    this.setPositions = function(){

        this.imageOuterWidth = self.objects.imageBoxContentsWrapper.outerWidth() / this.contentsDisplayNum;

        this.imageOuterMarginLeft = self.objects.imageBoxContents.css("margin-left");
        this.imageOuterMarginLeft = parseInt( this.imageOuterMarginLeft );

        this.imageOuterMarginRight = self.objects.imageBoxContents.css("margin-right");
        this.imageOuterMarginRight = parseInt( this.imageOuterMarginRight );


        self.objects.imageBoxContentsSubWrapper.css({ "width" : this.imageOuterWidth * (this.imageOuterLength + this.cloneSlideNum )});
        self.objects.imageBoxContents.css({ "width" : this.imageOuterWidth - this.imageOuterMarginLeft - this.imageOuterMarginRight});
        self.objects.controllerOuter.css({"width" : self.objects.imageBox.outerWidth()});
        self.objects.progressOuter.css({"width" : self.objects.imageBox.outerWidth()});

    }


    this.windowLoad = function()
    {

        self.createClone();

        self.setPositions();

        self.activateController();

        self.objects.imageBoxContentsWrapper.removeClass("loadingNow");
        self.objects.imageBoxContentsSubWrapper.removeClass("loadingNow");

        self.play();

        self.bind();

        setTimeout(function(){
            new ImageBoxHeightAdjuster( self.objects.imageBoxOuter, ".js-adjustHeightImage" ).windowLoad();
            self.removeClass();
            self.removeTitle();
            self.autoplayable = true;
            self.autoplay();
        }, 1000);

    }

    this.designChange = function()
    {
        self.objects.imageBoxContentsWrapper    = self.objects.imageBox.find(".imageBoxContentsWrapper");
        self.objects.imageBoxContentsSubWrapper = self.objects.imageBox.find(".imageBoxContentsSubWrapper");
        self.objects.imageBoxContents           = self.objects.imageBox.find(".js-imageBoxContents");
        self.objects.imageBoxOuter              = self.objects.imageBoxContents.find(".js-imageBoxOuter");
        self.objects.unUsedImageBox             = self.objects.imageBoxContents.find(".imageBlankOuter");
        self.objects.imageBoxNumberingOuter     = self.objects.imageBox.find(".js-numberingOuter");
        self.objects.imageBoxCurrentNumber      = self.objects.imageBox.find('.js-boxImageMultiSliderNumber[data-numbering = "current"]');
        self.objects.nextButton                 = self.objects.imageBox.find('.js-boxImageMultiSliderController[data-controller-id = "next"]');
        self.objects.prevButton                 = self.objects.imageBox.find('.js-boxImageMultiSliderController[data-controller-id = "prev"]');
        self.objects.hiddenNextButton           = self.objects.imageBox.find('.js-hiddenController[data-controller-id = "next"]');
        self.objects.hiddenPrevButton           = self.objects.imageBox.find('.js-hiddenController[data-controller-id = "prev"]');
        self.objects.progressItem               = self.objects.imageBox.find(".boxImageSliderProgress");

        self.objects.imageBoxCaptionHead        = self.objects.imageBoxContents.find(".captionHead");
        self.objects.imageBoxCaptionBody        = self.objects.imageBoxContents.find(".captionBody");

        self.objects.controllerOuter            = self.objects.imageBox.find(".js-controllerOuter")
        self.objects.progressOuter              = self.objects.imageBox.find(".js-boxImageSliderProgressOuter");


        self.objects.visibleFrame = self.objects.imageBoxContentsWrapper;
        

        if( self.objects.imageBoxContentsWrapper.outerWidth() < 480 )
        {
            // スマホ幅に3枚表示はさすがにキツイ
            self.contentsDisplayNum = self.MobilecontentsDisplayNum;

        } else {

            self.contentsDisplayNum = self.DesktopContentsDisplayNum; 

        }

        self.imageOuterLength = self.objects.imageBoxContents.length;
        self.usedImageOuterLength = self.imageOuterLength - self.objects.unUsedImageBox.length;
        self.setPositions();
        self.activateController();
        self.objects.imageBoxContentsWrapper.removeClass("loadingNow");
        self.objects.imageBoxContentsSubWrapper.removeClass("loadingNow");
        setTimeout(function(){
            new ImageBoxHeightAdjuster( self.objects.imageBoxOuter, ".js-adjustHeightImage" ).windowLoad();
            self.removeClass();
            self.removeTitle();
            self.autoplayable = true;
            self.autoplay();
        }, 1000);
    }



    this.createClone = function()
    {

        // 1,2,3,4番目をhtmlの末尾に
        self.objects.imageBoxContents.eq(0).clone().appendTo( self.objects.imageBoxContentsSubWrapper );
        self.objects.imageBoxContents.eq(1).clone().appendTo( self.objects.imageBoxContentsSubWrapper );
        self.objects.imageBoxContents.eq(2).clone().appendTo( self.objects.imageBoxContentsSubWrapper );
        self.objects.imageBoxContents.eq(3).clone().appendTo( self.objects.imageBoxContentsSubWrapper );

        self.objects.imageBoxContents.eq(-1).clone().prependTo( self.objects.imageBoxContentsSubWrapper );

        // オブジェクトの取り直し
        self.objects.imageBoxContents = self.objects.imageBox.find(".js-imageBoxContents");

    }


    this.activateController = function()
    {
        self.model.addClassActive(
            self.objects.nextButton,
            self.objects.prevButton,
            self.objects.progressItem,
            self.imageOuterLength
        );
    }

    this.refreshCurrent = function( val )
    {
        if ($('body').attr('data-use-preview-mode') === "1") {
            self.current = self.current + val;
            if( self.current >= self.usedImageOuterLength ) self.current = 0;
            if( self.current < 0 ) self.current = self.usedImageOuterLength - 1;

        }else{

            self.current = self.current + val;
            if( self.current >= self.imageOuterLength ) self.current = 0;
            if( self.current < 0 ) self.current = self.imageOuterLength - 1;
        }

    }

    this.play = function( move )
    {
        this.model.play( self.current, self.objects.imageBoxContentsSubWrapper, self.objects.imageBoxNumberingOuter, self.imageOuterWidth, self.imageOuterLength, self.objects.imageBoxCurrentNumber, move, self.animationDuration );
        this.model.refreshProgress( self.current, self.objects.progressItem );

        setTimeout( function(){

            self.buttonClickable = true;

        }, self.animationDuration + 50 );

    }

    this.clear = function()
    {
        clearTimeout( self.timer );
    }

    this.autoplay = function()
    {

        if ( self.autoplayable && self.objects.imageBox.hasClass("slideActive") ) {

            self.clear();
            self.timer = setTimeout( function(){

                if( self.objects.imageBox.hasClass("slideActive")  ){

                    if ( self.objects.imageBoxContentsWrapper.hasClass("flickingSlide") ) {
                        self.objects.imageBoxContentsWrapper.removeClass("flickingSlide")
                    }

                    if ( !self.isOpenedImageController() ) {

                        self.refreshCurrent(1);
                        self.play("next");

                    }

                    self.autoplay();
                    self.callback( self );

                }

            }, self.autoplayduration);

        }

    }

    this.isOpenedImageController = function()
    {

        var isOpened = false;

        //スマホの時のみ分岐内に通る
        if( self.objects.imageBoxContentsWrapper.outerWidth() < 480 ){

            var currentNumber = self.objects.imageBoxNumberingOuter.find(".boxImageMultiSliderNumber[data-numbering='current']").text(),
                currentNumber = Number(currentNumber) - 1,
                currentSlide = self.objects.imageBox.find(".js-imageBoxContents[data-slider-order='" + currentNumber + "']"),
                currentSlideImageController = currentSlide.find(".boxImageImageControllerOuter");

            isOpened = currentSlideImageController.hasClass("js-activeBoxImageImageController");

        }

        return isOpened;

    }

    this.rePosition = function()
    {

        this.model.rePosition( self.current, self.objects.imageBoxContentsSubWrapper, self.imageOuterWidth );

    }

    this.bind = function()
    {

        $(window).resize(function() {
            self.setPositions();
            self.rePosition();
        });

        self.objects.imageBoxOuter.on({
            'mouseenter': function(){
                self.autoplayable = false;
                self.clear();
            },
            'mouseleave': function(){
                self.autoplayable = true;
                self.autoplay();
            }

        });

        self.objects.imageBoxCaptionHead.on({
            'mouseenter': function(){
                self.autoplayable = false;
                self.clear();
            },
            'mouseleave': function(){
                self.autoplayable = true;
                self.autoplay();
            }

        });

        self.objects.imageBoxCaptionBody.on({
            'mouseenter': function(){
                self.autoplayable = false;
                self.clear();
            },
            'mouseleave': function(){
                self.autoplayable = true;
                self.autoplay();
            }

        });

        $("#syde-wysiwyg_area").on({
            'mouseenter': function(){
                self.autoplayable = false;
                self.clear();
            },
            'mouseleave': function(){
                self.autoplayable = true;
                self.autoplay();
            }

        });

        self.objects.nextButton.click(function(){

            if( self.buttonClickable ){

                if ( self.objects.imageBoxContentsWrapper.hasClass("flickingSlide") ) {
                    self.objects.imageBoxContentsWrapper.removeClass("flickingSlide")
                }

                self.buttonClickable = false;

                self.clear();
                self.refreshCurrent(1);
                self.play("next");
                self.callback( self );

            }

        });

        self.objects.prevButton.click(function(){

            if( self.buttonClickable ){

                if ( self.objects.imageBoxContentsWrapper.hasClass("flickingSlide") ) {
                    self.objects.imageBoxContentsWrapper.removeClass("flickingSlide")
                }

                self.buttonClickable = false;

                self.clear();
                self.refreshCurrent( -1 );
                self.play("prev");
                self.callback( self );

            }

        });

        // フリック操作中はスライドのautoplayを止める、離したら再開
        //スマホだけではなくPCでも出来るようにしたので、分岐させる
        if( $(window).width() <= 480 || isTablet ){
            downEventType = "touchstart";
            upEventType = "touchend";
        }else{
            downEventType = "mousedown";
            upEventType = "mouseup";
        }

        self.objects.imageBoxContentsSubWrapper.on( downEventType, function(){
            self.clear();
        });

        self.objects.imageBoxContentsSubWrapper.on( upEventType, function(){
            self.autoplay();
        });

    }

    this.removeClass = function(){


        self.objects.nextButton.removeClass("loadingNow");
        self.objects.prevButton.removeClass("loadingNow");
    
    }

    this.removeTitle = function(){
        self.objects.nextButton.attr("title","");
        self.objects.prevButton.attr("title","");
    }

    this.__construct = function()
    {

        self.model = new ImageBoxMultiSliderModel( self );
        self.objects.imageBox = imageBoxObject;

        if( typeof callback === "function" ){
            self.callback = callback;
        } else {
            self.callback = function(){}
        }

    }();

}

var ImageBoxMultiSliderModel = function( controller )
{

    this.play = function(current, frame, numberWrapper, width, length, numberDisplay, move, duration)
    {
        var targetNum = current;
        var likeInfinite = false;

        // 次へをおして0に進む場合
        if( move === "next" && current === 0 ){

            targetNum = 0;
            likeInfinite = true;

        }

        // 前へをおして末尾に進む場合
        if( move === "prev" && current === length - 1 ){

            targetNum = length - 1;
            likeInfinite = true;

        }

        frame.attr("data-middle-slider-order", targetNum);

        var px = this.calcImageCenteringPx( targetNum, width, frame );

        if( likeInfinite ){

            this.blink(numberWrapper);

            setTimeout( function(){ // アニメーションを切って

                frame.css({
                    "transition-duration" : "0s"
                });

                setTimeout( function(){ // 正しいポジションに更新

                    frame.css({
                        "left" : px + "px"
                    });

                }, 25);

                setTimeout( function(){

                    frame.css({
                        "transition-duration" : ""
                    });

                }, 50);


            }, duration );

        }else{
            frame.css({
                "left" : px + "px"
            });
        }

        numberDisplay.text(current + 1);

    }

    this.blink = function( target ){

        target.addClass( "blink" );

        setTimeout( function(){

            target.removeClass( "blink" );

        }, 300);

    }

    this.refreshProgress = function( current, progressItem )
    {
        progressItem.removeClass("js-current").eq( current ).addClass("js-current");
    }


    this.addClassActive = function( next, prev, progress, length )
    {
        next.attr("data-active", 1);
        prev.attr("data-active", 1);

        progress.each(function( index ){
            if( index <= length - 1 ){
                $(this).attr("data-active", 1);
            }
        });
    }

    this.adjustVisibleFrame = function( frame, width, length )
    {
        frame.css("width", 100 * length + "%");
    }

    this.calcOuterWidth = function( length )
    {
        return (100 / length) + "%";
    }

    this.rePosition = function( current, frame, width )
    {

        var px = this.calcImageCenteringPx( current, width, frame );

        frame.css({
            "left" : px + "px"
        });

    }

    this.calcMaxHeight = function( imageOuter )
    {
        
        var maxHeight = 0;

        imageOuter.each(function(){
            var tmp = $(this).find("img").outerHeight();
            maxHeight = tmp > maxHeight ? tmp : maxHeight;
        });

        return maxHeight;

    }

    this.calcImageCenteringPx = function( targetNum, width, frame )
    {

        var px = null;

        if ( frame.closest(".imageBoxContentsWrapper").outerWidth() < 480 ) {

            px = -1 * ( targetNum + 1 ) * width;

        }else{

            px = -1 * targetNum * width;

        }

        return px;

    }

}



var ImageBoxHeightAdjuster = function( imageBoxContents, imageSelectors )
{

    var self = this;

    this.maxHeight = 0;

    this.windowLoad = function()
    {
        self.imageBoxContents.each(function(){
            var tmp = $(this).find( imageSelectors ).outerHeight();
            self.maxHeight = tmp > self.maxHeight ? tmp : self.maxHeight;
        });

        // 別にどっちでやっても良いが、滑らかに動かしたいなら animate() 推奨。transition は影響範囲がでかすぎる
        // imageBoxContents.css("height", self.maxHeight);
        imageBoxContents.animate({"height":self.maxHeight}, 300, "easeOutExpo");

        // iframeはtopの値を調整
        self.imageBoxContents.each(function(){

            if( $(this).find( imageSelectors ).prop("tagName") === "IFRAME" ){

                var tmp = $(this).find( imageSelectors ).outerHeight();
                var top = (self.maxHeight - tmp) / 2;

                $(this).find( imageSelectors ).animate({"top":top}, 300, "easeOutExpo");

            }

        });
        
    }

    this.__construct = function()
    {
        self.imageBoxContents = imageBoxContents;
    }();


}


var ImageLoad = function( images )
{

    var self = this;

    this.interval;
    this.timeout;

    this.time = {
        interval : 10,
        limit : 10
    };


    this.loadObserve = function()
    {
        self.interval = setInterval(function(){

            var loaded = true;

            self.images.each(function( index ){

                if( $(this).height() == 0 ) loaded = false;

                if( index == self.images.length - 1 && loaded ){
                    clearInterval(self.interval);
                    clearTimeout(self.timeout);
                    self.def.resolve();
                }
            });

        }, self.time.interval );
    }


    this.limitObserve = function()
    {
        self.timeout = setTimeout(function(){
            clearInterval(self.interval);
            clearTimeout( self.timeout );
            self.def.resolve();
        }, self.time.limit);
    }


    this.run = function()
    {
        self.limitObserve();
        self.loadObserve();
        return self.def.promise();
    }


    this.__constructor = function()
    {
        self.def = $.Deferred();
        self.images = images;
    }();

}

/**
 * ウインドウ領域内・要素の表示/非表示監視ライブラリ
 * InternalObserverAPIに対応してる場合はAPIを利用
 * 以下使用例　実際にはワンラインメソッドでOK
 *
 * ex)
 * var instance = new VisibleObserverVertical();
 * instance.observe(
 *     ".items",
 *     {
 *         start : "10%", // ウインドウ上辺から、監視領域上端までのpadding（%, px指定対応）
 *         end : "50%"    // ウインドウ上辺から、監視領域下端までのpadding（%, px指定対応）
 *     },
 *     { 
 *         visible : function( jqObject, entry ){}, // 領域内に入ってきた際の挙動
 *         hidden : function( jqObject, entry ){}   // 領域内から出ていった際の挙動
 *     }
 * )
 * 
 */



var VO_INSTANCE;

// かったるいんでワンライン化
var observeVisibleVertical = function( selector, ranges, callbacks )
{
    if( typeof VO_INSTANCE === "undefined" ){
        VO_INSTANCE = new VisibleObserverVertical();
    }

    return VO_INSTANCE.observe(selector, ranges, callbacks);
};



var VisibleObserverVertical = function()
{

    var self = this;

    this.validRangePattern = /^((\d|\.|\-)+)(px|\%)$/;

    this.shouldDebug = false;

    this.observers = [];


    this.drawLine = function( top, bottom )
    {
        if( self.shouldDebug ){

            var tmp = $("<div>").css({
                position : "fixed",
                left : 0,
                width : "100%",
                height : "1px",
                backgroundColor : "#f00",
                zIndex : 200000
            });

            $("body").append( tmp.clone().css("top", top) ).append( tmp.clone().css("top", bottom ) );

        }
    }


    this.isValidRange = function( range )
    {
        return range.match( self.validRangePattern ) !== null;
    }


    this.isValidArguments = function( ranges, callbacks )
    {
        var ret = true;

        for( var key in ranges ){
            if( !self.isValidRange( ranges[ key ] ) ){
                ret = false;
            }
        }

        if( typeof callbacks.visible === "undefined" || typeof callbacks.hidden === "undefined" ){
            ret = false;
        }

        return ret;
    }


    this.range2Object = function( range )
    {
        var m = range.match( self.validRangePattern );
        return m !== null ? { value : m[1], unit : m[3] } : { value : 0, unit : "px" };
    }


    this.observe = function( selector, ranges, callbacks )
    {

        if( self.isValidArguments( ranges, callbacks ) ){
            return self.instance.observe( selector, ranges, callbacks );
        } else {
            console.log("VisibleObserverVertical::Error( invalid argument )", ranges, callbacks );
        }
        
    }


    this.__construct = function()
    {

        if( typeof IntersectionObserver !== "undefined" ){
            self.instance = new VisibleObserverVerticalByIntersection( self );
        } else {
            self.instance = new VisibleObserverVerticalByScroll( self );
        }

    }()

}




var VisibleObserverVerticalByIntersection = function( parent )
{

    var self = this;

    this.parent;

    this.validRangePattern = /^((\d|\.)+)(px|\%)$/;


    this.range2rootMargin = function( ranges )
    {

        var top = "0px",
            bottom = "0px";

        for( var key in ranges ){

            var tmp = self.parent.range2Object( ranges[key] );


            switch( key ){
                case "start":

                    switch( tmp.unit ){
                        case "%":
                        case "px":
                            top = -1 * tmp.value + tmp.unit;
                        break;
                    }

                break;

                case "end":

                    switch( tmp.unit ){
                        case "%":
                            bottom = -1 * ( 100 - tmp.value ) + tmp.unit;
                        break;
                        case "px":
                            bottom = -1 * ( $(window).height() - tmp.value ) + tmp.unit;
                        break;
                    }
                    
                break;
            }

        }

        return top + " " + "0px" + " " + bottom + " " + "0px";

    }


    this.buildCallback = function( visibleCallback, hiddenCallback )
    {
        return function( entries )
        {
            entries.forEach( function( entry ){

                if( entry.isIntersecting ){

                    visibleCallback( $(entry.target), entry );

                } else {

                    hiddenCallback( $(entry.target), entry );

                }

            });
        }
    }


    this.observe = function( selector, ranges, callbacks )
    {

        self.parent.drawLine( ranges.start, ranges.end );

        var nodes = document.querySelectorAll( selector ),
            option = {
                rootMargin : self.range2rootMargin(ranges)
            };
        
        var io = new IntersectionObserver(
            self.buildCallback( callbacks.visible, callbacks.hidden ),
            option
        );

        nodes.forEach(function( node ){
            io.observe( node );
        });

        self.parent.observers.push(io);

        return {
            destroy : function(){
                io.disconnect();
            }
        }
    }


    this.__construct = function()
    {
        self.parent = parent;
    }();

}




var VisibleObserverVerticalByScroll = function( parent )
{

    var self = this;

    this.observing;

    this.waitms = 50;

    this.queues = [];


    this.ranges2Offset = function( ranges )
    {

        var res = {
            top : null,
            bottom : null,
        };

        for(  var key in ranges ){

            var tmp = self.parent.range2Object( ranges[key] );

            switch( key ){

                case "start":

                    switch( tmp.unit ){
                        case "%":
                            res.top = Math.round( $(window).height() * ( ( tmp.value * 0.01 ) ) );
                        break;

                        case "px":
                            res.top = Number( tmp.value );
                        break;
                    }

                break;

                case "end":

                    switch( tmp.unit ){
                        case "%":
                            res.bottom = Math.round( $(window).height() * ( tmp.value * 0.01 ) );
                        break;

                        case "px":
                            res.bottom = $(window).height() - Number( tmp.value );
                        break;
                    }

                break;

            }

        };

        return res;
    }


    this.action = function( scrollTop, scrollLeft )
    {

        if( self.queues.length > 0 ){

            self.queues.forEach(function( queue ){

                var topLine = scrollTop + queue.offset.top,
                    bottomLine = scrollTop + queue.offset.bottom;

                self.parent.drawLine( queue.offset.top, queue.offset.bottom );

                queue.jqObject.each(function(){

                    var offset = $(this).offset(),
                        objectTop = offset.top,
                        objectBottom = objectTop + $(this).height();
                        objectCenter = objectTop + $(this).height() / 2;

                    var flag1 = ( objectTop >= topLine && objectTop <= bottomLine ) || ( objectBottom >= topLine && objectBottom <= bottomLine ),
                        flag2 = ( topLine >= objectTop && topLine <= objectBottom ) || ( bottomLine >= objectTop && bottomLine <= objectBottom );

                    if( flag1 || flag2 ){
                        queue.callbacks.visible( $(this), null );
                    } else {
                        queue.callbacks.hidden( $(this), null );
                    }

                });

            });

        }
        
    }


    this.observe = function( selector, ranges, callbacks )
    {

        var jqObject = $(selector),
            offset = self.ranges2Offset( ranges );
        
        this.queues.push({
            jqObject : jqObject,
            offset : offset,
            callbacks : callbacks
        });

        self.action($(window).scrollTop(), $(window).scrollLeft());
        return {
            destroy: function() {
                self.queues = self.queues.filter(q => q !== queue);
            }
        };
    }


    this.__construct = function()
    {

        self.parent = parent;

        $(window).on("scroll.visibleobserver",function(e){

            if( !self.observing ){

                self.observing = true;

                self.action( $(window).scrollTop(), $(window).scrollLeft() );
                
                setTimeout(function(){
                    self.observing = false;
                }, self.waitms);
            
            }

        });

    }()

}

var HtmlSplitter = function( parentElement )
{


    var self = this;

    this.originalHtml = "";


    this.split = function()
    {

        var decoded  = self.htmlspecialcharsDecode(self.originalHtml, "ENT_QUOTES");

        var tmp = [];

        var tagMode = false;

        for( var i = 0; i < decoded.length; i++ ){

            var string = decoded[i];

            switch( string ){

                case "<":

                    tagMode = true;
                    tmp.push( string );

                break;

                case ">":
                    tagMode = false;
                    tmp.push( string );
                break;


                // 空文字は飛ばす
                case " ":

                    if( tagMode ){
                        tmp.push( string );
                    } else {
                        tmp.push( " " ); // タグ外スペース => 非アニメーション文字扱い
                    }

                break;


                default:

                    if( !tagMode ){
                        string = self.wrap( string );
                    }

                    tmp.push( string );

                break;

            }

        }

        var encoded = tmp.join("");

        return encoded;

    }




    this.wrap = function( string )
    {
        return '<span class = "splited">' + string + '</span>';
    }




    /**
     * 引用）https://9-bb.com/javascript-htmlspecialchars_decode/
     * @param  {[type]} string [description]
     * @param  {[type]} style  [description]
     * @return {[type]}        [description]
     */
    this.htmlspecialcharsDecode = function( string, style )
    {

        var optTemp = 0,
            i = 0,
            noquotes = false;

        if (typeof quote_style === 'undefined') {
            quote_style = 2;
        }

        if( string === undefined || string === null ){
            return "";
        }
        
        string = string.toString()
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>');

        var OPTS = {
            'ENT_NOQUOTES': 0,
            'ENT_HTML_QUOTE_SINGLE': 1,
            'ENT_HTML_QUOTE_DOUBLE': 2,
            'ENT_COMPAT': 2,
            'ENT_QUOTES': 3,
            'ENT_IGNORE': 4
        };
        
        if (quote_style === 0) {
            noquotes = true;
        }
        
        if (typeof quote_style !== 'number') {
        
            // Allow for a single string or an array of string flags
            quote_style = [].concat(quote_style);

            for (i = 0; i < quote_style.length; i++) {
                // Resolve string input to bitwise e.g. 'PATHINFO_EXTENSION' becomes 4
                if (OPTS[quote_style[i]] === 0) {
                noquotes = true;
                } else if (OPTS[quote_style[i]]) {
                optTemp = optTemp | OPTS[quote_style[i]];
                }
            }
            
            quote_style = optTemp;
            
        }
        
        if (quote_style & OPTS.ENT_HTML_QUOTE_SINGLE) {
            string = string.replace(/&#0*39;/g, "'"); // PHP doesn't currently escape if more than one 0, but it should
            // string = string.replace(/&apos;|&#x0*27;/g, "'"); // This would also be useful here, but not a part of PHP
        }
        
        if (!noquotes) {
            string = string.replace(/&quot;/g, '"');
        }
        
        // Put this in last place to avoid escape being double-decoded
        string = string.replace(/&amp;/g, '&');
        return string;
        
    }
    


    this.__construct = function()
    {
        self.parentElement = parentElement;
        self.originalHtml = $(parentElement).html();
    }()



}

var H2Animator = function( designNumber, animationName )
{


    var self = this;


    this.animationName;
    this.isRandom = false;

    this.animateObjCount = 0;

    this.fn = {
        model : null,
        // splitter : null
    };

    // 元のHTMLを代入
    this.archive = {};




    /**
     * 発火前の分割・準備処理
     * @param  {[type]} jqH2Object [description]
     * @return {[type]}            [description]
     */
    this.ready = function( jqH2Object )
    {

        var parent = jqH2Object.find("[id != '']"),
            date   = new Date();

        if( parent.length === 0 ){
            parent = jqH2Object;
        }

        if( self.animateOverwrited(parent) ){

            // 個別設定アニメーションを優先

        } else {

            // 特殊アニメーション
            if( self.fn.model.isExtraAnimation( self.animationName ) ){

                switch( self.animationName ){

                    case "label":

                        self.fn.extraAnimationLabelModel.ready( parent[0] );

                    break;

                }


            } else {

                var parentElement = parent[0],
                    timestamp = Math.floor( date.getTime() / 1000 ) + Math.random(),
                    spliter = new HtmlSplitter( parentElement );

                if( self.animationName != "none" && !self.fn.model.extraAnimatingTyping ){

                    $(parentElement).html( spliter.split() );

                }

                self.fn.model.animateAttribute( parentElement, timestamp, self.isRandom, self.animateObjCount );

                self.archive[ String(timestamp) ] = {
                    parentElement : parentElement,
                    originalHtml : spliter.originalHtml,
                };

                self.animateObjCount++;

            }

        }

    }



    /**
     * オブジェクト内に個別アニメーションテキストが既にあるか否か
     * @param  {[type]} jqH2Object [description]
     * @return {[type]}            [description]
     */
    this.animateOverwrited = function( jqH2Object )
    {

        var tmp = jqH2Object.find(".splited");

        return tmp.length > 0;

    }


    /**
     * 発火処理
     * @param  {[type]} jqH2Object [description]
     * @return {[type]}                [description]
     */
    this.fire = function( jqH2Object )
    {

        if( self.fn.model.isExtraAnimation( self.animationName ) ){

            var parent = jqH2Object.find("[id != '']");

            if( parent.length === 0 ){
                parent = jqH2Object;
            }

            switch( self.animationName ){

                case "label":

                    self.fn.extraAnimationLabelModel.run(
                        parent[0]
                    );

                break;

            }

        } else {

            jqH2Object.find(".splited").addClass("fired");

        }

    }




    /**
     * アニメーション発火レンジ取得
     * @return {[type]} [description]
     */
    this.getRange = function()
    {
        return self.fn.model.getConfig( "range" );
    }




    /**
     * デフォルトのHTML文字列を取得（直感編集用）
     * @param  {[type]} timestamp [description]
     * @return {[type]}           [description]
     */
    this.getOriginalHtml = function( timestamp )
    {
        var archive = self.archive[ timestamp ];
        return archive.originalHtml;
    }




    /**
     * アニメーションする？
     * @return {[type]} [description]
     */
    this.shouldAnimate = function()
    {
        return typeof self.animationName !== "null";
    }


    this.__construct = function(  )
    {

        self.designNumber = designNumber;
        self.animationName = animationName;
        self.fn.model = new H2AnimateModel( self.animationName );
        self.isRandom = self.animationName === "random";

        self.fn.extraAnimationLabelModel = new H2ExtraAnimationLabelModel();

    }()


}



var H2ExtraAnimationLabelModel = function()
{


    var self = this;

    this.const = {
        delayInterval : 0.2
    };


    this.ready = function( parentElement )
    {

        var controller = new TextContentBuildLineController( parentElement );

        var offsets = controller.main();

        $( parentElement ).addClass("h2-animation__label-outer h2-animation__label-outer--ready");

        // element.offsettop とは挙動違うんで注意
        var pt = $(parentElement).offset().top,
            pl = $(parentElement).offset().left;

        for( var index in offsets ){

            var offset = offsets[index];
                delay = self.const.delayInterval * index,
                object = $(`<span class = "h2-animation__label-item h2-animation__label-item--ready"></span>`);

            if( $(parentElement).css("display") === "inline" ){

                object.css({
                    top : offset.top - pt,
                    left : offset.left - pl,
                    width: "0px",
                    height : offset.height
                });

            } else {

                object.css({
                    top : offset.top,
                    left : offset.left,
                    width: "0px",
                    height : offset.height
                });

            }

            object.attr("data-width", offset.width);

            $(parentElement).append( object );

        }


    }


    this.run = function( parentElement )
    {

        // クラスの付け方が汚い

        if( !$(parentElement).hasClass("h2-animation__label-item--runned") ){

            $(parentElement).addClass("h2-animation__label-item--runned");

            setTimeout(function(){

                var intervalAnimated = 0;

                $(parentElement).find(".h2-animation__label-item").each(function( index ){

                    var item = $(this),
                        interval = {
                            visible : self.const.delayInterval * 1000 * ( index + 1 ),
                            hidden : self.const.delayInterval * 1000 * ( index + 1 ) + 500
                        };

                    intervalAnimated = interval.hidden;

                    setTimeout(function(){

                        item.addClass("h2-animation__label-item--animating");

                        item.css("width", item.attr("data-width"));

                    },  interval.visible );

                    setTimeout(function(){

                        item.removeClass("h2-animation__label-item--animating");
                        item.addClass("h2-animation__label-item--animated");

                        item.css({
                            left : item.attr("data-width") + "px",
                            width : "0px"
                        });
                    },  interval.hidden);
                

                });

                setTimeout(function(){

                    $(parentElement).removeClass("h2-animation__label-outer--ready").addClass("h2-animation__label-outer--lined");

                    setTimeout(function(){
                        $(parentElement).addClass("h2-animation__label-outer--animated");
                    }, 50);

                    setTimeout(function(){
                        
                        $(parentElement).removeClass("h2-animation__label-outer h2-animation__label-outer--lined h2-animation__label-outer--animated")

                        $(parentElement).find(".h2-animation__label-item").remove();

                    }, 750);

                }, intervalAnimated + 500 )

            }, 500);

        }

    }


    this.__construct = function()
    {


    }()


}



var TextContentBuildLineController = function( element )
{

    var self = this;

    this.element = element;


    this.buildRects = function( element )
    {

        var range = new Range();
        
        range.selectNode( element );
        
        return range.getClientRects();

    }


    this.sortOffsets = function( offsets )
    {

        offsets.sort( function( a, b ){
            return ( a.top < b.top ) ? -1 : 1;
        });

        return offsets;
    }


    this.calcLeft = function( offsets, y )
    {

        var left = null;

        offsets.forEach(function( offset ){
            
            if( offset.top === y.top && offset.height === y.height ){
            
                left = offset.left;
            
            }

        });

        if( left === null ){

            offsets.forEach(function( offset ){

                if( left === null ){
                
                    left = offset.left;
                
                } else {

                    if( left > offset.left ){
                        left = offset.left;
                    }

                }

            });

        }

        return left;

    }


    this.calcTops = function( offsets )
    {

        var tops = [],
            range = { min : null, max : null };

        for( var key1 in offsets ){

            var offset = offsets[ key1 ],
                top = offset.top,
                height = offset.height,
                bottom = offset.bottom;

            if( range.min == null && range.max === null ){

                tops.push( { top : top, height : height } );

                range.min = top;
                
                range.max = bottom;

            } else {

                if( top >= range.max ){
                    
                    tops.push( { top : top, height : height } );

                    range.min = top;

                    range.max = bottom;

                }

            }

        }

        return tops;

    }


    this.calcWidth = function( y, offsets )
    {

        var tmp = null;

        for( var key in offsets ){

            var offset = offsets[ key ];

            if( y.top === offset.top ){

                tmp = offset.width;

            }

        }

        if( tmp === null ){

            for( var key in offsets ){

                var offset = offsets[ key ];

                if( y.top <= offset.top ){

                    if( tmp === null ){

                        tmp = offset.width;

                    } else {

                        if( offset.width > tmp ){
                            tmp = offset.width;
                        }

                    }

                }

            }

        }

        return tmp;

    }


    this.offsets2LineDataSet = function( offsets )
    {

        var dataSet = [],
            left = null,
            res = [];

        // 位置・高さの集合値
        var ys = self.calcTops( offsets );

        for( var key in ys ){

            var y = ys[key];

            // 各要素共通　にしとく
            ys[key].left = self.calcLeft( offsets, y );

            ys[key].width = self.calcWidth( y, offsets );

        }

        
        return ys;

    }


    this.isInt = function( value )
    {
        return String( value ).match( /^\d+$/ ) !== null;
    }


    this.rects2Offsets = function( rects )
    {

        var offsets = [];

        for( var key in rects ){

            if( self.isInt( key ) ){

                var rect = rects[ key ];

                offsets.push(
                    {
                        x : rect.x,
                        y : rect.y,
                        width : rect.width,
                        height : rect.height,
                        left : rect.left,
                        top : rect.top + $(window).scrollTop(),
                        bottom : rect.bottom + $(window).scrollTop()
                    }
                );

            }

        }

        return offsets;


    }




    /**
     * 要素内にあるテキストの行数を取得
     * @param {Element} element 取得するもとの要素
     * @return {Number} 行数を返す
     */
    this.getNumberLines = function(element) {
        var fontSize = 0, count = 0, calcResult = 0;

        /**
         * 要素からスタイルを取得
         */
        var getStyleValue = function(element, styleName, pseudoElt) {
            if (!element) return '';
            if (!pseudoElt) pseudoElt = '';

            var style;

            /**
             * キャメルケースへ変換
             */
            var toCamelcase = function(str, upper) {
                if (!str) return str;

                var strs = str.split(/[-_ ]+/),
                    i = 1, len = strs.length;

                if (len <= 1) return str;

                if (upper) {
                    i = 0;
                    str = '';
                } else {
                    str = strs[0].toLowerCase();
                }

                for (; i < len; i++) {
                    str += strs[i].toLowerCase().replace(/^[a-z]/, function(value) {
                        return value.toUpperCase();
                    });
                }

                return str;
            };

            if (document.defaultView) {
                style = document.defaultView.getComputedStyle(element, pseudoElt);
            } else {
                style = element.currentStyle;
                styleName = toCamelcase(styleName);
            }
            return (styleName) ? style[styleName] : style;
        };

        /**
         * 要素からフォントサイズを取得
         */
        var getFontSize = function(element) {
            var fontSize = getStyleValue(element, 'font-size');

            if (!fontSize.match(/px$/)) {
                var tmpElem = document.createElement('div');
                tmpElem.style.width = '1em';
                element.appendChild(tmpElem);
                fontSize = tmpElem.offsetWidth;
                element.removeChild(tmpElem);
            }

            return parseInt(fontSize);
        };

        var lineHeightVal = getStyleValue(element, 'line-height'),
            heightVal     = element.clientHeight,
            boxSizing     = getStyleValue(element, 'box-sizing');

        if (boxSizing === 'border-box' || boxSizing === 'padding-box') {
            heightVal -= parseInt(getStyleValue(element, 'padding-top'));
            heightVal -= parseInt(getStyleValue(element, 'padding-bottom'));
        }

        if (isNaN(parseInt(lineHeightVal))) {
            fontSize = getFontSize(element);
            while (calcResult < heightVal) {
                calcResult += fontSize;
                if (calcResult <= heightVal) count++;
            }
        } else {
            count = Math.floor(heightVal / parseInt(lineHeightVal));
        }

        return count;
    };




    this.main = function()
    {

        switch( $(self.element).css("display") ){

            // getclientrects から矩形取得 → データセットの割り出しへ
            case "inline":

                var rects = self.buildRects( self.element ),
                offsets = self.rects2Offsets( rects );

                offsets = self.sortOffsets( offsets );

                return self.offsets2LineDataSet( offsets );

            break;

            // 矩形取得不可能 → 行数と全体の高さからデータセット割り出しへ
            case "block":
            case "inline-block":

                var lines = self.getNumberLines( self.element );

                var object = $(self.element);

                // スクロール無く focus
                object.attr("contenteditable", "true")[0].focus({preventScroll : true});

                var selection,
                    rect,
                    tops = [],
                    top,
                    bottoms = [],
                    bottom;

                // top offset 群取得
                while( 1 ){

                    selection = window.getSelection();

                    // 初めに移動する必要あるぽい（0行目と1行目の区別がついてない）
                    selection.modify("move", "forward", "line");

                    rect = selection.getRangeAt(0).getClientRects();

                    if( rect[0] !== undefined ){

                        top = rect[0].top;
                        bottom = rect[0].bottom;

                        if( $.inArray( top, tops ) === -1 ){
                        
                            tops.push( top );
                            bottoms.push( bottom );
                        
                        } else {

                            break;

                        }

                    } else {

                        break;

                    }

                }

                object.attr("contenteditable", null);


                var dataSet = [],
                    tmp = null;

                var top = 0,
                    height = 0;

                tops.forEach(function( top_, index ){

                    top += height;

                    height = bottoms[index] - tops[index];

                    dataSet.push(
                        {
                            top : top,
                            height : height,
                            left : 0,
                            width : object.width()
                        }
                    );

                    tmp = top_;


                });

                return dataSet;

                /*

                // テスト用
                dataSet.forEach(function(data){
                    var tmp = $("<div></div>");

                    tmp.css({
                        position:"fixed",
                        top : data.top + "px",
                        left : data.left + "px",
                        width: data.width + "px",
                        height: data.height + "px",
                        background:"#fc0",
                        zIndex : 2,
                    });

                    $("body").append(tmp);
                });
                */

                
            break;



        }
    }


    this.__construct = function()
    {

        self.element = element;

    }();

}

var H2AnimateModel = function( h2AnimationName )
{

    var self = this;

    this.randomAnimations = ["float", "typing", "bounce", "jump", "wave", "label"];


    this.isExtraAnimation = function( animationName )
    {
        return $.inArray( animationName, H2_ANIMATE_CONFIG.extraAnimationNames ) !== -1;
    }


    this.animateAttribute = function( parentElement, timestamp, isRandom, animateObjCount )
    {


        if( isRandom ){

            randomAnimationIndex = animateObjCount % self.randomAnimations.length;

            var randomAnimationName = self.randomAnimations[randomAnimationIndex];

        }

        $(parentElement).attr( {"data-splited-at" : timestamp } );

        var count = $(parentElement).find(".splited").length;

        $(parentElement).find(".splited").each(function( index ){

            if( index === 0 ){

                $(this).addClass("firstFired rowstart");

            } else if( index === count - 1 ){

                $(this).addClass("lastFired");

            }

            $(this).css("animation-delay", self.buildDelayString( index ));

            if( isRandom ){

                $(this).attr(self.buildRandomAttribute( randomAnimationName ));

            } else {

                if( $(this).is("[data-h2-animation-name]") ){

                    // なにもしない

                } else {

                    $(this).attr(self.buildAttribute( index ));

                }


            }

        });

        $(parentElement).find("br").each(function(){

            if( $(this).next(".splited").length > 0 ){
                $(this).next(".splited").addClass("rowstart");
            }
        });

    }


    this.buildDelayString = function( index )
    {
        var delay = self.getConfig( "animationDelay" );
        var val = delay * index + "s";
        return val;
    }


    this.buildAttribute = function( index )
    {
        return { "data-h2-animation-name" : self.animationName };
    }


    this.buildRandomAttribute = function( randomAnimationName )
    {

        return { "data-h2-animation-name" : randomAnimationName };

    }


    this.getConfig = function( key )
    {

        if( typeof H2_ANIMATE_CONFIG !== "undefined" && 
            typeof H2_ANIMATE_CONFIG[key] !== "undefined" ){

            if( typeof H2_ANIMATE_CONFIG[key][self.animationName] === "undefined" ){

                return H2_ANIMATE_CONFIG[key]["default"];

            } else {

                return H2_ANIMATE_CONFIG[key][self.animationName];

            }

        } else {

            return "";

        }

    }


    this.__construct = function()
    {
        self.animationName = h2AnimationName;
    }();

}

var H2_ANIMATE_CONFIG = {
    "animationDelay" : {
        "default" : 0.075,
        "float" : 0.075,      // 下からふわっと
        "typing": 0.075,      // タイピング
        "bounce": 0.075,      // 跳ねる
        "jump": 0.075,        // 一気に下から
        "wave": 0.05,       // ウェーブで
        "label":0.05,       // 黒いラベルが左から右に
        "shrink-top":0.05,   // 上から縮小しつつ
        "float-left":0.075    // 左斜め下からふわっと
    },
    "range" : {
        "default" : { start : "12.5%", end : "87.5%" },
        "float" : { start : "12.5%", end : "87.5%" },
        "typing" : { start : "12.5%", end : "87.5%" },
        "bounce" : { start : "12.5%", end : "87.5%" },
        "jump" : { start : "12.5%", end : "87.5%" },
        "wave" : { start : "12.5%", end : "87.5%" },
        "label" : { start : "12.5%", end : "87.5%" },
        "shrink-top" : { start : "12.5%", end : "87.5%" },
        "float-left" : { start : "12.5%", end : "87.5%" },
    },
    "extraAnimationNames" : [
        "label"
    ]
};

var ConversionButtonBuilder = function( dataSet )
{

    var self = this;

    this.appendedObject = null;


    this.rebuild = function()
    {
        $(".fixedConversionButtonOuter").remove();
        self.build(null);
    }


    this.isValidText = function( text )
    {
        return text.length < 8;
    }


    this.isLongText = function( text )
    {
        return text.length >= 5;
    }


    this.build = function( appendedObject )
    {

        if( this.appendedObject === null && appendedObject !== null ){

            this.appendedObject = appendedObject;

            var visible = 0;
        
        } else {

            var visible = 1;

        }

        var outer = $("<span>").addClass("fixedConversionButtonOuter").attr("data-visible", visible);

        for( var cvKey in dataSet.main ){

            var data = dataSet.main[ cvKey ];

            var a = $("<a>").attr({
                "href" : data.href,
                "class" : "fixedConversionButton",
                "data-use-pc" : data.display.pc,
                "data-use-sp" : data.display.sp,
                "data-conversion-key" : cvKey,
                "data-long-text" : Number( self.isLongText( data.text ) ),
                "data-exists-menu" : Number( data.existsMenu )
            }).css({
                "backgroundImage":
                "url(" + data.backgroundSource + ")"
            });


            var span = $("<span>").attr({
                "class" : "fixedConversionButtonText"
            }).text( data.text );

            a.append(span);

            outer.append( a );

        }

        this.appendedObject.append( outer );

    }


    this.__construct = function()
    {

    }()

}

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


var DateFormatter;!function(){"use strict";var e,t,a,r,n,o,i;o=864e5,i=3600,e=function(e,t){return"string"==typeof e&&"string"==typeof t&&e.toLowerCase()===t.toLowerCase()},t=function(e,a,r){var n=r||"0",o=e.toString();return o.length<a?t(n+o,a):o},a=function(e){var t,r;for(e=e||{},t=1;t<arguments.length;t++)if(r=arguments[t])for(var n in r)r.hasOwnProperty(n)&&("object"==typeof r[n]?a(e[n],r[n]):e[n]=r[n]);return e},r=function(e,t){for(var a=0;a<t.length;a++)if(t[a].toLowerCase()===e.toLowerCase())return a;return-1},n={dateSettings:{days:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],daysShort:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],months:["January","February","March","April","May","June","July","August","September","October","November","December"],monthsShort:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],meridiem:["AM","PM"],ordinal:function(e){var t=e%10,a={1:"st",2:"nd",3:"rd"};return 1!==Math.floor(e%100/10)&&a[t]?a[t]:"th"}},separators:/[ \-+\/\.T:@]/g,validParts:/[dDjlNSwzWFmMntLoYyaABgGhHisueTIOPZcrU]/g,intParts:/[djwNzmnyYhHgGis]/g,tzParts:/\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g,tzClip:/[^-+\dA-Z]/g},(DateFormatter=function(e){var t=this,r=a(n,e);t.dateSettings=r.dateSettings,t.separators=r.separators,t.validParts=r.validParts,t.intParts=r.intParts,t.tzParts=r.tzParts,t.tzClip=r.tzClip}).prototype={constructor:DateFormatter,getMonth:function(e){var t,a=this;return 0===(t=r(e,a.dateSettings.monthsShort)+1)&&(t=r(e,a.dateSettings.months)+1),t},parseDate:function(t,a){var r,n,o,i,s,u,d,l,f,c,m=this,h=!1,g=!1,p=m.dateSettings,D={date:null,year:null,month:null,day:null,hour:0,min:0,sec:0};if(!t)return null;if(t instanceof Date)return t;if("U"===a)return(o=parseInt(t))?new Date(1e3*o):t;switch(typeof t){case"number":return new Date(t);case"string":break;default:return null}if(!(r=a.match(m.validParts))||0===r.length)throw new Error("Invalid date format definition.");for(n=t.replace(m.separators,"\0").split("\0"),o=0;o<n.length;o++)switch(i=n[o],s=parseInt(i),r[o]){case"y":case"Y":if(!s)return null;f=i.length,D.year=2===f?parseInt((70>s?"20":"19")+i):s,h=!0;break;case"m":case"n":case"M":case"F":if(isNaN(s)){if(!((u=m.getMonth(i))>0))return null;D.month=u}else{if(!(s>=1&&12>=s))return null;D.month=s}h=!0;break;case"d":case"j":if(!(s>=1&&31>=s))return null;D.day=s,h=!0;break;case"g":case"h":if(d=r.indexOf("a")>-1?r.indexOf("a"):r.indexOf("A")>-1?r.indexOf("A"):-1,c=n[d],d>-1)l=e(c,p.meridiem[0])?0:e(c,p.meridiem[1])?12:-1,s>=1&&12>=s&&l>-1?D.hour=s+l-1:s>=0&&23>=s&&(D.hour=s);else{if(!(s>=0&&23>=s))return null;D.hour=s}g=!0;break;case"G":case"H":if(!(s>=0&&23>=s))return null;D.hour=s,g=!0;break;case"i":if(!(s>=0&&59>=s))return null;D.min=s,g=!0;break;case"s":if(!(s>=0&&59>=s))return null;D.sec=s,g=!0}if(!0===h&&D.year&&D.month&&D.day)D.date=new Date(D.year,D.month-1,D.day,D.hour,D.min,D.sec,0);else{if(!0!==g)return null;D.date=new Date(0,0,0,D.hour,D.min,D.sec,0)}return D.date},guessDate:function(e,t){if("string"!=typeof e)return e;var a,r,n,o,i,s,u=this,d=e.replace(u.separators,"\0").split("\0"),l=/^[djmn]/g,f=t.match(u.validParts),c=new Date,m=0;if(!l.test(f[0]))return e;for(n=0;n<d.length;n++){if(m=2,i=d[n],s=parseInt(i.substr(0,2)),isNaN(s))return null;switch(n){case 0:"m"===f[0]||"n"===f[0]?c.setMonth(s-1):c.setDate(s);break;case 1:"m"===f[0]||"n"===f[0]?c.setDate(s):c.setMonth(s-1);break;case 2:if(r=c.getFullYear(),a=i.length,m=4>a?a:4,!(r=parseInt(4>a?r.toString().substr(0,4-a)+i:i.substr(0,4))))return null;c.setFullYear(r);break;case 3:c.setHours(s);break;case 4:c.setMinutes(s);break;case 5:c.setSeconds(s)}(o=i.substr(m)).length>0&&d.splice(n+1,0,o)}return c},parseFormat:function(e,a){var r,n=this,s=n.dateSettings,u=/\\?(.?)/gi,d=function(e,t){return r[e]?r[e]():t};return r={d:function(){return t(r.j(),2)},D:function(){return s.daysShort[r.w()]},j:function(){return a.getDate()},l:function(){return s.days[r.w()]},N:function(){return r.w()||7},w:function(){return a.getDay()},z:function(){var e=new Date(r.Y(),r.n()-1,r.j()),t=new Date(r.Y(),0,1);return Math.round((e-t)/o)},W:function(){var e=new Date(r.Y(),r.n()-1,r.j()-r.N()+3),a=new Date(e.getFullYear(),0,4);return t(1+Math.round((e-a)/o/7),2)},F:function(){return s.months[a.getMonth()]},m:function(){return t(r.n(),2)},M:function(){return s.monthsShort[a.getMonth()]},n:function(){return a.getMonth()+1},t:function(){return new Date(r.Y(),r.n(),0).getDate()},L:function(){var e=r.Y();return e%4==0&&e%100!=0||e%400==0?1:0},o:function(){var e=r.n(),t=r.W();return r.Y()+(12===e&&9>t?1:1===e&&t>9?-1:0)},Y:function(){return a.getFullYear()},y:function(){return r.Y().toString().slice(-2)},a:function(){return r.A().toLowerCase()},A:function(){var e=r.G()<12?0:1;return s.meridiem[e]},B:function(){var e=a.getUTCHours()*i,r=60*a.getUTCMinutes(),n=a.getUTCSeconds();return t(Math.floor((e+r+n+i)/86.4)%1e3,3)},g:function(){return r.G()%12||12},G:function(){return a.getHours()},h:function(){return t(r.g(),2)},H:function(){return t(r.G(),2)},i:function(){return t(a.getMinutes(),2)},s:function(){return t(a.getSeconds(),2)},u:function(){return t(1e3*a.getMilliseconds(),6)},e:function(){return/\((.*)\)/.exec(String(a))[1]||"Coordinated Universal Time"},I:function(){return new Date(r.Y(),0)-Date.UTC(r.Y(),0)!=new Date(r.Y(),6)-Date.UTC(r.Y(),6)?1:0},O:function(){var e=a.getTimezoneOffset(),r=Math.abs(e);return(e>0?"-":"+")+t(100*Math.floor(r/60)+r%60,4)},P:function(){var e=r.O();return e.substr(0,3)+":"+e.substr(3,2)},T:function(){return(String(a).match(n.tzParts)||[""]).pop().replace(n.tzClip,"")||"UTC"},Z:function(){return 60*-a.getTimezoneOffset()},c:function(){return"Y-m-d\\TH:i:sP".replace(u,d)},r:function(){return"D, d M Y H:i:s O".replace(u,d)},U:function(){return a.getTime()/1e3||0}},d(e,e)},formatDate:function(e,t){var a,r,n,o,i,s=this,u="";if("string"==typeof e&&!(e=s.parseDate(e,t)))return null;if(e instanceof Date){for(n=t.length,a=0;n>a;a++)"S"!==(i=t.charAt(a))&&"\\"!==i&&(a>0&&"\\"===t.charAt(a-1)?u+=i:(o=s.parseFormat(i,e),a!==n-1&&s.intParts.test(i)&&"S"===t.charAt(a+1)&&(r=parseInt(o)||0,o+=s.dateSettings.ordinal(r)),u+=o));return u}return""}}}();var datetimepickerFactory=function(e){"use strict";function t(e,t,a){this.date=e,this.desc=t,this.style=a}var a={i18n:{ar:{months:["كانون الثاني","شباط","آذار","نيسان","مايو","حزيران","تموز","آب","أيلول","تشرين الأول","تشرين الثاني","كانون الأول"],dayOfWeekShort:["ن","ث","ع","خ","ج","س","ح"],dayOfWeek:["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت","الأحد"]},ro:{months:["Ianuarie","Februarie","Martie","Aprilie","Mai","Iunie","Iulie","August","Septembrie","Octombrie","Noiembrie","Decembrie"],dayOfWeekShort:["Du","Lu","Ma","Mi","Jo","Vi","Sâ"],dayOfWeek:["Duminică","Luni","Marţi","Miercuri","Joi","Vineri","Sâmbătă"]},id:{months:["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"],dayOfWeekShort:["Min","Sen","Sel","Rab","Kam","Jum","Sab"],dayOfWeek:["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"]},is:{months:["Janúar","Febrúar","Mars","Apríl","Maí","Júní","Júlí","Ágúst","September","Október","Nóvember","Desember"],dayOfWeekShort:["Sun","Mán","Þrið","Mið","Fim","Fös","Lau"],dayOfWeek:["Sunnudagur","Mánudagur","Þriðjudagur","Miðvikudagur","Fimmtudagur","Föstudagur","Laugardagur"]},bg:{months:["Януари","Февруари","Март","Април","Май","Юни","Юли","Август","Септември","Октомври","Ноември","Декември"],dayOfWeekShort:["Нд","Пн","Вт","Ср","Чт","Пт","Сб"],dayOfWeek:["Неделя","Понеделник","Вторник","Сряда","Четвъртък","Петък","Събота"]},fa:{months:["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"],dayOfWeekShort:["یکشنبه","دوشنبه","سه شنبه","چهارشنبه","پنجشنبه","جمعه","شنبه"],dayOfWeek:["یک‌شنبه","دوشنبه","سه‌شنبه","چهارشنبه","پنج‌شنبه","جمعه","شنبه","یک‌شنبه"]},ru:{months:["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"],dayOfWeekShort:["Вс","Пн","Вт","Ср","Чт","Пт","Сб"],dayOfWeek:["Воскресенье","Понедельник","Вторник","Среда","Четверг","Пятница","Суббота"]},uk:{months:["Січень","Лютий","Березень","Квітень","Травень","Червень","Липень","Серпень","Вересень","Жовтень","Листопад","Грудень"],dayOfWeekShort:["Ндл","Пнд","Втр","Срд","Чтв","Птн","Сбт"],dayOfWeek:["Неділя","Понеділок","Вівторок","Середа","Четвер","П'ятниця","Субота"]},en:{months:["January","February","March","April","May","June","July","August","September","October","November","December"],dayOfWeekShort:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],dayOfWeek:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]},el:{months:["Ιανουάριος","Φεβρουάριος","Μάρτιος","Απρίλιος","Μάιος","Ιούνιος","Ιούλιος","Αύγουστος","Σεπτέμβριος","Οκτώβριος","Νοέμβριος","Δεκέμβριος"],dayOfWeekShort:["Κυρ","Δευ","Τρι","Τετ","Πεμ","Παρ","Σαβ"],dayOfWeek:["Κυριακή","Δευτέρα","Τρίτη","Τετάρτη","Πέμπτη","Παρασκευή","Σάββατο"]},de:{months:["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"],dayOfWeekShort:["So","Mo","Di","Mi","Do","Fr","Sa"],dayOfWeek:["Sonntag","Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag"]},nl:{months:["januari","februari","maart","april","mei","juni","juli","augustus","september","oktober","november","december"],dayOfWeekShort:["zo","ma","di","wo","do","vr","za"],dayOfWeek:["zondag","maandag","dinsdag","woensdag","donderdag","vrijdag","zaterdag"]},tr:{months:["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"],dayOfWeekShort:["Paz","Pts","Sal","Çar","Per","Cum","Cts"],dayOfWeek:["Pazar","Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi"]},fr:{months:["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"],dayOfWeekShort:["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"],dayOfWeek:["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"]},es:{months:["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"],dayOfWeekShort:["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"],dayOfWeek:["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"]},th:{months:["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"],dayOfWeekShort:["อา.","จ.","อ.","พ.","พฤ.","ศ.","ส."],dayOfWeek:["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัส","ศุกร์","เสาร์","อาทิตย์"]},pl:{months:["styczeń","luty","marzec","kwiecień","maj","czerwiec","lipiec","sierpień","wrzesień","październik","listopad","grudzień"],dayOfWeekShort:["nd","pn","wt","śr","cz","pt","sb"],dayOfWeek:["niedziela","poniedziałek","wtorek","środa","czwartek","piątek","sobota"]},pt:{months:["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"],dayOfWeekShort:["Dom","Seg","Ter","Qua","Qui","Sex","Sab"],dayOfWeek:["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"]},ch:{months:["一月","二月","三月","四月","五月","六月","七月","八月","九月","十月","十一月","十二月"],dayOfWeekShort:["日","一","二","三","四","五","六"]},se:{months:["Januari","Februari","Mars","April","Maj","Juni","Juli","Augusti","September","Oktober","November","December"],dayOfWeekShort:["Sön","Mån","Tis","Ons","Tor","Fre","Lör"]},km:{months:["មករា​","កុម្ភៈ","មិនា​","មេសា​","ឧសភា​","មិថុនា​","កក្កដា​","សីហា​","កញ្ញា​","តុលា​","វិច្ឆិកា","ធ្នូ​"],dayOfWeekShort:["អាទិ​","ច័ន្ទ​","អង្គារ​","ពុធ​","ព្រហ​​","សុក្រ​","សៅរ៍"],dayOfWeek:["អាទិត្យ​","ច័ន្ទ​","អង្គារ​","ពុធ​","ព្រហស្បតិ៍​","សុក្រ​","សៅរ៍"]},kr:{months:["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"],dayOfWeekShort:["일","월","화","수","목","금","토"],dayOfWeek:["일요일","월요일","화요일","수요일","목요일","금요일","토요일"]},it:{months:["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"],dayOfWeekShort:["Dom","Lun","Mar","Mer","Gio","Ven","Sab"],dayOfWeek:["Domenica","Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato"]},da:{months:["Januar","Februar","Marts","April","Maj","Juni","Juli","August","September","Oktober","November","December"],dayOfWeekShort:["Søn","Man","Tir","Ons","Tor","Fre","Lør"],dayOfWeek:["søndag","mandag","tirsdag","onsdag","torsdag","fredag","lørdag"]},no:{months:["Januar","Februar","Mars","April","Mai","Juni","Juli","August","September","Oktober","November","Desember"],dayOfWeekShort:["Søn","Man","Tir","Ons","Tor","Fre","Lør"],dayOfWeek:["Søndag","Mandag","Tirsdag","Onsdag","Torsdag","Fredag","Lørdag"]},ja:{months:["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"],dayOfWeekShort:["日","月","火","水","木","金","土"],dayOfWeek:["日曜","月曜","火曜","水曜","木曜","金曜","土曜"]},vi:{months:["Tháng 1","Tháng 2","Tháng 3","Tháng 4","Tháng 5","Tháng 6","Tháng 7","Tháng 8","Tháng 9","Tháng 10","Tháng 11","Tháng 12"],dayOfWeekShort:["CN","T2","T3","T4","T5","T6","T7"],dayOfWeek:["Chủ nhật","Thứ hai","Thứ ba","Thứ tư","Thứ năm","Thứ sáu","Thứ bảy"]},sl:{months:["Januar","Februar","Marec","April","Maj","Junij","Julij","Avgust","September","Oktober","November","December"],dayOfWeekShort:["Ned","Pon","Tor","Sre","Čet","Pet","Sob"],dayOfWeek:["Nedelja","Ponedeljek","Torek","Sreda","Četrtek","Petek","Sobota"]},cs:{months:["Leden","Únor","Březen","Duben","Květen","Červen","Červenec","Srpen","Září","Říjen","Listopad","Prosinec"],dayOfWeekShort:["Ne","Po","Út","St","Čt","Pá","So"]},hu:{months:["Január","Február","Március","Április","Május","Június","Július","Augusztus","Szeptember","Október","November","December"],dayOfWeekShort:["Va","Hé","Ke","Sze","Cs","Pé","Szo"],dayOfWeek:["vasárnap","hétfő","kedd","szerda","csütörtök","péntek","szombat"]},az:{months:["Yanvar","Fevral","Mart","Aprel","May","Iyun","Iyul","Avqust","Sentyabr","Oktyabr","Noyabr","Dekabr"],dayOfWeekShort:["B","Be","Ça","Ç","Ca","C","Ş"],dayOfWeek:["Bazar","Bazar ertəsi","Çərşənbə axşamı","Çərşənbə","Cümə axşamı","Cümə","Şənbə"]},bs:{months:["Januar","Februar","Mart","April","Maj","Jun","Jul","Avgust","Septembar","Oktobar","Novembar","Decembar"],dayOfWeekShort:["Ned","Pon","Uto","Sri","Čet","Pet","Sub"],dayOfWeek:["Nedjelja","Ponedjeljak","Utorak","Srijeda","Četvrtak","Petak","Subota"]},ca:{months:["Gener","Febrer","Març","Abril","Maig","Juny","Juliol","Agost","Setembre","Octubre","Novembre","Desembre"],dayOfWeekShort:["Dg","Dl","Dt","Dc","Dj","Dv","Ds"],dayOfWeek:["Diumenge","Dilluns","Dimarts","Dimecres","Dijous","Divendres","Dissabte"]},"en-GB":{months:["January","February","March","April","May","June","July","August","September","October","November","December"],dayOfWeekShort:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],dayOfWeek:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]},et:{months:["Jaanuar","Veebruar","Märts","Aprill","Mai","Juuni","Juuli","August","September","Oktoober","November","Detsember"],dayOfWeekShort:["P","E","T","K","N","R","L"],dayOfWeek:["Pühapäev","Esmaspäev","Teisipäev","Kolmapäev","Neljapäev","Reede","Laupäev"]},eu:{months:["Urtarrila","Otsaila","Martxoa","Apirila","Maiatza","Ekaina","Uztaila","Abuztua","Iraila","Urria","Azaroa","Abendua"],dayOfWeekShort:["Ig.","Al.","Ar.","Az.","Og.","Or.","La."],dayOfWeek:["Igandea","Astelehena","Asteartea","Asteazkena","Osteguna","Ostirala","Larunbata"]},fi:{months:["Tammikuu","Helmikuu","Maaliskuu","Huhtikuu","Toukokuu","Kesäkuu","Heinäkuu","Elokuu","Syyskuu","Lokakuu","Marraskuu","Joulukuu"],dayOfWeekShort:["Su","Ma","Ti","Ke","To","Pe","La"],dayOfWeek:["sunnuntai","maanantai","tiistai","keskiviikko","torstai","perjantai","lauantai"]},gl:{months:["Xan","Feb","Maz","Abr","Mai","Xun","Xul","Ago","Set","Out","Nov","Dec"],dayOfWeekShort:["Dom","Lun","Mar","Mer","Xov","Ven","Sab"],dayOfWeek:["Domingo","Luns","Martes","Mércores","Xoves","Venres","Sábado"]},hr:{months:["Siječanj","Veljača","Ožujak","Travanj","Svibanj","Lipanj","Srpanj","Kolovoz","Rujan","Listopad","Studeni","Prosinac"],dayOfWeekShort:["Ned","Pon","Uto","Sri","Čet","Pet","Sub"],dayOfWeek:["Nedjelja","Ponedjeljak","Utorak","Srijeda","Četvrtak","Petak","Subota"]},ko:{months:["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"],dayOfWeekShort:["일","월","화","수","목","금","토"],dayOfWeek:["일요일","월요일","화요일","수요일","목요일","금요일","토요일"]},lt:{months:["Sausio","Vasario","Kovo","Balandžio","Gegužės","Birželio","Liepos","Rugpjūčio","Rugsėjo","Spalio","Lapkričio","Gruodžio"],dayOfWeekShort:["Sek","Pir","Ant","Tre","Ket","Pen","Šeš"],dayOfWeek:["Sekmadienis","Pirmadienis","Antradienis","Trečiadienis","Ketvirtadienis","Penktadienis","Šeštadienis"]},lv:{months:["Janvāris","Februāris","Marts","Aprīlis ","Maijs","Jūnijs","Jūlijs","Augusts","Septembris","Oktobris","Novembris","Decembris"],dayOfWeekShort:["Sv","Pr","Ot","Tr","Ct","Pk","St"],dayOfWeek:["Svētdiena","Pirmdiena","Otrdiena","Trešdiena","Ceturtdiena","Piektdiena","Sestdiena"]},mk:{months:["јануари","февруари","март","април","мај","јуни","јули","август","септември","октомври","ноември","декември"],dayOfWeekShort:["нед","пон","вто","сре","чет","пет","саб"],dayOfWeek:["Недела","Понеделник","Вторник","Среда","Четврток","Петок","Сабота"]},mn:{months:["1-р сар","2-р сар","3-р сар","4-р сар","5-р сар","6-р сар","7-р сар","8-р сар","9-р сар","10-р сар","11-р сар","12-р сар"],dayOfWeekShort:["Дав","Мяг","Лха","Пүр","Бсн","Бям","Ням"],dayOfWeek:["Даваа","Мягмар","Лхагва","Пүрэв","Баасан","Бямба","Ням"]},"pt-BR":{months:["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"],dayOfWeekShort:["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"],dayOfWeek:["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"]},sk:{months:["Január","Február","Marec","Apríl","Máj","Jún","Júl","August","September","Október","November","December"],dayOfWeekShort:["Ne","Po","Ut","St","Št","Pi","So"],dayOfWeek:["Nedeľa","Pondelok","Utorok","Streda","Štvrtok","Piatok","Sobota"]},sq:{months:["Janar","Shkurt","Mars","Prill","Maj","Qershor","Korrik","Gusht","Shtator","Tetor","Nëntor","Dhjetor"],dayOfWeekShort:["Die","Hën","Mar","Mër","Enj","Pre","Shtu"],dayOfWeek:["E Diel","E Hënë","E Martē","E Mërkurë","E Enjte","E Premte","E Shtunë"]},"sr-YU":{months:["Januar","Februar","Mart","April","Maj","Jun","Jul","Avgust","Septembar","Oktobar","Novembar","Decembar"],dayOfWeekShort:["Ned","Pon","Uto","Sre","čet","Pet","Sub"],dayOfWeek:["Nedelja","Ponedeljak","Utorak","Sreda","Četvrtak","Petak","Subota"]},sr:{months:["јануар","фебруар","март","април","мај","јун","јул","август","септембар","октобар","новембар","децембар"],dayOfWeekShort:["нед","пон","уто","сре","чет","пет","суб"],dayOfWeek:["Недеља","Понедељак","Уторак","Среда","Четвртак","Петак","Субота"]},sv:{months:["Januari","Februari","Mars","April","Maj","Juni","Juli","Augusti","September","Oktober","November","December"],dayOfWeekShort:["Sön","Mån","Tis","Ons","Tor","Fre","Lör"],dayOfWeek:["Söndag","Måndag","Tisdag","Onsdag","Torsdag","Fredag","Lördag"]},"zh-TW":{months:["一月","二月","三月","四月","五月","六月","七月","八月","九月","十月","十一月","十二月"],dayOfWeekShort:["日","一","二","三","四","五","六"],dayOfWeek:["星期日","星期一","星期二","星期三","星期四","星期五","星期六"]},zh:{months:["一月","二月","三月","四月","五月","六月","七月","八月","九月","十月","十一月","十二月"],dayOfWeekShort:["日","一","二","三","四","五","六"],dayOfWeek:["星期日","星期一","星期二","星期三","星期四","星期五","星期六"]},ug:{months:["1-ئاي","2-ئاي","3-ئاي","4-ئاي","5-ئاي","6-ئاي","7-ئاي","8-ئاي","9-ئاي","10-ئاي","11-ئاي","12-ئاي"],dayOfWeek:["يەكشەنبە","دۈشەنبە","سەيشەنبە","چارشەنبە","پەيشەنبە","جۈمە","شەنبە"]},he:{months:["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"],dayOfWeekShort:["א'","ב'","ג'","ד'","ה'","ו'","שבת"],dayOfWeek:["ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת","ראשון"]},hy:{months:["Հունվար","Փետրվար","Մարտ","Ապրիլ","Մայիս","Հունիս","Հուլիս","Օգոստոս","Սեպտեմբեր","Հոկտեմբեր","Նոյեմբեր","Դեկտեմբեր"],dayOfWeekShort:["Կի","Երկ","Երք","Չոր","Հնգ","Ուրբ","Շբթ"],dayOfWeek:["Կիրակի","Երկուշաբթի","Երեքշաբթի","Չորեքշաբթի","Հինգշաբթի","Ուրբաթ","Շաբաթ"]},kg:{months:["Үчтүн айы","Бирдин айы","Жалган Куран","Чын Куран","Бугу","Кулжа","Теке","Баш Оона","Аяк Оона","Тогуздун айы","Жетинин айы","Бештин айы"],dayOfWeekShort:["Жек","Дүй","Шей","Шар","Бей","Жум","Ише"],dayOfWeek:["Жекшемб","Дүйшөмб","Шейшемб","Шаршемб","Бейшемби","Жума","Ишенб"]},rm:{months:["Schaner","Favrer","Mars","Avrigl","Matg","Zercladur","Fanadur","Avust","Settember","October","November","December"],dayOfWeekShort:["Du","Gli","Ma","Me","Gie","Ve","So"],dayOfWeek:["Dumengia","Glindesdi","Mardi","Mesemna","Gievgia","Venderdi","Sonda"]},ka:{months:["იანვარი","თებერვალი","მარტი","აპრილი","მაისი","ივნისი","ივლისი","აგვისტო","სექტემბერი","ოქტომბერი","ნოემბერი","დეკემბერი"],dayOfWeekShort:["კვ","ორშ","სამშ","ოთხ","ხუთ","პარ","შაბ"],dayOfWeek:["კვირა","ორშაბათი","სამშაბათი","ოთხშაბათი","ხუთშაბათი","პარასკევი","შაბათი"]}},ownerDocument:document,contentWindow:window,value:"",rtl:!1,format:"Y/m/d H:i",formatTime:"H:i",formatDate:"Y/m/d",startDate:!1,step:60,monthChangeSpinner:!0,closeOnDateSelect:!1,closeOnTimeSelect:!0,closeOnWithoutClick:!0,closeOnInputClick:!0,openOnFocus:!0,timepicker:!0,datepicker:!0,weeks:!1,defaultTime:!1,defaultDate:!1,minDate:!1,maxDate:!1,minTime:!1,maxTime:!1,minDateTime:!1,maxDateTime:!1,allowTimes:[],opened:!1,initTime:!0,inline:!1,theme:"",touchMovedThreshold:5,onSelectDate:function(){},onSelectTime:function(){},onChangeMonth:function(){},onGetWeekOfYear:function(){},onChangeYear:function(){},onChangeDateTime:function(){},onShow:function(){},onClose:function(){},onGenerate:function(){},withoutCopyright:!0,inverseButton:!1,hours12:!1,next:"xdsoft_next",prev:"xdsoft_prev",dayOfWeekStart:0,parentID:"body",timeHeightInTimePicker:25,timepickerScrollbar:!0,todayButton:!0,prevButton:!0,nextButton:!0,defaultSelect:!0,scrollMonth:!0,scrollTime:!0,scrollInput:!0,lazyInit:!1,mask:!1,validateOnBlur:!0,allowBlank:!0,yearStart:1950,yearEnd:2050,monthStart:0,monthEnd:11,style:"",id:"",fixed:!1,roundTime:"round",className:"",weekends:[],highlightedDates:[],highlightedPeriods:[],allowDates:[],allowDateRe:null,disabledDates:[],disabledWeekDays:[],yearOffset:0,beforeShowDay:null,enterLikeTab:!0,showApplyButton:!1},r=null,n=null,o="en",i={meridiem:["AM","PM"]},s=function(){var t=a.i18n[o],s={days:t.dayOfWeek,daysShort:t.dayOfWeekShort,months:t.months,monthsShort:e.map(t.months,function(e){return e.substring(0,3)})};"function"==typeof DateFormatter&&(r=n=new DateFormatter({dateSettings:e.extend({},i,s)}))},u={moment:{default_options:{format:"YYYY/MM/DD HH:mm",formatDate:"YYYY/MM/DD",formatTime:"HH:mm"},formatter:{parseDate:function(e,t){if(l(t))return n.parseDate(e,t);var a=moment(e,t);return!!a.isValid()&&a.toDate()},formatDate:function(e,t){return l(t)?n.formatDate(e,t):moment(e).format(t)},formatMask:function(e){return e.replace(/Y{4}/g,"9999").replace(/Y{2}/g,"99").replace(/M{2}/g,"19").replace(/D{2}/g,"39").replace(/H{2}/g,"29").replace(/m{2}/g,"59").replace(/s{2}/g,"59")}}}};e.datetimepicker={setLocale:function(e){var t=a.i18n[e]?e:"en";o!==t&&(o=t,s())},setDateFormatter:function(t){if("string"==typeof t&&u.hasOwnProperty(t)){var n=u[t];e.extend(a,n.default_options),r=n.formatter}else r=t}};var d={RFC_2822:"D, d M Y H:i:s O",ATOM:"Y-m-dTH:i:sP",ISO_8601:"Y-m-dTH:i:sO",RFC_822:"D, d M y H:i:s O",RFC_850:"l, d-M-y H:i:s T",RFC_1036:"D, d M y H:i:s O",RFC_1123:"D, d M Y H:i:s O",RSS:"D, d M Y H:i:s O",W3C:"Y-m-dTH:i:sP"},l=function(e){return-1!==Object.values(d).indexOf(e)};e.extend(e.datetimepicker,d),s(),window.getComputedStyle||(window.getComputedStyle=function(e){return this.el=e,this.getPropertyValue=function(t){var a=/(-([a-z]))/g;return"float"===t&&(t="styleFloat"),a.test(t)&&(t=t.replace(a,function(e,t,a){return a.toUpperCase()})),e.currentStyle[t]||null},this}),Array.prototype.indexOf||(Array.prototype.indexOf=function(e,t){var a,r;for(a=t||0,r=this.length;a<r;a+=1)if(this[a]===e)return a;return-1}),Date.prototype.countDaysInMonth=function(){return new Date(this.getFullYear(),this.getMonth()+1,0).getDate()},e.fn.xdsoftScroller=function(t,a){return this.each(function(){var r,n,o,i,s,u=e(this),d=function(e){var t,a={x:0,y:0};return"touchstart"===e.type||"touchmove"===e.type||"touchend"===e.type||"touchcancel"===e.type?(t=e.originalEvent.touches[0]||e.originalEvent.changedTouches[0],a.x=t.clientX,a.y=t.clientY):"mousedown"!==e.type&&"mouseup"!==e.type&&"mousemove"!==e.type&&"mouseover"!==e.type&&"mouseout"!==e.type&&"mouseenter"!==e.type&&"mouseleave"!==e.type||(a.x=e.clientX,a.y=e.clientY),a},l=100,f=!1,c=0,m=0,h=0,g=!1,p=0,D=function(){};"hide"!==a?(e(this).hasClass("xdsoft_scroller_box")||(r=u.children().eq(0),n=u[0].clientHeight,o=r[0].offsetHeight,i=e('<div class="xdsoft_scrollbar"></div>'),s=e('<div class="xdsoft_scroller"></div>'),i.append(s),u.addClass("xdsoft_scroller_box").append(i),D=function(e){var t=d(e).y-c+p;t<0&&(t=0),t+s[0].offsetHeight>h&&(t=h-s[0].offsetHeight),u.trigger("scroll_element.xdsoft_scroller",[l?t/l:0])},s.on("touchstart.xdsoft_scroller mousedown.xdsoft_scroller",function(r){n||u.trigger("resize_scroll.xdsoft_scroller",[a]),c=d(r).y,p=parseInt(s.css("margin-top"),10),h=i[0].offsetHeight,"mousedown"===r.type||"touchstart"===r.type?(t.ownerDocument&&e(t.ownerDocument.body).addClass("xdsoft_noselect"),e([t.ownerDocument.body,t.contentWindow]).on("touchend mouseup.xdsoft_scroller",function a(){e([t.ownerDocument.body,t.contentWindow]).off("touchend mouseup.xdsoft_scroller",a).off("mousemove.xdsoft_scroller",D).removeClass("xdsoft_noselect")}),e(t.ownerDocument.body).on("mousemove.xdsoft_scroller",D)):(g=!0,r.stopPropagation(),r.preventDefault())}).on("touchmove",function(e){g&&(e.preventDefault(),D(e))}).on("touchend touchcancel",function(){g=!1,p=0}),u.on("scroll_element.xdsoft_scroller",function(e,t){n||u.trigger("resize_scroll.xdsoft_scroller",[t,!0]),t=t>1?1:t<0||isNaN(t)?0:t,s.css("margin-top",l*t),setTimeout(function(){r.css("marginTop",-parseInt((r[0].offsetHeight-n)*t,10))},10)}).on("resize_scroll.xdsoft_scroller",function(e,t,a){var d,f;n=u[0].clientHeight,o=r[0].offsetHeight,f=(d=n/o)*i[0].offsetHeight,d>1?s.hide():(s.show(),s.css("height",parseInt(f>10?f:10,10)),l=i[0].offsetHeight-s[0].offsetHeight,!0!==a&&u.trigger("scroll_element.xdsoft_scroller",[t||Math.abs(parseInt(r.css("marginTop"),10))/(o-n)]))}),u.on("mousewheel",function(e){var t=Math.abs(parseInt(r.css("marginTop"),10));return(t-=20*e.deltaY)<0&&(t=0),u.trigger("scroll_element.xdsoft_scroller",[t/(o-n)]),e.stopPropagation(),!1}),u.on("touchstart",function(e){f=d(e),m=Math.abs(parseInt(r.css("marginTop"),10))}),u.on("touchmove",function(e){if(f){e.preventDefault();var t=d(e);u.trigger("scroll_element.xdsoft_scroller",[(m-(t.y-f.y))/(o-n)])}}),u.on("touchend touchcancel",function(){f=!1,m=0})),u.trigger("resize_scroll.xdsoft_scroller",[a])):u.find(".xdsoft_scrollbar").hide()})},e.fn.datetimepicker=function(n,i){var s,u,d=this,l=48,f=57,c=96,m=105,h=17,g=46,p=13,D=27,v=8,y=37,b=38,k=39,x=40,T=9,S=116,M=65,w=67,O=86,W=90,_=89,F=!1,C=e.isPlainObject(n)||!n?e.extend(!0,{},a,n):e.extend(!0,{},a),P=0,Y=function(e){e.on("open.xdsoft focusin.xdsoft mousedown.xdsoft touchstart",function t(){e.is(":disabled")||e.data("xdsoft_datetimepicker")||(clearTimeout(P),P=setTimeout(function(){e.data("xdsoft_datetimepicker")||s(e),e.off("open.xdsoft focusin.xdsoft mousedown.xdsoft touchstart",t).trigger("open.xdsoft")},100))})};return s=function(a){function i(){var e,t=!1;return C.startDate?t=A.strToDate(C.startDate):(t=C.value||(a&&a.val&&a.val()?a.val():""))?(t=A.strToDateTime(t),C.yearOffset&&(t=new Date(t.getFullYear()-C.yearOffset,t.getMonth(),t.getDate(),t.getHours(),t.getMinutes(),t.getSeconds(),t.getMilliseconds()))):C.defaultDate&&(t=A.strToDateTime(C.defaultDate),C.defaultTime&&(e=A.strtotime(C.defaultTime),t.setHours(e.getHours()),t.setMinutes(e.getMinutes()))),t&&A.isValidDate(t)?j.data("changed",!0):t="",t||0}function s(t){var n=function(e,t){var a=e.replace(/([\[\]\/\{\}\(\)\-\.\+]{1})/g,"\\$1").replace(/_/g,"{digit+}").replace(/([0-9]{1})/g,"{digit$1}").replace(/\{digit([0-9]{1})\}/g,"[0-$1_]{1}").replace(/\{digit[\+]\}/g,"[0-9_]{1}");return new RegExp(a).test(t)},o=function(e,a){if(!(e="string"==typeof e||e instanceof String?t.ownerDocument.getElementById(e):e))return!1;if(e.createTextRange){var r=e.createTextRange();return r.collapse(!0),r.moveEnd("character",a),r.moveStart("character",a),r.select(),!0}return!!e.setSelectionRange&&(e.setSelectionRange(a,a),!0)};t.mask&&a.off("keydown.xdsoft"),!0===t.mask&&(r.formatMask?t.mask=r.formatMask(t.format):t.mask=t.format.replace(/Y/g,"9999").replace(/F/g,"9999").replace(/m/g,"19").replace(/d/g,"39").replace(/H/g,"29").replace(/i/g,"59").replace(/s/g,"59")),"string"===e.type(t.mask)&&(n(t.mask,a.val())||(a.val(t.mask.replace(/[0-9]/g,"_")),o(a[0],0)),a.on("paste.xdsoft",function(r){var i=(r.clipboardData||r.originalEvent.clipboardData||window.clipboardData).getData("text"),s=this.value,u=this.selectionStart;return s=s.substr(0,u)+i+s.substr(u+i.length),u+=i.length,n(t.mask,s)?(this.value=s,o(this,u)):""===e.trim(s)?this.value=t.mask.replace(/[0-9]/g,"_"):a.trigger("error_input.xdsoft"),r.preventDefault(),!1}),a.on("keydown.xdsoft",function(r){var i,s=this.value,u=r.which,d=this.selectionStart,C=this.selectionEnd,P=d!==C;if(u>=l&&u<=f||u>=c&&u<=m||u===v||u===g){for(i=u===v||u===g?"_":String.fromCharCode(c<=u&&u<=m?u-l:u),u===v&&d&&!P&&(d-=1);;){var Y=t.mask.substr(d,1),A=d<t.mask.length,H=d>0;if(!(/[^0-9_]/.test(Y)&&A&&H))break;d+=u!==v||P?1:-1}if(P){var j=C-d,J=t.mask.replace(/[0-9]/g,"_"),z=J.substr(d,j).substr(1);s=s.substr(0,d)+(i+z)+s.substr(d+j)}else s=s.substr(0,d)+i+s.substr(d+1);if(""===e.trim(s))s=J;else if(d===t.mask.length)return r.preventDefault(),!1;for(d+=u===v?0:1;/[^0-9_]/.test(t.mask.substr(d,1))&&d<t.mask.length&&d>0;)d+=u===v?0:1;n(t.mask,s)?(this.value=s,o(this,d)):""===e.trim(s)?this.value=t.mask.replace(/[0-9]/g,"_"):a.trigger("error_input.xdsoft")}else if(-1!==[M,w,O,W,_].indexOf(u)&&F||-1!==[D,b,x,y,k,S,h,T,p].indexOf(u))return!0;return r.preventDefault(),!1}))}var u,d,P,Y,A,H,j=e('<div class="xdsoft_datetimepicker xdsoft_noselect"></div>'),J=e('<div class="xdsoft_copyright"><a target="_blank" href="http://xdsoft.net/jqplugins/datetimepicker/">xdsoft.net</a></div>'),z=e('<div class="xdsoft_datepicker active"></div>'),I=e('<div class="xdsoft_monthpicker"><button type="button" class="xdsoft_prev"></button><button type="button" class="xdsoft_today_button"></button><div class="xdsoft_label xdsoft_month"><span></span><i></i></div><div class="xdsoft_label xdsoft_year"><span></span><i></i></div><button type="button" class="xdsoft_next"></button></div>'),N=e('<div class="xdsoft_calendar"></div>'),L=e('<div class="xdsoft_timepicker active"><button type="button" class="xdsoft_prev"></button><div class="xdsoft_time_box"></div><button type="button" class="xdsoft_next"></button></div>'),E=L.find(".xdsoft_time_box").eq(0),R=e('<div class="xdsoft_time_variant"></div>'),V=e('<button type="button" class="xdsoft_save_selected blue-gradient-button">Save Selected</button>'),B=e('<div class="xdsoft_select xdsoft_monthselect"><div></div></div>'),G=e('<div class="xdsoft_select xdsoft_yearselect"><div></div></div>'),U=!1,q=0;C.id&&j.attr("id",C.id),C.style&&j.attr("style",C.style),C.weeks&&j.addClass("xdsoft_showweeks"),C.rtl&&j.addClass("xdsoft_rtl"),j.addClass("xdsoft_"+C.theme),j.addClass(C.className),I.find(".xdsoft_month span").after(B),I.find(".xdsoft_year span").after(G),I.find(".xdsoft_month,.xdsoft_year").on("touchstart mousedown.xdsoft",function(t){var a,r,n=e(this).find(".xdsoft_select").eq(0),o=0,i=0,s=n.is(":visible");for(I.find(".xdsoft_select").hide(),A.currentTime&&(o=A.currentTime[e(this).hasClass("xdsoft_month")?"getMonth":"getFullYear"]()),n[s?"hide":"show"](),a=n.find("div.xdsoft_option"),r=0;r<a.length&&a.eq(r).data("value")!==o;r+=1)i+=a[0].offsetHeight;return n.xdsoftScroller(C,i/(n.children()[0].offsetHeight-n[0].clientHeight)),t.stopPropagation(),!1});var X=function(e){var t=e.originalEvent,a=t.touches?t.touches[0]:t;this.touchStartPosition=this.touchStartPosition||a;var r=Math.abs(this.touchStartPosition.clientX-a.clientX),n=Math.abs(this.touchStartPosition.clientY-a.clientY);Math.sqrt(r*r+n*n)>C.touchMovedThreshold&&(this.touchMoved=!0)};I.find(".xdsoft_select").xdsoftScroller(C).on("touchstart mousedown.xdsoft",function(e){var t=e.originalEvent;this.touchMoved=!1,this.touchStartPosition=t.touches?t.touches[0]:t,e.stopPropagation(),e.preventDefault()}).on("touchmove",".xdsoft_option",X).on("touchend mousedown.xdsoft",".xdsoft_option",function(){if(!this.touchMoved){void 0!==A.currentTime&&null!==A.currentTime||(A.currentTime=A.now());var t=A.currentTime.getFullYear();A&&A.currentTime&&A.currentTime[e(this).parent().parent().hasClass("xdsoft_monthselect")?"setMonth":"setFullYear"](e(this).data("value")),e(this).parent().parent().hide(),j.trigger("xchange.xdsoft"),C.onChangeMonth&&e.isFunction(C.onChangeMonth)&&C.onChangeMonth.call(j,A.currentTime,j.data("input")),t!==A.currentTime.getFullYear()&&e.isFunction(C.onChangeYear)&&C.onChangeYear.call(j,A.currentTime,j.data("input"))}}),j.getValue=function(){return A.getCurrentTime()},j.setOptions=function(n){var o={};C=e.extend(!0,{},C,n),n.allowTimes&&e.isArray(n.allowTimes)&&n.allowTimes.length&&(C.allowTimes=e.extend(!0,[],n.allowTimes)),n.weekends&&e.isArray(n.weekends)&&n.weekends.length&&(C.weekends=e.extend(!0,[],n.weekends)),n.allowDates&&e.isArray(n.allowDates)&&n.allowDates.length&&(C.allowDates=e.extend(!0,[],n.allowDates)),n.allowDateRe&&"[object String]"===Object.prototype.toString.call(n.allowDateRe)&&(C.allowDateRe=new RegExp(n.allowDateRe)),n.highlightedDates&&e.isArray(n.highlightedDates)&&n.highlightedDates.length&&(e.each(n.highlightedDates,function(a,n){var i,s=e.map(n.split(","),e.trim),u=new t(r.parseDate(s[0],C.formatDate),s[1],s[2]),d=r.formatDate(u.date,C.formatDate);void 0!==o[d]?(i=o[d].desc)&&i.length&&u.desc&&u.desc.length&&(o[d].desc=i+"\n"+u.desc):o[d]=u}),C.highlightedDates=e.extend(!0,[],o)),n.highlightedPeriods&&e.isArray(n.highlightedPeriods)&&n.highlightedPeriods.length&&(o=e.extend(!0,[],C.highlightedDates),e.each(n.highlightedPeriods,function(a,n){var i,s,u,d,l,f,c;if(e.isArray(n))i=n[0],s=n[1],u=n[2],c=n[3];else{var m=e.map(n.split(","),e.trim);i=r.parseDate(m[0],C.formatDate),s=r.parseDate(m[1],C.formatDate),u=m[2],c=m[3]}for(;i<=s;)d=new t(i,u,c),l=r.formatDate(i,C.formatDate),i.setDate(i.getDate()+1),void 0!==o[l]?(f=o[l].desc)&&f.length&&d.desc&&d.desc.length&&(o[l].desc=f+"\n"+d.desc):o[l]=d}),C.highlightedDates=e.extend(!0,[],o)),n.disabledDates&&e.isArray(n.disabledDates)&&n.disabledDates.length&&(C.disabledDates=e.extend(!0,[],n.disabledDates)),n.disabledWeekDays&&e.isArray(n.disabledWeekDays)&&n.disabledWeekDays.length&&(C.disabledWeekDays=e.extend(!0,[],n.disabledWeekDays)),!C.open&&!C.opened||C.inline||a.trigger("open.xdsoft"),C.inline&&(U=!0,j.addClass("xdsoft_inline"),a.after(j).hide()),C.inverseButton&&(C.next="xdsoft_prev",C.prev="xdsoft_next"),C.datepicker?z.addClass("active"):z.removeClass("active"),C.timepicker?L.addClass("active"):L.removeClass("active"),C.value&&(A.setCurrentTime(C.value),a&&a.val&&a.val(A.str)),isNaN(C.dayOfWeekStart)?C.dayOfWeekStart=0:C.dayOfWeekStart=parseInt(C.dayOfWeekStart,10)%7,C.timepickerScrollbar||E.xdsoftScroller(C,"hide"),C.minDate&&/^[\+\-](.*)$/.test(C.minDate)&&(C.minDate=r.formatDate(A.strToDateTime(C.minDate),C.formatDate)),C.maxDate&&/^[\+\-](.*)$/.test(C.maxDate)&&(C.maxDate=r.formatDate(A.strToDateTime(C.maxDate),C.formatDate)),C.minDateTime&&/^\+(.*)$/.test(C.minDateTime)&&(C.minDateTime=A.strToDateTime(C.minDateTime).dateFormat(C.formatDate)),C.maxDateTime&&/^\+(.*)$/.test(C.maxDateTime)&&(C.maxDateTime=A.strToDateTime(C.maxDateTime).dateFormat(C.formatDate)),V.toggle(C.showApplyButton),I.find(".xdsoft_today_button").css("visibility",C.todayButton?"visible":"hidden"),I.find("."+C.prev).css("visibility",C.prevButton?"visible":"hidden"),I.find("."+C.next).css("visibility",C.nextButton?"visible":"hidden"),s(C),C.validateOnBlur&&a.off("blur.xdsoft").on("blur.xdsoft",function(){if(C.allowBlank&&(!e.trim(e(this).val()).length||"string"==typeof C.mask&&e.trim(e(this).val())===C.mask.replace(/[0-9]/g,"_")))e(this).val(null),j.data("xdsoft_datetime").empty();else{var t=r.parseDate(e(this).val(),C.format);if(t)e(this).val(r.formatDate(t,C.format));else{var a=+[e(this).val()[0],e(this).val()[1]].join(""),n=+[e(this).val()[2],e(this).val()[3]].join("");!C.datepicker&&C.timepicker&&a>=0&&a<24&&n>=0&&n<60?e(this).val([a,n].map(function(e){return e>9?e:"0"+e}).join(":")):e(this).val(r.formatDate(A.now(),C.format))}j.data("xdsoft_datetime").setCurrentTime(e(this).val())}j.trigger("changedatetime.xdsoft"),j.trigger("close.xdsoft")}),C.dayOfWeekStartPrev=0===C.dayOfWeekStart?6:C.dayOfWeekStart-1,j.trigger("xchange.xdsoft").trigger("afterOpen.xdsoft")},j.data("options",C).on("touchstart mousedown.xdsoft",function(e){return e.stopPropagation(),e.preventDefault(),G.hide(),B.hide(),!1}),E.append(R),E.xdsoftScroller(C),j.on("afterOpen.xdsoft",function(){E.xdsoftScroller(C)}),j.append(z).append(L),!0!==C.withoutCopyright&&j.append(J),z.append(I).append(N).append(V),e(C.parentID).append(j),A=new function(){var t=this;t.now=function(e){var a,r,n=new Date;return!e&&C.defaultDate&&(a=t.strToDateTime(C.defaultDate),n.setFullYear(a.getFullYear()),n.setMonth(a.getMonth()),n.setDate(a.getDate())),n.setFullYear(n.getFullYear()),!e&&C.defaultTime&&(r=t.strtotime(C.defaultTime),n.setHours(r.getHours()),n.setMinutes(r.getMinutes()),n.setSeconds(r.getSeconds()),n.setMilliseconds(r.getMilliseconds())),n},t.isValidDate=function(e){return"[object Date]"===Object.prototype.toString.call(e)&&!isNaN(e.getTime())},t.setCurrentTime=function(e,a){"string"==typeof e?t.currentTime=t.strToDateTime(e):t.isValidDate(e)?t.currentTime=e:e||a||!C.allowBlank||C.inline?t.currentTime=t.now():t.currentTime=null,j.trigger("xchange.xdsoft")},t.empty=function(){t.currentTime=null},t.getCurrentTime=function(){return t.currentTime},t.nextMonth=function(){void 0!==t.currentTime&&null!==t.currentTime||(t.currentTime=t.now());var a,r=t.currentTime.getMonth()+1;return 12===r&&(t.currentTime.setFullYear(t.currentTime.getFullYear()+1),r=0),a=t.currentTime.getFullYear(),t.currentTime.setDate(Math.min(new Date(t.currentTime.getFullYear(),r+1,0).getDate(),t.currentTime.getDate())),t.currentTime.setMonth(r),C.onChangeMonth&&e.isFunction(C.onChangeMonth)&&C.onChangeMonth.call(j,A.currentTime,j.data("input")),a!==t.currentTime.getFullYear()&&e.isFunction(C.onChangeYear)&&C.onChangeYear.call(j,A.currentTime,j.data("input")),j.trigger("xchange.xdsoft"),r},t.prevMonth=function(){void 0!==t.currentTime&&null!==t.currentTime||(t.currentTime=t.now());var a=t.currentTime.getMonth()-1;return-1===a&&(t.currentTime.setFullYear(t.currentTime.getFullYear()-1),a=11),t.currentTime.setDate(Math.min(new Date(t.currentTime.getFullYear(),a+1,0).getDate(),t.currentTime.getDate())),t.currentTime.setMonth(a),C.onChangeMonth&&e.isFunction(C.onChangeMonth)&&C.onChangeMonth.call(j,A.currentTime,j.data("input")),j.trigger("xchange.xdsoft"),a},t.getWeekOfYear=function(t){if(C.onGetWeekOfYear&&e.isFunction(C.onGetWeekOfYear)){var a=C.onGetWeekOfYear.call(j,t);if(void 0!==a)return a}var r=new Date(t.getFullYear(),0,1);return 4!==r.getDay()&&r.setMonth(0,1+(4-r.getDay()+7)%7),Math.ceil(((t-r)/864e5+r.getDay()+1)/7)},t.strToDateTime=function(e){var a,n,o=[];return e&&e instanceof Date&&t.isValidDate(e)?e:((o=/^([+-]{1})(.*)$/.exec(e))&&(o[2]=r.parseDate(o[2],C.formatDate)),o&&o[2]?(a=o[2].getTime()-6e4*o[2].getTimezoneOffset(),n=new Date(t.now(!0).getTime()+parseInt(o[1]+"1",10)*a)):n=e?r.parseDate(e,C.format):t.now(),t.isValidDate(n)||(n=t.now()),n)},t.strToDate=function(e){if(e&&e instanceof Date&&t.isValidDate(e))return e;var a=e?r.parseDate(e,C.formatDate):t.now(!0);return t.isValidDate(a)||(a=t.now(!0)),a},t.strtotime=function(e){if(e&&e instanceof Date&&t.isValidDate(e))return e;var a=e?r.parseDate(e,C.formatTime):t.now(!0);return t.isValidDate(a)||(a=t.now(!0)),a},t.str=function(){var e=C.format;return C.yearOffset&&(e=(e=e.replace("Y",t.currentTime.getFullYear()+C.yearOffset)).replace("y",String(t.currentTime.getFullYear()+C.yearOffset).substring(2,4))),r.formatDate(t.currentTime,e)},t.currentTime=this.now()},V.on("touchend click",function(e){e.preventDefault(),j.data("changed",!0),A.setCurrentTime(i()),a.val(A.str()),j.trigger("close.xdsoft")}),I.find(".xdsoft_today_button").on("touchend mousedown.xdsoft",function(){j.data("changed",!0),A.setCurrentTime(0,!0),j.trigger("afterOpen.xdsoft")}).on("dblclick.xdsoft",function(){var e,t,r=A.getCurrentTime();r=new Date(r.getFullYear(),r.getMonth(),r.getDate()),e=A.strToDate(C.minDate),r<(e=new Date(e.getFullYear(),e.getMonth(),e.getDate()))||(t=A.strToDate(C.maxDate),r>(t=new Date(t.getFullYear(),t.getMonth(),t.getDate()))||(a.val(A.str()),a.trigger("change"),j.trigger("close.xdsoft")))}),I.find(".xdsoft_prev,.xdsoft_next").on("touchend mousedown.xdsoft",function(){var t=e(this),a=0,r=!1;!function e(n){t.hasClass(C.next)?A.nextMonth():t.hasClass(C.prev)&&A.prevMonth(),C.monthChangeSpinner&&(r||(a=setTimeout(e,n||100)))}(500),e([C.ownerDocument.body,C.contentWindow]).on("touchend mouseup.xdsoft",function t(){clearTimeout(a),r=!0,e([C.ownerDocument.body,C.contentWindow]).off("touchend mouseup.xdsoft",t)})}),L.find(".xdsoft_prev,.xdsoft_next").on("touchend mousedown.xdsoft",function(){var t=e(this),a=0,r=!1,n=110;!function e(o){var i=E[0].clientHeight,s=R[0].offsetHeight,u=Math.abs(parseInt(R.css("marginTop"),10));t.hasClass(C.next)&&s-i-C.timeHeightInTimePicker>=u?R.css("marginTop","-"+(u+C.timeHeightInTimePicker)+"px"):t.hasClass(C.prev)&&u-C.timeHeightInTimePicker>=0&&R.css("marginTop","-"+(u-C.timeHeightInTimePicker)+"px"),E.trigger("scroll_element.xdsoft_scroller",[Math.abs(parseInt(R[0].style.marginTop,10)/(s-i))]),n=n>10?10:n-10,r||(a=setTimeout(e,o||n))}(500),e([C.ownerDocument.body,C.contentWindow]).on("touchend mouseup.xdsoft",function t(){clearTimeout(a),r=!0,e([C.ownerDocument.body,C.contentWindow]).off("touchend mouseup.xdsoft",t)})}),u=0,j.on("xchange.xdsoft",function(t){clearTimeout(u),u=setTimeout(function(){void 0!==A.currentTime&&null!==A.currentTime||(A.currentTime=A.now());for(var t,i,s,u,d,l,f,c,m,h,g="",p=new Date(A.currentTime.getFullYear(),A.currentTime.getMonth(),1,12,0,0),D=0,v=A.now(),y=!1,b=!1,k=!1,x=!1,T=[],S=!0,M="";p.getDay()!==C.dayOfWeekStart;)p.setDate(p.getDate()-1);for(g+="<table><thead><tr>",C.weeks&&(g+="<th></th>"),t=0;t<7;t+=1)g+="<th>"+C.i18n[o].dayOfWeekShort[(t+C.dayOfWeekStart)%7]+"</th>";g+="</tr></thead>",g+="<tbody>",!1!==C.maxDate&&(y=A.strToDate(C.maxDate),y=new Date(y.getFullYear(),y.getMonth(),y.getDate(),23,59,59,999)),!1!==C.minDate&&(b=A.strToDate(C.minDate),b=new Date(b.getFullYear(),b.getMonth(),b.getDate())),!1!==C.minDateTime&&(k=A.strToDate(C.minDateTime),k=new Date(k.getFullYear(),k.getMonth(),k.getDate(),k.getHours(),k.getMinutes(),k.getSeconds())),!1!==C.maxDateTime&&(x=A.strToDate(C.maxDateTime),x=new Date(x.getFullYear(),x.getMonth(),x.getDate(),x.getHours(),x.getMinutes(),x.getSeconds()));var w;for(!1!==x&&(w=31*(12*x.getFullYear()+x.getMonth())+x.getDate());D<A.currentTime.countDaysInMonth()||p.getDay()!==C.dayOfWeekStart||A.currentTime.getMonth()===p.getMonth();){T=[],D+=1,s=p.getDay(),u=p.getDate(),d=p.getFullYear(),l=p.getMonth(),f=A.getWeekOfYear(p),h="",T.push("xdsoft_date"),c=C.beforeShowDay&&e.isFunction(C.beforeShowDay.call)?C.beforeShowDay.call(j,p):null,C.allowDateRe&&"[object RegExp]"===Object.prototype.toString.call(C.allowDateRe)&&(C.allowDateRe.test(r.formatDate(p,C.formatDate))||T.push("xdsoft_disabled")),C.allowDates&&C.allowDates.length>0&&-1===C.allowDates.indexOf(r.formatDate(p,C.formatDate))&&T.push("xdsoft_disabled");var O=31*(12*p.getFullYear()+p.getMonth())+p.getDate();(!1!==y&&p>y||!1!==k&&p<k||!1!==b&&p<b||!1!==x&&O>w||c&&!1===c[0])&&T.push("xdsoft_disabled"),-1!==C.disabledDates.indexOf(r.formatDate(p,C.formatDate))&&T.push("xdsoft_disabled"),-1!==C.disabledWeekDays.indexOf(s)&&T.push("xdsoft_disabled"),a.is("[disabled]")&&T.push("xdsoft_disabled"),c&&""!==c[1]&&T.push(c[1]),A.currentTime.getMonth()!==l&&T.push("xdsoft_other_month"),(C.defaultSelect||j.data("changed"))&&r.formatDate(A.currentTime,C.formatDate)===r.formatDate(p,C.formatDate)&&T.push("xdsoft_current"),r.formatDate(v,C.formatDate)===r.formatDate(p,C.formatDate)&&T.push("xdsoft_today"),0!==p.getDay()&&6!==p.getDay()&&-1===C.weekends.indexOf(r.formatDate(p,C.formatDate))||T.push("xdsoft_weekend"),void 0!==C.highlightedDates[r.formatDate(p,C.formatDate)]&&(i=C.highlightedDates[r.formatDate(p,C.formatDate)],T.push(void 0===i.style?"xdsoft_highlighted_default":i.style),h=void 0===i.desc?"":i.desc),C.beforeShowDay&&e.isFunction(C.beforeShowDay)&&T.push(C.beforeShowDay(p)),S&&(g+="<tr>",S=!1,C.weeks&&(g+="<th>"+f+"</th>")),g+='<td data-date="'+u+'" data-month="'+l+'" data-year="'+d+'" class="xdsoft_date xdsoft_day_of_week'+p.getDay()+" "+T.join(" ")+'" title="'+h+'"><div>'+u+"</div></td>",p.getDay()===C.dayOfWeekStartPrev&&(g+="</tr>",S=!0),p.setDate(u+1)}g+="</tbody></table>",N.html(g),I.find(".xdsoft_label span").eq(0).text(C.i18n[o].months[A.currentTime.getMonth()]),I.find(".xdsoft_label span").eq(1).text(A.currentTime.getFullYear()+C.yearOffset),M="",l="";var W=0;if(!1!==C.minTime){F=A.strtotime(C.minTime);W=60*F.getHours()+F.getMinutes()}var _=1440;if(!1!==C.maxTime){F=A.strtotime(C.maxTime);_=60*F.getHours()+F.getMinutes()}if(!1!==C.minDateTime){F=A.strToDateTime(C.minDateTime);r.formatDate(A.currentTime,C.formatDate)===r.formatDate(F,C.formatDate)&&(l=60*F.getHours()+F.getMinutes())>W&&(W=l)}if(!1!==C.maxDateTime){var F=A.strToDateTime(C.maxDateTime);r.formatDate(A.currentTime,C.formatDate)===r.formatDate(F,C.formatDate)&&(l=60*F.getHours()+F.getMinutes())<_&&(_=l)}if(m=function(t,n){var o,i=A.now(),s=C.allowTimes&&e.isArray(C.allowTimes)&&C.allowTimes.length;i.setHours(t),t=parseInt(i.getHours(),10),i.setMinutes(n),n=parseInt(i.getMinutes(),10),T=[];var u=60*t+n;(a.is("[disabled]")||u>=_||u<W)&&T.push("xdsoft_disabled"),(o=new Date(A.currentTime)).setHours(parseInt(A.currentTime.getHours(),10)),s||o.setMinutes(Math[C.roundTime](A.currentTime.getMinutes()/C.step)*C.step),(C.initTime||C.defaultSelect||j.data("changed"))&&o.getHours()===parseInt(t,10)&&(!s&&C.step>59||o.getMinutes()===parseInt(n,10))&&(C.defaultSelect||j.data("changed")?T.push("xdsoft_current"):C.initTime&&T.push("xdsoft_init_time")),parseInt(v.getHours(),10)===parseInt(t,10)&&parseInt(v.getMinutes(),10)===parseInt(n,10)&&T.push("xdsoft_today"),M+='<div class="xdsoft_time '+T.join(" ")+'" data-hour="'+t+'" data-minute="'+n+'">'+r.formatDate(i,C.formatTime)+"</div>"},C.allowTimes&&e.isArray(C.allowTimes)&&C.allowTimes.length)for(D=0;D<C.allowTimes.length;D+=1)m(A.strtotime(C.allowTimes[D]).getHours(),l=A.strtotime(C.allowTimes[D]).getMinutes());else for(D=0,t=0;D<(C.hours12?12:24);D+=1)for(t=0;t<60;t+=C.step){var P=60*D+t;P<W||(P>=_||m((D<10?"0":"")+D,l=(t<10?"0":"")+t))}for(R.html(M),n="",D=parseInt(C.yearStart,10);D<=parseInt(C.yearEnd,10);D+=1)n+='<div class="xdsoft_option '+(A.currentTime.getFullYear()===D?"xdsoft_current":"")+'" data-value="'+D+'">'+(D+C.yearOffset)+"</div>";for(G.children().eq(0).html(n),D=parseInt(C.monthStart,10),n="";D<=parseInt(C.monthEnd,10);D+=1)n+='<div class="xdsoft_option '+(A.currentTime.getMonth()===D?"xdsoft_current":"")+'" data-value="'+D+'">'+C.i18n[o].months[D]+"</div>";B.children().eq(0).html(n),e(j).trigger("generate.xdsoft")},10),t.stopPropagation()}).on("afterOpen.xdsoft",function(){if(C.timepicker){var e,t,a,r;R.find(".xdsoft_current").length?e=".xdsoft_current":R.find(".xdsoft_init_time").length&&(e=".xdsoft_init_time"),e?(t=E[0].clientHeight,(a=R[0].offsetHeight)-t<(r=R.find(e).index()*C.timeHeightInTimePicker+1)&&(r=a-t),E.trigger("scroll_element.xdsoft_scroller",[parseInt(r,10)/(a-t)])):E.trigger("scroll_element.xdsoft_scroller",[0])}}),d=0,N.on("touchend click.xdsoft","td",function(t){t.stopPropagation(),d+=1;var r=e(this),n=A.currentTime;if(void 0!==n&&null!==n||(A.currentTime=A.now(),n=A.currentTime),r.hasClass("xdsoft_disabled"))return!1;n.setDate(1),n.setFullYear(r.data("year")),n.setMonth(r.data("month")),n.setDate(r.data("date")),j.trigger("select.xdsoft",[n]),a.val(A.str()),C.onSelectDate&&e.isFunction(C.onSelectDate)&&C.onSelectDate.call(j,A.currentTime,j.data("input"),t),j.data("changed",!0),j.trigger("xchange.xdsoft"),j.trigger("changedatetime.xdsoft"),(d>1||!0===C.closeOnDateSelect||!1===C.closeOnDateSelect&&!C.timepicker)&&!C.inline&&j.trigger("close.xdsoft"),setTimeout(function(){d=0},200)}),R.on("touchstart","div",function(e){this.touchMoved=!1}).on("touchmove","div",X).on("touchend click.xdsoft","div",function(t){if(!this.touchMoved){t.stopPropagation();var a=e(this),r=A.currentTime;if(void 0!==r&&null!==r||(A.currentTime=A.now(),r=A.currentTime),a.hasClass("xdsoft_disabled"))return!1;r.setHours(a.data("hour")),r.setMinutes(a.data("minute")),j.trigger("select.xdsoft",[r]),j.data("input").val(A.str()),C.onSelectTime&&e.isFunction(C.onSelectTime)&&C.onSelectTime.call(j,A.currentTime,j.data("input"),t),j.data("changed",!0),j.trigger("xchange.xdsoft"),j.trigger("changedatetime.xdsoft"),!0!==C.inline&&!0===C.closeOnTimeSelect&&j.trigger("close.xdsoft")}}),z.on("mousewheel.xdsoft",function(e){return!C.scrollMonth||(e.deltaY<0?A.nextMonth():A.prevMonth(),!1)}),a.on("mousewheel.xdsoft",function(e){return!C.scrollInput||(!C.datepicker&&C.timepicker?((P=R.find(".xdsoft_current").length?R.find(".xdsoft_current").eq(0).index():0)+e.deltaY>=0&&P+e.deltaY<R.children().length&&(P+=e.deltaY),R.children().eq(P).length&&R.children().eq(P).trigger("mousedown"),!1):C.datepicker&&!C.timepicker?(z.trigger(e,[e.deltaY,e.deltaX,e.deltaY]),a.val&&a.val(A.str()),j.trigger("changedatetime.xdsoft"),!1):void 0)}),j.on("changedatetime.xdsoft",function(t){if(C.onChangeDateTime&&e.isFunction(C.onChangeDateTime)){var a=j.data("input");C.onChangeDateTime.call(j,A.currentTime,a,t),delete C.value,a.trigger("change")}}).on("generate.xdsoft",function(){C.onGenerate&&e.isFunction(C.onGenerate)&&C.onGenerate.call(j,A.currentTime,j.data("input")),U&&(j.trigger("afterOpen.xdsoft"),U=!1)}).on("click.xdsoft",function(e){e.stopPropagation()}),P=0,H=function(e,t){do{if(!(e=e.parentNode)||!1===t(e))break}while("HTML"!==e.nodeName)},Y=function(){var t,a,r,n,o,i,s,u,d,l,f,c,m;if(u=j.data("input"),t=u.offset(),a=u[0],l="top",r=t.top+a.offsetHeight-1,n=t.left,o="absolute",d=e(C.contentWindow).width(),c=e(C.contentWindow).height(),m=e(C.contentWindow).scrollTop(),C.ownerDocument.documentElement.clientWidth-t.left<z.parent().outerWidth(!0)){var h=z.parent().outerWidth(!0)-a.offsetWidth;n-=h}"rtl"===u.parent().css("direction")&&(n-=j.outerWidth()-u.outerWidth()),C.fixed?(r-=m,n-=e(C.contentWindow).scrollLeft(),o="fixed"):(s=!1,H(a,function(e){return null!==e&&("fixed"===C.contentWindow.getComputedStyle(e).getPropertyValue("position")?(s=!0,!1):void 0)}),s?(o="fixed",r+j.outerHeight()>c+m?(l="bottom",r=c+m-t.top):r-=m):r+j[0].offsetHeight>c+m&&(r=t.top-j[0].offsetHeight+1),r<0&&(r=0),n+a.offsetWidth>d&&(n=d-a.offsetWidth)),i=j[0],H(i,function(e){if("relative"===C.contentWindow.getComputedStyle(e).getPropertyValue("position")&&d>=e.offsetWidth)return n-=(d-e.offsetWidth)/2,!1}),(f={position:o,left:n,top:"",bottom:""})[l]=r,j.css(f)},j.on("open.xdsoft",function(t){var a=!0;C.onShow&&e.isFunction(C.onShow)&&(a=C.onShow.call(j,A.currentTime,j.data("input"),t)),!1!==a&&(j.show(),Y(),e(C.contentWindow).off("resize.xdsoft",Y).on("resize.xdsoft",Y),C.closeOnWithoutClick&&e([C.ownerDocument.body,C.contentWindow]).on("touchstart mousedown.xdsoft",function t(){j.trigger("close.xdsoft"),e([C.ownerDocument.body,C.contentWindow]).off("touchstart mousedown.xdsoft",t)}))}).on("close.xdsoft",function(t){var a=!0;I.find(".xdsoft_month,.xdsoft_year").find(".xdsoft_select").hide(),C.onClose&&e.isFunction(C.onClose)&&(a=C.onClose.call(j,A.currentTime,j.data("input"),t)),!1===a||C.opened||C.inline||j.hide(),t.stopPropagation()}).on("toggle.xdsoft",function(){j.is(":visible")?j.trigger("close.xdsoft"):j.trigger("open.xdsoft")}).data("input",a),q=0,j.data("xdsoft_datetime",A),j.setOptions(C),A.setCurrentTime(i()),a.data("xdsoft_datetimepicker",j).on("open.xdsoft focusin.xdsoft mousedown.xdsoft touchstart",function(){a.is(":disabled")||a.data("xdsoft_datetimepicker").is(":visible")&&C.closeOnInputClick||C.openOnFocus&&(clearTimeout(q),q=setTimeout(function(){a.is(":disabled")||(U=!0,A.setCurrentTime(i(),!0),C.mask&&s(C),j.trigger("open.xdsoft"))},100))}).on("keydown.xdsoft",function(t){var a,r=t.which;return-1!==[p].indexOf(r)&&C.enterLikeTab?(a=e("input:visible,textarea:visible,button:visible,a:visible"),j.trigger("close.xdsoft"),a.eq(a.index(this)+1).focus(),!1):-1!==[T].indexOf(r)?(j.trigger("close.xdsoft"),!0):void 0}).on("blur.xdsoft",function(){j.trigger("close.xdsoft")})},u=function(t){var a=t.data("xdsoft_datetimepicker");a&&(a.data("xdsoft_datetime",null),a.remove(),t.data("xdsoft_datetimepicker",null).off(".xdsoft"),e(C.contentWindow).off("resize.xdsoft"),e([C.contentWindow,C.ownerDocument.body]).off("mousedown.xdsoft touchstart"),t.unmousewheel&&t.unmousewheel())},e(C.ownerDocument).off("keydown.xdsoftctrl keyup.xdsoftctrl").on("keydown.xdsoftctrl",function(e){e.keyCode===h&&(F=!0)}).on("keyup.xdsoftctrl",function(e){e.keyCode===h&&(F=!1)}),this.each(function(){var t=e(this).data("xdsoft_datetimepicker");if(t){if("string"===e.type(n))switch(n){case"show":e(this).select().focus(),t.trigger("open.xdsoft");break;case"hide":t.trigger("close.xdsoft");break;case"toggle":t.trigger("toggle.xdsoft");break;case"destroy":u(e(this));break;case"reset":this.value=this.defaultValue,this.value&&t.data("xdsoft_datetime").isValidDate(r.parseDate(this.value,C.format))||t.data("changed",!1),t.data("xdsoft_datetime").setCurrentTime(this.value);break;case"validate":t.data("input").trigger("blur.xdsoft");break;default:t[n]&&e.isFunction(t[n])&&(d=t[n](i))}else t.setOptions(n);return 0}"string"!==e.type(n)&&(!C.lazyInit||C.open||C.inline?s(e(this)):Y(e(this)))}),d},e.fn.datetimepicker.defaults=a};!function(e){"function"==typeof define&&define.amd?define(["jquery","jquery-mousewheel"],e):"object"==typeof exports?module.exports=e(require("jquery")):e(jQuery)}(datetimepickerFactory),function(e){"function"==typeof define&&define.amd?define(["jquery"],e):"object"==typeof exports?module.exports=e:e(jQuery)}(function(e){function t(t){var i=t||window.event,s=u.call(arguments,1),d=0,f=0,c=0,m=0,h=0,g=0;if(t=e.event.fix(i),t.type="mousewheel","detail"in i&&(c=-1*i.detail),"wheelDelta"in i&&(c=i.wheelDelta),"wheelDeltaY"in i&&(c=i.wheelDeltaY),"wheelDeltaX"in i&&(f=-1*i.wheelDeltaX),"axis"in i&&i.axis===i.HORIZONTAL_AXIS&&(f=-1*c,c=0),d=0===c?f:c,"deltaY"in i&&(d=c=-1*i.deltaY),"deltaX"in i&&(f=i.deltaX,0===c&&(d=-1*f)),0!==c||0!==f){if(1===i.deltaMode){var p=e.data(this,"mousewheel-line-height");d*=p,c*=p,f*=p}else if(2===i.deltaMode){var D=e.data(this,"mousewheel-page-height");d*=D,c*=D,f*=D}if(m=Math.max(Math.abs(c),Math.abs(f)),(!o||m<o)&&(o=m,r(i,m)&&(o/=40)),r(i,m)&&(d/=40,f/=40,c/=40),d=Math[d>=1?"floor":"ceil"](d/o),f=Math[f>=1?"floor":"ceil"](f/o),c=Math[c>=1?"floor":"ceil"](c/o),l.settings.normalizeOffset&&this.getBoundingClientRect){var v=this.getBoundingClientRect();h=t.clientX-v.left,g=t.clientY-v.top}return t.deltaX=f,t.deltaY=c,t.deltaFactor=o,t.offsetX=h,t.offsetY=g,t.deltaMode=0,s.unshift(t,d,f,c),n&&clearTimeout(n),n=setTimeout(a,200),(e.event.dispatch||e.event.handle).apply(this,s)}}function a(){o=null}function r(e,t){return l.settings.adjustOldDeltas&&"mousewheel"===e.type&&t%120==0}var n,o,i=["wheel","mousewheel","DOMMouseScroll","MozMousePixelScroll"],s="onwheel"in document||document.documentMode>=9?["wheel"]:["mousewheel","DomMouseScroll","MozMousePixelScroll"],u=Array.prototype.slice;if(e.event.fixHooks)for(var d=i.length;d;)e.event.fixHooks[i[--d]]=e.event.mouseHooks;var l=e.event.special.mousewheel={version:"3.1.12",setup:function(){if(this.addEventListener)for(var a=s.length;a;)this.addEventListener(s[--a],t,!1);else this.onmousewheel=t;e.data(this,"mousewheel-line-height",l.getLineHeight(this)),e.data(this,"mousewheel-page-height",l.getPageHeight(this))},teardown:function(){if(this.removeEventListener)for(var a=s.length;a;)this.removeEventListener(s[--a],t,!1);else this.onmousewheel=null;e.removeData(this,"mousewheel-line-height"),e.removeData(this,"mousewheel-page-height")},getLineHeight:function(t){var a=e(t),r=a["offsetParent"in e.fn?"offsetParent":"parent"]();return r.length||(r=e("body")),parseInt(r.css("fontSize"),10)||parseInt(a.css("fontSize"),10)||16},getPageHeight:function(t){return e(t).height()},settings:{adjustOldDeltas:!0,normalizeOffset:!0}};e.fn.extend({mousewheel:function(e){return e?this.bind("mousewheel",e):this.trigger("mousewheel")},unmousewheel:function(e){return this.unbind("mousewheel",e)}})});

/* -----------------------------------------------
/* Author : Vincent Garreau  - vincentgarreau.com
/* MIT license: http://opensource.org/licenses/MIT
/* Demo / Generator : vincentgarreau.com/particles.js
/* GitHub : github.com/VincentGarreau/particles.js
/* How to use? : Check the GitHub README
/* v2.0.0
/* ----------------------------------------------- */

// ムービー5の幾何学模様
// サイズ調整は下のparticleJSで

if( design_number === "movie5" ){
  function hexToRgb(e){
    var a=/^#?([a-f\d])([a-f\d])([a-f\d])$/i;e=e.replace(a,function(e,a,t,i){return a+a+t+t+i+i});
    var t=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(e);
    return t ? {r:parseInt(t[1],16), g:parseInt(t[2],16), b:parseInt(t[3],16)}:null
  } function clamp(e,a,t){
    return Math.min(Math.max(e,a),t)
  } function isInArray(e,a){
    return a.indexOf(e)>-1
  }
  var pJS=function(e,a){
    var t=document.querySelector("#"+e+" > .particles-js-canvas-el");
    this.pJS={
      canvas:{
        el:t,w:t.offsetWidth,h:t.offsetHeight
      },
      particles:{
        number:{
          value:400,
          density:{
            enable:!0,
            value_area:800
          }
        },
        color:{
          value:"#fff"
        },
        shape:{
          type:"circle",
          stroke:{
            width:0,
            color:"#ff0000"
          },
          polygon:{
            nb_sides:5
          },
          image:{
            src:"img/github.svg",
            width:100,
            height:100
          }
        },
        opacity:{
          value:1,
          random:!1,
          anim:{
            enable:!1,
            speed:2,
            opacity_min:0,
            sync:!1
          }
        },
        size:{
          value:20,
          random:!1,
          anim:{
            enable:!1,
            speed:20,
            size_min:0,
            sync:!1
          }
        },
        line_linked:{
          enable:!0,
          distance:100,
          color:"#fff",
          opacity:1,
          width:1
        },
        move:{
          enable:!0,
          speed:2,
          direction:"none",
          random:!1,
          straight:!1,
          out_mode:"out",
          bounce:!1,
          attract:{
            enable:!1,
            rotateX:3e3,
            rotateY:3e3
          }
        },
        array:[]
      },
      interactivity:{
        detect_on:"canvas",
        events:{
          onhover:{
            enable:!0,
            mode:"grab"
          },
          onclick:{
            enable:!0,
            mode:"push"
          },
          resize:!0
        },
        modes:{
          grab:{
            distance:100,
            line_linked:{
              opacity:1
            }
          },
          bubble:{
            distance:200,
            size:80,
            duration:.4
          },
          repulse:{
            distance:200,
            duration:.4
          },
          push:{
            particles_nb:4
          },
          remove:{
            particles_nb:2
          }
        },
        mouse:{}
      },
      retina_detect:!1,
      fn:{
        interact:{},
        modes:{},
        vendors:{}
      },
      tmp:{}
    };
    var i=this.pJS;
    a&&Object.deepExtend(i,a),i.tmp.obj={
      size_value:i.particles.size.value,
      size_anim_speed:i.particles.size.anim.speed,
      move_speed:i.particles.move.speed,
      line_linked_distance:i.particles.line_linked.distance,
      line_linked_width:i.particles.line_linked.width,
      mode_grab_distance:i.interactivity.modes.grab.distance,
      mode_bubble_distance:i.interactivity.modes.bubble.distance,
      mode_bubble_size:i.interactivity.modes.bubble.size,
      mode_repulse_distance:i.interactivity.modes.repulse.distance
    },i.fn.retinaInit=function(){
      i.retina_detect&&window.devicePixelRatio>1?(
        i.canvas.pxratio=window.devicePixelRatio,i.tmp.retina=!0
        ):(
        i.canvas.pxratio=1,i.tmp.retina=!1
        ),
        i.canvas.w=i.canvas.el.offsetWidth*i.canvas.pxratio,
        i.canvas.h=i.canvas.el.offsetHeight*i.canvas.pxratio,
        i.particles.size.value=i.tmp.obj.size_value*i.canvas.pxratio,
        i.particles.size.anim.speed=i.tmp.obj.size_anim_speed*i.canvas.pxratio,
        i.particles.move.speed=i.tmp.obj.move_speed*i.canvas.pxratio,
        i.particles.line_linked.distance=i.tmp.obj.line_linked_distance*i.canvas.pxratio,
        i.interactivity.modes.grab.distance=i.tmp.obj.mode_grab_distance*i.canvas.pxratio,
        i.interactivity.modes.bubble.distance=i.tmp.obj.mode_bubble_distance*i.canvas.pxratio,
        i.particles.line_linked.width=i.tmp.obj.line_linked_width*i.canvas.pxratio,
        i.interactivity.modes.bubble.size=i.tmp.obj.mode_bubble_size*i.canvas.pxratio,
        i.interactivity.modes.repulse.distance=i.tmp.obj.mode_repulse_distance*i.canvas.pxratio
    },i.fn.canvasInit=function(){
        i.canvas.ctx=i.canvas.el.getContext("2d")
    },i.fn.canvasSize=function(){
        i.canvas.el.width=i.canvas.w,
        i.canvas.el.height=i.canvas.h,
        i&&i.interactivity.events.resize&&window.addEventListener("resize",function(){
          i.canvas.w=i.canvas.el.offsetWidth,
          i.canvas.h=i.canvas.el.offsetHeight,
          i.tmp.retina&&(i.canvas.w*=i.canvas.pxratio,i.canvas.h*=i.canvas.pxratio),
          i.canvas.el.width=i.canvas.w,
          i.canvas.el.height=i.canvas.h,
          i.particles.move.enable
          ||(i.fn.particlesEmpty(),
             i.fn.particlesCreate(),
             i.fn.particlesDraw(),
             i.fn.vendors.densityAutoParticles()),
          i.fn.vendors.densityAutoParticles()
        })
    },i.fn.canvasPaint=function(){
      i.canvas.ctx.fillRect(0,0,i.canvas.w,i.canvas.h)
    },i.fn.canvasClear=function(){
      i.canvas.ctx.clearRect(0,0,i.canvas.w,i.canvas.h)
    },i.fn.particle=function(e,a,t){
      if(this.radius=(i.particles.size.random?Math.random():1)*i.particles.size.value,
        i.particles.size.anim.enable&&(
          this.size_status=!1,
          this.vs=i.particles.size.anim.speed/100,
          i.particles.size.anim.sync||(
            this.vs=this.vs*Math.random())
        ),
        this.x=t?t.x:Math.random()*i.canvas.w,
        this.y=t?t.y:Math.random()*i.canvas.h,
        this.x>i.canvas.w-2*this.radius?this.x=this.x-this.radius:this.x<2*this.radius&&(
          this.x=this.x+this.radius),
        this.y>i.canvas.h-2*this.radius?this.y=this.y-this.radius:this.y<2*this.radius&&(
          this.y=this.y+this.radius),
        i.particles.move.bounce&&i.fn.vendors.checkOverlap(this,t),
        this.color={},
        "object"==typeof e.value
      )if(e.value instanceof Array){
          var s=e.value[Math.floor(Math.random()*i.particles.color.value.length)];
          this.color.rgb=hexToRgb(s)
      }else void 0!=e.value.r&&void 0!=e.value.g&&void 0!=e.value.b&&(this.color.rgb={
        r:e.value.r,
        g:e.value.g,
        b:e.value.b
      }),
      void 0!=e.value.h&&void 0!=e.value.s&&void 0!=e.value.l&&(
        this.color.hsl={
          h:e.value.h,
          s:e.value.s,
          l:e.value.l
        });
      else"random"==e.value?this.color.rgb={
        r:Math.floor(256*Math.random())+0,
        g:Math.floor(256*Math.random())+0,
        b:Math.floor(256*Math.random())+0
      }:"string"==typeof e.value&&(
        this.color=e,this.color.rgb=hexToRgb(this.color.value)
      );
      this.opacity=(
          i.particles.opacity.random?Math.random():1
        )*i.particles.opacity.value,
        i.particles.opacity.anim.enable&&(
          this.opacity_status=!1,
          this.vo=i.particles.opacity.anim.speed/100,
          i.particles.opacity.anim.sync
          ||(this.vo=this.vo*Math.random())
        );
      var n={};
      switch(i.particles.move.direction){
        case"top":n={
          x:0,
          y:-1
        };
        break;
        case"top-right":n={
          x:.5,
          y:-.5
        };
        break;
        case"right":n={
          x:1,
          y:-0
        };
        break;
        case"bottom-right":n={
          x:.5,
          y:.5
        };break;
        case"bottom":n={
          x:0,
          y:1
        };
        break;
        case"bottom-left":n={
          x:-.5,
          y:1
        };
        break;
        case"left":n={
          x:-1,
          y:0
        };
        break;
        case"top-left":n={
          x:-.5,
          y:-.5
        };
        break;
        default:n={
          x:0,
          y:0
        }
      }
      i.particles.move.straight?(
        this.vx=n.x,
        this.vy=n.y,
        i.particles.move.random&&(
          this.vx=this.vx*Math.random(),
          this.vy=this.vy*Math.random())
        ):(
        this.vx=n.x+Math.random()-.5,
        this.vy=n.y+Math.random()-.5
        ),
        this.vx_i=this.vx,
        this.vy_i=this.vy;
      var r=i.particles.shape.type;
      if("object"==typeof r){
        if(r instanceof Array){
          var c=r[Math.floor(Math.random()*r.length)];
          this.shape=c
        }
      }else this.shape=r;
      if("image"==this.shape){
        var o=i.particles.shape;
        this.img={
          src:o.image.src,
          ratio:o.image.width/o.image.height
        },
        this.img.ratio||(this.img.ratio=1),
        "svg"==i.tmp.img_type&&void 0!=i.tmp.source_svg&&(
          i.fn.vendors.createSvgImg(this),
          i.tmp.pushing&&(this.img.loaded=!1)
        )
      }
    },i.fn.particle.prototype.draw=function(){
      function e(){
        i.canvas.ctx.drawImage(r,a.x-t,a.y-t,2*t,2*t/a.img.ratio)
      }var a=this;
      if(void 0!=a.radius_bubble)var t=a.radius_bubble;
      else var t=a.radius;
      if(void 0!=a.opacity_bubble)var s=a.opacity_bubble;
      else var s=a.opacity;
      if(a.color.rgb)var n="rgba("+a.color.rgb.r+","+a.color.rgb.g+","+a.color.rgb.b+","+s+")";
      else var n="hsla("+a.color.hsl.h+","+a.color.hsl.s+"%,"+a.color.hsl.l+"%,"+s+")";
      switch(i.canvas.ctx.fillStyle=n,i.canvas.ctx.beginPath(),a.shape){
        case"circle":
          i.canvas.ctx.arc(a.x,a.y,t,0,2*Math.PI,!1);
          break;
        case"edge":
          i.canvas.ctx.rect(a.x-t,a.y-t,2*t,2*t);
          break;
        case"triangle":
          i.fn.vendors.drawShape(i.canvas.ctx,a.x-t,a.y+t/1.66,2*t,3,2);
          break;
        case"polygon":
          i.fn.vendors.drawShape(i.canvas.ctx,a.x-t/(i.particles.shape.polygon.nb_sides/3.5),a.y-t/.76,2.66*t/(i.particles.shape.polygon.nb_sides/3),i.particles.shape.polygon.nb_sides,1);
          break;
        case"star":
          i.fn.vendors.drawShape(i.canvas.ctx,a.x-2*t/(i.particles.shape.polygon.nb_sides/4),a.y-t/1.52,2*t*2.66/(i.particles.shape.polygon.nb_sides/3),i.particles.shape.polygon.nb_sides,2);
          break;
        case"image":
          if("svg"==i.tmp.img_type)var r=a.img.obj;
          else var r=i.tmp.img_obj;
          r&&e()
        }i.canvas.ctx.closePath(),
        i.particles.shape.stroke.width>0&&(
          i.canvas.ctx.strokeStyle=i.particles.shape.stroke.color,
          i.canvas.ctx.lineWidth=i.particles.shape.stroke.width,
          i.canvas.ctx.stroke()
        ),
      i.canvas.ctx.fill()
    },i.fn.particlesCreate=function(){
      for(var e=0;e<i.particles.number.value;e++)i.particles.array.push(new i.fn.particle(i.particles.color,i.particles.opacity.value))
    },i.fn.particlesUpdate=function(){
      for(var e=0;e<i.particles.array.length;e++){
        var a=i.particles.array[e];
        if(i.particles.move.enable){
          var t=i.particles.move.speed/2;a.x+=a.vx*t,a.y+=a.vy*t
        }
        if(i.particles.opacity.anim.enable&&(
          1==a.opacity_status?(a.opacity>=i.particles.opacity.value&&(a.opacity_status=!1),a.opacity+=a.vo
        ):(
          a.opacity<=i.particles.opacity.anim.opacity_min&&(a.opacity_status=!0),a.opacity-=a.vo
        ),
          a.opacity<0&&(a.opacity=0)
        ),i.particles.size.anim.enable&&(
          1==a.size_status?(a.radius>=i.particles.size.value&&(a.size_status=!1),a.radius+=a.vs
        ):(
          a.radius<=i.particles.size.anim.size_min&&(a.size_status=!0),a.radius-=a.vs),a.radius<0&&(a.radius=0)
        ),
        "bounce"==i.particles.move.out_mode
        )var s={
          x_left:a.radius,
          x_right:i.canvas.w,
          y_top:a.radius,
          y_bottom:i.canvas.h
        };
        else var s={
          x_left:-a.radius,
          x_right:i.canvas.w+a.radius,
          y_top:-a.radius,
          y_bottom:i.canvas.h+a.radius
        };
        switch(a.x-a.radius>i.canvas.w?(a.x=s.x_left,a.y=Math.random()*i.canvas.h):a.x+a.radius<0&&(a.x=s.x_right,a.y=Math.random()*i.canvas.h),a.y-a.radius>i.canvas.h?(a.y=s.y_top,a.x=Math.random()*i.canvas.w):a.y+a.radius<0&&(a.y=s.y_bottom,a.x=Math.random()*i.canvas.w),i.particles.move.out_mode){
          case"bounce":
            a.x+a.radius>i.canvas.w?a.vx=-a.vx:a.x-a.radius<0&&(a.vx=-a.vx),
            a.y+a.radius>i.canvas.h?a.vy=-a.vy:a.y-a.radius<0&&(a.vy=-a.vy)
          }
        if(isInArray("grab",i.interactivity.events.onhover.mode)&&i.fn.modes.grabParticle(a)
          ,(isInArray("bubble",i.interactivity.events.onhover.mode)||isInArray("bubble",i.interactivity.events.onclick.mode))&&i.fn.modes.bubbleParticle(a),(isInArray("repulse",i.interactivity.events.onhover.mode)||isInArray("repulse",i.interactivity.events.onclick.mode))&&i.fn.modes.repulseParticle(a),i.particles.line_linked.enable||i.particles.move.attract.enable)
          for(var n=e+1;n<i.particles.array.length;n++){
            var r=i.particles.array[n];i.particles.line_linked.enable&&i.fn.interact.linkParticles(a,r),
                i.particles.move.attract.enable&&i.fn.interact.attractParticles(a,r),
                i.particles.move.bounce&&i.fn.interact.bounceParticles(a,r)
        }
      }
    },i.fn.particlesDraw=function(){
      i.canvas.ctx.clearRect(0,0,i.canvas.w,i.canvas.h),
      i.fn.particlesUpdate();
      for(var e=0;e<i.particles.array.length;e++){
        var a=i.particles.array[e];a.draw()
      }
    },i.fn.particlesEmpty=function(){
      i.particles.array=[]
    },i.fn.particlesRefresh=function(){
      cancelRequestAnimFrame(i.fn.checkAnimFrame),
      cancelRequestAnimFrame(i.fn.drawAnimFrame),
      i.tmp.source_svg=void 0,
      i.tmp.img_obj=void 0,
      i.tmp.count_svg=0,
      i.fn.particlesEmpty(),
      i.fn.canvasClear(),
      i.fn.vendors.start()
    },i.fn.interact.linkParticles=function(e,a){
      var t=e.x-a.x,s=e.y-a.y,n=Math.sqrt(t*t+s*s);
      if(n<=i.particles.line_linked.distance){
        var r=i.particles.line_linked.opacity-n/(1/i.particles.line_linked.opacity)/i.particles.line_linked.distance;
        if(r>0){
          var c=i.particles.line_linked.color_rgb_line;i.canvas.ctx.strokeStyle="rgba("+c.r+","+c.g+","+c.b+","+r+")",
          i.canvas.ctx.lineWidth=i.particles.line_linked.width,i.canvas.ctx.beginPath(),
          i.canvas.ctx.moveTo(e.x,e.y),
          i.canvas.ctx.lineTo(a.x,a.y),
          i.canvas.ctx.stroke(),
          i.canvas.ctx.closePath()
        }
      }
    },i.fn.interact.attractParticles=function(e,a){
      var t=e.x-a.x,s=e.y-a.y,n=Math.sqrt(t*t+s*s);
      if(n<=i.particles.line_linked.distance){
        var r=t/(1e3*i.particles.move.attract.rotateX),
            c=s/(1e3*i.particles.move.attract.rotateY);
        e.vx-=r,e.vy-=c,a.vx+=r,a.vy+=c
      }
    },i.fn.interact.bounceParticles=function(e,a){
      var t=e.x-a.x,i=e.y-a.y,s=Math.sqrt(t*t+i*i),
          n=e.radius+a.radius;
          n>=s&&(e.vx=-e.vx,e.vy=-e.vy,a.vx=-a.vx,a.vy=-a.vy)
    },i.fn.modes.pushParticles=function(e,a){
      i.tmp.pushing=!0;
      for(var t=0;e>t;t++)i.particles.array.push(
        new i.fn.particle(
          i.particles.color,i.particles.opacity.value,{
            x:a?a.pos_x:Math.random()*i.canvas.w,y:a?a.pos_y:Math.random()*i.canvas.h
          }
        )
      ),
      t==e-1&&(i.particles.move.enable||i.fn.particlesDraw(),i.tmp.pushing=!1)
    },i.fn.modes.removeParticles=function(e){
      i.particles.array.splice(0,e),
      i.particles.move.enable||i.fn.particlesDraw()
    },i.fn.modes.bubbleParticle=function(e){
      function a(){
        e.opacity_bubble=e.opacity,
        e.radius_bubble=e.radius
      }
      function t(a,t,s,n,c){
        if(a!=t){
          if(i.tmp.bubble_duration_end){
            if(void 0!=s){
              var o=n-p*(n-a)/i.interactivity.modes.bubble.duration,
                  l=a-o;
              d=a+l,
              "size"==c&&(e.radius_bubble=d),
              "opacity"==c&&(e.opacity_bubble=d)
            }
          }else if(r<=i.interactivity.modes.bubble.distance){
            if(void 0!=s)var v=s;
            else var v=n;
            if(v!=a){
              var d=n-p*(n-a)/i.interactivity.modes.bubble.duration;
              "size"==c&&(e.radius_bubble=d),
              "opacity"==c&&(e.opacity_bubble=d)
            }
          }else"size"==c&&(e.radius_bubble=void 0),
               "opacity"==c&&(e.opacity_bubble=void 0)
        }
      }
      if(i.interactivity.events.onhover.enable&&isInArray("bubble",i.interactivity.events.onhover.mode)){
        var s=e.x-i.interactivity.mouse.pos_x,
            n=e.y-i.interactivity.mouse.pos_y,
            r=Math.sqrt(s*s+n*n),c=1-r/i.interactivity.modes.bubble.distance;
        if(r<=i.interactivity.modes.bubble.distance){
          if(c>=0&&"mousemove"==i.interactivity.status){
            if(i.interactivity.modes.bubble.size!=i.particles.size.value)
              if(i.interactivity.modes.bubble.size>i.particles.size.value){
                var o=e.radius+i.interactivity.modes.bubble.size*c;
                o>=0&&(e.radius_bubble=o)
              }else{
                var l=e.radius-i.interactivity.modes.bubble.size,
                    o=e.radius-l*c;
                o>0?e.radius_bubble=o:e.radius_bubble=0
              }if(i.interactivity.modes.bubble.opacity!=i.particles.opacity.value)
                if(i.interactivity.modes.bubble.opacity>i.particles.opacity.value){
                  var v=i.interactivity.modes.bubble.opacity*c;v>e.opacity&&v<=i.interactivity.modes.bubble.opacity&&(e.opacity_bubble=v)
                }else{
                  var v=e.opacity-(i.particles.opacity.value-i.interactivity.modes.bubble.opacity)*c;
                  v<e.opacity&&v>=i.interactivity.modes.bubble.opacity&&(e.opacity_bubble=v)
                }
              }
        }else a();
            "mouseleave"==i.interactivity.status&&a()
      }else if(i.interactivity.events.onclick.enable&&isInArray("bubble",i.interactivity.events.onclick.mode)){
        if(i.tmp.bubble_clicking){
          var s=e.x-i.interactivity.mouse.click_pos_x,
              n=e.y-i.interactivity.mouse.click_pos_y,
              r=Math.sqrt(s*s+n*n),
              p=((new Date).getTime()-i.interactivity.mouse.click_time)/1e3;
          p>i.interactivity.modes.bubble.duration&&(i.tmp.bubble_duration_end=!0),
          p>2*i.interactivity.modes.bubble.duration&&(i.tmp.bubble_clicking=!1,i.tmp.bubble_duration_end=!1)
        }i.tmp.bubble_clicking&&(t(i.interactivity.modes.bubble.size,i.particles.size.value,e.radius_bubble,e.radius,"size"),t(i.interactivity.modes.bubble.opacity,i.particles.opacity.value,e.opacity_bubble,e.opacity,"opacity"))
      }
    },i.fn.modes.repulseParticle=function(e){
      function a(){
        var a=Math.atan2(d,p);
        if(e.vx=u*Math.cos(a),e.vy=u*Math.sin(a),"bounce"==i.particles.move.out_mode){
          var t={
            x:e.x+e.vx,
            y:e.y+e.vy
          };
          t.x+e.radius>i.canvas.w?e.vx=-e.vx:t.x-e.radius<0&&(e.vx=-e.vx),t.y+e.radius>i.canvas.h?e.vy=-e.vy:t.y-e.radius<0&&(e.vy=-e.vy)
        }
      }if(i.interactivity.events.onhover.enable&&isInArray("repulse",i.interactivity.events.onhover.mode)&&"mousemove"==i.interactivity.status){
        var t=e.x-i.interactivity.mouse.pos_x,
            s=e.y-i.interactivity.mouse.pos_y,
            n=Math.sqrt(t*t+s*s),
            r={
              x:t/n,
              y:s/n
            },
            c=i.interactivity.modes.repulse.distance,
            o=100,
            l=clamp(1/c*(-1*Math.pow(n/c,2)+1)*c*o,0,50),
            v={
              x:e.x+r.x*l,
              y:e.y+r.y*l
            };
        "bounce"==i.particles.move.out_mode?(v.x-e.radius>0&&v.x+e.radius<i.canvas.w&&(e.x=v.x),v.y-e.radius>0&&v.y+e.radius<i.canvas.h&&(e.y=v.y)):(e.x=v.x,e.y=v.y)
      }else if(i.interactivity.events.onclick.enable&&isInArray("repulse",i.interactivity.events.onclick.mode))
        if(i.tmp.repulse_finish||(i.tmp.repulse_count++,i.tmp.repulse_count==i.particles.array.length&&(i.tmp.repulse_finish=!0)),i.tmp.repulse_clicking){
          var c=Math.pow(i.interactivity.modes.repulse.distance/6,3),
              p=i.interactivity.mouse.click_pos_x-e.x,
              d=i.interactivity.mouse.click_pos_y-e.y,
              m=p*p+d*d,
              u=-c/m*1;
          c>=m&&a()
        }else 0==i.tmp.repulse_clicking&&(e.vx=e.vx_i,e.vy=e.vy_i)
    },i.fn.modes.grabParticle=function(e){
      if(i.interactivity.events.onhover.enable&&"mousemove"==i.interactivity.status){
        var a=e.x-i.interactivity.mouse.pos_x,
            t=e.y-i.interactivity.mouse.pos_y,
            s=Math.sqrt(a*a+t*t);
        if(s<=i.interactivity.modes.grab.distance){
          var n=i.interactivity.modes.grab.line_linked.opacity-s/(1/i.interactivity.modes.grab.line_linked.opacity)/i.interactivity.modes.grab.distance;
          if(n>0){
            var r=i.particles.line_linked.color_rgb_line;
            i.canvas.ctx.strokeStyle="rgba("+r.r+","+r.g+","+r.b+","+n+")",
            i.canvas.ctx.lineWidth=i.particles.line_linked.width,
            i.canvas.ctx.beginPath(),
            i.canvas.ctx.moveTo(e.x,e.y),
            i.canvas.ctx.lineTo(i.interactivity.mouse.pos_x,i.interactivity.mouse.pos_y),
            i.canvas.ctx.stroke(),i.canvas.ctx.closePath()
          }
        }
      }
    },i.fn.vendors.eventsListeners=function(){
      "window"==i.interactivity.detect_on?i.interactivity.el=window:i.interactivity.el=i.canvas.el,
      (i.interactivity.events.onhover.enable||i.interactivity.events.onclick.enable)&&(i.interactivity.el.addEventListener("mousemove",function(e){
        if(i.interactivity.el==window)
          var a=e.clientX,t=
              e.clientY;
        else
          var a=e.offsetX||e.clientX,
              t=e.offsetY||e.clientY;
        i.interactivity.mouse.pos_x=a,
        i.interactivity.mouse.pos_y=t,
        i.tmp.retina&&(i.interactivity.mouse.pos_x*=i.canvas.pxratio,i.interactivity.mouse.pos_y*=i.canvas.pxratio),
        i.interactivity.status="mousemove"}),
        i.interactivity.el.addEventListener("mouseleave",function(e){
          i.interactivity.mouse.pos_x=null,
          i.interactivity.mouse.pos_y=null,
          i.interactivity.status="mouseleave"
        })
      ),i.interactivity.events.onclick.enable&&i.interactivity.el.addEventListener("click",function(){
      if(i.interactivity.mouse.click_pos_x=i.interactivity.mouse.pos_x,i.interactivity.mouse.click_pos_y=i.interactivity.mouse.pos_y,i.interactivity.mouse.click_time=(new Date).getTime(),i.interactivity.events.onclick.enable)
        switch(i.interactivity.events.onclick.mode){
          case"push":
            i.particles.move.enable?i.fn.modes.pushParticles(i.interactivity.modes.push.particles_nb,i.interactivity.mouse):1==i.interactivity.modes.push.particles_nb?i.fn.modes.pushParticles(i.interactivity.modes.push.particles_nb,i.interactivity.mouse):i.interactivity.modes.push.particles_nb>1&&i.fn.modes.pushParticles(i.interactivity.modes.push.particles_nb);
            break;
          case"remove":
            i.fn.modes.removeParticles(i.interactivity.modes.remove.particles_nb);
            break;
          case"bubble":
            i.tmp.bubble_clicking=!0;
            break;
          case"repulse":
            i.tmp.repulse_clicking=!0,
            i.tmp.repulse_count=0,
            i.tmp.repulse_finish=!1,
            setTimeout(function(){
              i.tmp.repulse_clicking=!1
            },1e3*i.interactivity.modes.repulse.duration)}
          })
    },i.fn.vendors.densityAutoParticles=function(){
      if(i.particles.number.density.enable){
        var e=i.canvas.el.width*i.canvas.el.height/1e3;
        i.tmp.retina&&(e/=2*i.canvas.pxratio);
        var a=e*i.particles.number.value/i.particles.number.density.value_area,
            t=i.particles.array.length-a;
        0>t?i.fn.modes.pushParticles(Math.abs(t)):i.fn.modes.removeParticles(t)
      }
    },i.fn.vendors.checkOverlap=function(e,a){
      for(var t=0;t<i.particles.array.length;t++){
        var s=i.particles.array[t],
            n=e.x-s.x,r=e.y-s.y,
            c=Math.sqrt(n*n+r*r);
        c<=e.radius+s.radius&&(e.x=a?a.x:Math.random()*i.canvas.w,e.y=a?a.y:Math.random()*i.canvas.h,i.fn.vendors.checkOverlap(e))
      }
    },i.fn.vendors.createSvgImg=function(e){
      var a=i.tmp.source_svg,
          t=/#([0-9A-F]{3,6})/gi,
          s=a.replace(t,function(a,t,i,s){
            if(e.color.rgb)
              var n="rgba("+e.color.rgb.r+","+e.color.rgb.g+","+e.color.rgb.b+","+e.opacity+")";
            else
              var n="hsla("+e.color.hsl.h+","+e.color.hsl.s+"%,"+e.color.hsl.l+"%,"+e.opacity+")";
            return n
          }),
          n=new Blob([s],{
              type:"image/svg+xml;charset=utf-8"
            }),
          r=window.URL||window.webkitURL||window,
          c=r.createObjectURL(n),
          o=new Image;
      o.addEventListener("load",function(){
        e.img.obj=o,
        e.img.loaded=!0,
        r.revokeObjectURL(c),
        i.tmp.count_svg++
      }),
      o.src=c
    },i.fn.vendors.destroypJS=function(){
      cancelAnimationFrame(i.fn.drawAnimFrame),
      t.remove(),
      pJSDom=null
    },i.fn.vendors.drawShape=function(e,a,t,i,s,n){
      var r=s*n,
          c=s/n,
          o=180*(c-2)/c,
          l=Math.PI-Math.PI*o/180;
      e.save(),
      e.beginPath(),
      e.translate(a,t),
      e.moveTo(0,0);
      for(var v=0;r>v;v++)
        e.lineTo(i,0),
        e.translate(i,0),
        e.rotate(l);
      e.fill(),
      e.restore()
    },i.fn.vendors.exportImg=function(){
      window.open(i.canvas.el.toDataURL("image/png"),"_blank")
    },i.fn.vendors.loadImg=function(e){
      if(i.tmp.img_error=void 0,""!=i.particles.shape.image.src)
        if("svg"==e){
          var a=new XMLHttpRequest;
          a.open("GET",i.particles.shape.image.src),
          a.onreadystatechange=function(e){
            4==a.readyState&&(200==a.status?(i.tmp.source_svg=e.currentTarget.response,i.fn.vendors.checkBeforeDraw()):(console.log("Error pJS - Image not found"),i.tmp.img_error=!0))
          },a.send()
        }else{
          var t=new Image;
          t.addEventListener("load",function(){
            i.tmp.img_obj=t,
            i.fn.vendors.checkBeforeDraw()
          }),
          t.src=i.particles.shape.image.src
        }else
          console.log("Error pJS - No image.src"),
          i.tmp.img_error=!0
    },i.fn.vendors.draw=function(){
        "image"==i.particles.shape.type
        ?"svg"==i.tmp.img_type
        ?i.tmp.count_svg>=i.particles.number.value
        ?(i.fn.particlesDraw(),i.particles.move.enable
          ?i.fn.drawAnimFrame=requestAnimFrame(i.fn.vendors.draw):cancelRequestAnimFrame(i.fn.drawAnimFrame)
        ):i.tmp.img_error||(i.fn.drawAnimFrame=requestAnimFrame(i.fn.vendors.draw))
        :void 0!=i.tmp.img_obj
        ?(i.fn.particlesDraw(),i.particles.move.enable
          ?i.fn.drawAnimFrame=requestAnimFrame(i.fn.vendors.draw)
          :cancelRequestAnimFrame(i.fn.drawAnimFrame)
        ):i.tmp.img_error||(i.fn.drawAnimFrame=requestAnimFrame(i.fn.vendors.draw)
        ):(i.fn.particlesDraw(),i.particles.move.enable?i.fn.drawAnimFrame=requestAnimFrame(i.fn.vendors.draw)
        :cancelRequestAnimFrame(i.fn.drawAnimFrame))
    },i.fn.vendors.checkBeforeDraw=function(){
        "image"==i.particles.shape.type
        ?"svg"==i.tmp.img_type&&void 0==i.tmp.source_svg
        ?i.tmp.checkAnimFrame=requestAnimFrame(check)
        :(cancelRequestAnimFrame(i.tmp.checkAnimFrame),i.tmp.img_error||(i.fn.vendors.init(),i.fn.vendors.draw()))
        :(i.fn.vendors.init(),i.fn.vendors.draw())
    },i.fn.vendors.init=function(){
        i.fn.retinaInit(),
        i.fn.canvasInit(),
        i.fn.canvasSize(),
        i.fn.canvasPaint(),
        i.fn.particlesCreate(),
        i.fn.vendors.densityAutoParticles(),
        i.particles.line_linked.color_rgb_line=hexToRgb(i.particles.line_linked.color)
    },i.fn.vendors.start=function(){
        isInArray("image",i.particles.shape.type)?(i.tmp.img_type=i.particles.shape.image.src.substr(i.particles.shape.image.src.length-3),i.fn.vendors.loadImg(i.tmp.img_type)):i.fn.vendors.checkBeforeDraw()
    },i.fn.vendors.eventsListeners(),i.fn.vendors.start()
  };

  Object.deepExtend=function(e,a){
    for(var t in a)a[t]&&a[t].constructor&&a[t].constructor===Object?(e[t]=e[t]||{},arguments.callee(e[t],a[t])):e[t]=a[t];return e
  },window.requestAnimFrame=function(){
    return window.requestAnimationFrame||window.webkitRequestAnimationFrame||window.mozRequestAnimationFrame||window.oRequestAnimationFrame||window.msRequestAnimationFrame||function(e){window.setTimeout(e,1e3/60)}
  }(),window.cancelRequestAnimFrame=function(){
    return window.cancelAnimationFrame||window.webkitCancelRequestAnimationFrame||window.mozCancelRequestAnimationFrame||window.oCancelRequestAnimationFrame||window.msCancelRequestAnimationFrame||clearTimeout
  }(),window.pJSDom=[],window.particlesJS=function(e,a){
    "string"!=typeof e&&(a=e,e="particles-js"),e||(e="particles-js");
    var t=document.getElementById(e),
        i="particles-js-canvas-el",
        s=t.getElementsByClassName(i);
    if(s.length)
      for(;s.length>0;)
        t.removeChild(s[0]);
      var n=document.createElement("canvas");
      n.className=i,
      n.style.width="100%",
      n.style.height="100%";
    var r=document.getElementById(e).appendChild(n);
    null!=r&&pJSDom.push(new pJS(e,a))
  },window.particlesJS.load=function(e,a,t){
    var i=new XMLHttpRequest;
    i.open("GET",a),
    i.onreadystatechange=function(a){
      if(4==i.readyState)
        if(200==i.status){
          var s=JSON.parse(a.currentTarget.response);
          window.particlesJS(e,s),t&&t()
        }else console.log("Error pJS - XMLHttpRequest status: "+i.status),
              console.log("Error pJS - File config not found")
    },i.send()
  };

  particlesJS('particles-js',
    {
      "particles": {
        "number": {
          "value": 15,
          "density": {
            "enable": true,
            "value_area": 400
          }
        },
        "color": {
          "value": "#ffffff"
        },
        "shape": {
          "type": "circle",
          "stroke": {
            "width": 0,
            "color": "#000000"
          },
          "polygon": {
            "nb_sides": 5
          },
          "image": {
            "src": "img/github.svg",
            "width": 100,
            "height": 100
          }
        },
        "opacity": {
          "value": 0.5,
          "random": false,
          "anim": {
            "enable": false,
            "speed": 1,
            "opacity_min": 0.1,
            "sync": false
          }
        },
        "size": {
          "value": 7,
          "random": true,
          "anim": {
            "enable": false,
            "speed": 5,
            "size_min": 0.1,
            "sync": false
          }
        },
        "line_linked": {
          "enable": true,
          "distance": 300,
          "color": "#ffffff",
          "opacity": 0.4,
          "width": 1
        },
        "move": {
          "enable": true,
          "speed": 6,
          "direction": "none",
          "random": false,
          "straight": false,
          "out_mode": "out",
          "attract": {
            "enable": false,
            "rotateX": 600,
            "rotateY": 1200
          }
        }
      },
      "interactivity": {
        "detect_on": "canvas",
        "events": {
          "onhover": {
            "enable": false,
            "mode": "repulse"
          },
          "onclick": {
            "enable": false,
            "mode": "push"
          },
          "resize": true
        },
        "modes": {
          "grab": {
            "distance": 400,
            "line_linked": {
              "opacity": 1
            }
          },
          "bubble": {
            "distance": 400,
            "size": 40,
            "duration": 2,
            "opacity": 8,
            "speed": 3
          },
          "repulse": {
            "distance": 200
          },
          "push": {
            "particles_nb": 2
          },
          "remove": {
            "particles_nb": 2
          }
        }
      },
      "retina_detect": true,
      "config_demo": {
        "hide_card": false,
        "background_color": "#b61924",
        "background_image": "",
        "background_position": "50% 50%",
        "background_repeat": "no-repeat",
        "background_size": "cover"
      }
    }
  );
}

