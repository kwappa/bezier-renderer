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

    // 動作状況
    const Mode = {
        PUT_PATH_POINTS:    0,
        PUT_CONTROL_POINTS: 1,
        RUNNING:            2
    }
    // マジックナンバー
    const Param = {
        PATH_RESOLUTION: 200,   // 分解能
        FRAME_INTERVAL:   10    // 1fの長さ(msec)
    }

    var global = {
        path_points:   [],      // 始点と終点
        ctrl_points:   [],      // コントロールポイント
        scale_points:  [],      // 移動に応じて算出されるポイント
        bezier_points: [],      // 結果として得られる曲線のポイント
        mode: Mode.PUT_PATH_POINTS,
        count: 0,
        timer_id: null,
        canvas:   null,
        context:  null,
        bezier_color: {
            grid:         '#88ffff',
            path_line:    '#0000ff',
            ctrl_line:    '#ffffff',
            ctrl_point:   '#ffeeff',
            bezier_line:  '#00ff88',
            bezier_point: '#ff00ff',
            bezier_curve: '#ff0000'
        },
        // 描画開始
        run: function() {
            if (this.mode != Mode.PUT_CONTROL_POINTS) {
                return ;
            }
            this.mode = Mode.RUNNING ;     // 実行中
            this.count = 0 ;
            this.bezier_points = [] ;
            var that = this ;
            this.timer_id = setInterval(
                function() { that.loop.apply(that) },
                Param.FRAME_INTERVAL
            ) ;
        },
        // 描画ループ
        loop: function() {
            this.setCount(this.count) ;
            this.count ++ ;
            if (this.count > Param.PATH_RESOLUTION) {
                this.count = Param.PATH_RESOLUTION ;
                this.mode = Mode.PUT_CONTROL_POINTS ;
                clearInterval(this.timer_id) ;
            }
        },
        // コントロールポイントをクリア
        resetPoints: function() {
            if(this.mode == Mode.RUNNING) {
                this.count = Param.PATH_RESOLUTION ;
                this.mode = Mode.PUT_CONTROL_POINTS ;
                clearInterval(this.timer_id) ;
            }
            this.path_points  = [] ;
            this.ctrl_points  = [] ;
            this.scale_points = [] ;
            $('#bezier-scale-value').attr('value', 0) ;
            this.syncCount();
            this.draw() ;
            this.mode = Mode.PUT_PATH_POINTS ;
        },
        // キャンバスクリック時のイベントハンドラ
        onCanvasClick: function(event) {
            switch (this.mode)
            {
                case Mode.PUT_PATH_POINTS :
                {
                    this.path_points.push(this.getMousePosition(event)) ;
                    this.draw() ;
                    if (this.path_points.length >= 2) {
                        this.mode = Mode.PUT_CONTROL_POINTS ;
                    }
                    break ;
                }
                case Mode.PUT_CONTROL_POINTS :
                {
                    this.ctrl_points.push(this.getMousePosition(event)) ;
                    this.draw() ;
                    break ;
                }
                default :
                {
                    break ;
                }
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
            this.drawGrid() ;
            $('#bezier-scale-slider').attr('max', Param.PATH_RESOLUTION) ;
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
        drawLineOfPoints: function(points, color, width) {
            var p_num = points.length - 1 ;
            if (p_num < 1) {
                return ;
            }
            this.context.beginPath() ;
            this.context.moveTo(points[0].x, points[0].y) ;
            for (var i = 1 ; i <= p_num ; i ++) {
                this.context.lineTo(points[i].x, points[i].y) ;
            }
            this.context.strokeStyle = color ;
            this.context.lineWidth = width ;
            this.context.stroke() ;
        },
        // コントロールポイントを描画
        drawArcOfControlPoints: function() {
            this.drawArcOfPoints(this.ctrl_points, this.bezier_color['ctrl_point'], 4) ;
            this.drawArcOfPoints(this.path_points, this.bezier_color['ctrl_point'], 4) ;
        },
        // ポイントの配列に円を描画
        drawArcOfPoints: function(points, color, radius) {
            var pts = points.length ;
            this.context.fillStyle = color ;
            for (var i = 0 ; i < pts ; i ++) {
                this.context.beginPath() ;
                this.context.arc(points[i].x, points[i].y, radius, 0, Math.PI * 2, false) ;
                this.context.fill() ;
            }
        },
        // グリッドを引く
        drawGrid: function() {
            this.context.strokeStyle = this.bezier_color['grid'] ;
            this.context.lineWidth = 0.5 ;
            for (var gx = 0 ; gx <= this.canvas.width ; gx += 100) {
                this.context.beginPath() ;
                this.context.moveTo(gx, 0) ;
                this.context.lineTo(gx, this.canvas.height) ;
                this.context.stroke() ;
            }
            for (var gy = 0 ; gy <= this.canvas.height ; gy += 100) {
                this.context.beginPath() ;
                this.context.moveTo(0, gy) ;
                this.context.lineTo(this.canvas.width, gy) ;
                this.context.stroke() ;
            }
        },
        // 描画メインルーチン
        draw: function() {
            // キャンバスの初期化
            this.context.save() ;
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height) ;
            this.drawGrid() ;   // グリッドを引く

            // コントロールポイントの描画
            this.drawLineOfPoints(this.path_points, this.bezier_color['path_line'], 2) ;
            this.drawLineOfPoints(this.getAllPoints(), this.bezier_color['ctrl_line'], 1) ;
            this.drawArcOfControlPoints() ;

            // 時間経過による中点の生成と描画
            this.scale_points = [] ;
            this.buildPoints(this.getAllPoints(), this.getCurrentScale()) ;

            var scale_points = this.scale_points.length ;
            for (var i = 0 ; i < scale_points ; i ++) {
                this.drawLineOfPoints(this.scale_points[i], this.bezier_color['bezier_line'], 1) ;
                if (this.scale_points[i].length == 2) { // 最後の直線 = 結果の生成元
                    var line = new BezierLine(this.scale_points[i][0], this.scale_points[i][1]) ;
                    var bezier_point = line.getMidPoint(this.getCurrentScale()) ;
                    this.context.fillStyle = this.bezier_color['bezier_point'] ;
                    this.context.beginPath() ;
                    this.context.arc(bezier_point.x, bezier_point.y, 4, Math.PI * 2, false) ;
                    this.context.fill() ;
                    if (this.mode == Mode.RUNNING) { // 実行中なら軌跡を保存 / 描画
                        this.bezier_points[this.count] = bezier_point ;
                        this.context.strokeStyle = this.bezier_color['bezier_curve'] ;
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
        // パスの始点終点とコントロールポイントを結合して返す
        getAllPoints: function() {
            if (this.ctrl_points.length > 0) {
                return [this.path_points[0]].concat(this.ctrl_points, this.path_points[1]) ;
            }
            return this.path_points ;
        },
        // 現在のカウントを正規化して取得
        getCurrentScale: function() {
            return $('#bezier-scale-value').attr('value') / parseFloat(Param.PATH_RESOLUTION) ;
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
