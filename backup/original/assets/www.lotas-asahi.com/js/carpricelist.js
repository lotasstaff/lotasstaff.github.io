/*
cms/js/carpricelist.js
2018-11-05 tsuda
編集公開共通
 */

"use strict";

var globalCarPriceList = {
        minTable: 1, // 車検料金表の項目数の最大数
        maxTable: 5,
        pcTableTag: "",
        pcTables: [],
        $thTdTags: [], // jQeryオブジェクト
        thTdTags: [],
        spTables: [],
        minTh: 0, // 車種重量
        maxTh: 5,
        minleftTd: 0, // 車種の例
        maxLeftTd: 10,
        minField: 1, // フィールド
        maxField: 5,
        minMainField: 10, // ￥
        maxMainField: 100,
        minMainTr: 1, // メインtr
        maxMainTr: 10,
        noSuffix: 5, // 5の接尾辞は使われていない
        suffix10: 10, // 2桁の接尾辞
        suffix50: 50, // 50番台の接尾辞
        noText: "(クリックして入力してください)"
    };

/**
 * 変数名生成
 * @param  {Number} index 最大テーブル数
 * @return {String}       配列変数の添え字名
 */
globalCarPriceList.makePrefix = function(index) {
    return "price01_b_02_" + index;
};

/**
 * 文字列が変更されているか
 * @param  {String}  text 文字列
 * @return {Boolean}      trueかfalse
 */
globalCarPriceList.isNoText = function(text) {
    return text === globalCarPriceList.noText;
};

/**
 * スマホテーブル表示
 * @return {void} なし
 */
globalCarPriceList.makeSpTables = function() {

    $(function() {

        for (var i = globalCarPriceList.minTable; i <= globalCarPriceList.maxTable; i++) {
            $("#" + globalCarPriceList.makePrefix(i) + "_title").next(".pricetable_block").remove();
            $("#" + globalCarPriceList.makePrefix(i) + "_title").after(globalCarPriceList.spTables[i]);
        }

    });
};

/**
 * PCテーブル表示
 * @return {void} なし
 */
globalCarPriceList.makePcTables = function() {

    $(function() {

        for (var i = globalCarPriceList.minTable; i <= globalCarPriceList.maxTable; i++) {
            $("#" + globalCarPriceList.makePrefix(i) + "_title").next(".pricetable_block").remove();
            $("#" + globalCarPriceList.makePrefix(i) + "_title").after(globalCarPriceList.pcTables[i]);
        }

    });

};

$(function() {

    // PCテーブル作成
    for (var i = globalCarPriceList.minTable; i <= globalCarPriceList.maxTable; i++) {
        globalCarPriceList.pcTableTag = $("#" + globalCarPriceList.makePrefix(i) + "_title").next(".pricetable_block").html();

        globalCarPriceList.pcTables[i] =
            '<div class="pricetable_block">' +
                globalCarPriceList.pcTableTag +
            '</div>';
    }

    ///////////////////
    // 編集PCのボタンクリック時 //
    ///////////////////

    /**
     * グローバル変数から取得
     * @param  {Number} tableNum テーブル番号
     * @return {Number}          表示されている最終tr
     */
    var getCurrentTrCnt = function(tableNum) {
        return price01TableCntAry[tableNum - 1]; // グローバル変数使用
    };

    /**
     * グローバル変数を更新
     * @param  {Number} tableNum テーブル番号
     * @param  {String}          editMode mかp
     */
    var setCurrentTrCnt = function(tableNum, editMode) {
        if (editMode === "m") {
            price01TableCntAry[tableNum - 1]--; // グローバル変数使用
        } else {
            price01TableCntAry[tableNum - 1]++; // グローバル変数使用
        }
    };

    /**
     * 操作対象tr
     * @param  {Number} tableNum テーブル番号
     * @param  {String} editMode mかp
     * @return {Number}          操作対象tr
     */
    var getTargetNum = function(tableNum, editMode) {
        var cnt = getCurrentTrCnt(tableNum);

        if (editMode === "m") {
            cnt;
        } else {
            cnt++;
        }

        if (cnt > globalCarPriceList.noSuffix) {
            return cnt;
        } else {
            return cnt - 1;
        }
    };

    /**
     * trの表示/非表示
     * @param  {Number} tableNum  テーブル番号
     * @param  {String} editMode  mかp
     * @param  {Number} targetNum 操作対象tr
     * @return {void}             なし
     */
    var editTrCnt = function(tableNum, editMode, targetNum) {
        if (targetNum >= globalCarPriceList.minMainTr && targetNum <= globalCarPriceList.maxMainTr) {
            var targetTR = $("#price01_" + tableNum + "_" + targetNum);

            // 減らす
            if (editMode === "m") {
                targetTR.slideUp(400, function() {
                    if (getCurrentTrCnt(tableNum) >= globalCarPriceList.minMainTr) {
                        setCurrentTrCnt(tableNum, editMode);
                    }

                    editBtnRefresh(tableNum);
                    price01DbUpdate(pm_shop_id, tableNum, getCurrentTrCnt(tableNum)); // グローバル変数使用
                });

            // 増やす
            } else if (editMode === "p") {
                targetTR.slideDown(400, function() {
                    if (getCurrentTrCnt(tableNum) < globalCarPriceList.maxMainTr) {
                        setCurrentTrCnt(tableNum, editMode);
                    }

                    editBtnRefresh(tableNum);
                    price01DbUpdate(pm_shop_id, tableNum, getCurrentTrCnt(tableNum)); // グローバル変数使用
                });
            }
        }
    };

    /**
     * 「+」「-」ボタンの表示/非表示
     * @param  {Number} tableNum テーブル番号
     * @return {void}            なし
     */
    var editBtnRefresh = function(tableNum) {
        // 「-」ボタン
        if (getCurrentTrCnt(tableNum) <= globalCarPriceList.minMainTr) {
            $("#tr_m_" + tableNum).hide();
        } else {
            $("#tr_m_" + tableNum).show();
        }

        // 「+」ボタン
        if (getCurrentTrCnt(tableNum) >= globalCarPriceList.maxMainTr) {
            $("#tr_p_" + tableNum).hide();
        } else {
            $("#tr_p_" + tableNum).show();
        }
    };

    /**
     * DBのアップデート
     * @param  {String} shopId   アカウント
     * @param  {Number} tableNum テーブル番号
     * @param  {Number} cntNum   変更後の最終tr
     * @return {void}            なし
     */
    var price01DbUpdate = function(shopId, tableNum, cntNum) {
        $.ajax({
                type: "post",
                url: "js/carprice01_server.php",
                data: {
                    "shop_id": shopId,
                    "table_num": tableNum,
                    "cnt_num": cntNum
                },
                dataType: "json"
            })
            .done(function(obj) {
                // console.log("result=" + obj.result + " resFlag=" + obj.resFlag);
            })
            .fail(function() {
                alert("データの読み込みに失敗しました。しばらくたってからアクセスし直してみてください。");
            });
    };

    $(".tr_minus_btn, .tr_plus_btn").click(function() {

        var currentId = $(this).attr("id");

        if (typeof currentId !== "undefined") {
            var tmp = currentId.split("_");
            var editMode = tmp[1]; // mかp
            var tableNum = parseInt(tmp[2]); // テーブル番号
        }

        if (tableNum > 0) {
            var targetNum = getTargetNum(tableNum, editMode);

            editTrCnt(tableNum, editMode, targetNum);
        }
    });

});

