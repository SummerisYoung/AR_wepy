//导入three.js库
import * as THREE from '../../libs/three.js'

//获取应用实例
const app = getApp();
//获取音频实例
const innerAudioContext = wx.createInnerAudioContext()
//获取高德地图对象实例
const amapFile = require('../../libs/amap-wx.js');
var myAmapFun = new amapFile.AMapWX({ key: '5c224f9d99122ffdb8cce33df321e5e4' });
Page({
  data: {
    canvasWidth: 0,//canvas宽度
    canvasHeight: 0,//canvas高度
    isCanvas: false,//是否显示canvas
    scale: 17,//地图缩放倍数，越大越细，
    polyline: [],//路线
    markers: [],
  },

  /**
   * 页面加载回调函数
   */
  onLoad: function () {
    this.setData({
      isCanvas: false
    })
    var that = this
    wx.startLocationUpdate({
      success(res) {
        console.log('开启后台定位', res)
      },
      fail(res) {
        console.log('开启后台定位失败', res)
      }
    })
    
    myAmapFun.getRegeo({//获取当前位置
      success: function (data) {

      },
      fail: function (info) {
        //失败回调
        console.log(info)
      }
    })

    wx.getLocation({
      success: function (res) {
        console.log('微信', res)
        that.setData({
          markers: [{
            id: 0,
            latitude: res.latitude,
            longitude: res.longitude,
            iconPath: "/static/img/marker.png",
            width: 22,
            height: 32
          }],
          latitude: res.latitude,
          longitude: res.longitude
        })

      }
    });

  },
  /**
   * 检测实时位置变化函数
   */
  locationChange() {
    var that = this
    wx.onLocationChange(function (res) {
      console.log('location change', res)
      // console.log(Math.abs(that.data.latitude - res.latitude))
      // console.log(Math.abs(that.data.longitude - res.longitude))

      if (Math.abs(that.data.latitude - res.latitude) < 0.001 && Math.abs(that.data.longitude - res.longitude) < 0.001) {
        wx.showToast({
          title: '已到达指定场景'
        })
        that.setData({
          isCanvas: true
        })
        that.initWebGLCanvas()
      }
    })
  },
  /**
   * 地图的点击事件
   */
  bindmaptap(option){
    var marker = {
      id: 1,
      latitude: option.detail.latitude,
      longitude: option.detail.longitude,
      iconPath: "/static/img/marker.png",
      width: 22,
      height: 32
    }
    if (this.data.markers.length > 1) {
      let markers = this.data.markers
      markers.splice(this.data.markers.length - 1, 1, marker)
      this.setData({
        markers: markers,
      })
    } else {
      let markers = this.data.markers
      markers.push(marker)
      this.setData({
        markers: markers,
      })
    }

    this.makePolyline()
  },
  /**
   * 使用高德sdk计算路线
   */
  makePolyline() {
    var that = this
    myAmapFun.getWalkingRoute({
      origin: that.data.markers[0].longitude + ',' + that.data.markers[0].latitude,
      destination: that.data.markers[1].longitude + ',' + that.data.markers[1].latitude,
      success: function (data) {
        console.log('计算路线成功!', data)
        var points = [];
        if (data.paths && data.paths[0] && data.paths[0].steps) {
          var steps = data.paths[0].steps;
          for (var i = 0; i < steps.length; i++) {
            var poLen = steps[i].polyline.split(';');
            for (var j = 0; j < poLen.length; j++) {
              points.push({
                longitude: parseFloat(poLen[j].split(',')[0]),
                latitude: parseFloat(poLen[j].split(',')[1])
              })
            }
          }
        }
        that.setData({
          polyline: [{
            points: points,
            color: "#0091ff",
            width: 6,
            arrowLine: true
          }]
        });
        if (data.paths[0] && data.paths[0].distance) {
          that.setData({
            distance: data.paths[0].distance + '米'
          });
        }
        if (data.paths[0] && data.paths[0].duration) {
          that.setData({
            cost: parseInt(data.paths[0].duration / 60) + '分钟'
          });
        }
      },
      fail: function (info) {
        console.log('计算路线失败', info)
      }
    })
  },
  /**
   * 播放音频
   */
  audioPlay(){
    innerAudioContext.src = '/static/sound/test.mp3'
    innerAudioContext.play()
    innerAudioContext.onPlay(() => {
      console.log('开始播放')
    })

    innerAudioContext.onError((res) => {
      console.log(res.errMsg)
      console.log(res.errCode)
    })
  },
  /**
   * 关闭Canvas
   */
  stopCanvas(){
    this.setData({
      isCanvas:false,
    })
    this._scene.remove(this._scene.children[this._scene.children.length - 1])
    console.log(this._scene.children)
    innerAudioContext.pause()
  },
  /**
   * 初始化Canvas对象
   */
  initWebGLCanvas: function () {
    wx.offLocationChange()
    console.log('调用Canvas')
    //获取页面上的标签id为webgl的对象，从而获取到canvas对象
    const query = wx.createSelectorQuery();
    console.log(query.select('#webgl'))
    query.select('#webgl').node().exec((res) => {
      console.log(res)
      var canvas = res[0].node;
      this._webGLCanvas = canvas;
      //获取系统信息，包括屏幕分辨率，显示区域大小，像素比等
      var info = wx.getSystemInfoSync();
      this._sysInfo = info;
      //设置canvas的大小，这里需要用到窗口大小与像素比乘积来定义
      this._webGLCanvas.width = this._sysInfo.windowWidth * this._sysInfo.pixelRatio;
      this._webGLCanvas.height = this._sysInfo.windowHeight * this._sysInfo.pixelRatio;
      //设置canvas的样式
      this._webGLCanvas.style = {};
      this._webGLCanvas.style.width = this._webGLCanvas.width.width;
      this._webGLCanvas.style.height = this._webGLCanvas.width.height;
      //设置显示层canvas绑定的样式style数据，页面层则直接用窗口大小来定义
      this.setData({
        canvasWidth: this._sysInfo.windowWidth,
        canvasHeight: this._sysInfo.windowHeight
      });
      this.initWebGLScene();
      this.audioPlay()
    });
  },
  /**
   * 初始化WebGL场景
   */
  initWebGLScene: function () {
    console.log('创建立方体')
    //创建摄像头
    var camera = new THREE.PerspectiveCamera(60, this._webGLCanvas.width / this._webGLCanvas.height, 1, 1000);
    this._camera = camera;
    //创建场景
    var scene = new THREE.Scene();
    this._scene = scene;

    //创建Cube几何体
    var cubeGeo = new THREE.CubeGeometry(30, 30, 30);
    //创建材质，设置材质为基本材质（不会反射光线，设置材质颜色为绿色）
    var mat = new THREE.MeshBasicMaterial({ color: 0x00FF00 });
    //创建Cube的Mesh对象
    var cube = new THREE.Mesh(cubeGeo, mat);
    //设置Cube对象的位置
    cube.position.set(0, 0, -100);
    //将Cube加入到场景中
    this._scene.add(cube);

    //创建渲染器,指定渲染器背景透明
    var renderer = new THREE.WebGLRenderer({
      canvas: this._webGLCanvas,
      alpha:true
    });
    //设置渲染器大小
    this._renderer = renderer;
    this._renderer.setSize(this._webGLCanvas.width, this._webGLCanvas.height);
    //记录当前时间
    var lastTime = Date.now();
    this._lastTime = lastTime;
    //开始渲染
    this.renderWebGL(cube);
  },
  /**
   * 渲染函数
   */
  renderWebGL: function (cube) {
    //获取当前一帧的时间
    var now = Date.now();
    //计算时间间隔,由于Date对象返回的时间是毫秒，所以除以1000得到单位为秒的时间间隔
    var duration = (now - this._lastTime) / 1000;
    //打印帧率
    // console.log(1 / duration + 'FPS');
    //重新赋值上一帧时间
    this._lastTime = now;
    //旋转Cube对象，这里希望每秒钟Cube对象沿着Y轴旋转180度（Three.js中用弧度表示，所以是Math.PI）
    cube.rotation.y += duration * Math.PI;

    //渲染执行场景，指定摄像头看到的画面
    this._renderer.render(this._scene, this._camera);
    //设置帧回调函数，并且每一帧调用自定义的渲染函数
    this._webGLCanvas.requestAnimationFrame(() => {
      this.renderWebGL(cube);
    });
  }
})