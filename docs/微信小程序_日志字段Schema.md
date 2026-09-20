# 微信小程序日志字段 Schema（首轮 v1）

更新：2026-09-17。取代旧版处理帧日志方案。

UTF-8 JSONL；每行一个对象。第一行必须为 meta，随后 t 按非递减顺序排列。同一毫秒的事件按文件顺序处理，不按类型重排。

## 文件头

```json
{"type":"meta","schema":1,"engineVersion":"stop-move-0.1.0","startedAt":"2026-09-17T08:00:00.000Z","params":{},"device":{"model":"iPhone 17"},"units":{"t":"ms since session start (callback arrival)","accel":"g","gyro":"rad/s","speed":"m/s","accuracy":"m"}}
```

params 在实际文件中保存完整参数（以上为空对象仅为结构示意）。device 来自 wx.getDeviceInfo；startedAt 为 UTC ISO 时间。

## 原始输入

```json
{"type":"accel","t":100,"data":{"x":0.01,"y":0,"z":1}}
{"type":"gyro","t":100,"data":{"x":0,"y":0,"z":0.01}}
{"type":"location","t":100,"data":{"speed":0.1,"accuracy":12,"latitude":0,"longitude":0}}
```

保留微信回调中的原始字段；示例经纬度为演示值。加速度 g、陀螺仪 rad/s、定位速度 m/s、精度 m。t 是回调到达时间，不是硬件采样时间。负数/不可用速度保留在日志中，状态引擎不会把它当零速。

## 驱动与生命周期事件

- calibration-start：开始或重新开始倒计时均值校准。
- tick：前台每 100 ms 驱动一次判断；记录真实到达时间，不假设定时器精确。
- pause / resume：前后台切换。暂停期间不采集；回放期间保持暂停表现。
- sensor-error：data.sensor 为 location / accel / gyro，data.message 为错误描述。
- end：离开舞台，结束会话。

除 sensor-error 外仅需 type、t。回放逐事件驱动同一引擎，不重新凭空生成固定频率 tick。

## 派生结果

```json
{"type":"state","t":2100,"data":{"main":"STOP","status":"ready","speed":0.1,"motion":0.003,"baseline":{"accel":{"x":0,"y":0,"z":1},"gyro":{"x":0,"y":0,"z":0},"samples":40,"t":2000},"countdown":0}}
```

state 在 tick 和重要生命周期事件后记录。main 是 STOP / MOVE；status 独立描述可用性。原始数据用于重算，state 仅用于还原当时输出并比较。校准均值由原始数据重算，不盲用派生结果，支持以后修改算法。

## 文件与恢复

- ride_<开始时间毫秒>.jsonl 为本机持久记录。
- export_latest.jsonl 为当前导出的稳定快照，不是新的会话。
- 每秒或累计 150 行追加，后台 / 退出时 flush；强杀最多可能丢失尚未写入的缓冲。
- 导入最大 50 MB。中间行损坏或顺序错误会拒绝；最后一行截断可忽略，但必须提示。
- 旧版无 schema 的日志不支持直接导入，避免猜测单位和时序。
- 引擎版本不同时提示；保留“原始判定”和“记录参数在当前版本重算”的区分。
