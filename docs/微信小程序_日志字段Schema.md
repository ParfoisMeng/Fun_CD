# 微信小程序日志字段 Schema（V1）

## 1. 目标
冻结日志字段，保证调参、回放、问题复现可以长期使用同一格式。

## 2. 日志记录粒度
- 采样日志：每个处理周期记录一条
- 事件日志：状态变化时额外记录一条

## 3. 采样日志字段
```json
{
  "ts": 0,
  "speedMps": 0,
  "accel": { "x": 0, "y": 0, "z": 0 },
  "gyro": { "x": 0, "y": 0, "z": 0 },
  "attitude": { "pitch": 0, "roll": 0, "yaw": 0 },
  "features": {
    "speedTrend": 0,
    "accelLongitudinal": 0,
    "gyroYawRate": 0,
    "accelVerticalEnergy": 0,
    "motionVariance": 0
  },
  "state": {
    "main": "STOP",
    "sub": "CRUISE",
    "confidence": 0
  },
  "animation": {
    "base": "IDLE_STOP",
    "overlay": "FX_NONE",
    "intensity": 0
  }
}
```

## 4. 事件日志字段
```json
{
  "ts": 0,
  "type": "STATE_TRANSITION",
  "fromMain": "STOP",
  "toMain": "MOVE",
  "fromSub": "CRUISE",
  "toSub": "ACCEL",
  "reason": "speedTrend_up"
}
```

## 5. 文件输出建议
- 文件名：`ride_log_YYYYMMDD_HHMMSS.jsonl`
- 编码：utf-8
- 每行一条 JSON（jsonl）

## 6. 必填字段约束
- `ts` 必填
- `state.main` 必填
- `animation.base` 必填
- 不可用字段可置 `null`，禁止省略结构

更新日期：2026-07-07
