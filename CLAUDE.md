# 坦克大战游戏 - JavaScript MVC + Three.js 重构计划

## 项目目标
将现有的 C++ SDL 坦克游戏重构为基于 JavaScript MVC 架构 + Three.js 渲染的 Web 应用。

## 改造阶段规划

### 阶段一：Three.js + 2D 资产
- 使用 Three.js 作为渲染引擎
- 复用现有 2D 精灵图和纹理资源
- 实现 2.5D 俯视角效果（正交相机）
- 完成 MVC 架构迁移
- 不使用 WASM

### 阶段二：Three.js + X3D 资产  
- 将 2D 资产升级为 X3D 3D 模型
- 增强 3D 视觉效果
- 保持游戏玩法不变
- 仍不使用 WASM

## JavaScript MVC 架构设计 (基于 Three.js)

### 项目结构
```
js-tanks-3d/
├── index.html
├── js/
│   ├── models/          # 数据层
│   │   ├── GameModel.js
│   │   ├── TankModel.js  
│   │   ├── MapModel.js
│   │   └── CollisionModel.js
│   ├── views/           # 视图层 (Three.js)
│   │   ├── GameView3D.js
│   │   ├── SceneManager.js
│   │   ├── CameraController.js
│   │   └── MaterialManager.js
│   ├── controllers/     # 控制层
│   │   ├── GameController.js
│   │   └── InputController.js
│   └── app.js
└── assets/
    ├── images/          # 阶段一：2D资源
    ├── models/          # 阶段二：X3D模型
    └── levels/
```

## Model 层设计

### GameModel
- gameState: 游戏状态管理
- level: 关卡数据
- players: 玩家坦克数组
- enemies: 敌人坦克数组
- map: 地图数据

### TankModel
- position: 位置坐标
- direction: 朝向
- health: 生命值
- type: 坦克类型

## View 层设计 (Three.js)

### 渲染策略
- WebGL 渲染器
- 正交相机（2.5D视角）
- 精灵材质（阶段一）/ 3D网格（阶段二）
- MeshBasicMaterial（无光照）+ 透明纹理，关闭阴影（阶段一）
- 实时阴影和光照（阶段二）

### 核心组件
- **GameView3D**: Three.js 场景管理
- **SceneManager**: 游戏对象创建和管理
- **CameraController**: 相机控制
- **MaterialManager**: 材质和纹理管理

## Controller 层设计

### GameController
- 游戏循环管理
- Model-View 协调
- 状态机控制

### InputController  
- 键盘事件处理
- 玩家输入映射

## 技术实现要点

### Three.js 初始化
- 创建 WebGLRenderer
- 设置正交相机
- 配置光照系统

### 游戏循环
- requestAnimationFrame
- 更新游戏逻辑
- Three.js 渲染

### 资源加载
- TextureLoader（阶段一）
- GLTFLoader（阶段二：X3D）
- 异步加载管理

### 碰撞检测
- Three.js Box3 边界盒
- 用栅格/瓦片 AABB + 空间哈希/四叉树做宽阶段，窄阶段用 Box2D/SAT 或简化 AABB/圆（坦克/子弹非常适合圆+轴对齐盒）。

## 阶段一实现细节

### 2D 精灵到 Three.js
- 使用 PlaneGeometry + 精灵纹理
- SpriteMaterial 实现 2D 效果
- 正交相机保持 2D 视觉

### 地图构建
- 网格化地形系统
- 复用现有关卡数据
- 纹理映射到平面

## 阶段二升级要点

### X3D 模型集成
- 使用 X3DLoader 加载模型
- 保持游戏逻辑不变
- 增强视觉效果

### 3D 增强
- PBR 材质
- 动态阴影
- 粒子特效

## 技术映射

| C++/SDL | JavaScript/Three.js |
|---------|-------------------|
| SDL_Renderer | THREE.WebGLRenderer |
| SDL_Texture | THREE.Texture |
| SDL_Event | DOM Events |
| 游戏循环 | 实现 fixed timestep（如 60Hz）+ 累加器；逻辑用固定步，渲染用插值。 |

## 性能优化

### 渲染优化
- InstancedMesh 批量渲染
- Frustum Culling
- 纹理图集

### 内存管理
- 对象池复用
- 及时释放资源
- 纹理压缩

## 移植步骤

1. **基础框架** - MVC 结构搭建
2. **Three.js 集成** - 场景初始化
3. **Model 层** - 游戏逻辑移植
4. **View 层** - Three.js 渲染实现
5. **Controller 层** - 输入和流程控制
6. **资源系统** - 加载和管理
7. **测试优化** - 性能调优

## 注意事项

- 保持原有游戏玩法
- 确保 60 FPS 性能
- WebGL 兼容性检测
- 移动端适配考虑

## 依赖配置

```json
{
  "dependencies": {
    "three": "^0.160.0"
  }
}
```
