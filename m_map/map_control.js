const mapConfig = {
  center: ['120.082410', '30.315726'],  // 参数一是x轴坐标（lng，经度），参数二是y轴坐标（lat，纬度）公司坐标是[120.060398, 30.315787]
  zoom: 14  // 500米的比例尺
}

// 控制开启控制
// 不设positionPicker，因为可以通过柯里化控制的
const defaultSettings = {
  defaultUserLocation: false, // 定位在用户初始位置
  PlaceSearch: false,
  plugin: {
    ToolBar: false,
    Scale: true,
    Geolocation: true
  }
}

export class Map {
  constructor (AMap, AMapUI, options) {
    this.map  // 地图的实例，即new this.AMap.Map()
    this.AMap = AMap  // 高德地图的AMap实例
    this.AMapUI = AMapUI  // 高德地图的AMapUI实例
    this.positionResult = undefined // 上一次拖拽的位置信息
    this.mapMarkersArray = []  // 存标记的数组
    this.specialMapMarkersArray = []  // 特殊标记数组
    this.focusMarker   // 当前焦点选中的标注
    this.lastClickMarker // 上一次被点击的标注（因为点击而被隐藏了）
    this.options = {
      myPositionPickerSettingsEnable: false,  // 启用拖拽模式下，表示用户当前位置的自定义配置
      myPositionPickerSettings: {},
      complete: function () {   // 地图加载完成后触发事件
        // 为了更好的调用方法，本函数的this绑定了Map实例的this
        // 为了在本函数里获取Vue组件的实例，应当在Vue实例的created生命周期来设置本方法
        // 当然，如果不需要使用Vue的实例，那么可以直接正常传值
        // 例如：
        /*
        * created () {
        *   let self = this
        *   this.mapOptions.complete = function () {
        *     // this指向Map实例
        *     this.setMapEvent('click', () => {
        *       this.removeFocusMarker()
        *     })
        *     // self指向Vue的组件
        *     console.log(self)
        *   }
        * }
        * */
      }
    }
    Object.assign(this.options, options)
  }

  // 开始，第一次调用是初始化几个插件，对调用结果再执行函数调用是传回调函数给拖拽
  // 回调函数的参数是拖拽后当前位置的结果
  init (id) {
    let self = this
    this.createMap(id)
    if (defaultSettings.PlaceSearch) {
      this.placeSearch(id)
    }
    this.plugin()
    return function (callback) {
      self.positionPicker(callback)
    }
  }

  // 创造地图
  createMap (id) {
    this.map = new this.AMap.Map(id, mapConfig)
    // 完成事件的上下文指向类Map实例
    this.setMapEvent('complete', this.options.complete, this)
  }

  // 加载地图搜索插件
  placeSearch (id) {
    this.AMap.service('AMap.PlaceSearch', () => {
      this.placeSearch = new this.AMap.PlaceSearch({
        pageSize: 5,
        pageIndex: 1,
        map: this.map,
        panel: id
      })
    })
  }

  // 拖拽选址
  // API地址：http://lbs.amap.com/api/javascript-api/reference-amap-ui/other/positionpicker/
  positionPicker (callback) {
    this.AMapUI.loadUI(['misc/PositionPicker'], PositionPicker => {
      let opt = {
        mode: 'dragMap', // 设定为拖拽地图模式，可选'dragMap'、'dragMarker'，默认为'dragMap'
        map: this.map // 依赖地图对象
      }
      if (this.options.myPositionPickerSettingsEnable) {
        Object.assign(opt, this.options.myPositionPickerSettings)
      }
      // 创建地图拖拽
      this.positionPicker = new PositionPicker(opt)
      // 拖拽完成发送自定义 drag 事件
      this.positionPicker.on('success', positionResult => {
        // 过滤掉初始化地图后的第一次默认拖放
        this.positionResult = positionResult
        callback(positionResult)
      })
      // 启动拖放
      this.positionPicker.start()
    })
  }

  // 插件
  plugin () {
    // 其他地图控件，例如：定位，鹰眼（但好像不准），类别切换
    // 见http://lbs.amap.com/api/javascript-api/guide/create-map/map-control
    // 启用工具条
    let arr = []
    if (defaultSettings.plugin.ToolBar) {
      arr.push('AMap.ToolBar')
    }

    if (defaultSettings.plugin.Scale) {
      arr.push('AMap.Scale')
    }

    if (defaultSettings.plugin.Geolocation) {
      arr.push('AMap.Geolocation')
    }
    this.AMap.plugin(arr, () => {
      // AMap.ToolBar 工具条（放大缩小比例尺的）
      // http://lbs.amap.com/api/javascript-api/reference/map-control/
      if (defaultSettings.plugin.ToolBar) {
        this.map.addControl(new this.AMap.ToolBar({
          position: 'RB'
        }))
      }

      // AMap.Scale 比例尺
      if (defaultSettings.plugin.Scale) {
        this.map.addControl(new this.AMap.Scale({
          offset: new this.AMap.Pixel(0, 20),
          position: 'RB'
        }))
      }

      // 定位
      // 设置说明：http://lbs.amap.com/api/javascript-api/reference/location
      if (defaultSettings.plugin.Geolocation) {
        this.geolocation = new this.AMap.Geolocation({
          buttonOffset: new this.AMap.Pixel(18, 50),
          buttonPosition: 'RB',
          showMarker: true,
          showCircle: true
        })
        this.map.addControl(this.geolocation)
        // 初始定位在用户当前所在位置，配置的panToLocation属性似乎不生效，所以只能这么来了
        if (defaultSettings.defaultUserLocation) {
          this.geolocation.getCurrentPosition()
        }
      }
    })
  }

