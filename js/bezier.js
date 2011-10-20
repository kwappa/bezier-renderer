var bezier = (function() {
    // 「点」クラス
    var Point = function(x, y) {
        this.x = x ;
        this.y = y ;
    }

    // 「直線」クラス
    var BezierLine = function(p0, p1) {
        this.p0 = p0 ;
        this.p1 = p1 ;
    }
    BezierLine.prototype = {
        getBeginPoint: function() {
            return this.p0 ;
        },
        getEndPoint: function() {
            return this.p1 ;
        },
        // スケールに沿った中点を算出
        getMidPoint: function(scale) {
            var x = this.p0.x + (this.p1.x - this.p0.x) * scale ;
            var y = this.p0.y + (this.p1.y - this.p0.y) * scale ;
            return new Point(x, y) ;
        }
    }

    var global = {
        ctrl_points: [],
        scale_points: [],
        bezier_points: [],
        mode: 0,                // 0 : コントロールポイントを置く / 1 : 実行中
        count: 0,
        timer_id: null,
        canvas: null,
        context: null,
        // 描画開始
        run: function() {
            if (this.ctrl_points.length < 3) {
                return ;
            }
            this.mode = 1 ;     // 実行中
            this.count = 0 ;
            this.bezier_points = [] ;
            var that = this ;
            this.timer_id = setInterval(function() { that.loop.apply(that) }, 10) ;
        },
        // 描画ループ
        loop: function() {
            this.setCount(this.count) ;
            this.count ++ ;
            if (this.count > 100) {
                this.count = 100 ;
                this.mode = 0 ;
                clearInterval(this.timer_id) ;
            }
        },
        // コントロールポイントをクリア
        resetPoints: function() {
            this.ctrl_points  = [] ;
            this.scale_points = [] ;
            $('#bezier-scale-value').attr('value', 0) ;
            this.syncCount();
            this.draw() ;
        },
        // キャンバスクリック時のイベントハンドラ
        onCanvasClick: function(event) {
            if(this.mode == 0) {
                this.ctrl_points.push(this.getMousePosition(event)) ;
                this.draw() ;
            }
        },
        // キャンバスのクリック座標を取得
        getMousePosition: function(event) {
            var rect = event.target.getBoundingClientRect() ;
            var x = event.clientX - rect.left ;
            var y = event.clientY - rect.top ;
            return new Point(x, y) ;
        },
        // 初期化
        init: function(canvas_name) {
            var that = this ;
            this.canvas = document.getElementById(canvas_name) ;
            $(this.canvas).bind('click',
                           function(event) {
                               that.onCanvasClick.apply(that, [event]) ;
                           }
                          ) ;
            this.context = this.canvas.getContext('2d') ;
        },
        // スケールによって現在の状態を生成
        buildPoints: function(points, scale) {
            var point_count = points.length ;
            if (point_count > 2) {
                var mid_points = [] ;
                for (var i = 0 ; i < point_count - 1 ; i ++) {

                    var line = new BezierLine(points[i], points[i + 1]) ;
                    mid_points.push(line.getMidPoint(scale)) ;
                }
                this.scale_points.push(mid_points) ;
                this.buildPoints(mid_points, scale) ;
            }
        },
        // ポイントの配列を描画
        drawPoints: function(points) {
            var p_num = points.length - 1 ;
            if (p_num < 1) {
                return false ;
            }
            this.context.beginPath() ;
            this.context.moveTo(points[0].x, points[0].y) ;
            for (var i = 1 ; i <= p_num ; i ++) {
                this.context.lineTo(points[i].x, points[i].y) ;
            }
            return true ;
        },
        // コントロールポイントを描画
        drawContrlolPoints: function() {
            var pts = this.ctrl_points.length ;
            this.fillStyle = "#000000" ;
            for (var i = 0 ; i < pts ; i ++) {
                this.context.beginPath() ;
                this.context.arc(this.ctrl_points[i].x, this.ctrl_points[i].y, 4, 0, Math.PI * 2, false) ;
                this.context.fill() ;
            }
        },
        // 描画メインルーチン
        draw: function() {
            // キャンバスの初期化
            this.context.save() ;
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height) ;

            // コントロールポイントの描画
            this.drawContrlolPoints() ;
            if (this.drawPoints(this.ctrl_points)) {
                this.context.strokeStyle = "ff00ff" ;
                this.context.lineWidth = 1 ;
                this.context.stroke() ;
            }

            // 時間経過による中点の生成と描画
            this.scale_points = [] ;
            this.buildPoints(this.ctrl_points, this.getCurrentScale()) ;

            var scale_points = this.scale_points.length ;
            for (var i = 0 ; i < scale_points ; i ++) {
                if (this.drawPoints(this.scale_points[i])) {
                    this.context.strokeStyle = "00ff00" ;
                    this.context.lineWidth = 1 ;
                    this.context.stroke() ;
                }
                if (this.scale_points[i].length == 2) { // 最後の直線 = 結果の生成元
                    var line = new BezierLine(this.scale_points[i][0], this.scale_points[i][1]) ;
                    var bezier_point = line.getMidPoint(this.getCurrentScale()) ;
                    this.context.fillStyle = "ff0000" ;
                    this.context.beginPath() ;
                    this.context.arc(bezier_point.x, bezier_point.y, 4, Math.PI * 2, false) ;
                    this.context.fill() ;
                    if (this.mode == 1) { // 実行中なら軌跡を保存 / 描画
                        this.bezier_points[this.count] = bezier_point ;
                        this.context.strokeStyle = "ff0000" ;
                        for (var j = 1 ; j <= this.count ; j ++) {
                            this.context.beginPath() ;
                            this.context.moveTo(this.bezier_points[j - 1].x, this.bezier_points[j - 1].y) ;
                            this.context.lineTo(this.bezier_points[j].x, this.bezier_points[j].y) ;
                            this.context.stroke() ;
                        }
                    }
                }
            }

            this.context.restore() ;
        },
        // 現在のカウントを正規化して取得
        getCurrentScale: function() {
            return $('#bezier-scale-value').attr('value') / 100.0 ;
        },
        // 現在のカウント値を設定
        setCount: function(value) {
            var elem = $('#bezier-scale-value') ;
            elem.attr('value', value) ;
            this.syncCount(elem[0]) ;
        },
        // カウント値を表示するエレメントの内容を同期
        syncCount: function(elem) {
            var value = $(elem).attr('value') ;
            $('#bezier-scale-value').attr('value', value) ;
            $('#bezier-scale-slider').attr('value', value) ;
            $('#bezier-scale-number').attr('value', value) ;
            this.draw() ;
        },
    }
    return global ;
})() ;
