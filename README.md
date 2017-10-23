# Vue-gaode-map
Vue.js所使用的高德地图。已将js代码抽象出来，将js单独引用，即使不用Vue也可以

><amap @drag="dragMap" :options="mapOptions"></amap>

```javascript
mapOptions: {
  myPositionPickerSettingsEnable: true,
  myPositionPickerSettings: {
    iconStyle: {
      url: require('./user-location.png'),
      size: [31, 50],
      ancher: [15, 42]
    }
  },
  complete: function () {
    // 这个需要在当前组件created的时候修改添加
  }
}
```