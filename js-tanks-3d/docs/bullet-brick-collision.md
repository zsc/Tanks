# 子弹打砖块逻辑流程

## 概述
子弹打砖块的逻辑涉及多个模块的协同工作，从碰撞检测到视觉更新的完整流程。

## 核心组件

### 1. BulletModel (`js/models/BulletModel.js`)
- 管理子弹的位置、速度、方向
- 子弹大小：`size = 0.1`
- 子弹速度：默认 `speed = 8`
- 子弹生命周期：5秒后自动销毁

### 2. MapModel (`js/models/MapModel.js`)
- 管理地图瓦片数据
- 瓦片类型：
  - `0`: 空
  - `1`: 砖块（可破坏）
  - `2`: 钢铁（不可破坏）
  - `3`: 水
  - `4`: 冰
  - `5`: 草丛
  - `6`: 老鹰基地

### 3. BrickModel (`js/models/BrickModel.js`)
- 管理砖块的部分破坏状态
- 支持根据子弹方向进行部分破坏
- 破坏状态码：
  - `1-4`: 半块破坏（上/右/下/左）
  - `5-8`: 四分之一块保留
  - `9`: 完全破坏

### 4. CollisionModel (`js/models/CollisionModel.js`)
- 负责所有碰撞检测和处理
- 使用空间哈希网格优化碰撞检测

## 碰撞检测流程

### 步骤 1: 游戏循环更新
```javascript
// GameModel.update(deltaTime)
1. 更新所有实体位置
2. 调用 checkCollisions()
3. checkCollisions() 调用 CollisionModel.processCollisions(this)
```

### 步骤 2: 碰撞检测
```javascript
// CollisionModel.processCollisions(gameModel)
1. 构建空间哈希网格
2. 遍历所有子弹
3. 对每个子弹调用 checkMapCollision(bullet, map)
```

### 步骤 3: 子弹与地图碰撞检测
```javascript
// CollisionModel.checkMapCollision(entity, map)
1. 检查子弹四个角的位置
2. 将世界坐标转换为瓦片坐标
3. 检查瓦片是否为实体（isSolid）
4. 返回碰撞信息：
   - collided: 是否碰撞
   - tileX, tileZ: 瓦片坐标
   - tileType: 瓦片类型
```

### 步骤 4: 处理碰撞结果
```javascript
// CollisionModel.processCollisions() 中的碰撞处理
if (mapCollision.collided) {
    1. 销毁子弹
    2. 记录碰撞日志
    3. 如果瓦片可破坏（砖块或老鹰）：
       - 调用 map.destroyTile(x, z, bulletDirection)
       - 记录地图变化日志
       - 将破坏信息存储到 gameModel.destroyedTiles
}
```

### 步骤 5: 砖块破坏逻辑
```javascript
// MapModel.destroyTile(x, z, bulletDirection)
1. 获取或创建 BrickModel 实例
2. 调用 brick.bulletHit(bulletDirection)
3. 根据击中方向更新砖块状态
4. 如果完全破坏：
   - 将瓦片设为空（EMPTY）
   - 删除 BrickModel 实例
5. 返回破坏结果：
   - destroyed: 是否完全破坏
   - partial: 是否部分破坏
   - state: 视觉状态
```

### 步骤 6: 视图同步
```javascript
// GameController.syncViewWithModel()
1. 检查 gameModel.destroyedTiles 数组
2. 对每个被破坏的瓦片：
   - 如果完全破坏：调用 mapRenderer.destroyTile(x, z)
   - 如果部分破坏：调用 mapRenderer.updateTile(x, z, 0)
   - 创建爆炸特效
3. 清空 destroyedTiles 数组
```

### 步骤 7: 视觉更新
```javascript
// MapRenderer.destroyTile(x, z)
1. 找到对应的瓦片网格对象
2. 从场景中移除瓦片
3. 创建爆炸粒子效果
4. 返回爆炸对象供动画系统处理
```

## 部分破坏算法

砖块的部分破坏基于以下算法：

1. **第一次击中**：
   - 根据子弹方向设置状态码（1-4）
   - 破坏对应的半块

2. **第二次击中**：
   - 计算方向组合
   - 如果是相邻方向：保留四分之一块
   - 如果是相同或相对方向：完全破坏

3. **第三次击中**：
   - 无论从哪个方向，完全破坏

## 碰撞边界计算

```javascript
// 子弹边界
bullet.bounds = {
    left: position.x - 0.05,
    right: position.x + 0.05,
    top: position.z - 0.05,
    bottom: position.z + 0.05
}

// 瓦片边界（1x1 单位）
tile.bounds = {
    left: tileX,
    right: tileX + 1,
    top: tileZ,
    bottom: tileZ + 1
}
```

## 性能优化

1. **空间哈希网格**：
   - 网格大小：2x2 单位
   - 减少不必要的碰撞检查

2. **对象池**：
   - 子弹对象可复用（未实现）
   - 爆炸粒子系统复用（未实现）

3. **批量更新**：
   - 收集所有破坏的瓦片
   - 一次性更新视图

## 已知问题和改进建议

### 当前问题：
1. 部分破坏的视觉表现未完全实现
2. 砖块碰撞盒在部分破坏后未更新
3. 子弹可能穿过很薄的砖块

### 改进建议：
1. 实现精确的部分砖块渲染
2. 更新部分破坏砖块的碰撞盒
3. 使用连续碰撞检测（CCD）防止穿透
4. 添加子弹击中效果（火花、碎片）
5. 实现对象池优化性能

## 日志系统集成

碰撞事件会记录以下日志：

```javascript
// 子弹与地图碰撞
logger.logCollision('Bullet-Map', bulletId, tileCoords, {
    tileType: 瓦片类型,
    bulletOwner: 子弹所有者,
    bulletDirection: 子弹方向
});

// 地图瓦片变化
logger.logMapChange(x, z, oldType, newType, cause);
```

## 调试方法

1. **查看日志**：
   - 打开控制台查看实时日志
   - 点击 "Download Logs" 下载完整日志

2. **检查碰撞盒**：
   - 在 CollisionModel 中添加可视化代码
   - 渲染碰撞边界框

3. **测试特定场景**：
   - 修改地图生成逻辑创建测试场景
   - 调整子弹速度和大小测试边界情况