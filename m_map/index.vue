<!--
  描述：拖放地图组件

  自定义事件：
    drag: 拖放完成事件

  示例：
    <mapDrag @drag="dragMap"></mapDrag>
-->
<template>
  <div class="m-map">
    <div id="js-container" class="map"><span v-if="isNotLoaded">地图加载中</span></div>
  </div>
</template>
<style scoped lang="less" type="text/less">
  /*--基础vw--*/
  @vw: 100/750vw;
  .m-map {
    width: 100%;
    height: 100%;
    position: relative;
    .map {
      width: 100%;
      height: 100%;
    }
  }

</style>
<script>
  import remoteLoad from '@/utils/remoteLoad.js'
  import {MapKey} from '@/config/key'
  import {Map} from './map_control'

  export default {
    name: 'amap',
    props: {
      lat: {
        type: String
      },
      lng: {
        type: String
      },
      options: {
        type: Object,
        default: function () {
          return {}
        }
      }
    },
    data () {
      return {
        placeSearch: null,
        dragStatus: false,
        map: null,
        isNotLoaded: true
      }
    },
    watch: {
      searchKey () {
        if (this.searchKey === '') {
          this.placeSearch.clear()
        }
      }
    },
    methods: {
      // 实例化地图
      initMap () {
        this.isNotLoaded = false

        // 加载PositionPicker，loadUI的路径参数为模块名中 'ui/' 之后的部分
        window.map = this.map = new Map(window.AMap, window.AMapUI, this.options)
        this.map.init('js-container')(PositionPicker => {
          if (!this.dragStatus) {
            this.dragStatus = true
          } else {
            this.$emit('drag', PositionPicker)
          }
        })
      },

      // 获取上次拖拽后的位置信息
      getDragedPosition () {
        return this.map.getLastDragedPosition()
      },

      // 添加标注
      addMapMarker (obj, clickEvent, isSpecial) {
        return this.map.addMapMarker(obj, clickEvent, isSpecial)
      },

      // 移除焦点marker
      removeFocusMarker () {
        this.map.removeFocusMarker()
      },

      // 移除所有标注
      removeAllMarkers () {
        this.map.removeAllMapMarkers()
      },

      // 增加事件
      setMapEvent (eventName, handler, context) {
        this.map.on(eventName, handler, context)
      },

      // 移除事件
      // 参数：eventName, handler, context
      removeMapEvent () {
        this.map.off(...arguments)
      },

      // 获取焦点所对应的那个标识的上一个标识
      // 参数：type, dataTypeKey
      getFrontMapMarker () {
        return this.map.getMapMarkerInFrontOfFocus(...arguments)
      },

      // 获取焦点所对应的那个标识的上一个标识
      // 参数：type, dataTypeKey
      getBehindMapMarker () {
        let marker = this.map.getMapMarkerBehindFocus(...arguments)
        return marker
      },

      // 设置另一个MapMarker取代当前的显示的焦点，然后返回新的MapMarker的信息
      replaceFocusMapMarker (newMapMarker) {
        // 逻辑
        // 1、移除当前焦点
        // 2、显示当前焦点对应的标识
        // 3、隐藏上一个标识
        // 4、添加和上一个标识对应的焦点
        // 5、获取该标识信息，并将其设置为当前显示的内容
        this.removeFocusMarker()  // 执行1和2
        newMapMarker.emit('click', {  // 直接通过触发click实现，实现3和4
          target: newMapMarker
        })
      },

      getFocusMapMarker () {
        return this.map.getFocusMapMarker()
      }
    },
    created () {
      // 每个会尝试加载10秒，10秒内加载不出来会报错
      function delay (isMap, resolve, reject, num) {
        setTimeout(() => {
          if ((isMap && window.AMap.Map) || (!isMap && window.AMapUI)) {
            resolve()
          } else {
            if (num > 100) {
              return reject()
            }
            delay(isMap, resolve, reject, num + 1)
          }
        }, 100)
      }

      function loadAMap () {
        return new Promise((resolve, reject) => {
          remoteLoad(`http://webapi.amap.com/maps?v=1.4.0&key=${MapKey}`).then(() => {
            if (window.AMap.Map) {
              resolve()
            } else {
              delay(true, resolve, reject, 0)
            }
          }).catch(() => {
            reject()
          })
        })
      }

      function loadAMapUI () {
        return new Promise((resolve, reject) => {
          remoteLoad('http://webapi.amap.com/ui/1.0/main.js').then(() => {
            if (window.AMapUI) {
              resolve()
            } else {
              delay(false, resolve, reject, 0)
            }
          })
        })
      }

      // 已载入高德地图API，则直接初始化地图
      if (window.AMap && window.AMapUI) {
        this.initMap()
      } else {
        // 未载入高德地图API，则先载入API再初始化
        loadAMap().then(() => {
          return loadAMapUI()
        }).then(() => {
          this.initMap()
        }).catch(() => {
          alert('地图加载失败，请刷新页面重新加载')
        })
      }
    }
  }
</script>