/**
 * スマホテーブル作成
 */
globalCarPriceList.setSpTables = function() {

    for (var i = globalCarPriceList.minTable; i <= globalCarPriceList.maxTable; i++) {
        var trTag = "";// 初期化

        // th取得
        for (var j = globalCarPriceList.minTh; j <= globalCarPriceList.maxTh; j++) {
            var tag = globalCarPriceList.makePrefix(i) + "_" + j + "type";

            globalCarPriceList.$thTdTags[tag] = $("#" + tag);

            if (j === globalCarPriceList.minTh) {
                // id属性inplaceクラス削除
                globalCarPriceList.$thTdTags[tag]
                    .removeAttr("id")
                    .removeClass("inplace");

                if (globalCarPriceList.isNoText(globalCarPriceList.$thTdTags[tag].text())) {
                    globalCarPriceList.$thTdTags[tag].text("(未入力)");
                }

                globalCarPriceList.thTdTags[tag] = '<th colspan="2">' + globalCarPriceList.$thTdTags[tag].parent().html() + '</th>';
            } else {
                // クラス削除
                globalCarPriceList.$thTdTags[tag].removeClass("inplace");

                if (globalCarPriceList.isNoText(globalCarPriceList.$thTdTags[tag].text())) {
                    globalCarPriceList.$thTdTags[tag].text("(未入力)");
                }

                globalCarPriceList.thTdTags[tag] = '<th colspan="2">' + globalCarPriceList.$thTdTags[tag].parent().html() + '</th>';
            }
        }

        // 左端td取得
        for (var j = globalCarPriceList.minleftTd; j <= globalCarPriceList.maxLeftTd; j++) {
            var tag = globalCarPriceList.makePrefix(i) + "_" + j + "name";

            globalCarPriceList.$thTdTags[tag] = $("#" + tag);
            // id属性クラス削除
            globalCarPriceList.$thTdTags[tag]
                .removeAttr("id")
                .removeClass("inplace");

            if (globalCarPriceList.isNoText(globalCarPriceList.$thTdTags[tag].text())) {
                globalCarPriceList.$thTdTags[tag].text("(未入力)");
            }

            if (j === globalCarPriceList.minleftTd) {

                globalCarPriceList.thTdTags[tag] = '<td>' + globalCarPriceList.$thTdTags[tag].parent().html() + '</td>';
            } else {

                globalCarPriceList.thTdTags[tag] = '<td class="price01_td">' + globalCarPriceList.$thTdTags[tag].parent().html() + '</td>';
            }
        }

        // フィールド取得
        for (var j = globalCarPriceList.minField; j <= globalCarPriceList.maxField; j++) {
            var tag = globalCarPriceList.makePrefix(i) + "_" + j;

            globalCarPriceList.$thTdTags[tag] = $("#" + tag);
            // クラス削除
            globalCarPriceList.$thTdTags[tag].removeClass("inplace");

            if (globalCarPriceList.isNoText(globalCarPriceList.$thTdTags[tag].text())) {
                globalCarPriceList.$thTdTags[tag].text("(未入力)");
            }

            ////////////////
            // 編集の場合aタグ削除 //
            ////////////////
            if (edit_param === "1" && sp_param === "1") { // グローバル変数使用
                // 画像がある場合
                if (globalCarPriceList.$thTdTags[tag].parent().find("img").length > 0) {
                    globalCarPriceList.$thTdTags[tag].parent().find("img").unwrap();

                } else {
                    globalCarPriceList.$thTdTags[tag].next("br").next("br").next("a").attr("href", "javascript: void(0);").text("(画像なし)");
                }
            }

            globalCarPriceList.thTdTags[tag] = '<td>' + globalCarPriceList.$thTdTags[tag].parent().html() + '</td>';
        }

        // メインフィールド取得
        for (var j = globalCarPriceList.minMainField; j <= globalCarPriceList.maxMainField; j++) {
            for (var k = globalCarPriceList.minField; k <= globalCarPriceList.maxField; k++) {
                var tag = globalCarPriceList.makePrefix(i) + "_" + (j + k);

                globalCarPriceList.$thTdTags[tag] = $("#" + tag);
                globalCarPriceList.$thTdTags[tag].removeClass("inplace");

                if (globalCarPriceList.isNoText(globalCarPriceList.$thTdTags[tag].text())) {
                    globalCarPriceList.$thTdTags[tag].text("(未入力)");
                }

                globalCarPriceList.thTdTags[tag] = '<td class="price01_td">' + globalCarPriceList.$thTdTags[tag].parent().html() + '</td>';
            }
        }

        for (var j = globalCarPriceList.minField; j <= globalCarPriceList.maxField; j++) {
            trTag +=
                '<tr>' +
                    globalCarPriceList.thTdTags[globalCarPriceList.makePrefix(i) + "_" + j + "type"] +
                '</tr>' +
                '<tr>' +
                    globalCarPriceList.thTdTags[globalCarPriceList.makePrefix(i) + "_0name"] +
                    globalCarPriceList.thTdTags[globalCarPriceList.makePrefix(i) + "_" + j] +
                '</tr>';

            mainTrLabel: for (var k = globalCarPriceList.minMainTr; k <= globalCarPriceList.maxMainTr; k++) {
                if (k === globalCarPriceList.noSuffix) {
                    continue mainTrLabel;
                }

                var mainTrClass = $("#price01_" + i + "_" + k).attr("class");

                ////////////////
                // 公開の場合trがない //
                ////////////////
                if (typeof mainTrClass === "undefined") {
                    continue mainTrLabel;
                }

                trTag +=
                    '<tr class="' + mainTrClass + ' price01_' + i + '_' + k + '">' + // idをclassに変更
                        globalCarPriceList.thTdTags[globalCarPriceList.makePrefix(i) + "_" + k + "name"] +
                        globalCarPriceList.thTdTags[globalCarPriceList.makePrefix(i) + "_" + (j + k * globalCarPriceList.suffix10)] +
                    '</tr>';
            }

            trTag +=
                '<tr class="lastTr_price01_' + i + '">' + // idをclassに変更
                    globalCarPriceList.thTdTags[globalCarPriceList.makePrefix(i) + "_5name"] +
                    globalCarPriceList.thTdTags[globalCarPriceList.makePrefix(i) + "_" + (j + globalCarPriceList.suffix50)] +
                '</tr>';
        }

        globalCarPriceList.spTables[i] =
            '<div class="pricetable_block">' +
            '<table class="pricetable price01">' +
                trTag +
            '</table>' +
            '</div>';
    }

};

// 初回実行時とリサイズ時で違うスコープから呼ばれる

/**
 * 車検価格表スマホレイアウトをPCの6カラム表示から2カラムに変更
 * @param  {Number} spJsFlag 0か1以上
 * @return {void}          なし
 */
globalCarPriceList.carPriceList = function(spJsFlag) {
    // 初回実行時は引数なし
    if (typeof spJsFlag === "undefined") {
        // PCは何もしない
        if ($(window).width() <= 480 || (edit_param === "1" && sp_param === "1")) { // グローバル変数使用
            globalCarPriceList.setSpTables();
            globalCarPriceList.makeSpTables();
        }

   /////////
   // 公開時 //
   /////////
    } else {
        globalCarPriceList.setSpTables();
    }

    /////////////
    // 公開リサイズ時 //
    /////////////

    // フラグが2以上は何もしない
    if (spJsFlag === 1) {
            globalCarPriceList.makeSpTables();

    // スマホからPC
    } else if (spJsFlag === 0) {
            globalCarPriceList.makePcTables();
    }
};
