# Fun CD · 小猫同行

微信小程序骑行陪伴原型：把手机固定到电动车车把，倒计时校准后，小猫跟随起步、骑行和停车。原始传感器数据可以导出到电脑反复回放、调参，无需每次出门。

## 先在电脑体验

需要 Node.js 20+。在此目录运行：

```powershell
npm install
npm run replay
```

打开 http://127.0.0.1:4173 ，点击“试试演示记录”。演示为 42 秒合成数据，包含起停、定位断流、切后台与重新校准，并非 iPhone 实测。

电脑舞台已换成用户选择的 Quaternius 蓝色 Platformer 角色，使用原版 CC0 GLB，姿势代码位于 `replay/platformer.mjs`。可直接点“预览停车 / 预览骑行”，拖动旋转、滚轮缩放；选“跟随回放”后由记录驱动动画。当前使用原版角色骨骼做握把和屈腿坐姿，带耳朵摆动和停车支架；角色腿短，停车脚下探但尚未做到落地。小程序暂保留二维舞台。旧猫模型及布偶试作文件保留但不加载。参考与素材说明见 `replay/assets/ATTRIBUTION.md`。

导入真实 `.jsonl` 后可播放、暂停、倍速、拖动时间线，修改参数后比较原判定与重算结果。导出的参数 JSON 中 `params` 可用来更新 `miniprogram/core/engine.js` 的默认配置；修改后同步更新 `VERSION`。当前没有自动把电脑参数推送到手机的服务。

## 微信小程序

1. 微信开发者工具导入此项目根目录；`miniprogramRoot` 已配置。
2. 将 `project.config.json` 中的 `touristappid` 换为自己的有效小程序 AppID。游客模式仅用于打开骨架，不等同于具备真机定位权限。
3. 按账号实际要求配置定位接口能力和小程序隐私保护指引；填写本地记录定位数据的用途。代码声明了 `scope.userLocation`、`startLocationUpdate`、`onLocationChange`。
4. 使用支持相关接口的现代基础库（建议 3.x），编译并预览到 iPhone 17。允许定位与系统定位服务。
5. 固定手机后点击开始，倒计时 2 秒内尽量不要大幅移动。调整支架后点击重新校准。
6. 在舞台“导出当前记录”，或返回准备页导出之前的记录，经微信发给自己的文件传输助手再存到电脑。

`shareFileMessage` 由用户点击触发并在微信分享界面选择目标；没有自动发送。记录留在小程序本地文件目录，退出后仍可导出。文件含原始定位字段，应用无后端、无自动上传。清除小程序数据前先导出需要保留的记录。

## 开发与验证

```powershell
npm test
npm run check
npm run demo
```

- `miniprogram/core/engine.js`：两端共用的确定性停行判断。
- `miniprogram/core/stage.js`：小程序与浏览器降级使用的二维小猫动画。
- `replay/`：本地浏览器回放工作台。
- `docs/首轮原型_确认范围与实现.md`：最新确认范围、实现说明及未验证项。
- `docs/微信小程序_日志字段Schema.md`：JSONL 格式。
- `docs/微信小程序_外场验证脚本.md`：一次采集后在电脑复测的流程。

首轮没有骑行统计与结果页。五种子状态、多性格及正式美术素材延后。7 月方案中的更大范围已标记为历史方案，以 9 月确认范围为准。

目前已进行本地自动化与浏览器交互验证；尚未进行微信开发者工具编译和 iPhone 17 真机验证。账号配置和设备验证完成前，不能视为已可发布的小程序。

API 参考：微信官方 [API 类型定义](https://github.com/wechat-miniprogram/api-typings)、[位置更新](https://developers.weixin.qq.com/miniprogram/dev/api/location/wx.startLocationUpdate.html)、[文件分享](https://developers.weixin.qq.com/miniprogram/dev/api/share/wx.shareFileMessage.html)。