  // 获取上一次拖拽结果的详细信息（根据最后一次拖拽时存储的位置信息）
  getLastDragedInfo () {
    return this.positionResult
  }

  // 获取当前指向的位置坐标，只有位置信息，是一个对象
  getLastDragedPosition () {
    return this.positionResult ? this.positionResult.position : undefined
  }

  // 定位到用户当前位置，并且获取用户当前位置信息
  getUserPosition (callback) {
    if (!this.geolocation) {
      return console.error('geolocation尚未初始化')
    }
    this.geolocation.getCurrentPosition(function (status, result) {
      callback(status, result)
    })
  }

  // 添加地图标注（这种适合做少量标记的）
  // API：http://lbs.amap.com/api/javascript-api/guide/draw-on-map/marker-point
  // 如果多的话可以试试标准列表：http://lbs.amap.com/api/javascript-api/reference-amap-ui/other/markerlist/
  addMapMarker (obj, clickEvent, isSpecial = false) {
    obj.map = this.map
    let marker = new this.AMap.Marker(obj)
    if (isSpecial) {
      this.specialMapMarkersArray.push(marker)
    } else {
      this.mapMarkersArray.push(marker)
    }
    // 回调函数里，可以通过：
    // 1、参数一的属性target拿到marker对象；
    // 2、this拿到this.map
    marker.on('click', event => {
      if (typeof clickEvent === 'function') {
        clickEvent.call(this, event)
      }
    })
    // this.setFitView()
    return marker
  }

  // 移除焦点标注
  removeFocusMarker () {
    if (this.focusMarker) {
      this.map.remove(this.focusMarker)
      this.focusMarker = undefined
      this.lastClickMarker.show()
      this.lastClickMarker = undefined
    }
  }

  // 移除全部的【普通】的地图标注
  removeAllNormalMapMarkers () {
    this.map.remove(this.mapMarkersArray)
    this.mapMarkersArray = []
  }

  // 移除全部的【特殊】的地图标注
  removeAllSpecialMapMarkers () {
    this.map.remove(this.specialMapMarkersArray)
    this.specialMapMarkersArray = []
  }

  // 删除全部地图标注
  removeAllMapMarkers () {
    this.removeAllNormalMapMarkers()
    this.removeAllSpecialMapMarkers()
    // 如果之前有焦点选中的，则把焦点的也移除
    this.removeFocusMarker()
    // 如果之前有被隐藏的（则重置为undefined）
    this.lastClickMarker = undefined
  }

  // 获取焦点地图标注
  getFocusMapMarker () {
    return this.focusMarker
  }

  // 获取全部【普通】的地图标注
  getAllNormalMapMarkers () {
    return this.mapMarkersArray
  }

  // 获取全部【特殊】的地图标注
  getAllSpecialMapMarkers () {
    return this.specialMapMarkersArray
  }

  // 获取当前所有地图的标注（普通 + 特殊，且去重）
  getAllMapMarkers () {
    let arr = new Set(this.getAllNormalMapMarkers())
    this.getAllSpecialMapMarkers().forEach(item => {
      arr.add(item)
    })
    return Array.from(arr)
  }

  // 设置地图事件
  setMapEvent (eventName, handler, context) {
    this.map.on(eventName, handler, context)
  }

  // 移除地图事件
  removeMapEvent (eventName, handler, context) {
    this.map.off(eventName, handler, context)
  }

  // 获取当前焦点MapMarker的上一个（且type符合要求）
  // 由于焦点对应的是非焦点的那个，所以应返回非焦点的那个（即被隐藏的那个）
  // type是字符串或数组
  getMapMarkerInFrontOfFocus (type, dataTypeKey) {
    let index = this.mapMarkersArray.indexOf(this.lastClickMarker)
    // 如果当前是第一个，或者根本没有，那么返回空
    if (index <= 0) {
      return undefined
    } else {
      let i = index - 1
      if (type && dataTypeKey) {
        if (typeof type === 'string') {
          type = [type]
        }
        while (i >= 0) {
          if (type.indexOf(this.mapMarkersArray[i].getExtData()[dataTypeKey]) > -1) {
            return this.mapMarkersArray[i]
          }
          i--
        }
        return undefined
      } else {
        // 如果参数为空，则直接返回
        return this.mapMarkersArray[i]
      }
    }
  }

  // 获取当前焦点MapMarker的下一个（且type符合要求）
  // type是字符串或数组
  getMapMarkerBehindFocus (type, dataTypeKey) {
    let index = this.mapMarkersArray.indexOf(this.lastClickMarker)
    // 如果当前是最后一个，或者根本没有，那么返回空
    if (index === -1 || index === this.mapMarkersArray.length - 1) {
      return undefined
    } else {
      let i = index + 1
      // 如果参数为空，则直接返回
      if (type && dataTypeKey) {
        if (typeof type === 'string') {
          type = [type]
        }
        while (i < this.mapMarkersArray.length) {
          if (type.indexOf(this.mapMarkersArray[i].getExtData()[dataTypeKey]) > -1) {
            return this.mapMarkersArray[i]
          }
          i++
        }
        return undefined
      } else {
        return this.mapMarkersArray[i]
      }
    }
  }

  // 让地图当前窗口适应标注的内容
  setFitView () {
    this.map.setFitView()
    this.map.setZoomAndCenter(14)
  }
}
